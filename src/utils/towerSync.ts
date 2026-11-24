import { createClient, type SupabaseClient } from '@supabase/supabase-js';

export type ImportRegion = 'london' | 'uk';
export type SyncMode = 'import' | 'backfill';

export interface SyncSummary {
  region: ImportRegion;
  mode: SyncMode;
  dryRun: boolean;
  osmElements: number;
  existingTowers: number;
  matchedByOsmId: number;
  matchedByName: number;
  matchedByLocation: number;
  osmIdsBackfilled: number;
  toInsert: number;
  inserted: number;
  errors: number;
  errorMessages: string[];
  sampleNew: { name: string; osm_id: string; latitude: number; longitude: number }[];
}

interface ExistingTower {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  osm_id: string | null;
}

interface OsmTower {
  osm_id: string; // e.g. "way/123"
  numericId: number;
  type: string;
  name: string;
  latitude: number;
  longitude: number;
}

const QUERIES: Record<ImportRegion, string> = {
  london: `
    [out:json][timeout:40];
    nwr["man_made"="water_tower"](51.2,-0.5,51.7,0.3);
    out geom;
  `,
  uk: `
    [out:json][timeout:40];
    area["name"="United Kingdom"]->.searchArea;
    nwr["man_made"="water_tower"](area.searchArea);
    out geom;
  `,
};

// An OSM way/relation can differ from a stored point by tens of metres depending on
// which point was used, so location matches use a small radius.
const LOCATION_MATCH_METRES = 25;
// Name-based matches (Water Tower <osm id>) are only trusted if the position is roughly right,
// since node/way/relation IDs are numbered separately and can collide.
const NAME_MATCH_SANITY_METRES = 500;

function distanceMetres(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

function parseElement(element: any): OsmTower | null {
  let lat: number | undefined;
  let lon: number | undefined;

  if (element.type === 'node' && element.lat != null && element.lon != null) {
    lat = element.lat;
    lon = element.lon;
  } else if (element.center) {
    lat = element.center.lat;
    lon = element.center.lon;
  } else if (element.bounds) {
    lat = (element.bounds.minlat + element.bounds.maxlat) / 2;
    lon = (element.bounds.minlon + element.bounds.maxlon) / 2;
  } else if (element.geometry?.[0]) {
    lat = element.geometry[0].lat;
    lon = element.geometry[0].lon;
  }

  if (lat == null || lon == null) return null;

  const tags = element.tags || {};
  return {
    osm_id: `${element.type}/${element.id}`,
    numericId: element.id,
    type: element.type,
    name: tags.name || tags['name:en'] || tags.description || `Water Tower ${element.id}`,
    latitude: lat,
    longitude: lon,
  };
}

const OVERPASS_ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
];

async function fetchOsmTowers(region: ImportRegion): Promise<{ towers: OsmTower[]; elementCount: number }> {
  let lastError = 'unknown error';

  // Public Overpass servers are often busy (502/504), so try each mirror in turn
  for (const endpoint of OVERPASS_ENDPOINTS) {
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          // Overpass rejects anonymous clients with 406; identify ourselves
          'User-Agent': 'wtmap-v2 (water tower map importer)',
          Accept: 'application/json',
        },
        body: `data=${encodeURIComponent(QUERIES[region])}`,
      });

      if (!response.ok) {
        lastError = `${new URL(endpoint).host} returned ${response.status} ${response.statusText}`;
        continue;
      }

      const osmData = await response.json();
      const elements: any[] = osmData.elements || [];
      const towers = elements.map(parseElement).filter((t): t is OsmTower => t !== null);
      return { towers, elementCount: elements.length };
    } catch (error) {
      lastError = `${new URL(endpoint).host}: ${error instanceof Error ? error.message : String(error)}`;
    }
  }

  throw new Error(`Overpass API unavailable (${lastError}). Try again in a few minutes.`);
}

async function fetchAllExistingTowers(supabase: SupabaseClient<any>): Promise<ExistingTower[]> {
  // PostgREST caps responses at 1000 rows, so page through
  const pageSize = 1000;
  const all: ExistingTower[] = [];
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await supabase
      .from('water_towers')
      .select('id, name, latitude, longitude, osm_id')
      .order('id')
      .range(from, from + pageSize - 1);
    if (error) throw new Error(`Failed to read existing towers: ${error.message}`);
    all.push(...((data as unknown as ExistingTower[]) || []));
    if (!data || data.length < pageSize) break;
  }
  return all;
}

/**
 * Pulls water towers from OpenStreetMap and reconciles them with the database:
 *  - towers already stored with the same osm_id are left alone
 *  - existing towers without an osm_id are matched (by "Water Tower <id>" name, then by
 *    location) and get their osm_id filled in, so future imports recognise them
 *  - anything left is new and is inserted (mode 'import' only)
 * With dryRun nothing is written; the summary reports what would happen.
 */
export async function syncTowersFromOverpass(
  region: ImportRegion,
  { dryRun, mode }: { dryRun: boolean; mode: SyncMode }
): Promise<SyncSummary> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  );

  const summary: SyncSummary = {
    region, mode, dryRun,
    osmElements: 0, existingTowers: 0,
    matchedByOsmId: 0, matchedByName: 0, matchedByLocation: 0,
    osmIdsBackfilled: 0, toInsert: 0, inserted: 0,
    errors: 0, errorMessages: [], sampleNew: [],
  };

  const { towers: osmTowers, elementCount } = await fetchOsmTowers(region);
  summary.osmElements = elementCount;

  if (elementCount === 0) {
    throw new Error('Overpass returned no elements; refusing to continue (it may have timed out).');
  }

  const existing = await fetchAllExistingTowers(supabase);
  summary.existingTowers = existing.length;

  const claimedOsmIds = new Set(existing.filter(t => t.osm_id).map(t => t.osm_id as string));
  const unmatchedExisting = existing.filter(t => !t.osm_id);
  const byNumericName = new Map<number, ExistingTower[]>();
  for (const t of unmatchedExisting) {
    const m = /^Water Tower (\d+)$/.exec(t.name);
    if (m) {
      const id = Number(m[1]);
      byNumericName.set(id, [...(byNumericName.get(id) || []), t]);
    }
  }

  const backfills: { id: string; osm_id: string; geometry_type: string }[] = [];
  const claimedExistingIds = new Set<string>();
  const toInsert: OsmTower[] = [];

  for (const osm of osmTowers) {
    if (claimedOsmIds.has(osm.osm_id)) {
      summary.matchedByOsmId++;
      continue;
    }

    // 1. Unnamed towers stored as "Water Tower <osm id>"
    const nameMatch = (byNumericName.get(osm.numericId) || []).find(
      t => !claimedExistingIds.has(t.id) &&
        distanceMetres(t.latitude, t.longitude, osm.latitude, osm.longitude) <= NAME_MATCH_SANITY_METRES
    );

    // 2. Anything else sitting at (almost) the same spot
    const locationMatch = nameMatch
      ? undefined
      : unmatchedExisting.find(
          t => !claimedExistingIds.has(t.id) &&
            distanceMetres(t.latitude, t.longitude, osm.latitude, osm.longitude) <= LOCATION_MATCH_METRES
        );

    const match = nameMatch || locationMatch;
    if (match) {
      if (nameMatch) summary.matchedByName++; else summary.matchedByLocation++;
      claimedExistingIds.add(match.id);
      claimedOsmIds.add(osm.osm_id);
      backfills.push({ id: match.id, osm_id: osm.osm_id, geometry_type: osm.type });
      continue;
    }

    // Also guard against two OSM elements (e.g. a node inside a way) describing one tower
    const nearNew = toInsert.some(
      t => distanceMetres(t.latitude, t.longitude, osm.latitude, osm.longitude) <= LOCATION_MATCH_METRES
    );
    if (nearNew) continue;

    toInsert.push(osm);
  }

  summary.osmIdsBackfilled = backfills.length;
  summary.toInsert = mode === 'import' ? toInsert.length : 0;
  summary.sampleNew = (mode === 'import' ? toInsert : []).slice(0, 10).map(t => ({
    name: t.name, osm_id: t.osm_id, latitude: t.latitude, longitude: t.longitude,
  }));

  if (dryRun) return summary;

  // Backfill osm_id on existing rows (never touches name, images, visits, etc.)
  for (const b of backfills) {
    const { error } = await supabase
      .from('water_towers')
      .update({ osm_id: b.osm_id, geometry_type: b.geometry_type })
      .eq('id', b.id)
      .is('osm_id', null);
    if (error) {
      summary.errors++;
      summary.errorMessages.push(`Backfill ${b.id} -> ${b.osm_id}: ${error.message}`);
      summary.osmIdsBackfilled--;
    }
  }

  if (mode === 'import') {
    const batchSize = 50;
    for (let i = 0; i < toInsert.length; i += batchSize) {
      const batch = toInsert.slice(i, i + batchSize).map(t => ({
        name: t.name,
        latitude: t.latitude,
        longitude: t.longitude,
        osm_id: t.osm_id,
        geometry_type: t.type,
      }));
      const { data, error } = await supabase.from('water_towers').insert(batch).select('id');
      if (error) {
        summary.errors += batch.length;
        summary.errorMessages.push(`Insert batch ${Math.floor(i / batchSize) + 1}: ${error.message}`);
        continue;
      }
      summary.inserted += data?.length || 0;
    }
  }

  return summary;
}

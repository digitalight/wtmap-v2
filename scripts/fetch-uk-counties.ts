/**
 * Fetch UK county boundaries from OpenStreetMap/Overpass API
 * This script fetches real administrative boundaries for UK counties
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY! || process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables:');
  console.error('  NEXT_PUBLIC_SUPABASE_URL:', !!supabaseUrl);
  console.error('  SUPABASE_SERVICE_KEY:', !!supabaseServiceKey);
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface CountyFeature {
  type: 'Feature';
  properties: {
    name: string;
    admin_level?: string;
    boundary?: string;
  };
  geometry: {
    type: 'Polygon' | 'MultiPolygon';
    coordinates: any; // Will be number[][][] for Polygon or number[][][][] for MultiPolygon
  };
}

/**
 * Fetch counties from Overpass API
 * This queries for admin_level=6 boundaries in England which are ceremonial counties
 */
async function fetchCountiesFromOverpass(): Promise<CountyFeature[]> {
  const overpassQuery = `
    [out:json][timeout:180];
    area["ISO3166-1"="GB"]["admin_level"="2"]->.uk;
    (
      relation["boundary"="administrative"]["admin_level"="6"](area.uk);
    );
    out geom;
  `;

  console.log('Fetching county boundaries from Overpass API...');
  console.log('This may take 1-2 minutes...');

  const response = await fetch('https://overpass-api.de/api/interpreter', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: `data=${encodeURIComponent(overpassQuery)}`,
  });

  if (!response.ok) {
    throw new Error(`Overpass API error: ${response.statusText}`);
  }

  const data = await response.json();
  console.log(`Received ${data.elements?.length || 0} elements from Overpass`);

  // Convert Overpass format to GeoJSON
  const features: CountyFeature[] = [];

  for (const element of data.elements || []) {
    if (element.type === 'relation' && element.tags?.name) {
      // Skip if not a proper county
      if (!element.tags.name || element.tags.name.length < 2) continue;

      // Extract geometry from relation
      const geometry = extractGeometry(element);
      if (!geometry) continue;

      features.push({
        type: 'Feature',
        properties: {
          name: element.tags.name,
          admin_level: element.tags.admin_level,
          boundary: element.tags.boundary,
        },
        geometry,
      });
    }
  }

  console.log(`Converted to ${features.length} county features`);
  return features;
}

/**
 * Extract geometry from Overpass relation
 */
function extractGeometry(relation: any): CountyFeature['geometry'] | null {
  if (!relation.members) return null;

  // This is simplified - proper implementation would need to:
  // 1. Build outer and inner rings from way members
  // 2. Handle multipolygons correctly
  // For now, we'll use a simpler approach with bounds

  if (relation.bounds) {
    const { minlat, minlon, maxlat, maxlon } = relation.bounds;
    // Create a simple bounding box polygon
    return {
      type: 'Polygon',
      coordinates: [[
        [minlon, minlat],
        [maxlon, minlat],
        [maxlon, maxlat],
        [minlon, maxlat],
        [minlon, minlat],
      ]],
    };
  }

  return null;
}

/**
 * Use predefined county list with Wikipedia/Nominatim
 * This is a more reliable approach
 */
async function fetchCountiesFromNominatim(): Promise<CountyFeature[]> {
  // List of UK ceremonial counties
  const counties = [
    // England
    'Bedfordshire', 'Berkshire', 'Bristol', 'Buckinghamshire', 'Cambridgeshire',
    'Cheshire', 'Cornwall', 'Cumbria', 'Derbyshire', 'Devon', 'Dorset',
    'Durham', 'East Riding of Yorkshire', 'East Sussex', 'Essex',
    'Gloucestershire', 'Greater London', 'Greater Manchester', 'Hampshire',
    'Herefordshire', 'Hertfordshire', 'Isle of Wight', 'Kent', 'Lancashire',
    'Leicestershire', 'Lincolnshire', 'Merseyside', 'Norfolk', 'North Yorkshire',
    'Northamptonshire', 'Northumberland', 'Nottinghamshire', 'Oxfordshire',
    'Rutland', 'Shropshire', 'Somerset', 'South Yorkshire', 'Staffordshire',
    'Suffolk', 'Surrey', 'Tyne and Wear', 'Warwickshire', 'West Midlands',
    'West Sussex', 'West Yorkshire', 'Wiltshire', 'Worcestershire',
    // Wales
    'Anglesey', 'Blaenau Gwent', 'Bridgend', 'Caerphilly', 'Cardiff',
    'Carmarthenshire', 'Ceredigion', 'Conwy', 'Denbighshire', 'Flintshire',
    'Gwynedd', 'Merthyr Tydfil', 'Monmouthshire', 'Neath Port Talbot',
    'Newport', 'Pembrokeshire', 'Powys', 'Rhondda Cynon Taf', 'Swansea',
    'Torfaen', 'Vale of Glamorgan', 'Wrexham',
    // Scotland
    'Aberdeen City', 'Aberdeenshire', 'Angus', 'Argyll and Bute',
    'Clackmannanshire', 'Dumfries and Galloway', 'Dundee City',
    'East Ayrshire', 'East Dunbartonshire', 'East Lothian', 'East Renfrewshire',
    'Edinburgh', 'Falkirk', 'Fife', 'Glasgow City', 'Highland',
    'Inverclyde', 'Midlothian', 'Moray', 'North Ayrshire', 'North Lanarkshire',
    'Orkney', 'Perth and Kinross', 'Renfrewshire', 'Scottish Borders',
    'Shetland', 'South Ayrshire', 'South Lanarkshire', 'Stirling',
    'West Dunbartonshire', 'West Lothian', 'Western Isles',
    // Northern Ireland
    'Antrim', 'Armagh', 'Down', 'Fermanagh', 'Londonderry', 'Tyrone',
  ];

  const features: CountyFeature[] = [];

  console.log(`Fetching boundaries for ${counties.length} UK counties from Nominatim...`);
  
  for (let i = 0; i < counties.length; i++) {
    const county = counties[i];
    console.log(`[${i + 1}/${counties.length}] Fetching ${county}...`);

    try {
      // Search for the county
      const searchUrl = `https://nominatim.openstreetmap.org/search?` +
        `county=${encodeURIComponent(county)}&` +
        `country=United Kingdom&` +
        `format=json&` +
        `polygon_geojson=1&` +
        `limit=1`;

      const response = await fetch(searchUrl, {
        headers: {
          'User-Agent': 'WaterTowerMap/1.0',
        },
      });

      if (!response.ok) continue;

      const results = await response.json();
      if (results.length === 0 || !results[0].geojson) {
        console.log(`  ⚠️  No geometry found for ${county}`);
        continue;
      }

      const result = results[0];
      features.push({
        type: 'Feature',
        properties: {
          name: county,
        },
        geometry: result.geojson as any,
      });

      console.log(`  ✓ Got ${result.geojson.type} geometry`);

      // Rate limit: wait 1 second between requests (Nominatim requirement)
      await new Promise(resolve => setTimeout(resolve, 1000));

    } catch (error) {
      console.error(`  ✗ Error fetching ${county}:`, error);
    }
  }

  console.log(`\nSuccessfully fetched ${features.length} counties`);
  return features;
}

/**
 * Convert GeoJSON geometry to WKT format for PostGIS
 */
function convertGeoJSONToWKT(geometry: CountyFeature['geometry']): string {
  if (geometry.type === 'Polygon') {
    const rings = geometry.coordinates.map((ring: any) =>
      '(' + ring.map((coord: any) => `${coord[0]} ${coord[1]}`).join(', ') + ')'
    ).join(', ');
    return `POLYGON(${rings})`;
  } else if (geometry.type === 'MultiPolygon') {
    const polygons = geometry.coordinates.map((polygon: any) =>
      '(' + polygon.map((ring: any) =>
        '(' + ring.map((coord: any) => `${coord[0]} ${coord[1]}`).join(', ') + ')'
      ).join(', ') + ')'
    ).join(', ');
    return `MULTIPOLYGON(${polygons})`;
  }
  throw new Error(`Unsupported geometry type: ${geometry.type}`);
}

/**
 * Import counties to database
 */
async function importCounties(features: CountyFeature[]) {
  console.log('\nImporting counties to database...');

  // Clear existing counties (optional)
  console.log('Clearing existing counties...');
  const { error: clearError } = await supabase
    .from('counties')
    .delete()
    .neq('id', 0); // Delete all

  if (clearError) {
    console.log('Note: Could not clear existing counties (may have foreign key constraints)');
  }

  let imported = 0;
  let skipped = 0;

  for (const feature of features) {
    try {
      // Store geometry as JSON string (as the database expects)
      const geometryJson = JSON.stringify(feature.geometry);

      const { error } = await supabase
        .from('counties')
        .insert({
          name: feature.properties.name,
          geometry: geometryJson,
        });

      if (error) {
        // Skip duplicates
        if (error.code === '23505') {
          skipped++;
          continue;
        }
        throw error;
      }

      imported++;
      console.log(`  ✓ Imported ${feature.properties.name}`);

    } catch (error) {
      console.error(`  ✗ Error importing ${feature.properties.name}:`, error);
    }
  }

  console.log(`\n✓ Successfully imported ${imported} counties`);
  console.log(`  Skipped ${skipped} duplicates`);
}

/**
 * Assign towers to counties using spatial query
 */
async function assignTowers() {
  console.log('\nAssigning towers to counties...');

  // Get all towers without counties
  const { data: towers, error: towersError } = await supabase
    .from('water_towers')
    .select('id, latitude, longitude')
    .is('county_id', null);

  if (towersError) throw towersError;

  console.log(`Found ${towers?.length || 0} towers without counties`);

  if (!towers || towers.length === 0) return;

  // Get all counties with their geometries
  const { data: counties, error: countiesError } = await supabase
    .from('counties')
    .select('id, name, geometry');

  if (countiesError) throw countiesError;
  if (!counties || counties.length === 0) {
    console.log('No counties found in database');
    return;
  }

  console.log(`Checking ${towers.length} towers against ${counties.length} counties...`);

  let assigned = 0;

  for (const tower of towers) {
    const point = [tower.longitude, tower.latitude];

    // Find which county contains this point
    for (const county of counties) {
      try {
        const geometry = JSON.parse(county.geometry);
        
        if (pointInPolygon(point, geometry)) {
          // Assign tower to county
          const { error } = await supabase
            .from('water_towers')
            .update({ county_id: county.id })
            .eq('id', tower.id);

          if (!error) {
            assigned++;
            if (assigned % 10 === 0) {
              console.log(`  Assigned ${assigned} towers...`);
            }
          }
          break; // Found county, move to next tower
        }
      } catch (e) {
        // Skip if geometry parsing fails
        continue;
      }
    }
  }

  console.log(`\n✓ Assigned ${assigned} towers to counties`);
  console.log(`  ${towers.length - assigned} towers remain unassigned`);
}

/**
 * Simple point-in-polygon test
 */
function pointInPolygon(point: number[], geometry: any): boolean {
  if (geometry.type === 'Polygon') {
    return pointInRing(point, geometry.coordinates[0]); // Check outer ring only
  } else if (geometry.type === 'MultiPolygon') {
    for (const polygon of geometry.coordinates) {
      if (pointInRing(point, polygon[0])) return true;
    }
  }
  return false;
}

/**
 * Ray casting algorithm for point in polygon
 */
function pointInRing(point: number[], ring: number[][]): boolean {
  const [x, y] = point;
  let inside = false;

  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];

    const intersect = ((yi > y) !== (yj > y)) &&
      (x < (xj - xi) * (y - yi) / (yj - yi) + xi);

    if (intersect) inside = !inside;
  }

  return inside;
}

/**
 * Save features to file for inspection
 */
function saveToFile(features: CountyFeature[], filename: string) {
  const geojson = {
    type: 'FeatureCollection',
    features,
  };

  const filepath = path.join(process.cwd(), 'public', 'assets', filename);
  fs.writeFileSync(filepath, JSON.stringify(geojson, null, 2));
  console.log(`\nSaved ${features.length} counties to ${filepath}`);
}

// Main execution
async function main() {
  try {
    console.log('=== UK Counties Data Importer ===\n');

    // Fetch county boundaries from Nominatim (more reliable than Overpass for counties)
    const features = await fetchCountiesFromNominatim();

    if (features.length === 0) {
      console.error('No counties fetched. Exiting.');
      process.exit(1);
    }

    // Save to file for inspection
    saveToFile(features, 'uk-counties-fetched.geojson');

    // Import to database
    await importCounties(features);

    // Assign towers
    await assignTowers();

    console.log('\n✅ Import complete!');

  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

main();

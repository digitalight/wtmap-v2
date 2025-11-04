import dotenv from 'dotenv';
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

dotenv.config({ path: '.env.local' });

interface OSMElement {
  type: string;
  id: number;
  tags?: Record<string, string>;
  members?: Array<{ type: string; ref: number; role: string }>;
  nodes?: number[];
  lat?: number;
  lon?: number;
}

interface OSMResponse {
  elements: OSMElement[];
}

interface GeoJSONFeature {
  type: 'Feature';
  properties: {
    name: string;
    admin_level: string;
    osm_id: number;
  };
  geometry: {
    type: string;
    coordinates: any[];
  };
}

async function fetchOSMRegions() {
  console.log('╔══════════════════════════════════════════════════════╗');
  console.log('║   Fetching UK Regions from OpenStreetMap            ║');
  console.log('╚══════════════════════════════════════════════════════╝\n');

  // Overpass query for UK regions
  // admin_level=6 typically represents counties/unitary authorities in UK
  // We'll fetch these as they're a good balance between granularity and coverage
  const query = `
[out:json][timeout:180];
area[name="United Kingdom"]["admin_level"="2"];
(
  relation(area)["boundary"="administrative"]["admin_level"="6"];
);
out body;
>;
out skel qt;
  `.trim();

  console.log('=== Step 1: Querying Overpass API ===\n');
  console.log('Query: Fetching admin_level=6 regions (counties) for UK');
  console.log('This may take 1-2 minutes...\n');

  try {
    const response = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: `data=${encodeURIComponent(query)}`,
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data: OSMResponse = await response.json();
    console.log(`✅ Retrieved ${data.elements.length} regions from OSM\n`);

    console.log('=== Step 2: Converting to GeoJSON ===\n');

    const features: GeoJSONFeature[] = [];
    let converted = 0;
    let skipped = 0;

    for (const element of data.elements) {
      if (element.type === 'relation' && element.tags?.name) {
        try {
          // Extract geometry from the relation
          const geometry = extractGeometryFromRelation(element, data.elements);
          
          if (geometry) {
            features.push({
              type: 'Feature',
              properties: {
                name: element.tags.name,
                admin_level: element.tags.admin_level || '6',
                osm_id: element.id,
              },
              geometry,
            });
            converted++;
            console.log(`  ✓ ${element.tags.name}`);
          } else {
            skipped++;
            console.log(`  ⚠ Skipped ${element.tags.name} (no valid geometry)`);
          }
        } catch (err) {
          skipped++;
          console.log(`  ✗ Error processing ${element.tags.name}`);
        }
      }
    }

    console.log(`\n✅ Converted ${converted} regions`);
    if (skipped > 0) {
      console.log(`⚠ Skipped ${skipped} regions (missing or invalid geometry)`);
    }

    console.log('\n=== Step 3: Saving to file ===\n');

    const geojson = {
      type: 'FeatureCollection',
      features,
    };

    const outputPath = join(process.cwd(), 'public', 'assets', 'osm-regions.geojson');
    writeFileSync(outputPath, JSON.stringify(geojson, null, 2));

    console.log(`✅ Saved to: ${outputPath}`);
    console.log(`\n📊 Summary:`);
    console.log(`   Total regions: ${features.length}`);
    console.log(`   Format: GeoJSON FeatureCollection`);
    console.log(`   Admin level: 6 (UK counties/unitary authorities)`);

    return geojson;
  } catch (error) {
    console.error('❌ Error fetching from OpenStreetMap:', error);
    throw error;
  }
}

function extractGeometryFromRelation(
  relation: OSMElement,
  allElements: OSMElement[]
): { type: string; coordinates: any[] } | null {
  if (!relation.members) return null;

  // Build a map of all elements by ID for quick lookup
  const elementMap = new Map<number, OSMElement>();
  for (const el of allElements) {
    elementMap.set(el.id, el);
  }

  // Extract outer and inner ways
  const outerWays: OSMElement[] = [];
  const innerWays: OSMElement[] = [];

  for (const member of relation.members) {
    if (member.type === 'way') {
      const way = elementMap.get(member.ref);
      if (way && way.nodes) {
        if (member.role === 'outer' || !member.role) {
          outerWays.push(way);
        } else if (member.role === 'inner') {
          innerWays.push(way);
        }
      }
    }
  }

  if (outerWays.length === 0) return null;

  // Convert ways to coordinate rings
  const outerRings = waysToRings(outerWays, elementMap);
  const innerRings = waysToRings(innerWays, elementMap);

  if (outerRings.length === 0) return null;

  // Build polygon(s)
  if (outerRings.length === 1) {
    // Simple polygon
    return {
      type: 'Polygon',
      coordinates: [outerRings[0], ...innerRings],
    };
  } else {
    // MultiPolygon
    return {
      type: 'MultiPolygon',
      coordinates: outerRings.map(ring => [ring, ...innerRings]),
    };
  }
}

function waysToRings(
  ways: OSMElement[],
  elementMap: Map<number, OSMElement>
): number[][][] {
  if (ways.length === 0) return [];

  const rings: number[][][] = [];
  const usedWays = new Set<number>();

  // Try to build closed rings from ways
  for (let i = 0; i < ways.length; i++) {
    if (usedWays.has(i)) continue;

    const ring: number[][] = [];
    let currentWay = ways[i];
    usedWays.add(i);

    // Add nodes from first way
    if (currentWay.nodes) {
      for (const nodeId of currentWay.nodes) {
        const node = elementMap.get(nodeId);
        if (node && node.lat !== undefined && node.lon !== undefined) {
          ring.push([node.lon, node.lat]);
        }
      }
    }

    // Try to connect more ways to form a closed ring
    let attempts = 0;
    while (attempts < ways.length) {
      const lastNode = currentWay.nodes?.[currentWay.nodes.length - 1];
      let found = false;

      for (let j = 0; j < ways.length; j++) {
        if (usedWays.has(j)) continue;

        const nextWay = ways[j];
        if (!nextWay.nodes) continue;

        if (nextWay.nodes[0] === lastNode) {
          // Continues from end
          for (let k = 1; k < nextWay.nodes.length; k++) {
            const node = elementMap.get(nextWay.nodes[k]);
            if (node && node.lat !== undefined && node.lon !== undefined) {
              ring.push([node.lon, node.lat]);
            }
          }
          currentWay = nextWay;
          usedWays.add(j);
          found = true;
          break;
        } else if (nextWay.nodes[nextWay.nodes.length - 1] === lastNode) {
          // Continues from end but reversed
          for (let k = nextWay.nodes.length - 2; k >= 0; k--) {
            const node = elementMap.get(nextWay.nodes[k]);
            if (node && node.lat !== undefined && node.lon !== undefined) {
              ring.push([node.lon, node.lat]);
            }
          }
          currentWay = nextWay;
          usedWays.add(j);
          found = true;
          break;
        }
      }

      if (!found) break;
      attempts++;
    }

    // Check if ring is closed
    if (ring.length > 3) {
      const first = ring[0];
      const last = ring[ring.length - 1];
      if (first[0] !== last[0] || first[1] !== last[1]) {
        // Close the ring
        ring.push([...first]);
      }
      rings.push(ring);
    }
  }

  return rings;
}

// Run the script
fetchOSMRegions().catch(console.error);

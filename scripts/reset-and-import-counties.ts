/**
 * Reset county assignments and import fresh from counties3.geojson
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
  console.error('Missing required environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface CountyFeature {
  type: 'Feature';
  properties: {
    shapeName: string;
    shapeISO: string;
    shapeID: string;
    shapeGroup: string;
    shapeType: string;
  };
  geometry: {
    type: 'Polygon' | 'MultiPolygon';
    coordinates: number[][][] | number[][][][];
  };
}

interface GeoJSONCollection {
  type: 'FeatureCollection';
  features: CountyFeature[];
}

/**
 * Step 1: Clear all tower county assignments
 */
async function clearTowerAssignments() {
  console.log('=== Step 1: Clearing all tower county assignments ===\n');

  const { error } = await supabase
    .from('water_towers')
    .update({ county_id: null })
    .not('county_id', 'is', null);

  if (error) {
    console.error('Error clearing assignments:', error);
    throw error;
  }

  const { count } = await supabase
    .from('water_towers')
    .select('*', { count: 'exact', head: true })
    .is('county_id', null);

  console.log(`✅ Cleared all tower assignments`);
  console.log(`   ${count} towers now unassigned\n`);
}

/**
 * Step 2: Delete all existing counties
 */
async function deleteAllCounties() {
  console.log('=== Step 2: Deleting all existing counties ===\n');

  const { error } = await supabase
    .from('counties')
    .delete()
    .neq('id', 0); // Delete all

  if (error) {
    console.error('Error deleting counties:', error);
    throw error;
  }

  console.log('✅ Deleted all existing counties\n');
}

/**
 * Step 3: Load counties from GeoJSON file
 */
function loadCountiesFromFile(): CountyFeature[] {
  const filePath = path.join(process.cwd(), 'public', 'assets', 'counties.geojson');
  
  console.log('=== Step 3: Loading counties from file ===\n');
  console.log('File path:', filePath);
  
  const fileContent = fs.readFileSync(filePath, 'utf-8');
  const geojson: GeoJSONCollection = JSON.parse(fileContent);
  
  console.log(`✅ Loaded ${geojson.features.length} regions from file\n`);
  
  return geojson.features;
}

/**
 * Step 4: Import counties to database
 */
async function importCounties(features: CountyFeature[]) {
  console.log('=== Step 4: Importing regions to database ===\n');

  let imported = 0;
  let errors = 0;

  for (const feature of features) {
    const countyName = feature.properties.shapeName;
    
    try {
      // Store geometry as JSON string
      const geometryJson = JSON.stringify(feature.geometry);

      const { error } = await supabase
        .from('counties')
        .insert({
          name: countyName,
          geometry: geometryJson,
        });

      if (error) throw error;

      imported++;
      console.log(`  ✓ Imported ${countyName}`);

    } catch (error: any) {
      errors++;
      console.error(`  ✗ Error with ${countyName}:`, error.message);
    }
  }

  console.log(`\n=== Import Summary ===`);
  console.log(`✓ Successfully imported: ${imported}`);
  console.log(`✗ Errors: ${errors}`);
}

/**
 * Step 5: Assign towers to counties using spatial query
 */
async function assignTowers() {
  console.log('\n=== Step 5: Assigning towers to counties ===\n');

  // Get all towers
  const { data: towers, error: towersError } = await supabase
    .from('water_towers')
    .select('id, latitude, longitude');

  if (towersError) throw towersError;

  console.log(`Found ${towers?.length || 0} total towers`);

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

  console.log(`Checking against ${counties.length} counties...\n`);

  let assigned = 0;
  let unassigned = 0;

  for (let i = 0; i < towers.length; i++) {
    const tower = towers[i];
    const point = [tower.longitude, tower.latitude];

    // Find which county contains this point
    let foundCounty = false;
    
    for (const county of counties) {
      try {
        const geometry = JSON.parse(county.geometry);
        
        if (pointInPolygon(point, geometry)) {
          const { error } = await supabase
            .from('water_towers')
            .update({ county_id: county.id })
            .eq('id', tower.id);

          if (!error) {
            assigned++;
            
            if (assigned % 50 === 0) {
              console.log(`  Progress: ${assigned} towers assigned...`);
            }
          }
          
          foundCounty = true;
          break; // Found county, move to next tower
        }
      } catch (e) {
        // Skip if geometry parsing fails
        continue;
      }
    }
    
    if (!foundCounty) {
      unassigned++;
    }
  }

  console.log(`\n=== Assignment Summary ===`);
  console.log(`✓ Assigned: ${assigned}`);
  console.log(`⚠ Unassigned: ${unassigned}`);
  console.log(`Total towers: ${towers.length}`);
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
 * Step 6: Show final statistics
 */
async function showStatistics() {
  console.log('\n=== Final Statistics ===\n');

  // Get county count
  const { count: countyCount } = await supabase
    .from('counties')
    .select('*', { count: 'exact', head: true });

  console.log(`Total counties: ${countyCount}`);

  // Get tower counts
  const { data: counties } = await supabase
    .from('counties')
    .select('id, name');

  if (!counties) return;

  const countyStats = [];

  for (const county of counties) {
    const { count } = await supabase
      .from('water_towers')
      .select('*', { count: 'exact', head: true })
      .eq('county_id', county.id);

    if (count && count > 0) {
      countyStats.push({ name: county.name, count });
    }
  }

  // Sort by count descending
  countyStats.sort((a, b) => b.count - a.count);

  console.log('\nCounties by tower count:');
  countyStats.forEach((stat, i) => {
    console.log(`  ${(i + 1).toString().padStart(2)}. ${stat.name.padEnd(30)} ${stat.count} towers`);
  });

  const totalAssigned = countyStats.reduce((sum, stat) => sum + stat.count, 0);
  
  const { count: totalTowers } = await supabase
    .from('water_towers')
    .select('*', { count: 'exact', head: true });

  console.log(`\nTotal towers assigned: ${totalAssigned} / ${totalTowers}`);
  console.log(`Unassigned: ${(totalTowers || 0) - totalAssigned}`);
}

// Main execution
async function main() {
  try {
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║   Reset and Import UK Counties from counties.geojson    ║');
  console.log('╚══════════════════════════════════════════════════════════╝\n');    // Step 1: Clear tower assignments
    await clearTowerAssignments();

    // Step 2: Delete all counties
    await deleteAllCounties();

    // Step 3: Load counties from file
    const features = loadCountiesFromFile();

    if (features.length === 0) {
      console.error('No counties found in file. Exiting.');
      process.exit(1);
    }

    // Step 4: Import to database
    await importCounties(features);

    // Step 5: Assign towers
    await assignTowers();

    // Step 6: Show statistics
    await showStatistics();

    console.log('\n✅ Reset and import complete!');

  } catch (error) {
    console.error('\n❌ Error:', error);
    process.exit(1);
  }
}

main();

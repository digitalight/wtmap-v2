/**
 * Import UK counties from government GeoJSON file
 * This uses the official UK county/unitary authority boundaries
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
    FID: number;
    CTYUA23CD: string;
    CTYUA23NM: string;
    CTYUA23NMW: string;
    BNG_E: number;
    BNG_N: number;
    LONG: number;
    LAT: number;
    GlobalID: string;
  };
  geometry: {
    type: 'MultiPolygon' | 'Polygon';
    coordinates: any;
  };
}

interface GeoJSONCollection {
  type: 'FeatureCollection';
  features: CountyFeature[];
}

/**
 * Load counties from GeoJSON file
 */
function loadCountiesFromFile(): CountyFeature[] {
  const filepath = path.join(__dirname, '..', 'public', 'assets', 'counties2.geojson');
  
  console.log('Loading counties from:', filepath);
  
  const fileContent = fs.readFileSync(filepath, 'utf-8');
  const geojson: GeoJSONCollection = JSON.parse(fileContent);
  
  console.log(`Loaded ${geojson.features.length} counties from file`);
  
  return geojson.features;
}

/**
 * Import counties to database
 */
async function importCounties(features: CountyFeature[]) {
  console.log('\n=== Importing counties to database ===\n');

  // Clear existing counties (optional - commented out to preserve existing data)
  console.log('Note: Not clearing existing counties (preserving current data)');
  
  let imported = 0;
  let skipped = 0;
  let errors = 0;

  for (const feature of features) {
    const countyName = feature.properties.CTYUA23NM;
    
    try {
      // Store geometry as JSON string (as the database expects)
      const geometryJson = JSON.stringify(feature.geometry);

      // Check if county already exists
      const { data: existing } = await supabase
        .from('counties')
        .select('id')
        .eq('name', countyName)
        .single();

      if (existing) {
        // Update existing county
        const { error } = await supabase
          .from('counties')
          .update({ geometry: geometryJson })
          .eq('id', existing.id);

        if (error) throw error;
        
        skipped++;
        console.log(`  ↻ Updated ${countyName}`);
      } else {
        // Insert new county
        const { error } = await supabase
          .from('counties')
          .insert({
            name: countyName,
            geometry: geometryJson,
          });

        if (error) throw error;

        imported++;
        console.log(`  ✓ Imported ${countyName}`);
      }

    } catch (error: any) {
      errors++;
      console.error(`  ✗ Error with ${countyName}:`, error.message);
    }
  }

  console.log(`\n=== Import Summary ===`);
  console.log(`✓ Newly imported: ${imported}`);
  console.log(`↻ Updated existing: ${skipped}`);
  console.log(`✗ Errors: ${errors}`);
  console.log(`Total in file: ${features.length}`);
}

/**
 * Assign towers to counties using spatial query
 */
async function assignTowers() {
  console.log('\n=== Assigning towers to counties ===\n');

  // Get all towers
  const { data: towers, error: towersError } = await supabase
    .from('water_towers')
    .select('id, latitude, longitude, county_id');

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
  let updated = 0;
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
          // Check if tower already has this county assigned
          if (tower.county_id !== county.id) {
            const { error } = await supabase
              .from('water_towers')
              .update({ county_id: county.id })
              .eq('id', tower.id);

            if (!error) {
              if (tower.county_id === null) {
                assigned++;
              } else {
                updated++;
              }
              
              if ((assigned + updated) % 50 === 0) {
                console.log(`  Progress: ${assigned + updated} towers assigned/updated...`);
              }
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
    
    if (!foundCounty && tower.county_id === null) {
      unassigned++;
    }
  }

  console.log(`\n=== Assignment Summary ===`);
  console.log(`✓ Newly assigned: ${assigned}`);
  console.log(`↻ Updated assignment: ${updated}`);
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
 * Show county statistics
 */
async function showStatistics() {
  console.log('\n=== County Statistics ===\n');

  // Get tower count per county
  const { data: counties, error } = await supabase
    .from('counties')
    .select('id, name');

  if (error || !counties) {
    console.error('Error fetching counties:', error);
    return;
  }

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

  // Show top 20
  console.log('Top 20 counties by tower count:');
  countyStats.slice(0, 20).forEach((stat, i) => {
    console.log(`  ${(i + 1).toString().padStart(2)}. ${stat.name.padEnd(30)} ${stat.count} towers`);
  });

  const totalAssigned = countyStats.reduce((sum, stat) => sum + stat.count, 0);
  console.log(`\nTotal towers assigned to counties: ${totalAssigned}`);
}

// Main execution
async function main() {
  try {
    console.log('=== UK Counties Import from Government Data ===\n');

    // Load counties from GeoJSON file
    const features = loadCountiesFromFile();

    if (features.length === 0) {
      console.error('No counties found in file. Exiting.');
      process.exit(1);
    }

    // Import to database
    await importCounties(features);

    // Assign towers
    await assignTowers();

    // Show statistics
    await showStatistics();

    console.log('\n✅ Import complete!');

  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

main();

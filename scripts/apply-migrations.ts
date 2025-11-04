import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function applyMigrations() {
  console.log('Applying PostGIS migrations...\n');

  // Read migration files
  const migration006 = fs.readFileSync(
    path.join(__dirname, '..', 'supabase', 'migrations', '006_improve_counties.sql'),
    'utf8'
  );

  const migration007 = fs.readFileSync(
    path.join(__dirname, '..', 'supabase', 'migrations', '007_postgis_helpers.sql'),
    'utf8'
  );

  // Split by statement and execute each one
  const statements006 = migration006
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'));

  const statements007 = migration007
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'));

  console.log('Migration 006: Improve Counties');
  for (const stmt of statements006) {
    try {
      const { error } = await supabase.rpc('exec_sql', { query: stmt + ';' });
      if (error) {
        console.log(`  ⚠ ${error.message}`);
      } else {
        console.log(`  ✓ Statement executed`);
      }
    } catch (e) {
      console.log(`  ⚠ ${e}`);
    }
  }

  console.log('\nMigration 007: PostGIS Helpers');
  for (const stmt of statements007) {
    try {
      const { error } = await supabase.rpc('exec_sql', { query: stmt + ';' });
      if (error) {
        console.log(`  ⚠ ${error.message}`);
      } else {
        console.log(`  ✓ Statement executed`);
      }
    } catch (e) {
      console.log(`  ⚠ ${e}`);
    }
  }

  console.log('\n✅ Migrations applied!');
}

applyMigrations();

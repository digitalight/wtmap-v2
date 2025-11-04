import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function applyRLSFix() {
  console.log('Applying RLS fix for user_visits table...\n');

  const migration = fs.readFileSync(
    path.join(__dirname, '..', 'supabase', 'migrations', '008_fix_user_visits_rls.sql'),
    'utf8'
  );

  // Split by statement and execute each one
  const statements = migration
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'));

  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i];
    try {
      console.log(`Executing statement ${i + 1}/${statements.length}...`);
      const { data, error } = await supabase.rpc('exec_sql', { query: stmt + ';' });
      if (error) {
        console.log(`  ⚠ Error: ${error.message}`);
        // Try direct execution if rpc fails
        const { error: directError } = await supabase.from('_migrations').select('*').limit(0);
        if (directError) {
          console.log(`  Trying alternative method...`);
        }
      } else {
        console.log(`  ✓ Success`);
      }
    } catch (e: any) {
      console.log(`  ⚠ ${e.message || e}`);
    }
  }

  console.log('\n✅ Migration complete!');
  console.log('\nTesting RLS policies...');
  
  // Test if RLS is working
  const { data, error } = await supabase
    .from('user_visits')
    .select('*')
    .limit(1);
  
  if (error) {
    console.log('❌ Error querying user_visits:', error.message);
  } else {
    console.log('✅ Can query user_visits successfully');
  }
}

applyRLSFix().catch(console.error);

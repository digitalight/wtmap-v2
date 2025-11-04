const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");
const path = require("path");
require("dotenv").config({ path: ".env.local" });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

async function applyRLSFix() {
  console.log("Applying RLS policies for user_visits...\n");

  const queries = [
    `ALTER TABLE user_visits ENABLE ROW LEVEL SECURITY;`,

    `DROP POLICY IF EXISTS "Users can view all visits" ON user_visits;`,
    `DROP POLICY IF EXISTS "Users can insert their own visits" ON user_visits;`,
    `DROP POLICY IF EXISTS "Users can update their own visits" ON user_visits;`,
    `DROP POLICY IF EXISTS "Users can delete their own visits" ON user_visits;`,
    `DROP POLICY IF EXISTS "Users can manage their visits" ON user_visits;`,

    `CREATE POLICY "Users can view all visits" ON user_visits FOR SELECT USING (true);`,

    `CREATE POLICY "Users can insert their own visits" ON user_visits FOR INSERT WITH CHECK (auth.uid() = user_id);`,

    `CREATE POLICY "Users can update their own visits" ON user_visits FOR UPDATE USING (auth.uid() = user_id);`,

    `CREATE POLICY "Users can delete their own visits" ON user_visits FOR DELETE USING (auth.uid() = user_id);`,
  ];

  for (let i = 0; i < queries.length; i++) {
    const query = queries[i];
    console.log(`${i + 1}. ${query.substring(0, 60)}...`);

    try {
      const { data, error } = await supabase.rpc("exec_sql", {
        sql_query: query,
      });
      if (error) {
        console.log(`   ⚠ ${error.message}`);
      } else {
        console.log(`   ✓ Success`);
      }
    } catch (e) {
      console.log(`   ⚠ ${e.message}`);
    }
  }

  console.log("\n✅ RLS policies applied!");
}

applyRLSFix();

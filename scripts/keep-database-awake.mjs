// Simple script to keep Supabase database awake
// Run by .github/workflows/keep-database-awake.yml (backup to the Vercel cron route)

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

console.log("Pinging database...");
const { error } = await supabase.from("water_towers").select("id").limit(1);

if (error) {
  console.error("Error pinging database:", error);
  process.exit(1);
}
console.log("✅ Database is awake!");

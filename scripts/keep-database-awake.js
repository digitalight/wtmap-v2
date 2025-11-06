// Simple script to keep Supabase database awake
// Run this with a cron job or scheduled task daily

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function pingDatabase() {
  try {
    console.log("Pinging database...");
    const { data, error } = await supabase
      .from("water_towers")
      .select("id")
      .limit(1);

    if (error) {
      console.error("Error pinging database:", error);
    } else {
      console.log("✅ Database is awake!");
    }
  } catch (err) {
    console.error("Failed to ping database:", err);
  }
}

pingDatabase();

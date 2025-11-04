const { createClient } = require("@supabase/supabase-js");

// Load environment variables
require("dotenv").config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase environment variables");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runMigration() {
  console.log("Checking tower_comments table...");

  try {
    // Check if table exists by trying to select from it
    const { error: checkError } = await supabase
      .from("tower_comments")
      .select("id")
      .limit(1);

    if (checkError && checkError.code === "PGRST106") {
      console.log("\n❌ tower_comments table does not exist.");
      console.log("\n📋 Please create it manually via Supabase SQL Editor:");
      console.log("1. Go to your Supabase dashboard");
      console.log("2. Navigate to SQL Editor");
      console.log("3. Run this SQL:\n");
      console.log(`
CREATE TABLE tower_comments (
    id SERIAL PRIMARY KEY,
    tower_id TEXT NOT NULL REFERENCES water_towers(id),
    user_id UUID NOT NULL REFERENCES auth.users(id),
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_tower_comments_tower_id ON tower_comments(tower_id);
CREATE INDEX idx_tower_comments_user_id ON tower_comments(user_id);
CREATE INDEX idx_tower_comments_created_at ON tower_comments(created_at DESC);

ALTER TABLE tower_comments ENABLE ROW LEVEL SECURITY;

-- Create policies for RLS
CREATE POLICY "Users can view tower comments" ON tower_comments
    FOR SELECT USING (true);

CREATE POLICY "Users can insert their own comments" ON tower_comments
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own comments" ON tower_comments
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own comments" ON tower_comments
    FOR DELETE USING (auth.uid() = user_id);
      `);
    } else {
      console.log("✅ tower_comments table already exists!");
      console.log("Comments and ratings system should now work properly.");
    }
  } catch (error) {
    console.error("Migration check failed:", error);
  }
}

runMigration();

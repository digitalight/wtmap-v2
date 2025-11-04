const { createClient } = require("@supabase/supabase-js");
require("dotenv").config({ path: ".env.local" });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function checkStorage() {
  console.log("\n=== Checking Storage Configuration ===\n");

  // Get bucket info
  const { data: bucket, error: bucketError } = await supabase.storage.getBucket(
    "tower-images"
  );

  if (bucketError) {
    console.error("Error getting bucket:", bucketError);
  } else {
    console.log("Bucket configuration:", JSON.stringify(bucket, null, 2));
  }

  // Try to list files
  const { data: files, error: filesError } = await supabase.storage
    .from("tower-images")
    .list("towers/da9675cd-ee35-4ad5-a7c5-40ecd21fb7c6", {
      limit: 10,
    });

  if (filesError) {
    console.error("\nError listing files:", filesError);
  } else {
    console.log("\nFiles found:", files);
  }

  // Get public URL
  const publicUrl = supabase.storage
    .from("tower-images")
    .getPublicUrl(
      "towers/da9675cd-ee35-4ad5-a7c5-40ecd21fb7c6/11d3189e-8692-4eac-8c57-61f844a14830_1762123586184_od7u5ps.jpg"
    );

  console.log("\nPublic URL result:", publicUrl);

  console.log("\n=== Next Steps ===");
  console.log("If the bucket is not public, you need to:");
  console.log("1. Go to Supabase Dashboard > Storage > tower-images");
  console.log("2. Click the 3 dots menu > Make public");
  console.log("3. Or update bucket policies to allow public SELECT\n");
}

checkStorage().catch(console.error);

const { createClient } = require("@supabase/supabase-js");
require("dotenv").config({ path: ".env.local" });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function checkRanges() {
  const { data } = await supabase
    .from("water_towers")
    .select("latitude, longitude, county_id");

  const assigned = data.filter((t) => t.county_id);
  const unassigned = data.filter((t) => !t.county_id);

  console.log(`Assigned: ${assigned.length}`);
  console.log(
    "  Lat:",
    Math.min(...assigned.map((t) => t.latitude)),
    "to",
    Math.max(...assigned.map((t) => t.latitude))
  );
  console.log(
    "  Lon:",
    Math.min(...assigned.map((t) => t.longitude)),
    "to",
    Math.max(...assigned.map((t) => t.longitude))
  );

  console.log(`\nUnassigned: ${unassigned.length}`);
  console.log(
    "  Lat:",
    Math.min(...unassigned.map((t) => t.latitude)),
    "to",
    Math.max(...unassigned.map((t) => t.latitude))
  );
  console.log(
    "  Lon:",
    Math.min(...unassigned.map((t) => t.longitude)),
    "to",
    Math.max(...unassigned.map((t) => t.longitude))
  );

  // Check some samples
  console.log("\nSample unassigned near UK center:");
  const ukCenter = unassigned
    .filter(
      (t) =>
        t.latitude > 50 &&
        t.latitude < 55 &&
        t.longitude > -3 &&
        t.longitude < 2
    )
    .slice(0, 5);
  ukCenter.forEach((t) => console.log(`  [${t.latitude}, ${t.longitude}]`));
}

checkRanges();

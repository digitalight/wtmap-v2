// Simple test to add sample UK water towers manually
import { createClient } from "@supabase/supabase-js";
import fs from "fs";

// Load environment variables manually from .env.local
const envFile = fs.readFileSync(".env.local", "utf8");
const envVars = {};
envFile.split("\n").forEach((line) => {
  const [key, value] = line.split("=");
  if (key && value) {
    envVars[key.trim()] = value.trim();
  }
});

const supabaseUrl = envVars.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = envVars.SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function addSampleTowers() {
  console.log("Adding sample UK water towers...");

  // Some known UK water towers (real examples)
  const sampleTowers = [
    {
      name: "Primrose Hill Water Tower",
      latitude: 51.5427,
      longitude: -0.1545,
      osm_id: "manual/1",
      osm_type: "node",
      height: 25,
      operational: true,
      county_id: null, // Will be set later
      tags: { man_made: "water_tower", location: "London" },
    },
    {
      name: "Shooter's Hill Water Tower",
      latitude: 51.4632,
      longitude: 0.0547,
      osm_id: "manual/2",
      osm_type: "node",
      height: 40,
      operational: true,
      county_id: null,
      tags: { man_made: "water_tower", location: "Greenwich" },
    },
    {
      name: "Highgate Water Tower",
      latitude: 51.5706,
      longitude: -0.1456,
      osm_id: "manual/3",
      osm_type: "node",
      height: 30,
      operational: true,
      county_id: null,
      tags: { man_made: "water_tower", location: "North London" },
    },
    {
      name: "Horniman Museum Water Tower",
      latitude: 51.4389,
      longitude: -0.0614,
      osm_id: "manual/4",
      osm_type: "node",
      height: 35,
      operational: true,
      county_id: null,
      tags: { man_made: "water_tower", location: "Forest Hill" },
    },
    {
      name: "Kempton Park Water Tower",
      latitude: 51.4167,
      longitude: -0.4167,
      osm_id: "manual/5",
      osm_type: "node",
      height: 50,
      operational: true,
      county_id: null,
      tags: { man_made: "water_tower", location: "Surrey" },
    },
  ];

  try {
    const { data, error } = await supabase
      .from("water_towers")
      .insert(sampleTowers)
      .select();

    if (error) {
      console.error("Error inserting sample towers:", error);
      return;
    }

    console.log(`✅ Successfully inserted ${data.length} sample water towers:`);
    data.forEach((tower, i) => {
      console.log(
        `  ${i + 1}. ${tower.name} (${tower.latitude}, ${tower.longitude})`
      );
    });
  } catch (error) {
    console.error("Error:", error);
  }
}

addSampleTowers();

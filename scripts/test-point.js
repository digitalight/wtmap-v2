const { createClient } = require("@supabase/supabase-js");
require("dotenv").config({ path: ".env.local" });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Test point in Suffolk
const testPoint = [0.5097699, 52.2512476]; // [lon, lat]

async function testPointInCounties() {
  const { data: counties } = await supabase
    .from("counties")
    .select("id, name, geometry")
    .in("name", ["Suffolk", "Cambridgeshire", "Essex", "Norfolk"]);

  console.log(`Testing point [${testPoint}]`);
  console.log(`(Around Bury St Edmunds area)\n`);

  for (const county of counties) {
    const geometry = JSON.parse(county.geometry);
    console.log(`${county.name}:`);
    console.log(`  Type: ${geometry.type}`);
    console.log(`  Coordinates arrays: ${geometry.coordinates.length}`);

    if (geometry.type === "MultiPolygon") {
      console.log(`  First polygon rings: ${geometry.coordinates[0].length}`);
      console.log(`  First ring points: ${geometry.coordinates[0][0].length}`);
      const bounds = getBounds(geometry.coordinates[0][0]);
      console.log(
        `  Bounds: lat ${bounds.minLat}-${bounds.maxLat}, lon ${bounds.minLon}-${bounds.maxLon}`
      );
      console.log(`  Point in bounds: ${pointInBounds(testPoint, bounds)}`);
    }
  }
}

function getBounds(ring) {
  const lons = ring.map((p) => p[0]);
  const lats = ring.map((p) => p[1]);
  return {
    minLon: Math.min(...lons),
    maxLon: Math.max(...lons),
    minLat: Math.min(...lats),
    maxLat: Math.max(...lats),
  };
}

function pointInBounds(point, bounds) {
  return (
    point[0] >= bounds.minLon &&
    point[0] <= bounds.maxLon &&
    point[1] >= bounds.minLat &&
    point[1] <= bounds.maxLat
  );
}

testPointInCounties();

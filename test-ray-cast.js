const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

function pointInRing(point, ring) {
  const [x, y] = point;
  let inside = false;

  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];

    const intersect = ((yi > y) !== (yj > y)) &&
      (x < (xj - xi) * (y - yi) / (yj - yi) + xi);

    if (intersect) inside = !inside;
  }

  return inside;
}

function pointInPolygon(point, geometry) {
  if (geometry.type === 'Polygon') {
    return pointInRing(point, geometry.coordinates[0]);
  } else if (geometry.type === 'MultiPolygon') {
    for (const polygon of geometry.coordinates) {
      if (pointInRing(point, polygon[0])) return true;
    }
  }
  return false;
}

async function test() {
  const testPoint = [0.5097699, 52.2512476];
  
  const { data } = await supabase
    .from('counties')
    .select('name, geometry')
    .eq('name', 'Suffolk')
    .single();

  const geometry = JSON.parse(data.geometry);
  
  console.log(`Testing point [${testPoint}] in Suffolk`);
  console.log(`Geometry type: ${geometry.type}`);
  console.log(`Polygons: ${geometry.coordinates.length}`);
  
  const result = pointInPolygon(testPoint, geometry);
  console.log(`\nResult: ${result ? 'INSIDE' : 'OUTSIDE'}`);
  
  console.log(`\nTesting just polygon 101:`);
  const ring101 = geometry.coordinates[101][0];
  const result101 = pointInRing(testPoint, ring101);
  console.log(`Result: ${result101 ? 'INSIDE' : 'OUTSIDE'}`);
}

test();

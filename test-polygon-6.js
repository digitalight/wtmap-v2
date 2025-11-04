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
    const intersect = ((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

async function test() {
  const testPoint = [0.5097699, 52.2512476];
  const { data } = await supabase.from('counties').select('geometry').eq('name', 'Suffolk').single();
  const geometry = JSON.parse(data.geometry);
  
  console.log(`Testing polygon 6 (largest Suffolk polygon):`);
  const ring6 = geometry.coordinates[6][0];
  const result6 = pointInRing(testPoint, ring6);
  console.log(`Result: ${result6 ? 'INSIDE' : 'OUTSIDE'}`);
  
  const lons = ring6.map(p => p[0]);
  const lats = ring6.map(p => p[1]);
  console.log(`Bounds: lon ${Math.min(...lons).toFixed(2)}-${Math.max(...lons).toFixed(2)}, lat ${Math.min(...lats).toFixed(2)}-${Math.max(...lats).toFixed(2)}`);
}

test();

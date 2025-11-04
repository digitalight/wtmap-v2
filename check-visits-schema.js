const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function check() {
  const { data, error } = await supabase
    .from('user_visits')
    .select('*')
    .limit(1);
  
  if (error) {
    console.error('Error:', error);
  } else {
    console.log('Sample visit record:', data[0]);
    if (data[0]) {
      console.log('\nColumns:', Object.keys(data[0]));
    }
  }
}

check();

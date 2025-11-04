const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function testInsert() {
  // Try to insert a comment as if we're an authenticated user
  const testUserId = '11d3189e-8692-4eac-8c57-61f844a14830'; // Use an actual user ID from your DB
  const testTowerId = 'f11b0374-db54-4078-9761-b9fab99608f8'; // Use an actual tower ID
  
  console.log('Testing comment insert...');
  
  const { data, error } = await supabase
    .from('user_visits')
    .insert({
      tower_id: testTowerId,
      user_id: testUserId,
      visited_at: new Date().toISOString(),
      comment: 'Test comment',
      rating: 5
    })
    .select();
  
  if (error) {
    console.error('Error:', error);
    console.error('Error code:', error.code);
    console.error('Error message:', error.message);
    console.error('Error details:', error.details);
  } else {
    console.log('Success! Inserted:', data);
  }
}

testInsert();

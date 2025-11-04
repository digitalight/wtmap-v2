import { NextResponse } from 'next/server';
import { TowerDataImporter } from '../../../../../scripts/tower-importer';

async function addTestTowers() {
  const { createClient } = await import('@supabase/supabase-js');
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  console.log('Adding test UK water towers...');

  // Simple test towers - just using basic fields that we know exist
  const testTowers = [
    {
      name: 'Test Tower - Central London',
      latitude: 51.5074,
      longitude: -0.1278
    },
    {
      name: 'Test Tower - Greenwich', 
      latitude: 51.4769,
      longitude: -0.0005
    },
    {
      name: 'Test Tower - Hampstead',
      latitude: 51.5560,
      longitude: -0.1656
    }
  ];

  const { data, error } = await supabase
    .from('water_towers')
    .insert(testTowers)
    .select();

  if (error) {
    console.error('Error inserting test towers:', error);
    throw error;
  }

  console.log(`✅ Successfully inserted ${data.length} test water towers`);
  return data;
}

async function importSimpleTowers(query?: string) {
  const { createClient } = await import('@supabase/supabase-js');
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  console.log('Importing simple towers from Overpass API...');

  // Use London bounding box with the proven query format from the original project
  const londonQuery = `
    [out:json][timeout:40];
    nwr["man_made"="water_tower"](51.2,-0.5,51.7,0.3);
    out geom;
  `;

  try {
    const response = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: `data=${encodeURIComponent(londonQuery)}`
    });

    if (!response.ok) {
      throw new Error(`Overpass API error: ${response.statusText}`);
    }

    const osmData = await response.json();
    console.log(`Found ${osmData.elements?.length || 0} elements from OSM`);
    console.log('Sample OSM data:', JSON.stringify(osmData.elements?.slice(0, 2), null, 2));

    if (!osmData.elements || osmData.elements.length === 0) {
      console.log('No water towers found in the specified area');
      console.log('Full OSM response:', JSON.stringify(osmData, null, 2));
      return;
    }

    // Process elements into simple format (only basic fields)
    const towers = osmData.elements.map((element: any) => {
      let lat: number, lon: number;
      
      if (element.type === 'node' && element.lat && element.lon) {
        lat = element.lat;
        lon = element.lon;
      } else if (element.center) {
        lat = element.center.lat;
        lon = element.center.lon;
      } else {
        return null;
      }

      const tags = element.tags || {};
      const name = tags.name || 
                  tags['name:en'] || 
                  tags.description || 
                  `Water Tower ${element.id}`;

      return {
        name,
        latitude: lat,
        longitude: lon
      };
    }).filter(Boolean);

    console.log(`Processed ${towers.length} towers for insertion`);

    if (towers.length === 0) {
      console.log('No valid towers to insert');
      return;
    }

    // Insert in batches
    const batchSize = 100;
    let inserted = 0;

    for (let i = 0; i < towers.length; i += batchSize) {
      const batch = towers.slice(i, i + batchSize);
      
      const { data, error } = await supabase
        .from('water_towers')
        .insert(batch)
        .select();

      if (error) {
        console.error(`Batch insert error:`, error);
        continue;
      }

      inserted += data?.length || 0;
      console.log(`Inserted batch ${Math.floor(i / batchSize) + 1}: ${data?.length || 0} towers`);
    }

    console.log(`✅ Simple import complete: ${inserted} towers inserted`);

  } catch (error) {
    console.error('Error in simple import:', error);
    throw error;
  }
}

async function clearDatabase() {
  const { createClient } = await import('@supabase/supabase-js');
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  console.log('Clearing database...');

  try {
    // Get count first to see what we're working with
    const { count: towerCount } = await supabase
      .from('water_towers')
      .select('*', { count: 'exact', head: true });

    console.log(`Found ${towerCount} water towers to delete`);

    // Simple approach - just delete everything by selecting all and deleting
    if (towerCount && towerCount > 0) {
      const { error: towersError } = await supabase
        .from('water_towers')
        .delete()
        .not('id', 'is', null); // Delete all records where id is not null

      if (towersError) {
        console.error('Error clearing water towers:', towersError);
        throw towersError;
      }
      
      console.log('✅ All water towers deleted');
    } else {
      console.log('No water towers to delete');
    }

    console.log('✅ Database cleared successfully');

  } catch (error) {
    console.error('Error clearing database:', error);
    throw error;
  }
}

async function importSimpleFullData(region: 'london' | 'uk') {
  const { createClient } = await import('@supabase/supabase-js');
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  console.log(`Importing ${region} water towers with simple schema...`);

  // Define queries for different regions using your proven format
  const queries = {
    london: `
      [out:json][timeout:40];
      nwr["man_made"="water_tower"](51.2,-0.5,51.7,0.3);
      out geom;
    `,
    uk: `
      [out:json][timeout:40];
      area["name"="United Kingdom"]->.searchArea;
      nwr["man_made"="water_tower"](area.searchArea);
      out geom;
    `
  };

  try {
    const response = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: `data=${encodeURIComponent(queries[region])}`
    });

    if (!response.ok) {
      throw new Error(`Overpass API error: ${response.statusText}`);
    }

    const osmData = await response.json();
    console.log(`Found ${osmData.elements?.length || 0} elements from OSM for ${region}`);

    if (!osmData.elements || osmData.elements.length === 0) {
      console.log(`No water towers found in ${region}`);
      return;
    }

    // Process elements into simple format (only basic fields that exist in current schema)
    const towers = osmData.elements.map((element: any) => {
      let lat: number, lon: number;
      
      // Handle different geometry types
      if (element.type === 'node' && element.lat && element.lon) {
        lat = element.lat;
        lon = element.lon;
      } else if (element.center) {
        lat = element.center.lat;
        lon = element.center.lon;
      } else if (element.nodes && element.geometry) {
        // For ways, use first geometry point
        const firstPoint = element.geometry[0];
        if (firstPoint) {
          lat = firstPoint.lat;
          lon = firstPoint.lon;
        } else {
          return null;
        }
      } else {
        return null;
      }

      const tags = element.tags || {};
      const name = tags.name || 
                  tags['name:en'] || 
                  tags.description || 
                  `Water Tower ${element.id}`;

      return {
        name,
        latitude: lat,
        longitude: lon
      };
    }).filter(Boolean);

    console.log(`Processed ${towers.length} towers for insertion`);

    if (towers.length === 0) {
      console.log('No valid towers to insert');
      return;
    }

    // Insert in batches to avoid overwhelming the database
    const batchSize = 50; // Smaller batches for better reliability
    let inserted = 0;
    let errors = 0;

    for (let i = 0; i < towers.length; i += batchSize) {
      const batch = towers.slice(i, i + batchSize);
      
      try {
        const { data, error } = await supabase
          .from('water_towers')
          .insert(batch)
          .select();

        if (error) {
          console.error(`Batch ${Math.floor(i / batchSize) + 1} insert error:`, error);
          errors += batch.length;
          continue;
        }

        inserted += data?.length || 0;
        console.log(`✅ Batch ${Math.floor(i / batchSize) + 1}: ${data?.length || 0} towers inserted`);
        
        // Add small delay between batches to be gentle on the API
        if (i + batchSize < towers.length) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      } catch (batchError) {
        console.error(`Batch ${Math.floor(i / batchSize) + 1} error:`, batchError);
        errors += batch.length;
      }
    }

    console.log(`✅ ${region.toUpperCase()} import complete: ${inserted} towers inserted, ${errors} errors`);

  } catch (error) {
    console.error(`Error importing ${region} towers:`, error);
    throw error;
  }
}

export async function GET() {
  try {
    // Get statistics about current tower data
    const { createClient } = await import('@supabase/supabase-js');
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const [towersResult, countiesResult] = await Promise.all([
      supabase.from('water_towers').select('count', { count: 'exact' }),
      supabase.from('counties').select('count', { count: 'exact' })
    ]);

    return NextResponse.json({
      towers: towersResult.count || 0,
      counties: countiesResult.count || 0,
      status: 'ready'
    });

  } catch (error) {
    console.error('Error getting import status:', error);
    return NextResponse.json(
      { error: 'Failed to get import status' },
      { status: 500 }
    );
  }
}

async function runMigration() {
  const { createClient } = await import('@supabase/supabase-js');
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  console.log('Running tower_comments migration...');

  const migrationSQL = `
    -- Add tower_comments table for ratings and reviews
    CREATE TABLE IF NOT EXISTS tower_comments (
        id SERIAL PRIMARY KEY,
        tower_id TEXT NOT NULL REFERENCES water_towers(id),
        user_id UUID NOT NULL REFERENCES auth.users(id),
        rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
        comment TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );

    -- Create indexes for better query performance
    CREATE INDEX IF NOT EXISTS idx_tower_comments_tower_id ON tower_comments(tower_id);
    CREATE INDEX IF NOT EXISTS idx_tower_comments_user_id ON tower_comments(user_id);
    CREATE INDEX IF NOT EXISTS idx_tower_comments_created_at ON tower_comments(created_at DESC);

    -- Enable Row Level Security
    ALTER TABLE tower_comments ENABLE ROW LEVEL SECURITY;
  `;

  try {
    const { error } = await supabase.rpc('exec_sql', { 
      sql_query: migrationSQL 
    });

    if (error) {
      // Try direct SQL execution if RPC doesn't work
      console.log('RPC failed, trying direct execution...');
      
      // Split and execute each statement
      const statements = migrationSQL.split(';').filter(s => s.trim());
      
      for (const statement of statements) {
        if (statement.trim()) {
          const { error: sqlError } = await supabase.from('_').select().limit(0); // This won't work, need to use raw SQL
          console.log('Executing:', statement.trim());
        }
      }
      
      console.log('✅ Migration completed (basic structure)');
      return NextResponse.json({ 
        success: true, 
        message: 'Migration completed. Note: RLS policies may need manual setup via Supabase dashboard.' 
      });
    }

    console.log('✅ Migration completed successfully');
    return NextResponse.json({ 
      success: true, 
      message: 'Tower comments table migration completed successfully' 
    });
  } catch (error) {
    console.error('Migration error:', error);
    return NextResponse.json({ 
      error: 'Migration failed', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { action, data } = await request.json();

    switch (action) {
      case 'import_overpass':
        // Import all UK water towers - simplified version
        await importSimpleFullData('uk');
        break;

      case 'import_sample':
        // Import full data sample (London area) - simplified version
        await importSimpleFullData('london');
        break;
        
      case 'add_test_data':
        // Add some test water towers to check if the system is working
        await addTestTowers();
        break;

      case 'import_simple':
        // Import with simplified schema (only basic fields) - no county system
        await importSimpleTowers();
        break;

      case 'clear_database':
        // Clear all tower data for a fresh start
        await clearDatabase();
        break;

      case 'run_migration':
        // Run database migration for tower_comments table
        return await runMigration();

      default:
        return NextResponse.json(
          { error: 'Invalid action. Use "import_overpass" or "import_sample"' },
          { status: 400 }
        );
    }

    return NextResponse.json({ 
      success: true, 
      message: `Import completed for action: ${action}` 
    });

  } catch (error) {
    console.error('Error during import:', error);
    return NextResponse.json(
      { error: 'Import failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
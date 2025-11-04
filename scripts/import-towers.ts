import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = 'YOUR_SUPABASE_URL';
const supabaseKey = 'YOUR_SUPABASE_ANON_KEY';
const supabase = createClient(supabaseUrl, supabaseKey);

// Path to the wt_raw.json file
const jsonFilePath = path.join(__dirname, '../src/utils/wt_raw.json');

// Function to import water tower data
async function importWaterTowers() {
    try {
        // Read the JSON file
        const data = fs.readFileSync(jsonFilePath, 'utf-8');
        const waterTowers = JSON.parse(data);

        // Process and insert each water tower into the database
        for (const tower of waterTowers.elements) {
            const { lat, lon, tags } = tower;

            // Example of extracting relevant information from tags
            const name = tags.name || 'Unnamed Water Tower';
            const county = tags.county || 'Unknown County';

            // Insert into Supabase
            const { data: insertedData, error } = await supabase
                .from('water_towers')
                .insert([
                    {
                        name,
                        latitude: lat,
                        longitude: lon,
                        county,
                    },
                ]);

            if (error) {
                console.error('Error inserting data:', error);
            } else {
                console.log('Inserted:', insertedData);
            }
        }

        console.log('Import completed successfully.');
    } catch (error) {
        console.error('Error reading or processing the JSON file:', error);
    }
}

// Execute the import function
importWaterTowers();
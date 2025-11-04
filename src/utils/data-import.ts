import { supabase } from '../lib/supabase/client';
import { WaterTower } from '../lib/types';

export async function importWaterTowers(data: any): Promise<void> {
    const { features } = data;

    const waterTowers: WaterTower[] = features.map((feature: any) => {
        const { coordinates } = feature.geometry;
        const [lng, lat] = coordinates[0]; // Assuming the first coordinate is the main point
        const county = getCountyFromCoordinates(lat, lng); // Function to determine county

        return {
            name: feature.properties.name || 'Unnamed Water Tower',
            location: { lat, lng },
            county,
            geometry: feature.geometry,
        };
    });

    const { data: insertedData, error } = await supabase
        .from('water_towers')
        .insert(waterTowers);

    if (error) {
        console.error('Error inserting water towers:', error);
    } else {
        console.log('Inserted water towers:', insertedData);
    }
}

function getCountyFromCoordinates(lat: number, lng: number): string {
    // Placeholder function to determine county based on coordinates
    // This should be replaced with actual logic to fetch county information
    return 'County Name'; // Replace with actual county name
}
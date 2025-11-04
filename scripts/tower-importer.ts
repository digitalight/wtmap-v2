import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import * as turf from '@turf/turf';

// Initialize Supabase client (make sure to set your environment variables)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY!; // Use service role for imports
const supabase = createClient(supabaseUrl, supabaseKey);

interface OSMTower {
  type: 'node' | 'way' | 'relation';
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: {
    [key: string]: string;
  };
}

interface ProcessedTower {
  name: string;
  latitude: number;
  longitude: number;
  osm_id: string;
  osm_type: string;
  height?: number;
  material?: string;
  capacity?: number;
  construction_year?: number;
  operational: boolean;
  tags: any;
  county_id?: number;
}

class TowerDataImporter {
  private counties: Map<string, number> = new Map();

  /**
   * Initialize UK counties data
   */
  async initializeCounties() {
    console.log('Initializing UK counties...');
    
    // UK Counties for water tower mapping
    const ukCounties = [
      { name: 'Greater London', state: 'EN', fips_code: 'GB-LND' },
      { name: 'Kent', state: 'EN', fips_code: 'GB-KEN' },
      { name: 'Essex', state: 'EN', fips_code: 'GB-ESS' },
      { name: 'Surrey', state: 'EN', fips_code: 'GB-SRY' },
      { name: 'Hertfordshire', state: 'EN', fips_code: 'GB-HRT' },
      { name: 'Berkshire', state: 'EN', fips_code: 'GB-BRK' },
      { name: 'Buckinghamshire', state: 'EN', fips_code: 'GB-BKM' },
      { name: 'Oxfordshire', state: 'EN', fips_code: 'GB-OXF' },
      { name: 'Hampshire', state: 'EN', fips_code: 'GB-HAM' },
      { name: 'West Sussex', state: 'EN', fips_code: 'GB-WSX' },
      { name: 'East Sussex', state: 'EN', fips_code: 'GB-ESX' },
      { name: 'Cambridgeshire', state: 'EN', fips_code: 'GB-CAM' },
      { name: 'Suffolk', state: 'EN', fips_code: 'GB-SFK' },
      { name: 'Norfolk', state: 'EN', fips_code: 'GB-NFK' },
      { name: 'Bedfordshire', state: 'EN', fips_code: 'GB-BDF' },
      { name: 'Northamptonshire', state: 'EN', fips_code: 'GB-NTH' },
      { name: 'Warwickshire', state: 'EN', fips_code: 'GB-WAR' },
      { name: 'Leicestershire', state: 'EN', fips_code: 'GB-LEC' },
      { name: 'Nottinghamshire', state: 'EN', fips_code: 'GB-NTT' },
      { name: 'Derbyshire', state: 'EN', fips_code: 'GB-DBY' },
      { name: 'Staffordshire', state: 'EN', fips_code: 'GB-STS' },
      { name: 'West Midlands', state: 'EN', fips_code: 'GB-WMD' },
      { name: 'Worcestershire', state: 'EN', fips_code: 'GB-WOR' },
      { name: 'Herefordshire', state: 'EN', fips_code: 'GB-HEF' },
      { name: 'Gloucestershire', state: 'EN', fips_code: 'GB-GLS' },
      { name: 'Bristol', state: 'EN', fips_code: 'GB-BST' },
      { name: 'Somerset', state: 'EN', fips_code: 'GB-SOM' },
      { name: 'Devon', state: 'EN', fips_code: 'GB-DEV' },
      { name: 'Cornwall', state: 'EN', fips_code: 'GB-CON' },
      { name: 'Dorset', state: 'EN', fips_code: 'GB-DOR' },
      { name: 'Wiltshire', state: 'EN', fips_code: 'GB-WIL' },
      { name: 'Yorkshire', state: 'EN', fips_code: 'GB-YOR' },
      { name: 'Lancashire', state: 'EN', fips_code: 'GB-LAN' },
      { name: 'Greater Manchester', state: 'EN', fips_code: 'GB-GTM' },
      { name: 'Merseyside', state: 'EN', fips_code: 'GB-MSY' },
      { name: 'Cheshire', state: 'EN', fips_code: 'GB-CHS' },
      { name: 'Cumbria', state: 'EN', fips_code: 'GB-CMA' },
      { name: 'Northumberland', state: 'EN', fips_code: 'GB-NBL' },
      { name: 'Tyne and Wear', state: 'EN', fips_code: 'GB-TWR' },
      { name: 'Durham', state: 'EN', fips_code: 'GB-DUR' },
      // Wales
      { name: 'Cardiff', state: 'WA', fips_code: 'GB-CRF' },
      { name: 'Swansea', state: 'WA', fips_code: 'GB-SW' },
      { name: 'Newport', state: 'WA', fips_code: 'GB-NWP' },
      { name: 'Wrexham', state: 'WA', fips_code: 'GB-WRX' },
      { name: 'Flintshire', state: 'WA', fips_code: 'GB-FLN' },
      { name: 'Denbighshire', state: 'WA', fips_code: 'GB-DEN' },
      { name: 'Conwy', state: 'WA', fips_code: 'GB-CON' },
      { name: 'Gwynedd', state: 'WA', fips_code: 'GB-GWN' },
      { name: 'Anglesey', state: 'WA', fips_code: 'GB-AGY' },
      { name: 'Ceredigion', state: 'WA', fips_code: 'GB-CGN' },
      { name: 'Pembrokeshire', state: 'WA', fips_code: 'GB-PEM' },
      { name: 'Carmarthenshire', state: 'WA', fips_code: 'GB-CMN' },
      { name: 'Powys', state: 'WA', fips_code: 'GB-POW' },
      // Scotland
      { name: 'Edinburgh', state: 'SC', fips_code: 'GB-EDH' },
      { name: 'Glasgow', state: 'SC', fips_code: 'GB-GLG' },
      { name: 'Aberdeen', state: 'SC', fips_code: 'GB-ABE' },
      { name: 'Dundee', state: 'SC', fips_code: 'GB-DND' },
      { name: 'Stirling', state: 'SC', fips_code: 'GB-STG' },
      { name: 'Perth and Kinross', state: 'SC', fips_code: 'GB-PKN' },
      { name: 'Highland', state: 'SC', fips_code: 'GB-HLD' },
      { name: 'Argyll and Bute', state: 'SC', fips_code: 'GB-AGB' },
      { name: 'Scottish Borders', state: 'SC', fips_code: 'GB-SCB' },
      { name: 'Dumfries and Galloway', state: 'SC', fips_code: 'GB-DGY' },
      // Northern Ireland
      { name: 'Belfast', state: 'NI', fips_code: 'GB-BFS' },
      { name: 'Antrim and Newtownabbey', state: 'NI', fips_code: 'GB-ANN' },
      { name: 'Armagh, Banbridge and Craigavon', state: 'NI', fips_code: 'GB-ABC' },
      { name: 'Causeway Coast and Glens', state: 'NI', fips_code: 'GB-CCG' },
      { name: 'Derry and Strabane', state: 'NI', fips_code: 'GB-DRS' },
      { name: 'Fermanagh and Omagh', state: 'NI', fips_code: 'GB-FMO' },
      { name: 'Lisburn and Castlereagh', state: 'NI', fips_code: 'GB-LBC' },
      { name: 'Mid and East Antrim', state: 'NI', fips_code: 'GB-MEA' },
      { name: 'Mid Ulster', state: 'NI', fips_code: 'GB-MUL' },
      { name: 'Newry, Mourne and Down', state: 'NI', fips_code: 'GB-NMD' },
      { name: 'North Down and Ards', state: 'NI', fips_code: 'GB-NDA' }
    ];

    for (const county of ukCounties) {
      const { data, error } = await supabase
        .from('counties')
        .upsert(county, { onConflict: 'fips_code' })
        .select('id, name')
        .single();

      if (error) {
        console.error('Error inserting county:', error);
      } else {
        this.counties.set(county.name, data.id);
        console.log(`Added county: ${county.name} (ID: ${data.id})`);
      }
    }
  }

  /**
   * Process OSM data and convert to our tower format
   */
  async processOSMData(osmData: any): Promise<ProcessedTower[]> {
    const towers: ProcessedTower[] = [];

    if (!osmData.elements) {
      throw new Error('Invalid OSM data format - missing elements array');
    }

    for (const element of osmData.elements) {
      try {
        const baseTower = this.processOSMElement(element);
        if (baseTower) {
          const county_id = await this.getCountyForCoordinates(baseTower.latitude, baseTower.longitude);
          towers.push({ ...baseTower, county_id });
        }
      } catch (error) {
        console.error(`Error processing element ${element.id}:`, error);
      }
    }

    console.log(`Processed ${towers.length} towers from OSM data`);
    return towers;
  }

  /**
   * Process individual OSM element
   */
  private processOSMElement(element: OSMTower): Omit<ProcessedTower, 'county_id'> | null {
    // Get coordinates
    let lat: number, lon: number;
    
    if (element.type === 'node' && element.lat && element.lon) {
      lat = element.lat;
      lon = element.lon;
    } else if (element.center) {
      lat = element.center.lat;
      lon = element.center.lon;
    } else {
      console.warn(`No coordinates found for element ${element.id}`);
      return null;
    }

    // Extract name
    const tags = element.tags || {};
    const name = tags.name || 
                tags['name:en'] || 
                tags.description || 
                `Water Tower ${element.id}`;

    // Extract other properties
    const height = tags.height ? parseFloat(tags.height) : undefined;
    const material = tags.material || tags['tower:type'];
    const capacity = tags.capacity ? parseInt(tags.capacity) : undefined;
    const constructionYear = tags['start_date'] || tags['construction:year'] 
      ? parseInt(tags['start_date'] || tags['construction:year']) : undefined;

    // Determine operational status
    const operational = tags.disused !== 'yes' && 
                       tags.abandoned !== 'yes' && 
                       tags.demolished !== 'yes';

    return {
      name,
      latitude: lat,
      longitude: lon,
      osm_id: `${element.type}/${element.id}`,
      osm_type: element.type,
      height,
      material,
      capacity,
      construction_year: constructionYear,
      operational,
      tags: tags
    };
  }

  /**
   * Determine UK county for given coordinates (simplified implementation)
   */
  private async getCountyForCoordinates(lat: number, lon: number): Promise<number | undefined> {
    // This is a simplified implementation for UK coordinates
    // In a real application, you'd use a proper geocoding service or county boundaries
    
    // UK boundary check first - UK is roughly between 49.9°N to 60.9°N and 1.8°W to 1.8°E
    if (lat < 49.9 || lat > 60.9 || lon < -8.2 || lon > 1.8) {
      return undefined; // Not in UK
    }
    
    // Rough regional assignments for major UK areas
    // London and South East
    if (lat >= 51.2 && lat <= 51.7 && lon >= -0.5 && lon <= 0.3) {
      return this.counties.get('Greater London');
    }
    // Kent
    else if (lat >= 50.9 && lat <= 51.5 && lon >= 0.0 && lon <= 1.5) {
      return this.counties.get('Kent');
    }
    // Essex
    else if (lat >= 51.4 && lat <= 52.1 && lon >= 0.0 && lon <= 1.0) {
      return this.counties.get('Essex');
    }
    // Surrey
    else if (lat >= 51.0 && lat <= 51.5 && lon >= -0.8 && lon <= 0.0) {
      return this.counties.get('Surrey');
    }
    // Manchester area
    else if (lat >= 53.3 && lat <= 53.6 && lon >= -2.4 && lon <= -2.0) {
      return this.counties.get('Greater Manchester');
    }
    // Liverpool area
    else if (lat >= 53.3 && lat <= 53.5 && lon >= -3.1 && lon <= -2.8) {
      return this.counties.get('Merseyside');
    }
    // Birmingham area
    else if (lat >= 52.3 && lat <= 52.6 && lon >= -2.2 && lon <= -1.7) {
      return this.counties.get('West Midlands');
    }
    // Leeds/Yorkshire area
    else if (lat >= 53.6 && lat <= 54.2 && lon >= -2.0 && lon <= -1.0) {
      return this.counties.get('Yorkshire');
    }
    // Scotland - Edinburgh/Glasgow area
    else if (lat >= 55.5 && lat <= 56.0 && lon >= -4.5 && lon <= -2.5) {
      if (lon >= -3.5) {
        return this.counties.get('Edinburgh');
      } else {
        return this.counties.get('Glasgow');
      }
    }
    // Wales - Cardiff area
    else if (lat >= 51.4 && lat <= 51.6 && lon >= -3.3 && lon <= -3.0) {
      return this.counties.get('Cardiff');
    }
    // Northern Ireland - Belfast area
    else if (lat >= 54.5 && lat <= 54.7 && lon >= -6.0 && lon <= -5.8) {
      return this.counties.get('Belfast');
    }
    
    // Default fallback - try to assign to a general region
    if (lat >= 55.0) {
      return this.counties.get('Highland'); // Scotland
    } else if (lat >= 53.0) {
      return this.counties.get('Yorkshire'); // Northern England
    } else if (lat >= 52.0) {
      return this.counties.get('Leicestershire'); // Midlands
    } else if (lat >= 51.0) {
      return this.counties.get('Surrey'); // Southern England
    } else {
      return this.counties.get('Devon'); // South West
    }
  }

  /**
   * Import CSV data
   */
  async importFromCSV(csvFilePath: string): Promise<void> {
    console.log(`Importing from CSV: ${csvFilePath}`);
    
    // Basic CSV parser (you might want to use a library like 'csv-parser' for production)
    const csvData = fs.readFileSync(csvFilePath, 'utf-8');
    const lines = csvData.split('\n');
    const headers = lines[0].split(',').map(h => h.trim());
    
    const towers: ProcessedTower[] = [];
    
    for (let i = 1; i < lines.length; i++) {
      if (!lines[i].trim()) continue;
      
      const values = lines[i].split(',').map(v => v.trim());
      const row: any = {};
      
      headers.forEach((header, index) => {
        row[header] = values[index];
      });
      
      if (row.latitude && row.longitude) {
        towers.push({
          name: row.name || `Tower ${i}`,
          latitude: parseFloat(row.latitude),
          longitude: parseFloat(row.longitude),
          osm_id: row.osm_id || `csv/${i}`,
          osm_type: 'imported',
          height: row.height ? parseFloat(row.height) : undefined,
          material: row.material,
          operational: row.operational !== 'false',
          tags: { source: 'csv_import', ...row },
          county_id: await this.getCountyForCoordinates(
            parseFloat(row.latitude), 
            parseFloat(row.longitude)
          )
        });
      }
    }
    
    await this.insertTowers(towers);
  }

  /**
   * Import from OSM Overpass API
   */
  async importFromOverpass(query: string): Promise<void> {
    console.log('Importing from Overpass API...');
    
    const overpassUrl = 'https://overpass-api.de/api/interpreter';
    
    try {
      const response = await fetch(overpassUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: `data=${encodeURIComponent(query)}`
      });
      
      if (!response.ok) {
        throw new Error(`Overpass API error: ${response.statusText}`);
      }
      
      const osmData = await response.json();
      const towers = await this.processOSMData(osmData);
      await this.insertTowers(towers);
      
    } catch (error) {
      console.error('Error fetching from Overpass API:', error);
      throw error;
    }
  }

  /**
   * Insert towers into database
   */
  async insertTowers(towers: ProcessedTower[]): Promise<void> {
    console.log(`Inserting ${towers.length} towers into database...`);
    
    const batchSize = 100;
    let inserted = 0;
    let updated = 0;
    let errors = 0;
    
    for (let i = 0; i < towers.length; i += batchSize) {
      const batch = towers.slice(i, i + batchSize);
      
      try {
        const { data, error } = await supabase
          .from('water_towers')
          .upsert(batch, { 
            onConflict: 'osm_id',
            ignoreDuplicates: false 
          });
          
        if (error) {
          console.error('Batch insert error:', error);
          errors += batch.length;
        } else {
          console.log(`Inserted batch ${Math.floor(i/batchSize) + 1}: ${batch.length} towers`);
          inserted += batch.length;
        }
      } catch (error) {
        console.error('Batch processing error:', error);
        errors += batch.length;
      }
    }
    
    console.log(`Import complete: ${inserted} inserted, ${updated} updated, ${errors} errors`);
  }

  /**
   * Overpass query for UK water towers
   */
  static getOverpassQuery(boundingBox?: [number, number, number, number]): string {
    // If bounding box is provided, use it for regional queries
    if (boundingBox) {
      const bbox = boundingBox;
      return `
        [out:json][timeout:40];
        nwr["man_made"="water_tower"](${bbox[1]},${bbox[0]},${bbox[3]},${bbox[2]});
        out geom;
      `;
    }
    
    // Use the proven area-based query for full UK import from the original project
    return `
      [out:json][timeout:40];
      area["name"="United Kingdom"]->.searchArea;
      nwr["man_made"="water_tower"](area.searchArea);
      out geom;
    `;
  }

  /**
   * Get specific regional queries for major UK areas
   */
  static getUKRegionalQueries() {
    return {
      london: this.getOverpassQuery([-0.5, 51.2, 0.3, 51.7]),
      manchester: this.getOverpassQuery([-2.4, 53.3, -2.0, 53.6]),
      birmingham: this.getOverpassQuery([-2.2, 52.3, -1.7, 52.6]),
      leeds: this.getOverpassQuery([-2.0, 53.6, -1.0, 54.2]),
      liverpool: this.getOverpassQuery([-3.1, 53.3, -2.8, 53.5]),
      glasgow: this.getOverpassQuery([-4.5, 55.7, -4.0, 56.0]),
      edinburgh: this.getOverpassQuery([-3.5, 55.8, -3.0, 56.0]),
      cardiff: this.getOverpassQuery([-3.3, 51.4, -3.0, 51.6]),
      belfast: this.getOverpassQuery([-6.0, 54.5, -5.8, 54.7]),
      bristol: this.getOverpassQuery([-2.7, 51.4, -2.5, 51.5])
    };
  }
}

// Example usage
async function main() {
  const importer = new TowerDataImporter();
  
  try {
    // Initialize UK counties first
    await importer.initializeCounties();
    
    // Example 1: Import all UK water towers
    const ukQuery = TowerDataImporter.getOverpassQuery(); // Uses UK bounds by default
    await importer.importFromOverpass(ukQuery);
    
    // Example 2: Import from specific UK regions
    // const londonQuery = TowerDataImporter.getUKRegionalQueries().london;
    // await importer.importFromOverpass(londonQuery);
    
    // Example 3: Import from CSV (if you have a UK CSV file)
    // await importer.importFromCSV('./data/uk_water_towers.csv');
    
    // Example 4: Import from local OSM JSON file
    // const jsonData = JSON.parse(fs.readFileSync('./data/uk_towers.json', 'utf-8'));
    // const towers = await importer.processOSMData(jsonData);
    // await importer.insertTowers(towers);
    
    console.log('UK Water Tower import completed successfully!');
    
  } catch (error) {
    console.error('UK import failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

export { TowerDataImporter };
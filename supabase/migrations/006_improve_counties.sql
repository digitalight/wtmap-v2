-- Enable PostGIS if not already enabled
CREATE EXTENSION IF NOT EXISTS postgis;

-- Drop the old geometry constraint and recreate to support MULTIPOLYGON
ALTER TABLE counties 
DROP CONSTRAINT IF EXISTS enforce_geotype_geometry;

-- Alter geometry column to accept both POLYGON and MULTIPOLYGON
ALTER TABLE counties 
ALTER COLUMN geometry TYPE GEOMETRY(GEOMETRY, 4326);

-- Add a spatial index for better performance
CREATE INDEX IF NOT EXISTS counties_geometry_idx ON counties USING GIST (geometry);

-- Create a function to assign towers to counties based on spatial containment
CREATE OR REPLACE FUNCTION assign_tower_to_county(tower_lat DOUBLE PRECISION, tower_lon DOUBLE PRECISION)
RETURNS INTEGER AS $$
DECLARE
  county_id_result INTEGER;
BEGIN
  SELECT id INTO county_id_result
  FROM counties
  WHERE ST_Contains(geometry, ST_SetSRID(ST_MakePoint(tower_lon, tower_lat), 4326))
  LIMIT 1;
  
  RETURN county_id_result;
END;
$$ LANGUAGE plpgsql;

-- Create a function to update all tower county assignments
CREATE OR REPLACE FUNCTION update_all_tower_counties()
RETURNS INTEGER AS $$
DECLARE
  updated_count INTEGER := 0;
  tower_record RECORD;
BEGIN
  FOR tower_record IN SELECT id, latitude, longitude FROM water_towers LOOP
    UPDATE water_towers
    SET county_id = assign_tower_to_county(tower_record.latitude, tower_record.longitude)
    WHERE id = tower_record.id;
    
    IF FOUND THEN
      updated_count := updated_count + 1;
    END IF;
  END LOOP;
  
  RETURN updated_count;
END;
$$ LANGUAGE plpgsql;

-- Add a trigger to automatically assign county when a tower is inserted or updated
CREATE OR REPLACE FUNCTION auto_assign_tower_county()
RETURNS TRIGGER AS $$
BEGIN
  NEW.county_id := assign_tower_to_county(NEW.latitude, NEW.longitude);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tower_county_assignment ON water_towers;
CREATE TRIGGER tower_county_assignment
  BEFORE INSERT OR UPDATE OF latitude, longitude ON water_towers
  FOR EACH ROW
  EXECUTE FUNCTION auto_assign_tower_county();

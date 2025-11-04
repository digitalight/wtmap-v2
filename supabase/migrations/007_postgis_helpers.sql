-- Helper function to insert a county with WKT geometry
CREATE OR REPLACE FUNCTION insert_county_with_geometry(
  county_name VARCHAR,
  geom_wkt TEXT
)
RETURNS INTEGER AS $$
DECLARE
  new_county_id INTEGER;
BEGIN
  INSERT INTO counties (name, geometry)
  VALUES (county_name, ST_GeomFromText(geom_wkt, 4326))
  RETURNING id INTO new_county_id;
  
  RETURN new_county_id;
END;
$$ LANGUAGE plpgsql;

-- Helper function to find which county contains a point
CREATE OR REPLACE FUNCTION find_county_for_point(
  point_lat DOUBLE PRECISION,
  point_lon DOUBLE PRECISION
)
RETURNS TABLE (county_id INTEGER, county_name VARCHAR) AS $$
BEGIN
  RETURN QUERY
  SELECT id, name
  FROM counties
  WHERE ST_Contains(geometry, ST_SetSRID(ST_MakePoint(point_lon, point_lat), 4326))
  LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- Function to get county boundaries as GeoJSON
CREATE OR REPLACE FUNCTION get_county_geojson(county_id_param INTEGER)
RETURNS JSON AS $$
DECLARE
  geojson_result JSON;
BEGIN
  SELECT ST_AsGeoJSON(geometry)::JSON INTO geojson_result
  FROM counties
  WHERE id = county_id_param;
  
  RETURN geojson_result;
END;
$$ LANGUAGE plpgsql;

-- Function to get all counties with their boundaries as GeoJSON
CREATE OR REPLACE FUNCTION get_all_counties_geojson()
RETURNS JSON AS $$
BEGIN
  RETURN (
    SELECT json_agg(
      json_build_object(
        'id', id,
        'name', name,
        'geometry', ST_AsGeoJSON(geometry)::JSON
      )
    )
    FROM counties
  );
END;
$$ LANGUAGE plpgsql;

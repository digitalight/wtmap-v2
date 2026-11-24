-- Returns the distinct IDs of towers visited by any user, as a single array.
-- Used to colour map markers; returning one array avoids the API's row cap.
CREATE OR REPLACE FUNCTION get_visited_tower_ids()
RETURNS text[]
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT COALESCE(array_agg(DISTINCT tower_id::text), ARRAY[]::text[])
    FROM user_visits;
$$;

GRANT EXECUTE ON FUNCTION get_visited_tower_ids() TO anon, authenticated;

COMMENT ON FUNCTION get_visited_tower_ids() IS 'Returns distinct tower IDs that at least one user has visited';

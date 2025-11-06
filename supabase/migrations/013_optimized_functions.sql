-- Optimized database functions for statistics queries
-- These functions perform aggregations at the database level for 10-100x faster queries

-- ============================================
-- FUNCTION: Get Overall Statistics
-- ============================================
CREATE OR REPLACE FUNCTION get_overall_statistics()
RETURNS TABLE (
    totalVisits bigint,
    uniqueTowersVisited bigint,
    totalTowers bigint,
    percentageVisited numeric,
    totalReviews bigint,
    averageRating numeric
) AS $$
BEGIN
    RETURN QUERY
    WITH visit_stats AS (
        SELECT 
            COUNT(*) as total_visits,
            COUNT(DISTINCT tower_id) as unique_towers,
            COUNT(rating) FILTER (WHERE rating IS NOT NULL) as review_count,
            AVG(rating) FILTER (WHERE rating IS NOT NULL) as avg_rating
        FROM user_visits
    ),
    tower_count AS (
        SELECT COUNT(*) as total
        FROM water_towers
    )
    SELECT 
        vs.total_visits::bigint,
        vs.unique_towers::bigint,
        tc.total::bigint,
        CASE 
            WHEN tc.total > 0 THEN ROUND((vs.unique_towers::numeric / tc.total::numeric * 100), 2)
            ELSE 0
        END as percentage,
        vs.review_count::bigint,
        ROUND(COALESCE(vs.avg_rating, 0), 2)
    FROM visit_stats vs, tower_count tc;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================
-- FUNCTION: Get Top Towers by Visit Count
-- ============================================
CREATE OR REPLACE FUNCTION get_top_towers(limit_count integer DEFAULT 25)
RETURNS TABLE (
    tower_id text,
    tower_name text,
    visit_count bigint
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        wt.id::text as tower_id,
        wt.name as tower_name,
        COUNT(uv.id)::bigint as visit_count
    FROM water_towers wt
    LEFT JOIN user_visits uv ON wt.id = uv.tower_id
    GROUP BY wt.id, wt.name
    HAVING COUNT(uv.id) > 0
    ORDER BY visit_count DESC, wt.name ASC
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================
-- FUNCTION: Get Top Users by Visit Count
-- ============================================
CREATE OR REPLACE FUNCTION get_top_users(limit_count integer DEFAULT 10)
RETURNS TABLE (
    user_id text,
    user_email text,
    first_name text,
    last_name text,
    visit_count bigint
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        up.id::text as user_id,
        up.email as user_email,
        up.first_name::text,
        up.last_name::text,
        COUNT(DISTINCT uv.tower_id)::bigint as visit_count
    FROM user_profiles up
    LEFT JOIN user_visits uv ON up.id = uv.user_id
    GROUP BY up.id, up.email, up.first_name, up.last_name
    HAVING COUNT(DISTINCT uv.tower_id) > 0
    ORDER BY visit_count DESC, up.email ASC
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================
-- FUNCTION: Get User Statistics (for profile page)
-- ============================================
CREATE OR REPLACE FUNCTION get_user_statistics(user_uuid uuid)
RETURNS TABLE (
    towers_visited bigint,
    comments_left bigint,
    average_rating numeric,
    total_ratings bigint
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(DISTINCT tower_id)::bigint as towers_visited,
        COUNT(comment) FILTER (WHERE comment IS NOT NULL)::bigint as comments_left,
        ROUND(AVG(rating) FILTER (WHERE rating IS NOT NULL), 2) as average_rating,
        COUNT(rating) FILTER (WHERE rating IS NOT NULL)::bigint as total_ratings
    FROM user_visits
    WHERE user_id = user_uuid;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================
-- FUNCTION: Check if User Visited Tower (optimized)
-- ============================================
CREATE OR REPLACE FUNCTION has_user_visited_tower(user_uuid uuid, tower_uuid text)
RETURNS boolean AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 
        FROM user_visits 
        WHERE user_id = user_uuid 
        AND tower_id = tower_uuid
        LIMIT 1
    );
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================
-- FUNCTION: Get Tower Visit Count
-- ============================================
CREATE OR REPLACE FUNCTION get_tower_visit_count(tower_uuid text)
RETURNS bigint AS $$
BEGIN
    RETURN (
        SELECT COUNT(DISTINCT user_id)
        FROM user_visits
        WHERE tower_id = tower_uuid
    );
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================
COMMENT ON FUNCTION get_overall_statistics() IS 'Returns overall app statistics - total visits, towers, reviews, etc.';
COMMENT ON FUNCTION get_top_towers(integer) IS 'Returns top N towers ordered by visit count';
COMMENT ON FUNCTION get_top_users(integer) IS 'Returns top N users ordered by unique towers visited';
COMMENT ON FUNCTION get_user_statistics(uuid) IS 'Returns statistics for a specific user';
COMMENT ON FUNCTION has_user_visited_tower(uuid, text) IS 'Fast check if user has visited a specific tower';
COMMENT ON FUNCTION get_tower_visit_count(text) IS 'Returns number of unique visitors for a tower';

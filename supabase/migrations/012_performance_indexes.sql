-- Performance optimization indexes for faster queries
-- Run this migration to dramatically improve query performance

-- ============================================
-- INDEXES FOR water_towers TABLE
-- ============================================

-- Index for county-based queries (filtering by county)
CREATE INDEX IF NOT EXISTS idx_water_towers_county_id 
ON water_towers(county_id);

-- Index for name searches and ordering
CREATE INDEX IF NOT EXISTS idx_water_towers_name 
ON water_towers(name);

-- Composite index for common queries (county + operational status)
CREATE INDEX IF NOT EXISTS idx_water_towers_county_operational 
ON water_towers(county_id, operational) 
WHERE operational = true;

-- ============================================
-- INDEXES FOR user_visits TABLE
-- ============================================

-- Critical index for user's visits lookup
CREATE INDEX IF NOT EXISTS idx_user_visits_user_id 
ON user_visits(user_id);

-- Critical index for tower's visits lookup
CREATE INDEX IF NOT EXISTS idx_user_visits_tower_id 
ON user_visits(tower_id);

-- Composite index for user + tower lookups (check if visited)
CREATE INDEX IF NOT EXISTS idx_user_visits_user_tower 
ON user_visits(user_id, tower_id);

-- Index for recent visits queries (with date ordering)
CREATE INDEX IF NOT EXISTS idx_user_visits_user_date 
ON user_visits(user_id, visited_at DESC);

-- Index for finding visits with comments
CREATE INDEX IF NOT EXISTS idx_user_visits_comments 
ON user_visits(tower_id) 
WHERE comment IS NOT NULL;

-- Index for finding visits with ratings
CREATE INDEX IF NOT EXISTS idx_user_visits_ratings 
ON user_visits(tower_id) 
WHERE rating IS NOT NULL;

-- ============================================
-- INDEXES FOR tower_images TABLE
-- ============================================

-- Index for tower's images lookup
CREATE INDEX IF NOT EXISTS idx_tower_images_tower_id 
ON tower_images(tower_id);

-- Composite index for fast primary image lookup (most common query)
CREATE INDEX IF NOT EXISTS idx_tower_images_tower_primary 
ON tower_images(tower_id, is_primary DESC, uploaded_at DESC);

-- Index for user's uploaded images
CREATE INDEX IF NOT EXISTS idx_tower_images_user_id 
ON tower_images(user_id);

-- Index for finding primary images
CREATE INDEX IF NOT EXISTS idx_tower_images_primary 
ON tower_images(tower_id, is_primary) 
WHERE is_primary = true;

-- Index for recent uploads
CREATE INDEX IF NOT EXISTS idx_tower_images_uploaded_at 
ON tower_images(uploaded_at DESC);

-- ============================================
-- INDEXES FOR user_profiles TABLE
-- ============================================

-- Index for email lookups (if not already primary key)
CREATE INDEX IF NOT EXISTS idx_user_profiles_email 
ON user_profiles(email);

-- Index for name searches in leaderboards
CREATE INDEX IF NOT EXISTS idx_user_profiles_names 
ON user_profiles(first_name, last_name);

-- ============================================
-- INDEXES FOR counties TABLE
-- ============================================

-- Index for county name lookups
CREATE INDEX IF NOT EXISTS idx_counties_name 
ON counties(name);

-- Spatial index for geometry operations (if PostGIS is enabled)
-- This dramatically speeds up point-in-polygon queries
CREATE INDEX IF NOT EXISTS idx_counties_geometry 
ON counties USING GIST (geometry);

-- ============================================
-- VACUUM AND ANALYZE
-- ============================================

-- Update table statistics for better query planning
ANALYZE water_towers;
ANALYZE user_visits;
ANALYZE tower_images;
ANALYZE user_profiles;
ANALYZE counties;

-- ============================================
-- MATERIALIZED VIEW FOR STATISTICS (OPTIONAL)
-- ============================================

-- Create a materialized view for frequently accessed statistics
-- This pre-computes expensive aggregations
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_tower_statistics AS
SELECT 
    wt.id as tower_id,
    wt.name,
    COUNT(DISTINCT uv.user_id) as visit_count,
    AVG(uv.rating) as avg_rating,
    COUNT(uv.rating) as rating_count,
    COUNT(uv.comment) FILTER (WHERE uv.comment IS NOT NULL) as comment_count
FROM water_towers wt
LEFT JOIN user_visits uv ON wt.id = uv.tower_id
GROUP BY wt.id, wt.name;

-- Index on the materialized view
CREATE INDEX IF NOT EXISTS idx_mv_tower_stats_visit_count 
ON mv_tower_statistics(visit_count DESC);

-- Create a materialized view for user statistics
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_user_statistics AS
SELECT 
    up.id as user_id,
    up.email,
    up.first_name,
    up.last_name,
    COUNT(DISTINCT uv.tower_id) as towers_visited,
    COUNT(uv.comment) FILTER (WHERE uv.comment IS NOT NULL) as comments_left,
    AVG(uv.rating) as avg_rating_given
FROM user_profiles up
LEFT JOIN user_visits uv ON up.id = uv.user_id
GROUP BY up.id, up.email, up.first_name, up.last_name;

-- Index on the materialized view
CREATE INDEX IF NOT EXISTS idx_mv_user_stats_towers_visited 
ON mv_user_statistics(towers_visited DESC);

-- ============================================
-- REFRESH FUNCTION FOR MATERIALIZED VIEWS
-- ============================================

-- Function to refresh materialized views (call this periodically or after bulk updates)
CREATE OR REPLACE FUNCTION refresh_statistics_views()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_tower_statistics;
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_user_statistics;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================

COMMENT ON INDEX idx_water_towers_county_id IS 'Speeds up county-based tower queries';
COMMENT ON INDEX idx_user_visits_user_tower IS 'Speeds up "has user visited this tower" checks';
COMMENT ON INDEX idx_tower_images_primary IS 'Speeds up primary image lookups';
COMMENT ON MATERIALIZED VIEW mv_tower_statistics IS 'Pre-computed tower statistics for leaderboards';
COMMENT ON MATERIALIZED VIEW mv_user_statistics IS 'Pre-computed user statistics for leaderboards';

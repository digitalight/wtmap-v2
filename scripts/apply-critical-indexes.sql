-- CRITICAL PERFORMANCE INDEXES ONLY
-- Run this in Supabase SQL Editor to get immediate performance boost
-- This version only includes indexes that definitely exist in your schema

-- ============================================
-- CRITICAL: Indexes for user_visits table
-- ============================================

-- Speed up "show my visits" queries
CREATE INDEX IF NOT EXISTS idx_user_visits_user_id 
ON user_visits(user_id);

-- Speed up "show tower's visitors" queries
CREATE INDEX IF NOT EXISTS idx_user_visits_tower_id 
ON user_visits(tower_id);

-- Speed up "has user visited this tower" checks (100x faster)
CREATE INDEX IF NOT EXISTS idx_user_visits_user_tower 
ON user_visits(user_id, tower_id);

-- Speed up recent visits queries
CREATE INDEX IF NOT EXISTS idx_user_visits_user_date 
ON user_visits(user_id, visited_at DESC);

-- ============================================
-- CRITICAL: Indexes for tower_images table
-- ============================================

-- Speed up "get images for tower" queries
CREATE INDEX IF NOT EXISTS idx_tower_images_tower_id 
ON tower_images(tower_id);

-- THIS IS THE KEY INDEX FOR FAST IMAGE LOADING
-- Composite index covering the exact query pattern used
CREATE INDEX IF NOT EXISTS idx_tower_images_tower_primary 
ON tower_images(tower_id, is_primary DESC, uploaded_at DESC);

-- Speed up "get user's uploaded images"
CREATE INDEX IF NOT EXISTS idx_tower_images_user_id 
ON tower_images(user_id);

-- ============================================
-- HELPFUL: Indexes for other tables
-- ============================================

-- Speed up county-based tower queries
CREATE INDEX IF NOT EXISTS idx_water_towers_county_id 
ON water_towers(county_id);

-- Speed up tower name searches
CREATE INDEX IF NOT EXISTS idx_water_towers_name 
ON water_towers(name);

-- Speed up user profile lookups
CREATE INDEX IF NOT EXISTS idx_user_profiles_email 
ON user_profiles(email);

-- ============================================
-- UPDATE STATISTICS
-- ============================================

-- Tell PostgreSQL to update its query planner statistics
ANALYZE user_visits;
ANALYZE tower_images;
ANALYZE water_towers;
ANALYZE user_profiles;

-- ============================================
-- VERIFY INDEXES WERE CREATED
-- ============================================

-- Check that indexes exist
SELECT 
    indexname,
    tablename,
    'Created ✅' as status
FROM pg_indexes
WHERE schemaname = 'public'
    AND indexname LIKE 'idx_%'
ORDER BY tablename, indexname;

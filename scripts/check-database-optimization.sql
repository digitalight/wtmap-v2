-- Run this in Supabase SQL Editor to check current database optimization status

-- ============================================
-- CHECK EXISTING INDEXES
-- ============================================

-- List all indexes on important tables
SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
    AND tablename IN ('water_towers', 'user_visits', 'tower_images', 'user_profiles', 'counties')
ORDER BY tablename, indexname;

-- ============================================
-- CHECK TABLE SIZES
-- ============================================

SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as total_size,
    pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) as table_size,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename) - pg_relation_size(schemaname||'.'||tablename)) as indexes_size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- ============================================
-- CHECK IF MATERIALIZED VIEWS EXIST
-- ============================================

SELECT 
    schemaname,
    matviewname,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||matviewname)) as size
FROM pg_matviews
WHERE schemaname = 'public';

-- ============================================
-- CHECK IF CUSTOM FUNCTIONS EXIST
-- ============================================

SELECT 
    routine_name,
    routine_type,
    data_type
FROM information_schema.routines
WHERE routine_schema = 'public'
    AND routine_name IN (
        'get_overall_statistics',
        'get_top_towers',
        'get_top_users',
        'get_user_statistics',
        'has_user_visited_tower',
        'get_tower_visit_count',
        'refresh_statistics_views'
    )
ORDER BY routine_name;

-- ============================================
-- CHECK MISSING CRITICAL INDEXES
-- ============================================

-- This will show you which indexes are MISSING
DO $$
DECLARE
    missing_indexes TEXT := '';
BEGIN
    -- Check for user_visits indexes
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_user_visits_user_id') THEN
        missing_indexes := missing_indexes || '❌ MISSING: idx_user_visits_user_id (CRITICAL for user queries)' || E'\n';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_user_visits_tower_id') THEN
        missing_indexes := missing_indexes || '❌ MISSING: idx_user_visits_tower_id (CRITICAL for tower queries)' || E'\n';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_user_visits_user_tower') THEN
        missing_indexes := missing_indexes || '❌ MISSING: idx_user_visits_user_tower (CRITICAL for has-visited checks)' || E'\n';
    END IF;
    
    -- Check for tower_images indexes
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_tower_images_tower_id') THEN
        missing_indexes := missing_indexes || '❌ MISSING: idx_tower_images_tower_id (CRITICAL for image loading)' || E'\n';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_tower_images_tower_primary') THEN
        missing_indexes := missing_indexes || '❌ MISSING: idx_tower_images_tower_primary (Important for image loading)' || E'\n';
    END IF;
    
    -- Check for counties index
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_counties_geometry') THEN
        missing_indexes := missing_indexes || '❌ MISSING: idx_counties_geometry (Important for map performance)' || E'\n';
    END IF;
    
    IF missing_indexes = '' THEN
        RAISE NOTICE '✅ All critical indexes are present!';
    ELSE
        RAISE NOTICE E'Missing indexes:\n%', missing_indexes;
    END IF;
END $$;

-- ============================================
-- PERFORMANCE TEST: Check query speed
-- ============================================

-- Test user_visits query performance (should be < 10ms with indexes)
EXPLAIN ANALYZE
SELECT * FROM user_visits 
WHERE user_id = (SELECT id FROM user_profiles LIMIT 1)
LIMIT 10;

-- Test tower_images query performance (should be < 10ms with indexes)
EXPLAIN ANALYZE
SELECT * FROM tower_images 
WHERE tower_id = (SELECT id FROM water_towers LIMIT 1)
ORDER BY is_primary DESC, uploaded_at DESC;

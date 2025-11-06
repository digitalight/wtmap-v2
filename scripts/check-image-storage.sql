-- Check Supabase Storage Configuration for Images
-- Run this to see storage bucket settings and policies

-- ============================================
-- CHECK STORAGE BUCKET CONFIGURATION
-- ============================================

SELECT 
    id,
    name,
    public,
    file_size_limit,
    allowed_mime_types
FROM storage.buckets
WHERE name = 'tower-images';

-- ============================================
-- CHECK STORAGE POLICIES
-- ============================================

SELECT 
    policyname,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE schemaname = 'storage'
    AND tablename = 'objects';

-- ============================================
-- CHECK ACTUAL IMAGE RECORDS
-- ============================================

-- Count images and check for issues
SELECT 
    COUNT(*) as total_images,
    COUNT(DISTINCT tower_id) as towers_with_images,
    AVG(LENGTH(image_url)) as avg_url_length,
    COUNT(*) FILTER (WHERE image_url LIKE '%supabase%') as supabase_hosted,
    COUNT(*) FILTER (WHERE image_url NOT LIKE '%supabase%') as external_hosted
FROM tower_images;

-- Show sample of image URLs to check format
SELECT 
    id,
    tower_id,
    LENGTH(image_url) as url_length,
    LEFT(image_url, 100) as url_preview,
    is_primary,
    uploaded_at
FROM tower_images
ORDER BY uploaded_at DESC
LIMIT 5;

-- ============================================
-- CHECK FOR SLOW QUERIES
-- ============================================

-- This shows the actual query plan for image fetching
EXPLAIN (ANALYZE, BUFFERS, VERBOSE)
SELECT 
    id, 
    tower_id, 
    user_id, 
    image_url, 
    storage_path, 
    is_primary, 
    uploaded_at
FROM tower_images
WHERE tower_id = (SELECT id FROM water_towers LIMIT 1)
ORDER BY is_primary DESC, uploaded_at DESC;

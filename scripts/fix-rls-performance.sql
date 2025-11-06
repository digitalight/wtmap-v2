-- Fix RLS Performance Issues
-- Run this in Supabase SQL Editor to optimize RLS policies

-- ============================================
-- ISSUE 1: Auth RLS InitPlan
-- Replace auth.uid() with (SELECT auth.uid()) to prevent re-evaluation per row
-- ============================================

-- Fix user_visits policies
DROP POLICY IF EXISTS "Users can manage their own visits" ON user_visits;
DROP POLICY IF EXISTS "Users can insert their own visits" ON user_visits;
DROP POLICY IF EXISTS "Users can update their own visits" ON user_visits;
DROP POLICY IF EXISTS "Users can delete their own visits" ON user_visits;

-- Recreate with optimized auth check - single policy handles all operations
CREATE POLICY "Users can manage their own visits"
ON user_visits
FOR ALL
TO authenticated
USING (user_id = (SELECT auth.uid()))
WITH CHECK (user_id = (SELECT auth.uid()));

-- Keep read-only policy for all users
-- (already exists as "Users can view all visits")

-- Fix tower_images policies
DROP POLICY IF EXISTS "Users can update their own images" ON tower_images;
DROP POLICY IF EXISTS "Users can delete their own images" ON tower_images;
DROP POLICY IF EXISTS "Authenticated users can upload images" ON tower_images;

-- Recreate with optimized auth check
CREATE POLICY "Users can upload images"
ON tower_images
FOR INSERT
TO authenticated
WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can manage their own images"
ON tower_images
FOR ALL
TO authenticated
USING (user_id = (SELECT auth.uid()))
WITH CHECK (user_id = (SELECT auth.uid()));

-- Fix user_profiles policies
DROP POLICY IF EXISTS "Users can update profiles" ON user_profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON user_profiles;

CREATE POLICY "Users can manage own profile"
ON user_profiles
FOR ALL
TO authenticated
USING (id = (SELECT auth.uid()))
WITH CHECK (id = (SELECT auth.uid()));

-- Fix tower_photos (if it exists - seems like old table name)
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'tower_photos') THEN
        DROP POLICY IF EXISTS "Users can manage their own photos" ON tower_photos;
        
        CREATE POLICY "Users can manage their own photos"
        ON tower_photos
        FOR ALL
        TO authenticated
        USING (user_id = (SELECT auth.uid()))
        WITH CHECK (user_id = (SELECT auth.uid()));
    END IF;
END $$;

-- ============================================
-- VERIFICATION
-- ============================================

-- List all RLS policies to verify
SELECT 
    schemaname,
    tablename,
    policyname,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE schemaname = 'public'
    AND tablename IN ('user_visits', 'tower_images', 'user_profiles', 'tower_photos')
ORDER BY tablename, policyname;

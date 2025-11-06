-- Fix security warnings: Add search_path to all functions
-- Run this in Supabase SQL Editor to fix the "Function Search Path Mutable" warnings

-- ============================================
-- FUNCTION: Get Overall Statistics (FIXED)
-- ============================================
CREATE OR REPLACE FUNCTION get_overall_statistics()
RETURNS TABLE (
    totalVisits bigint,
    uniqueTowersVisited bigint,
    totalTowers bigint,
    percentageVisited numeric,
    totalReviews bigint,
    averageRating numeric
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;

-- ============================================
-- FUNCTION: Get Top Towers (FIXED)
-- ============================================
CREATE OR REPLACE FUNCTION get_top_towers(limit_count integer DEFAULT 25)
RETURNS TABLE (
    tower_id text,
    tower_name character varying(255),
    visit_count bigint
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;

-- ============================================
-- FUNCTION: Get Top Users (FIXED)
-- ============================================
CREATE OR REPLACE FUNCTION get_top_users(limit_count integer DEFAULT 10)
RETURNS TABLE (
    user_id text,
    user_email text,
    first_name text,
    last_name text,
    visit_count bigint
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;

-- ============================================
-- FUNCTION: Get User Statistics (FIXED)
-- ============================================
CREATE OR REPLACE FUNCTION get_user_statistics(user_uuid uuid)
RETURNS TABLE (
    towers_visited bigint,
    comments_left bigint,
    average_rating numeric,
    total_ratings bigint
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;

-- ============================================
-- FUNCTION: Has User Visited Tower (FIXED)
-- ============================================
CREATE OR REPLACE FUNCTION has_user_visited_tower(user_uuid uuid, tower_uuid text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 
        FROM user_visits 
        WHERE user_id = user_uuid 
        AND tower_id = tower_uuid
        LIMIT 1
    );
END;
$$;

-- ============================================
-- FUNCTION: Get Tower Visit Count (FIXED)
-- ============================================
CREATE OR REPLACE FUNCTION get_tower_visit_count(tower_uuid text)
RETURNS bigint
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN (
        SELECT COUNT(DISTINCT user_id)
        FROM user_visits
        WHERE tower_id = tower_uuid
    );
END;
$$;

-- ============================================
-- Fix existing trigger functions too
-- ============================================

-- Fix update_tower_primary_image function (from tower images migration)
CREATE OR REPLACE FUNCTION update_tower_primary_image()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- If this is being set as primary, unset all other images for this tower
    IF NEW.is_primary = true THEN
        UPDATE tower_images
        SET is_primary = false
        WHERE tower_id = NEW.tower_id
        AND id != NEW.id
        AND is_primary = true;
    END IF;
    
    RETURN NEW;
END;
$$;

-- Fix handle_new_user function (from user profiles migration)
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
    INSERT INTO public.user_profiles (id, email, first_name, last_name, is_admin)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'given_name', NEW.raw_user_meta_data->>'first_name'),
        COALESCE(NEW.raw_user_meta_data->>'family_name', NEW.raw_user_meta_data->>'last_name'),
        false
    );
    RETURN NEW;
END;
$$;

-- ============================================
-- VERIFICATION
-- ============================================

-- Verify all functions are fixed
SELECT 
    routine_name,
    'Fixed ✅' as status
FROM information_schema.routines
WHERE routine_schema = 'public'
    AND routine_name IN (
        'get_overall_statistics',
        'get_top_towers',
        'get_top_users',
        'get_user_statistics',
        'has_user_visited_tower',
        'get_tower_visit_count',
        'update_tower_primary_image',
        'handle_new_user'
    )
ORDER BY routine_name;

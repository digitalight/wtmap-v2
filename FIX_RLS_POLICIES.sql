-- =====================================================
-- FIX RLS POLICIES FOR user_visits TABLE
-- =====================================================
-- Run this SQL in your Supabase SQL Editor
-- (Dashboard > SQL Editor > New Query)
-- =====================================================

-- Enable RLS on user_visits table
ALTER TABLE user_visits ENABLE ROW LEVEL SECURITY;

-- Drop any existing policies
DROP POLICY IF EXISTS "Users can view all visits" ON user_visits;
DROP POLICY IF EXISTS "Users can insert their own visits" ON user_visits;
DROP POLICY IF EXISTS "Users can update their own visits" ON user_visits;
DROP POLICY IF EXISTS "Users can delete their own visits" ON user_visits;
DROP POLICY IF EXISTS "Users can manage their visits" ON user_visits;

-- Create new policies

-- Everyone can view all visits (for displaying visit counts, comments, etc.)
CREATE POLICY "Users can view all visits" 
ON user_visits FOR SELECT 
USING (true);

-- Users can only insert their own visits
CREATE POLICY "Users can insert their own visits" 
ON user_visits FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Users can only update their own visits
CREATE POLICY "Users can update their own visits" 
ON user_visits FOR UPDATE 
USING (auth.uid() = user_id);

-- Users can only delete their own visits
CREATE POLICY "Users can delete their own visits" 
ON user_visits FOR DELETE 
USING (auth.uid() = user_id);

-- =====================================================
-- VERIFICATION
-- =====================================================
-- Run this to verify the policies were created:
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'user_visits';

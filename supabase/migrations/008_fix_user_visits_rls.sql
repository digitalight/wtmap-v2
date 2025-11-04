-- Fix RLS policies for user_visits table
-- The user_visits table exists but doesn't have proper RLS policies

-- Enable RLS if not already enabled
ALTER TABLE user_visits ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Users can view all visits" ON user_visits;
DROP POLICY IF EXISTS "Users can insert their own visits" ON user_visits;
DROP POLICY IF EXISTS "Users can update their own visits" ON user_visits;
DROP POLICY IF EXISTS "Users can delete their own visits" ON user_visits;
DROP POLICY IF EXISTS "Users can manage their visits" ON user_visits;

-- Create new policies

-- Everyone can view all visits (for displaying visit counts, comments, etc.)
CREATE POLICY "Users can view all visits" ON user_visits
    FOR SELECT USING (true);

-- Users can insert their own visits
CREATE POLICY "Users can insert their own visits" ON user_visits
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own visits (for editing comments, ratings, dates)
CREATE POLICY "Users can update their own visits" ON user_visits
    FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete their own visits
CREATE POLICY "Users can delete their own visits" ON user_visits
    FOR DELETE USING (auth.uid() = user_id);

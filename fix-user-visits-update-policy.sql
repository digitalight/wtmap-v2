-- Fix UPDATE policy for user_visits to allow updating comment and rating to null
DROP POLICY IF EXISTS "Users can update their own visits" ON user_visits;

CREATE POLICY "Users can update their own visits" ON user_visits
    FOR UPDATE 
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

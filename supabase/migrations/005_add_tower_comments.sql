-- Add tower_comments table for ratings and reviews
CREATE TABLE IF NOT EXISTS tower_comments (
    id SERIAL PRIMARY KEY,
    tower_id TEXT NOT NULL REFERENCES water_towers(id),
    user_id UUID NOT NULL REFERENCES auth.users(id),
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_tower_comments_tower_id ON tower_comments(tower_id);
CREATE INDEX IF NOT EXISTS idx_tower_comments_user_id ON tower_comments(user_id);
CREATE INDEX IF NOT EXISTS idx_tower_comments_created_at ON tower_comments(created_at DESC);

-- Enable Row Level Security
ALTER TABLE tower_comments ENABLE ROW LEVEL SECURITY;

-- Create policies for tower_comments
-- Users can read all comments
CREATE POLICY "Users can view tower comments" ON tower_comments
    FOR SELECT USING (true);

-- Users can insert their own comments
CREATE POLICY "Users can insert their own comments" ON tower_comments
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own comments
CREATE POLICY "Users can update their own comments" ON tower_comments
    FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete their own comments
CREATE POLICY "Users can delete their own comments" ON tower_comments
    FOR DELETE USING (auth.uid() = user_id);
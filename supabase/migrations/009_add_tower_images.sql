-- =====================================================
-- ADD TOWER IMAGES SUPPORT
-- =====================================================
-- This migration adds support for user-uploaded tower images
-- =====================================================

-- Add image_url column to water_towers table
ALTER TABLE water_towers 
ADD COLUMN IF NOT EXISTS image_url TEXT,
ADD COLUMN IF NOT EXISTS image_uploaded_by UUID,
ADD COLUMN IF NOT EXISTS image_uploaded_at TIMESTAMP WITH TIME ZONE;

-- Create tower_images table for multiple images per tower
CREATE TABLE IF NOT EXISTS tower_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tower_id UUID NOT NULL REFERENCES water_towers(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  image_url TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  is_primary BOOLEAN DEFAULT false,
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(tower_id, storage_path)
);

-- Enable RLS on tower_images
ALTER TABLE tower_images ENABLE ROW LEVEL SECURITY;

-- RLS Policies for tower_images
-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Anyone can view tower images" ON tower_images;
DROP POLICY IF EXISTS "Authenticated users can upload images" ON tower_images;
DROP POLICY IF EXISTS "Users can update their own images" ON tower_images;
DROP POLICY IF EXISTS "Users can delete their own images" ON tower_images;

-- Everyone can view tower images
CREATE POLICY "Anyone can view tower images"
ON tower_images FOR SELECT
USING (true);

-- Authenticated users can upload images
CREATE POLICY "Authenticated users can upload images"
ON tower_images FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own images
CREATE POLICY "Users can update their own images"
ON tower_images FOR UPDATE
USING (auth.uid() = user_id);

-- Users can delete their own images
CREATE POLICY "Users can delete their own images"
ON tower_images FOR DELETE
USING (auth.uid() = user_id);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_tower_images_tower_id ON tower_images(tower_id);
CREATE INDEX IF NOT EXISTS idx_tower_images_user_id ON tower_images(user_id);
CREATE INDEX IF NOT EXISTS idx_tower_images_primary ON tower_images(tower_id, is_primary) WHERE is_primary = true;

-- Function to automatically update water_towers.image_url when a primary image is set
CREATE OR REPLACE FUNCTION update_tower_primary_image()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_primary = true THEN
    -- Unset other primary images for this tower
    UPDATE tower_images 
    SET is_primary = false 
    WHERE tower_id = NEW.tower_id 
      AND id != NEW.id 
      AND is_primary = true;
    
    -- Update the water_towers table with the new primary image
    UPDATE water_towers 
    SET 
      image_url = NEW.image_url,
      image_uploaded_by = NEW.user_id,
      image_uploaded_at = NEW.uploaded_at
    WHERE id = NEW.tower_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update primary image
DROP TRIGGER IF EXISTS tower_primary_image_trigger ON tower_images;
CREATE TRIGGER tower_primary_image_trigger
  AFTER INSERT OR UPDATE OF is_primary ON tower_images
  FOR EACH ROW
  EXECUTE FUNCTION update_tower_primary_image();

-- =====================================================
-- STORAGE BUCKET SETUP (Run in Supabase Dashboard)
-- =====================================================
-- You'll need to create this bucket in Supabase Dashboard:
-- 1. Go to Storage
-- 2. Create new bucket named 'tower-images'
-- 3. Make it public
-- 4. Set up the following policies via SQL:

/*
-- Storage policies for tower-images bucket
-- Run these in Supabase SQL Editor:

-- Allow public access to view images
INSERT INTO storage.buckets (id, name, public)
VALUES ('tower-images', 'tower-images', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Allow authenticated users to upload
CREATE POLICY "Authenticated users can upload tower images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'tower-images' AND (storage.foldername(name))[1] = 'towers');

-- Allow users to update their own images
CREATE POLICY "Users can update their own tower images"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'tower-images' AND owner = auth.uid());

-- Allow users to delete their own images
CREATE POLICY "Users can delete their own tower images"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'tower-images' AND owner = auth.uid());

-- Allow public read access
CREATE POLICY "Public can view tower images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'tower-images');
*/

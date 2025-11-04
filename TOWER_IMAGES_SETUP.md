# Tower Images Setup Guide

This guide will help you set up image uploads for water towers using Supabase Storage.

## 1. Run Database Migration

First, run the database migration to add image support:

1. Go to your [Supabase Dashboard](https://app.supabase.com)
2. Navigate to **SQL Editor**
3. Create a new query
4. Copy and paste the contents of `supabase/migrations/009_add_tower_images.sql`
5. Click **Run**

This will:

- Add `image_url`, `image_uploaded_by`, and `image_uploaded_at` columns to `water_towers`
- Create `tower_images` table for multiple images per tower
- Set up RLS policies for secure image access
- Create triggers to automatically update primary images

## 2. Create Storage Bucket

### Method 1: Using Supabase Dashboard (Recommended)

1. Go to **Storage** in your Supabase Dashboard
2. Click **Create a new bucket**
3. Fill in:
   - **Name**: `tower-images`
   - **Public bucket**: ✅ **Yes** (check this box)
   - **File size limit**: 10 MB (default is fine)
   - **Allowed MIME types**: Leave empty (we validate in code)
4. Click **Create bucket**

### Method 2: Using SQL

Alternatively, run this in SQL Editor:

```sql
INSERT INTO storage.buckets (id, name, public)
VALUES ('tower-images', 'tower-images', true)
ON CONFLICT (id) DO UPDATE SET public = true;
```

## 3. Set Up Storage Policies

Run these SQL statements to configure storage access:

```sql
-- Allow authenticated users to upload
CREATE POLICY "Authenticated users can upload tower images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'tower-images'
  AND (storage.foldername(name))[1] = 'towers'
);

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

-- Allow public read access (anyone can view images)
CREATE POLICY "Public can view tower images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'tower-images');
```

## 4. Verify Setup

### Test the Upload

1. Sign in to your app
2. Open a tower details modal
3. Click "Choose Photo"
4. Select an image (JPEG, PNG, or WebP)
5. Watch it upload and optimize automatically

### Check Supabase Dashboard

After uploading, verify in Supabase:

1. **Storage** → **tower-images** bucket

   - You should see folders like `towers/[tower-id]/`
   - Images will be named like `[user-id]_[timestamp]_[random].jpg`

2. **Table Editor** → **tower_images**

   - Check that records are being created
   - Verify `image_url`, `storage_path`, and `tower_id`

3. **Table Editor** → **water_towers**
   - When an image is set as primary, `image_url` should update

## 5. Image Optimization

The app automatically optimizes images:

### Client-Side Optimization

- **Resize**: Max 1200x1200px (maintains aspect ratio)
- **Compress**: 85% JPEG quality
- **Format**: Converts to JPEG for consistency
- **Before Upload**: Happens in browser before sending

### File Size Limits

- **Original**: Max 10MB upload
- **Optimized**: Typically 200-500KB after optimization
- **Storage**: Saves bandwidth and costs

## 6. Features

### User Features

✅ Upload unlimited photos per tower  
✅ Set primary/main photo  
✅ Delete own photos  
✅ View all photos in gallery  
✅ Click to view full-size (lightbox)  
✅ Automatic image optimization

### Security

✅ Row Level Security (RLS) enabled  
✅ Users can only modify their own uploads  
✅ Everyone can view photos (read-only)  
✅ File type validation (JPEG, PNG, WebP)  
✅ File size limits (10MB max)

### Database Features

✅ Multiple images per tower  
✅ Primary image auto-updates tower record  
✅ User attribution (who uploaded)  
✅ Timestamp tracking  
✅ Cascade delete (remove tower = remove images)

## 7. Troubleshooting

### Upload Fails

**"Failed to upload image"**

- Check that the `tower-images` bucket exists
- Verify storage policies are set up correctly
- Check browser console for detailed errors

**"Invalid file"**

- Only JPEG, PNG, and WebP are supported
- File must be under 10MB
- Image must be a valid format

### Images Don't Display

**Broken image links**

- Verify bucket is set to **public**
- Check that storage policies allow SELECT for public
- Ensure image_url in database is correct

**Old images still showing**

- Hard refresh: Ctrl+F5 (Windows) or Cmd+Shift+R (Mac)
- Clear browser cache
- Check that new images are in the database

### Permission Errors

**"User not authenticated"**

- User must be signed in to upload
- Check that `auth.uid()` is working
- Verify RLS policies on `tower_images` table

**"Access denied"**

- Check storage policies
- Ensure bucket is public for reads
- Verify user owns the image for updates/deletes

## 8. Storage Costs

Supabase Storage pricing (as of 2025):

- **Free Tier**: 1 GB storage, 2 GB bandwidth/month
- **Pro Tier**: 100 GB storage, 200 GB bandwidth/month
- **Additional**: $0.021/GB storage, $0.09/GB bandwidth

### Optimization Benefits

Without optimization (5MB average):

- 200 photos = 1GB (free tier maxed)

With optimization (300KB average):

- ~3,300 photos = 1GB
- **11x more capacity!**

## 9. Optional: Image Moderation

To prevent inappropriate content:

### Manual Review

- Admin can view all uploaded images
- Delete inappropriate content via dashboard

### Automated (Advanced)

- Integrate with services like:
  - [Amazon Rekognition](https://aws.amazon.com/rekognition/)
  - [Google Cloud Vision API](https://cloud.google.com/vision)
  - [Cloudinary AI Content Moderation](https://cloudinary.com/features/ai_content_moderation)

## Done! 📸

Your water towers app now supports:

- ✅ User-uploaded photos
- ✅ Automatic image optimization
- ✅ Gallery view with lightbox
- ✅ Primary image management
- ✅ Secure storage with RLS

Users can now share what towers actually look like!

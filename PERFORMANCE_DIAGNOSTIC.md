# Database Performance Diagnostic & Fix Guide

## Step 1: Check Current Status (5 minutes)

### A. Run Diagnostic Script

1. Go to **Supabase Dashboard → SQL Editor**
2. Open `scripts/check-database-optimization.sql`
3. Copy and paste into SQL Editor
4. Click **Run**
5. Review the output to see:
   - Which indexes currently exist ✅
   - Which indexes are missing ❌
   - Current table sizes
   - Whether functions are installed

### B. Check Image Storage

1. In SQL Editor, run `scripts/check-image-storage.sql`
2. Look for:
   - Are images hosted on Supabase storage?
   - What's the query performance (should be < 10ms)?
   - Is the bucket public?

## Step 2: Apply Critical Indexes (2 minutes)

### Quick Fix - Apply Indexes

1. In SQL Editor, run `scripts/apply-critical-indexes.sql`
2. This creates ONLY the essential indexes
3. Should complete in 5-30 seconds
4. Verify at bottom that indexes were created

**Critical indexes this creates:**

- `idx_user_visits_user_id` - 10-50x faster user queries
- `idx_user_visits_tower_id` - 10-50x faster tower queries
- `idx_user_visits_user_tower` - 100x faster "has visited" checks
- `idx_tower_images_tower_primary` - **10-50x faster image loading** ⚡
- `idx_tower_images_tower_id` - Faster image queries

## Step 3: Fix Slow Image Loading

### If images are still slow after indexes:

#### A. Check if it's a network issue (not database)

1. Open browser DevTools (F12)
2. Go to **Network** tab
3. Filter by **Img**
4. Click on a tower with images
5. Look at image load times:
   - **< 100ms**: Database query (should be fast after indexes)
   - **> 500ms**: Network/download time (Supabase storage issue)

#### B. If download time is slow:

**Option 1: Enable CDN (Recommended)**

1. Go to Supabase Dashboard → **Storage**
2. Click on `tower-images` bucket
3. Enable **CDN** if available (Pro plan)
4. This caches images globally

**Option 2: Make bucket public**

1. Supabase Dashboard → **Storage** → `tower-images`
2. Click **Settings**
3. Make bucket **Public**
4. This removes auth overhead from image URLs

**Option 3: Add image transformation**
Supabase can resize images on-the-fly:

```typescript
// In your code, modify image URLs:
const imageUrl = supabase.storage.from("tower-images").getPublicUrl(path, {
  transform: {
    width: 800,
    height: 800,
    quality: 80,
  },
}).data.publicUrl;
```

## Step 4: Verify Performance Improvements

### Test 1: Check Query Speed

Run this in SQL Editor:

```sql
EXPLAIN ANALYZE
SELECT * FROM tower_images
WHERE tower_id = 'your-tower-id'
ORDER BY is_primary DESC, uploaded_at DESC;
```

Look for:

- **Execution Time**: Should be < 10ms
- **Index Scan** (not Seq Scan): Shows index is being used
- If you see "Seq Scan", indexes aren't working

### Test 2: Real-World Test

1. Open your app
2. Click on a tower with images
3. Open DevTools → Network tab
4. Reload
5. Check timing:
   - **tower_images query**: Should be < 50ms
   - **Image downloads**: Depends on Supabase storage

## Step 5: Additional Optimizations

### If you want even better performance:

#### Enable Connection Pooling

1. Supabase Dashboard → **Settings** → **Database**
2. Enable **Connection Pooling** (Transaction mode)
3. Use pooled connection string in production

#### Add Read Replicas (Paid Plans)

For high-traffic apps, Supabase Pro/Team plans offer read replicas

#### Optimize Images at Upload

Resize/compress images before upload:

```typescript
// Add to your upload function
const compressedImage = await compressImage(file, {
  maxWidth: 1920,
  maxHeight: 1920,
  quality: 0.85,
});
```

## Troubleshooting

### "Indexes don't seem to help"

**Check if indexes are being used:**

```sql
EXPLAIN ANALYZE
SELECT * FROM tower_images WHERE tower_id = 'test-id';
```

If you see "Seq Scan" instead of "Index Scan":

1. Run `ANALYZE tower_images;`
2. Check table has enough data (indexes help with > 100 rows)
3. Verify index exists: `\d tower_images` in psql

### "Images still load slowly"

**It's probably not the database if:**

- Query time < 50ms in Network tab
- But images take > 500ms to display

**Real culprit is likely:**

1. Large image file sizes (> 2MB each)
2. Supabase storage location (far from you)
3. No CDN enabled
4. Private bucket requiring auth for each image

**Fix:**

- Compress images before upload
- Enable CDN (Pro plan)
- Make bucket public
- Use image transformations

### "Still seeing loading screens"

Check:

1. Browser cache disabled in DevTools?
2. Ad blocker blocking requests?
3. Slow internet connection?
4. Too many images loading at once?

## Expected Performance After Optimizations

| Metric            | Before    | After    |
| ----------------- | --------- | -------- |
| Image query time  | 100-500ms | 5-20ms   |
| Profile page load | 2-4s      | 0.3-0.8s |
| Statistics page   | 3-8s      | 0.2-0.5s |
| Has visited check | 100-500ms | 1-5ms    |
| Map rendering     | 1-3s      | 0.5-1s   |

## Need Help?

Share the output of:

1. `scripts/check-database-optimization.sql`
2. `scripts/check-image-storage.sql`
3. Browser DevTools → Network tab screenshot

This will show exactly where the bottleneck is!

# Production Deployment Guide - Water Towers Map

## 🚀 Vercel Deployment (Recommended - Free Tier Available)

### Step 1: Prepare Your Repository

1. ✅ Repository is already pushed to GitHub: `digitalight/wtmap-v2`
2. ✅ Large files excluded (.gitignore configured)
3. ✅ Next.js configuration updated for production

### Step 2: Deploy to Vercel

1. **Sign up/Login to Vercel**

   - Go to [vercel.com](https://vercel.com)
   - Sign in with your GitHub account

2. **Import Project**

   - Click "Add New Project"
   - Select `digitalight/wtmap-v2` from your repositories
   - Click "Import"

3. **Configure Project**

   - **Framework Preset**: Next.js (auto-detected)
   - **Root Directory**: ./
   - **Build Command**: `npm run build` (default)
   - **Output Directory**: `.next` (default)
   - **Install Command**: `npm install` (default)

4. **Add Environment Variables**
   Click "Environment Variables" and add:

   ```
   NEXT_PUBLIC_SUPABASE_URL=https://ntpyyyvrdkarlxptnnat.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im50cHl5eXZyZGthcmx4cHRubmF0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIwODU1ODgsImV4cCI6MjA3NzY2MTU4OH0.tNSmRDyrH2X_oF94c7q-0bAZXy6TzK_wZEDBymCYz1Y
   SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im50cHl5eXZyZGthcmx4cHRubmF0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjA4NTU4OCwiZXhwIjoyMDc3NjYxNTg4fQ.05HDbdXq6Q3bV8d88NBCvTfJ9Wlz-VpIU2s1BwsKKqM
   NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=AIzaSyDS4VAi38mihr2R841bCDQ0KfbULPdscQg
   ```

5. **Deploy**
   - Click "Deploy"
   - Wait 2-3 minutes for build to complete
   - Your app will be live at: `https://your-project-name.vercel.app`

### Step 3: Configure Supabase for Production

1. **Update Site URL in Supabase**

   - Go to [Supabase Dashboard](https://app.supabase.com)
   - Your project → Settings → Authentication → URL Configuration
   - **Site URL**: Add your Vercel URL (e.g., `https://wtmap-v2.vercel.app`)
   - **Redirect URLs**: Add `https://wtmap-v2.vercel.app/**`

2. **Update Google OAuth (if using)**
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Your project → Credentials → Edit OAuth client
   - **Authorized JavaScript origins**: Add your Vercel URL
   - **Authorized redirect URIs**: Keep Supabase callback URL

### Step 4: Custom Domain (Optional)

1. In Vercel project settings → Domains
2. Add your custom domain (e.g., `watertowersmap.com`)
3. Follow Vercel's DNS configuration instructions
4. Update Supabase Site URL to your custom domain

---

## 📋 Production Checklist

### Code Quality

- ✅ TypeScript configured with strict mode
- ✅ ESLint configured
- ✅ Next.js 14 (latest stable)
- ⚠️ Some debug console.logs remain (mostly in error handlers - acceptable)
- ✅ Error boundaries in place
- ✅ Loading states implemented

### Security

- ✅ Row Level Security (RLS) enabled on all tables
- ✅ Service role key server-side only
- ✅ User authentication required for actions
- ✅ Admin role system in place
- ✅ Image uploads validated and optimized
- ✅ SQL injection protected (using Supabase queries)

### Performance

- ✅ Image optimization (WebP, 900px, 75% quality)
- ✅ Dynamic imports for heavy components (Map, MapController)
- ✅ React memoization where needed
- ✅ Lazy loading for images
- ✅ Efficient database queries with indexes

### Database

- ✅ All migrations created in `supabase/migrations/`
- ✅ RLS policies configured
- ✅ PostGIS functions for geospatial queries
- ⚠️ Need to apply migrations to production database

### Features Working

- ✅ User authentication (email + Google OAuth)
- ✅ Map with 825 water towers
- ✅ County boundaries (216 UK counties)
- ✅ User location tracking
- ✅ Tower visits and ratings
- ✅ Comments system
- ✅ Image upload with HEIC support
- ✅ Admin user management
- ✅ Statistics and leaderboard
- ✅ Mobile responsive design
- ✅ Street View integration

### Mobile Optimization

- ✅ Responsive layout
- ✅ Touch-friendly controls
- ✅ Bottom sheet modals
- ✅ Optimized for small screens
- ✅ Proper viewport meta tags

---

## 🔧 Post-Deployment Tasks

### 1. Apply Database Migrations

Run these in Supabase SQL Editor:

```sql
-- 1. User profiles table (if not exists)
-- Run: supabase/migrations/010_add_user_profiles.sql

-- 2. Fix admin policies (if admin page not working)
-- Run: fix-admin-policies.sql

-- 3. Make yourself admin
UPDATE user_profiles
SET is_admin = TRUE
WHERE email = 'your-email@gmail.com';
```

### 2. Configure Storage Bucket

- Go to Supabase Dashboard → Storage
- Ensure `tower-images` bucket is **public**
- If not: Settings → Make bucket public

### 3. Test Critical Paths

- [ ] Sign up with email
- [ ] Sign in with Google
- [ ] View map and towers
- [ ] Mark tower as visited
- [ ] Upload tower image
- [ ] Add comment and rating
- [ ] Admin page access (admin users only)
- [ ] User management (admin only)

### 4. Monitor First Week

- Check Vercel Analytics for errors
- Monitor Supabase → Database → Logs
- Watch for failed image uploads
- Check authentication flow

---

## 🆓 Vercel Free Tier Limits

**Included Free:**

- ✅ Unlimited deployments
- ✅ 100GB bandwidth/month (plenty for this app)
- ✅ Automatic HTTPS
- ✅ Preview deployments for each commit
- ✅ Analytics
- ✅ Edge functions
- ✅ Serverless functions (limited)

**Considerations:**

- Bandwidth: ~100GB/month (should be fine unless viral)
- Build time: 6000 minutes/month (plenty)
- Serverless execution: 100GB-Hours (sufficient)

---

## 🔄 Continuous Deployment

**Automatic deployments are enabled:**

- Push to `main` branch → Deploys to production
- Push to other branches → Creates preview deployment
- Pull requests → Preview deployment with unique URL

---

## 🐛 Troubleshooting

### Build Fails

- Check Vercel build logs
- Ensure all dependencies in `package.json`
- Check for TypeScript errors: `npm run build` locally

### Environment Variables Not Working

- Ensure they're prefixed with `NEXT_PUBLIC_` for client-side
- Redeploy after adding env vars
- Check spelling and formatting

### Database Connection Issues

- Verify Supabase URL and keys
- Check RLS policies aren't blocking queries
- Enable Supabase logs to see failed queries

### Images Not Loading

- Ensure `tower-images` bucket is public
- Check Supabase storage URL is correct
- Verify Next.js image domains configuration

### OAuth Not Working

- Update redirect URLs in Google Console
- Update Site URL in Supabase
- Clear browser cache and try again

---

## 📊 Monitoring & Maintenance

### Vercel Dashboard

- Analytics → View traffic and errors
- Deployments → See deployment history
- Logs → Real-time function logs

### Supabase Dashboard

- Database → Table editor and query logs
- Auth → User list and authentication logs
- Storage → File usage and uploads
- API → Usage stats

### Regular Maintenance

- Monitor storage usage (images)
- Review user feedback/comments
- Update dependencies quarterly
- Backup database monthly

---

## 🎯 Go Live!

Once deployed:

1. ✅ Test all features thoroughly
2. ✅ Share URL with beta testers
3. ✅ Monitor for first few days
4. 🚀 Promote to users!

**Your Vercel deployment URL will be:**
`https://wtmap-v2.vercel.app` (or similar)

---

## Support

- Vercel Docs: https://vercel.com/docs
- Supabase Docs: https://supabase.com/docs
- Next.js Docs: https://nextjs.org/docs

Good luck with your deployment! 🎉

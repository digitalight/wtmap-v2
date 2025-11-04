# Pre-Production Checklist

## ✅ Code Ready for Production

### Files Updated

- [x] `next.config.js` - Updated image domains for Supabase
- [x] `.env.example` - Updated with all required variables
- [x] `.gitignore` - Large files excluded (osm-regions.geojson)
- [x] `vercel.json` - Security headers and caching configured

### Code Quality

- [x] TypeScript properly configured
- [x] All components have proper error handling
- [x] Loading states implemented
- [x] Mobile responsive design complete
- [x] Image optimization (WebP, 900px, 75% quality)
- [x] Dynamic imports for large components

### Security

- [x] RLS policies on all tables
- [x] Admin-only routes protected
- [x] User authentication required
- [x] Service key kept server-side only
- [x] Input validation on forms
- [x] Image upload validation

## 🚀 Deployment Steps

### 1. Commit and Push Final Changes

```bash
git add .
git commit -m "Production ready: optimized config and added deployment docs"
git push origin main
```

### 2. Deploy to Vercel

1. Go to [vercel.com](https://vercel.com)
2. Import `digitalight/wtmap-v2` repository
3. Add environment variables (see PRODUCTION_DEPLOYMENT.md)
4. Deploy!

### 3. Configure Supabase

1. Add Vercel URL to Supabase Site URL
2. Add redirect URLs for OAuth
3. Ensure `tower-images` bucket is public
4. Apply migrations (see below)

### 4. Apply Database Migrations

Run in Supabase SQL Editor:

```sql
-- Migration 010: User Profiles (Admin System)
-- Copy and paste: supabase/migrations/010_add_user_profiles.sql

-- Fix Admin Policies (if needed)
-- Copy and paste: fix-admin-policies.sql

-- Make yourself admin
UPDATE user_profiles
SET is_admin = TRUE
WHERE email = 'your-email@gmail.com';
```

### 5. Test Everything

- [ ] Sign up with email
- [ ] Sign in with Google OAuth
- [ ] View map and navigate
- [ ] Click on tower → see details
- [ ] Mark tower as visited
- [ ] Upload image (JPEG, PNG, WebP, HEIC)
- [ ] Add comment and rating
- [ ] View profile page
- [ ] Delete own comment
- [ ] Admin page access
- [ ] User management (promote/demote admin)
- [ ] Password reset email
- [ ] Mobile view on phone

## 📊 Current Stats

- **Towers**: 825 UK water towers
- **Counties**: 216 with boundaries
- **Features**: Visits, ratings, comments, images, admin system
- **Optimization**: WebP images, 900px max, 75% quality

## 🔑 Environment Variables Needed in Vercel

```
NEXT_PUBLIC_SUPABASE_URL=https://ntpyyyvrdkarlxptnnat.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[from .env.local]
SUPABASE_SERVICE_KEY=[from .env.local]
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=[from .env.local]
```

## ⚠️ Known Issues / Notes

### Debug Console Logs

- Some console.log statements remain in error handlers
- These are acceptable for production debugging
- Main user-facing flows have no debug logs

### Database Migrations

- Migration files exist in `supabase/migrations/`
- Need to be manually applied via SQL Editor
- RLS policies must be active for security

### Large File

- `osm-regions.geojson` (292MB) excluded from git
- Not needed for production (using counties.geojson instead)
- Already in .gitignore

## 🎯 Post-Deployment

### Monitoring

- [ ] Check Vercel Analytics daily for first week
- [ ] Monitor Supabase logs for errors
- [ ] Watch for failed image uploads
- [ ] Review user comments/feedback

### Performance

- Vercel Edge Network handles caching
- Images optimized automatically
- Database queries use indexes
- Mobile-optimized bundle

### Scaling

- Vercel free tier: 100GB bandwidth/month
- Supabase free tier: 500MB database, 1GB storage
- Should handle hundreds of users easily
- Can upgrade if needed

## 📞 Support Resources

- Vercel: https://vercel.com/docs
- Supabase: https://supabase.com/docs
- Next.js: https://nextjs.org/docs

---

## Ready to Deploy! 🚀

Everything is configured and ready for production deployment on Vercel.
Follow the steps in `PRODUCTION_DEPLOYMENT.md` for detailed instructions.

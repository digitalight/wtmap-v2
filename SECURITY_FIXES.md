# Supabase Security Fixes

## 1. Function Search Path Security ✅

**Issue:** Functions have mutable search_path which is a security risk.

**Fix:** Run `scripts/fix-function-security.sql` in Supabase SQL Editor

This adds `SECURITY DEFINER SET search_path = public` to all functions, which:

- Prevents SQL injection via search_path manipulation
- Ensures functions always use the correct schema
- Follows PostgreSQL security best practices

## 2. Leaked Password Protection ⚠️

**Issue:** Supabase Auth's leaked password protection is disabled.

**Fix:** Enable it in Supabase Dashboard

### Steps to Enable:

1. Go to **Supabase Dashboard**
2. Navigate to **Authentication → Policies**
3. Find **"Password Strength"** section
4. Enable **"Leaked Password Protection"**

This feature checks passwords against HaveIBeenPwned.org database to prevent users from using compromised passwords.

**Note:** This is a dashboard setting, not a code change. It's a good security practice but not critical if you're using OAuth (Google) as your primary auth method.

## Priority

1. **HIGH:** Fix function search_path (run fix-function-security.sql)
2. **MEDIUM:** Enable leaked password protection (dashboard setting)

Both are warnings, not critical errors, but should be addressed for production security.

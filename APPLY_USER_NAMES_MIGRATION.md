# Apply User Names Migration

This migration adds first_name and last_name columns to user_profiles to capture names from Google OAuth login.

## What This Migration Does

1. **Adds columns**: `first_name` and `last_name` to the `user_profiles` table
2. **Updates trigger**: Modifies `handle_new_user()` to extract names from Google OAuth metadata
3. **Backfills data**: Updates existing users with names from their auth metadata

## How to Apply

### Option 1: Supabase Dashboard (SQL Editor)

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor** in the left sidebar
3. Create a new query
4. Copy and paste the entire contents of `supabase/migrations/011_add_user_names.sql`
5. Click **Run** to execute the migration

### Option 2: Supabase CLI (if project is linked)

```bash
npx supabase db push
```

## What to Expect

### For New Users

When a user signs in with Google OAuth, the system will automatically:

- Extract `given_name` (first name) and `family_name` (last name) from Google
- If those aren't available, split the `full_name` field
- Store the names in the user_profiles table

### For Existing Users

The migration includes a backfill query that will:

- Read existing OAuth metadata from the `auth.users` table
- Extract names from `raw_user_meta_data`
- Update the `user_profiles` table with the extracted names

### UI Changes

After the migration is applied, users will see:

1. **Navigation Menu**: Shows first name instead of email (e.g., "John" instead of "john@example.com")
2. **Statistics Leaderboard**: Shows "FirstName L." format (e.g., "John D." instead of "john@example.com")
3. **Fallback**: If no name is available, email address is still displayed

## Verification

After applying the migration, you can verify it worked:

```sql
-- Check that columns were added
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'user_profiles'
AND column_name IN ('first_name', 'last_name');

-- Check if existing users have names
SELECT id, email, first_name, last_name
FROM user_profiles
LIMIT 10;

-- View the updated trigger
SELECT pg_get_functiondef(oid)
FROM pg_proc
WHERE proname = 'handle_new_user';
```

## Rollback (if needed)

If you need to rollback this migration:

```sql
-- Remove the columns
ALTER TABLE user_profiles
DROP COLUMN IF EXISTS first_name,
DROP COLUMN IF EXISTS last_name;

-- Restore original trigger (only inserts id and email)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email)
  VALUES (NEW.id, NEW.email);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

## Notes

- The migration is safe to run multiple times (uses `ADD COLUMN IF NOT EXISTS`)
- Names are optional - users without OAuth or with incomplete metadata will have NULL values
- The UI gracefully falls back to email if names aren't available
- Google OAuth typically provides `given_name` and `family_name` in the metadata

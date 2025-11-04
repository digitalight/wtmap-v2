-- Add first_name and last_name columns to user_profiles
ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS first_name TEXT,
ADD COLUMN IF NOT EXISTS last_name TEXT;

-- Update the handle_new_user function to capture names from auth metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  user_first_name TEXT;
  user_last_name TEXT;
  full_name TEXT;
BEGIN
  -- Try to extract names from raw_user_meta_data (Google OAuth provides this)
  full_name := NEW.raw_user_meta_data->>'full_name';
  user_first_name := NEW.raw_user_meta_data->>'given_name';
  user_last_name := NEW.raw_user_meta_data->>'family_name';
  
  -- If given_name/family_name not available, try to split full_name
  IF user_first_name IS NULL AND full_name IS NOT NULL THEN
    user_first_name := split_part(full_name, ' ', 1);
    user_last_name := split_part(full_name, ' ', 2);
  END IF;
  
  -- Insert user profile with names
  INSERT INTO public.user_profiles (id, email, first_name, last_name)
  VALUES (NEW.id, NEW.email, user_first_name, user_last_name);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Backfill names for existing users from auth.users metadata
UPDATE user_profiles
SET 
  first_name = COALESCE(
    (SELECT raw_user_meta_data->>'given_name' FROM auth.users WHERE id = user_profiles.id),
    split_part((SELECT raw_user_meta_data->>'full_name' FROM auth.users WHERE id = user_profiles.id), ' ', 1)
  ),
  last_name = COALESCE(
    (SELECT raw_user_meta_data->>'family_name' FROM auth.users WHERE id = user_profiles.id),
    split_part((SELECT raw_user_meta_data->>'full_name' FROM auth.users WHERE id = user_profiles.id), ' ', 2)
  )
WHERE first_name IS NULL;

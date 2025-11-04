-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON user_profiles;
DROP POLICY IF EXISTS "Allow read access to profiles" ON user_profiles;
DROP POLICY IF EXISTS "Users can update profiles" ON user_profiles;

-- Policy: Users can always read any profile (for admin checks and user lists)
-- This allows the admin check query to work without circular dependencies
CREATE POLICY "Allow read access to profiles"
  ON user_profiles
  FOR SELECT
  USING (true);

-- Policy: Users can only update their own non-admin fields
-- Admins can update any profile
CREATE POLICY "Users can update profiles"
  ON user_profiles
  FOR UPDATE
  USING (
    auth.uid() = id OR
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  )
  WITH CHECK (
    (auth.uid() = id AND is_admin = (SELECT is_admin FROM user_profiles WHERE id = auth.uid())) OR
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- Policy: Anyone authenticated can insert their own profile
CREATE POLICY "Users can insert own profile"
  ON user_profiles
  FOR INSERT
  WITH CHECK (auth.uid() = id);

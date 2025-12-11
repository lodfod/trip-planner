-- Add soft delete support to profiles
-- Users who leave the app will have is_active set to false
-- They will still appear in existing expenses but not in member selection

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

-- Update the policy to allow users to deactivate their own profile
CREATE POLICY "Users can deactivate their own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Index for filtering active users
CREATE INDEX IF NOT EXISTS idx_profiles_is_active ON profiles(is_active);

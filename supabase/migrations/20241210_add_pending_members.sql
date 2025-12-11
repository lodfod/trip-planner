-- Add pending_members table for invited users who haven't signed up yet
CREATE TABLE IF NOT EXISTS pending_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  display_name text NOT NULL,
  invited_by uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- RLS Policies for pending_members
ALTER TABLE pending_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all pending members"
  ON pending_members FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can invite pending members"
  ON pending_members FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = invited_by);

CREATE POLICY "Users can delete pending members they invited"
  ON pending_members FOR DELETE
  TO authenticated
  USING (auth.uid() = invited_by);

-- Add pending_member_id to payer_amounts (optional, nullable)
-- Either user_id OR pending_member_id should be set, not both
ALTER TABLE payer_amounts
  ALTER COLUMN user_id DROP NOT NULL;

ALTER TABLE payer_amounts
  ADD COLUMN IF NOT EXISTS pending_member_id uuid REFERENCES pending_members(id) ON DELETE CASCADE;

-- Add check constraint to ensure either user_id or pending_member_id is set
ALTER TABLE payer_amounts
  ADD CONSTRAINT payer_has_user_or_pending
  CHECK (
    (user_id IS NOT NULL AND pending_member_id IS NULL) OR
    (user_id IS NULL AND pending_member_id IS NOT NULL)
  );

-- Index for pending member lookups
CREATE INDEX IF NOT EXISTS idx_payer_amounts_pending_member_id ON payer_amounts(pending_member_id);

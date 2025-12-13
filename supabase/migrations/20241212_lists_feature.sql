-- Lists Feature Migration
-- Creates tables for user lists with Google Maps integration and nested items

-- ============================================
-- LISTS TABLE
-- ============================================
CREATE TABLE lists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  category text DEFAULT 'custom', -- 'restaurants', 'shopping', 'activities', 'sightseeing', 'custom'
  color text DEFAULT '#3B82F6',
  created_by uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================
-- LIST ITEMS TABLE
-- Supports 1-level nesting via parent_item_id
-- ============================================
CREATE TABLE list_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  list_id uuid NOT NULL REFERENCES lists(id) ON DELETE CASCADE,
  parent_item_id uuid REFERENCES list_items(id) ON DELETE CASCADE, -- null = top-level item
  name text NOT NULL,
  notes text,
  item_order int NOT NULL DEFAULT 0,
  is_checked boolean NOT NULL DEFAULT false,
  checked_by uuid REFERENCES profiles(id),
  checked_at timestamptz,
  -- Google Maps place data (null if just text entry)
  is_place boolean NOT NULL DEFAULT false,
  google_place_id text,
  address text,
  lat decimal,
  lng decimal,
  photo_url text,
  rating decimal,
  price_level int,
  -- Metadata
  created_by uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX idx_lists_created_by ON lists(created_by);
CREATE INDEX idx_list_items_list_id ON list_items(list_id);
CREATE INDEX idx_list_items_parent_id ON list_items(parent_item_id);
CREATE INDEX idx_list_items_order ON list_items(list_id, item_order);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================
ALTER TABLE lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE list_items ENABLE ROW LEVEL SECURITY;

-- Lists: All authenticated users can view (shared trip lists)
CREATE POLICY "lists_select_authenticated" ON lists
  FOR SELECT TO authenticated USING (true);

-- Lists: Creator can insert
CREATE POLICY "lists_insert_creator" ON lists
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = created_by);

-- Lists: Creator can update
CREATE POLICY "lists_update_creator" ON lists
  FOR UPDATE TO authenticated
  USING (auth.uid() = created_by)
  WITH CHECK (auth.uid() = created_by);

-- Lists: Any authenticated user can delete (shared trip)
CREATE POLICY "lists_delete_authenticated" ON lists
  FOR DELETE TO authenticated
  USING (true);

-- List Items: All authenticated users can view
CREATE POLICY "list_items_select_authenticated" ON list_items
  FOR SELECT TO authenticated USING (true);

-- List Items: Creator can insert
CREATE POLICY "list_items_insert_creator" ON list_items
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = created_by);

-- List Items: Creator can update OR any user can update is_checked/checked_by/checked_at
CREATE POLICY "list_items_update" ON list_items
  FOR UPDATE TO authenticated
  USING (true)
  WITH CHECK (true);

-- List Items: Any authenticated user can delete (shared trip)
CREATE POLICY "list_items_delete_authenticated" ON list_items
  FOR DELETE TO authenticated
  USING (true);

-- ============================================
-- UPDATED_AT TRIGGER
-- ============================================
CREATE OR REPLACE FUNCTION update_lists_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER lists_updated_at_trigger
  BEFORE UPDATE ON lists
  FOR EACH ROW
  EXECUTE FUNCTION update_lists_updated_at();

-- ============================================
-- ADVANCED ITINERARY SYSTEM - DATABASE MIGRATION
-- ============================================
-- This migration replaces the simple events system with a sophisticated
-- itinerary system supporting mini-itineraries, shared stops, and route optimization.

-- ============================================
-- 1. DROP OLD EVENTS TABLES (if migrating)
-- ============================================
-- Uncomment these if you want to drop the old events system
-- DROP TABLE IF EXISTS event_participants CASCADE;
-- DROP TABLE IF EXISTS events CASCADE;
-- DROP TYPE IF EXISTS participation_status CASCADE;

-- ============================================
-- 2. ITINERARIES TABLE
-- ============================================
-- A mini-itinerary is a collection of stops for a subgroup
CREATE TABLE IF NOT EXISTS itineraries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  date date NOT NULL,
  color text DEFAULT '#3B82F6', -- Default blue, hex color for visual distinction
  created_by uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- RLS Policies for itineraries
ALTER TABLE itineraries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all itineraries"
  ON itineraries FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert itineraries"
  ON itineraries FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update their own itineraries"
  ON itineraries FOR UPDATE
  TO authenticated
  USING (auth.uid() = created_by)
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can delete their own itineraries"
  ON itineraries FOR DELETE
  TO authenticated
  USING (auth.uid() = created_by);

CREATE TRIGGER itineraries_updated_at
  BEFORE UPDATE ON itineraries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 3. STOPS TABLE
-- ============================================
-- A stop is a place/activity that can be shared across itineraries
CREATE TYPE stop_category AS ENUM (
  'food',
  'temple',
  'shrine',
  'shopping',
  'activity',
  'transport',
  'hotel',
  'scenic',
  'museum',
  'entertainment',
  'other'
);

CREATE TABLE IF NOT EXISTS stops (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  address text,
  lat numeric(10, 7), -- Latitude with 7 decimal places (~1cm precision)
  lng numeric(10, 7), -- Longitude
  google_place_id text, -- For Google Maps API lookups
  estimated_duration_minutes int DEFAULT 60, -- How long to spend here
  category stop_category DEFAULT 'other',
  opening_hours jsonb, -- Structured opening hours from Google Places
  photo_url text, -- Photo from Google Places or user upload
  phone text,
  website text,
  price_level int, -- 0-4 from Google Places
  rating numeric(2, 1), -- Average rating
  created_by uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- RLS Policies for stops
ALTER TABLE stops ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all stops"
  ON stops FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert stops"
  ON stops FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

-- Anyone can update stops (for linked editing across itineraries)
CREATE POLICY "Users can update stops"
  ON stops FOR UPDATE
  TO authenticated
  USING (true);

-- Only creator can delete
CREATE POLICY "Users can delete their own stops"
  ON stops FOR DELETE
  TO authenticated
  USING (auth.uid() = created_by);

CREATE TRIGGER stops_updated_at
  BEFORE UPDATE ON stops
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 4. ITINERARY_STOPS TABLE (Junction)
-- ============================================
-- Links itineraries to stops with ordering and itinerary-specific notes
CREATE TABLE IF NOT EXISTS itinerary_stops (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  itinerary_id uuid NOT NULL REFERENCES itineraries(id) ON DELETE CASCADE,
  stop_id uuid NOT NULL REFERENCES stops(id) ON DELETE CASCADE,
  stop_order int NOT NULL DEFAULT 0, -- Sequence in this itinerary
  planned_arrival_time time, -- When to arrive at this stop
  planned_departure_time time, -- When to leave
  notes text, -- Itinerary-specific notes for this stop
  is_optional boolean DEFAULT false, -- Can be skipped if running late
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(itinerary_id, stop_id) -- A stop can only appear once per itinerary
);

-- RLS Policies for itinerary_stops
ALTER TABLE itinerary_stops ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all itinerary stops"
  ON itinerary_stops FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can manage itinerary stops for their itineraries"
  ON itinerary_stops FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM itineraries
      WHERE itineraries.id = itinerary_id
      AND itineraries.created_by = auth.uid()
    )
  );

CREATE POLICY "Users can update itinerary stops for their itineraries"
  ON itinerary_stops FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM itineraries
      WHERE itineraries.id = itinerary_id
      AND itineraries.created_by = auth.uid()
    )
  );

CREATE POLICY "Users can delete itinerary stops for their itineraries"
  ON itinerary_stops FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM itineraries
      WHERE itineraries.id = itinerary_id
      AND itineraries.created_by = auth.uid()
    )
  );

CREATE TRIGGER itinerary_stops_updated_at
  BEFORE UPDATE ON itinerary_stops
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 5. ITINERARY_PARTICIPANTS TABLE
-- ============================================
-- Tracks who is on which itinerary
-- Reuse participation_status enum if it exists, otherwise create it
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'participation_status') THEN
    CREATE TYPE participation_status AS ENUM ('going', 'maybe', 'not_going');
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS itinerary_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  itinerary_id uuid NOT NULL REFERENCES itineraries(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status participation_status NOT NULL DEFAULT 'maybe',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(itinerary_id, user_id)
);

-- RLS Policies for itinerary_participants
ALTER TABLE itinerary_participants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all itinerary participants"
  ON itinerary_participants FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can manage their own participation"
  ON itinerary_participants FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own participation"
  ON itinerary_participants FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own participation"
  ON itinerary_participants FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE TRIGGER itinerary_participants_updated_at
  BEFORE UPDATE ON itinerary_participants
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 6. ROUTE_SEGMENTS TABLE
-- ============================================
-- Cached route data between stops for optimization
CREATE TYPE travel_mode AS ENUM ('walking', 'transit', 'driving');

CREATE TABLE IF NOT EXISTS route_segments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_stop_id uuid NOT NULL REFERENCES stops(id) ON DELETE CASCADE,
  to_stop_id uuid NOT NULL REFERENCES stops(id) ON DELETE CASCADE,
  travel_mode travel_mode NOT NULL DEFAULT 'transit',
  duration_seconds int, -- Travel time
  distance_meters int, -- Distance
  route_polyline text, -- Encoded polyline for map display
  route_summary text, -- Human-readable summary (e.g., "Via Yamanote Line")
  route_data jsonb, -- Full Google Directions response for details
  fetched_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(from_stop_id, to_stop_id, travel_mode)
);

-- RLS Policies for route_segments
ALTER TABLE route_segments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all route segments"
  ON route_segments FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert route segments"
  ON route_segments FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update route segments"
  ON route_segments FOR UPDATE
  TO authenticated
  USING (true);

-- ============================================
-- 7. INDEXES FOR PERFORMANCE
-- ============================================
CREATE INDEX IF NOT EXISTS idx_itineraries_date ON itineraries(date);
CREATE INDEX IF NOT EXISTS idx_itineraries_created_by ON itineraries(created_by);
CREATE INDEX IF NOT EXISTS idx_stops_google_place_id ON stops(google_place_id);
CREATE INDEX IF NOT EXISTS idx_stops_category ON stops(category);
CREATE INDEX IF NOT EXISTS idx_stops_location ON stops(lat, lng);
CREATE INDEX IF NOT EXISTS idx_itinerary_stops_itinerary ON itinerary_stops(itinerary_id);
CREATE INDEX IF NOT EXISTS idx_itinerary_stops_stop ON itinerary_stops(stop_id);
CREATE INDEX IF NOT EXISTS idx_itinerary_stops_order ON itinerary_stops(itinerary_id, stop_order);
CREATE INDEX IF NOT EXISTS idx_itinerary_participants_itinerary ON itinerary_participants(itinerary_id);
CREATE INDEX IF NOT EXISTS idx_itinerary_participants_user ON itinerary_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_route_segments_stops ON route_segments(from_stop_id, to_stop_id);

-- ============================================
-- 8. HELPER VIEWS
-- ============================================

-- View to get stops that are shared across multiple itineraries
CREATE OR REPLACE VIEW shared_stops AS
SELECT
  s.id as stop_id,
  s.name as stop_name,
  array_agg(DISTINCT i.id) as itinerary_ids,
  array_agg(DISTINCT i.name) as itinerary_names,
  count(DISTINCT i.id) as itinerary_count
FROM stops s
JOIN itinerary_stops ist ON s.id = ist.stop_id
JOIN itineraries i ON ist.itinerary_id = i.id
GROUP BY s.id, s.name
HAVING count(DISTINCT i.id) > 1;

-- ============================================
-- 9. FUNCTIONS
-- ============================================

-- Function to reorder stops when one is moved
CREATE OR REPLACE FUNCTION reorder_itinerary_stops(
  p_itinerary_id uuid,
  p_stop_id uuid,
  p_new_order int
)
RETURNS void AS $$
DECLARE
  v_old_order int;
BEGIN
  -- Get current order
  SELECT stop_order INTO v_old_order
  FROM itinerary_stops
  WHERE itinerary_id = p_itinerary_id AND stop_id = p_stop_id;

  IF v_old_order IS NULL THEN
    RAISE EXCEPTION 'Stop not found in itinerary';
  END IF;

  IF p_new_order > v_old_order THEN
    -- Moving down: decrease order of items between old and new position
    UPDATE itinerary_stops
    SET stop_order = stop_order - 1
    WHERE itinerary_id = p_itinerary_id
      AND stop_order > v_old_order
      AND stop_order <= p_new_order;
  ELSE
    -- Moving up: increase order of items between new and old position
    UPDATE itinerary_stops
    SET stop_order = stop_order + 1
    WHERE itinerary_id = p_itinerary_id
      AND stop_order >= p_new_order
      AND stop_order < v_old_order;
  END IF;

  -- Set new order for the moved stop
  UPDATE itinerary_stops
  SET stop_order = p_new_order
  WHERE itinerary_id = p_itinerary_id AND stop_id = p_stop_id;
END;
$$ LANGUAGE plpgsql;

-- Function to get next stop order for an itinerary
CREATE OR REPLACE FUNCTION get_next_stop_order(p_itinerary_id uuid)
RETURNS int AS $$
DECLARE
  v_max_order int;
BEGIN
  SELECT COALESCE(MAX(stop_order), -1) + 1 INTO v_max_order
  FROM itinerary_stops
  WHERE itinerary_id = p_itinerary_id;

  RETURN v_max_order;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- NOTES
-- ============================================
-- After running this migration:
-- 1. Add VITE_GOOGLE_MAPS_API_KEY to your .env file
-- 2. Enable these Google Cloud APIs:
--    - Maps JavaScript API
--    - Places API (New)
--    - Directions API

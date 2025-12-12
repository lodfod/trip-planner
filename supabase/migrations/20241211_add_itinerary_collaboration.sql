-- ============================================
-- ITINERARY COLLABORATION - Add can_edit permission
-- ============================================
-- This migration adds collaborative editing to itineraries.
-- Participants with can_edit = true can add/remove/reorder stops.

-- ============================================
-- 1. ADD can_edit COLUMN TO itinerary_participants
-- ============================================
ALTER TABLE itinerary_participants
ADD COLUMN IF NOT EXISTS can_edit boolean NOT NULL DEFAULT false;

-- ============================================
-- 2. UPDATE RLS POLICIES FOR itineraries
-- ============================================
-- Allow editors to update itineraries (not just creators)
DROP POLICY IF EXISTS "Users can update their own itineraries" ON itineraries;

CREATE POLICY "Users can update itineraries they can edit"
  ON itineraries FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = created_by
    OR EXISTS (
      SELECT 1 FROM itinerary_participants
      WHERE itinerary_participants.itinerary_id = itineraries.id
      AND itinerary_participants.user_id = auth.uid()
      AND itinerary_participants.can_edit = true
    )
  )
  WITH CHECK (
    auth.uid() = created_by
    OR EXISTS (
      SELECT 1 FROM itinerary_participants
      WHERE itinerary_participants.itinerary_id = itineraries.id
      AND itinerary_participants.user_id = auth.uid()
      AND itinerary_participants.can_edit = true
    )
  );

-- ============================================
-- 3. UPDATE RLS POLICIES FOR itinerary_stops
-- ============================================
-- Allow editors to manage stops (not just creators)
DROP POLICY IF EXISTS "Users can manage itinerary stops for their itineraries" ON itinerary_stops;
DROP POLICY IF EXISTS "Users can update itinerary stops for their itineraries" ON itinerary_stops;
DROP POLICY IF EXISTS "Users can delete itinerary stops for their itineraries" ON itinerary_stops;

CREATE POLICY "Users can insert itinerary stops if they can edit"
  ON itinerary_stops FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM itineraries
      WHERE itineraries.id = itinerary_id
      AND (
        itineraries.created_by = auth.uid()
        OR EXISTS (
          SELECT 1 FROM itinerary_participants
          WHERE itinerary_participants.itinerary_id = itineraries.id
          AND itinerary_participants.user_id = auth.uid()
          AND itinerary_participants.can_edit = true
        )
      )
    )
  );

CREATE POLICY "Users can update itinerary stops if they can edit"
  ON itinerary_stops FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM itineraries
      WHERE itineraries.id = itinerary_id
      AND (
        itineraries.created_by = auth.uid()
        OR EXISTS (
          SELECT 1 FROM itinerary_participants
          WHERE itinerary_participants.itinerary_id = itineraries.id
          AND itinerary_participants.user_id = auth.uid()
          AND itinerary_participants.can_edit = true
        )
      )
    )
  );

CREATE POLICY "Users can delete itinerary stops if they can edit"
  ON itinerary_stops FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM itineraries
      WHERE itineraries.id = itinerary_id
      AND (
        itineraries.created_by = auth.uid()
        OR EXISTS (
          SELECT 1 FROM itinerary_participants
          WHERE itinerary_participants.itinerary_id = itineraries.id
          AND itinerary_participants.user_id = auth.uid()
          AND itinerary_participants.can_edit = true
        )
      )
    )
  );

-- ============================================
-- 4. ALLOW CREATORS TO MANAGE OTHER USERS' PARTICIPATION
-- ============================================
-- The creator needs to be able to toggle can_edit for other participants
DROP POLICY IF EXISTS "Users can update their own participation" ON itinerary_participants;

CREATE POLICY "Users can update participation"
  ON itinerary_participants FOR UPDATE
  TO authenticated
  USING (
    -- Users can update their own participation (status)
    auth.uid() = user_id
    OR
    -- Creators can update any participation for their itineraries (can_edit flag)
    EXISTS (
      SELECT 1 FROM itineraries
      WHERE itineraries.id = itinerary_id
      AND itineraries.created_by = auth.uid()
    )
  )
  WITH CHECK (
    auth.uid() = user_id
    OR
    EXISTS (
      SELECT 1 FROM itineraries
      WHERE itineraries.id = itinerary_id
      AND itineraries.created_by = auth.uid()
    )
  );

-- ============================================
-- 5. INDEX FOR PERFORMANCE
-- ============================================
CREATE INDEX IF NOT EXISTS idx_itinerary_participants_can_edit
  ON itinerary_participants(itinerary_id, user_id)
  WHERE can_edit = true;

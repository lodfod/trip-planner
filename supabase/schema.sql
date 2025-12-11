-- ============================================
-- JAPAN TRIP EXPENSE TRACKER - DATABASE SCHEMA
-- ============================================
-- Run this in your new Supabase project's SQL Editor
-- This creates all tables, triggers, RLS policies, and indexes

-- Enable UUID extension (usually already enabled)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- HELPER FUNCTION: Update timestamps
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 1. PROFILES TABLE
-- ============================================
-- Stores user profile info, auto-created on signup
CREATE TABLE profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  full_name text NOT NULL,
  display_name text,  -- User can edit this
  avatar_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- RLS Policies for profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Trigger to update updated_at
CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- TRIGGER: Auto-create profile on signup
-- ============================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- 2. EXCHANGE_RATES TABLE (for caching)
-- ============================================
-- Caches exchange rates from ExchangeRate-API
CREATE TABLE exchange_rates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  base_currency text NOT NULL DEFAULT 'USD',
  target_currency text NOT NULL,
  rate numeric(12, 6) NOT NULL,
  fetched_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(base_currency, target_currency)
);

-- RLS Policies for exchange_rates
ALTER TABLE exchange_rates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Exchange rates viewable by authenticated users"
  ON exchange_rates FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert/update exchange rates"
  ON exchange_rates FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update exchange rates"
  ON exchange_rates FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- ============================================
-- 3. EVENTS TABLE (Itinerary)
-- ============================================
-- Stores trip events/activities
CREATE TABLE events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  event_date date NOT NULL,
  event_time time,
  location text,
  address text,
  google_maps_url text,
  created_by uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- RLS Policies for events
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all events"
  ON events FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert events"
  ON events FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update their own events"
  ON events FOR UPDATE
  TO authenticated
  USING (auth.uid() = created_by)
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can delete their own events"
  ON events FOR DELETE
  TO authenticated
  USING (auth.uid() = created_by);

-- Trigger to update updated_at
CREATE TRIGGER events_updated_at
  BEFORE UPDATE ON events
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 4. EVENT_PARTICIPANTS TABLE
-- ============================================
-- Tracks who is attending which events
CREATE TYPE participation_status AS ENUM ('going', 'maybe', 'not_going');

CREATE TABLE event_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status participation_status NOT NULL DEFAULT 'maybe',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(event_id, user_id)
);

-- RLS Policies for event_participants
ALTER TABLE event_participants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all event participants"
  ON event_participants FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can manage their own participation"
  ON event_participants FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own participation"
  ON event_participants FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own participation"
  ON event_participants FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Trigger to update updated_at
CREATE TRIGGER event_participants_updated_at
  BEFORE UPDATE ON event_participants
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 5. EXPENSES TABLE
-- ============================================
-- Stores all expenses, amounts in USD (base currency)
CREATE TABLE expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  cost numeric(12, 2) NOT NULL,  -- Stored in USD (base currency)
  location text NOT NULL,
  category text NOT NULL,
  creator uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  receipt_url text,
  original_currency text NOT NULL DEFAULT 'JPY' CHECK (original_currency IN ('JPY', 'USD')),
  original_amount numeric(12, 2) NOT NULL,
  exchange_rate_used numeric(12, 6),  -- Rate used for conversion
  event_id uuid REFERENCES events(id) ON DELETE SET NULL,  -- Optional link to event
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- RLS Policies for expenses
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all expenses"
  ON expenses FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert expenses"
  ON expenses FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = creator);

CREATE POLICY "Users can update their own expenses"
  ON expenses FOR UPDATE
  TO authenticated
  USING (auth.uid() = creator)
  WITH CHECK (auth.uid() = creator);

CREATE POLICY "Users can delete their own expenses"
  ON expenses FOR DELETE
  TO authenticated
  USING (auth.uid() = creator);

-- Trigger to update updated_at
CREATE TRIGGER expenses_updated_at
  BEFORE UPDATE ON expenses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 6. PAYER_AMOUNTS TABLE
-- ============================================
-- Tracks how much each person owes for an expense
CREATE TABLE payer_amounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_id uuid NOT NULL REFERENCES expenses(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  amount numeric(12, 2) NOT NULL,  -- Stored in USD
  original_amount numeric(12, 2),  -- Amount in original currency
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(expense_id, user_id)
);

-- RLS Policies for payer_amounts
ALTER TABLE payer_amounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all payer amounts"
  ON payer_amounts FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert payer amounts for their expenses"
  ON payer_amounts FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM expenses
      WHERE expenses.id = expense_id
      AND expenses.creator = auth.uid()
    )
  );

CREATE POLICY "Users can update payer amounts for their expenses"
  ON payer_amounts FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM expenses
      WHERE expenses.id = expense_id
      AND expenses.creator = auth.uid()
    )
  );

CREATE POLICY "Users can delete payer amounts for their expenses"
  ON payer_amounts FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM expenses
      WHERE expenses.id = expense_id
      AND expenses.creator = auth.uid()
    )
  );

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================
CREATE INDEX idx_expenses_creator ON expenses(creator);
CREATE INDEX idx_expenses_created_at ON expenses(created_at DESC);
CREATE INDEX idx_expenses_event_id ON expenses(event_id);
CREATE INDEX idx_payer_amounts_expense_id ON payer_amounts(expense_id);
CREATE INDEX idx_payer_amounts_user_id ON payer_amounts(user_id);
CREATE INDEX idx_events_event_date ON events(event_date);
CREATE INDEX idx_events_created_by ON events(created_by);
CREATE INDEX idx_event_participants_event_id ON event_participants(event_id);
CREATE INDEX idx_event_participants_user_id ON event_participants(user_id);
CREATE INDEX idx_exchange_rates_currencies ON exchange_rates(base_currency, target_currency);

-- ============================================
-- STORAGE BUCKET SETUP
-- ============================================
-- Run this separately in the Supabase Dashboard or via API:
--
-- 1. Create bucket:
--    INSERT INTO storage.buckets (id, name, public) VALUES ('uploads', 'uploads', true);
--
-- 2. Storage policies (run in SQL editor after bucket is created):

-- Policy: Authenticated users can upload receipts
-- CREATE POLICY "Authenticated users can upload receipts"
--   ON storage.objects FOR INSERT TO authenticated
--   WITH CHECK (bucket_id = 'uploads');

-- Policy: Anyone can view uploads
-- CREATE POLICY "Anyone can view uploads"
--   ON storage.objects FOR SELECT TO authenticated
--   USING (bucket_id = 'uploads');

-- Policy: Users can delete their own uploads
-- CREATE POLICY "Users can delete uploads"
--   ON storage.objects FOR DELETE TO authenticated
--   USING (bucket_id = 'uploads');

-- ============================================
-- NOTES
-- ============================================
-- After running this schema:
-- 1. Enable Google OAuth in Supabase Dashboard > Authentication > Providers
-- 2. Create the 'uploads' storage bucket via Dashboard > Storage
-- 3. Add storage policies for the bucket
-- 4. Update your .env file with new VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY

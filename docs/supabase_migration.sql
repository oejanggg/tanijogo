-- SukaTani Supabase Migration
-- Run this in Supabase Dashboard → SQL Editor

-- 1. Profiles table (stores first_name, last_name, phone from signup)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  first_name TEXT,
  last_name TEXT,
  phone TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "Users view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);
CREATE POLICY IF NOT EXISTS "Users insert own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY IF NOT EXISTS "Users update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- 2. Add user_id column to farmer_ledger
ALTER TABLE farmer_ledger ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

-- 3. Add voice/audio columns to farmer_ledger
ALTER TABLE farmer_ledger ADD COLUMN IF NOT EXISTS voice_transcript TEXT;
ALTER TABLE farmer_ledger ADD COLUMN IF NOT EXISTS audio_url TEXT;

-- 4. Enable RLS on farmer_ledger (user-isolated data)
ALTER TABLE farmer_ledger ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "Users view own ledger" ON farmer_ledger
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY IF NOT EXISTS "Users insert own ledger" ON farmer_ledger
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY IF NOT EXISTS "Users update own ledger" ON farmer_ledger
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY IF NOT EXISTS "Users delete own ledger" ON farmer_ledger
  FOR DELETE USING (auth.uid() = user_id);

-- 5. Harvest records table (user-specific seasonal data)
CREATE TABLE IF NOT EXISTS harvest_records (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  yield_kg NUMERIC,
  sold_kg NUMERIC,
  price_per_kg NUMERIC,
  season_profit NUMERIC,
  is_profitable BOOLEAN,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE harvest_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "Users view own harvests" ON harvest_records
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY IF NOT EXISTS "Users insert own harvests" ON harvest_records
  FOR INSERT WITH CHECK (auth.uid() = user_id);

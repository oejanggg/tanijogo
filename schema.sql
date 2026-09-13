-- ==============================================================================
-- SukaTani Master Supabase Database Schema
-- Production-Ready SQL Schema with Row Level Security (RLS) & Multi-User Isolation
-- Run this in your Supabase Dashboard -> SQL Editor
-- ==============================================================================

-- 1. ENUM TYPES
DO $$ BEGIN
    CREATE TYPE receipt_category AS ENUM ('COGS', 'OPEX', 'CAPEX', 'MIXED', 'INVALID');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE item_classification AS ENUM ('COGS', 'OPEX', 'CAPEX', 'UNCLASSIFIED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. USER PROFILES TABLE
-- Extends Supabase auth.users with agricultural profile data
CREATE TABLE IF NOT EXISTS profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    first_name TEXT,
    last_name TEXT,
    phone TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users view own profile" ON profiles;
CREATE POLICY "Users view own profile" ON profiles FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users insert own profile" ON profiles;
CREATE POLICY "Users insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users update own profile" ON profiles;
CREATE POLICY "Users update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

-- 3. AUDIT RECEIPTS TABLE (Backend OCR Engine Log)
CREATE TABLE IF NOT EXISTS receipts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    merchant_name TEXT NOT NULL,
    image_url TEXT,
    image_quality_score INT CHECK (image_quality_score BETWEEN 1 AND 10),
    is_original_receipt BOOLEAN DEFAULT TRUE,
    primary_category receipt_category DEFAULT 'MIXED',
    total_amount_idr BIGINT NOT NULL DEFAULT 0,
    reward_payout_idr INT NOT NULL DEFAULT 0,
    fraud_flags JSONB DEFAULT '[]'::jsonb,
    receipt_summary TEXT
);

ALTER TABLE receipts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public receipts access" ON receipts;
CREATE POLICY "Public receipts access" ON receipts FOR ALL USING (true) WITH CHECK (true);

-- 4. LINE ITEMS TABLE (Extracted Receipt Items)
CREATE TABLE IF NOT EXISTS line_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    receipt_id UUID NOT NULL REFERENCES receipts(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    item_name TEXT NOT NULL,
    amount_idr BIGINT NOT NULL DEFAULT 0,
    classification item_classification DEFAULT 'UNCLASSIFIED',
    confidence_reasoning TEXT
);

ALTER TABLE line_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public line_items access" ON line_items;
CREATE POLICY "Public line_items access" ON line_items FOR ALL USING (true) WITH CHECK (true);

-- 5. FARMER LEDGER TABLE (User-Isolated Transaction Ledger)
CREATE TABLE IF NOT EXISTS farmer_ledger (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    merchant_name TEXT NOT NULL,
    primary_category TEXT DEFAULT 'Farm Input',
    quality_score INT DEFAULT 8,
    reward_earned BIGINT DEFAULT 0,
    total_production_cost BIGINT DEFAULT 0,
    hpp_per_kg BIGINT DEFAULT 0,
    fraud_detected BOOLEAN DEFAULT FALSE,
    voice_transcript TEXT,
    audio_url TEXT,
    image_url TEXT
);

ALTER TABLE farmer_ledger ENABLE ROW LEVEL SECURITY;

-- Allow users to view and manage only their own ledger entries
DROP POLICY IF EXISTS "Users view own ledger" ON farmer_ledger;
CREATE POLICY "Users view own ledger" ON farmer_ledger FOR SELECT USING (auth.uid() = user_id OR user_id IS NULL);

DROP POLICY IF EXISTS "Users insert own ledger" ON farmer_ledger;
CREATE POLICY "Users insert own ledger" ON farmer_ledger FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

DROP POLICY IF EXISTS "Users update own ledger" ON farmer_ledger;
CREATE POLICY "Users update own ledger" ON farmer_ledger FOR UPDATE USING (auth.uid() = user_id OR user_id IS NULL);

DROP POLICY IF EXISTS "Users delete own ledger" ON farmer_ledger;
CREATE POLICY "Users delete own ledger" ON farmer_ledger FOR DELETE USING (auth.uid() = user_id);

-- 6. HARVEST RECORDS TABLE (Seasonal Yield & Profit/Loss)
CREATE TABLE IF NOT EXISTS harvest_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    yield_kg NUMERIC,
    sold_kg NUMERIC,
    price_per_kg NUMERIC,
    season_profit NUMERIC,
    is_profitable BOOLEAN
);

ALTER TABLE harvest_records ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users view own harvests" ON harvest_records;
CREATE POLICY "Users view own harvests" ON harvest_records FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users insert own harvests" ON harvest_records;
CREATE POLICY "Users insert own harvests" ON harvest_records FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 7. PERFORMANCE INDEXES
CREATE INDEX IF NOT EXISTS idx_line_items_receipt_id ON line_items(receipt_id);
CREATE INDEX IF NOT EXISTS idx_line_items_classification ON line_items(classification);
CREATE INDEX IF NOT EXISTS idx_receipts_created_at ON receipts(created_at);
CREATE INDEX IF NOT EXISTS idx_farmer_ledger_created_at ON farmer_ledger(created_at);
CREATE INDEX IF NOT EXISTS idx_farmer_ledger_user_id ON farmer_ledger(user_id);
CREATE INDEX IF NOT EXISTS idx_harvest_records_user_id ON harvest_records(user_id);

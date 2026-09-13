-- SukaTani Supabase Database Schema
-- Run this in your Supabase SQL Editor

-- 1. Create Enum Types
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

-- 2. Create Receipts Table
CREATE TABLE IF NOT EXISTS receipts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
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

-- 3. Create Line Items Table
CREATE TABLE IF NOT EXISTS line_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    receipt_id UUID NOT NULL REFERENCES receipts(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    item_name TEXT NOT NULL,
    amount_idr BIGINT NOT NULL DEFAULT 0,
    classification item_classification DEFAULT 'UNCLASSIFIED',
    confidence_reasoning TEXT
);

-- 4. Create Farmer Ledger Table (Frontend UI Transaction Log)
CREATE TABLE IF NOT EXISTS farmer_ledger (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    merchant_name TEXT NOT NULL,
    primary_category TEXT DEFAULT 'MIXED',
    quality_score INT DEFAULT 8,
    reward_earned BIGINT DEFAULT 0,
    total_production_cost BIGINT DEFAULT 0,
    hpp_per_kg BIGINT DEFAULT 0,
    fraud_detected BOOLEAN DEFAULT FALSE
);

-- 5. Indexes for Fast Analytics Queries
CREATE INDEX IF NOT EXISTS idx_line_items_receipt_id ON line_items(receipt_id);
CREATE INDEX IF NOT EXISTS idx_line_items_classification ON line_items(classification);
CREATE INDEX IF NOT EXISTS idx_receipts_created_at ON receipts(created_at);
CREATE INDEX IF NOT EXISTS idx_farmer_ledger_created_at ON farmer_ledger(created_at);

-- 6. Enable Row Level Security (RLS) & Grant Access to Anon / Service Keys
ALTER TABLE receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE line_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE farmer_ledger ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public receipts access" ON receipts;
CREATE POLICY "Public receipts access" ON receipts FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public line_items access" ON line_items;
CREATE POLICY "Public line_items access" ON line_items FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public farmer_ledger access" ON farmer_ledger;
CREATE POLICY "Public farmer_ledger access" ON farmer_ledger FOR ALL USING (true) WITH CHECK (true);

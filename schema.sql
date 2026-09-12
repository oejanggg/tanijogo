-- SukaTani Supabase Database Schema
-- Run this in your Supabase SQL Editor

-- 1. Create Enum Types
CREATE TYPE receipt_category AS ENUM ('COGS', 'OPEX', 'CAPEX', 'MIXED', 'INVALID');
CREATE TYPE item_classification AS ENUM ('COGS', 'OPEX', 'CAPEX', 'UNCLASSIFIED');

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

-- 4. Indexes for Fast Analytics Queries
CREATE INDEX IF NOT EXISTS idx_line_items_receipt_id ON line_items(receipt_id);
CREATE INDEX IF NOT EXISTS idx_line_items_classification ON line_items(classification);
CREATE INDEX IF NOT EXISTS idx_receipts_created_at ON receipts(created_at);

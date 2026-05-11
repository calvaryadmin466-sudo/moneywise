-- Upgrade schema with WealthGuide features

-- Enhanced Asset Types enum (stored as text)
-- Asset types: cash, bank_account, mobile_money, stocks, bonds, real_estate, vehicle, jewelry, business, livestock, land, other

-- Add new columns to user_assets table
ALTER TABLE user_assets 
ADD COLUMN IF NOT EXISTS asset_type TEXT DEFAULT 'cash',
ADD COLUMN IF NOT EXISTS purchase_value DECIMAL(12,2),
ADD COLUMN IF NOT EXISTS icon_name TEXT,
ADD COLUMN IF NOT EXISTS color_hex TEXT;

-- Create index on asset_type
CREATE INDEX IF NOT EXISTS idx_user_assets_type ON user_assets(asset_type);

-- Enhanced Savings Goals table
CREATE TABLE IF NOT EXISTS savings_goals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    target_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
    current_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
    deadline DATE,
    icon_name TEXT DEFAULT 'target',
    color_hex TEXT DEFAULT '#d4a843',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on savings_goals
ALTER TABLE savings_goals ENABLE ROW LEVEL SECURITY;

-- RLS policies for savings_goals
CREATE POLICY "Users can view own savings goals"
    ON savings_goals FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "Users can create own savings goals"
    ON savings_goals FOR INSERT
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own savings goals"
    ON savings_goals FOR UPDATE
    USING (user_id = auth.uid());

CREATE POLICY "Users can delete own savings goals"
    ON savings_goals FOR DELETE
    USING (user_id = auth.uid());

-- Add icon and color to transactions
ALTER TABLE transactions
ADD COLUMN IF NOT EXISTS icon_name TEXT,
ADD COLUMN IF NOT EXISTS color_hex TEXT,
ADD COLUMN IF NOT EXISTS expense_category TEXT,
ADD COLUMN IF NOT EXISTS revenue_category TEXT;

-- Create index for category filtering
CREATE INDEX IF NOT EXISTS idx_transactions_expense_category ON transactions(expense_category);
CREATE INDEX IF NOT EXISTS idx_transactions_revenue_category ON transactions(revenue_category);

-- Update trigger for savings_goals
CREATE OR REPLACE FUNCTION update_savings_goals_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_savings_goals_updated_at
    BEFORE UPDATE ON savings_goals
    FOR EACH ROW
    EXECUTE FUNCTION update_savings_goals_updated_at();

-- Add country preference to user_profiles
ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS country_code TEXT DEFAULT 'TZ';

-- Create financial_tips table for user-specific tips
CREATE TABLE IF NOT EXISTS user_financial_tips (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    category TEXT NOT NULL,
    priority TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE user_financial_tips ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own financial tips"
    ON user_financial_tips FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "Users can update own financial tips"
    ON user_financial_tips FOR UPDATE
    USING (user_id = auth.uid());

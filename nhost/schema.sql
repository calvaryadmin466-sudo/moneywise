-- Nhost Database Schema (Hasura)
-- Run this in your Nhost SQL Editor

-- Create transactions table
CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  amount NUMERIC NOT NULL,
  category TEXT NOT NULL,
  date DATE NOT NULL,
  note TEXT,
  is_recurring BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create budgets table
CREATE TABLE IF NOT EXISTS budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  category TEXT NOT NULL,
  monthly_limit NUMERIC NOT NULL,
  month TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create goals table
CREATE TABLE IF NOT EXISTS goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  target_amount NUMERIC NOT NULL,
  saved_amount NUMERIC DEFAULT 0,
  deadline DATE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create debts table
CREATE TABLE IF NOT EXISTS debts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  direction TEXT NOT NULL CHECK (direction IN ('i_owe', 'they_owe')),
  is_paid BOOLEAN DEFAULT false,
  due_date DATE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE debts ENABLE ROW LEVEL SECURITY;

-- RLS Policies using Hasura session variables
-- In Nhost, user ID comes from the JWT claims: x-hasura-user-id

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can only see own transactions" ON transactions;
DROP POLICY IF EXISTS "Users can only see own budgets" ON budgets;
DROP POLICY IF EXISTS "Users can only see own goals" ON goals;
DROP POLICY IF EXISTS "Users can only see own debts" ON debts;

CREATE POLICY "Users can only see own transactions" ON transactions 
  FOR ALL USING (user_id::text = current_setting('hasura.user.id', true));

CREATE POLICY "Users can only see own budgets" ON budgets 
  FOR ALL USING (user_id::text = current_setting('hasura.user.id', true));

CREATE POLICY "Users can only see own goals" ON goals 
  FOR ALL USING (user_id::text = current_setting('hasura.user.id', true));

CREATE POLICY "Users can only see own debts" ON debts 
  FOR ALL USING (user_id::text = current_setting('hasura.user.id', true));

-- Create user_profiles table for extended user info
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  display_name TEXT,
  avatar_url TEXT,
  currency_preference TEXT DEFAULT 'TZS',
  country TEXT DEFAULT 'TZ',
  phone TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  last_seen_at TIMESTAMPTZ DEFAULT now()
);

-- Create user_activity table for tracking user actions
CREATE TABLE IF NOT EXISTS user_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action TEXT NOT NULL, -- 'login', 'transaction_added', 'budget_created', etc.
  entity_type TEXT, -- 'transaction', 'budget', 'goal', 'debt'
  entity_id UUID, -- reference to the affected entity
  metadata JSONB, -- additional data about the action
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on new tables
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_activity ENABLE ROW LEVEL SECURITY;

-- Drop existing policies for user tables
DROP POLICY IF EXISTS "Users can only see own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can only see own activity" ON user_activity;

-- RLS Policies for user_profiles
CREATE POLICY "Users can only see own profile" ON user_profiles 
  FOR ALL USING (id::text = current_setting('hasura.user.id', true));

-- RLS Policies for user_activity
CREATE POLICY "Users can only see own activity" ON user_activity 
  FOR ALL USING (user_id::text = current_setting('hasura.user.id', true));

-- User Assets table (cash, bank, mobile money, stocks)
CREATE TABLE IF NOT EXISTS user_assets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('cash', 'bank', 'mobile_money', 'stocks', 'other')),
  name TEXT NOT NULL,
  balance NUMERIC(15, 2) DEFAULT 0,
  currency TEXT DEFAULT 'TZS',
  account_number TEXT,
  bank_name TEXT,
  broker_name TEXT,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on assets
ALTER TABLE user_assets ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_assets
DROP POLICY IF EXISTS "Users can only see own assets" ON user_assets;
CREATE POLICY "Users can only see own assets" ON user_assets 
  FOR ALL USING (user_id::text = current_setting('hasura.user.id', true));

-- Create function to update last_seen_at
CREATE OR REPLACE FUNCTION update_user_last_seen()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE user_profiles 
  SET last_seen_at = now() 
  WHERE id::text = current_setting('hasura.user.id', true);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update last_seen on activity
DROP TRIGGER IF EXISTS update_last_seen_trigger ON user_activity;
CREATE TRIGGER update_last_seen_trigger
  AFTER INSERT ON user_activity
  FOR EACH ROW
  EXECUTE FUNCTION update_user_last_seen();

-- Grant permissions for user_assets mutations
GRANT ALL ON user_assets TO public;

-- Enable mutations for user_assets in Hasura
COMMENT ON TABLE user_assets IS 'user_assets';

-- Create function for inserting assets (bypasses Hasura mutation issues)
CREATE OR REPLACE FUNCTION insert_user_asset(
  p_user_id UUID,
  p_type TEXT,
  p_name TEXT,
  p_balance NUMERIC,
  p_currency TEXT,
  p_account_number TEXT DEFAULT NULL,
  p_bank_name TEXT DEFAULT NULL,
  p_broker_name TEXT DEFAULT NULL,
  p_description TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO user_assets (
    user_id, type, name, balance, currency,
    account_number, bank_name, broker_name, description
  ) VALUES (
    p_user_id, p_type, p_name, p_balance, p_currency,
    p_account_number, p_bank_name, p_broker_name, p_description
  )
  RETURNING id INTO v_id;
  
  RETURN v_id;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION insert_user_asset TO public;

-- Create function for updating assets
CREATE OR REPLACE FUNCTION update_user_asset(
  p_id UUID,
  p_user_id UUID,
  p_type TEXT DEFAULT NULL,
  p_name TEXT DEFAULT NULL,
  p_balance NUMERIC DEFAULT NULL,
  p_currency TEXT DEFAULT NULL,
  p_account_number TEXT DEFAULT NULL,
  p_bank_name TEXT DEFAULT NULL,
  p_broker_name TEXT DEFAULT NULL,
  p_description TEXT DEFAULT NULL
) RETURNS BOOLEAN AS $$
BEGIN
  UPDATE user_assets SET
    type = COALESCE(p_type, type),
    name = COALESCE(p_name, name),
    balance = COALESCE(p_balance, balance),
    currency = COALESCE(p_currency, currency),
    account_number = COALESCE(p_account_number, account_number),
    bank_name = COALESCE(p_bank_name, bank_name),
    broker_name = COALESCE(p_broker_name, broker_name),
    description = COALESCE(p_description, description),
    updated_at = NOW()
  WHERE id = p_id AND user_id = p_user_id;
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- Create function for deleting assets
CREATE OR REPLACE FUNCTION delete_user_asset(
  p_id UUID,
  p_user_id UUID
) RETURNS BOOLEAN AS $$
BEGIN
  DELETE FROM user_assets WHERE id = p_id AND user_id = p_user_id;
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION update_user_asset TO public;
GRANT EXECUTE ON FUNCTION delete_user_asset TO public;

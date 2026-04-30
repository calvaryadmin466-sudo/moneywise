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
CREATE TRIGGER update_last_seen_trigger
  AFTER INSERT ON user_activity
  FOR EACH ROW
  EXECUTE FUNCTION update_user_last_seen();

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

CREATE POLICY "Users can only see own transactions" ON transactions 
  FOR ALL USING (user_id::text = current_setting('hasura.user.id', true));

CREATE POLICY "Users can only see own budgets" ON budgets 
  FOR ALL USING (user_id::text = current_setting('hasura.user.id', true));

CREATE POLICY "Users can only see own goals" ON goals 
  FOR ALL USING (user_id::text = current_setting('hasura.user.id', true));

CREATE POLICY "Users can only see own debts" ON debts 
  FOR ALL USING (user_id::text = current_setting('hasura.user.id', true));

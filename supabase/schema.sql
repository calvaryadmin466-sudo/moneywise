               -- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Transactions table
CREATE TABLE IF NOT EXISTS transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users ON DELETE CASCADE,
  type text CHECK (type IN ('income', 'expense')),
  amount numeric NOT NULL,
  category text NOT NULL,
  note text,
  date date NOT NULL,
  is_recurring boolean DEFAULT false,
  created_at timestamp DEFAULT now()
);

-- Budgets table
CREATE TABLE IF NOT EXISTS budgets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users ON DELETE CASCADE,
  category text NOT NULL,
  monthly_limit numeric NOT NULL,
  month text NOT NULL,
  created_at timestamp DEFAULT now()
);

-- Goals table
CREATE TABLE IF NOT EXISTS goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users ON DELETE CASCADE,
  name text NOT NULL,
  target_amount numeric NOT NULL,
  saved_amount numeric DEFAULT 0,
  deadline date,
  created_at timestamp DEFAULT now()
);

-- Debts table
CREATE TABLE IF NOT EXISTS debts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users ON DELETE CASCADE,
  name text NOT NULL,
  amount numeric NOT NULL,
  direction text CHECK (direction IN ('i_owe', 'they_owe')),
  due_date date,
  is_paid boolean DEFAULT false,
  created_at timestamp DEFAULT now()
);

-- Enable Row Level Security on all tables
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE debts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for transactions
DROP POLICY IF EXISTS "Users can only access their own transactions" ON transactions;
CREATE POLICY "Users can only access their own transactions" ON transactions
  FOR ALL USING (auth.uid() = user_id);

-- RLS Policies for budgets
DROP POLICY IF EXISTS "Users can only access their own budgets" ON budgets;
CREATE POLICY "Users can only access their own budgets" ON budgets
  FOR ALL USING (auth.uid() = user_id);

-- RLS Policies for goals
DROP POLICY IF EXISTS "Users can only access their own goals" ON goals;
CREATE POLICY "Users can only access their own goals" ON goals
  FOR ALL USING (auth.uid() = user_id);

-- RLS Policies for debts
DROP POLICY IF EXISTS "Users can only access their own debts" ON debts;
CREATE POLICY "Users can only access their own debts" ON debts
  FOR ALL USING (auth.uid() = user_id);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);
CREATE INDEX IF NOT EXISTS idx_budgets_user_id ON budgets(user_id);
CREATE INDEX IF NOT EXISTS idx_goals_user_id ON goals(user_id);
CREATE INDEX IF NOT EXISTS idx_debts_user_id ON debts(user_id);

-- Create function to set user_id on insert
CREATE OR REPLACE FUNCTION set_user_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.user_id IS NULL THEN
    NEW.user_id := auth.uid();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for transactions
DROP TRIGGER IF EXISTS set_user_id_transactions ON transactions;
CREATE TRIGGER set_user_id_transactions
  BEFORE INSERT ON transactions
  FOR EACH ROW EXECUTE FUNCTION set_user_id();

-- Trigger for budgets
DROP TRIGGER IF EXISTS set_user_id_budgets ON budgets;
CREATE TRIGGER set_user_id_budgets
  BEFORE INSERT ON budgets
  FOR EACH ROW EXECUTE FUNCTION set_user_id();

-- Trigger for goals
DROP TRIGGER IF EXISTS set_user_id_goals ON goals;
CREATE TRIGGER set_user_id_goals
  BEFORE INSERT ON goals
  FOR EACH ROW EXECUTE FUNCTION set_user_id();

-- Trigger for debts
DROP TRIGGER IF EXISTS set_user_id_debts ON debts;
CREATE TRIGGER set_user_id_debts
  BEFORE INSERT ON debts
  FOR EACH ROW EXECUTE FUNCTION set_user_id();

-- User profiles table for preferences
CREATE TABLE IF NOT EXISTS user_profiles (
  id uuid PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  currency text DEFAULT 'TZS',
  dark_mode boolean DEFAULT false,
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now()
);

-- Enable RLS on user_profiles
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Policy for users to access their own profile
DROP POLICY IF EXISTS "Users can only access their own profile" ON user_profiles;
CREATE POLICY "Users can only access their own profile" ON user_profiles
  FOR ALL USING (auth.uid() = id);

-- Create function to handle new user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_profiles (id, currency, dark_mode)
  VALUES (NEW.id, 'TZS', false);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new user creation
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

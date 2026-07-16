import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Auth utilities
export async function getUser() {
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

export async function getSession() {
  const { data: { session } } = await supabase.auth.getSession()
  return session
}

export async function signOut() {
  return await supabase.auth.signOut()
}

export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })
  return { user: data.user, session: data.session, error }
}

export async function signUp(email: string, password: string) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${window.location.origin}/dashboard`,
    }
  })
  return { user: data.user, session: data.session, error }
}

// Data fetching helpers
export async function getTransactions(userId: string) {
  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .eq('user_id', userId)
    .order('date', { ascending: false })
  return { data, error }
}

export async function getBudgets(userId: string) {
  const { data, error } = await supabase
    .from('budgets')
    .select('*')
    .eq('user_id', userId)
  return { data, error }
}

export async function getGoals(userId: string) {
  const { data, error } = await supabase
    .from('goals')
    .select('*')
    .eq('user_id', userId)
  return { data, error }
}

export async function getDebts(userId: string) {
  const { data, error } = await supabase
    .from('debts')
    .select('*')
    .eq('user_id', userId)
  return { data, error }
}

export async function getAssets(userId: string) {
  const { data, error } = await supabase
    .from('user_assets')
    .select('*')
    .eq('user_id', userId)
  return { data, error }
}

export async function getProfile(userId: string) {
  const { data, error } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', userId)
    .single()
  return { data, error }
}

export type Transaction = {
  id: string
  user_id: string
  type: 'income' | 'expense'
  amount: number
  category: string
  note: string | null
  date: string
  is_recurring: boolean
  created_at: string
}

export type Budget = {
  id: string
  user_id: string
  category: string
  monthly_limit: number
  month: string
  created_at: string
}

export type Goal = {
  id: string
  user_id: string
  name: string
  target_amount: number
  saved_amount: number
  deadline: string | null
  created_at: string
}

export type Debt = {
  id: string
  user_id: string
  name: string
  amount: number
  direction: 'i_owe' | 'they_owe'
  due_date: string | null
  is_paid: boolean
  created_at: string
}

export type Asset = {
  id: string
  user_id: string
  type: 'cash' | 'bank_account' | 'mobile_money' | 'stocks' | 'bonds' | 'real_estate' | 'vehicle' | 'jewelry' | 'business' | 'livestock' | 'land' | 'other'
  name: string
  balance: number
  currency: string
  account_number: string | null
  bank_name: string | null
  broker_name: string | null
  description: string | null
  created_at: string
  updated_at: string
}

export type UserProfile = {
  id: string
  email: string | null
  display_name: string | null
  avatar_url: string | null
  currency_preference: string
  country: string
  phone: string | null
  created_at: string
  updated_at: string
  last_seen: string
}

export type Currency = 'TZS' | 'USD' | 'KES'

export const CATEGORIES = [
  'Food',
  'Transport',
  'Rent',
  'Bills',
  'Health',
  'Personal',
  'Education',
  'Entertainment',
  'Investment',
  'Other'
] as const

export const CURRENCY_SYMBOLS: Record<Currency, string> = {
  TZS: 'TSh',
  USD: '$',
  KES: 'KSh'
}

export function formatCurrency(amount: number, currency: Currency = 'TZS'): string {
  const symbol = CURRENCY_SYMBOLS[currency]
  return `${symbol}${amount.toLocaleString()}`
}

// Shared finance domain types and pure calculation helpers.
// No Supabase/auth dependency here so this stays easy to unit test.

export type Currency =
  | 'TZS' | 'KES' | 'UGX' | 'RWF' | 'NGN' | 'ZAR'
  | 'USD' | 'GBP' | 'CAD' | 'AUD' | 'EUR'
  | 'INR' | 'JPY' | 'BRL' | 'MXN' | 'SGD' | 'AED' | 'CNY'

export const CURRENCY_SYMBOLS: Record<Currency, string> = {
  TZS: 'TSh',
  KES: 'KSh',
  UGX: 'USh',
  RWF: 'FRw',
  NGN: '₦',
  ZAR: 'R',
  USD: '$',
  GBP: '£',
  CAD: 'C$',
  AUD: 'A$',
  EUR: '€',
  INR: '₹',
  JPY: '¥',
  BRL: 'R$',
  MXN: '$',
  SGD: 'S$',
  AED: 'د.إ',
  CNY: '¥',
}

export function formatCurrency(amount: number, currency: Currency = 'TZS'): string {
  const symbol = CURRENCY_SYMBOLS[currency] || currency
  return `${symbol}${amount.toLocaleString()}`
}

export const CATEGORIES = [
  'Food', 'Transport', 'Housing', 'Utilities', 'Entertainment',
  'Shopping', 'Healthcare', 'Education', 'Personal', 'Other'
] as const

export type Category = typeof CATEGORIES[number]

export interface Transaction {
  id: string
  user_id: string
  type: 'income' | 'expense' | 'transfer'
  amount: number
  category: string
  date: string
  note: string | null
  is_recurring: boolean
  asset_id: string | null
  income_source: string | null
  linked_transfer_id?: string | null
  metadata?: { encrypted_fields?: string[]; [k: string]: unknown } | null
  created_at: string
}

export type BudgetPeriod = 'monthly' | 'weekly'

export interface Budget {
  id: string
  user_id: string
  category: string
  monthly_limit: number
  month: string
  period?: BudgetPeriod
  period_key?: string
  carry_forward?: boolean
  created_at: string
}

export interface Goal {
  id: string
  user_id: string
  name: string
  target_amount: number
  saved_amount: number
  deadline: string | null
  created_at: string
}

export interface Debt {
  id: string
  user_id: string
  name: string
  amount: number
  direction: 'i_owe' | 'they_owe'
  is_paid: boolean
  due_date: string | null
  created_at: string
}

export type AssetTypeValue =
  | 'cash' | 'bank_account' | 'credit_card' | 'mobile_money' | 'stocks' | 'bonds'
  | 'real_estate' | 'vehicle' | 'jewelry' | 'business' | 'livestock'
  | 'land' | 'other'

export interface Asset {
  id: string
  user_id: string
  type: AssetTypeValue
  name: string
  balance: number
  currency: string
  account_number: string | null
  bank_name: string | null
  broker_name: string | null
  credit_limit?: number | null
  statement_date?: string | null
  minimum_payment?: number | null
  description: string | null
  created_at: string
  updated_at: string
}

export interface UserProfile {
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

export interface FinancialPlanSummary {
  monthlyIncome: number
  monthlyExpenses: number
  monthlySurplus: number
  recommendedMonthlySavings: number
  suggestedBudgets: Record<string, number>
  priorityCategories: string[]
}

export function buildFinancialPlan(transactions: Transaction[], month: string): FinancialPlanSummary {
  const monthKey = month.slice(0, 7)
  const monthTransactions = transactions.filter(transaction => transaction.date.startsWith(monthKey) && transaction.type === 'expense')
  const monthIncome = transactions
    .filter(transaction => transaction.date.startsWith(monthKey) && transaction.type === 'income')
    .reduce((sum, transaction) => sum + Number(transaction.amount || 0), 0)

  const monthlyExpenses = monthTransactions.reduce((sum, transaction) => sum + Number(transaction.amount || 0), 0)
  const monthlySurplus = monthIncome - monthlyExpenses

  const monthBuckets = new Map<string, { income: number; expenses: Record<string, number> }>()

  transactions.forEach(transaction => {
    const bucket = transaction.date.slice(0, 7)
    if (!monthBuckets.has(bucket)) {
      monthBuckets.set(bucket, { income: 0, expenses: {} })
    }

    const bucketData = monthBuckets.get(bucket)!
    if (transaction.type === 'income') {
      bucketData.income += Number(transaction.amount || 0)
    } else {
      const category = transaction.category || 'Other'
      bucketData.expenses[category] = (bucketData.expenses[category] || 0) + Number(transaction.amount || 0)
    }
  })

  const recentMonths = Array.from(monthBuckets.keys()).sort().slice(-3)
  const categoryAverages: Record<string, number> = {}

  CATEGORIES.forEach(category => {
    const values = recentMonths
      .map(month => monthBuckets.get(month)?.expenses[category] || 0)
      .filter(value => value > 0)

    if (values.length > 0) {
      categoryAverages[category] = values.reduce((sum, value) => sum + value, 0) / values.length
    }
  })

  const essentialCategories = ['Housing', 'Utilities', 'Food', 'Healthcare', 'Education', 'Transport']
  const suggestedBudgets: Record<string, number> = {}

  Object.entries(categoryAverages).forEach(([category, average]) => {
    const buffer = essentialCategories.includes(category) ? 1.08 : 0.95
    const suggested = Math.max(average * buffer, average > 0 ? average * 0.9 : 0)
    suggestedBudgets[category] = suggested
  })

  const currentExpenseTotal = Object.values(monthTransactions.reduce((acc, transaction) => {
    const category = transaction.category || 'Other'
    acc[category] = (acc[category] || 0) + Number(transaction.amount || 0)
    return acc
  }, {} as Record<string, number>))
    .reduce((sum, value) => sum + value, 0)

  const budgetCap = Math.max(monthIncome * 0.7 - currentExpenseTotal, monthIncome * 0.2)
  const totalSuggested = Object.values(suggestedBudgets).reduce((sum, value) => sum + value, 0)

  if (totalSuggested > budgetCap && totalSuggested > 0) {
    const scale = budgetCap / totalSuggested
    Object.keys(suggestedBudgets).forEach(category => {
      suggestedBudgets[category] = Number((suggestedBudgets[category] * scale).toFixed(0))
    })
  }

  const priorityCategories = Object.entries(monthTransactions.reduce((acc, transaction) => {
    const category = transaction.category || 'Other'
    acc[category] = (acc[category] || 0) + Number(transaction.amount || 0)
    return acc
  }, {} as Record<string, number>))
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([category]) => category)

  return {
    monthlyIncome: monthIncome,
    monthlyExpenses,
    monthlySurplus,
    recommendedMonthlySavings: monthlySurplus > 0 ? Math.max(monthlySurplus * 0.3, monthIncome * 0.05) : Math.max(monthIncome * 0.02, 0),
    suggestedBudgets,
    priorityCategories,
  }
}

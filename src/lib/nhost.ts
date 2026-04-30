import { createClient } from '@nhost/nhost-js'

export const nhost = createClient({
  subdomain: process.env.NHOST_SUBDOMAIN || '',
  region: process.env.NHOST_REGION || '',
})

export async function gqlRequest<T = unknown>(query: string, variables?: Record<string, unknown>): Promise<{ data?: T; error?: string }> {
  try {
    const token = await nhost.auth.getAccessToken()
    const response = await fetch(process.env.NHOST_GRAPHQL_URL!, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : '',
      },
      body: JSON.stringify({ query, variables }),
    })
    const result = await response.json()
    if (result.errors) {
      return { error: result.errors[0].message }
    }
    return { data: result.data }
  } catch (err: unknown) {
    return { error: err instanceof Error ? err.message : 'Unknown error' }
  }
}

export async function signIn(email: string, password: string) {
  return nhost.auth.signIn({ email, password })
}

export async function signUp(email: string, password: string) {
  return nhost.auth.signUp({ email, password })
}

export async function signOut() {
  return nhost.auth.signOut()
}

export const formatCurrency = (amount: number, currency: string = 'TZS'): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

export type Currency = 'TZS' | 'USD' | 'EUR' | 'GBP' | 'KES' | 'UGX'

export const CATEGORIES = [
  'Food', 'Transport', 'Housing', 'Utilities', 'Entertainment',
  'Shopping', 'Healthcare', 'Education', 'Personal', 'Other'
] as const

export type Category = typeof CATEGORIES[number]

export interface Transaction {
  id: string
  user_id: string
  type: 'income' | 'expense'
  amount: number
  category: string
  date: string
  note: string | null
  is_recurring: boolean
  created_at: string
}

export interface Budget {
  id: string
  user_id: string
  category: string
  monthly_limit: number
  month: string
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

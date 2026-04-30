// Simple in-memory storage for session
let currentSession: { accessToken: string; user: { id: string; email: string } } | null = null

// Auth functions using direct fetch to Nhost Auth API
export async function signIn(email: string, password: string) {
  try {
    const response = await fetch(`${process.env.NHOST_AUTH_URL}/signin/email-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })
    
    const text = await response.text()
    let data
    try {
      data = JSON.parse(text)
    } catch {
      return { data: null, error: new Error('Invalid response from server') }
    }
    
    if (!response.ok) {
      return { data: null, error: new Error(data?.message || 'Sign in failed') }
    }
    
    if (data?.session) {
      currentSession = {
        accessToken: data.session.accessToken,
        user: data.session.user
      }
    }
    
    return { data, error: null }
  } catch (err: unknown) {
    return { data: null, error: err instanceof Error ? err : new Error('Sign in failed') }
  }
}

export async function signUp(email: string, password: string) {
  try {
    const response = await fetch(`${process.env.NHOST_AUTH_URL}/signup/email-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })
    
    const text = await response.text()
    let data
    try {
      data = JSON.parse(text)
    } catch {
      return { data: null, error: new Error('Invalid response from server') }
    }
    
    if (!response.ok) {
      return { data: null, error: new Error(data?.message || 'Sign up failed') }
    }
    
    return { data, error: null }
  } catch (err: unknown) {
    return { data: null, error: err instanceof Error ? err : new Error('Sign up failed') }
  }
}

export async function signOut() {
  currentSession = null
  return { error: null }
}

export async function getAccessToken(): Promise<string | null> {
  return currentSession?.accessToken || null
}

export async function getUser() {
  return currentSession?.user || null
}

export async function gqlRequest<T = unknown>(query: string, variables?: Record<string, unknown>): Promise<{ data?: T; error?: string }> {
  try {
    const token = await getAccessToken()
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

// Track user activity
export async function trackActivity(
  action: string,
  entityType?: string,
  entityId?: string,
  metadata?: Record<string, unknown>
) {
  const user = await getUser()
  if (!user) return

  await gqlRequest(
    `mutation($userId: uuid!, $action: String!, $entityType: String, $entityId: uuid, $metadata: jsonb) {
      insert_user_activity(objects: [{
        user_id: $userId,
        action: $action,
        entity_type: $entityType,
        entity_id: $entityId,
        metadata: $metadata
      }]) { affected_rows }
    }`,
    {
      userId: user.id,
      action,
      entityType: entityType || null,
      entityId: entityId || null,
      metadata: metadata || null
    }
  )
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

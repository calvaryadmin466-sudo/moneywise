// Simple in-memory storage for session
let currentSession: { accessToken: string; user: { id: string; email: string } } | null = null

// Hardcoded Nhost config (fallback if env vars not loaded)
const NHOST_CONFIG = {
  subdomain: 'wxtreqbjcljlcoobxoea',
  region: 'eu-central-1',
}

// Get base auth URL - use public env vars for browser
const getAuthUrl = () => {
  const subdomain = process.env.NEXT_PUBLIC_NHOST_SUBDOMAIN || NHOST_CONFIG.subdomain
  const region = process.env.NEXT_PUBLIC_NHOST_REGION || NHOST_CONFIG.region
  return `https://${subdomain}.auth.${region}.nhost.run`
}

// Auth functions using direct fetch to Nhost Auth API
export async function signIn(email: string, password: string) {
  try {
    const baseUrl = getAuthUrl()
    const url = `${baseUrl}/v1/signin/email-password`
    console.log('SignIn URL:', url)
    
    const response = await fetch(url, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({ email, password }),
    })
    
    const text = await response.text()
    console.log('SignIn status:', response.status)
    console.log('SignIn response:', text.substring(0, 500))
    
    let data
    try {
      data = JSON.parse(text)
    } catch {
      return { data: null, error: new Error(`Server error (${response.status}): ${text.substring(0, 100)}`) }
    }
    
    if (!response.ok) {
      return { data: null, error: new Error(data?.message || data?.error || `Sign in failed (${response.status})`) }
    }
    
    if (data?.session) {
      currentSession = {
        accessToken: data.session.accessToken,
        user: data.session.user
      }
    }
    
    return { data, error: null }
  } catch (err: unknown) {
    console.error('SignIn error:', err)
    return { data: null, error: err instanceof Error ? err : new Error('Sign in failed') }
  }
}

export async function signUp(email: string, password: string) {
  try {
    const baseUrl = getAuthUrl()
    const url = `${baseUrl}/v1/signup/email-password`
    console.log('SignUp URL:', url)
    
    const response = await fetch(url, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({ email, password }),
    })
    
    const text = await response.text()
    console.log('SignUp status:', response.status)
    console.log('SignUp response:', text.substring(0, 500))
    
    let data
    try {
      data = JSON.parse(text)
    } catch (e) {
      console.error('JSON parse error:', e)
      return { data: null, error: new Error(`Server error (${response.status}): ${text.substring(0, 100)}`) }
    }
    
    if (!response.ok) {
      return { data: null, error: new Error(data?.message || data?.error || `Sign up failed (${response.status})`) }
    }
    
    return { data, error: null }
  } catch (err: unknown) {
    console.error('SignUp error:', err)
    return { data: null, error: err instanceof Error ? err : new Error('Sign up failed') }
  }
}

export async function signOut() {
  currentSession = null
  return { error: null }
}

export async function resendVerificationEmail(email: string) {
  try {
    const baseUrl = getAuthUrl()
    const response = await fetch(`${baseUrl}/v1/user/email/send-verification-email`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({ email }),
    })
    
    const text = await response.text()
    let data
    try {
      data = JSON.parse(text)
    } catch {
      return { error: new Error('Failed to resend verification email') }
    }
    
    if (!response.ok) {
      return { error: new Error(data?.message || data?.error || 'Failed to resend verification') }
    }
    
    return { error: null }
  } catch (err: unknown) {
    return { error: err instanceof Error ? err : new Error('Failed to resend verification') }
  }
}

export async function getAccessToken(): Promise<string | null> {
  // Try to refresh session if needed
  if (!currentSession) {
    await refreshSession()
  }
  return currentSession?.accessToken || null
}

export async function getUser() {
  // Try to refresh session if needed
  if (!currentSession) {
    await refreshSession()
  }
  return currentSession?.user || null
}

async function refreshSession() {
  try {
    const baseUrl = getAuthUrl()
    const response = await fetch(`${baseUrl}/v1/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include'
    })
    
    if (response.ok) {
      const data = await response.json()
      if (data?.session) {
        currentSession = {
          accessToken: data.session.accessToken,
          user: data.session.user
        }
      }
    }
  } catch {
    // Silent fail - user is not logged in
  }
}

export async function gqlRequest<T = unknown>(query: string, variables?: Record<string, unknown>): Promise<{ data?: T; error?: string }> {
  try {
    const token = await getAccessToken()
    const graphqlUrl = process.env.NEXT_PUBLIC_NHOST_GRAPHQL_URL || 
      `https://${NHOST_CONFIG.subdomain}.graphql.${NHOST_CONFIG.region}.nhost.run/v1`
    const response = await fetch(graphqlUrl, {
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

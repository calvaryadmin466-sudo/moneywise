// Use localStorage for persistent session
const SESSION_KEY = 'nhost_session'

function getSession() {
  if (typeof window === 'undefined') return null
  try {
    const stored = localStorage.getItem(SESSION_KEY)
    if (stored) {
      return JSON.parse(stored) as { accessToken: string; user: { id: string; email: string } }
    }
  } catch {
    // ignore
  }
  return null
}

function setSession(session: { accessToken: string; user: { id: string; email: string } } | null) {
  if (typeof window === 'undefined') return
  try {
    if (session) {
      localStorage.setItem(SESSION_KEY, JSON.stringify(session))
    } else {
      localStorage.removeItem(SESSION_KEY)
    }
  } catch {
    // ignore
  }
}

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
      setSession({
        accessToken: data.session.accessToken,
        user: data.session.user
      })
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
  setSession(null)
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
  const session = getSession()
  return session?.accessToken || null
}

export async function getUser() {
  const session = getSession()
  return session?.user || null
}

// Note: Nhost token refresh requires cookies, which we're not using
// This function is kept for compatibility but session is now stored in localStorage
async function refreshSession() {
  // Session is loaded from localStorage in getSession()
  // No need for token refresh with this implementation
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

export interface Asset {
  id: string
  user_id: string
  type: 'cash' | 'bank' | 'mobile_money' | 'stocks' | 'real_estate' | 'other'
  name: string
  balance: number
  currency: string
  account_number?: string
  bank_name?: string
  broker_name?: string
  description?: string
  created_at: string
  updated_at: string
}

// Direct REST API insert for user_assets (bypasses Hasura GraphQL issues)
export async function insertAssetDirect(asset: Omit<Asset, 'id' | 'created_at' | 'updated_at'>): Promise<{ data?: Asset; error?: string }> {
  try {
    const token = await getAccessToken()
    const user = await getUser()
    if (!user) return { error: 'Not authenticated' }
    
    // Generate UUID for the asset
    const id = crypto.randomUUID()
    
    // Use direct database REST API
    const dbUrl = `https://${NHOST_CONFIG.subdomain}.db.${NHOST_CONFIG.region}.nhost.run/v1/graphql`
    
    const response = await fetch(dbUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'x-hasura-role': 'user'
      },
      body: JSON.stringify({
        query: `mutation {
          insert_user_assets(objects: [{
            id: "${id}",
            user_id: "${user.id}",
            type: "${asset.type}",
            name: "${asset.name}",
            balance: ${asset.balance},
            currency: "${asset.currency}",
            account_number: ${asset.account_number ? `"${asset.account_number}"` : null},
            bank_name: ${asset.bank_name ? `"${asset.bank_name}"` : null},
            broker_name: ${asset.broker_name ? `"${asset.broker_name}"` : null},
            description: ${asset.description ? `"${asset.description}"` : null}
          }]) {
            returning {
              id
              user_id
              type
              name
              balance
              currency
              account_number
              bank_name
              broker_name
              description
              created_at
              updated_at
            }
          }
        }`
      })
    })
    
    const result = await response.json()
    if (result.errors) {
      return { error: result.errors[0].message }
    }
    return { data: result.data?.insert_user_assets?.returning?.[0] }
  } catch (err: unknown) {
    return { error: err instanceof Error ? err.message : 'Failed to insert asset' }
  }
}

// Direct REST API for profile upsert (bypasses Hasura mutation issues)
export async function saveProfileDirect(profile: {
  id: string
  display_name?: string
  email?: string
  avatar_url?: string
  currency_preference?: string
  country?: string
  phone?: string
}): Promise<{ data?: any; error?: string }> {
  try {
    const token = await getAccessToken()
    if (!token) return { error: 'Not authenticated' }
    
    const dbUrl = `https://${NHOST_CONFIG.subdomain}.db.${NHOST_CONFIG.region}.nhost.run/v1/graphql`
    
    const response = await fetch(dbUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'x-hasura-role': 'user'
      },
      body: JSON.stringify({
        query: `mutation {
          insert_user_profiles(objects: [{
            id: "${profile.id}",
            display_name: "${profile.display_name || ''}",
            email: "${profile.email || ''}",
            avatar_url: "${profile.avatar_url || ''}",
            currency_preference: "${profile.currency_preference || 'TZS'}",
            country: "${profile.country || ''}",
            phone: "${profile.phone || ''}"
          }], on_conflict: { constraint: user_profiles_id_key, update_columns: [display_name, email, avatar_url, currency_preference, country, phone] }) {
            returning {
              id
              display_name
              email
              avatar_url
              currency_preference
              country
              phone
            }
          }
        }`
      })
    })
    
    const result = await response.json()
    if (result.errors) {
      return { error: result.errors[0].message }
    }
    return { data: result.data?.insert_user_profiles?.returning?.[0] }
  } catch (err: unknown) {
    return { error: err instanceof Error ? err.message : 'Failed to save profile' }
  }
}

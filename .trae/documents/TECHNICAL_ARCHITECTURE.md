# Technical Architecture Document
## MoneyWise: QUANTO-Style Expense Tracker

**Version:** 1.0  
**Date:** 2026-09-01  
**Supersedes:** Ad-hoc layout in existing codebase

---

## 1. Architecture Overview

### 1.1 Style: Monolithic Next.js App with Supabase Backend
MoneyWise is a **full-stack TypeScript monolith** deployed as a Next.js 15 application with:
- **Server Components**: App Router pages (`page.tsx`) + Supabase SSR client
- **Client Components**: `* -content.tsx` or `"use client"` modules for stateful UI
- **Database**: Supabase Postgres 15+ with Row Level Security (RLS)
- **Auth**: Supabase Auth (JWT, sessions, email/password)
- **AI**: Genkit + Google Gemini for advisor flows (optional, disabled without API key)
- **PWA**: Service worker + manifest.json for installable offline-capable shell

### 1.2 High-Level Diagram
```mermaid
flowchart TD
    subgraph "Client (Browser / PWA Shell)"
        A[Next.js SSR App Router] --> B[React 19 Client Layer]
        B --> C[shadcn/ui + Radix Components]
        B --> D[Chart.js / Recharts Viz Layer]
        B --> E[Web Crypto E2EE Module]
        B --> F[LocalStorage Cache + Push Notifications]
    end

    subgraph "Serverless Edge (Supabase)"
        G[Supabase Postgres + RLS]
        H[Supabase Auth JWT]
        I[Supabase Realtime Pub/Sub]
        J[Supabase Storage (avatars / exports)]
    end

    subgraph "AI Layer (Optional)"
        K[Genkit Framework] --> L[Google Gemini]
    end

    B -->|@supabase/supabase-js| G
    B -->|@supabase/ssr| H
    B -->|realtime channels| I
    B -->|fetch signed URL| J
    A -->|server-only| K
```

### 1.3 Core Principles
1. **General Ledger-Centric**: Every balance change flows through a `Transaction` row. Assets/Debts/Goals are *aggregates*, not primary sources of truth.
2. **Type-First**: All domain objects have explicit `interface`/`enum` definitions in `lib/types.ts` and `lib/finance.ts`. Any `any` usage must have an explicit `// eslint-disable-next-line` justification.
3. **Idempotent Migrations**: SQL migrations use `CREATE TABLE IF NOT EXISTS` and `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`. Data-loss operations (`DROP`, `ALTER TYPE`) require explicit user confirmation.
4. **Semantic Styling**: All colors use HSL CSS custom properties (`--primary`, `--chart-1`, etc.). No raw hex values in components.
5. **8px Grid**: All spacing multiples of 8 (`p-2`, `p-4`, `p-6`…). Component heights align to `h-11` (44px) baseline.

---

## 2. Project Structure

```
moneywise/
├── .trae/documents/              ← THIS directory (PRD + architecture)
├── supabase/
│   ├── migrations/               ← Idempotent SQL deltas (order: YYYYMMDD_*.sql)
│   └── schema_complete.sql       ← Reference DDL snapshot
├── public/
│   ├── manifest.json             ← PWA install manifest
│   └── service-worker.js         ← Offline shell + push
├── src/
│   ├── app/
│   │   ├── layout.tsx            ← Root: fonts, PWA provider, Toaster
│   │   ├── globals.css           ← Semantic HSL tokens, glass styles, scrollbar
│   │   ├── page.tsx              ← Marketing / landing (redirects to /dashboard)
│   │   ├── (auth)/
│   │   │   ├── layout.tsx        ← Centered auth card shell
│   │   │   ├── login/page.tsx
│   │   │   └── signup/page.tsx
│   │   └── (app)/
│   │       ├── layout.tsx        ← Sidebar + top nav + MobileNav + Sheets
│   │       ├── dashboard/        ← Overview (Cards + Charts + Alerts)
│   │       ├── transactions/     ← CRUD + search + filter
│   │       ├── budgets/          ← Monthly/weekly budgets + auto-plan
│   │       ├── goals/            ← Savings goals
│   │       ├── debts/            ← Debt ledger
│   │       ├── reports/          ← Analytics + CSV/PDF/XLSX export
│   │       ├── bills/            ← NEW: Recurring reminders
│   │       ├── assets/           ← Multi-account + transfers
│   │       ├── profile/
│   │       ├── settings/
│   │       └── data/             ← GDPR import/export/backup
│   ├── components/
│   │   ├── ui/                   ← shadcn/ui primitives (no app logic)
│   │   ├── dashboard/            ← Domain widgets (BudgetOverview etc.)
│   │   ├── reports/              ← Chart components
│   │   ├── bills/                ← NEW: Reminder widgets
│   │   ├── logo.tsx
│   │   ├── mobile-nav.tsx
│   │   ├── pwa-provider-simple.tsx
│   │   └── pwa-install-prompt.tsx
│   ├── hooks/                    ← use-mobile, use-pwa, use-toast
│   ├── lib/
│   │   ├── finance.ts            ← PURE: formatCurrency, buildFinancialPlan, CATEGORIES
│   │   ├── types.ts              ← ENUMs (AssetType, ExpenseCategory…) + domain interfaces
│   │   ├── schemas.ts            ← Zod schemas (transactionSchema, etc.)
│   │   ├── supabase.ts           ← Server + browser Supabase client factories
│   │   ├── supabase-browser.ts   ← Browser singleton
│   │   ├── crypto.ts             ← NEW: AES-GCM encrypt/decrypt + key derivation
│   │   ├── export.ts             ← NEW: CSV / PDF / XLSX renderers
│   │   ├── bills.ts              ← NEW: Recurrence engine (RRULE-lite)
│   │   ├── nhost.ts              ← Legacy adapter (soft-deprecated)
│   │   ├── stocks.ts
│   │   ├── country-data.ts
│   │   ├── utils.ts              ← clsx + tailwind-merge + cn()
│   │   └── data.ts               ← LEGACY placeholder (to be removed)
│   └── ai/                       ← Genkit flows (server-only)
├── tailwind.config.ts            ← Theme extends: HSL vars, 8px grid, font tokens
├── next.config.ts
├── tsconfig.json
└── package.json
```

---

## 3. Domain Model (PostgreSQL)

### 3.1 Core Tables

```mermaid
erDiagram
    AUTH_USERS {
        uuid id PK
        text email
        timestamptz created_at
    }

    USER_PROFILES {
        uuid id PK "FK -> auth.users.id"
        text full_name
        text avatar_url
        text currency_preference
        text country
        text phone
        text encryption_salt "for PBKDF2 key derivation"
        timestamptz last_seen
        timestamptz created_at
        timestamptz updated_at
    }

    TRANSACTIONS {
        uuid id PK
        uuid user_id FK
        text type "income|expense|transfer"
        numeric amount "decrypted value in app, stored as ciphertext blob if E2EE"
        text category
        date date
        text note "encrypted if E2EE enabled"
        boolean is_recurring
        uuid asset_id FK "nullable"
        uuid linked_transfer_id FK "for 2-legged transfers"
        text income_source
        jsonb metadata "encrypted_fields[] etc."
        timestamptz created_at
    }

    BUDGETS {
        uuid id PK
        uuid user_id FK
        text category
        numeric monthly_limit
        text period "monthly|weekly"
        text period_key "YYYY-MM or YYYY-Www"
        boolean carry_forward "rollover unused"
        timestamptz created_at
        UNIQUE "user_id + category + period_key"
    }

    GOALS {
        uuid id PK
        uuid user_id FK
        text name
        numeric target_amount
        numeric saved_amount
        date deadline
        text icon_name
        text color_hex
        timestamptz created_at
    }

    DEBTS {
        uuid id PK
        uuid user_id FK
        text name
        numeric amount
        text direction "i_owe|they_owe"
        boolean is_paid
        date due_date
        numeric interest_rate "optional APR %"
        timestamptz created_at
    }

    USER_ASSETS {
        uuid id PK
        uuid user_id FK
        text type "cash|bank_account|credit_card|mobile_money|..."
        text name
        numeric balance
        text currency
        text account_number "encrypted blob if E2EE"
        text bank_name
        text broker_name
        numeric credit_limit "for credit cards"
        date statement_date "for credit cards"
        numeric minimum_payment "for credit cards"
        text description
        timestamptz created_at
        timestamptz updated_at
    }

    BILL_REMINDERS {
        uuid id PK
        uuid user_id FK
        text title
        numeric amount
        date next_due_date
        text recurrence "once|daily|weekly|biweekly|monthly|quarterly|yearly"
        integer remind_days_before "default 3"
        boolean is_paid_last
        text category "optional link to CATEGORIES"
        uuid asset_id FK "optional pre-selected account"
        timestamptz snooze_until
        timestamptz last_notified_at
        timestamptz created_at
    }

    AUTH_USERS ||--o{ USER_PROFILES : owns
    AUTH_USERS ||--o{ TRANSACTIONS : owns
    AUTH_USERS ||--o{ BUDGETS : owns
    AUTH_USERS ||--o{ GOALS : owns
    AUTH_USERS ||--o{ DEBTS : owns
    AUTH_USERS ||--o{ USER_ASSETS : owns
    AUTH_USERS ||--o{ BILL_REMINDERS : owns
    TRANSACTIONS }o--o{ USER_ASSETS : "affects balance"
    TRANSACTIONS }o--|| TRANSACTIONS : "transfer pair"
```

### 3.2 Row Level Security (RLS) Policies
Every table has:
```sql
ALTER TABLE <table> ENABLE ROW LEVEL SECURITY;
CREATE POLICY "<table>_isolate_per_user" ON <table>
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
```

### 3.3 Migration Guarantees
- Every migration file begins with `BEGIN;` and ends with `COMMIT;`
- All `CREATE TABLE` use `IF NOT EXISTS`
- All schema mutations are additive (no destructive `ALTER COLUMN TYPE` without a backfill plan)
- Migration file naming: `YYYYMMDD_short_description.sql` (ascending sortable)

---

## 4. Frontend Component Architecture

### 4.1 Component Layering Rules

| Layer | Location | Allowed Dependencies | State |
|---|---|---|---|
| **Primitive** | `components/ui/*` | Radix, `cn()` from utils | Stateless, fully controlled |
| **Domain Widget** | `components/dashboard/*`, `components/bills/*` | Primitives, `lib/finance`, `lib/types` | Local state + Supabase hooks |
| **Page Content** | `app/(app)/*/*-content.tsx` | Domain widgets, URL search params | Fetches state, wires URLs |
| **App Shell** | `app/(app)/layout.tsx` | Sidebar, AddTransactionSheet, AI Advisor | Session user, global modals |

### 4.2 State Management Strategy
- **Server state**: Supabase realtime subscriptions → `useState` + `useEffect`. No Redux/TanStack Query (keep bundle small for PWA).
- **URL state**: `useSearchParams()` for filters (type, category, currency, month). Deep-linkable.
- **Local ephemeral**: Dialog open/close, form draft → local `useState`.
- **Secure cache**: `lib/crypto.ts` encrypted IndexedDB or E2EE-flagged `localStorage` keys with prefix `mw:enc:`.

### 4.3 Forms
- Library: `react-hook-form` + `zod` resolver (schema in `lib/schemas.ts`)
- Pattern: Reusable form components (see `transactions-content.tsx` → `TransactionForm`)
- Field heights: `h-11` (Inputs, SelectTriggers, Buttons)

### 4.4 Responsive Behavior
```tsx
// Sidebar: Desktop persistent (<Sidebar>), mobile drawer via <SidebarTrigger>
// Mobile nav: bottom 5-tab bar on < 768px
// Card grids:
//   < lg: 1 column stack
//   lg:   2 columns
//   xl:   3-5 columns (KPI cards)
```

---

## 5. Encryption & Security Subsystem

### 5.1 E2EE Design (NEW)
Module: `src/lib/crypto.ts`  
Algorithm: AES-GCM 256-bit, key derived via PBKDF2-HMAC-SHA256 (100,000 iters)

```
User Password ──► PBKDF2(salt=user_profile.encryption_salt) ──► 32-byte DEK
                                                            │
                                                            ├─► encrypt(amount)  ──► stored as base64 blob in metadata
                                                            ├─► encrypt(note)    ──► stored as base64 blob
                                                            └─► encrypt(account#) ──► stored as base64 blob
```

- **Opt-in flag**: `user_settings.e2ee_enabled` (default OFF for backwards compatibility)
- **Non-malleable**: Ciphertext prefixed with `v1:` version tag + 12-byte IV (generated per-value, not reused)
- **Search**: Category, type, date remain plaintext columns so filtering works. Only `amount`/`note`/`account_number` are encrypted.
- **Export**: "Download encrypted backup" → JSON bundle + sha256 checksum. Re-import prompts for password.

### 5.2 Other Security Measures
- CSP headers in `next.config.ts` (strict: `default-src 'self'`)
- No inline `<script>`; all 3rd-party scripts via `next/script` with `afterInteractive`
- CSRF: Supabase SDK handles same-origin; no cookie authz used directly
- XSS: React escaping + `sanitize` on any user-loaded HTML (tips, AI responses)

---

## 6. Reporting & Export Subsystem (NEW)

### 6.1 Module: `src/lib/export.ts`

| Format | Library | Content | Trigger |
|---|---|---|---|
| **CSV** | Native (Blob + URL) | Filtered transactions row-per-entry | Reports → "Export CSV" |
| **PDF** | jsPDF + autoTable | Income Statement, Balance Sheet, Category Breakdown, Month Trend Bar | Reports → "Export PDF" |
| **XLSX** | SheetJS (xlsx) | 3 sheets: Transactions, Summary, Category Pivot | Reports → "Export Excel" |
| **Print** | `@media print` CSS | Reports page → browser Ctrl+P | N/A |

### 6.2 Report Scheduling (NEW)
Client-side cron via PWA `setTimeout` + `navigator.serviceWorker.ready`.  
Server-assisted fallback: Supabase Edge Function (if user opts in, requires email verified).

---

## 7. Bill Reminder Subsystem (NEW)

### 7.1 Module: `src/lib/bills.ts`
Recurrence engine — computes `next_due_date` from rules:
```typescript
type Recurrence = 'once' | 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'yearly';
export function computeNextDue(current: Date, rule: Recurrence): Date;
```

### 7.2 Notification Paths
1. **In-app bell** — Top-nav counter, dashboard "Upcoming Bills" card (next 7 days)
2. **PWA push** — Service worker `showNotification()` 3 days before + day of
3. **Email** — Optional via Supabase Edge Function (email template + Resend)

### 7.3 Actions on Reminder
- Mark paid → auto-creates Transaction row (pre-filled amount/category/asset)
- Skip once → advances recurrence without transaction
- Snooze → hides for 24h

---

## 8. Build & Deploy

### 8.1 Scripts
```json
{
  "dev":     "next dev --turbopack -p 9002",
  "build":   "next build",
  "start":   "next start",
  "lint":    "next lint",
  "typecheck": "tsc --noEmit"
}
```

### 8.2 CI Gates (pre-deploy hooks)
1. `typecheck` must exit 0
2. `lint` must exit 0 (warnings fail build)
3. Build output must be < 300KB initial JS for landing route

### 8.3 Target Deployment: Vercel
- Environment Variables: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `GOOGLE_GENAI_API_KEY` (optional)
- Region: Closest to user base (default: AWS us-east-1; for African markets: eu-west-1)
- PWA: Vercel Edge Cache for `service-worker.js` + `manifest.json` with `Cache-Control: no-cache`

---

## 9. Testing & Validation Strategy

| Layer | Tool | Cadence |
|---|---|---|
| **Type safety** | `tsc --noEmit` | Every change, before commit |
| **Linting** | ESLint (Next.js preset) | Every change |
| **Unit (pure fn)** | Vitest (added if missing) | `buildFinancialPlan`, `formatCurrency`, crypto |
| **Visual regression** | Playwright screenshots (optional) | Release candidate only |
| **Accessibility** | axe-core DevTools | M4 validation pass |
| **Cross-browser** | Manual matrix (Chrome, Safari, Firefox) | M4 validation pass |
| **Device** | iOS Safari (PWA) + Android Chrome | M4 validation pass |

---

## 10. Risks & Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| E2EE user loses password | HIGH — data unrecoverable | Mandatory backup download on first enable; recovery-key generation |
| Supabase outage | HIGH — app offline | PWA service worker caches last-good read; offline mode banner |
| Large transaction dataset (>10k rows) slow list render | MEDIUM | Virtualize list + server pagination `range()` |
| Bundle size creep (>300KB) | MEDIUM — slow PWA install | Route-level code-splitting; lazy-load PDF/XLSX libs only on export |
| Safari crypto API quirks | LOW — E2EE failures | Feature detection + graceful "E2EE not supported on this browser" banner |

---

## 11. Open Questions for User Review

1. **E2EE Default**: Should E2EE be default-ON for new users? (Current plan: default-OFF to preserve search-ability on amounts.)
2. **PDF library**: jsPDF + autoTable adds ~180KB. Acceptable, or prefer server-rendered PDF via Edge Function?
3. **Email reminders**: Requires email provider (Resend/SMTP credentials). Will user provide, or keep in-app + PWA push only?
4. **Credit card subtype**: Treat as a negative-balance Asset, or introduce a first-class `Liabilities` table mirroring `USER_ASSETS`?

Approved changes to this document should be appended as change-log entries at the bottom, not overwritten.

# Product Requirements Document (PRD)
## MoneyWise: QUANTO-Style Expense Tracker Application

**Version:** 1.0  
**Date:** 2026-09-01  
**Status:** Draft for Review

---

## 1. Executive Summary

MoneyWise is a production-grade personal finance management application designed in the visual language of a QUANTO-style expense tracker. Built on an existing Next.js 15 + Supabase foundation, the application delivers a complete financial management suite with ERP-grade data density, professional glass-morphism dark aesthetics, and full-featured transaction lifecycle support.

This PRD formalizes the complete feature set required to achieve full parity with enterprise expense tracking platforms, including multi-account management, bill reminders, data encryption, and comprehensive reporting exports.

---

## 2. Product Vision & Goals

### 2.1 Vision
To provide users with a **general ledger-centric** financial control center that combines the depth of an ERP system (SAP/NetSuite/Odoo) with the accessibility of a modern mobile-first PWA.

### 2.2 Strategic Goals
| Goal | Metric | Target |
|---|---|---|
| Feature Completeness | % of QUANTO features implemented | 100% |
| Design Fidelity | Visual match to QUANTO aesthetic | Exact parity |
| Data Security | Client-side encryption of sensitive fields | E2EE for amounts, notes |
| Cross-device | Responsive breakpoints working | Mobile / Tablet / Desktop |
| Accessibility | WCAG AA compliance | Passes axe-core tests |

### 2.3 Non-Goals
- Bank account open-banking sync (deferred to v2)
- Multi-user family sharing (deferred to v2)
- Cryptocurrency tracking (outside scope)

---

## 3. User Personas

| Persona | Role | Pain Points |
|---|---|---|
| **Amina K.** | Small business owner, Tanzania | Needs multi-currency (TZS/USD), asset tracking, reports for accountant |
| **David O.** | Freelance developer, Nigeria | Income tracking, categorization for tax filing, export for invoices |
| **Sarah M.** | Budget-conscious professional, Kenya | Weekly budgeting, bill reminders, spending alerts on mobile |
| **Kwame B.** | Investor, South Africa | Net-worth tracking, goal-based savings, multi-asset portfolio view |

---

## 4. Core Feature Set (Full QUANTO Parity)

### 4.1 Expense Logging & Category Tagging
- ✅ **Transaction CRUD**: Add / edit / delete income and expense entries
- ✅ **Category System**: 11 expense + 8 revenue categories with icons/colors
- ✅ **Recurring Transactions**: Flag and display recurring items
- ✅ **Asset Linking**: Transactions optionally update asset balances
- ✅ **Income Source Tracking**: Personal Business / Work / Projects / Farming / Other
- ✅ **Quick Entry**: Daily check-in dialog for fast expense logging

### 4.2 Income Tracking
- ✅ Revenue category separation
- ✅ Month-over-month income comparison with % change
- ✅ Income source analytics in Reports page
- ⚠️ **Enhancement**: Income trend sparklines and forecast estimates

### 4.3 Budget Setting (Monthly + Weekly)
- ✅ Monthly category budgets with visual progress bars
- ✅ Auto-plan budgets based on 3-month category averages (70% cap rule)
- ✅ Budget grading system (A–F) based on over-budget ratio
- ✅ Smart alerts at 75% / 90% / 100% thresholds
- ❌ **NEW**: Weekly budget period support (in addition to monthly)
- ❌ **NEW**: Budget carry-forward rules (rollover unused portion)

### 4.4 Spending Analytics & Visual Charts
- ✅ Category-wise doughnut chart with % breakdown and center total
- ✅ 6-month income vs expense bar trend
- ✅ Spending insights: weekend vs weekday comparison, top category, daily avg
- ✅ Smart alerts (budget warnings, 20% spending increase detection)
- ✅ Net-worth card with progress indicator
- ⚠️ **Enhancement**: Weekly spending heatmap calendar view

### 4.5 Transaction History: Search & Filtering
- ✅ Full-text search across category + notes
- ✅ Type filter (All / Income / Expense)
- ✅ Category filter
- ✅ Date field input (partially wired)
- ❌ **NEW**: Date-range picker with preset chips (This week, Last 30 days, QTD, YTD)
- ❌ **NEW**: Amount range min/max sliders
- ❌ **NEW**: Recurring-only and asset-linked-only toggles

### 4.6 Multi-Account Support
- ✅ 12 Asset types: Cash, Bank Account, Mobile Money, Stocks, Bonds, Real Estate, Vehicle, Jewelry, Business, Livestock, Land, Other
- ✅ Balance auto-updating via linked transactions
- ❌ **NEW**: Dedicated "Accounts" sidebar section (prominent from assets)
- ❌ **NEW**: Account-to-account transfers (2-legged transactions)
- ❌ **NEW**: Credit card liability tracking with statement dates and minimum payment

### 4.7 Bill Reminder Notifications
- ❌ **NEW**: Full bill reminder system
  - Recurrence: Daily / Weekly / Bi-weekly / Monthly / Quarterly / Yearly
  - In-app bell with badge count
  - PWA push notification support
  - Snooze / Mark paid / Skip once actions
  - Upcoming bills widget on dashboard

### 4.8 Export Functionality for Financial Reports
- ✅ CSV export of filtered transactions
- ❌ **NEW**: PDF financial statement export (Income Statement, Balance Sheet, Cash Flow)
- ❌ **NEW**: Excel (.xlsx) export with formatted sheets
- ❌ **NEW**: Report email scheduling (monthly PDF auto-dispatch)
- ❌ **NEW**: Print-optimized CSS for browser print-to-PDF

### 4.9 Authentication & Security
- ✅ Supabase Email/Password auth with session management
- ✅ Row Level Security (RLS) on all database tables
- ✅ PWA installable + service worker
- ❌ **NEW**: Client-side E2EE for `amount`, `note`, `account_number` using AES-GCM + user-derived key
- ❌ **NEW**: Optional passcode lock (local app pin)
- ❌ **NEW**: Export/import encrypted backup bundle

### 4.10 AI-Powered Insights
- ✅ Google Genkit + Gemini AI spending analysis flow
- ✅ AI Financial Advisor v2 panel
- ✅ Automated budget suggestions (finance.ts)
- ✅ Financial tips carousel

---

## 5. Information Architecture

```
App Root
├── Auth Layer
│   ├── Login              (email + password)
│   └── Signup             (onboarding wizard)
└── Main App (Sidebar + Top Nav)
    ├── Dashboard          (overview, alerts, check-in, goals)
    ├── Transactions       (CRUD, search, filter)
    ├── Income             (revenue-centric view)
    ├── Budgets            (monthly + weekly, auto-plan)
    ├── Goals              (savings goal tracker)
    ├── Debts              (lender/borrower tracking)
    ├── Reports            (analytics + exports)
    ├── Bills              (NEW: reminder management)
    ├── Assets / Accounts  (multi-account + transfers)
    ├── Profile            (user preferences)
    ├── Settings           (currency, encryption, backup)
    └── My Data            (import / export / GDPR tools)
```

---

## 6. UI / UX Design Specifications

### 6.1 Design Language (QUANTO Aesthetic)
- **Mode**: High-contrast dark theme with glass-morphism
- **Grid System**: 8px spacing, 12-column responsive
- **Input Height**: `h-11` (44px) for all form controls
- **Corner Radius**: 12px base (cards 16–24px, buttons 8–12px)

### 6.2 Color System (Semantic HSL Tokens)
| Token | Purpose | HSL |
|---|---|---|
| `--background` | Base canvas | 222° 47% 8% |
| `--card` | Glass card surface | 222° 47% 11% / α 0.6 |
| `--primary` | Core accent (Cyan Blue) | 199° 89% 48% |
| `--accent` | Secondary highlight (Teal) | 174° 60% 45% |
| `--chart-1..5` | Visualization palette | Cyan / Teal / Violet / Rose / Amber |
| `--destructive` | Over-budget, delete | 0° 84% 60% |
| Sidebar gradient | Left nav surface | 222° 47% 5% |

### 6.3 Typography
- **Family**: Inter (400, 500, 600, 700) — no weights below 400 or above 700
- **Headline Case**: Sentence case ("Spending by category" not "Spending By Category")
- **Data Densification**: Tabular numbers, 12–14px body, 10–11px meta

### 6.4 Iconography
- Set: **Lucide React** (consistent stroke width 2, sharp corners)
- Icon usage: Always 16–20px, paired with label or in dedicated action bar

### 6.5 Responsive Breakpoints
| Breakpoint | Target | Layout |
|---|---|---|
| `< 640px` | Mobile | Bottom nav, stack cards 1-wide |
| `640–1023px` | Tablet | Sidebar drawer, cards 2-wide |
| `≥ 1024px` | Desktop | Persistent sidebar, cards 3–5-wide grid |

---

## 7. Technical Constraints

| Area | Constraint | Rationale |
|---|---|---|
| Frontend | Next.js 15 App Router, React 19, TS strict | Existing foundation |
| UI | Radix + shadcn/ui, Tailwind 3, CSS vars only | User profile preference: semantic tokens over raw hex |
| Charts | Chart.js + react-chartjs-2 (existing) + Recharts (fallback) | Already integrated |
| Database | Supabase Postgres with RLS | Production grade + realtime |
| Auth | Supabase Auth JWT | Existing session handling |
| Encryption | Web Crypto API (AES-GCM 256-bit) | No external dependency, auditable |
| PWA | Service Worker + Web Push API | Installable, offline cache |
| Forms | react-hook-form + zod | Strict TS validation |
| Exports | CSV (native) + jsPDF + SheetJS (xlsx) | Feature parity |

---

## 8. Success Metrics

### 8.1 Functional Coverage
- [ ] All 8 feature areas above implemented
- [ ] 0 critical TypeScript errors (`tsc --noEmit`)
- [ ] No ESLint warnings on critical paths

### 8.2 Quality Gates
- [ ] Lighthouse: Performance ≥ 90, Accessibility ≥ 90, Best Practices ≥ 90
- [ ] Chrome/Safari/Firefox latest 2 versions render correctly
- [ ] iOS Safari (PWA) + Android Chrome tested
- [ ] Sensitive fields (amount, note, account_number) encrypted at rest in localStorage cache

### 8.3 Documentation
- [ ] Inline JSDoc on public functions
- [ ] Export formats schema documented
- [ ] Data migration path idempotent

---

## 9. Release Plan

| Milestone | Scope |
|---|---|
| **M1 — Document Approval** | PRD + Architecture signed off by user |
| **M2 — Feature Implementation** | Bill reminders, weekly budgets, transfers, encryption, PDF/XLSX export |
| **M3 — Design Pass** | UI polish, density tuning, responsive adjustments, micro-interactions |
| **M4 — Validation** | `typecheck` + `lint` + manual smoke test matrix |
| **M5 — Hand-off** | Final summary + maintenance documentation |

// WealthGuide-inspired types for MoneyWise

// Asset Types with icons and colors
export enum AssetType {
  CASH = 'cash',
  BANK_ACCOUNT = 'bank_account',
  MOBILE_MONEY = 'mobile_money',
  STOCKS = 'stocks',
  BONDS = 'bonds',
  REAL_ESTATE = 'real_estate',
  VEHICLE = 'vehicle',
  JEWELRY = 'jewelry',
  BUSINESS = 'business',
  LIVESTOCK = 'livestock',
  LAND = 'land',
  OTHER = 'other'
}

export const AssetTypeConfig: Record<AssetType, { label: string; icon: string; color: string }> = {
  [AssetType.CASH]: { label: 'Cash', icon: 'Banknote', color: '#2dd4bf' },
  [AssetType.BANK_ACCOUNT]: { label: 'Bank Account', icon: 'Building2', color: '#60a5fa' },
  [AssetType.MOBILE_MONEY]: { label: 'Mobile Money', icon: 'Smartphone', color: '#34d399' },
  [AssetType.STOCKS]: { label: 'Stocks & Shares', icon: 'TrendingUp', color: '#d4a843' },
  [AssetType.BONDS]: { label: 'Bonds', icon: 'FileText', color: '#a78bfa' },
  [AssetType.REAL_ESTATE]: { label: 'Real Estate', icon: 'Home', color: '#f87171' },
  [AssetType.VEHICLE]: { label: 'Vehicle', icon: 'Car', color: '#fbbf24' },
  [AssetType.JEWELRY]: { label: 'Jewelry & Gold', icon: 'CircleDot', color: '#f472b6' },
  [AssetType.BUSINESS]: { label: 'Business', icon: 'Briefcase', color: '#14b8a6' },
  [AssetType.LIVESTOCK]: { label: 'Livestock', icon: 'PawPrint', color: '#fb923c' },
  [AssetType.LAND]: { label: 'Land', icon: 'Leaf', color: '#22c55e' },
  [AssetType.OTHER]: { label: 'Other', icon: 'Box', color: '#94a3b8' }
};

// Countries
export interface Country {
  id: string;
  name: string;
  flag: string;
  currency: string;
  currencySymbol: string;
}

export const Countries: Country[] = [
  { id: 'TZ', name: 'Tanzania', flag: '🇹🇿', currency: 'TZS', currencySymbol: 'TSh' },
  { id: 'KE', name: 'Kenya', flag: '🇰🇪', currency: 'KES', currencySymbol: 'KSh' },
  { id: 'UG', name: 'Uganda', flag: '🇺🇬', currency: 'UGX', currencySymbol: 'USh' },
  { id: 'RW', name: 'Rwanda', flag: '🇷🇼', currency: 'RWF', currencySymbol: 'FRw' },
  { id: 'NG', name: 'Nigeria', flag: '🇳🇬', currency: 'NGN', currencySymbol: '₦' },
  { id: 'ZA', name: 'South Africa', flag: '🇿🇦', currency: 'ZAR', currencySymbol: 'R' },
  { id: 'US', name: 'United States', flag: '🇺🇸', currency: 'USD', currencySymbol: '$' },
  { id: 'UK', name: 'United Kingdom', flag: '🇬🇧', currency: 'GBP', currencySymbol: '£' },
  { id: 'CA', name: 'Canada', flag: '🇨🇦', currency: 'CAD', currencySymbol: 'C$' },
  { id: 'AU', name: 'Australia', flag: '🇦🇺', currency: 'AUD', currencySymbol: 'A$' },
  { id: 'DE', name: 'Germany', flag: '🇩🇪', currency: 'EUR', currencySymbol: '€' },
  { id: 'FR', name: 'France', flag: '🇫🇷', currency: 'EUR', currencySymbol: '€' },
  { id: 'IN', name: 'India', flag: '🇮🇳', currency: 'INR', currencySymbol: '₹' },
  { id: 'JP', name: 'Japan', flag: '🇯🇵', currency: 'JPY', currencySymbol: '¥' },
  { id: 'BR', name: 'Brazil', flag: '🇧🇷', currency: 'BRL', currencySymbol: 'R$' },
  { id: 'MX', name: 'Mexico', flag: '🇲🇽', currency: 'MXN', currencySymbol: '$' },
  { id: 'SG', name: 'Singapore', flag: '🇸🇬', currency: 'SGD', currencySymbol: 'S$' },
  { id: 'AE', name: 'UAE', flag: '🇦🇪', currency: 'AED', currencySymbol: 'د.إ' },
  { id: 'CN', name: 'China', flag: '🇨🇳', currency: 'CNY', currencySymbol: '¥' }
];

// Financial Tips
export enum TipCategory {
  BUDGETING = 'budgeting',
  SAVING = 'saving',
  INVESTING = 'investing',
  DEBT = 'debt',
  EMERGENCY = 'emergency',
  RETIREMENT = 'retirement',
  TAX = 'tax'
}

export enum Priority {
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low'
}

export interface FinancialTip {
  id: string;
  title: string;
  description: string;
  category: TipCategory;
  priority: Priority;
}

// Investment Options
export enum RiskLevel {
  CONSERVATIVE = 'conservative',
  MODERATE = 'moderate',
  AGGRESSIVE = 'aggressive'
}

export interface InvestmentOption {
  id: string;
  name: string;
  description: string;
  riskLevel: RiskLevel;
  expectedReturnRange: string;
  minimumInvestment: string;
  timeHorizon: string;
  iconName: string;
}

// Tax Tips
export enum TaxCategory {
  DEDUCTION = 'deduction',
  CREDIT = 'credit',
  STRATEGY = 'strategy',
  RETIREMENT = 'retirement',
  BUSINESS = 'business'
}

export interface TaxTip {
  id: string;
  title: string;
  description: string;
  category: TaxCategory;
  estimatedSavings?: string;
}

// Enhanced Transaction Categories
export enum ExpenseCategory {
  FOOD = 'food',
  TRANSPORT = 'transport',
  HOUSING = 'housing',
  UTILITIES = 'utilities',
  HEALTHCARE = 'healthcare',
  EDUCATION = 'education',
  ENTERTAINMENT = 'entertainment',
  SHOPPING = 'shopping',
  SAVINGS = 'savings',
  INVESTMENTS = 'investments',
  DEBT = 'debt',
  BUSINESS = 'business',
  OTHER = 'other'
}

export enum RevenueCategory {
  SALARY = 'salary',
  BUSINESS = 'business',
  FREELANCE = 'freelance',
  INVESTMENTS = 'investments',
  RENTAL = 'rental',
  GIFTS = 'gifts',
  REFUND = 'refund',
  OTHER = 'other'
}

export const ExpenseCategoryConfig: Record<ExpenseCategory, { label: string; icon: string; color: string }> = {
  [ExpenseCategory.FOOD]: { label: 'Food & Dining', icon: 'Utensils', color: '#f87171' },
  [ExpenseCategory.TRANSPORT]: { label: 'Transportation', icon: 'Car', color: '#60a5fa' },
  [ExpenseCategory.HOUSING]: { label: 'Housing & Rent', icon: 'Home', color: '#a78bfa' },
  [ExpenseCategory.UTILITIES]: { label: 'Utilities', icon: 'Zap', color: '#fbbf24' },
  [ExpenseCategory.HEALTHCARE]: { label: 'Healthcare', icon: 'Heart', color: '#34d399' },
  [ExpenseCategory.EDUCATION]: { label: 'Education', icon: 'BookOpen', color: '#818cf8' },
  [ExpenseCategory.ENTERTAINMENT]: { label: 'Entertainment', icon: 'Film', color: '#f472b6' },
  [ExpenseCategory.SHOPPING]: { label: 'Shopping', icon: 'ShoppingBag', color: '#fb923c' },
  [ExpenseCategory.SAVINGS]: { label: 'Savings', icon: 'Banknote', color: '#2dd4bf' },
  [ExpenseCategory.INVESTMENTS]: { label: 'Investments', icon: 'TrendingUp', color: '#d4a843' },
  [ExpenseCategory.DEBT]: { label: 'Debt Payments', icon: 'CreditCard', color: '#ef4444' },
  [ExpenseCategory.BUSINESS]: { label: 'Business', icon: 'Briefcase', color: '#14b8a6' },
  [ExpenseCategory.OTHER]: { label: 'Other', icon: 'MoreHorizontal', color: '#94a3b8' }
};

export const RevenueCategoryConfig: Record<RevenueCategory, { label: string; icon: string; color: string }> = {
  [RevenueCategory.SALARY]: { label: 'Salary', icon: 'Briefcase', color: '#2dd4bf' },
  [RevenueCategory.BUSINESS]: { label: 'Business Income', icon: 'Building2', color: '#d4a843' },
  [RevenueCategory.FREELANCE]: { label: 'Freelance', icon: 'Laptop', color: '#60a5fa' },
  [RevenueCategory.INVESTMENTS]: { label: 'Investment Returns', icon: 'TrendingUp', color: '#34d399' },
  [RevenueCategory.RENTAL]: { label: 'Rental Income', icon: 'Home', color: '#a78bfa' },
  [RevenueCategory.GIFTS]: { label: 'Gifts & Bonuses', icon: 'Gift', color: '#f472b6' },
  [RevenueCategory.REFUND]: { label: 'Refunds', icon: 'RotateCcw', color: '#94a3b8' },
  [RevenueCategory.OTHER]: { label: 'Other', icon: 'MoreHorizontal', color: '#94a3b8' }
};

// Savings Goal
export interface SavingsGoal {
  id: string;
  user_id: string;
  name: string;
  target_amount: number;
  current_amount: number;
  deadline?: string;
  icon_name: string;
  color_hex: string;
  created_at: string;
  updated_at: string;
}

// Enhanced Asset
export interface EnhancedAsset {
  id: string;
  user_id: string;
  name: string;
  asset_type: AssetType;
  current_value: number;
  purchase_value?: number;
  note?: string;
  icon_name?: string;
  color_hex?: string;
  created_at: string;
  updated_at: string;
}

// Enhanced Transaction
export interface EnhancedTransaction {
  id: string;
  user_id: string;
  type: 'income' | 'expense';
  amount: number;
  title: string;
  note?: string;
  date: string;
  expense_category?: ExpenseCategory;
  revenue_category?: RevenueCategory;
  icon_name?: string;
  color_hex?: string;
  created_at: string;
}

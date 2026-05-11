// Country-specific financial data service inspired by WealthGuide
import { FinancialTip, InvestmentOption, TaxTip, Countries, TipCategory, Priority, RiskLevel, TaxCategory } from './types';

export class CountryDataService {
  private static instance: CountryDataService;

  static getInstance(): CountryDataService {
    if (!CountryDataService.instance) {
      CountryDataService.instance = new CountryDataService();
    }
    return CountryDataService.instance;
  }

  getCountryById(countryId: string) {
    return Countries.find(c => c.id === countryId) || Countries[0];
  }

  getFinancialTips(countryId: string): FinancialTip[] {
    const tips = this.countryTips[countryId] || this.countryTips['TZ'];
    return tips.map((tip, index) => ({ ...tip, id: `tip-${countryId}-${index}` }));
  }

  getInvestmentOptions(countryId: string): InvestmentOption[] {
    const investments = this.countryInvestments[countryId] || this.countryInvestments['TZ'];
    return investments.map((inv, index) => ({ ...inv, id: `inv-${countryId}-${index}` }));
  }

  getTaxTips(countryId: string): TaxTip[] {
    const tips = this.countryTaxTips[countryId] || this.countryTaxTips['TZ'];
    return tips.map((tip, index) => ({ ...tip, id: `tax-${countryId}-${index}` }));
  }

  // Tanzania (default)
  private tzTips: Omit<FinancialTip, 'id'>[] = [
    { title: 'Max Out Your NSSF', description: 'Contribute the maximum allowed to your NSSF pension for retirement security.', category: TipCategory.RETIREMENT, priority: Priority.HIGH },
    { title: 'Build a 6-Month Emergency Fund', description: 'Save 3-6 months of living expenses in a high-yield savings account for unexpected events.', category: TipCategory.EMERGENCY, priority: Priority.HIGH },
    { title: 'Pay Off High-Interest Debt First', description: 'Focus on mobile loans and credit cards with high APRs before investing aggressively.', category: TipCategory.DEBT, priority: Priority.HIGH },
    { title: 'Invest in Treasury Bonds', description: 'Tanzanian government bonds offer secure returns and help diversify your portfolio.', category: TipCategory.INVESTING, priority: Priority.MEDIUM },
    { title: 'Use the 50/30/20 Rule', description: 'Allocate 50% to needs, 30% to wants, and 20% to savings and debt repayment.', category: TipCategory.BUDGETING, priority: Priority.MEDIUM },
    { title: 'Automate Your Savings', description: 'Set up automatic transfers on payday to remove the temptation to spend.', category: TipCategory.SAVING, priority: Priority.MEDIUM },
    { title: 'Consider Mobile Money Investments', description: 'Explore secure savings products offered by your mobile money provider.', category: TipCategory.SAVING, priority: Priority.LOW },
  ];

  private tzInvestments: Omit<InvestmentOption, 'id'>[] = [
    { name: 'Treasury Bonds', description: 'Government-backed bonds with fixed returns. Very low risk.', riskLevel: RiskLevel.CONSERVATIVE, expectedReturnRange: '12-15%', minimumInvestment: '100,000 TZS', timeHorizon: '2-20 years', iconName: 'shield' },
    { name: 'Fixed Deposit Account', description: 'Bank deposits with guaranteed interest rates and capital protection.', riskLevel: RiskLevel.CONSERVATIVE, expectedReturnRange: '6-9%', minimumInvestment: '50,000 TZS', timeHorizon: '3 months - 5 years', iconName: 'building' },
    { name: 'DSE Stocks', description: 'Dar es Salaam Stock Exchange listed companies. Good for long-term growth.', riskLevel: RiskLevel.MODERATE, expectedReturnRange: '10-18%', minimumInvestment: '10,000 TZS', timeHorizon: '5+ years', iconName: 'trending-up' },
    { name: 'Unit Trust Funds', description: 'Professionally managed diversified portfolios for moderate investors.', riskLevel: RiskLevel.MODERATE, expectedReturnRange: '8-14%', minimumInvestment: '100,000 TZS', timeHorizon: '3+ years', iconName: 'pie-chart' },
    { name: 'Real Estate', description: 'Property investment in Dar es Salaam or emerging regional cities.', riskLevel: RiskLevel.MODERATE, expectedReturnRange: '8-15%', minimumInvestment: '5,000,000 TZS', timeHorizon: '5+ years', iconName: 'home' },
  ];

  private tzTaxTips: Omit<TaxTip, 'id'>[] = [
    { title: 'Pension Contributions Deduction', description: 'NSSF and other approved pension contributions are tax-deductible up to certain limits.', category: TaxCategory.DEDUCTION, estimatedSavings: 'Up to 20% of contributions' },
    { title: 'Medical Expense Deduction', description: 'Certain medical expenses for yourself and dependents may be deductible.', category: TaxCategory.DEDUCTION, estimatedSavings: 'Variable' },
    { title: 'Charitable Donations', description: 'Donations to registered charities are tax-deductible.', category: TaxCategory.DEDUCTION, estimatedSavings: 'Up to 100% of donation' },
    { title: 'Business Expense Tracking', description: 'Keep detailed records of all business expenses to maximize deductions.', category: TaxCategory.BUSINESS, estimatedSavings: 'Variable' },
    { title: 'Tax-Free Threshold', description: 'Understand the annual income threshold below which no tax is payable.', category: TaxCategory.STRATEGY, estimatedSavings: 'Variable' },
  ];

  // Kenya
  private keTips: Omit<FinancialTip, 'id'>[] = [
    { title: 'Max Out Your NSSF', description: 'Contribute at least enough to get your full employer match for retirement.', category: TipCategory.RETIREMENT, priority: Priority.HIGH },
    { title: 'Build a 6-Month Emergency Fund', description: 'With economic volatility, a substantial emergency fund is essential.', category: TipCategory.EMERGENCY, priority: Priority.HIGH },
    { title: 'Invest in Treasury Bonds', description: 'Kenyan government bonds offer secure, competitive returns.', category: TipCategory.INVESTING, priority: Priority.HIGH },
    { title: 'Consider SACCOs', description: 'Savings and Credit Cooperative Organizations offer good returns and credit access.', category: TipCategory.SAVING, priority: Priority.MEDIUM },
    { title: 'Use the 50/30/20 Rule', description: 'Allocate 50% to needs, 30% to wants, and 20% to savings and debt repayment.', category: TipCategory.BUDGETING, priority: Priority.MEDIUM },
    { title: 'Avoid Mobile Loan Debt', description: 'Digital lenders charge high interest. Use them only for emergencies.', category: TipCategory.DEBT, priority: Priority.HIGH },
    { title: 'Invest in NSE Stocks', description: 'Nairobi Securities Exchange offers growth opportunities for long-term investors.', category: TipCategory.INVESTING, priority: Priority.MEDIUM },
  ];

  private keInvestments: Omit<InvestmentOption, 'id'>[] = [
    { name: 'Treasury Bonds', description: 'Government-backed bonds with competitive returns. Very low risk.', riskLevel: RiskLevel.CONSERVATIVE, expectedReturnRange: '13-16%', minimumInvestment: '50,000 KES', timeHorizon: '1-30 years', iconName: 'shield' },
    { name: 'SACCO Shares', description: 'Cooperative savings with dividends and access to low-interest loans.', riskLevel: RiskLevel.CONSERVATIVE, expectedReturnRange: '8-12%', minimumInvestment: '10,000 KES', timeHorizon: '1+ years', iconName: 'users' },
    { name: 'NSE Stocks', description: 'Nairobi Securities Exchange listed companies for long-term growth.', riskLevel: RiskLevel.MODERATE, expectedReturnRange: '10-20%', minimumInvestment: '1,000 KES', timeHorizon: '5+ years', iconName: 'trending-up' },
    { name: 'Money Market Funds', description: 'Low-risk liquid investments with better returns than savings accounts.', riskLevel: RiskLevel.CONSERVATIVE, expectedReturnRange: '8-11%', minimumInvestment: '1,000 KES', timeHorizon: 'Any', iconName: 'banknote' },
    { name: 'Real Estate', description: 'Property investment in Nairobi, Mombasa, or emerging towns.', riskLevel: RiskLevel.MODERATE, expectedReturnRange: '10-18%', minimumInvestment: '500,000 KES', timeHorizon: '5+ years', iconName: 'home' },
  ];

  private keTaxTips: Omit<TaxTip, 'id'>[] = [
    { title: 'Pension Contributions', description: 'NSSF and private pension contributions are tax-deductible up to KSh 20,000/month.', category: TaxCategory.RETIREMENT, estimatedSavings: 'Up to KSh 72,000/year' },
    { title: 'Mortgage Interest Relief', description: 'Claim relief on interest paid on mortgage for your primary residence.', category: TaxCategory.DEDUCTION, estimatedSavings: 'Up to KSh 300,000/year' },
    { title: 'Insurance Premium Relief', description: 'Life and health insurance premiums may qualify for tax relief.', category: TaxCategory.DEDUCTION, estimatedSavings: 'Up to KSh 60,000/year' },
    { title: 'Home Ownership Savings', description: 'Contributions to approved home ownership savings plans are deductible.', category: TaxCategory.DEDUCTION, estimatedSavings: 'Up to KSh 96,000/year' },
    { title: 'Disabled Persons Deduction', description: 'Additional deductions available for taxpayers with disabilities.', category: TaxCategory.DEDUCTION, estimatedSavings: 'KSh 150,000/year' },
  ];

  // Uganda
  private ugTips: Omit<FinancialTip, 'id'>[] = [
    { title: 'Max Out Your NSSF', description: 'Ensure you contribute to NSSF for retirement security.', category: TipCategory.RETIREMENT, priority: Priority.HIGH },
    { title: 'Build a 6-Month Emergency Fund', description: 'Save 3-6 months of expenses given economic volatility.', category: TipCategory.EMERGENCY, priority: Priority.HIGH },
    { title: 'Invest in Treasury Bills/Bonds', description: 'Bank of Uganda securities offer secure returns.', category: TipCategory.INVESTING, priority: Priority.MEDIUM },
    { title: 'Use Mobile Money Wisely', description: 'Leverage mobile money for savings but watch transaction costs.', category: TipCategory.SAVING, priority: Priority.MEDIUM },
    { title: 'Avoid Informal Lenders', description: 'Informal lenders charge exorbitant rates. Use regulated institutions.', category: TipCategory.DEBT, priority: Priority.HIGH },
    { title: 'Consider USE Stocks', description: 'Uganda Securities Exchange for long-term equity investment.', category: TipCategory.INVESTING, priority: Priority.MEDIUM },
    { title: 'Diversify in Agriculture', description: 'Agricultural investments can provide steady returns.', category: TipCategory.INVESTING, priority: Priority.MEDIUM },
  ];

  private ugInvestments: Omit<InvestmentOption, 'id'>[] = [
    { name: 'Treasury Bills', description: 'Short-term government securities with attractive yields.', riskLevel: RiskLevel.CONSERVATIVE, expectedReturnRange: '10-14%', minimumInvestment: '100,000 UGX', timeHorizon: '91-364 days', iconName: 'shield' },
    { name: 'Treasury Bonds', description: 'Longer-term government securities with higher yields.', riskLevel: RiskLevel.CONSERVATIVE, expectedReturnRange: '12-16%', minimumInvestment: '1,000,000 UGX', timeHorizon: '2-15 years', iconName: 'building' },
    { name: 'USE Stocks', description: 'Uganda Securities Exchange listed companies.', riskLevel: RiskLevel.MODERATE, expectedReturnRange: '8-15%', minimumInvestment: '10,000 UGX', timeHorizon: '5+ years', iconName: 'trending-up' },
    { name: 'Unit Trusts', description: 'Diversified managed funds for moderate investors.', riskLevel: RiskLevel.MODERATE, expectedReturnRange: '8-12%', minimumInvestment: '100,000 UGX', timeHorizon: '3+ years', iconName: 'pie-chart' },
    { name: 'Agricultural Investment', description: 'Invest in agricultural ventures or land for production.', riskLevel: RiskLevel.MODERATE, expectedReturnRange: '10-20%', minimumInvestment: '500,000 UGX', timeHorizon: '1+ years', iconName: 'leaf' },
  ];

  private ugTaxTips: Omit<TaxTip, 'id'>[] = [
    { title: 'NSSF Contributions', description: 'NSSF contributions are tax-deductible and reduce your taxable income.', category: TaxCategory.RETIREMENT, estimatedSavings: 'Variable' },
    { title: 'Personal Allowance', description: 'The first UGX 2,820,000 of annual income is tax-free.', category: TaxCategory.DEDUCTION, estimatedSavings: 'Variable' },
    { title: 'Life Insurance Relief', description: 'Premiums paid on life insurance policies are tax-deductible.', category: TaxCategory.DEDUCTION, estimatedSavings: 'Variable' },
    { title: 'Business Expenses', description: 'Properly document business expenses for tax deduction.', category: TaxCategory.BUSINESS, estimatedSavings: 'Variable' },
    { title: 'Capital Gains Timing', description: 'Time asset sales to optimize capital gains tax liability.', category: TaxCategory.STRATEGY, estimatedSavings: 'Variable' },
  ];

  // US
  private usTips: Omit<FinancialTip, 'id'>[] = [
    { title: 'Max Out Your 401(k)', description: 'Contribute at least enough to get your full employer match. In 2026, the limit is $23,500, or $31,000 if you\'re 50+.', category: TipCategory.RETIREMENT, priority: Priority.HIGH },
    { title: 'Build a 6-Month Emergency Fund', description: 'Aim to save 3-6 months of living expenses in a high-yield savings account for unexpected events.', category: TipCategory.EMERGENCY, priority: Priority.HIGH },
    { title: 'Pay Off High-Interest Debt First', description: 'Focus on credit cards and personal loans with APRs above 10% before investing aggressively.', category: TipCategory.DEBT, priority: Priority.HIGH },
    { title: 'Open a Roth IRA', description: 'Tax-free growth and withdrawals in retirement. Great for younger earners in lower tax brackets.', category: TipCategory.INVESTING, priority: Priority.MEDIUM },
    { title: 'Use the 50/30/20 Rule', description: 'Allocate 50% to needs, 30% to wants, and 20% to savings and debt repayment.', category: TipCategory.BUDGETING, priority: Priority.MEDIUM },
    { title: 'Automate Your Savings', description: 'Set up automatic transfers on payday to remove the temptation to spend.', category: TipCategory.SAVING, priority: Priority.MEDIUM },
    { title: 'Check Your Credit Report', description: 'Review your free annual credit report to catch errors and prevent identity theft.', category: TipCategory.BUDGETING, priority: Priority.LOW },
  ];

  private usInvestments: Omit<InvestmentOption, 'id'>[] = [
    { name: 'S&P 500 Index Fund', description: 'Broad US stock market exposure with low fees. Historically returns ~10% annually.', riskLevel: RiskLevel.MODERATE, expectedReturnRange: '8-12%', minimumInvestment: '$1', timeHorizon: '5+ years', iconName: 'trending-up' },
    { name: 'US Treasury Bonds', description: 'Backed by the full faith of the US government. Very low risk but modest returns.', riskLevel: RiskLevel.CONSERVATIVE, expectedReturnRange: '3-5%', minimumInvestment: '$100', timeHorizon: '1-10 years', iconName: 'building' },
    { name: 'Real Estate (REITs)', description: 'Invest in commercial real estate without buying property. Provides dividends and diversification.', riskLevel: RiskLevel.MODERATE, expectedReturnRange: '6-10%', minimumInvestment: '$100', timeHorizon: '5+ years', iconName: 'home' },
    { name: 'Target-Date Fund', description: 'Automatically adjusts asset allocation as you approach retirement. Set-and-forget investing.', riskLevel: RiskLevel.MODERATE, expectedReturnRange: '5-9%', minimumInvestment: '$1,000', timeHorizon: 'Until retirement', iconName: 'calendar' },
    { name: 'Individual Stocks', description: 'Direct ownership in companies. Higher potential returns but requires research and carries more risk.', riskLevel: RiskLevel.AGGRESSIVE, expectedReturnRange: 'Variable', minimumInvestment: '$1', timeHorizon: '5+ years', iconName: 'bar-chart' },
  ];

  private usTaxTips: Omit<TaxTip, 'id'>[] = [
    { title: 'Contribute to a Traditional 401(k)', description: 'Reduce your taxable income by contributing pre-tax dollars to your employer plan.', category: TaxCategory.DEDUCTION, estimatedSavings: 'Up to $7,800/yr' },
    { title: 'Health Savings Account (HSA)', description: 'Triple tax advantage: deductible contributions, tax-free growth, and tax-free withdrawals for medical expenses.', category: TaxCategory.DEDUCTION, estimatedSavings: 'Up to $4,300/yr' },
    { title: 'Itemize State & Local Taxes', description: 'Deduct up to $10,000 in state and local taxes if itemizing exceeds your standard deduction.', category: TaxCategory.DEDUCTION, estimatedSavings: '$1,000-3,000/yr' },
    { title: 'Child Tax Credit', description: 'Claim up to $2,000 per qualifying child under age 17. Partially refundable.', category: TaxCategory.CREDIT, estimatedSavings: '$2,000/child' },
    { title: 'Tax-Loss Harvesting', description: 'Sell losing investments to offset capital gains and up to $3,000 of ordinary income.', category: TaxCategory.STRATEGY, estimatedSavings: 'Variable' },
  ];

  // Generic/Default for other countries
  private genericTips: Omit<FinancialTip, 'id'>[] = [
    { title: 'Build an Emergency Fund', description: 'Save 3-6 months of living expenses for unexpected situations.', category: TipCategory.EMERGENCY, priority: Priority.HIGH },
    { title: 'Start Saving Early', description: 'The power of compound interest means starting early makes a huge difference.', category: TipCategory.SAVING, priority: Priority.HIGH },
    { title: 'Diversify Your Investments', description: 'Don\'t put all your eggs in one basket. Spread investments across asset types.', category: TipCategory.INVESTING, priority: Priority.HIGH },
    { title: 'Pay Off High-Interest Debt', description: 'Credit cards and high-interest loans should be paid off before aggressive investing.', category: TipCategory.DEBT, priority: Priority.HIGH },
    { title: 'Create a Budget', description: 'Track your income and expenses to understand where your money goes.', category: TipCategory.BUDGETING, priority: Priority.MEDIUM },
    { title: 'Plan for Retirement', description: 'Contribute to retirement accounts regularly, even if starting small.', category: TipCategory.RETIREMENT, priority: Priority.MEDIUM },
    { title: 'Review Insurance Coverage', description: 'Ensure you have adequate health, life, and property insurance.', category: TipCategory.EMERGENCY, priority: Priority.MEDIUM },
  ];

  private genericInvestments: Omit<InvestmentOption, 'id'>[] = [
    { name: 'Government Bonds', description: 'Low-risk investments backed by government guarantee.', riskLevel: RiskLevel.CONSERVATIVE, expectedReturnRange: '3-8%', minimumInvestment: '$100', timeHorizon: '1-10 years', iconName: 'shield' },
    { name: 'Index Funds', description: 'Diversified exposure to entire markets with low fees.', riskLevel: RiskLevel.MODERATE, expectedReturnRange: '7-12%', minimumInvestment: '$100', timeHorizon: '5+ years', iconName: 'trending-up' },
    { name: 'Fixed Deposits', description: 'Guaranteed returns with bank protection.', riskLevel: RiskLevel.CONSERVATIVE, expectedReturnRange: '4-7%', minimumInvestment: '$500', timeHorizon: '6 months - 5 years', iconName: 'building' },
    { name: 'Real Estate', description: 'Property investment for long-term appreciation and rental income.', riskLevel: RiskLevel.MODERATE, expectedReturnRange: '6-12%', minimumInvestment: '$10,000', timeHorizon: '5+ years', iconName: 'home' },
    { name: 'Balanced Mutual Funds', description: 'Diversified portfolios mixing stocks and bonds.', riskLevel: RiskLevel.MODERATE, expectedReturnRange: '6-10%', minimumInvestment: '$1,000', timeHorizon: '3+ years', iconName: 'pie-chart' },
  ];

  private genericTaxTips: Omit<TaxTip, 'id'>[] = [
    { title: 'Contribute to Retirement Accounts', description: 'Retirement contributions often provide tax deductions or deferrals.', category: TaxCategory.RETIREMENT, estimatedSavings: 'Variable' },
    { title: 'Track Deductible Expenses', description: 'Keep records of medical, business, and charitable expenses.', category: TaxCategory.DEDUCTION, estimatedSavings: 'Variable' },
    { title: 'Tax-Free Allowances', description: 'Understand your personal allowance and tax-free thresholds.', category: TaxCategory.DEDUCTION, estimatedSavings: 'Variable' },
    { title: 'Charitable Donations', description: 'Donations to registered charities are often tax-deductible.', category: TaxCategory.DEDUCTION, estimatedSavings: 'Variable' },
    { title: 'Consult a Tax Professional', description: 'Professional advice can save money for complex situations.', category: TaxCategory.STRATEGY, estimatedSavings: 'Variable' },
  ];

  // Map of all country data
  private countryTips: Record<string, Omit<FinancialTip, 'id'>[]> = {
    'TZ': this.tzTips,
    'KE': this.keTips,
    'UG': this.ugTips,
    'US': this.usTips,
    'UK': this.genericTips,
    'CA': this.genericTips,
    'AU': this.genericTips,
    'DE': this.genericTips,
    'FR': this.genericTips,
    'IN': this.genericTips,
    'JP': this.genericTips,
    'BR': this.genericTips,
    'MX': this.genericTips,
    'SG': this.genericTips,
    'ZA': this.genericTips,
    'NG': this.genericTips,
    'RW': this.genericTips,
    'AE': this.genericTips,
    'CN': this.genericTips,
  };

  private countryInvestments: Record<string, Omit<InvestmentOption, 'id'>[]> = {
    'TZ': this.tzInvestments,
    'KE': this.keInvestments,
    'UG': this.ugInvestments,
    'US': this.usInvestments,
    'UK': this.genericInvestments,
    'CA': this.genericInvestments,
    'AU': this.genericInvestments,
    'DE': this.genericInvestments,
    'FR': this.genericInvestments,
    'IN': this.genericInvestments,
    'JP': this.genericInvestments,
    'BR': this.genericInvestments,
    'MX': this.genericInvestments,
    'SG': this.genericInvestments,
    'ZA': this.genericInvestments,
    'NG': this.genericInvestments,
    'RW': this.genericInvestments,
    'AE': this.genericInvestments,
    'CN': this.genericInvestments,
  };

  private countryTaxTips: Record<string, Omit<TaxTip, 'id'>[]> = {
    'TZ': this.tzTaxTips,
    'KE': this.keTaxTips,
    'UG': this.ugTaxTips,
    'US': this.usTaxTips,
    'UK': this.genericTaxTips,
    'CA': this.genericTaxTips,
    'AU': this.genericTaxTips,
    'DE': this.genericTaxTips,
    'FR': this.genericTaxTips,
    'IN': this.genericTaxTips,
    'JP': this.genericTaxTips,
    'BR': this.genericTaxTips,
    'MX': this.genericTaxTips,
    'SG': this.genericTaxTips,
    'ZA': this.genericTaxTips,
    'NG': this.genericTaxTips,
    'RW': this.genericTaxTips,
    'AE': this.genericTaxTips,
    'CN': this.genericTaxTips,
  };
}

export const countryDataService = CountryDataService.getInstance();

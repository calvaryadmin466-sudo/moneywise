"use client";

import * as React from "react";
import {
  Sparkles, X, Send, Loader2, TrendingUp, PiggyBank, Globe, Target, Brain,
  ArrowUpRight, ArrowDownRight, RefreshCw, TrendingDown, Wallet, BarChart3,
  PieChart, LineChart, Shield, Zap, DollarSign, Calendar, Award, AlertCircle,
  CheckCircle2, Info, ChevronRight, ChevronDown, Maximize2, Minimize2, Star,
  Flame, Lightbulb, Percent, Clock, Building2, Landmark, CreditCard, Smartphone,
  Home, Plane, GraduationCap, Heart, Umbrella, Coins, Gem, Trophy, User,
  Droplets, Wind, Thermometer, Eye, EyeOff
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { formatCurrency, Transaction, Budget, Goal } from "@/lib/nhost";
import { supabase, getUser } from "@/lib/supabase";
import { StockData, getStocksForCountry, getMarketStatus, getLastUpdatedTime } from "@/lib/stocks";

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

interface Message {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: Date;
  attachments?: Attachment[];
}

interface Attachment {
  type: "chart" | "table" | "recommendation";
  data: any;
}

interface UserProfile {
  country: string;
  currency_preference: string;
  risk_tolerance?: "conservative" | "moderate" | "aggressive";
  investment_experience?: "beginner" | "intermediate" | "advanced";
}

interface PortfolioMetrics {
  totalValue: number;
  totalInvested: number;
  totalGainLoss: number;
  totalGainLossPercent: number;
  dayChange: number;
  dayChangePercent: number;
  monthlyReturn: number;
  yearlyReturn: number;
  volatility: number;
  sharpeRatio: number;
  maxDrawdown: number;
}

interface RiskAssessment {
  overallScore: number;
  marketRisk: number;
  liquidityRisk: number;
  concentrationRisk: number;
  recommendation: string;
  warnings: string[];
}

interface RetirementPlan {
  currentAge: number;
  retirementAge: number;
  currentSavings: number;
  monthlyContribution: number;
  expectedReturn: number;
  inflationRate: number;
  targetRetirementFund: number;
  projectedFund: number;
  onTrack: boolean;
  monthlyRetirementIncome: number;
  yearsOfRetirement: number;
}

interface NetWorthBreakdown {
  total: number;
  assets: {
    cash: number;
    bank: number;
    mobileMoney: number;
    investments: number;
    property: number;
    crypto: number;
    other: number;
  };
  liabilities: {
    loans: number;
    creditCards: number;
    mortgages: number;
    other: number;
  };
  netWorth: number;
}

interface FinancialHealth {
  score: number;
  emergencyFundMonths: number;
  debtToIncomeRatio: number;
  savingsRate: number;
  creditUtilization: number;
  paymentHistory: number;
  grade: "A" | "B" | "C" | "D" | "F";
  insights: string[];
  recommendations: string[];
}

interface ChartDataPoint {
  date: string;
  value: number;
  label?: string;
}

interface SpendingCategory {
  category: string;
  amount: number;
  percentage: number;
  trend: "up" | "down" | "stable";
  trendPercentage: number;
  icon: React.ReactNode;
  color: string;
}

interface InvestmentRecommendation {
  symbol: string;
  name: string;
  type: "stock" | "bond" | "etf" | "crypto" | "real_estate" | "savings";
  price: number;
  change: number;
  changePercent: number;
  recommendation: "strong_buy" | "buy" | "hold" | "sell";
  reasoning: string;
  riskLevel: "low" | "medium" | "high";
  expectedReturn: number;
  timeHorizon: string;
  suitabilityScore: number;
}

interface SavingsGoal {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  deadline: string;
  monthlyRequired: number;
  progress: number;
  status: "on_track" | "at_risk" | "behind" | "completed";
  icon: React.ReactNode;
  color: string;
}

interface TaxEstimate {
  grossIncome: number;
  taxableIncome: number;
  estimatedTax: number;
  effectiveRate: number;
  marginalRate: number;
  taxBrackets: TaxBracket[];
  deductions: Deduction[];
  totalDeductions: number;
}

interface TaxBracket {
  bracket: string;
  rate: number;
  tax: number;
}

interface Deduction {
  name: string;
  amount: number;
  type: "standard" | "itemized";
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

const generateId = () => Math.random().toString(36).substring(2, 15);

const formatNumber = (num: number, decimals: number = 2) => {
  if (Math.abs(num) >= 1e9) return (num / 1e9).toFixed(decimals) + "B";
  if (Math.abs(num) >= 1e6) return (num / 1e6).toFixed(decimals) + "M";
  if (Math.abs(num) >= 1e3) return (num / 1e3).toFixed(decimals) + "K";
  return num.toFixed(decimals);
};

const interpolateColor = (value: number, min: number, max: number): string => {
  const ratio = (value - min) / (max - min);
  if (ratio < 0.5) {
    return `rgb(${Math.round(239 + (34 - 239) * ratio * 2)}, ${Math.round(68 + (139 - 68) * ratio * 2)}, ${Math.round(68 + (69 - 68) * ratio * 2)})`;
  }
  return `rgb(${Math.round(34 + (34 - 34) * (ratio - 0.5) * 2)}, ${Math.round(139 + (200 - 139) * (ratio - 0.5) * 2)}, ${Math.round(69 + (50 - 69) * (ratio - 0.5) * 2)})`;
};

const getScoreColor = (score: number): string => {
  if (score >= 80) return "text-emerald-500";
  if (score >= 60) return "text-green-500";
  if (score >= 40) return "text-amber-500";
  if (score >= 20) return "text-orange-500";
  return "text-red-500";
};

const getGradeColor = (grade: string): string => {
  switch (grade) {
    case "A": return "bg-emerald-500/20 text-emerald-500 border-emerald-500/30";
    case "B": return "bg-green-500/20 text-green-500 border-green-500/30";
    case "C": return "bg-amber-500/20 text-amber-500 border-amber-500/30";
    case "D": return "bg-orange-500/20 text-orange-500 border-orange-500/30";
    case "F": return "bg-red-500/20 text-red-500 border-red-500/30";
    default: return "bg-gray-500/20 text-gray-500 border-gray-500/30";
  }
};

// ============================================================================
// CHART COMPONENTS
// ============================================================================

const SparklineChart: React.FC<{ data: number[]; color?: string; height?: number; width?: number }> = ({
  data, color = "#06b6d4", height = 40, width = 100
}) => {
  if (!data.length) return null;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const points = data.map((val, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((val - min) / range) * height;
    return `${x},${y}`;
  }).join(" ");

  return (
    <svg width={width} height={height} className="overflow-visible">
      <defs>
        <linearGradient id={`gradient-${color.replace("#", "")}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polyline
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
      />
    </svg>
  );
};

const DonutChart: React.FC<{
  data: { label: string; value: number; color: string }[];
  size?: number;
  strokeWidth?: number;
  showLegend?: boolean;
}> = ({ data, size = 120, strokeWidth = 12, showLegend = true }) => {
  const total = data.reduce((sum, item) => sum + item.value, 0);
  let cumulativePercent = 0;

  const getCoordinatesForPercent = (percent: number) => {
    const x = Math.cos(2 * Math.PI * percent);
    const y = Math.sin(2 * Math.PI * percent);
    return `${x.toFixed(5)} ${y.toFixed(5)}`;
  };

  return (
    <div className="flex items-center gap-6">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="transform -rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={(size - strokeWidth) / 2}
            fill="none"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            className="text-slate-700"
          />
          {data.map((item, i) => {
            const percent = item.value / total;
            const start = cumulativePercent;
            cumulativePercent += percent;
            const dashArray = `${(percent * 100).toFixed(2)} ${((1 - percent) * 100).toFixed(2)}`;
            const dashOffset = (-start * 100).toFixed(2);

            return (
              <circle
                key={i}
                cx={size / 2}
                cy={size / 2}
                r={(size - strokeWidth) / 2}
                fill="none"
                stroke={item.color}
                strokeWidth={strokeWidth}
                strokeDasharray={dashArray}
                strokeDashoffset={dashOffset}
                strokeLinecap="round"
                className="transition-all duration-500"
              />
            );
          })}
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <div className="text-2xl font-bold">{formatNumber(total)}</div>
            <div className="text-xs text-slate-400">Total</div>
          </div>
        </div>
      </div>
      {showLegend && (
        <div className="flex flex-col gap-2">
          {data.slice(0, 5).map((item, i) => (
            <div key={i} className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: item.color }}
              />
              <span className="text-sm text-slate-300">{item.label}</span>
              <span className="text-xs text-slate-500 ml-auto">
                {((item.value / total) * 100).toFixed(1)}%
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const BarChart: React.FC<{
  data: { label: string; value: number; color?: string }[];
  maxValue?: number;
  height?: number;
  showValues?: boolean;
}> = ({ data, maxValue, height = 200, showValues = true }) => {
  const max = maxValue || Math.max(...data.map(d => d.value));

  return (
    <div className="flex items-end justify-between gap-2 h-full" style={{ height }}>
      {data.map((item, i) => {
        const barHeight = (item.value / max) * 100;
        return (
          <div key={i} className="flex-1 flex flex-col items-center gap-2">
            {showValues && (
              <div className="text-xs text-slate-400 font-medium">
                {formatNumber(item.value)}
              </div>
            )}
            <div className="w-full bg-slate-700/50 rounded-t relative" style={{ height: `${barHeight}%`, minHeight: "4px" }}>
              <div
                className="absolute inset-0 rounded-t transition-all duration-500"
                style={{ backgroundColor: item.color || "#06b6d4" }}
              />
            </div>
            <div className="text-xs text-slate-500 text-center truncate w-full">
              {item.label}
            </div>
          </div>
        );
      })}
    </div>
  );
};

const AreaChart: React.FC<{
  data: ChartDataPoint[];
  height?: number;
  color?: string;
  showGrid?: boolean;
  showTooltip?: boolean;
}> = ({ data, height = 200, color = "#06b6d4", showGrid = true, showTooltip = true }) => {
  if (!data.length) return null;

  const max = Math.max(...data.map(d => d.value));
  const min = Math.min(...data.map(d => d.value));
  const range = max - min || 1;
  const padding = { top: 10, right: 10, bottom: 30, left: 50 };
  const chartWidth = 100;
  const chartHeight = 100;

  const points = data.map((d, i) => {
    const x = (i / (data.length - 1)) * chartWidth;
    const y = chartHeight - ((d.value - min) / range) * chartHeight;
    return { x, y, ...d };
  });

  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
  const areaPath = `${linePath} L ${chartWidth} ${chartHeight} L 0 ${chartHeight} Z`;

  return (
    <div className="relative" style={{ height }}>
      <svg width="100%" height="100%" viewBox={`0 0 ${chartWidth} ${chartHeight}`} preserveAspectRatio="none">
        <defs>
          <linearGradient id={`area-gradient-${color.replace("#", "")}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.4" />
            <stop offset="100%" stopColor={color} stopOpacity="0.05" />
          </linearGradient>
        </defs>
        {showGrid && (
          <g className="grid-lines">
            {[0, 25, 50, 75, 100].map((percent) => (
              <line
                key={percent}
                x1={padding.left}
                y1={percent}
                x2={chartWidth - padding.right}
                y2={percent}
                stroke="currentColor"
                strokeOpacity="0.1"
              />
            ))}
          </g>
        )}
        <path d={areaPath} fill={`url(#area-gradient-${color.replace("#", "")})`} />
        <path
          d={linePath}
          fill="none"
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {points.map((p, i) => (
          <circle
            key={i}
            cx={p.x}
            cy={p.y}
            r="3"
            fill={color}
            className="opacity-0 hover:opacity-100 transition-opacity"
          />
        ))}
      </svg>
      <div className="absolute bottom-0 left-0 right-0 flex justify-between text-xs text-slate-500 px-2">
        <span>{data[0]?.date}</span>
        <span>{data[data.length - 1]?.date}</span>
      </div>
    </div>
  );
};

// ============================================================================
// SKELETON LOADERS
// ============================================================================

const LoadingSkeleton: React.FC<{ variant?: "card" | "chart" | "list" | "text" }> = ({
  variant = "text"
}) => {
  switch (variant) {
    case "card":
      return (
        <div className="space-y-3 p-4">
          <Skeleton className="h-4 w-1/3 bg-slate-700" />
          <Skeleton className="h-8 w-2/3 bg-slate-700" />
          <Skeleton className="h-3 w-1/2 bg-slate-700" />
        </div>
      );
    case "chart":
      return (
        <div className="space-y-3 p-4">
          <Skeleton className="h-4 w-1/4 bg-slate-700" />
          <Skeleton className="h-[150px] w-full bg-slate-700 rounded-lg" />
          <div className="flex justify-between">
            <Skeleton className="h-3 w-16 bg-slate-700" />
            <Skeleton className="h-3 w-16 bg-slate-700" />
            <Skeleton className="h-3 w-16 bg-slate-700" />
          </div>
        </div>
      );
    case "list":
      return (
        <div className="space-y-2 p-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-full bg-slate-700" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-3 w-3/4 bg-slate-700" />
                <Skeleton className="h-2 w-1/2 bg-slate-700" />
              </div>
            </div>
          ))}
        </div>
      );
    default:
      return <Skeleton className="h-4 w-full bg-slate-700" />;
  }
};

// ============================================================================
// METRIC CARDS
// ============================================================================

const MetricCard: React.FC<{
  title: string;
  value: string | number;
  change?: number;
  changeLabel?: string;
  icon: React.ReactNode;
  trend?: "up" | "down" | "neutral";
  className?: string;
}> = ({ title, value, change, changeLabel, icon, trend, className }) => {
  const getTrendColor = () => {
    if (trend === "up") return "text-emerald-500";
    if (trend === "down") return "text-red-500";
    return "text-slate-400";
  };

  const getChangeIcon = () => {
    if (trend === "up") return <ArrowUpRight className="h-3 w-3" />;
    if (trend === "down") return <ArrowDownRight className="h-3 w-3" />;
    return null;
  };

  return (
    <Card className={cn("bg-slate-800/50 border-slate-700/50 backdrop-blur-sm", className)}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-xs text-slate-400 font-medium">{title}</p>
            <p className="text-2xl font-bold text-white">{value}</p>
            {change !== undefined && (
              <div className={cn("flex items-center gap-1 text-xs", getTrendColor())}>
                {getChangeIcon()}
                <span>{change > 0 ? "+" : ""}{change.toFixed(2)}%</span>
                {changeLabel && <span className="text-slate-500 ml-1">{changeLabel}</span>}
              </div>
            )}
          </div>
          <div className="p-2 rounded-lg bg-slate-700/50 text-cyan-400">
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function AIFinancialAdvisorPro() {
  const [isOpen, setIsOpen] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState("overview");
  const [messages, setMessages] = React.useState<Message[]>([]);
  const [input, setInput] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [isExpanded, setIsExpanded] = React.useState(false);
  const [selectedTimeRange, setSelectedTimeRange] = React.useState<"1W" | "1M" | "3M" | "6M" | "1Y" | "ALL">("1M");
  const [activeChart, setActiveChart] = React.useState<"spending" | "income" | "savings" | "networth">("spending");
  const [showBalances, setShowBalances] = React.useState(true);

  // Data states
  const [transactions, setTransactions] = React.useState<Transaction[]>([]);
  const [budgets, setBudgets] = React.useState<Budget[]>([]);
  const [goals, setGoals] = React.useState<Goal[]>([]);
  const [userProfile, setUserProfile] = React.useState<UserProfile>({ country: "TZ", currency_preference: "TZS" });
  const [assets, setAssets] = React.useState<any[]>([]);
  const [dataLoaded, setDataLoaded] = React.useState(false);
  const [loadingStage, setLoadingStage] = React.useState("");

  // Analytics states
  const [portfolioMetrics, setPortfolioMetrics] = React.useState<PortfolioMetrics | null>(null);
  const [riskAssessment, setRiskAssessment] = React.useState<RiskAssessment | null>(null);
  const [retirementPlan, setRetirementPlan] = React.useState<RetirementPlan | null>(null);
  const [netWorthBreakdown, setNetWorthBreakdown] = React.useState<NetWorthBreakdown | null>(null);
  const [financialHealth, setFinancialHealth] = React.useState<FinancialHealth | null>(null);
  const [spendingCategories, setSpendingCategories] = React.useState<SpendingCategory[]>([]);
  const [recommendations, setRecommendations] = React.useState<InvestmentRecommendation[]>([]);
  const [chartData, setChartData] = React.useState<ChartDataPoint[]>([]);

  // API states
  const [stocks, setStocks] = React.useState<StockData[]>([]);
  const [stocksLoading, setStocksLoading] = React.useState(false);
  const [marketStatus, setMarketStatus] = React.useState(getMarketStatus());
  const [lastUpdated, setLastUpdated] = React.useState<string>("");

  const messagesEndRef = React.useRef<HTMLDivElement>(null);
  const chatContainerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (isOpen && !dataLoaded) {
      fetchAllData();
    }
  }, [isOpen]);

  React.useEffect(() => {
    if (messages.length > 0) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  // ============================================================================
  // DATA FETCHING
  // ============================================================================

  async function fetchAllData() {
    setLoadingStage("Connecting to server...");
    const user = await getUser();
    const userId = user?.id;
    if (!userId) {
      setLoadingStage("Error: User not authenticated");
      return;
    }

    try {
      setLoadingStage("Loading transactions...");
      const [transRes, budgetRes, goalsRes, profileRes, assetsRes] = await Promise.all([
        supabase.from('transactions').select('*').eq('user_id', userId).order('date', { ascending: false }).limit(500),
        supabase.from('budgets').select('*').eq('user_id', userId),
        supabase.from('goals').select('*').eq('user_id', userId),
        supabase.from('user_profiles').select('*').eq('id', userId).single(),
        supabase.from('user_assets').select('*').eq('user_id', userId),
      ]);

      if (transRes.data) setTransactions(transRes.data);
      if (budgetRes.data) setBudgets(budgetRes.data);
      if (goalsRes.data) setGoals(goalsRes.data);
      if (profileRes.data) setUserProfile(profileRes.data);
      if (assetsRes.data) setAssets(assetsRes.data);

      setLoadingStage("Analyzing spending patterns...");
      await new Promise(resolve => setTimeout(resolve, 300));

      setLoadingStage("Calculating portfolio metrics...");
      calculatePortfolioMetrics(transRes.data || [], assetsRes.data || []);
      await new Promise(resolve => setTimeout(resolve, 300));

      setLoadingStage("Assessing financial health...");
      calculateFinancialHealth(transRes.data || [], assetsRes.data || []);
      await new Promise(resolve => setTimeout(resolve, 300));

      setLoadingStage("Generating retirement projection...");
      calculateRetirementPlan(transRes.data || [], assetsRes.data || []);
      await new Promise(resolve => setTimeout(resolve, 300));

      setLoadingStage("Calculating net worth...");
      calculateNetWorth(assetsRes.data || []);
      await new Promise(resolve => setTimeout(resolve, 300));

      setLoadingStage("Analyzing spending categories...");
      analyzeSpendingCategories(transRes.data || []);
      await new Promise(resolve => setTimeout(resolve, 300));

      setLoadingStage("Generating investment recommendations...");
      generateRecommendations();
      await new Promise(resolve => setTimeout(resolve, 300));

      setLoadingStage("Fetching market data...");
      await fetchStocks(profileRes.data?.country || "US");
      await new Promise(resolve => setTimeout(resolve, 300));

      setLoadingStage("Building chart data...");
      buildChartData(transRes.data || []);

      setLoadingStage("Ready!");
      await new Promise(resolve => setTimeout(resolve, 500));

      setDataLoaded(true);

      // Initialize chat
      setMessages([{
        id: generateId(),
        role: "assistant",
        content: getWelcomeMessage(),
        timestamp: new Date(),
      }]);

    } catch (error) {
      console.error("Error fetching data:", error);
      setLoadingStage("Error loading data");
    }
  }

  async function fetchStocks(country: string) {
    setStocksLoading(true);
    try {
      const stockData = await getStocksForCountry(country);
      setStocks(stockData);
      setLastUpdated(getLastUpdatedTime());
    } catch (error) {
      console.error("Error fetching stocks:", error);
    } finally {
      setStocksLoading(false);
    }
  }

  // ============================================================================
  // CALCULATIONS & ANALYTICS
  // ============================================================================

  function calculatePortfolioMetrics(trans: Transaction[], assets: any[]) {
    const totalInvested = assets
      .filter(a => a.type === 'stocks' || a.type === 'investments')
      .reduce((sum, a) => sum + (parseFloat(a.balance) || 0), 0);

    const monthlyIncome = trans
      .filter(t => t.type === "income")
      .reduce((sum, t) => sum + Number(t.amount), 0);
    const monthlyExpenses = trans
      .filter(t => t.type === "expense")
      .reduce((sum, t) => sum + Number(t.amount), 0);

    const totalValue = totalInvested + (monthlyIncome - monthlyExpenses);
    const totalGainLoss = totalValue - totalInvested;
    const totalGainLossPercent = totalInvested > 0 ? (totalGainLoss / totalInvested) * 100 : 0;

    // Simulated daily/monthly changes (in production, compare to historical data)
    const dayChangePercent = (Math.random() - 0.5) * 4;
    const monthChangePercent = (Math.random() - 0.3) * 15;
    const yearChangePercent = (Math.random() - 0.2) * 30;

    setPortfolioMetrics({
      totalValue,
      totalInvested,
      totalGainLoss,
      totalGainLossPercent,
      dayChange: totalValue * (dayChangePercent / 100),
      dayChangePercent,
      monthlyReturn: monthChangePercent,
      yearlyReturn: yearChangePercent,
      volatility: Math.random() * 20 + 5,
      sharpeRatio: Math.random() * 2 + 0.5,
      maxDrawdown: Math.random() * 15 + 2,
    });
  }

  function calculateFinancialHealth(trans: Transaction[], assets: any[]) {
    const totalIncome = trans.filter(t => t.type === "income").reduce((sum, t) => sum + Number(t.amount), 0);
    const totalExpenses = trans.filter(t => t.type === "expense").reduce((sum, t) => sum + Number(t.amount), 0);
    const monthlyExpenses = totalExpenses / Math.max(1, trans.length / 30);

    const cashAssets = assets
      .filter(a => a.type === 'cash' || a.type === 'mobile_money' || a.type === 'bank')
      .reduce((sum, a) => sum + (parseFloat(a.balance) || 0), 0);

    const emergencyFundMonths = monthlyExpenses > 0 ? cashAssets / monthlyExpenses : 0;

    const totalDebt = assets
      .filter(a => a.type === 'liability' || a.type === 'loan')
      .reduce((sum, a) => sum + (parseFloat(a.balance) || 0), 0);

    const debtToIncomeRatio = totalIncome > 0 ? (totalDebt / totalIncome) * 100 : 0;
    const savingsRate = totalIncome > 0 ? ((totalIncome - totalExpenses) / totalIncome) * 100 : 0;

    // Calculate score (0-100)
    let score = 0;
    score += Math.min(25, emergencyFundMonths * 8); // Up to 25 points for 3+ months
    score += savingsRate >= 20 ? 25 : savingsRate >= 10 ? 15 : savingsRate >= 5 ? 10 : 5;
    score += debtToIncomeRatio <= 30 ? 25 : debtToIncomeRatio <= 50 ? 15 : debtToIncomeRatio <= 75 ? 10 : 0;
    score += totalIncome > 0 ? 25 : 0;

    const grade = score >= 90 ? "A" : score >= 75 ? "B" : score >= 60 ? "C" : score >= 40 ? "D" : "F";

    const insights: string[] = [];
    const recommendations: string[] = [];

    if (emergencyFundMonths < 3) {
      insights.push(`Only ${emergencyFundMonths.toFixed(1)} months of emergency fund (target: 3-6 months)`);
      recommendations.push(`Save ${formatCurrency(monthlyExpenses * 3 - cashAssets)} to reach 3-month emergency fund`);
    } else {
      insights.push(`Great! You have ${emergencyFundMonths.toFixed(1)} months of emergency savings`);
    }

    if (savingsRate < 20) {
      insights.push(`Savings rate is ${savingsRate.toFixed(1)}% (recommend: 20%+)`);
      recommendations.push(`Try to save ${formatCurrency(totalIncome * 0.2 - (totalIncome - totalExpenses))} more monthly`);
    } else {
      insights.push(`Excellent savings rate of ${savingsRate.toFixed(1)}%`);
    }

    if (debtToIncomeRatio > 40) {
      insights.push(`Debt-to-income ratio is ${debtToIncomeRatio.toFixed(1)}% (high)`);
      recommendations.push("Consider debt consolidation or payoff strategies");
    }

    setFinancialHealth({
      score,
      emergencyFundMonths,
      debtToIncomeRatio,
      savingsRate,
      creditUtilization: Math.random() * 50,
      paymentHistory: 85 + Math.random() * 15,
      grade: grade as any,
      insights,
      recommendations,
    });
  }

  function calculateRetirementPlan(trans: Transaction[], assets: any[]) {
    const currentAge = 30; // Would come from user profile
    const retirementAge = 60;
    const currentSavings = assets
      .filter(a => a.type === 'retirement' || a.type === 'pension')
      .reduce((sum, a) => sum + (parseFloat(a.balance) || 0), 0) || 100000;

    const monthlyIncome = trans
      .filter(t => t.type === "income")
      .reduce((sum, t) => sum + Number(t.amount), 0) / Math.max(1, trans.length / 30);

    const monthlyContribution = monthlyIncome * 0.15; // 15% of income
    const expectedReturn = 0.08; // 8% annual
    const inflationRate = 0.04; // 4% annual
    const yearsToRetirement = retirementAge - currentAge;
    const yearsOfRetirement = 25;

    // Future value calculation
    const monthlyRate = expectedReturn / 12;
    const monthsToRetirement = yearsToRetirement * 12;
    const projectedFund = currentSavings * Math.pow(1 + monthlyRate, monthsToRetirement) +
      (monthlyContribution * ((Math.pow(1 + monthlyRate, monthsToRetirement) - 1) / monthlyRate));

    // Target calculation (need 25x annual expenses)
    const annualExpenses = (trans.filter(t => t.type === "expense").reduce((sum, t) => sum + Number(t.amount), 0) / Math.max(1, trans.length / 365));
    const targetRetirementFund = annualExpenses * 25;

    // Monthly retirement income (4% rule)
    const monthlyRetirementIncome = (projectedFund * 0.04) / 12;

    setRetirementPlan({
      currentAge,
      retirementAge,
      currentSavings,
      monthlyContribution,
      expectedReturn,
      inflationRate,
      targetRetirementFund,
      projectedFund,
      onTrack: projectedFund >= targetRetirementFund,
      monthlyRetirementIncome,
      yearsOfRetirement,
    });
  }

  function calculateNetWorth(assets: any[]) {
    const breakdown: NetWorthBreakdown = {
      total: 0,
      assets: {
        cash: 0,
        bank: 0,
        mobileMoney: 0,
        investments: 0,
        property: 0,
        crypto: 0,
        other: 0,
      },
      liabilities: {
        loans: 0,
        creditCards: 0,
        mortgages: 0,
        other: 0,
      },
      netWorth: 0,
    };

    assets.forEach(asset => {
      const balance = parseFloat(asset.balance) || 0;
      breakdown.total += balance;

      switch (asset.type) {
        case 'cash':
          breakdown.assets.cash += balance;
          break;
        case 'bank':
          breakdown.assets.bank += balance;
          break;
        case 'mobile_money':
          breakdown.assets.mobileMoney += balance;
          break;
        case 'stocks':
        case 'investments':
          breakdown.assets.investments += balance;
          break;
        case 'property':
          breakdown.assets.property += balance;
          break;
        case 'crypto':
          breakdown.assets.crypto += balance;
          break;
        case 'liability':
        case 'loan':
          breakdown.liabilities.loans += balance;
          break;
        case 'credit_card':
          breakdown.liabilities.creditCards += balance;
          break;
        case 'mortgage':
          breakdown.liabilities.mortgages += balance;
          break;
        default:
          breakdown.assets.other += balance;
      }
    });

    breakdown.netWorth = breakdown.total - Object.values(breakdown.liabilities).reduce((a, b) => a + b, 0);
    setNetWorthBreakdown(breakdown);
  }

  function analyzeSpendingCategories(trans: Transaction[]) {
    const expenses = trans.filter(t => t.type === "expense");
    const totalExpenses = expenses.reduce((sum, t) => sum + Number(t.amount), 0);

    const categoryData: Record<string, number> = {};
    const categoryIcons: Record<string, React.ReactNode> = {
      food: <Utensils className="h-4 w-4" />,
      transport: <Plane className="h-4 w-4" />,
      entertainment: <Tv className="h-4 w-4" />,
      shopping: <ShoppingBag className="h-4 w-4" />,
      bills: <Zap className="h-4 w-4" />,
      health: <Heart className="h-4 w-4" />,
      education: <GraduationCap className="h-4 w-4" />,
      housing: <Home className="h-4 w-4" />,
    };
    const categoryColors = [
      "#06b6d4", "#8b5cf6", "#ec4899", "#f59e0b",
      "#10b981", "#3b82f6", "#ef4444", "#6366f1"
    ];

    expenses.forEach(t => {
      const cat = t.category?.toLowerCase() || "other";
      categoryData[cat] = (categoryData[cat] || 0) + Number(t.amount);
    });

    const categories: SpendingCategory[] = Object.entries(categoryData)
      .map(([category, amount], i) => ({
        category: category.charAt(0).toUpperCase() + category.slice(1),
        amount,
        percentage: totalExpenses > 0 ? (amount / totalExpenses) * 100 : 0,
        trend: Math.random() > 0.5 ? "up" : Math.random() > 0.5 ? "down" : "stable",
        trendPercentage: (Math.random() - 0.3) * 20,
        icon: categoryIcons[category] || <DollarSign className="h-4 w-4" />,
        color: categoryColors[i % categoryColors.length],
      }))
      .sort((a, b) => b.amount - a.amount);

    setSpendingCategories(categories);
  }

  function generateRecommendations() {
    const recs: InvestmentRecommendation[] = [
      {
        symbol: "NMB",
        name: "NMB Bank Plc",
        type: "stock",
        price: 510,
        change: 15.2,
        changePercent: 3.1,
        recommendation: "strong_buy",
        reasoning: "Strong dividend history, consistent growth, well-positioned in Tanzania's banking sector",
        riskLevel: "low",
        expectedReturn: 15,
        timeHorizon: "3-5 years",
        suitabilityScore: 85,
      },
      {
        symbol: "CRDB",
        name: "CRDB Bank Plc",
        type: "stock",
        price: 188,
        change: 4.5,
        changePercent: 2.5,
        recommendation: "buy",
        reasoning: "Government-linked, stable returns, good for conservative investors",
        riskLevel: "low",
        expectedReturn: 12,
        timeHorizon: "3-5 years",
        suitabilityScore: 78,
      },
      {
        symbol: "TBL",
        name: "Tanzania Breweries",
        type: "stock",
        price: 5200,
        change: -45,
        changePercent: -0.9,
        recommendation: "hold",
        reasoning: "Consumer staple with stable demand, moderate growth potential",
        riskLevel: "medium",
        expectedReturn: 8,
        timeHorizon: "2-3 years",
        suitabilityScore: 65,
      },
      {
        symbol: "SACCO",
        name: "Savings & Credit Cooperative",
        type: "savings",
        price: 0,
        change: 0,
        changePercent: 8,
        recommendation: "strong_buy",
        reasoning: "High interest rates (8-12% annually), accessible for small investors, community-based",
        riskLevel: "low",
        expectedReturn: 10,
        timeHorizon: "1-3 years",
        suitabilityScore: 92,
      },
      {
        symbol: "TREV",
        name: "T-REIT Real Estate Fund",
        type: "etf",
        price: 1250,
        change: 25,
        changePercent: 2.0,
        recommendation: "buy",
        reasoning: "Diversified real estate exposure, rental income potential, inflation hedge",
        riskLevel: "medium",
        expectedReturn: 14,
        timeHorizon: "5-7 years",
        suitabilityScore: 80,
      },
    ];

    setRecommendations(recs);
  }

  function buildChartData(trans: Transaction[]) {
    const now = new Date();
    const points: ChartDataPoint[] = [];

    for (let i = 30; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dayTrans = trans.filter(t => {
        const tDate = new Date(t.date);
        return tDate.toDateString() === date.toDateString();
      });

      const income = dayTrans.filter(t => t.type === "income").reduce((sum, t) => sum + Number(t.amount), 0);
      const expense = dayTrans.filter(t => t.type === "expense").reduce((sum, t) => sum + Number(t.amount), 0);
      const balance = income - expense;

      points.push({
        date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        value: balance + Math.random() * 10000,
      });
    }

    setChartData(points);
  }

  // ============================================================================
  // MESSAGE HANDLING
  // ============================================================================

  function getWelcomeMessage(): string {
    return `👋 Welcome to your AI Financial Advisor!

I've analyzed your complete financial profile and I'm ready to help you with:

**Portfolio Analysis**
• Real-time stock recommendations
• Risk assessment and diversification

**Financial Health**
• Your financial health score: ${financialHealth?.grade || 'N/A'}
• Emergency fund status: ${financialHealth?.emergencyFundMonths?.toFixed(1) || '0'} months
• Savings rate: ${financialHealth?.savingsRate?.toFixed(1) || '0'}%

**Planning Tools**
• Retirement projection
• Net worth breakdown
• Goal tracking

**Smart Recommendations**
• Personalized investment suggestions
• Spending optimization tips
• Debt management strategies

What would you like to explore today?`;
  }

  async function sendMessage() {
    if (!input.trim()) return;

    const userMessage: Message = {
      id: generateId(),
      role: "user",
      content: input,
      timestamp: new Date(),
    };

    setInput("");
    setMessages(prev => [...prev, userMessage]);
    setLoading(true);

    // Simulate AI thinking
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 1000));

    const response = await generateAIResponse(input);

    const assistantMessage: Message = {
      id: generateId(),
      role: "assistant",
      content: response.content,
      timestamp: new Date(),
      attachments: response.attachments,
    };

    setMessages(prev => [...prev, assistantMessage]);
    setLoading(false);
  }

  async function generateAIResponse(query: string): Promise<{ content: string; attachments?: Attachment[] }> {
    const lowerQuery = query.toLowerCase();

    // Smart routing based on query
    if (lowerQuery.includes("health") || lowerQuery.includes("score") || lowerQuery.includes("grade")) {
      return generateFinancialHealthResponse();
    }
    if (lowerQuery.includes("invest") || lowerQuery.includes("stock") || lowerQuery.includes("buy")) {
      return generateInvestmentResponse();
    }
    if (lowerQuery.includes("save") || lowerQuery.includes("saving")) {
      return generateSavingsResponse();
    }
    if (lowerQuery.includes("budget") || lowerQuery.includes("spend")) {
      return generateBudgetResponse();
    }
    if (lowerQuery.includes("retire") || lowerQuery.includes("pension")) {
      return generateRetirementResponse();
    }
    if (lowerQuery.includes("net worth") || lowerQuery.includes("asset")) {
      return generateNetWorthResponse();
    }
    if (lowerQuery.includes("debt") || lowerQuery.includes("loan")) {
      return generateDebtResponse();
    }
    if (lowerQuery.includes("goal") || lowerQuery.includes("target")) {
      return generateGoalResponse();
    }
    if (lowerQuery.includes("hello") || lowerQuery.includes("hi") || lowerQuery.includes("help")) {
      return { content: getWelcomeMessage() };
    }

    // Default: analyze query and provide contextual response
    return generateContextualResponse(query);
  }

  function generateFinancialHealthResponse(): { content: string; attachments?: Attachment[] } {
    const health = financialHealth;
    if (!health) return { content: "Unable to calculate financial health. Please ensure you have transaction data." };

    return {
      content: `📊 **Your Financial Health Report**

**Overall Score: ${health.score}/100** ${health.score >= 75 ? "✅" : health.score >= 50 ? "⚠️" : "❌"}

**Key Metrics:**
• Emergency Fund: ${health.emergencyFundMonths.toFixed(1)} months ${health.emergencyFundMonths >= 3 ? "✅" : "❌"}
• Savings Rate: ${health.savingsRate.toFixed(1)}% ${health.savingsRate >= 20 ? "✅" : "⚠️"}
• Debt-to-Income: ${health.debtToIncomeRatio.toFixed(1)}% ${health.debtToIncomeRatio <= 40 ? "✅" : "⚠️"}

${health.insights.length > 0 ? `\n**Key Insights:**\n${health.insights.map(i => `• ${i}`).join('\n')}` : ""}

${health.recommendations.length > 0 ? `\n**Action Items:**\n${health.recommendations.map(r => `• ${r}`).join('\n')}` : ""}

**Grade: ${health.grade}**

${health.grade === "A" || health.grade === "B" ? "🎉 Excellent financial health! Keep maintaining your good habits." : health.grade === "C" ? "📈 Room for improvement. Focus on the recommendations above." : "⚡ Let's work together to improve your financial health."}`,
      attachments: [{
        type: "chart",
        data: { score: health.score, grade: health.grade },
      }],
    };
  }

  function generateInvestmentResponse(): { content: string; attachments?: Attachment[] } {
    return {
      content: `📈 **Investment Opportunities for You**

Based on your profile and risk tolerance, here are my top recommendations:

**🏆 Top Picks:**
${recommendations.slice(0, 3).map((r, i) => `
${i + 1}. **${r.symbol}** - ${r.name}
   Price: ${formatCurrency(r.price)} | Change: ${r.changePercent > 0 ? "+" : ""}${r.changePercent.toFixed(2)}%
   Recommendation: ${r.recommendation.replace("_", " ").toUpperCase()}
   Expected Return: ${r.expectedReturn}% annually
   Risk: ${r.riskLevel.toUpperCase()}
   Why: ${r.reasoning}`).join('')}

**📋 Investment Strategy:**
• Diversify across 3-5 stocks
• Start with ${formatCurrency(50000)} minimum
• Hold for ${recommendations[0]?.timeHorizon || "3-5 years"}
• Reinvest dividends

**⚠️ Risk Disclaimer:** This is not financial advice. Always do your own research.

Would you like a detailed analysis of any specific stock?`,
      attachments: [{
        type: "recommendation",
        data: recommendations.slice(0, 3),
      }],
    };
  }

  function generateSavingsResponse(): { content: string; attachments?: Attachment[] } {
    const monthlyIncome = transactions
      .filter(t => t.type === "income")
      .reduce((sum, t) => sum + Number(t.amount), 0) / Math.max(1, transactions.length / 30);
    const monthlySavings = monthlyIncome * (financialHealth?.savingsRate || 0) / 100;
    const targetSavings = monthlyIncome * 0.2;

    return {
      content: `💰 **Savings Analysis**

**Current Status:**
• Monthly Income: ${formatCurrency(monthlyIncome)}
• Current Savings Rate: ${financialHealth?.savingsRate?.toFixed(1) || 0}%
• Monthly Savings: ${formatCurrency(monthlySavings)}
• Target Savings Rate: 20%
• Gap: ${formatCurrency(targetSavings - monthlySavings)}

**Savings Goals:**
${goals.slice(0, 3).map(g => {
  const remaining = Number(g.target_amount) - Number(g.saved_amount);
  const monthsLeft = remaining / monthlySavings;
  return `• ${g.name}: ${formatCurrency(Number(g.saved_amount))} / ${formatCurrency(Number(g.target_amount))}
  ${monthsLeft > 0 ? `  Estimated completion: ${monthsLeft.toFixed(1)} months` : "  ✅ Goal reached!"}`;
}).join('\n') || "No savings goals set. Consider creating one!"}

**Tips to Boost Savings:**
1. Automate transfers on payday
2. Track and reduce impulse purchases
3. Use the 24-hour rule for non-essential purchases
4. Cut unused subscriptions
5. Cook at home more often

Want help creating a savings plan?`,
    };
  }

  function generateBudgetResponse(): { content: string; attachments?: Attachment[] } {
    const totalIncome = transactions
      .filter(t => t.type === "income")
      .reduce((sum, t) => sum + Number(t.amount), 0);
    const totalExpenses = transactions
      .filter(t => t.type === "expense")
      .reduce((sum, t) => sum + Number(t.amount), 0);

    return {
      content: `📊 **Budget Breakdown**

**Income vs Expenses:**
• Total Income: ${formatCurrency(totalIncome)}
• Total Expenses: ${formatCurrency(totalExpenses)}
• Net: ${formatCurrency(totalIncome - totalExpenses)} ${totalIncome >= totalExpenses ? "✅" : "⚠️"}

**Spending by Category:**
${spendingCategories.slice(0, 5).map(c => `• ${c.category}: ${formatCurrency(c.amount)} (${c.percentage.toFixed(1)}%)
  ${c.trend === "up" ? "📈 "+ c.trendPercentage.toFixed(1) + "% vs last month" : c.trend === "down" ? "📉 " + c.trendPercentage.toFixed(1) + "% vs last month" : "➡️ Stable"}`).join('\n')}

**Recommended 50/30/20 Budget:**
• Needs (50%): ${formatCurrency(totalIncome * 0.5)} - Housing, food, transport
• Wants (30%): ${formatCurrency(totalIncome * 0.3)} - Entertainment, dining
• Savings (20%): ${formatCurrency(totalIncome * 0.2)} - Investments, emergency fund

${spendingCategories[0] && spendingCategories[0].percentage > 40 ? `⚠️ Warning: ${spendingCategories[0].category} is ${spendingCategories[0].percentage.toFixed(0)}% of expenses. Consider reducing.` : ""}`,
      attachments: [{
        type: "chart",
        data: { categories: spendingCategories.slice(0, 5) },
      }],
    };
  }

  function generateRetirementResponse(): { content: string; attachments?: Attachment[] } {
    const plan = retirementPlan;
    if (!plan) return { content: "Unable to calculate retirement plan. Please ensure you have sufficient financial data." };

    const progress = (plan.currentSavings / plan.targetRetirementFund) * 100;

    return {
      content: `🏖️ **Retirement Planning Report**

**Your Retirement Profile:**
• Current Age: ${plan.currentAge}
• Target Retirement Age: ${plan.retirementAge}
• Years Until Retirement: ${plan.retirementAge - plan.currentAge}

**Savings Status:**
• Current Retirement Savings: ${formatCurrency(plan.currentSavings)}
• Target Retirement Fund: ${formatCurrency(plan.targetRetirementFund)}
• Progress: ${progress.toFixed(1)}%

**Projections:**
• Expected Annual Return: ${(plan.expectedReturn * 100).toFixed(0)}%
• Expected Inflation: ${(plan.inflationRate * 100).toFixed(0)}%
• Projected Fund at Retirement: ${formatCurrency(plan.projectedFund)}
• Monthly Retirement Income: ${formatCurrency(plan.monthlyRetirementIncome)}
• Years of Retirement Funded: ${plan.yearsOfRetirement}

${plan.onTrack ? "✅ **You're on track!** Your projected savings will meet your retirement goals." : `⚠️ **Gap Identified:** You need ${formatCurrency(plan.targetRetirementFund - plan.projectedFund)} more to reach your goal.

**Options to Close the Gap:**
1. Increase monthly contribution by ${formatCurrency((plan.targetRetirementFund - plan.projectedFund) / ((plan.retirementAge - plan.currentAge) * 12))}
2. Delay retirement by ${Math.ceil((plan.targetRetirementFund - plan.projectedFund) / (plan.monthlyContribution * 12))} years
3. Adjust retirement lifestyle expectations`}

Want to explore different scenarios?`,
    };
  }

  function generateNetWorthResponse(): { content: string; attachments?: Attachment[] } {
    const nw = netWorthBreakdown;
    if (!nw) return { content: "Unable to calculate net worth. Please ensure your assets are tracked." };

    return {
      content: `💎 **Net Worth Analysis**

**Total Net Worth: ${formatCurrency(nw.netWorth)}**

**📈 Assets (${formatCurrency(nw.total)}):**
• Cash on Hand: ${formatCurrency(nw.assets.cash)}
• Bank Accounts: ${formatCurrency(nw.assets.bank)}
• Mobile Money: ${formatCurrency(nw.assets.mobileMoney)}
• Investments: ${formatCurrency(nw.assets.investments)}
• Property: ${formatCurrency(nw.assets.property)}
• Crypto: ${formatCurrency(nw.assets.crypto)}
• Other: ${formatCurrency(nw.assets.other)}

**📉 Liabilities:**
• Loans: ${formatCurrency(nw.liabilities.loans)}
• Credit Cards: ${formatCurrency(nw.liabilities.creditCards)}
• Mortgages: ${formatCurrency(nw.liabilities.mortgages)}
• Other: ${formatCurrency(nw.liabilities.other)}

**💡 Net Worth Breakdown:**
• Assets: ${formatCurrency(nw.total)}
• Liabilities: ${formatCurrency(Object.values(nw.liabilities).reduce((a, b) => a + b, 0))}
• **Net Worth: ${formatCurrency(nw.netWorth)}**

**Tips:**
${nw.assets.investments < nw.total * 0.2 ? "• Consider allocating more to investments for growth\n" : ""}
${nw.liabilities.loans > 0 ? "• Prioritize paying off high-interest debt\n" : ""}
${nw.assets.cash < nw.total * 0.1 ? "• Build up cash reserves for emergencies\n" : ""}`,
    };
  }

  function generateDebtResponse(): { content: string; attachments?: Attachment[] } {
    const debtTotal = netWorthBreakdown?.liabilities ?
      Object.values(netWorthBreakdown.liabilities).reduce((a, b) => a + b, 0) : 0;

    return {
      content: `📋 **Debt Management Strategy**

${debtTotal > 0 ? `**Your Current Debt:** ${formatCurrency(debtTotal)}

**Payoff Strategies:**

**1. Avalanche Method (Recommended)**
• Pay off highest interest debt first
• Save the most money on interest
• Best for financially disciplined individuals

**2. Snowball Method**
• Pay off smallest debts first
• Quick wins for motivation
• Best for building habits

**3. Hybrid Approach**
• Use snowball for first 2-3 debts
• Switch to avalanche for the rest
• Combines motivation with savings

**Debt Priority Order:**
1. High-interest loans (>15%): Pay minimum + extra
2. Credit cards: Target full payoff
3. SACCO loans: Standard rates
4. mortgages: Low priority if rates < 10%

**Tips:**
• Never borrow to invest
• Keep debt payments under 30% of income
• Build emergency fund before aggressive payoff
• Consider balance transfers for credit card debt` : "✅ Great news! You have no tracked debt. Keep it that way!"}

Want help creating a debt payoff plan?`,
    };
  }

  function generateGoalResponse(): { content: string; attachments?: Attachment[] } {
    return {
      content: `🎯 **Financial Goals Status**

${goals.length > 0 ? goals.map(g => {
  const remaining = Number(g.target_amount) - Number(g.saved_amount);
  const progress = (Number(g.saved_amount) / Number(g.target_amount)) * 100;
  const daysLeft = Math.ceil((new Date(g.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  const monthlyRequired = remaining / Math.max(1, daysLeft / 30);

  return `**${g.name}**
• Progress: ${progress.toFixed(1)}%
• Saved: ${formatCurrency(Number(g.saved_amount))} / ${formatCurrency(Number(g.target_amount))}
• Remaining: ${formatCurrency(remaining)}
• ${daysLeft > 0 ? `Days left: ${daysLeft}` : "Deadline passed!"}
• Monthly required: ${formatCurrency(monthlyRequired)}
• Status: ${progress >= 50 ? "✅ On Track" : progress >= 25 ? "⚠️ At Risk" : "❌ Behind"}
`;
}).join('\n') : "No savings goals yet. Let's create one!"}

**Quick Goal Ideas:**
• Emergency Fund (3-6 months expenses)
• Dream Vacation
• New Car
• House Down Payment
• Child's Education
• Retirement Top-up

Shall I help you create or adjust any goals?`,
    };
  }

  function generateContextualResponse(query: string): { content: string; attachments?: Attachment[] } {
    return {
      content: `🤔 **Let me help you with that**

Based on your query about "${query}", here's what I found:

**Summary:**
${financialHealth ? `• Financial Health Score: ${financialHealth.score}/100 (Grade ${financialHealth.grade})
• Net Worth: ${formatCurrency(netWorthBreakdown?.netWorth || 0)}
• Savings Rate: ${financialHealth.savingsRate.toFixed(1)}%
• Emergency Fund: ${financialHealth.emergencyFundMonths.toFixed(1)} months` : "Loading your financial data..."}

**What I can help with:**
• 💰 "How's my savings?"
• 📊 "Show my budget breakdown"
• 📈 "What stocks should I buy?"
• 🏖️ "Am I on track for retirement?"
• 💎 "What's my net worth?"
• 🎯 "How are my goals progressing?"
• 💳 "Help me manage debt"

Just ask me any of these questions or type your specific concern!`,
    };
  }

  // ============================================================================
  // RENDER FUNCTIONS
  // ============================================================================

  function renderOverview() {
    if (!dataLoaded) {
      return (
        <div className="p-6 space-y-4">
          <div className="flex items-center gap-3">
            <Sparkles className="h-5 w-5 text-violet-400 animate-pulse" />
            <span className="text-slate-300">{loadingStage}</span>
          </div>
          <LoadingSkeleton variant="chart" />
          <LoadingSkeleton variant="card" />
          <LoadingSkeleton variant="card" />
        </div>
      );
    }

    return (
      <div className="space-y-4 p-4">
        {/* Quick Stats */}
        <div className="grid grid-cols-2 gap-3">
          <MetricCard
            title="Net Worth"
            value={showBalances ? formatCurrency(netWorthBreakdown?.netWorth || 0) : "••••••"}
            change={12.5}
            changeLabel="vs last month"
            icon={<Wallet className="h-5 w-5" />}
            trend="up"
          />
          <MetricCard
            title="Health Score"
            value={`${financialHealth?.score || 0}/100`}
            icon={<Heart className="h-5 w-5" />}
            className={cn(getGradeColor(financialHealth?.grade || "F"))}
          />
        </div>

        {/* Portfolio Performance */}
        <Card className="bg-slate-800/50 border-slate-700/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-slate-300">Portfolio Performance</h3>
              <div className="flex gap-1">
                {["1W", "1M", "3M"].map((range) => (
                  <Button
                    key={range}
                    size="sm"
                    variant={selectedTimeRange === range ? "default" : "ghost"}
                    onClick={() => setSelectedTimeRange(range as any)}
                    className="h-7 text-xs"
                  >
                    {range}
                  </Button>
                ))}
              </div>
            </div>
            <div className="h-[120px]">
              <AreaChart
                data={chartData}
                height={120}
                color="#06b6d4"
              />
            </div>
            <div className="flex justify-between mt-2 text-xs">
              <span className="text-emerald-500">+{portfolioMetrics?.monthlyReturn?.toFixed(1) || 0}% this month</span>
              <span className="text-slate-400">+{portfolioMetrics?.yearlyReturn?.toFixed(1) || 0}% this year</span>
            </div>
          </CardContent>
        </Card>

        {/* Financial Health */}
        <Card className="bg-slate-800/50 border-slate-700/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-slate-300">Financial Health</h3>
              <Badge className={getGradeColor(financialHealth?.grade || "F")}>
                Grade {financialHealth?.grade || "N/A"}
              </Badge>
            </div>
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-400">Emergency Fund</span>
                  <span className="text-slate-300">{financialHealth?.emergencyFundMonths?.toFixed(1) || 0} months</span>
                </div>
                <Progress
                  value={Math.min(100, ((financialHealth?.emergencyFundMonths || 0) / 6) * 100)}
                  className="h-2 bg-slate-700"
                />
              </div>
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-400">Savings Rate</span>
                  <span className="text-slate-300">{financialHealth?.savingsRate?.toFixed(1) || 0}%</span>
                </div>
                <Progress
                  value={Math.min(100, (financialHealth?.savingsRate || 0))}
                  className="h-2 bg-slate-700"
                />
              </div>
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-400">Debt-to-Income</span>
                  <span className="text-slate-300">{financialHealth?.debtToIncomeRatio?.toFixed(1) || 0}%</span>
                </div>
                <Progress
                  value={Math.min(100, (financialHealth?.debtToIncomeRatio || 0))}
                  className="h-2 bg-slate-700"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <div className="grid grid-cols-4 gap-2">
          {[
            { icon: <TrendingUp className="h-4 w-4" />, label: "Invest", color: "text-emerald-400" },
            { icon: <PiggyBank className="h-4 w-4" />, label: "Save", color: "text-cyan-400" },
            { icon: <Target className="h-4 w-4" />, label: "Goals", color: "text-amber-400" },
            { icon: <Shield className="h-4 w-4" />, label: "Protect", color: "text-violet-400" },
          ].map((action, i) => (
            <Button
              key={i}
              variant="ghost"
              className="flex flex-col items-center gap-1 h-auto py-3"
            >
              <span className={action.color}>{action.icon}</span>
              <span className="text-xs text-slate-400">{action.label}</span>
            </Button>
          ))}
        </div>
      </div>
    );
  }

  function renderPortfolio() {
    return (
      <div className="space-y-4 p-4">
        {/* Portfolio Value */}
        <Card className="bg-gradient-to-br from-slate-800 to-slate-900 border-slate-700/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-400">Total Portfolio Value</p>
                <p className="text-3xl font-bold text-white">
                  {showBalances ? formatCurrency(portfolioMetrics?.totalValue || 0) : "••••••"}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <span className={portfolioMetrics?.totalGainLossPercent && portfolioMetrics.totalGainLossPercent >= 0 ? "text-emerald-400" : "text-red-400"}>
                    {portfolioMetrics?.totalGainLossPercent && portfolioMetrics.totalGainLossPercent >= 0 ? "+" : ""}
                    {formatCurrency(portfolioMetrics?.totalGainLoss || 0)}
                  </span>
                  <Badge variant="outline" className={portfolioMetrics?.totalGainLossPercent && portfolioMetrics.totalGainLossPercent >= 0 ? "border-emerald-500/30 text-emerald-400" : "border-red-500/30 text-red-400"}>
                    {portfolioMetrics?.totalGainLossPercent && portfolioMetrics.totalGainLossPercent >= 0 ? "+" : ""}
                    {portfolioMetrics?.totalGainLossPercent?.toFixed(2)}%
                  </Badge>
                </div>
              </div>
              <div className="text-right">
                <SparklineChart
                  data={chartData.map(d => d.value)}
                  color={portfolioMetrics?.totalGainLossPercent && portfolioMetrics.totalGainLossPercent >= 0 ? "#10b981" : "#ef4444"}
                  height={60}
                  width={120}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 gap-3">
          <MetricCard
            title="Day Change"
            value={showBalances ? formatCurrency(portfolioMetrics?.dayChange || 0) : "••••"}
            change={portfolioMetrics?.dayChangePercent}
            icon={<TrendingUp className="h-4 w-4" />}
            trend={portfolioMetrics?.dayChangePercent && portfolioMetrics.dayChangePercent >= 0 ? "up" : "down"}
          />
          <MetricCard
            title="Sharpe Ratio"
            value={portfolioMetrics?.sharpeRatio?.toFixed(2) || "0.00"}
            icon={<BarChart3 className="h-4 w-4" />}
            trend="neutral"
          />
          <MetricCard
            title="Volatility"
            value={`${portfolioMetrics?.volatility?.toFixed(1) || 0}%`}
            icon={<Wind className="h-4 w-4" />}
            trend="neutral"
          />
          <MetricCard
            title="Max Drawdown"
            value={`-${portfolioMetrics?.maxDrawdown?.toFixed(1) || 0}%`}
            icon={<TrendingDown className="h-4 w-4" />}
            trend="down"
          />
        </div>

        {/* Allocation */}
        <Card className="bg-slate-800/50 border-slate-700/50">
          <CardContent className="p-4">
            <h3 className="text-sm font-medium text-slate-300 mb-3">Asset Allocation</h3>
            <DonutChart
              data={[
                { label: "Stocks", value: netWorthBreakdown?.assets.investments || 0, color: "#06b6d4" },
                { label: "Cash", value: (netWorthBreakdown?.assets.cash || 0) + (netWorthBreakdown?.assets.bank || 0), color: "#10b981" },
                { label: "Mobile", value: netWorthBreakdown?.assets.mobileMoney || 0, color: "#8b5cf6" },
                { label: "Property", value: netWorthBreakdown?.assets.property || 0, color: "#f59e0b" },
                { label: "Crypto", value: netWorthBreakdown?.assets.crypto || 0, color: "#ec4899" },
              ]}
              size={100}
              strokeWidth={10}
            />
          </CardContent>
        </Card>
      </div>
    );
  }

  function renderAnalytics() {
    return (
      <div className="space-y-4 p-4">
        {/* Chart Selector */}
        <div className="flex gap-2 overflow-x-auto pb-2">
          {[
            { id: "spending", label: "Spending", icon: <CreditCard className="h-4 w-4" /> },
            { id: "income", label: "Income", icon: <DollarSign className="h-4 w-4" /> },
            { id: "savings", label: "Savings", icon: <PiggyBank className="h-4 w-4" /> },
            { id: "networth", label: "Net Worth", icon: <Wallet className="h-4 w-4" /> },
          ].map((chart) => (
            <Button
              key={chart.id}
              size="sm"
              variant={activeChart === chart.id ? "default" : "outline"}
              onClick={() => setActiveChart(chart.id as any)}
              className="flex items-center gap-2 whitespace-nowrap"
            >
              {chart.icon}
              {chart.label}
            </Button>
          ))}
        </div>

        {/* Main Chart */}
        <Card className="bg-slate-800/50 border-slate-700/50">
          <CardContent className="p-4">
            <h3 className="text-sm font-medium text-slate-300 mb-3">
              {activeChart === "spending" && "Spending Trends"}
              {activeChart === "income" && "Income Trends"}
              {activeChart === "savings" && "Savings Trends"}
              {activeChart === "networth" && "Net Worth Trends"}
            </h3>
            <div className="h-[180px]">
              <AreaChart
                data={chartData}
                height={180}
                color={activeChart === "spending" ? "#ef4444" : activeChart === "income" ? "#10b981" : "#06b6d4"}
              />
            </div>
          </CardContent>
        </Card>

        {/* Spending Breakdown */}
        <Card className="bg-slate-800/50 border-slate-700/50">
          <CardContent className="p-4">
            <h3 className="text-sm font-medium text-slate-300 mb-3">Top Spending Categories</h3>
            <div className="space-y-3">
              {spendingCategories.slice(0, 5).map((cat, i) => (
                <div key={i} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-md" style={{ backgroundColor: `${cat.color}20`, color: cat.color }}>
                        {cat.icon}
                      </div>
                      <span className="text-slate-300">{cat.category}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-white font-medium">{formatCurrency(cat.amount)}</span>
                      <Badge variant="outline" className="text-xs">
                        {cat.percentage.toFixed(1)}%
                      </Badge>
                    </div>
                  </div>
                  <Progress value={cat.percentage} className="h-1.5 bg-slate-700" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Insights */}
        <Card className="bg-gradient-to-br from-violet-900/20 to-purple-900/20 border-violet-500/20">
          <CardContent className="p-4">
            <h3 className="text-sm font-medium text-violet-300 mb-3 flex items-center gap-2">
              <Lightbulb className="h-4 w-4" />
              AI Insights
            </h3>
            <div className="space-y-2 text-sm text-slate-300">
              {financialHealth?.insights.map((insight, i) => (
                <div key={i} className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                  <span>{insight}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  function renderPlanning() {
    return (
      <div className="space-y-4 p-4">
        {/* Retirement Card */}
        <Card className="bg-gradient-to-br from-emerald-900/30 to-teal-900/30 border-emerald-500/30">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-emerald-300 flex items-center gap-2">
                <Target className="h-4 w-4" />
                Retirement Plan
              </h3>
              <Badge className={retirementPlan?.onTrack ? "bg-emerald-500/20 text-emerald-400" : "bg-amber-500/20 text-amber-400"}>
                {retirementPlan?.onTrack ? "On Track" : "Needs Attention"}
              </Badge>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between items-end">
                <div>
                  <p className="text-xs text-slate-400">Projected Fund</p>
                  <p className="text-2xl font-bold text-white">
                    {showBalances ? formatCurrency(retirementPlan?.projectedFund || 0) : "••••••"}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-slate-400">Target</p>
                  <p className="text-lg font-semibold text-slate-300">
                    {showBalances ? formatCurrency(retirementPlan?.targetRetirementFund || 0) : "••••"}
                  </p>
                </div>
              </div>
              <Progress
                value={retirementPlan ? (retirementPlan.projectedFund / retirementPlan.targetRetirementFund) * 100 : 0}
                className="h-2 bg-slate-700"
              />
              <div className="flex justify-between text-xs text-slate-400">
                <span>{retirementPlan?.currentAge} years old</span>
                <span>Retirement at {retirementPlan?.retirementAge}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Goals */}
        <Card className="bg-slate-800/50 border-slate-700/50">
          <CardContent className="p-4">
            <h3 className="text-sm font-medium text-slate-300 mb-3 flex items-center gap-2">
              <Trophy className="h-4 w-4 text-amber-400" />
              Savings Goals
            </h3>
            <div className="space-y-3">
              {goals.length > 0 ? goals.slice(0, 3).map((goal, i) => {
                const progress = (Number(goal.saved_amount) / Number(goal.target_amount)) * 100;
                return (
                  <div key={i} className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-300">{goal.name}</span>
                      <span className="text-slate-400">{progress.toFixed(0)}%</span>
                    </div>
                    <Progress value={progress} className="h-2 bg-slate-700" />
                    <div className="flex justify-between text-xs text-slate-500">
                      <span>{formatCurrency(Number(goal.saved_amount))}</span>
                      <span>{formatCurrency(Number(goal.target_amount))}</span>
                    </div>
                  </div>
                );
              }) : (
                <div className="text-center py-4 text-slate-400">
                  <Target className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No goals yet</p>
                  <p className="text-xs">Create your first savings goal!</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Emergency Fund */}
        <Card className="bg-slate-800/50 border-slate-700/50">
          <CardContent className="p-4">
            <h3 className="text-sm font-medium text-slate-300 mb-3 flex items-center gap-2">
              <Umbrella className="h-4 w-4 text-cyan-400" />
              Emergency Fund
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between items-end">
                <div>
                  <p className="text-xs text-slate-400">Current Coverage</p>
                  <p className="text-2xl font-bold text-white">
                    {financialHealth?.emergencyFundMonths?.toFixed(1) || 0} months
                  </p>
                </div>
                <Badge variant="outline" className={financialHealth?.emergencyFundMonths && financialHealth.emergencyFundMonths >= 3 ? "border-emerald-500/30 text-emerald-400" : "border-amber-500/30 text-amber-400"}>
                  Target: 3-6 months
                </Badge>
              </div>
              <Progress
                value={financialHealth ? Math.min(100, (financialHealth.emergencyFundMonths / 6) * 100) : 0}
                className="h-2 bg-slate-700"
              />
            </div>
          </CardContent>
        </Card>

        {/* Net Worth Summary */}
        <Card className="bg-slate-800/50 border-slate-700/50">
          <CardContent className="p-4">
            <h3 className="text-sm font-medium text-slate-300 mb-3 flex items-center gap-2">
              <Wallet className="h-4 w-4 text-violet-400" />
              Net Worth Summary
            </h3>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Total Assets</span>
                <span className="text-emerald-400 font-medium">
                  {showBalances ? formatCurrency(netWorthBreakdown?.total || 0) : "••••"}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Total Liabilities</span>
                <span className="text-red-400 font-medium">
                  {showBalances ? formatCurrency(Object.values(netWorthBreakdown?.liabilities || {}).reduce((a, b) => a + b, 0)) : "••••"}
                </span>
              </div>
              <div className="border-t border-slate-700 pt-2 flex justify-between text-sm">
                <span className="text-slate-300 font-medium">Net Worth</span>
                <span className="text-white font-bold">
                  {showBalances ? formatCurrency(netWorthBreakdown?.netWorth || 0) : "••••"}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  function renderInvest() {
    return (
      <div className="space-y-4 p-4">
        {/* Market Status */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className={marketStatus.isOpen ? "border-emerald-500/30 text-emerald-400" : "border-slate-500/30 text-slate-400"}>
              <span className={cn("w-2 h-2 rounded-full mr-2", marketStatus.isOpen ? "bg-emerald-400 animate-pulse" : "bg-slate-500")} />
              {marketStatus.isOpen ? "Market Open" : "Market Closed"}
            </Badge>
            {lastUpdated && (
              <span className="text-xs text-slate-500">Updated {lastUpdated}</span>
            )}
          </div>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => fetchStocks(userProfile.country || "US")}
            disabled={stocksLoading}
            className="text-cyan-400 hover:text-cyan-300"
          >
            <RefreshCw className={cn("h-4 w-4", stocksLoading && "animate-spin")} />
          </Button>
        </div>

        {/* Top Recommendations */}
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-slate-300">Top Recommendations</h3>
          {recommendations.map((rec, i) => (
            <Card key={i} className="bg-slate-800/50 border-slate-700/50 hover:border-slate-600/50 transition-colors">
              <CardContent className="p-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-white">{rec.symbol}</span>
                      <Badge className={cn(
                        "text-xs",
                        rec.recommendation === "strong_buy" ? "bg-emerald-500/20 text-emerald-400" :
                        rec.recommendation === "buy" ? "bg-cyan-500/20 text-cyan-400" :
                        "bg-slate-500/20 text-slate-400"
                      )}>
                        {rec.recommendation.replace("_", " ")}
                      </Badge>
                      <Badge variant="outline" className={cn(
                        "text-xs",
                        rec.riskLevel === "low" ? "border-emerald-500/30 text-emerald-400" :
                        rec.riskLevel === "medium" ? "border-amber-500/30 text-amber-400" :
                        "border-red-500/30 text-red-400"
                      )}>
                        {rec.riskLevel} risk
                      </Badge>
                    </div>
                    <p className="text-xs text-slate-400 mt-1">{rec.name}</p>
                    <p className="text-xs text-slate-500 mt-2 line-clamp-2">{rec.reasoning}</p>
                  </div>
                  <div className="text-right ml-3">
                    {rec.price > 0 && (
                      <>
                        <p className="text-lg font-bold text-white">{formatCurrency(rec.price)}</p>
                        <p className={cn("text-sm", rec.changePercent >= 0 ? "text-emerald-400" : "text-red-400")}>
                          {rec.changePercent >= 0 ? "+" : ""}{rec.changePercent.toFixed(2)}%
                        </p>
                      </>
                    )}
                    <p className="text-xs text-slate-500 mt-2">Exp: {rec.expectedReturn}%</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Stocks List */}
        {stocksLoading ? (
          <LoadingSkeleton variant="list" />
        ) : (
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-slate-300">Market Stocks</h3>
            {stocks.map((stock, i) => (
              <div key={i} className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-white">{stock.symbol}</span>
                    <Badge variant="outline" className="text-xs text-slate-400">{stock.sector}</Badge>
                  </div>
                  <p className="text-xs text-slate-500">{stock.name}</p>
                </div>
                <div className="text-right">
                  <p className="font-medium text-white">{stock.currency} {stock.price.toLocaleString()}</p>
                  <p className={cn("text-sm", stock.changePercent >= 0 ? "text-emerald-400" : "text-red-400")}>
                    {stock.changePercent >= 0 ? "+" : ""}{stock.changePercent.toFixed(2)}%
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* AI Tip */}
        <Card className="bg-gradient-to-br from-violet-900/30 to-purple-900/30 border-violet-500/20">
          <CardContent className="p-4">
            <h4 className="text-sm font-medium text-violet-300 mb-2 flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              AI Investment Tip
            </h4>
            <p className="text-xs text-slate-400">
              Based on your {financialHealth?.savingsRate?.toFixed(0)}% savings rate and {financialHealth?.riskTolerance || 'moderate'} risk tolerance,
              consider allocating {formatCurrency((netWorthBreakdown?.netWorth || 0) * 0.3)} (30% of net worth)
              to diversified investments for long-term growth.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  function renderChat() {
    return (
      <div className="flex flex-col h-full">
        <div ref={chatContainerRef} className="flex-1 overflow-y-auto space-y-4 p-4">
          {messages.map((msg) => (
            <div key={msg.id} className={cn("flex", msg.role === "user" ? "justify-end" : "justify-start")}>
              <div className={cn(
                "max-w-[85%] rounded-2xl px-4 py-3",
                msg.role === "user"
                  ? "bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white"
                  : "bg-slate-800 text-slate-100 border border-slate-700",
                msg.role === "system" && "bg-amber-900/20 text-amber-200 border-amber-500/20 text-sm"
              )}>
                <div className="text-sm whitespace-pre-wrap">{msg.content}</div>
                <div className="text-[10px] text-slate-500 mt-1">
                  {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-slate-800 rounded-2xl px-4 py-3 border border-slate-700">
                <div className="flex items-center gap-2">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                  <span className="text-sm text-slate-400">Analyzing...</span>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="p-4 border-t border-slate-700">
          <form onSubmit={(e) => { e.preventDefault(); sendMessage(); }} className="flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about investments, savings, budget..."
              disabled={loading}
              className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
            />
            <Button
              type="submit"
              disabled={loading || !input.trim()}
              className="bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </form>
          <div className="flex flex-wrap gap-2 mt-2">
            {["💰 Savings?", "📊 My budget", "📈 Best stocks?", "🏖️ Retirement?"].map((suggestion, i) => (
              <button
                key={i}
                onClick={() => setInput(suggestion.replace(/[^\w\s?]/g, ''))}
                className="text-xs text-slate-400 hover:text-slate-200 bg-slate-800/50 px-2 py-1 rounded-full transition-colors"
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ============================================================================
  // MAIN RENDER
  // ============================================================================

  return (
    <TooltipProvider>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <Button className="bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white shadow-lg shadow-violet-500/25 relative overflow-hidden">
            <Sparkles className="mr-2 h-4 w-4" />
            AI Advisor
            <span className="absolute top-1 right-1 w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
          </Button>
        </DialogTrigger>
        <DialogContent className={cn(
          "p-0 gap-0 bg-slate-900 border-slate-700",
          isExpanded ? "max-w-4xl w-[95vw] h-[90vh]" : "max-w-2xl w-[95vw] h-[700px]"
        )}>
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-slate-700 bg-slate-800/50">
            <DialogTitle className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500">
                <Sparkles className="h-5 w-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">AI Financial Advisor</h2>
                <p className="text-xs text-slate-400">Powered by advanced analytics</p>
              </div>
            </DialogTitle>
            <div className="flex items-center gap-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowBalances(!showBalances)}
                    className="text-slate-400 hover:text-white"
                  >
                    {showBalances ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{showBalances ? "Hide balances" : "Show balances"}</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="text-slate-400 hover:text-white"
                  >
                    {isExpanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{isExpanded ? "Minimize" : "Expand"}</TooltipContent>
              </Tooltip>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
            <TabsList className="w-full justify-start rounded-none border-b border-slate-700 bg-slate-800/50 p-0 h-auto">
              {[
                { value: "overview", label: "Overview", icon: <Brain className="h-4 w-4" /> },
                { value: "portfolio", label: "Portfolio", icon: <PieChart className="h-4 w-4" /> },
                { value: "analytics", label: "Analytics", icon: <BarChart3 className="h-4 w-4" /> },
                { value: "planning", label: "Planning", icon: <Target className="h-4 w-4" /> },
                { value: "invest", label: "Invest", icon: <TrendingUp className="h-4 w-4" /> },
                { value: "chat", label: "Chat", icon: <MessageSquare className="h-4 w-4" /> },
              ].map((tab) => (
                <TabsTrigger
                  key={tab.value}
                  value={tab.value}
                  className="flex items-center gap-2 px-4 py-3 rounded-none border-b-2 border-transparent data-[state=active]:border-violet-500 data-[state=active]:bg-slate-800/50 text-slate-400 data-[state=active]:text-white hover:text-slate-200"
                >
                  {tab.icon}
                  <span className="hidden sm:inline">{tab.label}</span>
                </TabsTrigger>
              ))}
            </TabsList>

            {/* Tab Content */}
            <div className="flex-1 overflow-y-auto">
              <TabsContent value="overview" className="m-0 h-full">
                {renderOverview()}
              </TabsContent>
              <TabsContent value="portfolio" className="m-0 h-full">
                {renderPortfolio()}
              </TabsContent>
              <TabsContent value="analytics" className="m-0 h-full">
                {renderAnalytics()}
              </TabsContent>
              <TabsContent value="planning" className="m-0 h-full">
                {renderPlanning()}
              </TabsContent>
              <TabsContent value="invest" className="m-0 h-full">
                {renderInvest()}
              </TabsContent>
              <TabsContent value="chat" className="m-0 h-full">
                {renderChat()}
              </TabsContent>
            </div>
          </Tabs>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  );
}

// Missing icons that need to be imported
function MessageSquare(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}

function Utensils(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2" />
      <path d="M7 2v20" />
      <path d="M21 15V2v0a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7" />
    </svg>
  );
}

function Tv(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect width="20" height="15" x="2" y="7" rx="2" ry="2" />
      <polyline points="17 2 12 7 7 2" />
    </svg>
  );
}

function ShoppingBag(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
      <path d="M3 6h18" />
      <path d="M16 10a4 4 0 0 1-8 0" />
    </svg>
  );
}

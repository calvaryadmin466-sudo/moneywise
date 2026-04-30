"use client";

import * as React from "react";
import { Sparkles, X, Send, Loader2, TrendingUp, PiggyBank, Globe, Target, Brain, ArrowUpRight, ArrowDownRight, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { getUser, gqlRequest, formatCurrency, Transaction, Budget, Goal } from "@/lib/nhost";
import { StockData, getStocksForCountry, getMarketStatus } from "@/lib/stocks";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface UserProfile {
  country: string;
  currency_preference: string;
}

// DSE Stock Data (Tanzania)
const DSE_STOCKS = {
  TZ: [
    { symbol: "NMB", name: "NMB Bank Plc", price: "2,500 TZS", change: "+5.2%", sector: "Banking", recommendation: "BUY" },
    { symbol: "CRDB", name: "CRDB Bank Plc", price: "180 TZS", change: "+3.8%", sector: "Banking", recommendation: "BUY" },
    { symbol: "TCCL", name: "Tanga Cement", price: "550 TZS", change: "+2.1%", sector: "Manufacturing", recommendation: "HOLD" },
    { symbol: "SWIS", name: "Swissport Tanzania", price: "1,800 TZS", change: "-1.2%", sector: "Aviation", recommendation: "HOLD" },
    { symbol: "TOL", name: "TOL Gases", price: "700 TZS", change: "+4.5%", sector: "Industrial", recommendation: "BUY" },
    { symbol: "PAL", name: "Precision Air", price: "120 TZS", change: "+8.2%", sector: "Aviation", recommendation: "SPECULATIVE" },
    { symbol: "TTP", name: "Tanzania Tea Packers", price: "450 TZS", change: "+1.8%", sector: "Consumer", recommendation: "HOLD" },
    { symbol: "TBL", name: "Tanzania Breweries", price: "3,200 TZS", change: "+2.9%", sector: "Consumer", recommendation: "BUY" },
  ],
  // Kenya - NSE
  KE: [
    { symbol: "SCOM", name: "Safaricom PLC", price: "KES 17.50", change: "+3.2%", sector: "Telecom", recommendation: "BUY" },
    { symbol: "EQTY", name: "Equity Group", price: "KES 48.20", change: "+5.1%", sector: "Banking", recommendation: "BUY" },
    { symbol: "KCB", name: "KCB Group", price: "KES 42.80", change: "+2.8%", sector: "Banking", recommendation: "BUY" },
    { symbol: "COOP", name: "Co-operative Bank", price: "KES 18.90", change: "+1.5%", sector: "Banking", recommendation: "HOLD" },
    { symbol: "BAT", name: "BAT Kenya", price: "KES 480", change: "-0.5%", sector: "Consumer", recommendation: "HOLD" },
    { symbol: "EABL", name: "East African Breweries", price: "KES 165", change: "+2.1%", sector: "Consumer", recommendation: "BUY" },
  ],
  // Uganda - USE
  UG: [
    { symbol: "SBU", name: "Stanbic Bank Uganda", price: "UGX 28", change: "+4.2%", sector: "Banking", recommendation: "BUY" },
    { symbol: "UMEM", name: "Umeme Ltd", price: "UGX 220", change: "+1.8%", sector: "Utilities", recommendation: "HOLD" },
    { symbol: "NVL", name: "New Vision", price: "UGX 380", change: "+2.5%", sector: "Media", recommendation: "HOLD" },
  ],
  // Nigeria - NGX
  NG: [
    { symbol: "GTCO", name: "GT Bank", price: "₦42.50", change: "+3.8%", sector: "Banking", recommendation: "BUY" },
    { symbol: "ZENITH", name: "Zenith Bank", price: "₦38.20", change: "+2.9%", sector: "Banking", recommendation: "BUY" },
    { symbol: "DANGCEM", name: "Dangote Cement", price: "₦380", change: "+1.2%", sector: "Manufacturing", recommendation: "BUY" },
    { symbol: "MTNN", name: "MTN Nigeria", price: "₦225", change: "+4.5%", sector: "Telecom", recommendation: "BUY" },
  ],
  // South Africa - JSE
  ZA: [
    { symbol: "SHP", name: "Shoprite Holdings", price: "R289", change: "+3.2%", sector: "Retail", recommendation: "BUY" },
    { symbol: "FSR", name: "FirstRand Bank", price: "R72", change: "+2.1%", sector: "Banking", recommendation: "BUY" },
    { symbol: "ABG", name: "Absa Group", price: "R198", change: "+1.8%", sector: "Banking", recommendation: "HOLD" },
    { symbol: "NED", name: "Nedbank", price: "R245", change: "+0.9%", sector: "Banking", recommendation: "HOLD" },
  ],
  // US
  US: [
    { symbol: "AAPL", name: "Apple Inc", price: "$189", change: "+2.1%", sector: "Technology", recommendation: "BUY" },
    { symbol: "MSFT", name: "Microsoft", price: "$378", change: "+1.8%", sector: "Technology", recommendation: "BUY" },
    { symbol: "NVDA", name: "NVIDIA", price: "$495", change: "+5.2%", sector: "Technology", recommendation: "HOLD" },
    { symbol: "JPM", name: "JPMorgan Chase", price: "$172", change: "+1.2%", sector: "Banking", recommendation: "BUY" },
    { symbol: "V", name: "Visa Inc", price: "$265", change: "+0.8%", sector: "Financial", recommendation: "BUY" },
  ],
};

// Land Investment Opportunities by Country
const LAND_OPPORTUNITIES = {
  TZ: [
    { location: "Kigamboni, Dar es Salaam", type: "Residential", price: "50,000-80,000 TZS/sqm", roi: "15-20%", trend: "High demand for beachfront properties" },
    { location: "Bunju, Dar es Salaam", type: "Mixed Use", price: "35,000-50,000 TZS/sqm", roi: "12-18%", trend: "Rapid urbanization" },
    { location: "Arusha City Center", type: "Commercial", price: "100,000-150,000 TZS/sqm", roi: "18-25%", trend: "Tourism hub growth" },
    { location: "Mwanza Nyegezi", type: "Residential", price: "40,000-60,000 TZS/sqm", roi: "10-15%", trend: "Port city expansion" },
    { location: "Dodoma Capital", type: "Government", price: "25,000-40,000 TZS/sqm", roi: "20-30%", trend: "Capital city relocation" },
  ],
  KE: [
    { location: "Athi River, Nairobi", type: "Industrial", price: "KES 8-12M/acre", roi: "15-22%", trend: "Eastern Bypass development" },
    { location: "Kitengela", type: "Residential", price: "KES 3-5M/acre", roi: "12-18%", trend: "Satellite town growth" },
    { location: "Mombasa North Coast", type: "Tourism", price: "KES 15-25M/acre", roi: "10-15%", trend: "Tourism recovery" },
    { location: "Kisumu Dunga", type: "Lakefront", price: "KES 2-4M/acre", roi: "18-25%", trend: "Lakeside development" },
  ],
  UG: [
    { location: "Entebbe Road", type: "Residential", price: "UGX 150-250M/acre", roi: "12-18%", trend: "Airport expansion" },
    { location: "Mukono", type: "Mixed Use", price: "UGX 80-120M/acre", roi: "15-20%", trend: "Industrial park growth" },
    { location: "Jinja Njeru", type: "Industrial", price: "UGX 60-100M/acre", roi: "10-15%", trend: "Dam development" },
  ],
  NG: [
    { location: "Epe, Lagos", type: "Residential", price: "₦5-15M/plot", roi: "25-40%", trend: "Lekki-Epe corridor" },
    { location: "Ibeju-Lekki", type: "Industrial", price: "₦3-8M/plot", roi: "20-35%", trend: "Dangote refinery effect" },
    { location: "Abuja Lugbe", type: "Residential", price: "₦8-15M/plot", roi: "15-25%", trend: "Airport city development" },
  ],
  ZA: [
    { location: "Cape Town Atlantic Seaboard", type: "Luxury", price: "R50-100M", roi: "8-12%", trend: "Premium market" },
    { location: "Pretoria East", type: "Residential", price: "R3-8M", roi: "10-15%", trend: "Family homes demand" },
    { location: "Ballito, KZN", type: "Coastal", price: "R2-5M", roi: "12-18%", trend: "Remote work trend" },
  ],
};

export function AIFinancialAdvisorV2() {
  const [isOpen, setIsOpen] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState("chat");
  const [messages, setMessages] = React.useState<Message[]>([
    { role: "assistant", content: "Hi! I'm your AI financial advisor. I can analyze your spending patterns, forecast your financial future, and suggest investment opportunities. What would you like to explore?" }
  ]);
  const [input, setInput] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [transactions, setTransactions] = React.useState<Transaction[]>([]);
  const [budgets, setBudgets] = React.useState<Budget[]>([]);
  const [goals, setGoals] = React.useState<Goal[]>([]);
  const [userProfile, setUserProfile] = React.useState<UserProfile>({ country: "TZ", currency_preference: "TZS" });
  const [dataLoaded, setDataLoaded] = React.useState(false);
  const [behaviorAnalysis, setBehaviorAnalysis] = React.useState<any>(null);
  const [forecasts, setForecasts] = React.useState<any>(null);
  const [stocks, setStocks] = React.useState<StockData[]>([]);
  const [stocksLoading, setStocksLoading] = React.useState(false);
  const [marketStatus, setMarketStatus] = React.useState(getMarketStatus());

  React.useEffect(() => {
    if (isOpen && !dataLoaded) {
      fetchUserData();
    }
  }, [isOpen]);

  async function fetchUserData() {
    const user = await getUser();
    const userId = user?.id;
    if (!userId) return;

    const [transRes, budgetRes, goalsRes, profileRes] = await Promise.all([
      gqlRequest(`query { transactions(where: {user_id: {_eq: "${userId}"}}, order_by: {date: desc}, limit: 100) { id type amount category date note } }`),
      gqlRequest(`query { budgets(where: {user_id: {_eq: "${userId}"}}) { id category monthly_limit month } }`),
      gqlRequest(`query { goals(where: {user_id: {_eq: "${userId}"}}) { id name target_amount saved_amount deadline } }`),
      gqlRequest(`query { user_profiles_by_pk(id: "${userId}") { country currency_preference } }`),
    ]);

    if (transRes.data?.transactions) setTransactions(transRes.data.transactions);
    if (budgetRes.data?.budgets) setBudgets(budgetRes.data.budgets);
    if (goalsRes.data?.goals) setGoals(goalsRes.data.goals);
    if (profileRes.data?.user_profiles_by_pk) {
      setUserProfile(profileRes.data.user_profiles_by_pk);
    }

    // Analyze behavior and generate forecasts
    analyzeBehavior(transRes.data?.transactions || []);
    generateForecasts(transRes.data?.transactions || [], goalsRes.data?.goals || []);
    
    // Fetch stocks for user's country
    await fetchStocks(profileRes.data?.user_profiles_by_pk?.country || "US");
    
    setDataLoaded(true);
  }

  async function fetchStocks(country: string) {
    setStocksLoading(true);
    try {
      const stockData = await getStocksForCountry(country);
      setStocks(stockData);
    } catch (error) {
      console.error("Error fetching stocks:", error);
    } finally {
      setStocksLoading(false);
    }
  }

  function analyzeBehavior(trans: Transaction[]) {
    if (trans.length === 0) return;

    const expenses = trans.filter(t => t.type === "expense");
    const income = trans.filter(t => t.type === "income");
    
    // Spending patterns by day of week
    const dayOfWeekSpending = [0, 0, 0, 0, 0, 0, 0]; // Sun-Sat
    expenses.forEach(t => {
      const day = new Date(t.date).getDay();
      dayOfWeekSpending[day] += Number(t.amount);
    });

    // Spending patterns by time of month
    const earlyMonth = expenses.filter(t => new Date(t.date).getDate() <= 10).reduce((sum, t) => sum + Number(t.amount), 0);
    const midMonth = expenses.filter(t => {
      const d = new Date(t.date).getDate();
      return d > 10 && d <= 20;
    }).reduce((sum, t) => sum + Number(t.amount), 0);
    const endMonth = expenses.filter(t => new Date(t.date).getDate() > 20).reduce((sum, t) => sum + Number(t.amount), 0);

    // Category analysis
    const categories: Record<string, number> = {};
    expenses.forEach(t => {
      categories[t.category] = (categories[t.category] || 0) + Number(t.amount);
    });
    const topCategories = Object.entries(categories)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    // Impulse spending detection (unusual amounts)
    const avgExpense = expenses.reduce((sum, t) => sum + Number(t.amount), 0) / expenses.length;
    const impulseSpends = expenses.filter(t => Number(t.amount) > avgExpense * 3);

    setBehaviorAnalysis({
      dayOfWeekSpending,
      timeOfMonth: { early: earlyMonth, mid: midMonth, end: endMonth },
      topCategories,
      impulseSpends: impulseSpends.length,
      avgTransaction: avgExpense,
      totalTransactions: trans.length,
    });
  }

  function generateForecasts(trans: Transaction[], userGoals: Goal[]) {
    if (trans.length === 0) return;

    const monthlyIncome = trans
      .filter(t => t.type === "income")
      .reduce((sum, t) => sum + Number(t.amount), 0) / Math.max(1, trans.length / 30);
    
    const monthlyExpenses = trans
      .filter(t => t.type === "expense")
      .reduce((sum, t) => sum + Number(t.amount), 0) / Math.max(1, trans.length / 30);

    const monthlySavings = monthlyIncome - monthlyExpenses;
    
    // 6-month projection
    const projections = [];
    let accumulatedSavings = 0;
    for (let i = 1; i <= 6; i++) {
      accumulatedSavings += monthlySavings;
      projections.push({
        month: i,
        savings: accumulatedSavings,
        goalsAchievable: userGoals.filter(g => accumulatedSavings >= (Number(g.target_amount) - Number(g.saved_amount))).length,
      });
    }

    // Goal timeline predictions
    const goalForecasts = userGoals.map(g => {
      const remaining = Number(g.target_amount) - Number(g.saved_amount);
      const monthsToGoal = monthlySavings > 0 ? Math.ceil(remaining / monthlySavings) : null;
      return {
        name: g.name,
        target: g.target_amount,
        saved: g.saved_amount,
        monthsToGoal,
        onTrack: monthsToGoal && g.deadline ? monthsToGoal <= Math.ceil((new Date(g.deadline).getTime() - Date.now()) / (30 * 24 * 60 * 60 * 1000)) : null,
      };
    });

    setForecasts({
      monthlyIncome,
      monthlyExpenses,
      monthlySavings,
      sixMonthProjections: projections,
      goalForecasts,
      savingsRate: monthlyIncome > 0 ? (monthlySavings / monthlyIncome) * 100 : 0,
    });
  }

  function getInvestmentContext() {
    const country = userProfile?.country || "TZ";
    const stocks = DSE_STOCKS[country as keyof typeof DSE_STOCKS] || DSE_STOCKS.TZ;
    const land = LAND_OPPORTUNITIES[country as keyof typeof LAND_OPPORTUNITIES] || LAND_OPPORTUNITIES.TZ;
    
    return { stocks, land, country };
  }

  function getUserContext() {
    const totalIncome = transactions.filter(t => t.type === "income").reduce((sum, t) => sum + Number(t.amount), 0);
    const totalExpenses = transactions.filter(t => t.type === "expense").reduce((sum, t) => sum + Number(t.amount), 0);
    const balance = totalIncome - totalExpenses;

    const { stocks, land, country } = getInvestmentContext();

    return `
User's Financial Summary:
- Total Income: ${formatCurrency(totalIncome)}
- Total Expenses: ${formatCurrency(totalExpenses)}
- Current Balance: ${formatCurrency(balance)}
- Country: ${country}
- Savings Rate: ${forecasts?.savingsRate?.toFixed(1)}%

Investment Options Available:
Stocks (${country}): ${stocks.map(s => `${s.symbol} (${s.recommendation})`).join(", ")}

Real Estate Opportunities: ${land.map(l => `${l.location} (ROI: ${l.roi})`).join(", ")}

Provide practical, actionable financial advice including specific investment recommendations based on the user's country and financial situation.
`;
  }

  async function sendMessage() {
    if (!input.trim()) return;
    
    const userMessage = input;
    setInput("");
    setMessages(prev => [...prev, { role: "user", content: userMessage }]);
    setLoading(true);

    try {
      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${process.env.NEXT_PUBLIC_OPENROUTER_API_KEY || process.env.OPENROUTER_API_KEY}`,
          "HTTP-Referer": "https://moneywise.app",
          "X-Title": "MoneyWise",
        },
        body: JSON.stringify({
          model: "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free",
          messages: [
            { role: "system", content: "You are an expert financial advisor AI with deep knowledge of African markets, especially DSE (Tanzania), NSE (Kenya), USE (Uganda), and NGX (Nigeria). Provide specific investment advice including stock recommendations and real estate opportunities based on the user's country and financial data." },
            { role: "system", content: getUserContext() },
            ...messages.map(m => ({ role: m.role, content: m.content })),
            { role: "user", content: userMessage }
          ],
          max_tokens: 800,
        }),
      });

      const data = await response.json();
      const assistantMessage = data.choices?.[0]?.message?.content || "Sorry, I couldn't generate a response. Please try again.";
      
      setMessages(prev => [...prev, { role: "assistant", content: assistantMessage }]);
    } catch (error) {
      console.error("AI Error:", error);
      setMessages(prev => [...prev, { role: "assistant", content: "Sorry, I encountered an error. Please try again." }]);
    }

    setLoading(false);
  }

  function renderBehaviorAnalysis() {
    if (!behaviorAnalysis) return <div className="p-4 text-gray-400">No data available</div>;

    const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const maxSpend = Math.max(...behaviorAnalysis.dayOfWeekSpending);

    return (
      <div className="space-y-4 p-4">
        <div className="grid grid-cols-7 gap-1">
          {behaviorAnalysis.dayOfWeekSpending.map((amount: number, i: number) => (
            <div key={i} className="text-center">
              <div className="text-xs text-gray-400 mb-1">{weekDays[i]}</div>
              <div 
                className="rounded-t bg-gradient-to-t from-cyan-500 to-blue-500 transition-all"
                style={{ height: `${Math.max(20, (amount / maxSpend) * 80)}px` }}
              />
              <div className="text-[10px] text-gray-500">{formatCurrency(amount).replace(",000", "k")}</div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-3 gap-2 text-center">
          <Card className="bg-[#1e293b]/50">
            <CardContent className="p-3">
              <div className="text-xs text-gray-400">Early Month</div>
              <div className="text-lg font-semibold text-cyan-400">{formatCurrency(behaviorAnalysis.timeOfMonth.early)}</div>
            </CardContent>
          </Card>
          <Card className="bg-[#1e293b]/50">
            <CardContent className="p-3">
              <div className="text-xs text-gray-400">Mid Month</div>
              <div className="text-lg font-semibold text-blue-400">{formatCurrency(behaviorAnalysis.timeOfMonth.mid)}</div>
            </CardContent>
          </Card>
          <Card className="bg-[#1e293b]/50">
            <CardContent className="p-3">
              <div className="text-xs text-gray-400">End Month</div>
              <div className="text-lg font-semibold text-purple-400">{formatCurrency(behaviorAnalysis.timeOfMonth.end)}</div>
            </CardContent>
          </Card>
        </div>

        <div>
          <h4 className="text-sm font-medium text-gray-300 mb-2 flex items-center gap-2">
            <Brain className="h-4 w-4 text-violet-400" /> Insights
          </h4>
          <ul className="space-y-2 text-sm text-gray-400">
            {behaviorAnalysis.impulseSpends > 0 && (
              <li className="flex items-start gap-2">
                <span className="text-amber-400">⚠️</span>
                Detected {behaviorAnalysis.impulseSpends} large impulse purchases (3x above average)
              </li>
            )}
            <li className="flex items-start gap-2">
              <span className="text-cyan-400">💡</span>
              Highest spending day: {weekDays[behaviorAnalysis.dayOfWeekSpending.indexOf(maxSpend)]}
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-400">📊</span>
              Average transaction: {formatCurrency(behaviorAnalysis.avgTransaction)}
            </li>
          </ul>
        </div>
      </div>
    );
  }

  function renderForecasts() {
    if (!forecasts) return <div className="p-4 text-gray-400">No forecast data</div>;

    return (
      <div className="space-y-4 p-4">
        <div className="grid grid-cols-2 gap-2">
          <Card className="bg-gradient-to-br from-green-500/20 to-emerald-500/20 border-green-500/30">
            <CardContent className="p-3">
              <div className="text-xs text-green-400">Monthly Income</div>
              <div className="text-xl font-bold text-white">{formatCurrency(forecasts.monthlyIncome * 30)}</div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-red-500/20 to-rose-500/20 border-red-500/30">
            <CardContent className="p-3">
              <div className="text-xs text-red-400">Monthly Expenses</div>
              <div className="text-xl font-bold text-white">{formatCurrency(forecasts.monthlyExpenses * 30)}</div>
            </CardContent>
          </Card>
        </div>

        <div>
          <h4 className="text-sm font-medium text-gray-300 mb-2">6-Month Savings Projection</h4>
          <div className="space-y-2">
            {forecasts.sixMonthProjections.map((proj: any) => (
              <div key={proj.month} className="flex items-center gap-2">
                <span className="text-xs text-gray-400 w-12">Month {proj.month}</span>
                <div className="flex-1 h-6 bg-[#1e293b] rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full transition-all"
                    style={{ width: `${Math.min(100, (proj.savings / Math.max(...forecasts.sixMonthProjections.map((p: any) => p.savings))) * 100)}%` }}
                  />
                </div>
                <span className="text-xs font-medium text-cyan-400">{formatCurrency(proj.savings)}</span>
              </div>
            ))}
          </div>
        </div>

        {forecasts.goalForecasts.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-gray-300 mb-2 flex items-center gap-2">
              <Target className="h-4 w-4 text-amber-400" /> Goal Forecasts
            </h4>
            <div className="space-y-2">
              {forecasts.goalForecasts.map((goal: any, i: number) => (
                <div key={i} className="flex items-center justify-between p-2 bg-[#1e293b]/50 rounded-lg">
                  <div>
                    <div className="text-sm text-gray-300">{goal.name}</div>
                    <div className="text-xs text-gray-500">{formatCurrency(goal.saved)} / {formatCurrency(goal.target)}</div>
                  </div>
                  {goal.monthsToGoal ? (
                    <Badge className={goal.onTrack ? "bg-green-500/20 text-green-400" : "bg-amber-500/20 text-amber-400"}>
                      {goal.monthsToGoal} months
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-red-400">N/A</Badge>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  function renderInvestments() {
    const { land } = getInvestmentContext();

    return (
      <div className="space-y-4 p-4 max-h-[400px] overflow-y-auto">
        <div>
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-medium text-gray-300 flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-green-400" /> Stock Recommendations
            </h4>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className={marketStatus.isOpen ? "text-green-400 border-green-400/30" : "text-gray-400 border-gray-400/30"}>
                {marketStatus.isOpen ? "Market Open" : "Market Closed"}
              </Badge>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => fetchStocks(userProfile.country || "US")}
                disabled={stocksLoading}
                className="h-7 px-2 text-cyan-400 hover:text-cyan-300"
              >
                {stocksLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
              </Button>
            </div>
          </div>
          
          {stocksLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-cyan-400" />
            </div>
          ) : stocks.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">No stock data available</p>
          ) : (
            <div className="space-y-2">
              {stocks.map((stock, i) => (
                <div key={i} className="flex items-center justify-between p-3 bg-[#1e293b]/50 rounded-lg">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-white">{stock.symbol}</span>
                      <Badge 
                        className={
                          stock.changePercent > 0 ? "bg-green-500/20 text-green-400" :
                          stock.changePercent < 0 ? "bg-red-500/20 text-red-400" :
                          "bg-amber-500/20 text-amber-400"
                        }
                      >
                        {stock.changePercent > 0 ? "BUY" : stock.changePercent < -2 ? "HOLD" : "NEUTRAL"}
                      </Badge>
                    </div>
                    <div className="text-xs text-gray-400">{stock.name} • {stock.sector}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium text-white">
                      {stock.currency} {stock.price.toLocaleString()}
                    </div>
                    <div className={`text-xs flex items-center gap-1 ${stock.change >= 0 ? "text-green-400" : "text-red-400"}`}>
                      {stock.change >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                      {stock.changePercent.toFixed(2)}%
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <h4 className="text-sm font-medium text-gray-300 mb-2 flex items-center gap-2">
            <Globe className="h-4 w-4 text-blue-400" /> Real Estate Opportunities
          </h4>
          <div className="space-y-2">
            {land.map((property, i) => (
              <div key={i} className="p-3 bg-[#1e293b]/50 rounded-lg">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium text-white">{property.location}</span>
                  <Badge variant="outline" className="text-cyan-400">{property.type}</Badge>
                </div>
                <div className="text-xs text-gray-400 mb-1">{property.price}</div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-green-400">ROI: {property.roi}</span>
                  <span className="text-gray-500">|</span>
                  <span className="text-amber-400">{property.trend}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="p-3 bg-violet-500/10 border border-violet-500/30 rounded-lg">
          <h4 className="text-sm font-medium text-violet-400 mb-1 flex items-center gap-2">
            <PiggyBank className="h-4 w-4" /> AI Investment Tip
          </h4>
          <p className="text-xs text-gray-400">
            Based on your savings rate of {forecasts?.savingsRate?.toFixed(1)}%, consider investing 
            {forecasts?.monthlySavings && forecasts.monthlySavings > 0 ? ` ${formatCurrency(forecasts.monthlySavings * 0.3)} monthly` : ""} in a mix of {userProfile.country === "TZ" ? "DSE" : userProfile.country === "KE" ? "NSE" : userProfile.country === "NG" ? "NGX" : ""} blue-chip stocks and land banking for optimal returns.
          </p>
        </div>
      </div>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button className="bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:from-violet-400 hover:to-fuchsia-400 text-white shadow-lg">
          <Sparkles className="mr-2 h-4 w-4" />
          AI Advisor
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] h-[650px] flex flex-col p-0 gap-0">
        <DialogHeader className="p-4 border-b border-white/10">
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-violet-500" />
            AI Financial Advisor
          </DialogTitle>
        </DialogHeader>
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
          <TabsList className="grid grid-cols-4 mx-4 mt-2">
            <TabsTrigger value="chat">Chat</TabsTrigger>
            <TabsTrigger value="behavior">Behavior</TabsTrigger>
            <TabsTrigger value="forecast">Forecast</TabsTrigger>
            <TabsTrigger value="invest">Invest</TabsTrigger>
          </TabsList>

          <TabsContent value="chat" className="flex-1 flex flex-col m-0 mt-2">
            <div className="flex-1 overflow-y-auto space-y-4 p-4">
              {messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[80%] rounded-lg p-3 ${
                    msg.role === "user" 
                      ? "bg-violet-600 text-white" 
                      : "bg-[#1e293b] text-gray-300"
                  }`}>
                    <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex justify-start">
                  <div className="bg-[#1e293b] rounded-lg p-3">
                    <Loader2 className="h-4 w-4 animate-spin text-violet-400" />
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-white/10">
              <form onSubmit={(e) => { e.preventDefault(); sendMessage(); }} className="flex gap-2">
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask about investments, stocks, or advice..."
                  disabled={loading}
                  className="bg-[#1e293b] border-white/10"
                />
                <Button type="submit" disabled={loading || !input.trim()} className="bg-violet-600">
                  <Send className="h-4 w-4" />
                </Button>
              </form>
            </div>
          </TabsContent>

          <TabsContent value="behavior" className="flex-1 m-0 overflow-hidden">
            {renderBehaviorAnalysis()}
          </TabsContent>

          <TabsContent value="forecast" className="flex-1 m-0 overflow-hidden">
            {renderForecasts()}
          </TabsContent>

          <TabsContent value="invest" className="flex-1 m-0 overflow-hidden">
            {renderInvestments()}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

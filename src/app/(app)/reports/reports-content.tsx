"use client";

import * as React from "react";
import { Doughnut, Bar, Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Filler,
  Title,
} from "chart.js";
import { Download, Calendar, BarChart3, TrendingUp, PieChart, FileText, FileSpreadsheet, CalendarRange, Printer, X, Wallet } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Label } from "@/components/ui/label";
import { supabase, getUser } from "@/lib/supabase";
import { formatCurrency, Currency, Transaction, CATEGORIES, Budget, Goal, Debt, Asset } from "@/lib/finance";
import { useSearchParams } from "next/navigation";
import { exportFinancialPDF, exportWorkbook, exportTransactionsCSV } from "@/lib/export";
import { useToast } from "@/hooks/use-toast";

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, LineElement, PointElement, Filler, Title);

type RangeMode = "month" | "custom";

export default function ReportsContent() {
  const searchParams = useSearchParams();
  const currency = (searchParams.get("currency") as Currency) || "TZS";
  const { toast } = useToast();

  const [transactions, setTransactions] = React.useState<Transaction[]>([]);
  const [budgets, setBudgets] = React.useState<Budget[]>([]);
  const [goals, setGoals] = React.useState<Goal[]>([]);
  const [debts, setDebts] = React.useState<Debt[]>([]);
  const [assets, setAssets] = React.useState<Asset[]>([]);
  const [loading, setLoading] = React.useState(true);

  const [rangeMode, setRangeMode] = React.useState<RangeMode>("month");
  const [selectedMonth, setSelectedMonth] = React.useState<string>(
    new Date().toISOString().slice(0, 7)
  );
  const [rangeStart, setRangeStart] = React.useState<string>("");
  const [rangeEnd, setRangeEnd] = React.useState<string>("");
  const [trendMonths, setTrendMonths] = React.useState<number>(6);

  React.useEffect(() => {
    fetchTransactions();
  }, []);

  async function fetchTransactions() {
    setLoading(true);
    const user = await getUser();
    const userId = user?.id;
    if (!userId) {
      setLoading(false);
      return;
    }
    const [transRes, assetsRes, budgetsRes, goalsRes, debtsRes] = await Promise.all([
      supabase
        .from('transactions')
        .select('*')
        .eq('user_id', userId)
        .order('date', { ascending: false }),
      supabase.from('user_assets').select('*').eq('user_id', userId),
      supabase.from('budgets').select('*').eq('user_id', userId),
      Promise.resolve(supabase.from('savings_goals').select('*').eq('user_id', userId)).catch(() => ({ data: [] as any[] })),
      Promise.resolve(supabase.from('debts').select('*').eq('user_id', userId)).catch(() => ({ data: [] as any[] })),
    ]);

    if (transRes.data) setTransactions(transRes.data);
    if (assetsRes.data) setAssets(assetsRes.data);
    if (budgetsRes.data) setBudgets(budgetsRes.data);
    if (goalsRes && (goalsRes as any).data) setGoals((goalsRes as any).data);
    if (debtsRes && (debtsRes as any).data) setDebts((debtsRes as any).data);
    setLoading(false);
  }

  const dateRange = React.useMemo(() => {
    if (rangeMode === "month") {
      const [y, m] = selectedMonth.split("-").map(Number);
      const first = new Date(Date.UTC(y, m - 1, 1)).toISOString().slice(0, 10);
      const last = new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10);
      return { start: first, end: last, label: selectedMonth };
    }
    return { start: rangeStart || "", end: rangeEnd || "", label: `${rangeStart || "?"} → ${rangeEnd || "?"}` };
  }, [rangeMode, selectedMonth, rangeStart, rangeEnd]);

  const filteredTransactions = React.useMemo(() => {
    if (rangeMode === "month") return transactions.filter(t => t.date.startsWith(selectedMonth));
    return transactions.filter(t =>
      (!dateRange.start || t.date >= dateRange.start) &&
      (!dateRange.end || t.date <= dateRange.end)
    );
  }, [transactions, rangeMode, selectedMonth, dateRange]);

  function exportPDF() {
    try {
      exportFinancialPDF({
        transactions,
        budgets,
        goals,
        debts,
        assets,
        selectedMonth: rangeMode === "month" ? selectedMonth : (rangeStart || "2026-01").slice(0, 7),
        currency,
        formatCurrency,
        categories: CATEGORIES as any,
      });
      toast({ title: "PDF report generated" });
    } catch (e: any) {
      toast({ title: "PDF export failed", description: e.message, variant: "destructive" });
    }
  }

  function exportXLSX() {
    try {
      exportWorkbook({
        transactions,
        budgets,
        goals,
        debts,
        assets,
        selectedMonth: rangeMode === "month" ? selectedMonth : (rangeStart || "2026-01").slice(0, 7),
        currency,
        formatCurrency,
        categories: CATEGORIES as any,
      });
      toast({ title: "Excel workbook generated" });
    } catch (e: any) {
      toast({ title: "XLSX export failed", description: e.message, variant: "destructive" });
    }
  }

  function exportCSV() {
    try {
      exportTransactionsCSV(filteredTransactions, currency, formatCurrency, `report-${dateRange.label.replace(/\s+/g, "")}`);
      toast({ title: "CSV exported" });
    } catch (e: any) {
      toast({ title: "CSV export failed", variant: "destructive" });
    }
  }

  function handlePrint() {
    window.print();
  }

  const spendingByCategory = React.useMemo(() => {
    const map: Record<string, number> = {};
    filteredTransactions
      .filter(t => t.type === "expense")
      .forEach(t => {
        map[t.category] = (map[t.category] || 0) + Number(t.amount);
      });
    return map;
  }, [filteredTransactions]);

  const incomeBySource = React.useMemo(() => {
    const map: Record<string, number> = {};
    filteredTransactions
      .filter(t => t.type === "income")
      .forEach(t => {
        const key = t.income_source || t.category || "Other Income";
        map[key] = (map[key] || 0) + Number(t.amount);
      });
    return map;
  }, [filteredTransactions]);

  const incomeByAsset = React.useMemo(() => {
    const map: Record<string, number> = {};
    filteredTransactions
      .filter(t => t.type === "income" && t.asset_id)
      .forEach(t => {
        const asset = assets.find(a => a.id === t.asset_id);
        const key = asset ? asset.name : "Unknown account";
        map[key] = (map[key] || 0) + Number(t.amount);
      });
    return map;
  }, [filteredTransactions, assets]);

  const spendingByAsset = React.useMemo(() => {
    const map: Record<string, number> = {};
    filteredTransactions
      .filter(t => t.type === "expense" && t.asset_id)
      .forEach(t => {
        const asset = assets.find(a => a.id === t.asset_id);
        const key = asset ? asset.name : "Unknown account";
        map[key] = (map[key] || 0) + Number(t.amount);
      });
    return map;
  }, [filteredTransactions, assets]);

  const monthlyTrend = React.useMemo(() => {
    const months: Record<string, { income: number; expense: number; net: number }> = {};
    const labels: string[] = [];
    for (let i = trendMonths - 1; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const key = d.toISOString().slice(0, 7);
      labels.push(key);
      months[key] = { income: 0, expense: 0, net: 0 };
    }

    transactions.forEach(t => {
      const month = t.date.slice(0, 7);
      if (months[month]) {
        if (t.type === "income") {
          months[month].income += Number(t.amount);
          months[month].net += Number(t.amount);
        } else {
          months[month].expense += Number(t.amount);
          months[month].net -= Number(t.amount);
        }
      }
    });

    return { labels, data: months };
  }, [transactions, trendMonths]);

  const totalSpending = Object.values(spendingByCategory).reduce((a, b) => a + b, 0);
  const totalIncome = Object.values(incomeBySource).reduce((a, b) => a + b, 0);
  const netSavings = totalIncome - totalSpending;
  const savingsRate = totalIncome > 0 ? (netSavings / totalIncome) * 100 : 0;
  const avgTransaction = filteredTransactions.length > 0
    ? filteredTransactions.reduce((s, t) => s + Number(t.amount), 0) / filteredTransactions.length
    : 0;

  const CHART_COLORS = {
    primary: "#06b6d4",
    income: "#22c55e",
    expense: "#ef4444",
    net: "#8b5cf6",
    grid: "rgba(148, 163, 184, 0.1)",
  };

  const doughnutData = {
    labels: Object.keys(spendingByCategory),
    datasets: [{
      data: Object.values(spendingByCategory),
      backgroundColor: [
        "#0ea5e9", "#22c55e", "#f59e0b", "#ef4444",
        "#8b5cf6", "#ec4899", "#06b6d4", "#84cc16", "#64748b",
        "#14b8a6", "#f97316"
      ],
      borderWidth: 0,
      hoverOffset: 6,
    }],
  };

  const barData = {
    labels: monthlyTrend.labels.map(m => {
      const [year, month] = m.split("-");
      return `${month}/${year.slice(2)}`;
    }),
    datasets: [
      {
        label: "Income",
        data: monthlyTrend.labels.map(m => monthlyTrend.data[m].income),
        backgroundColor: "#22c55e",
        borderRadius: 4,
      },
      {
        label: "Expenses",
        data: monthlyTrend.labels.map(m => monthlyTrend.data[m].expense),
        backgroundColor: "#ef4444",
        borderRadius: 4,
      },
    ],
  };

  const lineData = {
    labels: monthlyTrend.labels.map(m => {
      const [year, month] = m.split("-");
      return `${month}/${year.slice(2)}`;
    }),
    datasets: [
      {
        label: "Net savings",
        data: monthlyTrend.labels.map(m => monthlyTrend.data[m].net),
        borderColor: CHART_COLORS.net,
        backgroundColor: "rgba(139, 92, 246, 0.15)",
        fill: true,
        tension: 0.35,
        pointRadius: 3,
        pointHoverRadius: 5,
        borderWidth: 2,
      },
      {
        label: "Income",
        data: monthlyTrend.labels.map(m => monthlyTrend.data[m].income),
        borderColor: CHART_COLORS.income,
        backgroundColor: "rgba(34, 197, 94, 0.08)",
        tension: 0.35,
        pointRadius: 3,
        pointHoverRadius: 5,
        borderWidth: 2,
      },
      {
        label: "Expenses",
        data: monthlyTrend.labels.map(m => monthlyTrend.data[m].expense),
        borderColor: CHART_COLORS.expense,
        tension: 0.35,
        pointRadius: 3,
        pointHoverRadius: 5,
        borderWidth: 2,
      },
    ],
  };

  const availableMonths = Array.from(new Set(transactions.map(t => t.date.slice(0, 7)))).sort().reverse();
  if (!availableMonths.includes(selectedMonth)) {
    availableMonths.unshift(selectedMonth);
  }

  if (loading) {
    return (
      <main className="flex-1 space-y-6 bg-background/50 p-4 sm:p-6 overflow-x-auto print:bg-white print:p-0">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <Skeleton className="h-8 w-32" />
          <div className="flex gap-2 flex-wrap">
            <Skeleton className="h-10 w-40" />
            <Skeleton className="h-10 w-32" />
            <Skeleton className="h-10 w-28" />
            <Skeleton className="h-10 w-28" />
          </div>
        </div>
        <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
          {[1,2,3,4,5].map(i => <Skeleton key={i} className="h-28" />)}
        </div>
        <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
          <Skeleton className="h-80" />
          <Skeleton className="h-80" />
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1 space-y-6 bg-background/50 p-4 sm:p-6 overflow-x-auto print:bg-white print:p-4 print:space-y-4">
      <div className="hidden print:block mb-6 text-center">
        <h1 className="text-3xl font-bold text-gray-900">Financial Report</h1>
        <p className="text-gray-600 mt-1">Period: {dateRange.label} • Generated: {new Date().toLocaleDateString()}</p>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between print:hidden">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Reports</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Analyze your financial activity and trends • Period: {dateRange.label}
          </p>
        </div>
        <div className="flex flex-col sm:items-end gap-3 w-full sm:w-auto">
          <div className="flex gap-2 flex-wrap">
            <Tabs value={rangeMode} onValueChange={(v: string) => setRangeMode(v as RangeMode)}>
              <TabsList className="h-9">
                <TabsTrigger value="month" className="text-xs h-7 px-3">
                  <Calendar className="h-3.5 w-3.5 mr-1.5" /> Month
                </TabsTrigger>
                <TabsTrigger value="custom" className="text-xs h-7 px-3">
                  <CalendarRange className="h-3.5 w-3.5 mr-1.5" /> Custom
                </TabsTrigger>
              </TabsList>
            </Tabs>
            {rangeMode === "month" ? (
              <Select value={selectedMonth} onValueChange={(v: string) => setSelectedMonth(v)}>
                <SelectTrigger className="h-9 w-[150px]">
                  <Calendar className="mr-2 h-4 w-4 text-muted-foreground" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {availableMonths.map(m => (
                    <SelectItem key={m} value={m}>{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <div className="flex gap-2">
                <Input
                  type="date"
                  value={rangeStart}
                  onChange={(e) => setRangeStart(e.target.value)}
                  className="h-9 w-[140px]"
                  placeholder="From"
                />
                <Input
                  type="date"
                  value={rangeEnd}
                  onChange={(e) => setRangeEnd(e.target.value)}
                  className="h-9 w-[140px]"
                  placeholder="To"
                />
              </div>
            )}
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button onClick={exportCSV} variant="outline" size="sm" className="h-9">
              <Download className="mr-2 h-4 w-4" /> CSV
            </Button>
            <Button onClick={exportXLSX} variant="outline" size="sm" className="h-9 border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/10">
              <FileSpreadsheet className="mr-2 h-4 w-4" /> Excel
            </Button>
            <Button onClick={exportPDF} variant="outline" size="sm" className="h-9 border-rose-500/40 text-rose-400 hover:bg-rose-500/10">
              <FileText className="mr-2 h-4 w-4" /> PDF
            </Button>
            <Button onClick={handlePrint} variant="outline" size="sm" className="h-9">
              <Printer className="mr-2 h-4 w-4" /> Print
            </Button>
          </div>
        </div>
      </div>

      <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 print:grid-cols-5 print:gap-2">
        <Card className="print:shadow-none">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium flex items-center gap-2 text-muted-foreground">
              <BarChart3 className="h-3.5 w-3.5 text-sky-400" />
              Transactions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">{filteredTransactions.length}</div>
          </CardContent>
        </Card>
        <Card className="print:shadow-none">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium flex items-center gap-2 text-muted-foreground">
              <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
              Income
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-emerald-500">
              {formatCurrency(totalIncome, currency)}
            </div>
          </CardContent>
        </Card>
        <Card className="print:shadow-none">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium flex items-center gap-2 text-muted-foreground">
              <TrendingUp className="h-3.5 w-3.5 text-rose-500" />
              Spending
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-rose-500">
              {formatCurrency(totalSpending, currency)}
            </div>
          </CardContent>
        </Card>
        <Card className="print:shadow-none">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium flex items-center gap-2 text-muted-foreground">
              <PieChart className="h-3.5 w-3.5 text-violet-400" />
              Net savings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-xl font-bold ${netSavings >= 0 ? "text-violet-500" : "text-rose-500"}`}>
              {netSavings >= 0 ? "+" : ""}{formatCurrency(netSavings, currency)}
            </div>
            <p className="text-[10px] text-muted-foreground mt-1">
              Rate: {savingsRate.toFixed(1)}%
            </p>
          </CardContent>
        </Card>
        <Card className="print:shadow-none col-span-2 sm:col-span-1 lg:col-span-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium flex items-center gap-2 text-muted-foreground">
              <BarChart3 className="h-3.5 w-3.5 text-amber-400" />
              Avg txn
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">
              {formatCurrency(avgTransaction, currency)}
            </div>
            <p className="text-[10px] text-muted-foreground mt-1">
              {Object.keys(spendingByCategory).length}/{CATEGORIES.length} categories
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="print:hidden">
        <CardContent className="pt-4 pb-2 px-4">
          <div className="flex flex-wrap items-center gap-2 justify-between">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
              <Label className="text-xs text-muted-foreground">Trend lookback:</Label>
              <Tabs value={String(trendMonths)} onValueChange={(v) => setTrendMonths(Number(v))}>
                <TabsList className="h-8">
                  {[3, 6, 12, 24].map(n => (
                    <TabsTrigger key={n} value={String(n)} className="h-6 px-2 text-xs">{n}M</TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
            </div>
            <Badge variant="outline" className="text-[10px] text-muted-foreground">
              Covers {monthlyTrend.labels[0]} → {monthlyTrend.labels[monthlyTrend.labels.length - 1]}
            </Badge>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3 print:grid-cols-1 print:gap-3">
        <Card className="print:shadow-none">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <PieChart className="h-4 w-4 text-sky-400" />
              Spending by Category
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 print:h-48">
              <Doughnut
                data={doughnutData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: { position: "bottom", labels: { font: { size: 10 }, boxWidth: 12, padding: 8 } },
                    tooltip: {
                      callbacks: {
                        label: (context: any) => {
                          const value = context.raw;
                          const percentage = totalSpending > 0 ? ((value / totalSpending) * 100).toFixed(1) : "0";
                          return `${formatCurrency(value, currency)} (${percentage}%)`;
                        }
                      }
                    }
                  }
                }}
              />
            </div>
          </CardContent>
        </Card>

        <Card className="print:shadow-none lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <TrendingUp className="h-4 w-4 text-violet-400" />
              Cashflow Trend (Line)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 print:h-48">
              <Line
                data={lineData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  interaction: { mode: "index", intersect: false },
                  plugins: { legend: { position: "bottom", labels: { font: { size: 10 }, boxWidth: 12, padding: 10 } } },
                  scales: {
                    x: { grid: { color: CHART_COLORS.grid } },
                    y: { grid: { color: CHART_COLORS.grid } },
                  }
                }}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="print:shadow-none">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <BarChart3 className="h-4 w-4 text-cyan-400" />
            Income vs Expenses (Bar)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-60 print:h-44">
            <Bar
              data={barData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { position: "bottom", labels: { font: { size: 10 }, boxWidth: 12, padding: 10 } } },
                scales: {
                  x: { stacked: false, grid: { color: CHART_COLORS.grid } },
                  y: { stacked: false, grid: { color: CHART_COLORS.grid } }
                }
              }}
            />
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2 print:grid-cols-1 print:gap-3">
        <Card className="print:shadow-none">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <BarChart3 className="h-4 w-4 text-rose-400" />
              Category Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {Object.entries(spendingByCategory)
                .sort(([, a], [, b]) => b - a)
                .map(([category, amount]) => {
                  const percentage = totalSpending > 0 ? (amount / totalSpending) * 100 : 0;
                  return (
                    <div key={category} className="space-y-1 rounded-lg border p-3 hover:bg-muted/30 transition-colors print:bg-white">
                      <div className="flex items-center justify-between">
                        <Badge variant="secondary" className="text-[10px] h-5">{category}</Badge>
                        <div className="text-right">
                          <p className="font-semibold text-sm">{formatCurrency(amount, currency)}</p>
                        </div>
                      </div>
                      <Progress value={percentage} className="h-1.5" />
                      <p className="text-[10px] text-muted-foreground text-right">{percentage.toFixed(1)}% of total</p>
                    </div>
                  );
                })}
              {Object.keys(spendingByCategory).length === 0 && (
                <div className="py-12 text-center">
                  <BarChart3 className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
                  <p className="text-muted-foreground font-medium">No spending data for {dateRange.label}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="print:shadow-none">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                <TrendingUp className="h-4 w-4 text-emerald-400" />
                Income by Source
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {Object.entries(incomeBySource)
                  .sort(([, a], [, b]) => b - a)
                  .map(([source, amount]) => {
                    const pct = totalIncome > 0 ? (amount / totalIncome) * 100 : 0;
                    return (
                      <div key={source} className="space-y-1 rounded-lg border p-3 hover:bg-muted/30 transition-colors print:bg-white">
                        <div className="flex items-center justify-between">
                          <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-400 text-[10px] h-5">{source}</Badge>
                          <p className="font-semibold text-sm text-emerald-400">{formatCurrency(amount, currency)}</p>
                        </div>
                        <Progress value={pct} className="h-1.5 [&>div]:bg-emerald-500" />
                        <p className="text-[10px] text-muted-foreground text-right">{pct.toFixed(1)}% of income</p>
                      </div>
                    );
                  })}
                {Object.keys(incomeBySource).length === 0 && (
                  <div className="py-12 text-center">
                    <TrendingUp className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
                    <p className="text-muted-foreground font-medium">No income data for {dateRange.label}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="print:shadow-none">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                <Wallet className="h-4 w-4 text-cyan-400" />
                Spending by Account
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {Object.entries(spendingByAsset)
                  .sort(([, a], [, b]) => b - a)
                  .map(([name, amount]) => (
                    <div key={name} className="flex items-center justify-between rounded-lg border p-2.5 hover:bg-muted/30 transition-colors print:bg-white">
                      <Badge variant="outline" className="text-[10px] h-5">{name}</Badge>
                      <span className="font-medium text-sm">{formatCurrency(amount, currency)}</span>
                    </div>
                  ))}
                {Object.keys(spendingByAsset).length === 0 && Object.keys(incomeByAsset).length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-6">
                    No account-linked transactions. Link transactions to accounts to see breakdown.
                  </p>
                )}
              </div>
              {Object.keys(incomeByAsset).length > 0 && (
                <>
                  <div className="h-px bg-border my-3" />
                  <p className="text-[11px] text-emerald-400 mb-2 font-medium">💵 Income received into:</p>
                  <div className="space-y-2">
                    {Object.entries(incomeByAsset)
                      .sort(([, a], [, b]) => b - a)
                      .map(([name, amount]) => (
                        <div key={name} className="flex items-center justify-between rounded-lg border p-2.5 hover:bg-muted/30 transition-colors print:bg-white">
                          <Badge variant="outline" className="text-[10px] h-5 border-emerald-500/30 text-emerald-400">{name}</Badge>
                          <span className="font-medium text-sm text-emerald-400">+{formatCurrency(amount, currency)}</span>
                        </div>
                      ))}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}

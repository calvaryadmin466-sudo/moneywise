"use client";

import * as React from "react";
import { Doughnut } from "react-chartjs-2";
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
} from "chart.js";
import {
  ArrowUpCircle,
  ArrowDownCircle,
  Wallet,
  TrendingUp,
  AlertCircle,
  Lightbulb,
  Bell,
  BellRing,
  BellOff,
  Calendar,
  CheckCircle2,
  Target,
  CalendarClock,
  CalendarDays,
  AlertTriangle,
  SkipForward,
  Edit2,
  Trash2,
  CreditCard,
  Plus,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase, getUser } from "@/lib/supabase";
import { formatCurrency, Currency, Transaction, Budget, Goal, CATEGORIES, Asset } from "@/lib/finance";
import { useRouter, useSearchParams } from "next/navigation";
import { FinancialTips } from "@/components/dashboard/financial-tips";
import {
  BillReminder,
  RECURRENCE_OPTIONS,
  computeNextDue,
  daysUntil,
  getBillStatus,
  isDueSoon,
  isOverdue,
} from "@/lib/bills";
import { useToast } from "@/hooks/use-toast";

ChartJS.register(ArcElement, Tooltip, Legend);

export default function DashboardContent() {
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const router = useRouter();
  const currency = (searchParams.get("currency") as Currency) || "TZS";

  const [transactions, setTransactions] = React.useState<Transaction[]>([]);
  const [budgets, setBudgets] = React.useState<Budget[]>([]);
  const [goals, setGoals] = React.useState<Goal[]>([]);
  const [assets, setAssets] = React.useState<{ id?: string; name?: string; type?: string; balance: number; currency?: string; asset_type?: string }[]>([]);
  const [bills, setBills] = React.useState<BillReminder[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [showCheckIn, setShowCheckIn] = React.useState(false);
  const [checkInAmount, setCheckInAmount] = React.useState("");
  const [checkInCategory, setCheckInCategory] = React.useState("Food");

  React.useEffect(() => {
    fetchData();
    const timer = setTimeout(() => setShowCheckIn(true), 5000);
    return () => clearTimeout(timer);
  }, []);

  async function fetchData() {
    setLoading(true);
    try {
      const user = await getUser();
      const userId = user?.id;
      if (!userId) {
        setTransactions([]);
        setBudgets([]);
        setGoals([]);
        setAssets([]);
        setBills([]);
        setLoading(false);
        return;
      }
      const [transRes, budgetRes, goalsRes, assetsRes, billsRes] = await Promise.all([
        supabase.from('transactions').select('id, user_id, type, amount, category, date, note, is_recurring, created_at').eq('user_id', userId).order('date', { ascending: false }),
        supabase.from('budgets').select('id, user_id, category, monthly_limit, month, created_at').eq('user_id', userId),
        supabase.from('goals').select('id, user_id, name, target_amount, saved_amount, deadline, created_at').eq('user_id', userId).order('created_at', { ascending: false }),
        supabase.from('user_assets').select('id, name, type, balance, currency').eq('user_id', userId),
        supabase.from('bill_reminders').select('*').eq('user_id', userId).order('next_due_date', { ascending: true }).limit(10),
      ]);

      if (transRes.error) throw transRes.error;
      if (budgetRes.error) throw budgetRes.error;
      if (goalsRes.error) throw goalsRes.error;
      if (assetsRes.error) throw assetsRes.error;

      setTransactions((transRes.data || []) as Transaction[]);
      setBudgets(budgetRes.data || []);
      setGoals(goalsRes.data || []);
      setAssets((assetsRes.data || []) as Asset[]);
      setBills((billsRes.data as BillReminder[]) || []);
    } catch (error) {
      console.error('Dashboard fetch error:', error);
      setTransactions([]);
      setBudgets([]);
      setGoals([]);
      setAssets([]);
      setBills([]);
    } finally {
      setLoading(false);
    }
  }

  async function markBillPaid(bill: BillReminder) {
    const user = await getUser();
    if (!user) return;

    if (bill.asset_id) {
      const asset = assets.find((a) => (a as any).id === bill.asset_id);
      if (asset) {
        const { error: txErr } = await supabase.from("transactions").insert({
          user_id: user.id,
          type: "expense",
          amount: Number(bill.amount),
          category: bill.category || "Other",
          date: new Date().toISOString().slice(0, 10),
          note: `Bill payment: ${bill.title}`,
          is_recurring: false,
          asset_id: bill.asset_id,
        });
        if (!txErr) {
          const newBalance = Number(asset.balance) - Number(bill.amount);
          await supabase
            .from("user_assets")
            .update({ balance: newBalance, updated_at: new Date().toISOString() })
            .eq("id", (asset as any).id);
        }
      }
    }

    const nextDue = bill.recurrence === "once" ? bill.next_due_date : computeNextDue(bill.next_due_date, bill.recurrence);
    const { error } = await supabase
      .from("bill_reminders")
      .update({ next_due_date: nextDue, is_paid_last: true, last_notified_at: null, snooze_until: null })
      .eq("id", bill.id);
    if (!error) {
      toast({ title: "Marked paid" });
      fetchData();
    }
  }

  async function addCheckInTransaction() {
    if (!checkInAmount) return;
    const user = await getUser();
    const userId = user?.id;
    if (!userId) return;
    const { error } = await supabase.from('transactions').insert({
      user_id: userId,
      type: "expense",
      amount: Number(checkInAmount),
      category: checkInCategory,
      date: new Date().toISOString().split("T")[0],
      note: "Daily check-in",
      is_recurring: false,
    });
    if (!error) {
      setShowCheckIn(false);
      setCheckInAmount("");
      fetchData();
    }
  }

  const currentMonth = new Date().toISOString().slice(0, 7);
  const today = new Date().toISOString().split("T")[0];

  const monthlyTransactions = React.useMemo(() => {
    return transactions.filter(t => t.date.startsWith(currentMonth));
  }, [transactions, currentMonth]);

  const todaysTransactions = React.useMemo(() => {
    return transactions.filter(t => t.date === today);
  }, [transactions, today]);

  const { totalIncome, totalExpenses, balance, lastMonthExpenses, netWorth } = React.useMemo(() => {
    const lastMonth = new Date();
    lastMonth.setMonth(lastMonth.getMonth() - 1);
    const lastMonthStr = lastMonth.toISOString().slice(0, 7);

    let income = 0, expenses = 0, lastExp = 0;

    transactions.forEach((t) => {
      if (t.date.startsWith(currentMonth)) {
        if (t.type === "income") income += Number(t.amount);
        else expenses += Number(t.amount);
      }
      if (t.date.startsWith(lastMonthStr)) {
        if (t.type === "expense") lastExp += Number(t.amount);
      }
    });

    // Calculate net worth from assets
    const totalAssets = assets.reduce((sum, a) => sum + Number(a.balance || 0), 0);

    return {
      totalIncome: income,
      totalExpenses: expenses,
      balance: income - expenses,
      lastMonthExpenses: lastExp,
      netWorth: totalAssets
    };
  }, [transactions, currentMonth, assets]);

  const totalBudget = React.useMemo(() => {
    return budgets
      .filter(b => b.month === currentMonth)
      .reduce((sum, b) => sum + Number(b.monthly_limit), 0);
  }, [budgets, currentMonth]);

  const budgetLeft = totalBudget - totalExpenses;

  const spendingByCategory = React.useMemo(() => {
    const map: Record<string, number> = {};
    monthlyTransactions
      .filter(t => t.type === "expense")
      .forEach(t => {
        map[t.category] = (map[t.category] || 0) + Number(t.amount);
      });
    return map;
  }, [monthlyTransactions]);

  const totalSpending = Object.values(spendingByCategory).reduce((a, b) => a + b, 0);

  const billsStats = React.useMemo(() => {
    const monthKey = new Date().toISOString().slice(0, 7);
    const monthBills = bills.filter((b) => b.next_due_date.startsWith(monthKey));
    return {
      totalDue: monthBills.reduce((s, b) => s + Number(b.amount), 0),
      count: monthBills.length,
      overdueCount: bills.filter((b) => isOverdue(b.next_due_date)).length,
      dueSoonCount: bills.filter((b) => isDueSoon(b.next_due_date, b.remind_days_before || 3) && !isOverdue(b.next_due_date)).length,
    };
  }, [bills]);

  const upcomingBills = React.useMemo(
    () => bills.filter((b) => daysUntil(b.next_due_date) <= 30).slice(0, 5),
    [bills]
  );

  const doughnutData = {
    labels: Object.keys(spendingByCategory),
    datasets: [{
      data: Object.values(spendingByCategory),
      backgroundColor: [
        "#3b82f6", "#22c55e", "#a855f7", "#f97316",
        "#ef4444", "#06b6d4", "#84cc16", "#f59e0b", "#64748b"
      ],
      borderWidth: 0,
    }],
  };

  const doughnutOptions: any = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "right" as const,
        labels: {
          usePointStyle: true,
          padding: 20,
          font: { size: 12 }
        }
      },
      tooltip: {
        callbacks: {
          label: (context: { raw?: number; label?: string }) => {
            const value = typeof context.raw === "number" ? context.raw : 0;
            const label = context.label || "Amount";
            const percentage = totalSpending > 0 ? ((value / totalSpending) * 100).toFixed(0) : "0";
            return `${label}: ${formatCurrency(value, currency)} (${percentage}%)`;
          }
        }
      }
    }
  };

  const spendingChange = lastMonthExpenses > 0
    ? ((totalExpenses - lastMonthExpenses) / lastMonthExpenses * 100).toFixed(0)
    : "0";

  const incomeChange = React.useMemo(() => {
    const lastMonth = new Date();
    lastMonth.setMonth(lastMonth.getMonth() - 1);
    const lastMonthStr = lastMonth.toISOString().slice(0, 7);
    let lastMonthIncome = 0;
    transactions.forEach((t) => {
      if (t.date.startsWith(lastMonthStr) && t.type === "income") {
        lastMonthIncome += Number(t.amount);
      }
    });
    return lastMonthIncome > 0
      ? ((totalIncome - lastMonthIncome) / lastMonthIncome * 100).toFixed(0)
      : "0";
  }, [transactions, totalIncome]);

  const smartAlerts = React.useMemo(() => {
    const alerts: { type: string; message: string; category?: string }[] = [];

    budgets
      .filter(b => b.month === currentMonth)
      .forEach(budget => {
        const spent = spendingByCategory[budget.category] || 0;
        const limit = Number(budget.monthly_limit);
        const percentage = (spent / limit) * 100;

        if (percentage >= 100) {
          alerts.push({
            type: "danger",
            message: `You've exceeded your ${budget.category} budget!`,
            category: budget.category
          });
        } else if (percentage >= 90) {
          alerts.push({
            type: "warning",
            message: `You're about to exceed your ${budget.category} budget (${percentage.toFixed(0)}% used)`,
            category: budget.category
          });
        } else if (percentage >= 75) {
          alerts.push({
            type: "info",
            message: `${budget.category} budget is at ${percentage.toFixed(0)}%`,
            category: budget.category
          });
        }
      });

    if (Number(spendingChange) > 20) {
      alerts.push({
        type: "warning",
        message: `Spending is ${spendingChange}% higher than last month`
      });
    }

    return alerts;
  }, [budgets, spendingByCategory, currentMonth, spendingChange]);

  const spendingInsights = React.useMemo(() => {
    const insights: string[] = [];

    const weekendSpending = transactions
      .filter(t => {
        const date = new Date(t.date);
        const day = date.getDay();
        return (day === 0 || day === 6) && t.type === "expense" && t.date.startsWith(currentMonth);
      })
      .reduce((sum, t) => sum + Number(t.amount), 0);

    const weekdaySpending = transactions
      .filter(t => {
        const date = new Date(t.date);
        const day = date.getDay();
        return day >= 1 && day <= 5 && t.type === "expense" && t.date.startsWith(currentMonth);
      })
      .reduce((sum, t) => sum + Number(t.amount), 0);

    const weekendDays = 8;
    const weekdayDays = 22;

    if (weekendSpending > 0 && weekdaySpending > 0) {
      const weekendAvg = weekendSpending / weekendDays;
      const weekdayAvg = weekdaySpending / weekdayDays;

      if (weekendAvg > weekdayAvg * 1.3) {
        const pct = ((weekendAvg - weekdayAvg) / weekdayAvg * 100).toFixed(0);
        insights.push(`You spend ${pct}% more on weekends`);
      }
    }

    const topCategory = Object.entries(spendingByCategory)
      .sort(([, a], [, b]) => b - a)[0];

    if (topCategory) {
      insights.push(`${topCategory[0]} is your biggest expense`);
    }

    const daysPassed = new Date().getDate();
    const dailyAvg = totalExpenses / daysPassed;
    insights.push(`Daily average: ${formatCurrency(dailyAvg, currency)}`);

    return insights;
  }, [transactions, currentMonth, spendingByCategory, totalExpenses, currency]);

  const budgetProgress = React.useMemo(() => {
    return CATEGORIES.map(cat => {
      const budget = budgets.find(b => b.category === cat && b.month === currentMonth);
      if (!budget) return null;
      const spent = spendingByCategory[cat] || 0;
      const limit = Number(budget.monthly_limit);
      const percentage = (spent / limit) * 100;

      let colorClass = "bg-green-500";
      if (percentage >= 100) colorClass = "bg-red-500";
      else if (percentage >= 90) colorClass = "bg-red-400";
      else if (percentage >= 70) colorClass = "bg-amber-500";
      else if (percentage >= 50) colorClass = "bg-emerald-500";

      return {
        category: cat,
        spent,
        limit,
        percentage: Math.min(percentage, 100),
        rawPercentage: percentage,
        colorClass
      };
    }).filter(Boolean).sort((a, b) => b!.rawPercentage - a!.rawPercentage);
  }, [budgets, spendingByCategory, currentMonth]);

  const grade = React.useMemo(() => {
    if (budgetProgress.length === 0) return "-";
    const overBudget = budgetProgress.filter(b => b!.rawPercentage >= 100).length;
    const ratio = overBudget / budgetProgress.length;
    if (ratio === 0) return "A";
    if (ratio <= 0.25) return "B";
    if (ratio <= 0.5) return "C";
    if (ratio <= 0.75) return "D";
    return "F";
  }, [budgetProgress]);

  const activeGoals = goals.slice(0, 3);

  if (loading) return (
    <main className="flex-1 space-y-6 bg-background/50 p-4 sm:p-6 overflow-y-auto">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="h-36 animate-pulse rounded-3xl border border-white/10 bg-slate-800/60" />
        ))}
      </div>
      <div className="h-72 animate-pulse rounded-3xl border border-white/10 bg-slate-800/60" />
    </main>
  );

  return (
    <main className="flex-1 space-y-6 bg-background/50 p-4 sm:p-6 overflow-y-auto">
      {smartAlerts.length > 0 && (
        <div className="space-y-2">
          {smartAlerts.map((alert, idx) => (
            <div
              key={idx}
              className={`flex items-center gap-3 rounded-lg border p-3 ${alert.type === "danger" ? "border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950" :
                alert.type === "warning" ? "border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950" :
                  "border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950"
                }`}
            >
              <Bell className={`h-5 w-5 ${alert.type === "danger" ? "text-red-600" :
                alert.type === "warning" ? "text-amber-600" :
                  "text-blue-600"
                }`} />
              <p className={`text-sm font-medium ${alert.type === "danger" ? "text-red-800 dark:text-red-200" :
                alert.type === "warning" ? "text-amber-800 dark:text-amber-200" :
                  "text-blue-800 dark:text-blue-200"
                }`}>
                {alert.message}
              </p>
            </div>
          ))}
        </div>
      )}

      <Dialog open={showCheckIn} onOpenChange={setShowCheckIn}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Daily Check-in
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <p className="text-sm text-muted-foreground">
              What did you spend today? Log your daily expenses to build the habit.
            </p>
            {todaysTransactions.length > 0 && (
              <div className="rounded-lg bg-green-50 p-3 dark:bg-green-950">
                <p className="text-sm text-green-800 dark:text-green-200">
                  <CheckCircle2 className="inline h-4 w-4 mr-1" />
                  You have logged {todaysTransactions.length} transactions today
                </p>
              </div>
            )}
            <div className="space-y-2">
              <Label>Amount</Label>
              <Input
                type="number"
                value={checkInAmount}
                onChange={(e) => setCheckInAmount(e.target.value)}
                placeholder="0.00"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-gray-300">Category</Label>
              <Select value={checkInCategory} onValueChange={setCheckInCategory}>
                <SelectTrigger className="bg-[#1e293b] border-white/20 text-gray-300">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#1e293b] border-white/20">
                  {CATEGORIES.map(cat => (
                    <SelectItem key={cat} value={cat} className="text-gray-300 focus:bg-cyan-500/20 focus:text-cyan-400">
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2">
              <Button onClick={addCheckInTransaction} className="flex-1">Add Expense</Button>
              <Button variant="outline" onClick={() => setShowCheckIn(false)}>Skip</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <div className="grid gap-4 grid-cols-1 min-w-0 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {/* Net Worth Card - Most Important */}
        <Card className="glass-card relative overflow-hidden bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20 border-violet-500/30 min-w-0">
          <div className="absolute top-0 right-0 p-3 opacity-20">
            <TrendingUp className="h-12 w-12 text-violet-400" />
          </div>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-violet-400">Net Worth</CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <div className="text-2xl sm:text-3xl font-bold text-white break-words">{formatCurrency(netWorth, currency)}</div>
            <p className="text-xs text-violet-200/60 mt-1">Total Assets Value</p>
            <div className="w-full bg-gray-700 h-1.5 rounded-full mt-3 overflow-hidden">
              <div
                className="bg-gradient-to-r from-violet-400 to-fuchsia-400 h-full rounded-full transition-all"
                style={{ width: `${Math.min((netWorth / 1000000) * 100, 100)}%` }}
              />
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card neon-blue relative overflow-hidden min-w-0">
          <div className="absolute top-0 right-0 p-3 opacity-20">
            <Wallet className="h-12 w-12 text-cyan-400" />
          </div>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-cyan-400">Balance</CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <div className="text-2xl sm:text-3xl font-bold text-white break-words">{formatCurrency(balance, currency)}</div>
            <p className="text-xs text-cyan-200/60 mt-1">This month</p>
            <svg className="w-full h-8 mt-3" viewBox="0 0 100 20">
              <polyline
                fill="none"
                stroke="#22d3ee"
                strokeWidth="2"
                className="sparkline"
                points={transactions.slice(0, 7).map((t, i) => `${i * 14},${20 - (Number(t.amount) / 1000)}`).join(' ')}
              />
            </svg>
          </CardContent>
        </Card>

        <Card className="glass-card neon-green relative overflow-hidden min-w-0">
          <div className="absolute top-0 right-0 p-3 opacity-20">
            <ArrowUpCircle className="h-12 w-12 text-emerald-400" />
          </div>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-emerald-400">Income</CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <div className="text-2xl sm:text-3xl font-bold text-white break-words">{formatCurrency(totalIncome, currency)}</div>
            <p className="text-xs text-emerald-200/60 mt-1">This month</p>
            <div className={`flex items-center gap-1 mt-2 text-sm ${Number(incomeChange) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              <ArrowUpCircle className={`h-4 w-4 ${Number(incomeChange) < 0 ? 'rotate-180' : ''}`} />
              <span>{Number(incomeChange) >= 0 ? '+' : ''}{incomeChange}%</span>
              <span className="text-slate-400">vs last month</span>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card neon-red relative overflow-hidden min-w-0">
          <div className="absolute top-0 right-0 p-3 opacity-20">
            <ArrowDownCircle className="h-12 w-12 text-rose-400" />
          </div>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-rose-400">Spent</CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <div className="text-2xl sm:text-3xl font-bold text-white break-words">{formatCurrency(totalExpenses, currency)}</div>
            <p className="text-xs text-rose-200/60 mt-1">This month</p>
            <div className={`flex items-center gap-1 mt-2 text-sm ${Number(spendingChange) >= 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
              <ArrowDownCircle className={`h-4 w-4 ${Number(spendingChange) < 0 ? 'rotate-180' : ''}`} />
              <span>{Number(spendingChange) >= 0 ? '+' : ''}{spendingChange}%</span>
              <span className="text-slate-400">vs last month</span>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card neon-amber relative overflow-hidden min-w-0">
          <div className="absolute top-0 right-0 p-3 opacity-20">
            <TrendingUp className="h-12 w-12 text-amber-400" />
          </div>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-amber-400">Budget Left</CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <div className="text-2xl sm:text-3xl font-bold text-white break-words">{formatCurrency(budgetLeft, currency)}</div>
            <p className="text-xs text-amber-200/60 mt-1">
              {totalBudget > 0 ? ((budgetLeft / totalBudget) * 100).toFixed(0) : 0}% remaining
            </p>
            <div className="w-full bg-gray-700 h-1.5 rounded-full mt-3 overflow-hidden">
              <div
                className="bg-amber-400 h-full rounded-full transition-all"
                style={{ width: `${totalBudget > 0 ? (budgetLeft / totalBudget) * 100 : 0}%` }}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-2">
        <Card className="glass-card border-cyan-500/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-cyan-400">
              <div className="h-2 w-2 rounded-full bg-cyan-400" />
              Spending by Category
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-8">
              <div className="h-48 w-48 relative">
                <Doughnut data={doughnutData} options={{ ...doughnutOptions, plugins: { ...doughnutOptions.plugins, legend: { display: false } } }} />
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="text-center">
                    <p className="text-xs text-gray-500">Total</p>
                    <p className="text-lg font-bold text-white">{formatCurrency(totalSpending, currency)}</p>
                  </div>
                </div>
              </div>
              <div className="flex-1 space-y-3">
                {Object.entries(spendingByCategory)
                  .sort(([, a], [, b]) => b - a)
                  .map(([category, amount], idx) => {
                    const percentage = totalSpending > 0 ? ((amount / totalSpending) * 100).toFixed(0) : "0";
                    const colors = ["#3b82f6", "#22c55e", "#a855f7", "#f97316", "#ef4444", "#06b6d4", "#84cc16", "#f59e0b", "#64748b"];
                    return (
                      <div key={category} className="flex items-center justify-between text-sm py-1">
                        <div className="flex items-center gap-3">
                          <div
                            className="h-3 w-3 rounded-full"
                            style={{ backgroundColor: colors[idx % colors.length] }}
                          />
                          <span className="text-gray-300">{category}</span>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="font-bold text-white">{formatCurrency(amount, currency)}</span>
                          <span className="text-gray-500 w-10 text-right">{percentage}%</span>
                        </div>
                      </div>
                    );
                  })}
                {Object.entries(spendingByCategory).length === 0 && (
                  <p className="text-sm text-gray-500 text-center py-4">No spending data yet</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card border-violet-500/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-violet-400">
              <Lightbulb className="h-5 w-5" />
              Spending Insights
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {spendingInsights.map((insight, idx) => (
                <div key={idx} className="flex items-start gap-3 rounded-lg bg-white/5 border border-white/10 p-3 hover:bg-white/10 transition-colors">
                  <TrendingUp className="h-5 w-5 text-violet-400 mt-0.5 shrink-0" />
                  <p className="text-sm text-gray-300">{insight}</p>
                </div>
              ))}
              {spendingInsights.length === 0 && (
                <p className="text-sm text-gray-500 text-center py-8">Add more transactions to see insights</p>
              )}
            </div>
          </CardContent>
        </Card>

        <FinancialTips />
      </div>

      <div className="grid gap-6 grid-cols-1 lg:grid-cols-3">
        <Card className="glass-card border-sky-500/20 lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-sky-400">
                <CalendarClock className="h-5 w-5" />
                Upcoming bills
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-1">
                Next 30 days — {billsStats.count} scheduled, total{" "}
                {formatCurrency(billsStats.totalDue, currency)}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {billsStats.overdueCount > 0 && (
                <Badge className="bg-rose-500/20 text-rose-400 border-rose-500/30">
                  {billsStats.overdueCount} overdue
                </Badge>
              )}
              {billsStats.dueSoonCount > 0 && (
                <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">
                  {billsStats.dueSoonCount} due soon
                </Badge>
              )}
              <Link href="/bills">
                <Button variant="outline" size="sm" className="h-8 border-white/10 text-gray-300 hover:bg-white/5">
                  View all
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {upcomingBills.length === 0 ? (
              <div className="py-10 text-center">
                <CalendarDays className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
                <p className="font-medium text-gray-300">No upcoming bills</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Schedule reminders to never miss a payment
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {upcomingBills.map((bill) => {
                  const status = getBillStatus(bill);
                  const days = daysUntil(bill.next_due_date);
                  return (
                    <div
                      key={bill.id}
                      className={`flex items-center gap-3 p-3 rounded-xl transition-colors ${
                        status === "overdue"
                          ? "bg-rose-500/5 border border-rose-500/20"
                          : status === "due-soon"
                          ? "bg-amber-500/5 border border-amber-500/20"
                          : "bg-white/5 border border-white/10 hover:bg-white/10"
                      }`}
                    >
                      <div
                        className={`h-10 w-10 shrink-0 rounded-lg flex items-center justify-center ${
                          status === "overdue"
                            ? "bg-rose-500/15 text-rose-400"
                            : status === "due-soon"
                            ? "bg-amber-500/15 text-amber-400"
                            : status === "snoozed"
                            ? "bg-slate-500/15 text-slate-400"
                            : "bg-sky-500/15 text-sky-400"
                        }`}
                      >
                        {status === "overdue" ? (
                          <AlertTriangle className="h-4 w-4" />
                        ) : status === "snoozed" ? (
                          <BellOff className="h-4 w-4" />
                        ) : (
                          <CalendarDays className="h-4 w-4" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium truncate">{bill.title}</h4>
                          {bill.recurrence !== "once" && (
                            <Badge variant="secondary" className="text-[10px] h-4 px-1.5">
                              {RECURRENCE_OPTIONS.find((r) => r.value === bill.recurrence)?.label}
                            </Badge>
                          )}
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          {bill.next_due_date} •{" "}
                          {days < 0
                            ? `${Math.abs(days)}d overdue`
                            : days === 0
                            ? "Due today"
                            : `in ${days}d`}
                        </p>
                      </div>
                      <div className="shrink-0 text-right flex items-center gap-3">
                        <div className="text-sm font-bold">
                          {formatCurrency(Number(bill.amount), currency)}
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 px-3 text-[11px] bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 hover:text-emerald-300"
                          onClick={() => markBillPaid(bill)}
                        >
                          <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" /> Mark paid
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="glass-card border-cyan-500/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-cyan-400 flex items-center gap-2">
                <BellRing className="h-4 w-4" /> Bills summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                  <span>This month due</span>
                  <span>{billsStats.count} items</span>
                </div>
                <div className="text-lg font-bold">
                  {formatCurrency(billsStats.totalDue, currency)}
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-300 flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-rose-500" /> Overdue
                  </span>
                  <span className="font-semibold text-rose-400">{billsStats.overdueCount}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-300 flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-amber-500" /> Due soon
                  </span>
                  <span className="font-semibold text-amber-400">{billsStats.dueSoonCount}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-300 flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-emerald-500" /> Scheduled
                  </span>
                  <span className="font-semibold text-emerald-400">
                    {Math.max(0, billsStats.count - billsStats.overdueCount)}
                  </span>
                </div>
              </div>
              <Link href="/bills">
                <Button className="w-full h-9 bg-gradient-to-r from-sky-500 to-cyan-600 text-white">
                  <Plus className="h-4 w-4 mr-1.5" /> New reminder
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="glass-card border-amber-500/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-amber-400 flex items-center gap-2">
                <AlertCircle className="h-4 w-4" /> Pay this week
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {bills
                .filter((b) => daysUntil(b.next_due_date) >= 0 && daysUntil(b.next_due_date) <= 7)
                .slice(0, 4)
                .map((bill) => (
                  <div key={bill.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-white/5">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="h-7 w-7 shrink-0 rounded-md bg-amber-500/15 text-amber-400 flex items-center justify-center">
                        <CreditCard className="h-3.5 w-3.5" />
                      </div>
                      <span className="text-sm truncate">{bill.title}</span>
                    </div>
                    <span className="text-xs font-semibold">
                      {formatCurrency(Number(bill.amount), currency)}
                    </span>
                  </div>
                ))}
              {bills.filter((b) => daysUntil(b.next_due_date) >= 0 && daysUntil(b.next_due_date) <= 7)
                .length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-3">
                  Nothing urgent this week
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <Card className="glass-card border-emerald-500/20">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-emerald-400">Budget Progress</CardTitle>
          <Badge className={grade === "A" ? "bg-emerald-500/80" : grade === "B" ? "bg-blue-500/80" : grade === "C" ? "bg-yellow-500/80" : grade === "D" ? "bg-orange-500/80" : "bg-rose-500/80"}>
            Grade: {grade}
          </Badge>
        </CardHeader>
        <CardContent className="space-y-4">
          {budgetProgress.length === 0 ? (
            <p className="text-sm text-gray-500">No budgets set for this month. Go to Budgets to set them up.</p>
          ) : (
            budgetProgress.map((item) => (
              <div key={item!.category} className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="font-medium text-gray-300">{item!.category}</span>
                  <span className="text-gray-500">
                    {formatCurrency(item!.spent, currency)} / {formatCurrency(item!.limit, currency)}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-2 bg-gray-700/50 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${item!.colorClass} transition-all shadow-[0_0_10px_currentColor]`}
                      style={{ width: `${Math.min(item!.percentage, 100)}%` }}
                    />
                  </div>
                  <span className={`text-sm font-semibold w-12 text-right ${item!.rawPercentage >= 100 ? "text-rose-400" :
                    item!.rawPercentage >= 90 ? "text-amber-400" :
                      "text-emerald-400"
                    }`}>
                    {item!.rawPercentage.toFixed(0)}%
                  </span>
                </div>
                {item!.rawPercentage >= 100 && (
                  <p className="text-xs text-rose-400 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    Over budget by {formatCurrency(item!.spent - item!.limit, currency)}
                  </p>
                )}
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {activeGoals.length > 0 && (
        <Card className="glass-card border-fuchsia-500/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-fuchsia-400">
              <Target className="h-5 w-5" />
              Active Goals
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
              {activeGoals.map((goal) => {
                const percentage = (Number(goal.saved_amount) / Number(goal.target_amount)) * 100;
                return (
                  <div key={goal.id} className="rounded-lg bg-white/5 border border-white/10 p-4 hover:bg-white/10 transition-colors">
                    <h4 className="font-medium text-gray-300 mb-2">{goal.name}</h4>
                    <div className="h-2 bg-gray-700/50 rounded-full overflow-hidden mb-2">
                      <div
                        className="h-full bg-fuchsia-400 shadow-[0_0_10px_rgba(232,121,249,0.5)]"
                        style={{ width: `${Math.min(percentage, 100)}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>{formatCurrency(Number(goal.saved_amount), currency)}</span>
                      <span>{formatCurrency(Number(goal.target_amount), currency)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="glass-card border-white/10">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-gray-300">Recent Transactions</CardTitle>
          <Button variant="outline" size="sm" className="border-white/20 hover:bg-white/10" onClick={() => router.push("/transactions")}>View All</Button>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {transactions.slice(0, 5).map((t) => (
              <div key={t.id} className="flex items-center justify-between rounded-lg bg-white/5 border border-white/10 p-3 hover:bg-white/10 transition-colors">
                <div className="flex items-center gap-3">
                  <div className={`h-10 w-10 rounded-full flex items-center justify-center ${t.type === "income" ? "bg-emerald-500/20 text-emerald-400" : "bg-rose-500/20 text-rose-400"
                    }`}>
                    {t.type === "income" ? "+" : "-"}
                  </div>
                  <div>
                    <p className="font-medium text-gray-300">{t.category}</p>
                    <p className="text-xs text-gray-500">{t.note || t.date}</p>
                    {t.type === "income" && (t.income_source || t.asset_id) && (
                      <p className="text-[11px] text-emerald-400 mt-1">
                        {t.income_source ? `${t.income_source}` : "Income"}
                        {t.asset_id ? ` • ${assets.find((asset) => asset.id === t.asset_id)?.name || "linked asset"}` : ""}
                      </p>
                    )}
                  </div>
                </div>
                <div className={`font-semibold ${t.type === "income" ? "text-emerald-400" : "text-rose-400"}`}>
                  {t.type === "income" ? "+" : "-"}{formatCurrency(Number(t.amount), currency)}
                </div>
              </div>
            ))}
            {transactions.length === 0 && (
              <p className="text-sm text-gray-500 text-center py-8">No transactions yet. Add your first one!</p>
            )}
          </div>
        </CardContent>
      </Card>
    </main>
  );
}

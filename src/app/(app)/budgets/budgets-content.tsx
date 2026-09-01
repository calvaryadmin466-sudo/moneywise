"use client";

import * as React from "react";
import { Plus, AlertCircle, RefreshCcw, CalendarClock, CalendarDays, Filter } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase, getUser } from "@/lib/supabase";
import { formatCurrency, Currency, Transaction, Budget, CATEGORIES, buildFinancialPlan, BudgetPeriod } from "@/lib/finance";
import { useSearchParams } from "next/navigation";

function getCurrentWeekKey(): string {
  const d = new Date();
  const day = d.getUTCDay();
  const diffToMonday = (day + 6) % 7;
  const monday = new Date(d);
  monday.setUTCDate(d.getUTCDate() - diffToMonday);
  const year = monday.getUTCFullYear();
  const onejan = new Date(Date.UTC(year, 0, 1));
  const weekNo = Math.ceil(
    ((monday.getTime() - onejan.getTime()) / 86400000 + onejan.getUTCDay() + 1) / 7
  );
  return `${year}-W${String(weekNo).padStart(2, "0")}`;
}

export default function BudgetsContent() {
  const searchParams = useSearchParams();
  const currency = (searchParams.get("currency") as Currency) || "TZS";

  const [budgets, setBudgets] = React.useState<Budget[]>([]);
  const [transactions, setTransactions] = React.useState<Transaction[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [isOpen, setIsOpen] = React.useState(false);
  const currentMonth = new Date().toISOString().slice(0, 7);
  const currentWeek = getCurrentWeekKey();

  const [period, setPeriod] = React.useState<BudgetPeriod>("monthly");
  const [viewPeriodKey, setViewPeriodKey] = React.useState<string>(currentMonth);
  const [formData, setFormData] = React.useState<{
    category: string;
    monthly_limit: string;
    month: string;
    period: BudgetPeriod;
    period_key: string;
    carry_forward: boolean;
  }>({
    category: "Food",
    monthly_limit: "",
    month: currentMonth,
    period: "monthly",
    period_key: currentMonth,
    carry_forward: false,
  });

  React.useEffect(() => {
    setViewPeriodKey(period === "monthly" ? currentMonth : currentWeek);
    setFormData((f) => ({
      ...f,
      period,
      period_key: period === "monthly" ? f.month : currentWeek,
    }));
  }, [period]);

  const plan = React.useMemo(
    () => buildFinancialPlan(transactions, period === "monthly" ? viewPeriodKey : currentMonth),
    [transactions, period, viewPeriodKey, currentMonth]
  );

  React.useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    const user = await getUser();
    const userId = user?.id;
    if (!userId) {
      setLoading(false);
      return;
    }
    const [budgetRes, transRes] = await Promise.all([
      supabase.from("budgets").select("*").eq("user_id", userId).order("created_at", { ascending: false }),
      supabase.from("transactions").select("*").eq("user_id", userId).order("date", { ascending: false }),
    ]);
    if (budgetRes.data) setBudgets(budgetRes.data);
    if (transRes.data) setTransactions(transRes.data);
    setLoading(false);
  }

  async function addBudget() {
    const user = await getUser();
    const userId = user?.id;
    if (!userId) return;
    const { error } = await supabase.from("budgets").insert({
      category: formData.category,
      monthly_limit: Number(formData.monthly_limit),
      month: formData.period === "monthly" ? formData.month : formData.period_key.slice(0, 7),
      period: formData.period,
      period_key: formData.period_key,
      carry_forward: formData.carry_forward,
      user_id: userId,
    });
    if (!error) {
      setIsOpen(false);
      fetchData();
      setFormData({
        category: "Food",
        monthly_limit: "",
        month: currentMonth,
        period,
        period_key: period === "monthly" ? currentMonth : currentWeek,
        carry_forward: false,
      });
    }
  }

  async function deleteBudget(id: string) {
    await supabase.from("budgets").delete().eq("id", id);
    fetchData();
  }

  async function applyRecommendedBudgets() {
    const user = await getUser();
    const userId = user?.id;
    if (!userId) return;

    const entries = Object.entries(plan.suggestedBudgets).map(([category, amount]) => {
      const perEntryLimit = Math.round(period === "weekly" ? amount / 4.34 : amount);
      return {
        user_id: userId,
        category,
        monthly_limit: perEntryLimit,
        month: viewPeriodKey.slice(0, 7),
        period,
        period_key: viewPeriodKey,
        carry_forward: false,
      };
    });

    if (entries.length === 0) return;

    await supabase
      .from("budgets")
      .upsert(entries, { onConflict: "user_id,category,period_key" });
    fetchData();
  }

  const periodTransactions = React.useMemo(() => {
    if (period === "monthly") {
      return transactions.filter((t) => t.date.startsWith(viewPeriodKey));
    }
    const map: Record<string, number> = {};
    transactions.forEach((t) => {
      const key = (() => {
        const d = new Date(t.date);
        const day = d.getUTCDay();
        const diffToMonday = (day + 6) % 7;
        const monday = new Date(d);
        monday.setUTCDate(d.getUTCDate() - diffToMonday);
        const year = monday.getUTCFullYear();
        const onejan = new Date(Date.UTC(year, 0, 1));
        const weekNo = Math.ceil(
          ((monday.getTime() - onejan.getTime()) / 86400000 + onejan.getUTCDay() + 1) / 7
        );
        return `${year}-W${String(weekNo).padStart(2, "0")}`;
      })();
      map[key] = (map[key] || 0) + Number(t.amount);
    });
    return transactions.filter((t) => {
      const d = new Date(t.date);
      const day = d.getUTCDay();
      const diffToMonday = (day + 6) % 7;
      const monday = new Date(d);
      monday.setUTCDate(d.getUTCDate() - diffToMonday);
      const year = monday.getUTCFullYear();
      const onejan = new Date(Date.UTC(year, 0, 1));
      const weekNo = Math.ceil(
        ((monday.getTime() - onejan.getTime()) / 86400000 + onejan.getUTCDay() + 1) / 7
      );
      return `${year}-W${String(weekNo).padStart(2, "0")}` === viewPeriodKey;
    });
  }, [transactions, period, viewPeriodKey]);

  const spendingByCategory = React.useMemo(() => {
    const map: Record<string, number> = {};
    periodTransactions
      .filter((t) => t.type === "expense")
      .forEach((t) => {
        map[t.category] = (map[t.category] || 0) + Number(t.amount);
      });
    return map;
  }, [periodTransactions]);

  const currentBudgets = budgets.filter(
    (b) => (b.period || "monthly") === period && (b.period_key || b.month) === viewPeriodKey
  );

  const priorBudgets = React.useMemo(() => {
    const samePeriodBudgets = budgets.filter((b) => (b.period || "monthly") === period);
    const prior = new Map<string, Budget>();
    samePeriodBudgets.forEach((b) => {
      const key = (b.period_key || b.month);
      if (key < viewPeriodKey) {
        const existing = prior.get(b.category);
        if (!existing || (existing.period_key || existing.month)! < key) {
          prior.set(b.category, b);
        }
      }
    });
    return prior;
  }, [budgets, period, viewPeriodKey]);

  const budgetProgress = currentBudgets.map((budget) => {
    const spent = spendingByCategory[budget.category] || 0;
    const baseLimit = Number(budget.monthly_limit);
    const prior = priorBudgets.get(budget.category);
    let carryAdjust = 0;
    if (budget.carry_forward && prior) {
      const priorSpent = (() => {
        if (period === "monthly") {
          return transactions
            .filter((t) => t.type === "expense" && t.date.startsWith(prior.period_key || prior.month) && t.category === budget.category)
            .reduce((s, t) => s + Number(t.amount), 0);
        }
        const priorKey = prior.period_key || prior.month;
        return transactions.filter((t) => {
          if (t.type !== "expense" || t.category !== budget.category) return false;
          const d = new Date(t.date);
          const day = d.getUTCDay();
          const diffToMonday = (day + 6) % 7;
          const monday = new Date(d);
          monday.setUTCDate(d.getUTCDate() - diffToMonday);
          const year = monday.getUTCFullYear();
          const onejan = new Date(Date.UTC(year, 0, 1));
          const weekNo = Math.ceil(
            ((monday.getTime() - onejan.getTime()) / 86400000 + onejan.getUTCDay() + 1) / 7
          );
          return `${year}-W${String(weekNo).padStart(2, "0")}` === priorKey;
        }).reduce((s, t) => s + Number(t.amount), 0);
      })();
      const priorLimit = Number(prior.monthly_limit);
      carryAdjust = priorLimit - priorSpent;
    }
    const effectiveLimit = Math.max(0, baseLimit + carryAdjust);
    const percentage = effectiveLimit > 0 ? (spent / effectiveLimit) * 100 : 100;
    let status: "success" | "warning" | "danger" = "success";
    if (percentage >= 95) status = "danger";
    else if (percentage >= 75) status = "warning";

    return {
      ...budget,
      spent,
      baseLimit,
      effectiveLimit,
      carryAdjust,
      percentage: Math.min(percentage, 100),
      status,
      overBudget: spent > effectiveLimit,
    };
  });

  const unusedCategories = CATEGORIES.filter(
    (cat) => !currentBudgets.some((b) => b.category === cat)
  );

  if (loading) return <div className="p-6">Loading...</div>;

  return (
    <main className="flex-1 space-y-6 bg-background/50 p-4 sm:p-6 overflow-x-auto">
      <Card>
        <CardContent className="space-y-4 pt-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <CalendarClock className="h-6 w-6 text-cyan-400" /> Budgets
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                Suggested {period} savings: {formatCurrency(plan.recommendedMonthlySavings, currency)}
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
              <Tabs
                value={period}
                onValueChange={(v) => setPeriod(v as BudgetPeriod)}
                className="w-full sm:w-auto"
              >
                <TabsList className="grid grid-cols-2 w-full sm:w-[180px]">
                  <TabsTrigger value="monthly" className="text-xs">
                    <CalendarDays className="h-3.5 w-3.5 mr-1.5" /> Monthly
                  </TabsTrigger>
                  <TabsTrigger value="weekly" className="text-xs">
                    <CalendarClock className="h-3.5 w-3.5 mr-1.5" /> Weekly
                  </TabsTrigger>
                </TabsList>
              </Tabs>
              <div className="flex gap-2">
                <Button variant="outline" onClick={applyRecommendedBudgets}>
                  <RefreshCcw className="h-3.5 w-3.5 mr-1.5" /> Auto-plan
                </Button>
                <Dialog open={isOpen} onOpenChange={setIsOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="mr-2 h-4 w-4" /> Set Budget
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Set {formData.period === "monthly" ? "Monthly" : "Weekly"} Budget</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 pt-4">
                      <div className="space-y-2">
                        <Label>Category</Label>
                        <Select
                          value={formData.category}
                          onValueChange={(v: string) => setFormData({ ...formData, category: v })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {unusedCategories.length > 0 ? (
                              unusedCategories.map((cat) => (
                                <SelectItem key={cat} value={cat}>
                                  {cat}
                                </SelectItem>
                              ))
                            ) : (
                              <SelectItem value="">All categories have budgets</SelectItem>
                            )}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>{formData.period === "monthly" ? "Monthly Limit" : "Weekly Limit"}</Label>
                        <Input
                          type="text"
                          value={formData.monthly_limit}
                          onChange={(e) => {
                            const value = e.target.value.replace(/[^0-9.]/g, "");
                            setFormData({ ...formData, monthly_limit: value });
                          }}
                          placeholder="0.00"
                          className="text-lg"
                        />
                        {plan.suggestedBudgets[formData.category] ? (
                          <p className="text-xs text-muted-foreground">
                            Suggested healthy {formData.period} limit:{" "}
                            {formatCurrency(
                              formData.period === "weekly"
                                ? plan.suggestedBudgets[formData.category] / 4.34
                                : plan.suggestedBudgets[formData.category],
                              currency
                            )}
                          </p>
                        ) : null}
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label>Period (YYYY-MM or YYYY-Www)</Label>
                          <Badge variant="outline" className="text-[10px] border-white/10 text-muted-foreground">
                            {formData.period}
                          </Badge>
                        </div>
                        <Input
                          type="text"
                          value={formData.period_key}
                          onChange={(e) => setFormData({ ...formData, period_key: e.target.value })}
                          placeholder={formData.period === "monthly" ? "2026-09" : "2026-W35"}
                        />
                        <p className="text-[11px] text-muted-foreground">
                          Monthly: YYYY-MM • Weekly: YYYY-Www (e.g. 2026-W35)
                        </p>
                      </div>
                      <div className="flex items-center justify-between rounded-lg border border-white/10 p-3 bg-white/5">
                        <div>
                          <p className="text-sm font-medium">Carry forward unspent</p>
                          <p className="text-xs text-muted-foreground">
                            Rolls leftover (or deficit) into next period's limit
                          </p>
                        </div>
                        <Switch
                          checked={formData.carry_forward}
                          onCheckedChange={(v) => setFormData({ ...formData, carry_forward: v })}
                        />
                      </div>
                      <Button onClick={addBudget} className="w-full" disabled={unusedCategories.length === 0}>
                        Set Budget
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium flex items-center gap-2">
                <Filter className="h-3.5 w-3.5 text-cyan-400" /> {period} view: {viewPeriodKey}
              </p>
              <div className="flex gap-2 mt-2 flex-wrap">
                <Input
                  type={period === "monthly" ? "month" : "text"}
                  value={viewPeriodKey}
                  onChange={(e) => setViewPeriodKey(e.target.value)}
                  className="h-9 w-40 text-xs"
                  placeholder={period === "monthly" ? "YYYY-MM" : "YYYY-Www"}
                />
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9"
                  onClick={() =>
                    setViewPeriodKey(period === "monthly" ? currentMonth : currentWeek)
                  }
                >
                  Current
                </Button>
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                Income {formatCurrency(plan.monthlyIncome, currency)} • Expenses{" "}
                {formatCurrency(plan.monthlyExpenses, currency)} • Surplus{" "}
                {formatCurrency(plan.monthlySurplus, currency)}
              </p>
            </div>
            <Badge className="w-fit bg-emerald-600/20 text-emerald-600">
              {plan.monthlySurplus >= 0 ? "Healthy surplus" : "Review spending"}
            </Badge>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg border border-border/60 bg-background/40 p-3">
              <p className="text-xs text-muted-foreground">Suggested savings</p>
              <p className="text-lg font-semibold">
                {formatCurrency(plan.recommendedMonthlySavings, currency)}
              </p>
            </div>
            <div className="rounded-lg border border-border/60 bg-background/40 p-3">
              <p className="text-xs text-muted-foreground">Priority categories</p>
              <p className="text-sm font-semibold">
                {plan.priorityCategories.slice(0, 2).join(", ") || "No spending yet"}
              </p>
            </div>
            <div className="rounded-lg border border-border/60 bg-background/40 p-3">
              <p className="text-xs text-muted-foreground">Budgeting rule</p>
              <p className="text-sm font-semibold">Keep flexible categories under 70% of income</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
        {budgetProgress.map((budget) => (
          <Card key={budget.id}>
            <CardContent className="pt-6">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold">{budget.category}</h3>
                    {budget.period === "weekly" && (
                      <Badge variant="secondary" className="text-[10px] h-4 px-1.5">
                        Weekly
                      </Badge>
                    )}
                    {budget.carry_forward && (
                      <Badge className="bg-violet-500/20 text-violet-400 border-violet-500/30 text-[10px] h-4 px-1.5">
                        Carry forward
                      </Badge>
                    )}
                    {budget.overBudget && <Badge className="bg-red-600 text-white">Over Budget</Badge>}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {formatCurrency(budget.spent, currency)} of{" "}
                    {formatCurrency(budget.effectiveLimit, currency)} effective
                    {budget.carry_forward && budget.carryAdjust !== 0 && (
                      <span className="ml-1 text-[11px]">
                        ({budget.carryAdjust > 0 ? "+" : ""}
                        {formatCurrency(budget.carryAdjust, currency)} rollover)
                      </span>
                    )}
                  </p>
                </div>
                <Button
                  size="sm"
                  onClick={() => deleteBudget(budget.id)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  Remove
                </Button>
              </div>
              <div className="mt-4">
                <Progress
                  value={budget.percentage}
                  className={`h-3 ${
                    budget.status === "danger"
                      ? "bg-red-200 [&>div]:bg-red-500"
                      : budget.status === "warning"
                      ? "bg-amber-200 [&>div]:bg-amber-500"
                      : "bg-green-200 [&>div]:bg-green-500"
                  }`}
                />
                <div className="flex justify-between mt-2 text-xs">
                  <span
                    className={`${
                      budget.status === "danger"
                        ? "text-red-600"
                        : budget.status === "warning"
                        ? "text-amber-600"
                        : "text-green-600"
                    }`}
                  >
                    {budget.percentage.toFixed(0)}% used
                  </span>
                  <span className="text-muted-foreground">
                    {formatCurrency(budget.effectiveLimit - budget.spent, currency)} remaining
                  </span>
                </div>
              </div>
              {budget.status === "warning" && (
                <div className="flex items-center gap-2 mt-3 text-amber-600 text-sm">
                  <AlertCircle className="h-4 w-4" />
                  <span>Approaching budget limit</span>
                </div>
              )}
              {budget.status === "danger" && !budget.overBudget && (
                <div className="flex items-center gap-2 mt-3 text-red-600 text-sm">
                  <AlertCircle className="h-4 w-4" />
                  <span>Near budget limit</span>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {budgetProgress.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              No budgets set for this {period} ({viewPeriodKey})
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Click "Set Budget" to start tracking your spending
            </p>
          </CardContent>
        </Card>
      )}

      {unusedCategories.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Categories Without Budgets</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {unusedCategories.map((cat) => (
                <Badge key={cat} className="bg-secondary text-secondary-foreground">
                  {cat}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </main>
  );
}

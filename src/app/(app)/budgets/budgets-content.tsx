"use client";

import * as React from "react";
import { Plus, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { supabase, getUser } from "@/lib/supabase";
import { formatCurrency, Currency, Transaction, Budget, CATEGORIES } from "@/lib/nhost";
import { useSearchParams } from "next/navigation";

export default function BudgetsContent() {
  const searchParams = useSearchParams();
  const currency = (searchParams.get("currency") as Currency) || "TZS";
  
  const [budgets, setBudgets] = React.useState<Budget[]>([]);
  const [transactions, setTransactions] = React.useState<Transaction[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [isOpen, setIsOpen] = React.useState(false);
  const currentMonth = new Date().toISOString().slice(0, 7);

  const [formData, setFormData] = React.useState({
    category: "Food",
    monthly_limit: "",
    month: currentMonth,
  });

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
      supabase.from('budgets').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
      supabase.from('transactions').select('*').eq('user_id', userId).eq('type', 'expense').order('date', { ascending: false }),
    ]);
    if (budgetRes.data) setBudgets(budgetRes.data);
    if (transRes.data) setTransactions(transRes.data);
    setLoading(false);
  }

  async function addBudget() {
    const user = await getUser();
    const userId = user?.id;
    if (!userId) return;
    const { error } = await supabase
      .from('budgets')
      .insert({ category: formData.category, monthly_limit: Number(formData.monthly_limit), month: formData.month, user_id: userId });
    if (!error) {
      setIsOpen(false);
      fetchData();
      setFormData({ category: "Food", monthly_limit: "", month: currentMonth });
    }
  }

  async function deleteBudget(id: string) {
    await supabase.from('budgets').delete().eq('id', id);
    fetchData();
  }

  const spendingByCategory = React.useMemo(() => {
    const map: Record<string, number> = {};
    transactions
      .filter(t => t.date.startsWith(currentMonth))
      .forEach(t => {
        map[t.category] = (map[t.category] || 0) + Number(t.amount);
      });
    return map;
  }, [transactions, currentMonth]);

  const currentBudgets = budgets.filter(b => b.month === currentMonth);

  const budgetProgress = currentBudgets.map(budget => {
    const spent = spendingByCategory[budget.category] || 0;
    const limit = Number(budget.monthly_limit);
    const percentage = (spent / limit) * 100;
    let status: "success" | "warning" | "danger" = "success";
    if (percentage >= 95) status = "danger";
    else if (percentage >= 75) status = "warning";
    
    return {
      ...budget,
      spent,
      percentage: Math.min(percentage, 100),
      status,
      overBudget: spent > limit
    };
  });

  const unusedCategories = CATEGORIES.filter(
    cat => !currentBudgets.some(b => b.category === cat)
  );

  if (loading) return <div className="p-6">Loading...</div>;

  return (
    <main className="flex-1 space-y-6 bg-background/50 p-4 sm:p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Budgets</h1>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" /> Set Budget</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Set Monthly Budget</DialogTitle>
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
                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                      ))
                    ) : (
                      <SelectItem value="">All categories have budgets</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Monthly Limit</Label>
                <Input
                  type="number"
                  value={formData.monthly_limit}
                  onChange={(e) => setFormData({ ...formData, monthly_limit: e.target.value })}
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-2">
                <Label>Month</Label>
                <Input
                  type="month"
                  value={formData.month}
                  onChange={(e) => setFormData({ ...formData, month: e.target.value })}
                />
              </div>
              <Button 
                onClick={addBudget} 
                className="w-full"
                disabled={unusedCategories.length === 0}
              >
                Set Budget
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Budget Progress */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
        {budgetProgress.map((budget) => (
          <Card key={budget.id}>
            <CardContent className="pt-6">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold">{budget.category}</h3>
                    {budget.overBudget && (
                      <Badge className="bg-red-600 text-white">Over Budget</Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {formatCurrency(budget.spent, currency)} of {formatCurrency(Number(budget.monthly_limit), currency)}
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
                    budget.status === "danger" ? "bg-red-200 [&>div]:bg-red-500" :
                    budget.status === "warning" ? "bg-amber-200 [&>div]:bg-amber-500" :
                    "bg-green-200 [&>div]:bg-green-500"
                  }`}
                />
                <div className="flex justify-between mt-2 text-xs">
                  <span className={`
                    ${budget.status === "danger" ? "text-red-600" :
                      budget.status === "warning" ? "text-amber-600" :
                      "text-green-600"}
                  `}>
                    {budget.percentage.toFixed(0)}% used
                  </span>
                  <span className="text-muted-foreground">
                    {formatCurrency(Number(budget.monthly_limit) - budget.spent, currency)} remaining
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
            <p className="text-muted-foreground">No budgets set for this month</p>
            <p className="text-sm text-muted-foreground mt-1">
              Click "Set Budget" to start tracking your spending
            </p>
          </CardContent>
        </Card>
      )}

      {/* Categories without budgets */}
      {unusedCategories.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Categories Without Budgets</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {unusedCategories.map(cat => (
                <Badge key={cat} className="bg-secondary text-secondary-foreground">{cat}</Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </main>
  );
}

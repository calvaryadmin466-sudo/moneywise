"use client";

import * as React from "react";
import { Search, Edit2, Trash2, Receipt, ArrowUpCircle, ArrowDownCircle, Filter } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase, getUser } from "@/lib/supabase";
import { formatCurrency, Currency, Transaction, CATEGORIES } from "@/lib/nhost";
import { useSearchParams } from "next/navigation";

export default function TransactionsContent() {
  const searchParams = useSearchParams();
  const currency = (searchParams.get("currency") as Currency) || "TZS";

  const [transactions, setTransactions] = React.useState<Transaction[]>([]);
  const [assets, setAssets] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [search, setSearch] = React.useState("");
  const [filterType, setFilterType] = React.useState<string>("all");
  const [filterCategory, setFilterCategory] = React.useState<string>("all");
  const [isEditOpen, setIsEditOpen] = React.useState(false);
  const [isAddOpen, setIsAddOpen] = React.useState(false);
  const [editingTransaction, setEditingTransaction] = React.useState<Transaction | null>(null);

  const [formData, setFormData] = React.useState({
    type: "expense" as "income" | "expense",
    amount: "",
    category: "Food",
    date: new Date().toISOString().split("T")[0],
    note: "",
    is_recurring: false,
    asset_id: "" as string,
  });

  React.useEffect(() => {
    fetchTransactionsAndAssets();
  }, []);

  async function fetchTransactionsAndAssets() {
    setLoading(true);
    const user = await getUser();
    const userId = user?.id;
    if (!userId) {
      setLoading(false);
      return;
    }

    // Fetch both transactions and assets using Supabase
    const [transRes, assetsRes] = await Promise.all([
      supabase.from('transactions').select('*').eq('user_id', userId).order('date', { ascending: false }),
      supabase.from('user_assets').select('id, name, type, balance, currency').eq('user_id', userId),
    ]);

    if (transRes.data) setTransactions(transRes.data);
    if (assetsRes.data) setAssets(assetsRes.data);
    setLoading(false);
  }

  async function addTransaction() {
    const user = await getUser();
    const userId = user?.id;
    if (!userId) return;
    
    const amount = Number(formData.amount);
    
    // Add transaction using Supabase
    const { error: transError } = await supabase
      .from('transactions')
      .insert({
        user_id: userId,
        type: formData.type,
        amount: amount,
        category: formData.category,
        date: formData.date,
        note: formData.note || null,
        is_recurring: formData.is_recurring,
      });
    
    // If asset selected, update asset balance
    if (!transError && formData.asset_id) {
      const selectedAsset = assets.find(a => a.id === formData.asset_id);
      if (selectedAsset) {
        const currentBalance = parseFloat(selectedAsset.balance) || 0;
        const newBalance = formData.type === "income" 
          ? currentBalance + amount 
          : currentBalance - amount;
        
        await supabase
          .from('user_assets')
          .update({ balance: newBalance, updated_at: new Date().toISOString() })
          .eq('id', formData.asset_id)
          .eq('user_id', userId);
      }
    }
    
    if (!transError) {
      fetchTransactionsAndAssets();
      setIsAddOpen(false);
      setFormData({
        type: "expense",
        amount: "",
        category: "Food",
        date: new Date().toISOString().split("T")[0],
        note: "",
        is_recurring: false,
        asset_id: "",
      });
    }
  }

  async function updateTransaction() {
    if (!editingTransaction) return;
    const { error } = await supabase
      .from('transactions')
      .update({
        type: formData.type,
        amount: Number(formData.amount),
        category: formData.category,
        date: formData.date,
        note: formData.note || null,
        is_recurring: formData.is_recurring,
      })
      .eq('id', editingTransaction.id);
    if (!error) {
      fetchTransactionsAndAssets();
      setIsEditOpen(false);
      setEditingTransaction(null);
    }
  }

  async function deleteTransaction(id: string) {
    const { error } = await supabase
      .from('transactions')
      .delete()
      .eq('id', id);
    if (!error) fetchTransactionsAndAssets();
  }

  function openEdit(transaction: Transaction) {
    setEditingTransaction(transaction);
    setFormData({
      type: transaction.type,
      amount: String(transaction.amount),
      category: transaction.category,
      date: transaction.date,
      note: transaction.note || "",
      is_recurring: transaction.is_recurring,
    });
    setIsEditOpen(true);
  }

  const filteredTransactions = transactions.filter((t) => {
    const matchesSearch = t.category.toLowerCase().includes(search.toLowerCase()) ||
                         (t.note && t.note.toLowerCase().includes(search.toLowerCase()));
    const matchesType = filterType === "all" || t.type === filterType;
    const matchesCategory = filterCategory === "all" || t.category === filterCategory;
    return matchesSearch && matchesType && matchesCategory;
  });

  const TransactionForm = ({ onSubmit, submitLabel }: { onSubmit: () => void; submitLabel: string }) => (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Type</Label>
          <Select
            value={formData.type}
            onValueChange={(v: string) => setFormData({ ...formData, type: v as "income" | "expense" })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="income">Income</SelectItem>
              <SelectItem value="expense">Expense</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Amount</Label>
          <Input
            type="number"
            value={formData.amount}
            onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
            placeholder="0.00"
          />
        </div>
      </div>
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
            {CATEGORIES.map((cat) => (
              <SelectItem key={cat} value={cat}>{cat}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      
      {assets.length > 0 && (
        <div className="space-y-2">
          <Label>Link to Asset (Optional)</Label>
          <Select
            value={formData.asset_id}
            onValueChange={(v: string) => setFormData({ ...formData, asset_id: v })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select asset to update..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">No asset (transaction only)</SelectItem>
              {assets.map((asset) => (
                <SelectItem key={asset.id} value={asset.id}>
                  {asset.name} ({asset.type}) - {asset.currency} {parseFloat(asset.balance).toLocaleString()}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-gray-500">
            {formData.type === "income" 
              ? "Income will ADD to selected asset balance" 
              : "Expense will SUBTRACT from selected asset balance"}
          </p>
        </div>
      )}
      
      <div className="space-y-2">
        <Label>Date</Label>
        <Input
          type="date"
          value={formData.date}
          onChange={(e) => setFormData({ ...formData, date: e.target.value })}
        />
      </div>
      <div className="space-y-2">
        <Label>Note</Label>
        <Input
          value={formData.note}
          onChange={(e) => setFormData({ ...formData, note: e.target.value })}
          placeholder="Optional note..."
        />
      </div>
      <div className="flex items-center gap-2">
        <Switch
          checked={formData.is_recurring}
          onCheckedChange={(v: boolean) => setFormData({ ...formData, is_recurring: v })}
        />
        <Label>Recurring Transaction</Label>
      </div>
      <Button onClick={onSubmit} className="w-full">{submitLabel}</Button>
    </div>
  );

  if (loading) {
    return (
      <main className="flex-1 space-y-6 bg-background/50 p-4 sm:p-6 overflow-x-auto">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
        </div>
        <Card>
          <CardContent className="pt-6">
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><Skeleton className="h-6 w-40" /></CardHeader>
          <CardContent className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-4">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                </div>
                <Skeleton className="h-5 w-20" />
              </div>
            ))}
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="flex-1 space-y-6 bg-background/50 p-4 sm:p-6 overflow-x-auto">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Transactions</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage and review all your financial transactions
          </p>
        </div>
        <Badge variant="secondary" className="w-fit">
          {filteredTransactions.length} records
        </Badge>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="grid gap-4 sm:grid-cols-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search transactions..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger>
                <Filter className="mr-2 h-4 w-4 text-muted-foreground" />
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="income">Income</SelectItem>
                <SelectItem value="expense">Expense</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {CATEGORIES.map((cat) => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              type="date"
              onChange={(e) => {
                // Date filter could be implemented here
              }}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5 text-primary" />
            All Transactions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {filteredTransactions.map((t) => (
              <div key={t.id} className="flex items-center justify-between rounded-lg border p-4 hover:bg-muted/30 transition-colors">
                <div className="flex items-center gap-4">
                  <div className={`h-10 w-10 rounded-full flex items-center justify-center ${
                    t.type === "income" ? "bg-emerald-500/10 text-emerald-500" : "bg-rose-500/10 text-rose-500"
                  }`}>
                    {t.type === "income" ? <ArrowUpCircle className="h-5 w-5" /> : <ArrowDownCircle className="h-5 w-5" />}
                  </div>
                  <div>
                    <p className="font-medium">{t.category}</p>
                    <p className="text-xs text-muted-foreground">{t.note || t.date}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className={`font-semibold ${t.type === "income" ? "text-emerald-500" : "text-rose-500"}`}>
                    {t.type === "income" ? "+" : "-"}{formatCurrency(Number(t.amount), currency)}
                  </div>
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" onClick={() => openEdit(t)}>
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" className="text-muted-foreground hover:text-destructive" onClick={() => deleteTransaction(t.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
            {filteredTransactions.length === 0 && (
              <div className="py-12 text-center">
                <Receipt className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
                <p className="text-muted-foreground font-medium">No transactions found</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Try adjusting your filters or add a new transaction
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Transaction</DialogTitle>
          </DialogHeader>
          <TransactionForm onSubmit={updateTransaction} submitLabel="Update Transaction" />
        </DialogContent>
      </Dialog>
    </main>
  );
}

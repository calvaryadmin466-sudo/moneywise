"use client";

import * as React from "react";
import { Search, Edit2, Trash2, Receipt, ArrowUpCircle, ArrowDownCircle, Filter, CalendarRange, X, ChevronDown, ChevronUp, Wallet } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Slider } from "@/components/ui/slider";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { supabase, getUser } from "@/lib/supabase";
import { formatCurrency, Currency, Transaction, CATEGORIES, Asset } from "@/lib/finance";
import { useSearchParams } from "next/navigation";

type DatePreset = "all" | "today" | "this_week" | "last_week" | "this_month" | "last_month" | "custom";

const DATE_PRESETS: { value: DatePreset; label: string }[] = [
  { value: "all", label: "All time" },
  { value: "today", label: "Today" },
  { value: "this_week", label: "This week" },
  { value: "last_week", label: "Last week" },
  { value: "this_month", label: "This month" },
  { value: "last_month", label: "Last month" },
  { value: "custom", label: "Custom range" },
];

function getDateRange(preset: DatePreset, customStart: string, customEnd: string): { start: string | null; end: string | null } {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const isoToday = today.toISOString().slice(0, 10);

  switch (preset) {
    case "all":
      return { start: null, end: null };
    case "today":
      return { start: isoToday, end: isoToday };
    case "this_week": {
      const day = today.getDay();
      const diffToMonday = (day + 6) % 7;
      const monday = new Date(today);
      monday.setDate(today.getDate() - diffToMonday);
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      return { start: monday.toISOString().slice(0, 10), end: sunday.toISOString().slice(0, 10) };
    }
    case "last_week": {
      const day = today.getDay();
      const diffToMonday = (day + 6) % 7;
      const lastMonday = new Date(today);
      lastMonday.setDate(today.getDate() - diffToMonday - 7);
      const lastSunday = new Date(lastMonday);
      lastSunday.setDate(lastMonday.getDate() + 6);
      return { start: lastMonday.toISOString().slice(0, 10), end: lastSunday.toISOString().slice(0, 10) };
    }
    case "this_month": {
      const first = new Date(today.getFullYear(), today.getMonth(), 1);
      const last = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      return { start: first.toISOString().slice(0, 10), end: last.toISOString().slice(0, 10) };
    }
    case "last_month": {
      const first = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const last = new Date(today.getFullYear(), today.getMonth(), 0);
      return { start: first.toISOString().slice(0, 10), end: last.toISOString().slice(0, 10) };
    }
    case "custom":
      return { start: customStart || null, end: customEnd || null };
  }
}

export default function TransactionsContent() {
  const searchParams = useSearchParams();
  const currency = (searchParams.get("currency") as Currency) || "TZS";

  const [transactions, setTransactions] = React.useState<Transaction[]>([]);
  const [assets, setAssets] = React.useState<Asset[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [search, setSearch] = React.useState("");
  const [filterType, setFilterType] = React.useState<string>(() => {
    const type = searchParams.get("type");
    return type === "income" || type === "expense" ? type : "all";
  });
  const [filterCategory, setFilterCategory] = React.useState<string>("all");
  const [isEditOpen, setIsEditOpen] = React.useState(false);
  const [isAddOpen, setIsAddOpen] = React.useState(false);
  const [editingTransaction, setEditingTransaction] = React.useState<Transaction | null>(null);
  const hasOpenedFromLink = React.useRef(false);
  const [filtersExpanded, setFiltersExpanded] = React.useState(true);

  const [datePreset, setDatePreset] = React.useState<DatePreset>("all");
  const [customDateStart, setCustomDateStart] = React.useState<string>("");
  const [customDateEnd, setCustomDateEnd] = React.useState<string>("");

  const [amountRange, setAmountRange] = React.useState<[number, number]>([0, 1]);
  const [amountMin, setAmountMin] = React.useState<string>("");
  const [amountMax, setAmountMax] = React.useState<string>("");

  const [filterAssetId, setFilterAssetId] = React.useState<string>("all");
  const [filterAssetType, setFilterAssetType] = React.useState<string>("all");

  const [formData, setFormData] = React.useState({
    type: "expense" as "income" | "expense",
    amount: "",
    category: "Food",
    date: new Date().toISOString().split("T")[0],
    note: "",
    is_recurring: false,
    asset_id: "" as string,
    income_source: "" as string,
  });

  React.useEffect(() => {
    fetchTransactionsAndAssets();
  }, []);

  React.useEffect(() => {
    const type = searchParams.get("type");
    const nextType = type === "income" || type === "expense" ? type : "all";
    setFilterType(nextType);

    if (type === "income" && !hasOpenedFromLink.current) {
      setFormData((prev) => ({ ...prev, type: "income" }));
      setIsAddOpen(true);
      hasOpenedFromLink.current = true;
    } else if (type !== "income") {
      hasOpenedFromLink.current = false;
    }
  }, [searchParams]);

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
    if (assetsRes.data) setAssets(assetsRes.data as Asset[]);
    setLoading(false);
  }

  function openAddTransaction(type: "income" | "expense" = "expense") {
    setFormData((prev) => ({ ...prev, type, amount: "", note: "", asset_id: "", income_source: "" }));
    setIsAddOpen(true);
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

    if (!transError && formData.asset_id) {
      const selectedAsset = assets.find(a => a.id === formData.asset_id);
      if (selectedAsset) {
        const currentBalance = Number(selectedAsset.balance) || 0;
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
        income_source: "",
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
      type: (transaction.type === 'transfer' ? 'expense' : transaction.type) as "income" | "expense",
      amount: String(transaction.amount),
      category: transaction.category,
      date: transaction.date,
      note: transaction.note || "",
      is_recurring: transaction.is_recurring,
      asset_id: transaction.asset_id || "",
      income_source: transaction.income_source || "",
    });
    setIsEditOpen(true);
  }

  const amountBounds = React.useMemo(() => {
    const amounts = transactions.map(t => Number(t.amount));
    if (amounts.length === 0) return { min: 0, max: 1 };
    return { min: 0, max: Math.max(...amounts, 1) };
  }, [transactions]);

  React.useEffect(() => {
    setAmountRange([0, 1]);
  }, [amountBounds.max]);

  const activeFilterCount = React.useMemo(() => {
    let c = 0;
    if (search) c++;
    if (filterType !== "all") c++;
    if (filterCategory !== "all") c++;
    if (datePreset !== "all") c++;
    if (amountMin || amountMax || amountRange[0] > 0 || amountRange[1] < 1) c++;
    if (filterAssetId !== "all") c++;
    if (filterAssetType !== "all") c++;
    return c;
  }, [search, filterType, filterCategory, datePreset, amountMin, amountMax, amountRange, filterAssetId, filterAssetType]);

  function clearAllFilters() {
    setSearch("");
    setFilterType("all");
    setFilterCategory("all");
    setDatePreset("all");
    setCustomDateStart("");
    setCustomDateEnd("");
    setAmountMin("");
    setAmountMax("");
    setAmountRange([0, 1]);
    setFilterAssetId("all");
    setFilterAssetType("all");
  }

  const filteredTransactions = transactions.filter((t) => {
    const searchLc = search.toLowerCase();
    const matchesSearch = !search ||
      t.category.toLowerCase().includes(searchLc) ||
      (t.note && t.note.toLowerCase().includes(searchLc)) ||
      (t.income_source && t.income_source.toLowerCase().includes(searchLc));

    const matchesType = filterType === "all" || t.type === filterType;
    const matchesCategory = filterCategory === "all" || t.category === filterCategory;

    const { start: drStart, end: drEnd } = getDateRange(datePreset, customDateStart, customDateEnd);
    const matchesDate = (!drStart || t.date >= drStart) && (!drEnd || t.date <= drEnd);

    const amt = Number(t.amount);
    const absMin = amountMin ? Number(amountMin) : amountBounds.min + amountRange[0] * (amountBounds.max - amountBounds.min);
    const absMax = amountMax ? Number(amountMax) : amountBounds.min + amountRange[1] * (amountBounds.max - amountBounds.min);
    const effectiveMin = amountMin || amountRange[0] > 0 ? Math.min(absMin, absMax) : -Infinity;
    const effectiveMax = amountMax || amountRange[1] < 1 ? Math.max(absMin, absMax) : Infinity;
    const matchesAmount = amt >= effectiveMin && amt <= effectiveMax;

    const matchesAssetId = filterAssetId === "all" || t.asset_id === filterAssetId;

    const assetForTx = assets.find(a => a.id === t.asset_id);
    const matchesAssetType = filterAssetType === "all" || (assetForTx && assetForTx.type === filterAssetType);

    return matchesSearch && matchesType && matchesCategory && matchesDate && matchesAmount && matchesAssetId && matchesAssetType;
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
            value={formData.asset_id || "none"}
            onValueChange={(v: string) => setFormData({ ...formData, asset_id: v === "none" ? "" : v })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select asset to update..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No asset (transaction only)</SelectItem>
              {assets.map((asset) => (
                <SelectItem key={asset.id} value={asset.id}>
                  {asset.name} ({asset.type}) - {asset.currency} {asset.balance.toLocaleString()}
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

      {formData.type === "income" && (
        <div className="space-y-2">
          <Label>Source of Income</Label>
          <Select
            value={formData.income_source}
            onValueChange={(v: string) => setFormData({ ...formData, income_source: v })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select income source" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Personal Business">Personal Business</SelectItem>
              <SelectItem value="Work">Work</SelectItem>
              <SelectItem value="Projects">Projects</SelectItem>
              <SelectItem value="Farming">Farming</SelectItem>
              <SelectItem value="Other">Other</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-gray-500">Choose where the income came from for better tracking.</p>
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
        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={() => openAddTransaction("income")} className="bg-emerald-600 hover:bg-emerald-500">
            Add Income
          </Button>
          <Button variant="outline" onClick={() => openAddTransaction("expense")}>
            Add Expense
          </Button>
          <Badge variant="secondary" className="w-fit">
            {filteredTransactions.length} records
          </Badge>
        </div>
      </div>

      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="relative flex-1 sm:max-w-md">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by category, note, or source..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex items-center gap-2">
              {activeFilterCount > 0 && (
                <Button variant="ghost" size="sm" onClick={clearAllFilters} className="h-9 text-xs">
                  <X className="h-3.5 w-3.5 mr-1.5" /> Clear ({activeFilterCount})
                </Button>
              )}
              <Collapsible open={filtersExpanded} onOpenChange={setFiltersExpanded} className="w-full sm:w-auto">
                <CollapsibleTrigger asChild>
                  <Button variant="outline" size="sm" className="h-9 w-full sm:w-auto">
                    <Filter className="h-3.5 w-3.5 mr-1.5" />
                    Filters
                    {filtersExpanded ? <ChevronUp className="h-3.5 w-3.5 ml-1.5" /> : <ChevronDown className="h-3.5 w-3.5 ml-1.5" />}
                  </Button>
                </CollapsibleTrigger>
              </Collapsible>
            </div>
          </div>

          <Collapsible open={filtersExpanded}>
            <CollapsibleContent className="space-y-4 pt-2">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <Select value={filterType} onValueChange={setFilterType}>
                  <SelectTrigger className="h-9">
                    <Filter className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
                    <SelectValue placeholder="Transaction type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="income">Income</SelectItem>
                    <SelectItem value="expense">Expense</SelectItem>
                    <SelectItem value="transfer">Transfer</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={filterCategory} onValueChange={setFilterCategory}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {CATEGORIES.map((cat) => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={filterAssetType} onValueChange={setFilterAssetType}>
                  <SelectTrigger className="h-9">
                    <Wallet className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
                    <SelectValue placeholder="Account type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Account Types</SelectItem>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="bank_account">Bank Account</SelectItem>
                    <SelectItem value="credit_card">Credit Card</SelectItem>
                    <SelectItem value="mobile_money">Mobile Money</SelectItem>
                    <SelectItem value="stocks">Stocks</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={filterAssetId} onValueChange={setFilterAssetId}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Specific account" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Accounts</SelectItem>
                    {assets.map((a) => (
                      <SelectItem key={a.id} value={a.id}>
                        {a.name} ({a.type})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <CalendarRange className="h-4 w-4 text-muted-foreground" />
                  <Label className="text-xs font-medium text-muted-foreground">Date Range</Label>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <Select value={datePreset} onValueChange={(v: string) => setDatePreset(v as DatePreset)}>
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Quick date" />
                    </SelectTrigger>
                    <SelectContent>
                      {DATE_PRESETS.map((p) => (
                        <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    type="month"
                    value={datePreset === "this_month" || datePreset === "last_month" ? "" : customDateStart?.slice(0, 7) || ""}
                    onChange={(e) => {
                      if (e.target.value) {
                        setDatePreset("custom");
                        setCustomDateStart(`${e.target.value}-01`);
                        const [y, m] = e.target.value.split("-");
                        const last = new Date(Number(y), Number(m), 0);
                        setCustomDateEnd(`${e.target.value}-${String(last.getDate()).padStart(2, "0")}`);
                      }
                    }}
                    className="h-9"
                    placeholder="Month picker"
                  />
                  <Input
                    type="date"
                    value={datePreset === "custom" ? customDateStart : ""}
                    onChange={(e) => {
                      setDatePreset("custom");
                      setCustomDateStart(e.target.value);
                    }}
                    className="h-9"
                    placeholder="From"
                    disabled={datePreset !== "custom"}
                  />
                  <Input
                    type="date"
                    value={datePreset === "custom" ? customDateEnd : ""}
                    onChange={(e) => {
                      setDatePreset("custom");
                      setCustomDateEnd(e.target.value);
                    }}
                    className="h-9"
                    placeholder="To"
                    disabled={datePreset !== "custom"}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ArrowUpCircle className="h-4 w-4 text-muted-foreground" />
                    <Label className="text-xs font-medium text-muted-foreground">Amount Range</Label>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{formatCurrency(amountBounds.min + amountRange[0] * (amountBounds.max - amountBounds.min), currency)}</span>
                    <span>—</span>
                    <span>{formatCurrency(amountBounds.min + amountRange[1] * (amountBounds.max - amountBounds.min), currency)}</span>
                  </div>
                </div>
                <Slider
                  value={amountRange}
                  onValueChange={(v: number[]) => setAmountRange(v as [number, number])}
                  min={0}
                  max={1}
                  step={0.01}
                  className="py-2"
                />
                <div className="grid gap-3 grid-cols-2 sm:grid-cols-2">
                  <div className="relative">
                    <Input
                      type="text"
                      inputMode="decimal"
                      placeholder="Min amount"
                      value={amountMin}
                      onChange={(e) => setAmountMin(e.target.value.replace(/[^0-9.]/g, ""))}
                      className="h-9 pl-3"
                    />
                  </div>
                  <div className="relative">
                    <Input
                      type="text"
                      inputMode="decimal"
                      placeholder="Max amount"
                      value={amountMax}
                      onChange={(e) => setAmountMax(e.target.value.replace(/[^0-9.]/g, ""))}
                      className="h-9 pl-3"
                    />
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 pt-1">
                {datePreset !== "all" && (
                  <Badge variant="secondary" className="h-6 gap-1">
                    <CalendarRange className="h-3 w-3" />
                    {DATE_PRESETS.find(p => p.value === datePreset)?.label}
                    <X className="h-3 w-3 cursor-pointer ml-0.5" onClick={() => setDatePreset("all")} />
                  </Badge>
                )}
                {filterType !== "all" && (
                  <Badge variant="secondary" className="h-6 gap-1 capitalize">
                    {filterType}
                    <X className="h-3 w-3 cursor-pointer ml-0.5" onClick={() => setFilterType("all")} />
                  </Badge>
                )}
                {filterCategory !== "all" && (
                  <Badge variant="secondary" className="h-6 gap-1">
                    {filterCategory}
                    <X className="h-3 w-3 cursor-pointer ml-0.5" onClick={() => setFilterCategory("all")} />
                  </Badge>
                )}
                {filterAssetId !== "all" && (
                  <Badge variant="secondary" className="h-6 gap-1">
                    <Wallet className="h-3 w-3" />
                    {assets.find(a => a.id === filterAssetId)?.name || "Account"}
                    <X className="h-3 w-3 cursor-pointer ml-0.5" onClick={() => setFilterAssetId("all")} />
                  </Badge>
                )}
                {filterAssetType !== "all" && (
                  <Badge variant="secondary" className="h-6 gap-1 capitalize">
                    {filterAssetType.replace("_", " ")}
                    <X className="h-3 w-3 cursor-pointer ml-0.5" onClick={() => setFilterAssetType("all")} />
                  </Badge>
                )}
                {(amountMin || amountMax || amountRange[0] > 0 || amountRange[1] < 1) && (
                  <Badge variant="secondary" className="h-6 gap-1">
                    Amount filtered
                    <X className="h-3 w-3 cursor-pointer ml-0.5" onClick={() => { setAmountMin(""); setAmountMax(""); setAmountRange([0, 1]); }} />
                  </Badge>
                )}
              </div>
            </CollapsibleContent>
          </Collapsible>
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
                  <div className={`h-10 w-10 rounded-full flex items-center justify-center ${t.type === "income" ? "bg-emerald-500/10 text-emerald-500" : "bg-rose-500/10 text-rose-500"
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

      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{formData.type === "income" ? "Add Income" : "Add Expense"}</DialogTitle>
          </DialogHeader>
          <TransactionForm onSubmit={addTransaction} submitLabel={formData.type === "income" ? "Save Income" : "Save Expense"} />
        </DialogContent>
      </Dialog>

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

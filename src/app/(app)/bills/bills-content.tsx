"use client";

import * as React from "react";
import {
  Bell,
  BellRing,
  BellOff,
  Plus,
  CheckCircle2,
  SkipForward,
  Clock,
  CalendarDays,
  Trash2,
  Edit2,
  AlertTriangle,
  CalendarClock,
  CreditCard,
  Search,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { supabase, getUser } from "@/lib/supabase";
import { formatCurrency, Currency, CATEGORIES, Asset } from "@/lib/finance";
import { useSearchParams } from "next/navigation";
import {
  BillReminder,
  Recurrence,
  RECURRENCE_OPTIONS,
  computeNextDue,
  daysUntil,
  getBillStatus,
  isDueSoon,
  isOverdue,
} from "@/lib/bills";

type TabKey = "upcoming" | "overdue" | "paid" | "all";

export default function BillsContent() {
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const currency = (searchParams.get("currency") as Currency) || "TZS";

  const [bills, setBills] = React.useState<BillReminder[]>([]);
  const [assets, setAssets] = React.useState<Asset[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [isAddOpen, setIsAddOpen] = React.useState(false);
  const [isEditOpen, setIsEditOpen] = React.useState(false);
  const [editingBill, setEditingBill] = React.useState<BillReminder | null>(null);
  const [search, setSearch] = React.useState("");
  const [activeTab, setActiveTab] = React.useState<TabKey>("upcoming");

  const [form, setForm] = React.useState({
    title: "",
    amount: "",
    next_due_date: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
    recurrence: "monthly" as Recurrence,
    remind_days_before: 3,
    category: CATEGORIES[0] as string,
    asset_id: "" as string,
  });

  React.useEffect(() => {
    loadBills();
  }, []);

  async function loadBills() {
    setLoading(true);
    const user = await getUser();
    const userId = user?.id;
    if (!userId) {
      setLoading(false);
      return;
    }
    const [billsRes, assetsRes] = await Promise.all([
      supabase.from("bill_reminders").select("*").eq("user_id", userId).order("next_due_date", { ascending: true }),
      supabase.from("user_assets").select("id, name, type, balance, currency").eq("user_id", userId),
    ]);
    if (billsRes.data) setBills(billsRes.data);
    if (assetsRes.data) setAssets(assetsRes.data as Asset[]);
    setLoading(false);
  }

  function resetForm() {
    setForm({
      title: "",
      amount: "",
      next_due_date: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
      recurrence: "monthly",
      remind_days_before: 3,
      category: CATEGORIES[0],
      asset_id: "",
    });
  }

  async function handleAdd() {
    const user = await getUser();
    if (!user) return;
    if (!form.title || !form.amount || !form.next_due_date) {
      toast({ title: "Missing fields", description: "Please complete title, amount, and due date", variant: "destructive" });
      return;
    }
    const { error } = await supabase.from("bill_reminders").insert({
      user_id: user.id,
      title: form.title,
      amount: Number(form.amount),
      next_due_date: form.next_due_date,
      recurrence: form.recurrence,
      remind_days_before: form.remind_days_before,
      category: form.category,
      asset_id: form.asset_id || null,
    });
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Reminder created" });
      setIsAddOpen(false);
      resetForm();
      loadBills();
    }
  }

  async function handleUpdate() {
    if (!editingBill) return;
    const { error } = await supabase
      .from("bill_reminders")
      .update({
        title: form.title,
        amount: Number(form.amount),
        next_due_date: form.next_due_date,
        recurrence: form.recurrence,
        remind_days_before: form.remind_days_before,
        category: form.category,
        asset_id: form.asset_id || null,
      })
      .eq("id", editingBill.id);
    if (!error) {
      setIsEditOpen(false);
      setEditingBill(null);
      resetForm();
      loadBills();
    }
  }

  async function handleDelete(id: string) {
    const { error } = await supabase.from("bill_reminders").delete().eq("id", id);
    if (!error) loadBills();
  }

  async function handleMarkPaid(bill: BillReminder) {
    const user = await getUser();
    if (!user) return;

    let linkedTxId = null;
    if (bill.asset_id) {
      const { data: tx } = await supabase
        .from("transactions")
        .insert({
          user_id: user.id,
          type: "expense",
          amount: Number(bill.amount),
          category: bill.category || "Other",
          date: new Date().toISOString().slice(0, 10),
          note: `Bill payment: ${bill.title}`,
          is_recurring: false,
          asset_id: bill.asset_id,
        })
        .select("id")
        .single();
      if (tx) linkedTxId = tx.id;

      const asset = assets.find((a) => a.id === bill.asset_id);
      if (asset) {
        const newBalance = Number(asset.balance) - Number(bill.amount);
        await supabase
          .from("user_assets")
          .update({ balance: newBalance, updated_at: new Date().toISOString() })
          .eq("id", asset.id);
      }
    }

    const nextDue = bill.recurrence === "once" ? bill.next_due_date : computeNextDue(bill.next_due_date, bill.recurrence);
    const { error } = await supabase
      .from("bill_reminders")
      .update({
        next_due_date: nextDue,
        is_paid_last: true,
        last_notified_at: null,
        snooze_until: null,
      })
      .eq("id", bill.id);

    if (!error) {
      toast({ title: "Marked paid", description: linkedTxId ? "Transaction + asset balance recorded" : "Next due: " + nextDue });
      loadBills();
    }
  }

  async function handleSkipOnce(bill: BillReminder) {
    if (bill.recurrence === "once") {
      toast({ title: "Cannot skip a one-time bill", variant: "destructive" });
      return;
    }
    const nextDue = computeNextDue(bill.next_due_date, bill.recurrence);
    const { error } = await supabase.from("bill_reminders").update({ next_due_date: nextDue, is_paid_last: false }).eq("id", bill.id);
    if (!error) loadBills();
  }

  async function handleSnooze(bill: BillReminder, hours: number = 24) {
    const snoozeUntil = new Date(Date.now() + hours * 3600 * 1000).toISOString();
    const { error } = await supabase.from("bill_reminders").update({ snooze_until: snoozeUntil }).eq("id", bill.id);
    if (!error) loadBills();
  }

  function openEdit(bill: BillReminder) {
    setEditingBill(bill);
    setForm({
      title: bill.title,
      amount: String(bill.amount),
      next_due_date: bill.next_due_date,
      recurrence: bill.recurrence,
      remind_days_before: bill.remind_days_before,
      category: bill.category || CATEGORIES[0],
      asset_id: bill.asset_id || "",
    });
    setIsEditOpen(true);
  }

  const filteredBills = React.useMemo(() => {
    const searchLc = search.toLowerCase();
    return bills.filter((b) => {
      if (search && !b.title.toLowerCase().includes(searchLc)) return false;
      const overdue = isOverdue(b.next_due_date);
      const upcoming = !overdue && daysUntil(b.next_due_date) <= 30;
      switch (activeTab) {
        case "overdue":
          return overdue;
        case "paid":
          return b.is_paid_last;
        case "upcoming":
          return !overdue && !b.is_paid_last && upcoming;
        case "all":
        default:
          return true;
      }
    });
  }, [bills, search, activeTab]);

  const stats = React.useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    const monthKey = today.slice(0, 7);
    const monthBills = bills.filter((b) => b.next_due_date.startsWith(monthKey));
    const totalDue = monthBills.reduce((s, b) => s + Number(b.amount), 0);
    const overdueCount = bills.filter((b) => isOverdue(b.next_due_date)).length;
    const dueSoonCount = bills.filter((b) => isDueSoon(b.next_due_date, b.remind_days_before || 3) && !isOverdue(b.next_due_date)).length;
    return { totalDue, count: monthBills.length, overdueCount, dueSoonCount };
  }, [bills]);

  const BillForm = ({ submitLabel, onSubmit }: { submitLabel: string; onSubmit: () => void }) => (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Bill name</Label>
        <Input
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          placeholder="e.g. Rent, Internet, Gym membership"
        />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Amount</Label>
          <Input
            type="text"
            value={form.amount}
            onChange={(e) => setForm({ ...form, amount: e.target.value.replace(/[^0-9.]/g, "") })}
            placeholder="0.00"
          />
        </div>
        <div className="space-y-2">
          <Label>Next due date</Label>
          <Input
            type="date"
            value={form.next_due_date}
            onChange={(e) => setForm({ ...form, next_due_date: e.target.value })}
          />
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Repeats</Label>
          <Select value={form.recurrence} onValueChange={(v: string) => setForm({ ...form, recurrence: v as Recurrence })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {RECURRENCE_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Remind (days before)</Label>
          <Input
            type="number"
            min={0}
            max={30}
            value={String(form.remind_days_before)}
            onChange={(e) => setForm({ ...form, remind_days_before: Math.max(0, Math.min(30, Number(e.target.value) || 0)) })}
          />
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Category</Label>
          <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CATEGORIES.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Pay from account (optional)</Label>
          <Select value={form.asset_id || "none"} onValueChange={(v) => setForm({ ...form, asset_id: v === "none" ? "" : v })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Don't auto-pay</SelectItem>
              {assets.map((a) => (
                <SelectItem key={a.id} value={a.id}>
                  {a.name} — {a.currency} {Number(a.balance).toLocaleString()}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <Button onClick={onSubmit} className="w-full bg-gradient-to-r from-cyan-500 to-blue-600">
        {submitLabel}
      </Button>
    </div>
  );

  if (loading) {
    return (
      <main className="flex-1 space-y-6 bg-background/50 p-4 sm:p-6 overflow-y-auto">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-2xl" />
          ))}
        </div>
        <Skeleton className="h-96 rounded-2xl" />
      </main>
    );
  }

  return (
    <main className="flex-1 space-y-6 bg-background/50 p-4 sm:p-6 overflow-y-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <BellRing className="h-6 w-6 text-cyan-400" /> Bills & reminders
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Track due dates, auto-pay from linked accounts, never miss a payment</p>
        </div>
        <Dialog open={isAddOpen} onOpenChange={(v) => { setIsAddOpen(v); if (!v) resetForm(); }}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-to-r from-cyan-500 to-blue-600">
              <Plus className="mr-2 h-4 w-4" /> New reminder
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create bill reminder</DialogTitle>
            </DialogHeader>
            <BillForm submitLabel="Create reminder" onSubmit={handleAdd} />
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="glass-card border-cyan-500/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2 text-cyan-400">
              <CalendarClock className="h-4 w-4" /> This month due
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.totalDue, currency)}</div>
            <p className="text-xs text-muted-foreground mt-1">{stats.count} scheduled payments</p>
          </CardContent>
        </Card>
        <Card className="glass-card border-rose-500/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2 text-rose-400">
              <AlertTriangle className="h-4 w-4" /> Overdue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-rose-400">{stats.overdueCount}</div>
            <p className="text-xs text-muted-foreground mt-1">Payments past their due date</p>
          </CardContent>
        </Card>
        <Card className="glass-card border-amber-500/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2 text-amber-400">
              <Clock className="h-4 w-4" /> Due soon
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-400">{stats.dueSoonCount}</div>
            <p className="text-xs text-muted-foreground mt-1">Within notification window</p>
          </CardContent>
        </Card>
        <Card className="glass-card border-emerald-500/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2 text-emerald-400">
              <CheckCircle2 className="h-4 w-4" /> On-track
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-400">
              {Math.max(0, bills.length - stats.overdueCount)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Total active reminders</p>
          </CardContent>
        </Card>
      </div>

      <Card className="glass-card border-white/10">
        <CardContent className="pt-6 space-y-4">
          <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search reminders..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabKey)} className="w-full sm:w-auto">
              <TabsList className="grid grid-cols-4 w-full sm:w-auto">
                <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
                <TabsTrigger value="overdue">Overdue</TabsTrigger>
                <TabsTrigger value="paid">Paid</TabsTrigger>
                <TabsTrigger value="all">All</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-3">
        {filteredBills.length === 0 ? (
          <Card className="glass-card border-dashed border-white/20">
            <CardContent className="py-12 text-center">
              <Bell className="h-12 w-12 text-muted-foreground/40 mx-auto mb-3" />
              <p className="font-medium">No reminders in this view</p>
              <p className="text-sm text-muted-foreground mt-1">
                {bills.length === 0 ? "Create your first bill reminder to get started" : "Try another tab or clear search"}
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredBills.map((bill) => {
            const status = getBillStatus(bill);
            const days = daysUntil(bill.next_due_date);
            const linkedAsset = assets.find((a) => a.id === bill.asset_id);

            return (
              <Card
                key={bill.id}
                className={`glass-card transition-colors ${
                  status === "overdue"
                    ? "border-rose-500/40"
                    : status === "due-soon"
                    ? "border-amber-500/30"
                    : status === "snoozed"
                    ? "border-slate-500/30"
                    : "border-white/10"
                }`}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-4 min-w-0 flex-1">
                      <div
                        className={`h-11 w-11 shrink-0 rounded-xl flex items-center justify-center ${
                          status === "overdue"
                            ? "bg-rose-500/15 text-rose-400"
                            : status === "due-soon"
                            ? "bg-amber-500/15 text-amber-400"
                            : status === "snoozed"
                            ? "bg-slate-500/15 text-slate-400"
                            : "bg-cyan-500/15 text-cyan-400"
                        }`}
                      >
                        {status === "overdue" ? (
                          <AlertTriangle className="h-5 w-5" />
                        ) : status === "snoozed" ? (
                          <BellOff className="h-5 w-5" />
                        ) : (
                          <CalendarDays className="h-5 w-5" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-semibold truncate">{bill.title}</h3>
                          {bill.recurrence !== "once" && (
                            <Badge variant="secondary" className="text-[10px] h-5">
                              {RECURRENCE_OPTIONS.find((r) => r.value === bill.recurrence)?.label}
                            </Badge>
                          )}
                          {bill.category && (
                            <Badge variant="outline" className="text-[10px] h-5 border-white/10 text-muted-foreground">
                              {bill.category}
                            </Badge>
                          )}
                          {bill.is_paid_last && (
                            <Badge className="bg-emerald-500/20 text-emerald-400 text-[10px] h-5">Last paid</Badge>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1 text-xs text-muted-foreground">
                          <span className="inline-flex items-center gap-1">
                            <CalendarDays className="h-3 w-3" />
                            {bill.next_due_date}
                          </span>
                          <span>
                            {days < 0
                              ? `${Math.abs(days)} day${Math.abs(days) === 1 ? "" : "s"} overdue`
                              : days === 0
                              ? "Due today"
                              : `in ${days} day${days === 1 ? "" : "s"}`}
                          </span>
                          {linkedAsset && (
                            <span className="inline-flex items-center gap-1">
                              <CreditCard className="h-3 w-3" />
                              {linkedAsset.name}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-xl font-bold">{formatCurrency(Number(bill.amount), currency)}</div>
                      <div className="flex items-center justify-end gap-1 mt-2">
                        <Button size="icon" variant="ghost" className="h-8 w-8 hover:bg-emerald-500/10 hover:text-emerald-400" onClick={() => handleMarkPaid(bill)} title="Mark paid">
                          <CheckCircle2 className="h-4 w-4" />
                        </Button>
                        {bill.recurrence !== "once" && (
                          <Button size="icon" variant="ghost" className="h-8 w-8 hover:bg-sky-500/10 hover:text-sky-400" onClick={() => handleSkipOnce(bill)} title="Skip once">
                            <SkipForward className="h-4 w-4" />
                          </Button>
                        )}
                        <Button size="icon" variant="ghost" className="h-8 w-8 hover:bg-amber-500/10 hover:text-amber-400" onClick={() => handleSnooze(bill, 24)} title="Snooze 24h">
                          <BellOff className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-8 w-8 hover:bg-white/10" onClick={() => openEdit(bill)} title="Edit">
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-8 w-8 hover:bg-rose-500/10 hover:text-rose-400" onClick={() => handleDelete(bill.id)} title="Delete">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      <Dialog open={isEditOpen} onOpenChange={(v) => { setIsEditOpen(v); if (!v) { setEditingBill(null); resetForm(); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit reminder</DialogTitle>
          </DialogHeader>
          <BillForm submitLabel="Save changes" onSubmit={handleUpdate} />
        </DialogContent>
      </Dialog>
    </main>
  );
}

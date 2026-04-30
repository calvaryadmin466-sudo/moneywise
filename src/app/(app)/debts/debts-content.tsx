"use client";

import * as React from "react";
import { Plus, AlertCircle, CheckCircle2, Clock, ArrowUpCircle, ArrowDownCircle, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createClient } from "@/lib/supabase-browser";
import { Debt, formatCurrency, Currency } from "@/lib/supabase";
import { useSearchParams } from "next/navigation";

export default function DebtsContent() {
  const searchParams = useSearchParams();
  const currency = (searchParams.get("currency") as Currency) || "TZS";
  
  const [debts, setDebts] = React.useState<Debt[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [isOpen, setIsOpen] = React.useState(false);

  const [formData, setFormData] = React.useState({
    name: "",
    amount: "",
    direction: "i_owe" as "i_owe" | "they_owe",
    due_date: "",
  });

  React.useEffect(() => {
    fetchDebts();
  }, []);

  async function fetchDebts() {
    setLoading(true);
    const supabase = createClient();
    const { data } = await supabase.from("debts").select("*").order("created_at", { ascending: false });
    if (data) setDebts(data);
    setLoading(false);
  }

  async function addDebt() {
    const supabase = createClient();
    const { error } = await supabase.from("debts").insert([{
      name: formData.name,
      amount: Number(formData.amount),
      direction: formData.direction,
      due_date: formData.due_date || null,
    }]);
    if (!error) {
      setIsOpen(false);
      fetchDebts();
      setFormData({ name: "", amount: "", direction: "i_owe", due_date: "" });
    }
  }

  async function togglePaid(id: string, currentStatus: boolean) {
    const supabase = createClient();
    await supabase.from("debts").update({ is_paid: !currentStatus }).eq("id", id);
    fetchDebts();
  }

  async function deleteDebt(id: string) {
    const supabase = createClient();
    await supabase.from("debts").delete().eq("id", id);
    fetchDebts();
  }

  function isOverdue(dueDate: string | null): boolean {
    if (!dueDate) return false;
    return new Date(dueDate) < new Date() && new Date(dueDate).toDateString() !== new Date().toDateString();
  }

  const iOwe = debts.filter(d => d.direction === "i_owe" && !d.is_paid);
  const theyOwe = debts.filter(d => d.direction === "they_owe" && !d.is_paid);
  const paid = debts.filter(d => d.is_paid);

  const DebtCard = ({ debt }: { debt: Debt }) => {
    const overdue = isOverdue(debt.due_date);
    
    return (
      <div className={`flex items-center justify-between rounded-lg border p-4 ${
        overdue ? "border-red-300 bg-red-50 dark:border-red-900 dark:bg-red-950" : ""
      }`}>
        <div className="flex items-center gap-3">
          <div className={`h-10 w-10 rounded-full flex items-center justify-center ${
            debt.direction === "i_owe" 
              ? "bg-red-100 text-red-600" 
              : "bg-green-100 text-green-600"
          }`}>
            {debt.direction === "i_owe" ? <ArrowDownCircle className="h-5 w-5" /> : <ArrowUpCircle className="h-5 w-5" />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="font-medium">{debt.name}</h4>
              {overdue && <Badge variant="destructive">Overdue</Badge>}
              {debt.is_paid && <Badge variant="default" className="bg-green-600">Paid</Badge>}
            </div>
            <p className="text-sm text-muted-foreground">
              {debt.due_date ? `Due: ${debt.due_date}` : "No due date"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className={`font-semibold ${
            debt.direction === "i_owe" ? "text-red-600" : "text-green-600"
          }`}>
            {formatCurrency(Number(debt.amount), currency)}
          </div>
          <div className="flex gap-1">
            {!debt.is_paid && (
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => togglePaid(debt.id, debt.is_paid)}
                title="Mark as paid"
              >
                <CheckCircle2 className="h-4 w-4 text-green-600" />
              </Button>
            )}
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => deleteDebt(debt.id)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    );
  };

  if (loading) return <div className="p-6">Loading...</div>;

  return (
    <main className="flex-1 space-y-6 bg-background/50 p-4 sm:p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Debts</h1>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" /> Log Debt</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Log a Debt</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label>Name/Description</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Loan from John"
                />
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
              <div className="space-y-2">
                <Label>Direction</Label>
                <Select
                  value={formData.direction}
                  onValueChange={(v: "i_owe" | "they_owe") => setFormData({ ...formData, direction: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="i_owe">I owe someone</SelectItem>
                    <SelectItem value="they_owe">Someone owes me</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Due Date (Optional)</Label>
                <Input
                  type="date"
                  value={formData.due_date}
                  onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                />
              </div>
              <Button onClick={addDebt} className="w-full">Log Debt</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">I Owe</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {formatCurrency(iOwe.reduce((sum, d) => sum + Number(d.amount), 0), currency)}
            </div>
            <p className="text-xs text-muted-foreground">{iOwe.length} active debts</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Owed to Me</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(theyOwe.reduce((sum, d) => sum + Number(d.amount), 0), currency)}
            </div>
            <p className="text-xs text-muted-foreground">{theyOwe.length} active debts</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Net Position</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${
              theyOwe.reduce((sum, d) => sum + Number(d.amount), 0) - 
              iOwe.reduce((sum, d) => sum + Number(d.amount), 0) >= 0 
                ? "text-green-600" : "text-red-600"
            }`}>
              {formatCurrency(
                theyOwe.reduce((sum, d) => sum + Number(d.amount), 0) - 
                iOwe.reduce((sum, d) => sum + Number(d.amount), 0),
                currency
              )}
            </div>
            <p className="text-xs text-muted-foreground">Your net debt position</p>
          </CardContent>
        </Card>
      </div>

      {/* I Owe Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ArrowDownCircle className="h-5 w-5 text-red-500" />
            I Owe ({iOwe.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {iOwe.length > 0 ? (
            iOwe.map(debt => <DebtCard key={debt.id} debt={debt} />)
          ) : (
            <p className="text-center text-muted-foreground py-4">No debts to pay</p>
          )}
        </CardContent>
      </Card>

      {/* They Owe Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ArrowUpCircle className="h-5 w-5 text-green-500" />
            Owed to Me ({theyOwe.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {theyOwe.length > 0 ? (
            theyOwe.map(debt => <DebtCard key={debt.id} debt={debt} />)
          ) : (
            <p className="text-center text-muted-foreground py-4">No one owes you</p>
          )}
        </CardContent>
      </Card>

      {/* Paid Debts */}
      {paid.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              Paid / Settled ({paid.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {paid.map(debt => <DebtCard key={debt.id} debt={debt} />)}
          </CardContent>
        </Card>
      )}
    </main>
  );
}

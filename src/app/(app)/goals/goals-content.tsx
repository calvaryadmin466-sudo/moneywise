"use client";

import * as React from "react";
import { Plus, Target, Calendar, Trash2, PlusCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase-browser";
import { Goal, formatCurrency, Currency } from "@/lib/supabase";
import { useSearchParams } from "next/navigation";

export default function GoalsContent() {
  const searchParams = useSearchParams();
  const currency = (searchParams.get("currency") as Currency) || "TZS";
  
  const [goals, setGoals] = React.useState<Goal[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [isAddOpen, setIsAddOpen] = React.useState(false);
  const [isContributeOpen, setIsContributeOpen] = React.useState(false);
  const [selectedGoal, setSelectedGoal] = React.useState<Goal | null>(null);

  const [formData, setFormData] = React.useState({
    name: "",
    target_amount: "",
    deadline: "",
  });
  const [contributeAmount, setContributeAmount] = React.useState("");

  React.useEffect(() => {
    fetchGoals();
  }, []);

  async function fetchGoals() {
    setLoading(true);
    const supabase = createClient();
    const { data } = await supabase.from("goals").select("*").order("created_at", { ascending: false });
    if (data) setGoals(data);
    setLoading(false);
  }

  async function addGoal() {
    const supabase = createClient();
    const { error } = await supabase.from("goals").insert([{
      name: formData.name,
      target_amount: Number(formData.target_amount),
      deadline: formData.deadline || null,
    }]);
    if (!error) {
      setIsAddOpen(false);
      fetchGoals();
      setFormData({ name: "", target_amount: "", deadline: "" });
    }
  }

  async function deleteGoal(id: string) {
    const supabase = createClient();
    await supabase.from("goals").delete().eq("id", id);
    fetchGoals();
  }

  async function addFunds() {
    if (!selectedGoal) return;
    const supabase = createClient();
    const newAmount = Number(selectedGoal.saved_amount) + Number(contributeAmount);
    const { error } = await supabase
      .from("goals")
      .update({ saved_amount: newAmount })
      .eq("id", selectedGoal.id);
    if (!error) {
      setIsContributeOpen(false);
      setSelectedGoal(null);
      setContributeAmount("");
      fetchGoals();
    }
  }

  function openContribute(goal: Goal) {
    setSelectedGoal(goal);
    setIsContributeOpen(true);
  }

  function getDaysRemaining(deadline: string | null): number | null {
    if (!deadline) return null;
    const days = Math.ceil((new Date(deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    return days > 0 ? days : null;
  }

  if (loading) return <div className="p-6">Loading...</div>;

  return (
    <main className="flex-1 space-y-6 bg-background/50 p-4 sm:p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Savings Goals</h1>
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" /> New Goal</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Savings Goal</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label>Goal Name</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., New Car, Vacation"
                />
              </div>
              <div className="space-y-2">
                <Label>Target Amount</Label>
                <Input
                  type="number"
                  value={formData.target_amount}
                  onChange={(e) => setFormData({ ...formData, target_amount: e.target.value })}
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-2">
                <Label>Deadline (Optional)</Label>
                <Input
                  type="date"
                  value={formData.deadline}
                  onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                />
              </div>
              <Button onClick={addGoal} className="w-full">Create Goal</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {goals.map((goal) => {
          const percentage = Math.min((Number(goal.saved_amount) / Number(goal.target_amount)) * 100, 100);
          const daysLeft = getDaysRemaining(goal.deadline);
          
          return (
            <Card key={goal.id}>
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-[#185FA5]/10 flex items-center justify-center">
                      <Target className="h-5 w-5 text-[#185FA5]" />
                    </div>
                    <div>
                      <h3 className="font-semibold">{goal.name}</h3>
                      {daysLeft !== null && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          <span>{daysLeft} days left</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="icon"
                    onClick={() => deleteGoal(goal.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>

                <div className="mt-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Saved</span>
                    <span className="font-medium">
                      {formatCurrency(Number(goal.saved_amount), currency)} / {formatCurrency(Number(goal.target_amount), currency)}
                    </span>
                  </div>
                  <Progress value={percentage} className="h-3" />
                  <div className="flex justify-between text-xs">
                    <span className={percentage >= 100 ? "text-green-600 font-medium" : "text-muted-foreground"}>
                      {percentage.toFixed(0)}% complete
                    </span>
                    {percentage >= 100 && (
                      <Badge variant="default" className="bg-green-600">Goal Reached!</Badge>
                    )}
                  </div>
                </div>

                <Button 
                  onClick={() => openContribute(goal)}
                  className="w-full mt-4"
                  disabled={percentage >= 100}
                >
                  <PlusCircle className="mr-2 h-4 w-4" /> Add Funds
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {goals.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <Target className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No savings goals yet</p>
            <p className="text-sm text-muted-foreground mt-1">
              Click &quot;New Goal&quot; to start saving towards something special
            </p>
          </CardContent>
        </Card>
      )}

      <Dialog open={isContributeOpen} onOpenChange={setIsContributeOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Funds to {selectedGoal?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>Amount to Add</Label>
              <Input
                type="number"
                value={contributeAmount}
                onChange={(e) => setContributeAmount(e.target.value)}
                placeholder="0.00"
              />
            </div>
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Current: {selectedGoal && formatCurrency(Number(selectedGoal.saved_amount), currency)}</span>
              <span>Target: {selectedGoal && formatCurrency(Number(selectedGoal.target_amount), currency)}</span>
            </div>
            <Button onClick={addFunds} className="w-full">Add Funds</Button>
          </div>
        </DialogContent>
      </Dialog>
    </main>
  );
}

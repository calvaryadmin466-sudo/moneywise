"use client";

import * as React from "react";
import { Sparkles, X, Send, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { getUser, gqlRequest, formatCurrency, Transaction, Budget, Goal } from "@/lib/nhost";

interface Message {
  role: "user" | "assistant";
  content: string;
}

export function AIFinancialAdvisor() {
  const [isOpen, setIsOpen] = React.useState(false);
  const [messages, setMessages] = React.useState<Message[]>([
    { role: "assistant", content: "Hi! I'm your AI financial advisor. I can analyze your budgets, transactions, and goals to give you personalized financial advice. What would you like to know?" }
  ]);
  const [input, setInput] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [transactions, setTransactions] = React.useState<Transaction[]>([]);
  const [budgets, setBudgets] = React.useState<Budget[]>([]);
  const [goals, setGoals] = React.useState<Goal[]>([]);
  const [dataLoaded, setDataLoaded] = React.useState(false);

  React.useEffect(() => {
    if (isOpen && !dataLoaded) {
      fetchUserData();
    }
  }, [isOpen]);

  async function fetchUserData() {
    const user = await getUser();
    const userId = user?.id;
    if (!userId) return;

    const [transRes, budgetRes, goalsRes] = await Promise.all([
      gqlRequest(`query { transactions(where: {user_id: {_eq: "${userId}"}}, order_by: {date: desc}, limit: 50) { id type amount category date note } }`),
      gqlRequest(`query { budgets(where: {user_id: {_eq: "${userId}"}}) { id category monthly_limit month } }`),
      gqlRequest(`query { goals(where: {user_id: {_eq: "${userId}"}}) { id name target_amount saved_amount deadline } }`),
    ]);

    if (transRes.data?.transactions) setTransactions(transRes.data.transactions);
    if (budgetRes.data?.budgets) setBudgets(budgetRes.data.budgets);
    if (goalsRes.data?.goals) setGoals(goalsRes.data.goals);
    setDataLoaded(true);
  }

  function getUserContext() {
    const totalIncome = transactions.filter(t => t.type === "income").reduce((sum, t) => sum + Number(t.amount), 0);
    const totalExpenses = transactions.filter(t => t.type === "expense").reduce((sum, t) => sum + Number(t.amount), 0);
    const balance = totalIncome - totalExpenses;

    const spendingByCategory: Record<string, number> = {};
    transactions.filter(t => t.type === "expense").forEach(t => {
      spendingByCategory[t.category] = (spendingByCategory[t.category] || 0) + Number(t.amount);
    });

    const budgetSummary = budgets.map(b => `${b.category}: ${formatCurrency(Number(b.monthly_limit))}`).join(", ");
    const goalsSummary = goals.map(g => `${g.name}: ${formatCurrency(Number(g.saved_amount))} / ${formatCurrency(Number(g.target_amount))}`).join(", ");

    return `
User's Financial Summary:
- Total Income: ${formatCurrency(totalIncome)}
- Total Expenses: ${formatCurrency(totalExpenses)}
- Current Balance: ${formatCurrency(balance)}

Spending by Category: ${JSON.stringify(spendingByCategory)}

Budgets: ${budgetSummary || "No budgets set"}

Savings Goals: ${goalsSummary || "No goals set"}

Provide practical, actionable financial advice based on this data. Keep responses concise and encouraging.
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
          "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
          "HTTP-Referer": "https://moneywise.app",
          "X-Title": "MoneyWise",
        },
        body: JSON.stringify({
          model: "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free",
          messages: [
            { role: "system", content: "You are a helpful financial advisor AI assistant. You analyze user's financial data including income, expenses, budgets, and savings goals to provide personalized advice. Be concise, practical, and encouraging. Format your responses with bullet points when listing advice." },
            { role: "system", content: getUserContext() },
            ...messages.map(m => ({ role: m.role, content: m.content })),
            { role: "user", content: userMessage }
          ],
          max_tokens: 500,
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

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button className="bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:from-violet-400 hover:to-fuchsia-400 text-white shadow-lg">
          <Sparkles className="mr-2 h-4 w-4" />
          AI Advisor
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px] h-[600px] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-violet-500" />
            AI Financial Advisor
          </DialogTitle>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto space-y-4 p-4">
          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[80%] rounded-lg p-3 ${
                msg.role === "user" 
                  ? "bg-violet-600 text-white" 
                  : "bg-muted text-foreground"
              }`}>
                <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-muted rounded-lg p-3">
                <Loader2 className="h-4 w-4 animate-spin" />
              </div>
            </div>
          )}
        </div>

        <div className="p-4 border-t">
          <form onSubmit={(e) => { e.preventDefault(); sendMessage(); }} className="flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about your finances..."
              disabled={loading}
            />
            <Button type="submit" disabled={loading || !input.trim()}>
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}

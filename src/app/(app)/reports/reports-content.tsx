"use client";

import * as React from "react";
import { Doughnut, Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
} from "chart.js";
import { Download, Calendar, BarChart3, TrendingUp, PieChart } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { nhost, gqlRequest, formatCurrency, Currency, Transaction, CATEGORIES } from "@/lib/nhost";
import { useSearchParams } from "next/navigation";

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title);

export default function ReportsContent() {
  const searchParams = useSearchParams();
  const currency = (searchParams.get("currency") as Currency) || "TZS";

  const [transactions, setTransactions] = React.useState<Transaction[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [selectedMonth, setSelectedMonth] = React.useState<string>(
    new Date().toISOString().slice(0, 7)
  );

  React.useEffect(() => {
    fetchTransactions();
  }, []);

  async function fetchTransactions() {
    setLoading(true);
    const user = await nhost.auth.getUser();
    const userId = user?.id;
    if (!userId) {
      setLoading(false);
      return;
    }
    const result = await gqlRequest(`query { transactions(where: {user_id: {_eq: "${userId}"}}, order_by: {date: desc}) { id user_id type amount category date note is_recurring created_at } }`);
    if (result.data?.transactions) setTransactions(result.data.transactions);
    setLoading(false);
  }

  function exportToCSV() {
    const headers = ["Date", "Type", "Category", "Amount", "Note", "Recurring"];
    const rows = filteredTransactions.map(t => [
      t.date,
      t.type,
      t.category,
      t.amount,
      t.note || "",
      t.is_recurring ? "Yes" : "No"
    ]);

    const csv = [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `transactions-${selectedMonth}.csv`;
    a.click();
  }

  const filteredTransactions = transactions.filter(t => t.date.startsWith(selectedMonth));

  const spendingByCategory = React.useMemo(() => {
    const map: Record<string, number> = {};
    filteredTransactions
      .filter(t => t.type === "expense")
      .forEach(t => {
        map[t.category] = (map[t.category] || 0) + Number(t.amount);
      });
    return map;
  }, [filteredTransactions]);

  const monthlyTrend = React.useMemo(() => {
    const months: Record<string, { income: number; expense: number }> = {};
    const last6Months: string[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      last6Months.push(d.toISOString().slice(0, 7));
    }

    last6Months.forEach(m => {
      months[m] = { income: 0, expense: 0 };
    });

    transactions.forEach(t => {
      const month = t.date.slice(0, 7);
      if (months[month]) {
        if (t.type === "income") months[month].income += Number(t.amount);
        else months[month].expense += Number(t.amount);
      }
    });

    return { labels: last6Months, data: months };
  }, [transactions]);

  const totalSpending = Object.values(spendingByCategory).reduce((a, b) => a + b, 0);

  const doughnutData = {
    labels: Object.keys(spendingByCategory),
    datasets: [{
      data: Object.values(spendingByCategory),
      backgroundColor: [
        "#185FA5", "#22c55e", "#f59e0b", "#ef4444",
        "#8b5cf6", "#ec4899", "#06b6d4", "#84cc16", "#64748b"
      ],
      borderWidth: 0,
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
      },
      {
        label: "Expenses",
        data: monthlyTrend.labels.map(m => monthlyTrend.data[m].expense),
        backgroundColor: "#ef4444",
      },
    ],
  };

  const availableMonths = Array.from(new Set(transactions.map(t => t.date.slice(0, 7)))).sort().reverse();
  if (!availableMonths.includes(selectedMonth)) {
    availableMonths.unshift(selectedMonth);
  }

  if (loading) {
    return (
      <main className="flex-1 space-y-6 bg-background/50 p-4 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <Skeleton className="h-8 w-32" />
          <div className="flex gap-2">
            <Skeleton className="h-10 w-40" />
            <Skeleton className="h-10 w-32" />
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          <Skeleton className="h-80" />
          <Skeleton className="h-80" />
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1 space-y-6 bg-background/50 p-4 sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Reports</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Analyze your financial activity and trends
          </p>
        </div>
        <div className="flex gap-2">
          <Select value={selectedMonth} onValueChange={(v: string) => setSelectedMonth(v)}>
            <SelectTrigger className="w-[180px]">
              <Calendar className="mr-2 h-4 w-4 text-muted-foreground" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {availableMonths.map(m => (
                <SelectItem key={m} value={m}>{m}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={exportToCSV} variant="outline">
            <Download className="mr-2 h-4 w-4" /> Export CSV
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-primary" />
              Total Transactions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{filteredTransactions.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-rose-500" />
              Total Spending
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-rose-500">
              {formatCurrency(totalSpending, currency)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <PieChart className="h-4 w-4 text-emerald-500" />
              Categories Used
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Object.keys(spendingByCategory).length} / {CATEGORIES.length}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChart className="h-5 w-5 text-primary" />
              Spending by Category
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <Doughnut
                data={doughnutData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: { position: "bottom" },
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

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              6-Month Trend
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <Bar
                data={barData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: { legend: { position: "bottom" } },
                  scales: {
                    x: { stacked: false },
                    y: { stacked: false }
                  }
                }}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            Category Breakdown
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Object.entries(spendingByCategory)
              .sort(([,a], [,b]) => b - a)
              .map(([category, amount]) => {
                const percentage = totalSpending > 0 ? ((amount / totalSpending) * 100).toFixed(1) : "0";
                return (
                  <div key={category} className="flex items-center justify-between rounded-lg border p-3 hover:bg-muted/30 transition-colors">
                    <div className="flex items-center gap-3">
                      <Badge variant="secondary">{category}</Badge>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">{formatCurrency(amount, currency)}</p>
                      <p className="text-xs text-muted-foreground">{percentage}% of total</p>
                    </div>
                  </div>
                );
              })}
            {Object.keys(spendingByCategory).length === 0 && (
              <div className="py-12 text-center">
                <BarChart3 className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
                <p className="text-muted-foreground font-medium">No spending data for {selectedMonth}</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Add transactions to see your spending breakdown
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </main>
  );
}

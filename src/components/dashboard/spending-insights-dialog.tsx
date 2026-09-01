"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "../ui/button";
import { useToast } from "@/hooks/use-toast";
import { getSpendingInsightsAction } from "@/app/actions";
import { type SpendingInsightsOutput } from "@/ai/flows/spending-insights-flow";
import { Skeleton } from "../ui/skeleton";
import { ScrollArea } from "../ui/scroll-area";
import { Separator } from "../ui/separator";
import { Badge } from "../ui/badge";
import type { Transaction } from "@/lib/supabase";

interface SpendingInsightsDialogProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  transactions: Transaction[];
}

export function SpendingInsightsDialog({ isOpen, setIsOpen, transactions }: SpendingInsightsDialogProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = React.useState(false);
  const [insights, setInsights] = React.useState<SpendingInsightsOutput | null>(null);

  const handleGenerateInsights = async () => {
    setIsLoading(true);
    setInsights(null);
    const mappedTransactions = transactions
      .filter((t) => t.type === "income" || t.type === "expense")
      .map((t) => ({
        id: t.id,
        category: t.category,
        type: t.type as "income" | "expense",
        date: typeof t.date === "string" && !t.date.endsWith("Z") && !t.date.includes("T")
          ? `${t.date}T00:00:00Z`
          : String(t.date),
        amount: Number(t.amount),
        notes: (t.note ?? undefined) as string | undefined,
      }));
    const result = await getSpendingInsightsAction({ transactions: mappedTransactions });
    setIsLoading(false);

    if (result.success && result.data) {
      setInsights(result.data);
    } else {
      toast({
        title: "Error",
        description: result.error,
        variant: "destructive",
      });
      setIsOpen(false);
    }
  };
  
  React.useEffect(() => {
    if (isOpen) {
      handleGenerateInsights();
    } else {
      setInsights(null);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>AI-Powered Spending Insights</DialogTitle>
          <DialogDescription>
            Here's an analysis of your spending habits based on your recent transactions.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[70vh] pr-6">
            <div className="space-y-6 py-4">
            {isLoading && <InsightsSkeleton />}
            {insights && (
                <>
                <div className="rounded-lg border bg-card p-4">
                    <h3 className="mb-2 text-lg font-semibold">Overall Summary</h3>
                    <p className="text-sm text-muted-foreground">{insights.overallSummary}</p>
                </div>

                <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Spending Patterns</h3>
                    <ul className="list-disc space-y-2 pl-5 text-sm text-muted-foreground">
                    {insights.spendingPatterns.map((pattern, index) => (
                        <li key={index}>{pattern}</li>
                    ))}
                    </ul>
                </div>
                
                <Separator />

                <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Potential Saving Areas</h3>
                    <ul className="list-disc space-y-2 pl-5 text-sm text-muted-foreground">
                    {insights.potentialSavingAreas.map((area, index) => (
                        <li key={index}>{area}</li>
                    ))}
                    </ul>
                </div>
                
                <Separator />
                
                <div>
                    <h3 className="mb-4 text-lg font-semibold">Category Breakdown</h3>
                     <div className="space-y-3">
                        {insights.categoryBreakdown.map((item) => (
                          <div key={item.category} className="flex items-center justify-between rounded-md border p-3">
                            <div className="flex items-center gap-3">
                                <Badge variant={item.type === 'income' ? 'default' : 'secondary'} className={item.type === 'income' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                                {item.category}
                                </Badge>
                                <span className="text-sm font-medium">
                                    ${item.totalAmount.toFixed(2)}
                                </span>
                            </div>
                            <div className="text-sm text-muted-foreground">{item.percentageOfTotal.toFixed(1)}% of total {item.type}</div>
                          </div>
                        ))}
                    </div>
                </div>
                </>
            )}
            </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

const InsightsSkeleton = () => (
  <div className="space-y-6">
    <div className="space-y-2">
      <Skeleton className="h-6 w-1/3" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-4/5" />
    </div>
    <div className="space-y-3">
      <Skeleton className="h-6 w-1/4" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-2/3" />
    </div>
    <div className="space-y-3">
      <Skeleton className="h-6 w-1/4" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-2/3" />
    </div>
  </div>
);

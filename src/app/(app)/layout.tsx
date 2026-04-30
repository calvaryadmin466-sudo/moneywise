"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  FilePlus,
  LayoutDashboard,
  Settings,
  AreaChart,
  Lightbulb,
  Plus,
  Wallet,
  PiggyBank,
  Target,
  Receipt,
  Cog,
  User,
  LogOut,
} from "lucide-react";
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarInset,
  SidebarTrigger,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/logo";
import { AddTransactionSheet } from "@/components/dashboard/add-transaction-sheet";
import { SpendingInsightsDialog } from "@/components/dashboard/spending-insights-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { nhost, gqlRequest, signOut } from "@/lib/nhost";
import { Transaction } from "@/lib/nhost";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [isSheetOpen, setSheetOpen] = React.useState(false);
  const [isInsightsOpen, setInsightsOpen] = React.useState(false);
  const [transactions, setTransactions] = React.useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  // Check auth on mount
  React.useEffect(() => {
    async function checkAuth() {
      const user = await nhost.auth.getUser();
      
      if (!user) {
        router.push('/login');
      } else {
        setIsLoading(false);
      }
    }
    checkAuth();
  }, [router]);

  // Fetch transactions for insights dialog
  React.useEffect(() => {
    async function fetchTransactions() {
      const user = await nhost.auth.getUser();
      const userId = user?.id;
      if (!userId) return;
      
      const result = await gqlRequest(`query { transactions(where: {user_id: {_eq: "${userId}"}}, order_by: {date: desc}) { id user_id type amount category date note is_recurring created_at } }`);
      
      if (result.data?.transactions) {
        setTransactions(result.data.transactions);
      }
    }
    fetchTransactions();
  }, []);

  const pageTitle = pathname.split('/').pop();
  const capitalizedTitle = pageTitle ? pageTitle.charAt(0).toUpperCase() + pageTitle.slice(1) : 'Dashboard';

  return (
    <SidebarProvider>
      <AddTransactionSheet isOpen={isSheetOpen} setIsOpen={setSheetOpen} />
      <SpendingInsightsDialog 
        isOpen={isInsightsOpen} 
        setIsOpen={setInsightsOpen} 
        transactions={transactions}
      />
      <Sidebar className="border-r border-white/10 bg-[#0f172a]/95 backdrop-blur-xl">
        <SidebarContent>
          <SidebarHeader className="border-b border-white/10 pb-4">
            <div className="flex items-center gap-3 px-2">
              <Logo width={40} height={40} className="rounded-xl" />
              <div>
                <span className="text-lg font-bold bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
                  MONEY-WISE
                </span>
                <p className="text-xs text-gray-500">Finance Management</p>
              </div>
            </div>
          </SidebarHeader>
          <nav className="flex-1 px-2 py-4 space-y-1">
            <Link href="/dashboard" className={pathname === '/dashboard' ? 'block' : 'block'}>
              <div className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${pathname.startsWith('/dashboard') ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' : 'text-gray-400 hover:bg-white/5 hover:text-gray-300'}`}>
                <LayoutDashboard className="h-5 w-5" />
                <span className="font-medium">Dashboard</span>
              </div>
            </Link>
            <Link href="/transactions" className="block">
              <div className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${pathname.startsWith('/transactions') ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' : 'text-gray-400 hover:bg-white/5 hover:text-gray-300'}`}>
                <Receipt className="h-5 w-5" />
                <span className="font-medium">Transactions</span>
              </div>
            </Link>
            <Link href="/budgets" className="block">
              <div className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${pathname.startsWith('/budgets') ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' : 'text-gray-400 hover:bg-white/5 hover:text-gray-300'}`}>
                <Wallet className="h-5 w-5" />
                <span className="font-medium">Budgets</span>
              </div>
            </Link>
            <Link href="/goals" className="block">
              <div className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${pathname.startsWith('/goals') ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' : 'text-gray-400 hover:bg-white/5 hover:text-gray-300'}`}>
                <Target className="h-5 w-5" />
                <span className="font-medium">Goals</span>
              </div>
            </Link>
            <Link href="/debts" className="block">
              <div className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${pathname.startsWith('/debts') ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' : 'text-gray-400 hover:bg-white/5 hover:text-gray-300'}`}>
                <PiggyBank className="h-5 w-5" />
                <span className="font-medium">Debts</span>
              </div>
            </Link>
            <Link href="/reports" className="block">
              <div className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${pathname.startsWith('/reports') ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' : 'text-gray-400 hover:bg-white/5 hover:text-gray-300'}`}>
                <AreaChart className="h-5 w-5" />
                <span className="font-medium">Reports</span>
              </div>
            </Link>
            <Link href="/settings" className="block">
              <div className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${pathname.startsWith('/settings') ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' : 'text-gray-400 hover:bg-white/5 hover:text-gray-300'}`}>
                <Cog className="h-5 w-5" />
                <span className="font-medium">Settings</span>
              </div>
            </Link>
          </nav>
        </SidebarContent>
        <SidebarFooter className="border-t border-white/10 p-4">
          <button 
            onClick={() => setSheetOpen(true)}
            className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-medium py-3 rounded-lg transition-all shadow-[0_0_20px_rgba(6,182,212,0.3)] hover:shadow-[0_0_30px_rgba(6,182,212,0.5)]"
          >
            <Plus className="h-5 w-5" />
            New Transaction
          </button>
          <div className="mt-4 flex items-center gap-3 px-3 py-2 rounded-lg bg-white/5">
            <div className="h-9 w-9 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center">
              <User className="h-4 w-4 text-white" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-300">User</p>
              <p className="text-xs text-gray-500">Free Plan</p>
            </div>
            <button
              onClick={async () => {
                await signOut();
                router.push('/login');
              }}
              className="p-2 rounded-lg hover:bg-white/10 text-gray-400 hover:text-red-400 transition-colors"
              title="Logout"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </SidebarFooter>
      </Sidebar>

      <SidebarInset className="bg-transparent">
         <header className="flex items-center justify-between border-b border-white/10 bg-[#0f172a]/50 backdrop-blur-xl p-4 sm:p-6">
          <div className="flex items-center gap-4">
             <SidebarTrigger className="md:hidden text-gray-400" />
            <h1 className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">{capitalizedTitle}</h1>
          </div>
          <div className="flex items-center gap-3">
            <Button 
              variant="outline" 
              onClick={() => setInsightsOpen(true)}
              className="border-white/20 bg-white/5 hover:bg-white/10 text-gray-300"
            >
              <Lightbulb className="mr-2 h-4 w-4 text-amber-400" />
              Insights
            </Button>
          </div>
        </header>
        {children}
      </SidebarInset>
    </SidebarProvider>
  );
}

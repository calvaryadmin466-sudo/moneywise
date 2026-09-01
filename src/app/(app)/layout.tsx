"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  FilePlus,
  LayoutDashboard,
  Settings,
  AreaChart,
  Plus,
  Wallet,
  PiggyBank,
  Target,
  Receipt,
  Cog,
  User,
  LogOut,
  Database,
  Coins,
  TrendingUp,
  Bell,
  CalendarDays,
  CalendarClock,
  AlertTriangle,
  CheckCircle2,
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
import { AIFinancialAdvisorPro } from "@/components/dashboard/ai-financial-advisor-v2";
import { MobileNav } from "@/components/mobile-nav";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { supabase, getUser } from "@/lib/supabase";
import { Transaction, formatCurrency, Currency } from "@/lib/finance";
import {
  BillReminder,
  daysUntil,
  getBillStatus,
  isDueSoon,
  isOverdue,
  computeNextDue,
} from "@/lib/bills";
import { useToast } from "@/hooks/use-toast";

function SidebarNavigation({ pathname }: { pathname: string }) {
  const searchParams = useSearchParams();
  const isIncomeActive = pathname.startsWith('/transactions') && searchParams.get('type') === 'income';

  return (
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
      <Link href="/transactions?type=income" className="block">
        <div className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${isIncomeActive ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' : 'text-gray-400 hover:bg-white/5 hover:text-gray-300'}`}>
          <TrendingUp className="h-5 w-5" />
          <span className="font-medium">Income</span>
        </div>
      </Link>
      <Link href="/budgets" className="block">
        <div className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${pathname.startsWith('/budgets') ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' : 'text-gray-400 hover:bg-white/5 hover:text-gray-300'}`}>
          <Wallet className="h-5 w-5" />
          <span className="font-medium">Budgets</span>
        </div>
      </Link>
      <Link href="/bills" className="block">
        <div className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${pathname.startsWith('/bills') ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' : 'text-gray-400 hover:bg-white/5 hover:text-gray-300'}`}>
          <CalendarClock className="h-5 w-5" />
          <span className="font-medium">Bills</span>
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
      <Link href="/assets" className="block">
        <div className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${pathname.startsWith('/assets') ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' : 'text-gray-400 hover:bg-white/5 hover:text-gray-300'}`}>
          <Coins className="h-5 w-5" />
          <span className="font-medium">Assets</span>
        </div>
      </Link>
      <Link href="/settings" className="block">
        <div className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${pathname.startsWith('/settings') ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' : 'text-gray-400 hover:bg-white/5 hover:text-gray-300'}`}>
          <Cog className="h-5 w-5" />
          <span className="font-medium">Settings</span>
        </div>
      </Link>
      <Link href="/profile" className="block">
        <div className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${pathname.startsWith('/profile') ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' : 'text-gray-400 hover:bg-white/5 hover:text-gray-300'}`}>
          <User className="h-5 w-5" />
          <span className="font-medium">Profile</span>
        </div>
      </Link>
      <Link href="/data" className="block">
        <div className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${pathname.startsWith('/data') ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' : 'text-gray-400 hover:bg-white/5 hover:text-gray-300'}`}>
          <Database className="h-5 w-5" />
          <span className="font-medium">My Data</span>
        </div>
      </Link>
    </nav>
  );
}

function NotificationBellPopover() {
  const { toast } = useToast();
  const [bills, setBills] = React.useState<BillReminder[]>([]);
  const [open, setOpen] = React.useState(false);
  const searchParams = useSearchParams();
  const currency = (searchParams.get("currency") as Currency) || "TZS";

  async function refresh() {
    const user = await getUser();
    const userId = user?.id;
    if (!userId) return;
    const { data } = await supabase
      .from("bill_reminders")
      .select("*")
      .eq("user_id", userId)
      .order("next_due_date", { ascending: true })
      .limit(25);
    if (data) setBills(data);
  }

  React.useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 60_000);
    return () => clearInterval(interval);
  }, []);

  const critical = bills.filter((b) => isOverdue(b.next_due_date) || isDueSoon(b.next_due_date, b.remind_days_before || 3));
  const visible = critical.slice(0, 8);

  async function markPaid(bill: BillReminder) {
    const user = await getUser();
    if (!user) return;
    const nextDue = bill.recurrence === "once" ? bill.next_due_date : computeNextDue(bill.next_due_date, bill.recurrence);
    const { error } = await supabase
      .from("bill_reminders")
      .update({ next_due_date: nextDue, is_paid_last: true, last_notified_at: null, snooze_until: null })
      .eq("id", bill.id);
    if (!error) {
      toast({ title: "Marked paid" });
      refresh();
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative text-gray-300 hover:text-white hover:bg-white/5">
          <Bell className="h-5 w-5" />
          {critical.length > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] rounded-full bg-rose-500 text-[10px] font-semibold text-white flex items-center justify-center px-1 shadow-[0_0_10px_rgba(244,63,94,0.5)]">
              {critical.length > 9 ? "9+" : critical.length}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[380px] p-0 border-white/10 bg-[#0f172a]/95 backdrop-blur-xl">
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
          <div className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-cyan-400" />
            <p className="text-sm font-semibold">Upcoming bills</p>
          </div>
          <Badge variant="secondary" className="text-[10px] h-5">
            {critical.length} need attention
          </Badge>
        </div>
        <ScrollArea className="max-h-[360px]">
          {visible.length === 0 ? (
            <div className="py-10 px-4 text-center">
              <CheckCircle2 className="h-8 w-8 text-emerald-400 mx-auto mb-2" />
              <p className="text-sm text-gray-300">All caught up</p>
              <p className="text-xs text-muted-foreground mt-1">No upcoming bills to worry about</p>
            </div>
          ) : (
            <div className="py-2">
              {visible.map((bill) => {
                const status = getBillStatus(bill);
                const days = daysUntil(bill.next_due_date);
                return (
                  <div
                    key={bill.id}
                    className={`flex items-center gap-3 px-4 py-2.5 hover:bg-white/5 transition-colors ${
                      status === "overdue" ? "bg-rose-500/5" : ""
                    }`}
                  >
                    <div
                      className={`h-9 w-9 shrink-0 rounded-lg flex items-center justify-center ${
                        status === "overdue"
                          ? "bg-rose-500/15 text-rose-400"
                          : status === "due-soon"
                          ? "bg-amber-500/15 text-amber-400"
                          : "bg-cyan-500/15 text-cyan-400"
                      }`}
                    >
                      {status === "overdue" ? (
                        <AlertTriangle className="h-4 w-4" />
                      ) : (
                        <CalendarClock className="h-4 w-4" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{bill.title}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {days < 0
                          ? `${Math.abs(days)}d overdue`
                          : days === 0
                          ? "Due today"
                          : `in ${days}d`}
                        {" • "}
                        {bill.next_due_date}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-sm font-semibold">{formatCurrency(Number(bill.amount), currency)}</p>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 px-2 mt-0.5 text-[11px] text-emerald-400 hover:bg-emerald-500/10 hover:text-emerald-300"
                        onClick={() => markPaid(bill)}
                      >
                        <CheckCircle2 className="h-3 w-3 mr-1" /> Paid
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
        <div className="border-t border-white/10 p-3">
          <Link href="/bills" onClick={() => setOpen(false)}>
            <Button variant="outline" className="w-full h-9 border-white/10 text-gray-300 hover:bg-white/5">
              View all reminders
            </Button>
          </Link>
        </div>
      </PopoverContent>
    </Popover>
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [isSheetOpen, setSheetOpen] = React.useState(false);
  const [isInsightsOpen, setInsightsOpen] = React.useState(false);
  const [transactions, setTransactions] = React.useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [userData, setUserData] = React.useState<{ name: string; email: string; avatar_url?: string } | null>(null);

  // Check auth on mount and listen for auth state changes
  React.useEffect(() => {
    let mounted = true;

    async function checkAuth() {
      try {
        const { data: { session } } = await supabase.auth.getSession();

        if (!session?.user) {
          if (mounted) {
            setIsLoading(false);
            setUserData(null);
          }
          router.push('/login');
          return;
        }

        if (mounted) {
          setIsLoading(false);
          try {
            const { data: profile } = await supabase
              .from('user_profiles')
              .select('full_name, avatar_url')
              .eq('id', session.user.id)
              .single();

            setUserData({
              name: profile?.full_name || session.user.email?.split('@')[0] || 'User',
              email: session.user.email || '',
              avatar_url: profile?.avatar_url,
            });
          } catch {
            setUserData({
              name: session.user.email?.split('@')[0] || 'User',
              email: session.user.email || '',
              avatar_url: undefined,
            });
          }
        }
      } catch {
        if (mounted) {
          setIsLoading(false);
          setUserData(null);
        }
      }
    }
    checkAuth();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' || !session) {
        router.push('/login');
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [router]);

  // Fetch transactions for insights dialog
  React.useEffect(() => {
    async function fetchTransactions() {
      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user?.id;
      if (!userId) return;

      const { data } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', userId)
        .order('date', { ascending: false });

      if (data) {
        setTransactions(data);
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
          <React.Suspense fallback={null}>
            <SidebarNavigation pathname={pathname} />
          </React.Suspense>
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
            {userData?.avatar_url ? (
              <img
                src={userData.avatar_url}
                alt={userData.name}
                className="h-9 w-9 rounded-full object-cover"
              />
            ) : (
              <div className="h-9 w-9 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center">
                <span className="text-sm font-bold text-white">
                  {userData?.name?.charAt(0).toUpperCase() || 'U'}
                </span>
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-300 truncate">{userData?.name || 'User'}</p>
              <p className="text-xs text-gray-500 truncate">{userData?.email || 'Free Plan'}</p>
            </div>
            <button
              onClick={async () => {
                await supabase.auth.signOut();
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

      <SidebarInset className="bg-transparent overflow-auto min-h-screen">
        <header className="flex items-center justify-between border-b border-white/10 bg-[#0f172a]/50 backdrop-blur-xl p-4 sm:p-6">
          <div className="flex items-center gap-4">
            <SidebarTrigger className="md:hidden text-gray-400" />
            <h1 className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">{capitalizedTitle}</h1>
          </div>
          <div className="flex items-center gap-3">
            <React.Suspense fallback={null}>
              <NotificationBellPopover />
            </React.Suspense>
            <AIFinancialAdvisorPro />
          </div>
        </header>
        {children}
      </SidebarInset>
      <MobileNav />
    </SidebarProvider>
  );
}

"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { 
  LayoutDashboard, 
  Wallet, 
  PieChart, 
  Target, 
  Receipt, 
  User,
  Plus,
  CalendarClock,
} from "lucide-react";

const navItems = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Home" },
  { href: "/transactions", icon: Receipt, label: "Activity" },
  { href: "/add", icon: Plus, label: "Add", isCenter: true },
  { href: "/budgets", icon: PieChart, label: "Budget" },
  { href: "/profile", icon: User, label: "Profile" },
];

export function MobileNav() {
  const pathname = usePathname();
  const [showAddMenu, setShowAddMenu] = React.useState(false);

  // Don't show on auth pages
  if (pathname?.startsWith("/login") || pathname?.startsWith("/signup")) {
    return null;
  }

  return (
    <>
      {/* Mobile Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-[#0f172a]/95 backdrop-blur-xl border-t border-white/10 md:hidden z-40 safe-area-pb">
        <div className="flex items-center justify-around py-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || pathname?.startsWith(item.href + "/");
            
            if (item.isCenter) {
              return (
                <button
                  key={item.href}
                  onClick={() => setShowAddMenu(!showAddMenu)}
                  className="relative -mt-6"
                >
                  <div className="w-14 h-14 rounded-full bg-gradient-to-r from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/30 active:scale-95 transition-transform">
                    <Icon className="h-6 w-6 text-white" />
                  </div>
                </button>
              );
            }
            
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex flex-col items-center gap-1 px-3 py-2 min-w-[64px]",
                  isActive ? "text-cyan-400" : "text-gray-400"
                )}
              >
                <Icon className="h-6 w-6" strokeWidth={isActive ? 2.5 : 2} />
                <span className="text-[10px] font-medium">{item.label}</span>
                {isActive && (
                  <div className="absolute bottom-0 w-1 h-1 rounded-full bg-cyan-400" />
                )}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Add Menu Overlay */}
      {showAddMenu && (
        <div 
          className="fixed inset-0 bg-black/80 z-50 md:hidden"
          onClick={() => setShowAddMenu(false)}
        >
          <div className="absolute bottom-24 left-1/2 -translate-x-1/2 w-64 bg-[#1e293b] rounded-2xl p-4 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="space-y-2">
              <Link
                href="/transactions?add=true"
                onClick={() => setShowAddMenu(false)}
                className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 transition-colors"
              >
                <div className="w-10 h-10 rounded-full bg-cyan-500/20 flex items-center justify-center">
                  <Receipt className="h-5 w-5 text-cyan-400" />
                </div>
                <div>
                  <p className="font-medium text-white">Transaction</p>
                  <p className="text-xs text-gray-400">Add income or expense</p>
                </div>
              </Link>
              <Link
                href="/budgets?add=true"
                onClick={() => setShowAddMenu(false)}
                className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 transition-colors"
              >
                <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center">
                  <PieChart className="h-5 w-5 text-purple-400" />
                </div>
                <div>
                  <p className="font-medium text-white">Budget</p>
                  <p className="text-xs text-gray-400">Set spending limit</p>
                </div>
              </Link>
              <Link
                href="/goals?add=true"
                onClick={() => setShowAddMenu(false)}
                className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 transition-colors"
              >
                <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center">
                  <Target className="h-5 w-5 text-amber-400" />
                </div>
                <div>
                  <p className="font-medium text-white">Goal</p>
                  <p className="text-xs text-gray-400">Create savings goal</p>
                </div>
              </Link>
              <Link
                href="/bills"
                onClick={() => setShowAddMenu(false)}
                className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 transition-colors"
              >
                <div className="w-10 h-10 rounded-full bg-sky-500/20 flex items-center justify-center">
                  <CalendarClock className="h-5 w-5 text-sky-400" />
                </div>
                <div>
                  <p className="font-medium text-white">Bill reminder</p>
                  <p className="text-xs text-gray-400">Schedule payments</p>
                </div>
              </Link>
            </div>
            <button
              onClick={() => setShowAddMenu(false)}
              className="absolute -bottom-12 left-1/2 -translate-x-1/2 w-10 h-10 rounded-full bg-white/10 flex items-center justify-center"
            >
              <Plus className="h-6 w-6 text-white rotate-45" />
            </button>
          </div>
        </div>
      )}

      {/* Safe area spacer for mobile */}
      <div className="h-20 md:hidden" />
    </>
  );
}

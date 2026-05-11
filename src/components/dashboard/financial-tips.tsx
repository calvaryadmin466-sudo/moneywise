"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Lightbulb, TrendingUp, PiggyBank, AlertTriangle, Target, Receipt, CheckCircle2 } from "lucide-react";
import { countryDataService } from "@/lib/country-data";
import { FinancialTip, TipCategory, Priority } from "@/lib/types";
import { getUser } from "@/lib/supabase";

const CATEGORY_ICONS: Record<TipCategory, typeof Lightbulb> = {
  [TipCategory.BUDGETING]: Receipt,
  [TipCategory.SAVING]: PiggyBank,
  [TipCategory.INVESTING]: TrendingUp,
  [TipCategory.DEBT]: AlertTriangle,
  [TipCategory.EMERGENCY]: Target,
  [TipCategory.RETIREMENT]: CheckCircle2,
  [TipCategory.TAX]: Receipt,
};

const PRIORITY_COLORS: Record<Priority, string> = {
  [Priority.HIGH]: "bg-red-500/20 text-red-400 border-red-500/30",
  [Priority.MEDIUM]: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  [Priority.LOW]: "bg-blue-500/20 text-blue-400 border-blue-500/30",
};

const CATEGORY_COLORS: Record<TipCategory, string> = {
  [TipCategory.BUDGETING]: "text-cyan-400",
  [TipCategory.SAVING]: "text-green-400",
  [TipCategory.INVESTING]: "text-amber-400",
  [TipCategory.DEBT]: "text-red-400",
  [TipCategory.EMERGENCY]: "text-purple-400",
  [TipCategory.RETIREMENT]: "text-blue-400",
  [TipCategory.TAX]: "text-orange-400",
};

export function FinancialTips() {
  const [tips, setTips] = React.useState<FinancialTip[]>([]);
  const [countryCode, setCountryCode] = React.useState<string>("TZ");
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    async function loadTips() {
      const user = await getUser();
      if (user) {
        // Get country from user profile or default to TZ
        const { data: profile } = await supabase
          .from("user_profiles")
          .select("country_code")
          .eq("id", user.id)
          .single();
        
        const code = profile?.country_code || "TZ";
        setCountryCode(code);
        
        const countryTips = countryDataService.getFinancialTips(code);
        setTips(countryTips.slice(0, 3)); // Show top 3 tips
      }
      setLoading(false);
    }
    loadTips();
  }, []);

  if (loading) {
    return (
      <Card className="bg-[#1e293b]/50 border-white/10">
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-white/10 rounded w-1/3"></div>
            <div className="h-20 bg-white/10 rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (tips.length === 0) return null;

  return (
    <Card className="bg-gradient-to-br from-[#1e293b] to-[#0f172a] border-white/10 overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-gradient-to-br from-amber-500/20 to-orange-500/20">
            <Lightbulb className="h-5 w-5 text-amber-400" />
          </div>
          <CardTitle className="text-lg font-semibold text-white">
            Financial Tips for {countryDataService.getCountryById(countryCode).name}
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {tips.map((tip) => {
          const Icon = CATEGORY_ICONS[tip.category];
          return (
            <div
              key={tip.id}
              className="group relative p-4 rounded-xl bg-white/5 hover:bg-white/10 transition-all duration-300 border border-white/5 hover:border-white/10"
            >
              <div className="flex items-start gap-3">
                <div className={`p-2 rounded-lg bg-white/5 ${CATEGORY_COLORS[tip.category]}`}>
                  <Icon className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-medium text-white text-sm">{tip.title}</h4>
                    <Badge 
                      variant="outline" 
                      className={`text-xs ${PRIORITY_COLORS[tip.priority]}`}
                    >
                      {tip.priority}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-400 leading-relaxed">{tip.description}</p>
                  <Badge 
                    variant="outline" 
                    className="mt-2 text-xs bg-white/5 text-gray-400 border-white/10"
                  >
                    {tip.category}
                  </Badge>
                </div>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

// Import supabase
import { supabase } from "@/lib/supabase";

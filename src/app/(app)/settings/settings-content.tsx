"use client";

import * as React from "react";
import { Settings, Moon, Sun, Wallet, Shield, Bell, Laptop, ExternalLink, Mail, Phone, User, Github } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useRouter, useSearchParams } from "next/navigation";

export default function SettingsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [currency, setCurrency] = React.useState(searchParams.get("currency") || "TZS");
  const [darkMode, setDarkMode] = React.useState(false);
  const [notifications, setNotifications] = React.useState(true);
  const [compactMode, setCompactMode] = React.useState(false);

  React.useEffect(() => {
    const isDark = document.documentElement.classList.contains("dark");
    setDarkMode(isDark);
  }, []);

  function handleCurrencyChange(newCurrency: string) {
    setCurrency(newCurrency);
    const params = new URLSearchParams(searchParams.toString());
    params.set("currency", newCurrency);
    router.push(`?${params.toString()}`);
  }

  function toggleDarkMode() {
    const newMode = !darkMode;
    setDarkMode(newMode);
    if (newMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }

  return (
    <main className="flex-1 space-y-6 bg-background/50 p-4 sm:p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage your preferences and account settings
        </p>
      </div>

      <div className="grid gap-6 grid-cols-1 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wallet className="h-5 w-5 text-primary" />
              Currency
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Default Currency</Label>
              <Select value={currency} onValueChange={handleCurrencyChange}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TZS">Tanzanian Shilling (TSh)</SelectItem>
                  <SelectItem value="USD">US Dollar ($)</SelectItem>
                  <SelectItem value="KES">Kenyan Shilling (KSh)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground">
                This currency will be used throughout the app for displaying amounts.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {darkMode ? <Moon className="h-5 w-5 text-primary" /> : <Sun className="h-5 w-5 text-primary" />}
              Appearance
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Dark Mode</Label>
                <p className="text-sm text-muted-foreground">
                  Toggle between light and dark theme
                </p>
              </div>
              <Switch checked={darkMode} onCheckedChange={toggleDarkMode} />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Compact Mode</Label>
                <p className="text-sm text-muted-foreground">
                  Reduce spacing for more content on screen
                </p>
              </div>
              <Switch checked={compactMode} onCheckedChange={setCompactMode} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-primary" />
              Notifications
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Push Notifications</Label>
                <p className="text-sm text-muted-foreground">
                  Receive alerts for budget limits and goals
                </p>
              </div>
              <Switch checked={notifications} onCheckedChange={setNotifications} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              Security
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Session</Label>
                <p className="text-sm text-muted-foreground">
                  Your session is active and secure
                </p>
              </div>
              <Badge variant="outline" className="text-emerald-500 border-emerald-500/30">Active</Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Laptop className="h-5 w-5 text-primary" />
            About
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">MoneyWise</p>
              <p className="text-sm text-muted-foreground">Personal Finance Management App</p>
            </div>
            <Badge variant="secondary">v1.0</Badge>
          </div>
          
          <div className="border-t border-border pt-4 space-y-3">
            <p className="font-medium text-sm">Created by</p>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <User className="h-4 w-4 text-cyan-400" />
              <span>Straton Florentin Tesha</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Mail className="h-4 w-4 text-cyan-400" />
              <a href="mailto:stratonflorentin@gmail.com" className="hover:text-cyan-400 transition-colors">
                stratonflorentin@gmail.com
              </a>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Phone className="h-4 w-4 text-cyan-400" />
              <span>0627990768, 0775690768</span>
            </div>
          </div>

          <div className="border-t border-border pt-4">
            <p className="text-xs text-muted-foreground">
              For feedback, suggestions, or support, please contact us using the information above.
            </p>
          </div>

          <div className="flex items-center gap-2 text-sm text-muted-foreground border-t border-border pt-4">
            <ExternalLink className="h-4 w-4" />
            Built with Next.js, Nhost, and Tailwind CSS
          </div>
        </CardContent>
      </Card>
    </main>
  );
}

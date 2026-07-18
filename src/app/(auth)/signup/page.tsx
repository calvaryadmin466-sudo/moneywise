"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signUp, supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Logo } from "@/components/logo";
import { Eye, EyeOff } from "lucide-react";

export default function SignupPage() {
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [showPassword, setShowPassword] = React.useState(false);
  const router = useRouter();
  const { toast } = useToast();

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();

    const normalizedEmail = email.trim().toLowerCase();

    if (password !== confirmPassword) {
      toast({
        title: "Error",
        description: "Passwords do not match",
        variant: "destructive",
      });
      return;
    }

    if (password.length < 6) {
      toast({
        title: "Error",
        description: "Password must be at least 6 characters",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const result = await signUp(normalizedEmail, password);

      // Suppress email errors and always try to auto-login
      const isEmailError = result.error?.message?.toLowerCase().includes('email') ||
        result.error?.message?.toLowerCase().includes('confirmation');

      // If user was created successfully, auto-login (even if email failed)
      if (result.user) {
        // Try to sign in immediately to get a session
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: normalizedEmail,
          password,
        });

        if (!signInError) {
          toast({
            title: "Welcome to MoneyWise!",
            description: isEmailError ? "Account created successfully!" : "Account created! Welcome to MoneyWise!",
          });
          router.replace("/dashboard");
          return;
        }
      }

      // Only show error if it's not an email-related error
      if (result.error && !isEmailError) {
        toast({
          title: "Error",
          description: result.error.message,
          variant: "destructive",
        });
      } else if (result.user) {
        // User created but login failed - still a success
        toast({
          title: "Account Created",
          description: "Please sign in with your credentials.",
        });
        router.replace("/login");
      }
    } catch (err: unknown) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Signup failed",
        variant: "destructive",
      });
    }

    setLoading(false);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[radial-gradient(circle_at_top,_rgba(34,211,238,0.16),_transparent_40%),linear-gradient(135deg,_#07111f_0%,_#111827_100%)] p-4 sm:p-6">
      <div className="w-full max-w-md space-y-4">
        <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-center text-sm text-slate-300 backdrop-blur-sm">
          Build better money habits from day one with a dashboard that helps you stay in control.
        </div>
        <Card className="w-full border-cyan-500/30 bg-slate-900/80 shadow-[0_20px_80px_rgba(2,8,23,0.45)] backdrop-blur-xl">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 h-16 w-16 relative">
              <Logo width={64} height={64} className="rounded-2xl" />
            </div>
            <CardTitle className="text-2xl font-semibold bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
              MONEY-WISE
            </CardTitle>
            <CardDescription className="text-sm text-slate-400">
              Create your account and start managing your finances
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSignup} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-gray-300">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="bg-slate-800/80 border-white/10 text-white placeholder:text-slate-500 focus-visible:ring-cyan-400"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className="text-gray-300">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Create a password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="bg-slate-800/80 border-white/10 text-white placeholder:text-slate-500 pr-10 focus-visible:ring-cyan-400"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-gray-300">Confirm Password</Label>
                <Input
                  id="confirmPassword"
                  type={showPassword ? "text" : "password"}
                  placeholder="Confirm your password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className="bg-slate-800/80 border-white/10 text-white placeholder:text-slate-500 focus-visible:ring-cyan-400"
                />
              </div>
              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white shadow-[0_0_20px_rgba(6,182,212,0.3)] rounded-2xl"
              >
                {loading ? "Creating account..." : "Sign Up"}
              </Button>
            </form>
            <div className="mt-6 text-center text-sm text-gray-400">
              Already have an account?{" "}
              <Link href="/login" className="text-cyan-400 hover:text-cyan-300 font-medium">
                Sign in
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

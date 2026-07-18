"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signIn, resendVerificationEmail } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Logo } from "@/components/logo";
import { Eye, EyeOff } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [showPassword, setShowPassword] = React.useState(false);
  const [needsVerification, setNeedsVerification] = React.useState(false);
  const [resending, setResending] = React.useState(false);
  const router = useRouter();
  const { toast } = useToast();

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setNeedsVerification(false);

    try {
      const result = await signIn(email.trim().toLowerCase(), password);

      if (result.error) {
        console.error("Login error:", result.error);
        const errorMsg = result.error.message || "";

        // Check if user needs verification
        if (errorMsg.toLowerCase().includes("not verified") || errorMsg.toLowerCase().includes("unverified")) {
          setNeedsVerification(true);
          toast({
            title: "Email Not Verified",
            description: "Please check your email for a verification link, or click below to resend it.",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Error",
            description: errorMsg,
            variant: "destructive",
          });
        }
      } else {
        toast({
          title: "Success",
          description: "Logged in successfully!",
        });

        router.replace("/dashboard");
      }
    } catch (err: unknown) {
      console.error("Login error:", err);
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Login failed",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleResendVerification() {
    if (!email) {
      toast({
        title: "Error",
        description: "Please enter your email address",
        variant: "destructive",
      });
      return;
    }

    setResending(true);
    const result = await resendVerificationEmail(email.trim().toLowerCase());

    if (result.error) {
      toast({
        title: "Error",
        description: result.error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Verification Email Sent",
        description: "Please check your email and click the verification link.",
      });
    }
    setResending(false);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[radial-gradient(circle_at_top,_rgba(34,211,238,0.16),_transparent_40%),linear-gradient(135deg,_#07111f_0%,_#111827_100%)] p-4 sm:p-6">
      <div className="w-full max-w-md space-y-4">
        <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-center text-sm text-slate-300 backdrop-blur-sm">
          Welcome back. Keep your money goals on track with a calmer, clearer view of every transaction.
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
              Sign in to your account
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
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
                    placeholder="Enter your password"
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
              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white shadow-[0_0_20px_rgba(6,182,212,0.3)] rounded-2xl"
              >
                {loading ? "Signing in..." : "Sign In"}
              </Button>

              {needsVerification && (
                <div className="mt-4 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                  <p className="text-sm text-amber-400 mb-2">
                    Your email is not verified. Check your inbox or resend the verification email.
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={resending}
                    onClick={handleResendVerification}
                    className="w-full border-amber-500/30 text-amber-400 hover:bg-amber-500/10"
                  >
                    {resending ? "Sending..." : "Resend Verification Email"}
                  </Button>
                </div>
              )}
            </form>
            <div className="mt-6 text-center text-sm text-gray-400">
              Don&apos;t have an account?{" "}
              <Link href="/signup" className="text-cyan-400 hover:text-cyan-300 font-medium">
                Sign up
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

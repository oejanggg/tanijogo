"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff, Sprout, ChevronLeft, AlertCircle, Loader2 } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../lib/auth-context";

export default function LoginPage() {
  const [showPw, setShowPw] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  // Redirect if already logged in
  useEffect(() => {
    if (!authLoading && user) router.push("/home");
  }, [user, authLoading, router]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError("Please enter your email and password.");
      return;
    }
    setLoading(true);
    setError(null);

    const { error: authError } = await supabase.auth.signInWithPassword({ email, password });

    if (authError) {
      setError(authError.message || "Invalid email or password. Please try again.");
      setLoading(false);
    } else {
      router.push("/home");
    }
  };

  if (authLoading) return null;

  return (
    <div className="min-h-screen bg-slate-50 max-w-md mx-auto flex flex-col">
      <div className="bg-gradient-to-br from-emerald-900 via-emerald-800 to-teal-800 pt-12 pb-20 px-5 relative overflow-hidden">
        <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/5 rounded-full blur-2xl" />
        <button onClick={() => router.back()} className="text-emerald-200/80 mb-8 hover:text-white transition-colors">
          <ChevronLeft size={26} />
        </button>
        <div className="space-y-1">
          <div className="flex items-center space-x-2.5 mb-2">
            <div className="w-9 h-9 bg-white/15 rounded-xl flex items-center justify-center">
              <Sprout size={20} className="text-emerald-200" />
            </div>
            <span className="text-white/60 text-sm font-semibold">SukaTani</span>
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight">Welcome back!</h1>
          <p className="text-emerald-200/80 text-sm font-medium">Sign in to your farmer account</p>
        </div>
      </div>

      <div className="flex-1 px-5 -mt-12 z-10">
        <div className="bg-white rounded-3xl shadow-xl border border-slate-100/80 p-6">
          <h2 className="text-lg font-bold text-slate-800 mb-5">Sign in</h2>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-2xl px-4 py-3 flex items-center space-x-2.5 mb-4">
              <AlertCircle size={16} className="text-red-600 shrink-0" />
              <p className="text-red-700 text-xs font-semibold">{error}</p>
            </div>
          )}

          <form onSubmit={handleSignIn} className="space-y-3.5">
            <input
              type="email"
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full border border-slate-200 bg-slate-50/50 rounded-xl px-4 py-3.5 text-sm font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400 transition-all"
            />
            <div className="relative">
              <input
                type={showPw ? "text" : "password"}
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full border border-slate-200 bg-slate-50/50 rounded-xl px-4 py-3.5 pr-12 text-sm font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400 transition-all"
              />
              <button type="button" onClick={() => setShowPw(!showPw)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors">
                {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-emerald-700 to-teal-600 text-white py-4 rounded-2xl font-extrabold text-sm shadow-lg shadow-emerald-600/25 hover:from-emerald-800 hover:to-teal-700 disabled:opacity-70 active:scale-[0.99] transition-all mt-1 flex items-center justify-center space-x-2"
            >
              {loading ? (
                <><Loader2 size={16} className="animate-spin" /><span>Signing in...</span></>
              ) : <span>Sign in</span>}
            </button>
          </form>

          <p className="text-center text-sm text-slate-500 mt-6">
            Don&#39;t have an account?{" "}
            <Link href="/signup" className="text-emerald-700 font-bold hover:text-emerald-800 transition-colors">
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

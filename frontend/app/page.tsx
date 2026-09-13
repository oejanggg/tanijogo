"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "./lib/auth-context";
import { Sprout, ArrowRight, TrendingUp, Shield, Mic, Loader2 } from "lucide-react";

export default function LandingPage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  // If already signed in, go straight to home
  useEffect(() => {
    if (!loading && user) router.push("/home");
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-gradient-to-br from-emerald-950 to-teal-900 max-w-md mx-auto">
        <Loader2 size={36} className="text-emerald-300 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-dvh flex flex-col justify-between bg-gradient-to-br from-emerald-950 via-emerald-900 to-teal-900 max-w-md mx-auto relative overflow-hidden pt-[max(1.5rem,env(safe-area-inset-top,0px))] pb-[max(1.5rem,calc(env(safe-area-inset-bottom,0px)+1rem))]">
      <div className="absolute -top-20 -right-20 w-80 h-80 bg-emerald-400/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 -left-20 w-72 h-72 bg-teal-400/10 rounded-full blur-3xl pointer-events-none" />

      <div className="flex-1 flex flex-col items-center justify-center px-6 py-6 sm:py-8 space-y-6">
        <div className="flex flex-col items-center space-y-3">
          <div className="w-20 h-20 sm:w-24 sm:h-24 bg-gradient-to-br from-emerald-400/30 to-teal-400/20 backdrop-blur-xl rounded-3xl flex items-center justify-center border border-white/20 shadow-2xl shadow-emerald-900/50">
            <Sprout size={42} className="text-emerald-300" />
          </div>
          <div className="text-center space-y-1">
            <h1 className="text-4xl sm:text-5xl font-black tracking-tighter bg-gradient-to-r from-white via-emerald-100 to-emerald-300 bg-clip-text text-transparent">
              TaniJaga
            </h1>
            <p className="text-emerald-300/90 text-xs sm:text-sm font-semibold tracking-wide uppercase">
              AI Farm Financial Engine · Multi-Commodity
            </p>
          </div>
        </div>

        <p className="text-emerald-100/80 text-center text-xs sm:text-sm leading-relaxed max-w-xs font-medium">
          Smart receipt audit and production cost tracking built for Indonesian <strong>Corn (Jagung)</strong>, <strong>Chili (Cabai)</strong>, and <strong>Rice (Padi)</strong> growers.
        </p>

        <div className="w-full space-y-2.5">
          {[
            { icon: Shield, text: "Audit receipts & bulk upload (Corn, Chili, Rice)" },
            { icon: TrendingUp, text: "3-month price history & real-time break-even HPP" },
            { icon: Mic, text: "English voice briefs powered by ElevenLabs AI" },
          ].map(({ icon: Icon, text }) => (
            <div key={text} className="bg-white/8 backdrop-blur-sm rounded-2xl px-3.5 py-3 border border-white/10 flex items-center space-x-3">
              <div className="w-8 h-8 bg-emerald-500/25 rounded-xl flex items-center justify-center shrink-0">
                <Icon size={16} className="text-emerald-300" />
              </div>
              <p className="text-emerald-100/90 text-xs sm:text-sm font-medium">{text}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="px-6 space-y-3">
        <button
          onClick={() => router.push("/login")}
          className="w-full bg-white text-emerald-900 py-3.5 sm:py-4 rounded-2xl font-extrabold text-sm sm:text-base shadow-xl shadow-emerald-900/30 hover:bg-emerald-50 active:scale-[0.98] transition-all duration-200 flex items-center justify-center space-x-2"
        >
          <span>Sign In</span>
          <ArrowRight size={18} />
        </button>
        <button
          onClick={() => router.push("/signup")}
          className="w-full bg-white/10 backdrop-blur-sm border border-white/25 text-white py-3.5 sm:py-4 rounded-2xl font-bold text-sm sm:text-base hover:bg-white/15 active:scale-[0.98] transition-all duration-200"
        >
          Create Account
        </button>
        <button
          onClick={() => router.push("/home")}
          className="w-full text-center text-emerald-400/60 text-xs font-semibold py-1 hover:text-emerald-300/80 transition-colors"
        >
          Skip → View demo
        </button>
      </div>
    </div>
  );
}

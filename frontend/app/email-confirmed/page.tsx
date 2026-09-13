"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, ArrowRight, ShieldCheck } from "lucide-react";
import { supabase } from "../../lib/supabase";

export default function EmailConfirmedPage() {
  const router = useRouter();
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    // When Supabase confirmation link is clicked, it might automatically exchange token
    // We sign out to let the user cleanly sign in from the login page
    supabase.auth.signOut().catch(() => {});

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          router.push("/login");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [router]);

  return (
    <div className="min-h-dvh bg-slate-50 max-w-md mx-auto flex flex-col justify-center px-6 py-12">
      <div className="bg-white rounded-3xl p-7 shadow-xl border border-slate-100 text-center space-y-6 animate-scale-up">
        {/* Animated Celebration Icon */}
        <div className="w-20 h-20 bg-emerald-100 rounded-3xl flex items-center justify-center mx-auto shadow-md shadow-emerald-500/15">
          <CheckCircle2 size={44} className="text-emerald-600" />
        </div>

        <div className="space-y-2">
          <div className="inline-flex items-center space-x-1.5 bg-emerald-50 text-emerald-800 text-[11px] font-extrabold px-3 py-1 rounded-full border border-emerald-200/60">
            <ShieldCheck size={14} />
            <span>Verification Successful</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Email Confirmed!
          </h1>
          <p className="text-slate-600 text-xs leading-relaxed max-w-xs mx-auto">
            Your TaniJaga farmer account is now verified and active. You can proceed to sign in.
          </p>
        </div>

        {/* Action Button */}
        <div className="space-y-3 pt-2">
          <button
            onClick={() => router.push("/login")}
            className="w-full bg-emerald-700 hover:bg-emerald-800 text-white py-4 rounded-2xl font-extrabold text-sm shadow-lg shadow-emerald-700/25 active:scale-[0.98] transition-all flex items-center justify-center space-x-2"
          >
            <span>Proceed to Sign In</span>
            <ArrowRight size={16} />
          </button>
          <p className="text-[11px] text-slate-400 font-medium">
            Redirecting automatically in <strong className="text-slate-600">{countdown}s</strong>...
          </p>
        </div>
      </div>
    </div>
  );
}

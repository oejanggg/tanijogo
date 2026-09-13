"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff, ChevronLeft, AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../lib/auth-context";

type FormData = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  password: string;
};

export default function SignupPage() {
  const [showPw, setShowPw] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [form, setForm] = useState<FormData>({ firstName: "", lastName: "", email: "", phone: "", password: "" });
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  useEffect(() => {
    if (!authLoading && user) router.push("/home");
  }, [user, authLoading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agreed) { setError("You must agree to the Privacy Policy and Terms of Use."); return; }
    if (!form.email || !form.password) { setError("Email and password are required."); return; }
    if (form.password.length < 6) { setError("Password must be at least 6 characters."); return; }

    setLoading(true);
    setError(null);

    // 1. Create auth user with dynamic confirmation redirect
    const redirectUrl = typeof window !== "undefined"
      ? `${window.location.origin}/email-confirmed`
      : undefined;

    const { data: authData, error: signUpError } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        emailRedirectTo: redirectUrl,
      },
    });

    if (signUpError) {
      setError(signUpError.message || "Sign up failed. Please try again.");
      setLoading(false);
      return;
    }

    // 2. Save profile (first_name, last_name, phone)
    if (authData.user) {
      await supabase.from("profiles").insert([{
        id: authData.user.id,
        first_name: form.firstName,
        last_name: form.lastName,
        phone: form.phone,
      }]);
    }

    setSuccess(true);
    setLoading(false);
  };

  const fields: { key: keyof FormData; label: string; type?: string }[] = [
    { key: "firstName", label: "First Name" },
    { key: "lastName", label: "Last Name" },
    { key: "email", label: "Email", type: "email" },
    { key: "phone", label: "Phone Number", type: "tel" },
  ];

  if (authLoading) return null;

  // Email Confirmation State
  if (success) {
    return (
      <div className="min-h-dvh bg-slate-50 max-w-md mx-auto flex flex-col justify-center px-6 py-12">
        <div className="bg-white rounded-3xl p-7 shadow-xl border border-slate-100 text-center space-y-5 animate-scale-up">
          <div className="w-20 h-20 bg-emerald-100 rounded-3xl flex items-center justify-center mx-auto text-3xl shadow-md shadow-emerald-500/15">
            📬
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Confirm Your Email</h1>
            <p className="text-slate-600 text-xs leading-relaxed">
              We&apos;ve sent a verification link to:
            </p>
            <p className="font-extrabold text-emerald-800 text-sm bg-emerald-50 py-1.5 px-3 rounded-xl inline-block border border-emerald-200/60">
              {form.email}
            </p>
          </div>

          <div className="bg-slate-50 rounded-2xl p-4 text-left border border-slate-100 space-y-1.5 text-xs text-slate-500">
            <p className="font-bold text-slate-700">Next steps:</p>
            <p className="flex items-start space-x-2">
              <span>1.</span>
              <span>Open your email app and click the confirmation link.</span>
            </p>
            <p className="flex items-start space-x-2">
              <span>2.</span>
              <span>Once confirmed, sign in below to start auditing receipts.</span>
            </p>
          </div>

          <div className="space-y-2.5 pt-2">
            <button
              onClick={() => router.push("/login")}
              className="w-full bg-emerald-700 hover:bg-emerald-800 text-white py-4 rounded-2xl font-extrabold text-sm shadow-lg shadow-emerald-700/25 active:scale-[0.98] transition-all"
            >
              Sign In to Your Account
            </button>
            <button
              onClick={() => {
                setSuccess(false);
                setForm({ firstName: "", lastName: "", email: "", phone: "", password: "" });
              }}
              className="w-full text-slate-500 hover:text-slate-700 text-xs font-semibold py-2"
            >
              Use a different email
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-slate-50 max-w-md mx-auto">
      <div className="px-5 pt-14 pb-10">
        <button onClick={() => router.back()}
          className="text-slate-600 hover:text-emerald-700 mb-7 flex items-center transition-colors">
          <ChevronLeft size={24} />
        </button>

        <div className="mb-7 space-y-1">
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Create your account</h1>
          <p className="text-slate-500 text-sm font-medium">Please fill in your credentials</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-2xl px-4 py-3 flex items-center space-x-2.5 mb-4">
            <AlertCircle size={16} className="text-red-600 shrink-0" />
            <p className="text-red-700 text-xs font-semibold">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5">
          {fields.map(({ key, label, type }) => (
            <input
              key={key}
              type={type || "text"}
              placeholder={label}
              value={form[key]}
              onChange={(e) => setForm({ ...form, [key]: e.target.value })}
              className="w-full border border-slate-200 bg-white rounded-xl px-4 py-3.5 text-sm font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400 transition-all shadow-xs"
            />
          ))}

          <div className="relative">
            <input
              type={showPw ? "text" : "password"}
              placeholder="Password (min. 6 characters)"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              required
              className="w-full border border-slate-200 bg-white rounded-xl px-4 py-3.5 pr-12 text-sm font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400 transition-all shadow-xs"
            />
            <button type="button" onClick={() => setShowPw(!showPw)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors">
              {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          <label className="flex items-start space-x-3 py-1.5 cursor-pointer">
            <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)}
              className="w-4 h-4 mt-0.5 rounded accent-emerald-600 cursor-pointer" />
            <span className="text-xs text-slate-600 leading-relaxed">
              I agree to the{" "}
              <span className="text-emerald-700 font-bold cursor-pointer hover:underline">Privacy Policy and Terms of Use</span>
            </span>
          </label>

          <button
            type="submit"
            disabled={!agreed || loading || success}
            className="w-full bg-gradient-to-r from-emerald-700 to-teal-600 text-white py-4 rounded-2xl font-extrabold text-sm shadow-lg shadow-emerald-600/25 hover:from-emerald-800 hover:to-teal-700 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.99] transition-all mt-1 flex items-center justify-center space-x-2"
          >
            {loading ? (
              <><Loader2 size={16} className="animate-spin" /><span>Creating account...</span></>
            ) : <span>Sign up</span>}
          </button>
        </form>

        <p className="text-center text-sm text-slate-500 mt-6">
          Already have an account?{" "}
          <Link href="/login" className="text-emerald-700 font-bold hover:text-emerald-800">Sign in</Link>
        </p>
      </div>
    </div>
  );
}

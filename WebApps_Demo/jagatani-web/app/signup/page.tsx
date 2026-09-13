"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Eye, EyeOff, ChevronLeft } from 'lucide-react';

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
  const [form, setForm] = useState<FormData>({
    firstName: '', lastName: '', email: '', phone: '', password: ''
  });
  const router = useRouter();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!agreed) return;
    setLoading(true);
    setTimeout(() => router.push('/home'), 900);
  };

  const fields: { key: keyof FormData; label: string; type?: string }[] = [
    { key: 'firstName', label: 'First Name' },
    { key: 'lastName', label: 'Last Name' },
    { key: 'email', label: 'Email', type: 'email' },
    { key: 'phone', label: 'Phone Number', type: 'tel' },
  ];

  return (
    <div className="min-h-screen bg-slate-50 max-w-md mx-auto">
      <div className="px-5 pt-14 pb-10">
        <button onClick={() => router.back()}
          className="text-slate-600 hover:text-emerald-700 mb-7 flex items-center transition-colors">
          <ChevronLeft size={24} />
        </button>

        <div className="mb-7 space-y-1">
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Buat akun baru</h1>
          <p className="text-slate-500 text-sm font-medium">Please input your credentials</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5">
          {fields.map(({ key, label, type }) => (
            <input
              key={key}
              type={type || 'text'}
              placeholder={label}
              value={form[key]}
              onChange={(e) => setForm({ ...form, [key]: e.target.value })}
              className="w-full border border-slate-200 bg-white rounded-xl px-4 py-3.5 text-sm font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400 transition-all shadow-xs"
            />
          ))}

          {/* Password */}
          <div className="relative">
            <input
              type={showPw ? 'text' : 'password'}
              placeholder="Password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="w-full border border-slate-200 bg-white rounded-xl px-4 py-3.5 pr-12 text-sm font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400 transition-all shadow-xs"
            />
            <button type="button" onClick={() => setShowPw(!showPw)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors">
              {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          {/* Privacy checkbox */}
          <label className="flex items-start space-x-3 py-1.5 cursor-pointer group">
            <div className="relative mt-0.5">
              <input
                type="checkbox"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                className="w-4.5 h-4.5 rounded accent-emerald-600 cursor-pointer"
              />
            </div>
            <span className="text-xs text-slate-600 leading-relaxed">
              Agree to{' '}
              <span className="text-emerald-700 font-bold cursor-pointer hover:underline">
                Privacy Policy and Terms of Use
              </span>
            </span>
          </label>

          <button
            type="submit"
            disabled={!agreed || loading}
            className="w-full bg-gradient-to-r from-emerald-700 to-teal-600 text-white py-4 rounded-2xl font-extrabold text-sm shadow-lg shadow-emerald-600/25 hover:from-emerald-800 hover:to-teal-700 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.99] transition-all mt-1 flex items-center justify-center space-x-2"
          >
            {loading ? (
              <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /><span>Mendaftar...</span></>
            ) : <span>Sign up</span>}
          </button>
        </form>

        <p className="text-center text-sm text-slate-500 mt-6">
          Sudah punya akun?{' '}
          <Link href="/login" className="text-emerald-700 font-bold hover:text-emerald-800">Sign in</Link>
        </p>
      </div>
    </div>
  );
}

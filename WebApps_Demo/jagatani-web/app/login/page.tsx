"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Eye, EyeOff, Sprout, ChevronLeft } from 'lucide-react';

export default function LoginPage() {
  const [showPw, setShowPw] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSignIn = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => router.push('/home'), 800);
  };

  return (
    <div className="min-h-screen bg-slate-50 max-w-md mx-auto flex flex-col">
      {/* Emerald header strip */}
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
          <h1 className="text-3xl font-black text-white tracking-tight">Selamat datang kembali!</h1>
          <p className="text-emerald-200/80 text-sm font-medium">Masuk ke akun petani kamu</p>
        </div>
      </div>

      {/* Form Card */}
      <div className="flex-1 px-5 -mt-12 z-10">
        <div className="bg-white rounded-3xl shadow-xl border border-slate-100/80 p-6">
          <h2 className="text-lg font-bold text-slate-800 mb-5">Sign in</h2>
          <form onSubmit={handleSignIn} className="space-y-3.5">
            <input
              type="text"
              placeholder="Email / Nomor HP"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-slate-200 bg-slate-50/50 rounded-xl px-4 py-3.5 text-sm font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400 transition-all"
            />
            <div className="relative">
              <input
                type={showPw ? 'text' : 'password'}
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
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
                <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /><span>Masuk...</span></>
              ) : <span>Sign in</span>}
            </button>
          </form>

          <p className="text-center text-sm text-slate-500 mt-6">
            Belum punya akun?{' '}
            <Link href="/signup" className="text-emerald-700 font-bold hover:text-emerald-800 transition-colors">
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

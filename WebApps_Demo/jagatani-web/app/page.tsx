"use client";

import { useRouter } from 'next/navigation';
import { Sprout, ArrowRight, TrendingUp, Shield, Mic } from 'lucide-react';

export default function LandingPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-emerald-950 via-emerald-900 to-teal-900 max-w-md mx-auto relative overflow-hidden">
      {/* Background glow rings */}
      <div className="absolute -top-20 -right-20 w-80 h-80 bg-emerald-400/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 -left-20 w-72 h-72 bg-teal-400/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-emerald-600/5 rounded-full blur-3xl pointer-events-none" />

      {/* Hero */}
      <div className="flex-1 flex flex-col items-center justify-center px-8 py-12 space-y-8">
        {/* Logo */}
        <div className="flex flex-col items-center space-y-4">
          <div className="w-24 h-24 bg-gradient-to-br from-emerald-400/30 to-teal-400/20 backdrop-blur-xl rounded-3xl flex items-center justify-center border border-white/20 shadow-2xl shadow-emerald-900/50">
            <Sprout size={48} className="text-emerald-300" />
          </div>
          <div className="text-center space-y-1">
            <h1 className="text-5xl font-black tracking-tighter bg-gradient-to-r from-white via-emerald-100 to-emerald-300 bg-clip-text text-transparent">
              SukaTani
            </h1>
            <p className="text-emerald-300/90 text-sm font-semibold tracking-wide uppercase">AI · Audit · Insentif</p>
          </div>
        </div>

        <p className="text-emerald-100/80 text-center text-base leading-relaxed max-w-xs font-medium">
          Platform keuangan & insentif berbasis AI untuk petani Indonesia
        </p>

        {/* Features */}
        <div className="w-full space-y-2.5">
          {[
            { icon: Shield, text: 'Audit nota pertanian dengan AI Gemini' },
            { icon: TrendingUp, text: 'Hitung HPP & break-even price otomatis' },
            { icon: Mic, text: 'Ringkasan suara AI via ElevenLabs' },
          ].map(({ icon: Icon, text }) => (
            <div key={text} className="bg-white/8 backdrop-blur-sm rounded-2xl px-4 py-3 border border-white/10 flex items-center space-x-3">
              <div className="w-8 h-8 bg-emerald-500/25 rounded-xl flex items-center justify-center shrink-0">
                <Icon size={16} className="text-emerald-300" />
              </div>
              <p className="text-emerald-100/90 text-sm font-medium">{text}</p>
            </div>
          ))}
        </div>
      </div>

      {/* CTA Buttons */}
      <div className="px-6 pb-14 space-y-3">
        <button
          onClick={() => router.push('/login')}
          className="w-full bg-white text-emerald-900 py-4 rounded-2xl font-extrabold text-base shadow-xl shadow-emerald-900/30 hover:bg-emerald-50 active:scale-[0.98] transition-all duration-200 flex items-center justify-center space-x-2"
        >
          <span>Masuk</span>
          <ArrowRight size={18} />
        </button>
        <button
          onClick={() => router.push('/signup')}
          className="w-full bg-white/10 backdrop-blur-sm border border-white/25 text-white py-4 rounded-2xl font-bold text-base hover:bg-white/15 active:scale-[0.98] transition-all duration-200"
        >
          Daftar Akun Baru
        </button>
        <button
          onClick={() => router.push('/home')}
          className="w-full text-center text-emerald-400/60 text-xs font-semibold py-1 hover:text-emerald-300/80 transition-colors"
        >
          Lewati → lihat demo
        </button>
      </div>
    </div>
  );
}

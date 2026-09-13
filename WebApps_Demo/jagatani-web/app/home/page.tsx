"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";
import {
  Wallet, Camera, Image as ImageIcon, Volume2, TrendingUp,
  TrendingDown, ChevronRight, Sprout, Bell
} from "lucide-react";
import BottomNav from "../components/BottomNav";

const DEMO_MARKET_PRICE = 14200;
const MARKET_CROP = "Cabai Merah";

// Simple CSS bar chart for HPP history
function ConfidenceStrip({ values, marketPrice }: { values: number[]; marketPrice: number }) {
  if (values.length === 0) {
    return (
      <div className="flex items-end space-x-1.5 h-16 opacity-30">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex-1 bg-emerald-300 rounded-t-sm" style={{ height: `${30 + Math.random() * 70}%` }} />
        ))}
      </div>
    );
  }
  const max = Math.max(...values, marketPrice) * 1.2;
  return (
    <div className="relative">
      {/* Market price line */}
      <div
        className="absolute left-0 right-0 border-t-2 border-dashed border-red-400/60 z-10"
        style={{ bottom: `${(marketPrice / max) * 64}px` }}
      >
        <span className="absolute -top-4 right-0 text-[9px] font-bold text-red-500 bg-white px-1 rounded">
          Harga Pasar
        </span>
      </div>
      <div className="flex items-end space-x-1.5 h-16">
        {values.slice(-10).map((v, i) => {
          const pct = Math.max(5, (v / max) * 100);
          const isAbove = v < marketPrice;
          return (
            <div
              key={i}
              className={"flex-1 rounded-t-sm transition-all duration-500 " + (isAbove ? "bg-emerald-500" : "bg-red-400")}
              style={{ height: `${pct}%` }}
            />
          );
        })}
      </div>
    </div>
  );
}

export default function HomePage() {
  const router = useRouter();
  const [ledger, setLedger] = useState<any[]>([]);
  const [walletBalance, setWalletBalance] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [lastHpp, setLastHpp] = useState<number | null>(null);
  const [yieldKg, setYieldKg] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchLedger();
    const savedHpp = localStorage.getItem("lastHpp");
    if (savedHpp) setLastHpp(parseFloat(savedHpp));
    const savedYield = localStorage.getItem("yieldKg");
    if (savedYield) setYieldKg(parseFloat(savedYield));
  }, []);

  const fetchLedger = async () => {
    const { data } = await supabase
      .from("farmer_ledger")
      .select("*")
      .order("created_at", { ascending: false });
    if (data) {
      setLedger(data);
      const total = data.reduce((s, r) => s + (r.reward_earned || 0), 0);
      setWalletBalance(total);
      // Get last HPP
      const hpps = data.filter((r) => r.hpp_per_kg).map((r) => r.hpp_per_kg);
      if (hpps.length > 0) {
        const latest = hpps[0];
        setLastHpp(latest);
        localStorage.setItem("lastHpp", String(latest));
      }
    }
  };

  const handleFileSelect = async (file: File) => {
    if (!file) return;
    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const res = await fetch(`${apiUrl}/audit`, { method: "POST", body: formData });
      if (!res.ok) throw new Error("Upload failed");
      const data = await res.json();
      sessionStorage.setItem("auditResult", JSON.stringify(data));
      // Insert to supabase
      const rec = data.transaction_record || data.evaluation;
      const fin = data.financials || {};
      if (rec) {
        await supabase.from("farmer_ledger").insert([{
          merchant_name: rec.merchant_name,
          primary_category: rec.primary_receipt_category || rec.primary_category,
          quality_score: rec.image_quality_score,
          reward_earned: data.reward ?? rec.reward_earned_idr ?? 0,
          total_production_cost: fin.total_production_cost ?? rec.total_production_cost_idr,
          hpp_per_kg: fin.hpp_per_kg ?? rec.hpp_per_kg_idr,
          fraud_detected: rec.is_original_receipt !== undefined ? !rec.is_original_receipt : false,
        }]);
      }
      router.push("/verdict");
    } catch {
      alert("Gagal upload. Pastikan server berjalan.");
      setUploading(false);
    }
  };

  const hpp = lastHpp ?? 12500;
  const isAboveMarket = DEMO_MARKET_PRICE > hpp;
  const hppValues = ledger.filter((r) => r.hpp_per_kg).map((r) => r.hpp_per_kg as number).reverse();

  return (
    <div className="min-h-screen bg-slate-50 max-w-md mx-auto pb-24 font-sans">
      {/* Top Header */}
      <header className="bg-gradient-to-br from-emerald-900 via-emerald-800 to-teal-800 px-5 pt-12 pb-5 relative overflow-hidden">
        <div className="absolute -top-8 -right-8 w-36 h-36 bg-white/5 rounded-full blur-2xl pointer-events-none" />
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 bg-white/15 rounded-xl flex items-center justify-center">
              <Sprout size={20} className="text-emerald-200" />
            </div>
            <div>
              <h1 className="text-white font-extrabold text-base leading-none">SukaTani</h1>
              <p className="text-emerald-300/70 text-[10px] font-medium">AI Audit Platform</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button className="w-9 h-9 bg-white/10 rounded-xl flex items-center justify-center text-white/70 hover:bg-white/20 transition-colors">
              <Bell size={18} />
            </button>
            <div className="w-9 h-9 bg-emerald-600/40 rounded-xl flex items-center justify-center border border-emerald-400/30">
              <span className="text-emerald-200 font-extrabold text-sm">P</span>
            </div>
          </div>
        </div>

        {/* Wallet balance row */}
        <div className="mt-4 bg-white/10 backdrop-blur-md rounded-2xl p-3.5 border border-white/15 flex items-center justify-between">
          <div>
            <p className="text-emerald-200/70 text-[10px] font-bold uppercase tracking-wider">Total Insentif</p>
            <p className="text-white font-black text-xl mt-0.5">Rp {walletBalance.toLocaleString("id-ID")}</p>
          </div>
          <div className="bg-gradient-to-br from-emerald-500 to-teal-500 p-2.5 rounded-xl shadow-lg">
            <Wallet size={20} className="text-white" />
          </div>
        </div>
      </header>

      <main className="px-4 pt-4 space-y-4">
        {/* Break-even HPP Card */}
        <div className="bg-gradient-to-br from-emerald-700 to-teal-700 rounded-3xl p-5 text-white shadow-lg shadow-emerald-700/20 relative overflow-hidden">
          <div className="absolute -top-6 -right-6 w-32 h-32 bg-white/5 rounded-full blur-xl" />
          <p className="text-emerald-100/80 text-xs font-bold uppercase tracking-widest">Break-even price per kg</p>
          <p className="text-4xl font-black mt-1 mb-0.5">Rp {hpp.toLocaleString("id-ID")}</p>
          <p className="text-emerald-200/70 text-[11px] font-semibold">/ kg hasil panen</p>

          {/* Warning strip */}
          <div className="mt-4 bg-amber-400/20 border border-amber-300/30 rounded-2xl px-4 py-3">
            <p className="text-amber-100 text-xs font-bold leading-snug">
              ⚠️ Jangan jual di bawah harga ini agar tidak rugi
            </p>
            <p className="text-amber-200/70 text-[10px] font-medium mt-0.5">
              Do not sell below this price or you lose money.
            </p>
          </div>
        </div>

        {/* Confidence Strip Chart */}
        <div className="bg-white rounded-3xl p-4 shadow-xs border border-slate-100">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="font-extrabold text-slate-800 text-sm">CONFIDENCE STRIP</h3>
              <p className="text-[10px] text-slate-500 font-medium">
                {yieldKg ? `Yield: ${yieldKg.toLocaleString()} Kg` : "Yield belum dimasukkan"}
                {" · "}
                <span
                  className="text-emerald-600 font-bold cursor-pointer hover:underline"
                  onClick={() => router.push("/harvest")}
                >
                  Input yield →
                </span>
              </p>
            </div>
            <span className="text-[10px] font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
              Harga break-even Rp/kg
            </span>
          </div>
          <ConfidenceStrip values={hppValues} marketPrice={DEMO_MARKET_PRICE} />
          <div className="flex items-center justify-between text-[10px] text-slate-400 font-medium mt-2">
            <span>Perkiraan yield (Kg)</span>
            <span>{ledger.length} data titik</span>
          </div>
        </div>

        {/* Market Price Today */}
        <div className="bg-white rounded-3xl p-4 shadow-xs border border-slate-100">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-extrabold text-slate-800 text-sm">
              Harga pasar hari ini ({MARKET_CROP})
            </h3>
            <span className="text-[10px] text-slate-400 font-medium">Lokasi: Kota Anda</span>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center text-xl">
                🌶️
              </div>
              <div>
                <p className="text-[10px] text-slate-500 font-semibold">Verdict</p>
                <span className={"text-xs font-extrabold px-2.5 py-0.5 rounded-full " + (isAboveMarket ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-700")}>
                  {isAboveMarket ? "▲ ABOVE HPP" : "▼ BELOW HPP"}
                </span>
              </div>
            </div>
            <div className="text-right">
              <p className="text-2xl font-black text-slate-900">
                Rp {DEMO_MARKET_PRICE.toLocaleString("id-ID")}
              </p>
              <p className="text-[10px] text-slate-500 font-medium">/ kg</p>
              <div className="flex items-center justify-end space-x-1 mt-0.5">
                {isAboveMarket ? (
                  <TrendingUp size={12} className="text-emerald-600" />
                ) : (
                  <TrendingDown size={12} className="text-red-500" />
                )}
                <span className={"text-[10px] font-bold " + (isAboveMarket ? "text-emerald-600" : "text-red-500")}>
                  {isAboveMarket ? `+Rp ${(DEMO_MARKET_PRICE - hpp).toLocaleString()} di atas HPP` : "Di bawah HPP kamu"}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Upload Stats Row */}
        <div className="bg-white rounded-3xl px-4 py-3.5 shadow-xs border border-slate-100 flex items-center justify-between">
          <div>
            <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">Uang dan Upload</p>
            <div className="flex items-center space-x-2 mt-0.5">
              <span className="font-black text-emerald-700 text-base">Rp {walletBalance.toLocaleString("id-ID")}</span>
              <span className="text-slate-300">|</span>
              <span className="text-slate-600 text-xs font-semibold">{ledger.length} upload</span>
            </div>
          </div>
          <button onClick={() => router.push("/receipts")} className="flex items-center space-x-1 text-emerald-700 text-xs font-bold hover:text-emerald-800 transition-colors">
            <span>Lihat semua</span>
            <ChevronRight size={14} />
          </button>
        </div>

        {/* Listen Summary */}
        <button
          className="w-full bg-purple-50 border border-purple-200/80 rounded-2xl px-4 py-3.5 flex items-center justify-center space-x-2.5 hover:bg-purple-100/80 active:scale-[0.99] transition-all"
          onClick={() => {}}
        >
          <div className="w-8 h-8 bg-purple-600 rounded-xl flex items-center justify-center shadow-md shadow-purple-600/25">
            <Volume2 size={16} className="text-white" />
          </div>
          <span className="font-bold text-purple-900 text-sm">🎙️ Listen summary</span>
          <span className="text-[10px] bg-purple-200/80 text-purple-800 font-bold px-2 py-0.5 rounded-full ml-auto">
            ElevenLabs AI
          </span>
        </button>
      </main>

      {/* PHOTOGRAPH RECEIPT — sticky bottom above nav */}
      <div className="fixed bottom-16 left-1/2 -translate-x-1/2 w-full max-w-md px-4 z-40">
        <label className={"w-full flex items-center justify-center space-x-2.5 py-4 rounded-2xl font-extrabold text-base shadow-xl cursor-pointer active:scale-[0.98] transition-all " + (uploading ? "bg-slate-400 cursor-not-allowed" : "bg-slate-900 hover:bg-slate-800 shadow-slate-900/30")}>
          {uploading ? (
            <>
              <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span className="text-white">Menganalisis nota...</span>
            </>
          ) : (
            <>
              <Camera size={20} className="text-white" />
              <span className="text-white">📷 PHOTOGRAPH RECEIPT</span>
            </>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            disabled={uploading}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFileSelect(f);
              e.target.value = "";
            }}
          />
        </label>

        {/* Gallery option */}
        {!uploading && (
          <label className="mt-2 w-full flex items-center justify-center space-x-2 py-2.5 rounded-xl text-slate-600 text-xs font-semibold cursor-pointer hover:text-emerald-700 transition-colors">
            <ImageIcon size={14} />
            <span>Atau pilih dari galeri</span>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFileSelect(f);
                e.target.value = "";
              }}
            />
          </label>
        )}
      </div>

      <BottomNav />
    </div>
  );
}

"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";
import { useProtected } from "../lib/use-protected";
import { useAuth } from "../lib/auth-context";
import {
  Wallet, Camera, Image as ImageIcon, Volume2, TrendingUp,
  TrendingDown, ChevronRight, Sprout, LogOut, StopCircle
} from "lucide-react";
import BottomNav from "../components/BottomNav";

const DEMO_MARKET_PRICE = 14200;
const MARKET_CROP = "Red Chili";

function ConfidenceStrip({ values, marketPrice }: { values: number[]; marketPrice: number }) {
  const demoVals = [8500, 9200, 10100, 11000, 9800, 12500, 13200, 11800];
  const displayVals = values.length > 0 ? values : demoVals;
  const max = Math.max(...displayVals, marketPrice) * 1.2;
  return (
    <div className="relative">
      <div
        className="absolute left-0 right-0 border-t-2 border-dashed border-red-400/60 z-10 flex items-center justify-end pr-1"
        style={{ bottom: `${(marketPrice / max) * 64}px` }}
      >
        <span className="text-[9px] font-bold text-red-500 bg-white px-1 rounded -mt-3.5">
          Market
        </span>
      </div>
      <div className="flex items-end space-x-1.5 h-16">
        {displayVals.slice(-10).map((v, i) => {
          const pct = Math.max(6, (v / max) * 100);
          const profitable = v < marketPrice;
          return (
            <div
              key={i}
              className={"flex-1 rounded-t-sm transition-all duration-700 " + (profitable ? "bg-emerald-500" : "bg-red-400")}
              style={{ height: `${pct}%` }}
              title={`Rp ${v.toLocaleString()}/kg`}
            />
          );
        })}
      </div>
      {values.length === 0 && (
        <p className="text-center text-[10px] text-slate-400 font-medium mt-1">
          Demo data — upload a receipt to see real data
        </p>
      )}
    </div>
  );
}

export default function HomePage() {
  const router = useRouter();
  const { user } = useProtected();
  const { signOut } = useAuth();
  const [ledger, setLedger] = useState<any[]>([]);
  const [walletBalance, setWalletBalance] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [lastHpp, setLastHpp] = useState<number | null>(null);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const fetchLedger = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("farmer_ledger")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    if (data) {
      setLedger(data);
      const total = data.reduce((s: number, r: any) => s + (r.reward_earned || 0), 0);
      setWalletBalance(total);
      const hpps = data.filter((r: any) => r.hpp_per_kg).map((r: any) => r.hpp_per_kg as number);
      if (hpps.length > 0) {
        setLastHpp(hpps[0]);
        localStorage.setItem("lastHpp", String(hpps[0]));
      }
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchLedger();
      const saved = localStorage.getItem("lastHpp");
      if (saved) setLastHpp(parseFloat(saved));
    }
  }, [user, fetchLedger]);

  const handleFileSelect = async (file: File) => {
    if (!file || !user) return;
    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const res = await fetch(`${apiUrl}/audit`, { method: "POST", body: formData });
      if (!res.ok) throw new Error(`Server error ${res.status}`);
      const data = await res.json();
      sessionStorage.setItem("auditResult", JSON.stringify(data));

      const rec = data.transaction_record || data.evaluation;
      const fin = data.financials || {};
      const voice = data.voice_brief || {};
      const audioUrl = voice.audio_url ? `${apiUrl}${voice.audio_url}` : null;

      if (rec) {
        const { data: insertData } = await supabase
          .from("farmer_ledger")
          .insert([{
            merchant_name: rec.merchant_name,
            primary_category: rec.primary_receipt_category || rec.primary_category || "Farm Input",
            quality_score: rec.image_quality_score,
            reward_earned: data.reward ?? rec.reward_earned_idr ?? 0,
            total_production_cost: fin.total_production_cost ?? rec.total_production_cost_idr ?? 0,
            hpp_per_kg: fin.hpp_per_kg ?? rec.hpp_per_kg_idr ?? 0,
            fraud_detected: rec.is_original_receipt !== undefined ? !rec.is_original_receipt : false,
            user_id: user.id,
            voice_transcript: voice.transcript || null,
            audio_url: audioUrl,
          }])
          .select("id")
          .single();

        if (insertData) {
          sessionStorage.setItem("lastLedgerId", insertData.id);
        }
      }

      router.push("/verdict");
    } catch (err: any) {
      alert("Upload failed: " + (err?.message || "Make sure the API server is running."));
      setUploading(false);
    }
  };

  const handleListenSummary = () => {
    const latestAudio = ledger.find((r: any) => r.audio_url)?.audio_url;
    if (!latestAudio) {
      alert("No audio brief available yet. Upload a receipt first.");
      return;
    }
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
      setIsPlayingAudio(false);
      return;
    }
    const audio = new Audio(latestAudio);
    audio.play().catch(() => alert("Could not play audio. Check the API server."));
    audio.onended = () => { audioRef.current = null; setIsPlayingAudio(false); };
    audioRef.current = audio;
    setIsPlayingAudio(true);
  };

  const handleSignOut = async () => {
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
    await signOut();
    router.push("/");
  };

  const hpp = lastHpp ?? 12500;
  const isAboveMarket = DEMO_MARKET_PRICE > hpp;
  const hppValues = ledger.filter((r: any) => r.hpp_per_kg).map((r: any) => r.hpp_per_kg as number).reverse();
  const latestTranscript = ledger.find((r: any) => r.voice_transcript)?.voice_transcript;

  return (
    <div className="min-h-screen bg-slate-50 max-w-md mx-auto pb-24 font-sans">
      {/* Header */}
      <header className="bg-gradient-to-br from-emerald-900 via-emerald-800 to-teal-800 px-5 pt-12 pb-5 relative overflow-hidden">
        <div className="absolute -top-8 -right-8 w-36 h-36 bg-white/5 rounded-full blur-2xl pointer-events-none" />
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 bg-white/15 rounded-xl flex items-center justify-center">
              <Sprout size={20} className="text-emerald-200" />
            </div>
            <div>
              <h1 className="text-white font-extrabold text-base leading-none">SukaTani</h1>
              <p className="text-emerald-300/70 text-[10px] font-medium">AI Farm Financial Engine</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <div className="text-right mr-1">
              <p className="text-emerald-200/60 text-[9px] font-medium leading-none">Signed in as</p>
              <p className="text-emerald-100 text-[11px] font-bold truncate max-w-[120px]">{user?.email}</p>
            </div>
            <button
              onClick={handleSignOut}
              className="w-9 h-9 bg-white/10 rounded-xl flex items-center justify-center text-emerald-200/70 hover:bg-red-500/30 hover:text-white transition-all"
              title="Sign out"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>

        {/* Wallet balance */}
        <div className="mt-4 bg-white/10 backdrop-blur-md rounded-2xl p-3.5 border border-white/15 flex items-center justify-between">
          <div>
            <p className="text-emerald-200/70 text-[10px] font-bold uppercase tracking-wider">Total Incentive Earned</p>
            <p className="text-white font-black text-xl mt-0.5">Rp {walletBalance.toLocaleString("en-US")}</p>
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
          <p className="text-4xl font-black mt-1 mb-0.5">Rp {hpp.toLocaleString("en-US")}</p>
          <p className="text-emerald-200/70 text-[11px] font-semibold">/ kg harvest</p>
          <div className="mt-4 bg-amber-400/20 border border-amber-300/30 rounded-2xl px-4 py-3">
            <p className="text-amber-100 text-xs font-bold leading-snug">
              ⚠️ Do not sell below this price or you will lose money.
            </p>
          </div>
        </div>

        {/* Confidence Strip Chart */}
        <div className="bg-white rounded-3xl p-4 shadow-xs border border-slate-100">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="font-extrabold text-slate-800 text-sm">CONFIDENCE STRIP</h3>
              <p className="text-[10px] text-slate-500 font-medium">
                HPP history vs. market price
                {" · "}
                <span className="text-emerald-600 font-bold cursor-pointer hover:underline" onClick={() => router.push("/harvest")}>
                  Enter yield →
                </span>
              </p>
            </div>
            <span className="text-[10px] font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">HPP Rp/kg</span>
          </div>
          <ConfidenceStrip values={hppValues} marketPrice={DEMO_MARKET_PRICE} />
          <div className="flex items-center justify-between text-[10px] text-slate-400 font-medium mt-2">
            <span className="flex items-center space-x-1"><span className="w-2 h-2 bg-emerald-500 rounded-full" /><span>Profitable</span></span>
            <span className="flex items-center space-x-1"><span className="w-2 h-2 bg-red-400 rounded-full" /><span>Below market</span></span>
          </div>
        </div>

        {/* Market Price Today */}
        <div className="bg-white rounded-3xl p-4 shadow-xs border border-slate-100">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-extrabold text-slate-800 text-sm">Market Price Today ({MARKET_CROP})</h3>
            <span className="text-[10px] text-slate-400 font-medium">Local market</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center text-xl">🌶️</div>
              <div>
                <p className="text-[10px] text-slate-500 font-semibold">Verdict</p>
                <span className={"text-xs font-extrabold px-2.5 py-0.5 rounded-full " + (isAboveMarket ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-700")}>
                  {isAboveMarket ? "▲ ABOVE HPP" : "▼ BELOW HPP"}
                </span>
              </div>
            </div>
            <div className="text-right">
              <p className="text-2xl font-black text-slate-900">Rp {DEMO_MARKET_PRICE.toLocaleString("en-US")}</p>
              <p className="text-[10px] text-slate-500 font-medium">/ kg</p>
              <div className="flex items-center justify-end space-x-1 mt-0.5">
                {isAboveMarket ? <TrendingUp size={12} className="text-emerald-600" /> : <TrendingDown size={12} className="text-red-500" />}
                <span className={"text-[10px] font-bold " + (isAboveMarket ? "text-emerald-600" : "text-red-500")}>
                  {isAboveMarket ? `+Rp ${(DEMO_MARKET_PRICE - hpp).toLocaleString()} above HPP` : "Below your HPP"}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Upload Stats Row */}
        <div className="bg-white rounded-3xl px-4 py-3.5 shadow-xs border border-slate-100 flex items-center justify-between">
          <div>
            <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">Incentive & Uploads</p>
            <div className="flex items-center space-x-2 mt-0.5">
              <span className="font-black text-emerald-700 text-base">Rp {walletBalance.toLocaleString("en-US")}</span>
              <span className="text-slate-300">|</span>
              <span className="text-slate-600 text-xs font-semibold">{ledger.length} uploads</span>
            </div>
          </div>
          <button onClick={() => router.push("/receipts")} className="flex items-center space-x-1 text-emerald-700 text-xs font-bold hover:text-emerald-800 transition-colors">
            <span>View all</span>
            <ChevronRight size={14} />
          </button>
        </div>

        {/* Latest Voice Transcript */}
        {latestTranscript && (
          <div className="bg-purple-50/80 rounded-2xl px-4 py-3 border border-purple-100">
            <p className="text-[10px] text-purple-600 font-bold uppercase tracking-wider mb-1">Latest AI Brief</p>
            <p className="text-xs text-purple-900 italic leading-relaxed line-clamp-2">&ldquo;{latestTranscript}&rdquo;</p>
          </div>
        )}

        {/* Listen Summary */}
        <button
          onClick={handleListenSummary}
          className={"w-full rounded-2xl px-4 py-3.5 flex items-center justify-center space-x-2.5 active:scale-[0.99] transition-all " + (isPlayingAudio ? "bg-purple-700 border border-purple-600" : "bg-purple-50 border border-purple-200/80 hover:bg-purple-100/80")}
        >
          <div className={"w-8 h-8 rounded-xl flex items-center justify-center shadow-md " + (isPlayingAudio ? "bg-white/20" : "bg-purple-600 shadow-purple-600/25")}>
            {isPlayingAudio ? <StopCircle size={16} className="text-white" /> : <Volume2 size={16} className="text-white" />}
          </div>
          <span className={"font-bold text-sm " + (isPlayingAudio ? "text-white" : "text-purple-900")}>
            {isPlayingAudio ? "⏹ Stop audio brief" : "🎙️ Listen summary"}
          </span>
          {!isPlayingAudio && (
            <span className="text-[10px] bg-purple-200/80 text-purple-800 font-bold px-2 py-0.5 rounded-full ml-auto">ElevenLabs AI</span>
          )}
        </button>
      </main>

      {/* Sticky PHOTOGRAPH RECEIPT */}
      <div className="fixed bottom-16 left-1/2 -translate-x-1/2 w-full max-w-md px-4 z-40">
        <label className={"w-full flex items-center justify-center space-x-2.5 py-4 rounded-2xl font-extrabold text-base shadow-xl cursor-pointer active:scale-[0.98] transition-all " + (uploading ? "bg-slate-400 cursor-not-allowed" : "bg-slate-900 hover:bg-slate-800 shadow-slate-900/30")}>
          {uploading ? (
            <><span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /><span className="text-white">Analyzing receipt...</span></>
          ) : (
            <><Camera size={20} className="text-white" /><span className="text-white">📷 PHOTOGRAPH RECEIPT</span></>
          )}
          <input type="file" accept="image/*" capture="environment" className="hidden" disabled={uploading}
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileSelect(f); e.target.value = ""; }} />
        </label>

        {!uploading && (
          <label className="mt-2 w-full flex items-center justify-center space-x-2 py-2.5 rounded-xl text-slate-500 text-xs font-semibold cursor-pointer hover:text-emerald-700 transition-colors">
            <ImageIcon size={14} />
            <span>Or choose from gallery</span>
            <input type="file" accept="image/*" className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileSelect(f); e.target.value = ""; }} />
          </label>
        )}
      </div>

      <BottomNav />
    </div>
  );
}

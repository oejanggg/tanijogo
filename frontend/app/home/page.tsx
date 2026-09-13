"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useProtected } from "../lib/use-protected";
import { useAuth } from "../lib/auth-context";
import {
  Wallet, Camera, Image as ImageIcon, Volume2, TrendingUp,
  TrendingDown, ChevronRight, Sprout, LogOut, StopCircle,
  HelpCircle, Sparkles, Layers, CheckCircle2, AlertTriangle,
  X, Check, ArrowRight, Loader2
} from "lucide-react";
import BottomNav from "../components/BottomNav";
import {
  fetchAllReceipts,
  saveLedgerReceipt,
  saveLedgerReceiptsBatch,
  LedgerItem
} from "../lib/ledger-storage";

// National Food Agency (Bapanas) benchmark for dried corn kernels (Jagung Pipil Kering kadar air 15%)
const DEMO_MARKET_PRICE = 5500;
const MARKET_CROP = "Dried Corn (Jagung Pipil)";

function HppConfidenceChart({ values, marketPrice }: { values: number[]; marketPrice: number }) {
  // Realistic corn production cost / HPP demo data (Rp 3,800 - 4,800/kg)
  const demoVals = [3800, 4100, 4350, 4700, 3950, 4200, 4600, 4300];
  const displayVals = values.length > 0 ? values : demoVals;
  const max = Math.max(...displayVals, marketPrice) * 1.25;
  const currentVal = displayVals[displayVals.length - 1];
  const margin = marketPrice - currentVal;
  const isProfitable = margin >= 0;

  return (
    <div className="space-y-3">
      {/* Top Metric Callout */}
      <div className="flex items-center justify-between bg-slate-50 rounded-2xl p-3 border border-slate-100">
        <div>
          <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Latest Corn Cost (HPP)</span>
          <p className="text-base font-black text-slate-900">
            Rp {currentVal.toLocaleString("en-US")}{" "}
            <span className="text-xs font-semibold text-slate-500">/ kg</span>
          </p>
        </div>
        <div className="text-right">
          <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Estimated Margin</span>
          <p className={`text-sm font-black ${isProfitable ? "text-emerald-600" : "text-red-500"}`}>
            {isProfitable ? `+Rp ${margin.toLocaleString("en-US")}` : `-Rp ${Math.abs(margin).toLocaleString("en-US")}`}
          </p>
        </div>
      </div>

      {/* Chart Canvas */}
      <div className="relative pt-6 pb-2">
        {/* Market Benchmark Horizontal Guideline */}
        <div
          className="absolute left-0 right-0 border-t-2 border-dashed border-amber-500/80 z-10 flex items-center justify-between"
          style={{ bottom: `${Math.min(95, Math.max(15, (marketPrice / max) * 100))}%` }}
        >
          <span className="text-[9px] font-black text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded shadow-xs -mt-3.5">
            Corn Benchmark: Rp {marketPrice.toLocaleString("en-US")}/kg
          </span>
          <span className="text-[8px] font-bold text-slate-400 uppercase -mt-3.5 pr-1">Target Line</span>
        </div>

        {/* Bar Columns */}
        <div className="flex items-end space-x-2 h-28 px-1">
          {displayVals.slice(-8).map((v, i) => {
            const heightPct = Math.max(14, Math.min(100, (v / max) * 100));
            const profitable = v <= marketPrice;
            const cycleNumber = i + 1;
            return (
              <div key={i} className="flex-1 flex flex-col items-center group relative cursor-pointer">
                {/* Hover / tap tooltip */}
                <div className="absolute -top-7 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900 text-white text-[9px] font-bold py-0.5 px-1.5 rounded whitespace-nowrap z-20 pointer-events-none shadow-md">
                  Rp {v.toLocaleString()}
                </div>
                <div
                  className={`w-full rounded-t-md transition-all duration-700 relative overflow-hidden ${
                    profitable
                      ? "bg-gradient-to-t from-emerald-600 to-emerald-400 hover:from-emerald-500 hover:to-emerald-300"
                      : "bg-gradient-to-t from-red-500 to-rose-400 hover:from-red-400 hover:to-rose-300"
                  }`}
                  style={{ height: `${heightPct}%` }}
                />
                <span className="text-[9px] font-bold text-slate-400 mt-1.5">#{cycleNumber}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Legend & Explanation */}
      <div className="bg-slate-50/80 rounded-xl p-2.5 border border-slate-100 flex items-center justify-between text-[10px]">
        <div className="flex items-center space-x-1.5">
          <span className="w-2.5 h-2.5 bg-emerald-500 rounded-sm" />
          <span className="font-semibold text-slate-700">Profitable (HPP &lt; Rp 5,500)</span>
        </div>
        <div className="flex items-center space-x-1.5">
          <span className="w-2.5 h-2.5 bg-red-400 rounded-sm" />
          <span className="font-semibold text-slate-700">Cost Deficit</span>
        </div>
      </div>

      <p className="text-[10px] text-slate-400 leading-relaxed font-medium">
        🌽 <strong className="text-slate-600">Corn Farmer Guide:</strong> When production cost stays below the amber guideline (Rp 5,500/kg), you secure a healthy harvest profit. Upload corn receipts regularly to track expenses.
      </p>
    </div>
  );
}

interface BatchItemProgress {
  filename: string;
  status: "pending" | "processing" | "done" | "error";
  merchant?: string;
  category?: string;
  amount?: number;
  reward?: number;
  errorMsg?: string;
}

export default function HomePage() {
  const router = useRouter();
  const { user } = useProtected();
  const { signOut } = useAuth();
  const [ledger, setLedger] = useState<LedgerItem[]>([]);
  const [walletBalance, setWalletBalance] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [lastHpp, setLastHpp] = useState<number | null>(null);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Batch Upload States
  const [batchModalOpen, setBatchModalOpen] = useState(false);
  const [batchItems, setBatchItems] = useState<BatchItemProgress[]>([]);
  const [batchCurrentIndex, setBatchCurrentIndex] = useState(0);
  const [batchProcessing, setBatchProcessing] = useState(false);
  const [batchCompleted, setBatchCompleted] = useState(false);
  const [batchTotalReward, setBatchTotalReward] = useState(0);
  const [batchTotalCost, setBatchTotalCost] = useState(0);
  const [batchAudioUrl, setBatchAudioUrl] = useState<string | null>(null);
  const [batchTranscript, setBatchTranscript] = useState<string | null>(null);

  const fetchLedger = useCallback(async () => {
    const receipts = await fetchAllReceipts(user?.id);
    setLedger(receipts);

    const total = receipts.reduce((s, r) => s + (r.reward_earned || 0), 0);
    setWalletBalance(total);

    const hpps = receipts.filter((r) => r.hpp_per_kg > 0).map((r) => r.hpp_per_kg);
    if (hpps.length > 0) {
      setLastHpp(hpps[0]);
      localStorage.setItem("lastHpp", String(hpps[0]));
    }
  }, [user]);

  useEffect(() => {
    fetchLedger();
    const saved = localStorage.getItem("lastHpp");
    if (saved) setLastHpp(parseFloat(saved));
  }, [fetchLedger]);

  const primeAudioContext = () => {
    if (typeof window !== "undefined") {
      try {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioCtx) {
          const ctx = new AudioCtx();
          if (ctx.state === "suspended") ctx.resume();
        }
        const silentAudio = new Audio("data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=");
        silentAudio.play().catch(() => {});
      } catch {}
    }
  };

  // Single receipt upload handler
  const handleFileSelect = async (file: File) => {
    if (!file) return;
    primeAudioContext();
    setUploading(true);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const res = await fetch(`${apiUrl}/audit`, { method: "POST", body: formData });
      if (!res.ok) throw new Error(`Server error ${res.status}`);
      const data = await res.json();

      sessionStorage.setItem("auditResult", JSON.stringify(data));

      const rec = data.transaction_record || data.evaluation || {};
      const fin = data.financials || {};
      const voice = data.voice_brief || {};
      const audioUrl = voice.audio_url ? `${apiUrl}${voice.audio_url}` : null;

      // Persist to Dual-Storage (localStorage + Supabase)
      const newEntry: LedgerItem = {
        id: crypto.randomUUID(),
        user_id: user?.id || null,
        merchant_name: rec.merchant_name || "Corn Farm Supplier",
        primary_category: rec.primary_receipt_category || rec.primary_category || "Corn Input",
        quality_score: rec.image_quality_score ?? 8,
        reward_earned: data.reward ?? rec.reward_earned_idr ?? 0,
        total_production_cost: fin.total_production_cost ?? rec.total_production_cost_idr ?? 0,
        hpp_per_kg: fin.hpp_per_kg ?? rec.hpp_per_kg_idr ?? 0,
        fraud_detected: rec.is_original_receipt !== undefined ? !rec.is_original_receipt : false,
        created_at: new Date().toISOString(),
        voice_transcript: voice.transcript || null,
        audio_url: audioUrl,
      };

      await saveLedgerReceipt(newEntry);
      sessionStorage.setItem("lastLedgerId", newEntry.id);

      router.push("/verdict");
    } catch (err: any) {
      alert("Upload failed: " + (err?.message || "Make sure the API server is running."));
      setUploading(false);
    }
  };

  // Bulk / Batch Upload Handler
  const handleBatchSelect = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    primeAudioContext();

    const fileList = Array.from(files);
    const initialItems: BatchItemProgress[] = fileList.map((f) => ({
      filename: f.name,
      status: "pending",
    }));

    setBatchItems(initialItems);
    setBatchCurrentIndex(0);
    setBatchProcessing(true);
    setBatchCompleted(false);
    setBatchTotalReward(0);
    setBatchTotalCost(0);
    setBatchAudioUrl(null);
    setBatchTranscript(null);
    setBatchModalOpen(true);

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
    const batchFormData = new FormData();
    fileList.forEach((f) => batchFormData.append("files", f));

    try {
      // Try batch endpoint on backend
      const batchRes = await fetch(`${apiUrl}/api/v1/batch-audit`, {
        method: "POST",
        body: batchFormData,
      });

      if (batchRes.ok) {
        const batchData = await batchRes.json();
        const results = batchData.results || [];
        const savedEntries: LedgerItem[] = [];

        let rewardAccumulator = 0;
        let costAccumulator = 0;

        const updatedProgress: BatchItemProgress[] = results.map((r: any, idx: number) => {
          const evalData = r.evaluation || {};
          const finData = r.financials || {};
          const isOk = r.status === "success" && evalData.is_original_receipt !== false;

          const reward = r.reward || 0;
          const cost = finData.total_production_cost || evalData.total_amount_idr || 0;
          if (isOk) {
            rewardAccumulator += reward;
            costAccumulator += cost;
          }

          const entry: LedgerItem = {
            id: crypto.randomUUID(),
            user_id: user?.id || null,
            merchant_name: evalData.merchant_name || `Corn Supplier #${idx + 1}`,
            primary_category: evalData.primary_receipt_category || "Corn Input",
            quality_score: evalData.image_quality_score ?? 8,
            reward_earned: reward,
            total_production_cost: cost,
            hpp_per_kg: finData.hpp_per_kg || 0,
            fraud_detected: !isOk,
            created_at: new Date().toISOString(),
            voice_transcript: batchData.voice_brief?.transcript || null,
            audio_url: batchData.voice_brief?.audio_url ? `${apiUrl}${batchData.voice_brief.audio_url}` : null,
          };
          savedEntries.push(entry);

          return {
            filename: r.filename,
            status: isOk ? "done" : "error",
            merchant: evalData.merchant_name || "Farm Supplier",
            category: evalData.primary_receipt_category || "Corn Input",
            amount: cost,
            reward: reward,
            errorMsg: !isOk ? (evalData.fraud_flags?.[0] || "Invalid receipt") : undefined,
          };
        });

        await saveLedgerReceiptsBatch(savedEntries);
        await fetchLedger();

        setBatchItems(updatedProgress);
        setBatchTotalReward(batchData.total_reward || rewardAccumulator);
        setBatchTotalCost(batchData.total_production_cost || costAccumulator);
        if (batchData.voice_brief?.audio_url) {
          setBatchAudioUrl(`${apiUrl}${batchData.voice_brief.audio_url}`);
        }
        if (batchData.voice_brief?.transcript) {
          setBatchTranscript(batchData.voice_brief.transcript);
        }
        setBatchCompleted(true);
        setBatchProcessing(false);
      } else {
        throw new Error(`Batch API error ${batchRes.status}`);
      }
    } catch (batchErr) {
      // Fallback: Sequential single uploads
      console.warn("Batch endpoint fallback to sequential:", batchErr);
      const newSavedEntries: LedgerItem[] = [];
      let rewardAccumulator = 0;
      let costAccumulator = 0;

      for (let i = 0; i < fileList.length; i++) {
        setBatchCurrentIndex(i);
        setBatchItems((prev) =>
          prev.map((item, idx) => (idx === i ? { ...item, status: "processing" } : item))
        );

        try {
          const singleForm = new FormData();
          singleForm.append("file", fileList[i]);
          const singleRes = await fetch(`${apiUrl}/audit`, {
            method: "POST",
            body: singleForm,
          });
          const singleData = await singleRes.json();
          const rec = singleData.transaction_record || singleData.evaluation || {};
          const fin = singleData.financials || {};
          const isOk = rec.is_original_receipt !== false;

          const reward = singleData.reward || 0;
          const cost = fin.total_production_cost || rec.total_amount_idr || 0;
          if (isOk) {
            rewardAccumulator += reward;
            costAccumulator += cost;
          }

          const entry: LedgerItem = {
            id: crypto.randomUUID(),
            user_id: user?.id || null,
            merchant_name: rec.merchant_name || "Corn Supplier",
            primary_category: rec.primary_receipt_category || "Corn Input",
            quality_score: rec.image_quality_score ?? 8,
            reward_earned: reward,
            total_production_cost: cost,
            hpp_per_kg: fin.hpp_per_kg || 0,
            fraud_detected: !isOk,
            created_at: new Date().toISOString(),
          };
          newSavedEntries.push(entry);

          setBatchItems((prev) =>
            prev.map((item, idx) =>
              idx === i
                ? {
                    ...item,
                    status: isOk ? "done" : "error",
                    merchant: rec.merchant_name || "Supplier",
                    category: rec.primary_receipt_category || "Input",
                    amount: cost,
                    reward: reward,
                  }
                : item
            )
          );
        } catch (e: any) {
          setBatchItems((prev) =>
            prev.map((item, idx) =>
              idx === i ? { ...item, status: "error", errorMsg: e.message } : item
            )
          );
        }
      }

      await saveLedgerReceiptsBatch(newSavedEntries);
      await fetchLedger();
      setBatchTotalReward(rewardAccumulator);
      setBatchTotalCost(costAccumulator);
      setBatchCompleted(true);
      setBatchProcessing(false);
    }
  };

  const handleListenSummary = () => {
    const latestAudio = ledger.find((r) => r.audio_url)?.audio_url;
    if (!latestAudio) {
      alert("No audio brief available yet. Upload a corn receipt first.");
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
    audio.play().catch(() => alert("Could not play audio. Check that the API server is reachable."));
    audio.onended = () => { audioRef.current = null; setIsPlayingAudio(false); };
    audioRef.current = audio;
    setIsPlayingAudio(true);
  };

  const handleSignOut = async () => {
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
    await signOut();
    router.push("/");
  };

  const hpp = lastHpp ?? 4200;
  const isAboveMarket = DEMO_MARKET_PRICE > hpp;
  const hppValues = ledger.filter((r) => r.hpp_per_kg > 0).map((r) => r.hpp_per_kg).reverse();
  const latestTranscript = ledger.find((r) => r.voice_transcript)?.voice_transcript;
  const latestAudioAvailable = ledger.some((r) => r.audio_url);

  return (
    <div className="min-h-screen bg-slate-50 max-w-md mx-auto pb-48 font-sans relative">
      {/* Header */}
      <header className="bg-gradient-to-br from-emerald-900 via-emerald-800 to-teal-800 px-5 pt-12 pb-5 relative overflow-hidden">
        <div className="absolute -top-8 -right-8 w-36 h-36 bg-white/5 rounded-full blur-2xl pointer-events-none" />
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-10 h-10 bg-white/15 rounded-xl flex items-center justify-center text-xl">
              🌽
            </div>
            <div>
              <h1 className="text-white font-extrabold text-base leading-none">TaniJaga</h1>
              <p className="text-emerald-300/70 text-[10px] font-medium">Corn AI Financial Engine</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <div className="text-right mr-1">
              <p className="text-emerald-200/60 text-[9px] font-medium leading-none">Signed in as</p>
              <p className="text-emerald-100 text-[11px] font-bold truncate max-w-[120px]">{user?.email || "Corn Farmer"}</p>
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
          <div className="flex items-center justify-between">
            <p className="text-emerald-100/80 text-xs font-bold uppercase tracking-widest">Corn Break-even HPP</p>
            <span className="text-[10px] font-extrabold bg-white/20 px-2 py-0.5 rounded-full">Dried Corn</span>
          </div>
          <p className="text-4xl font-black mt-1.5 mb-0.5">Rp {hpp.toLocaleString("en-US")}</p>
          <p className="text-emerald-200/70 text-[11px] font-semibold">/ kg dry kernel harvest</p>
          <div className="mt-4 bg-amber-400/20 border border-amber-300/30 rounded-2xl px-4 py-3">
            <p className="text-amber-100 text-xs font-bold leading-snug">
              ⚠️ Selling above Rp {hpp.toLocaleString()} guarantees a profit. Government benchmark is Rp 5,500/kg.
            </p>
          </div>
        </div>

        {/* Listen Summary by ElevenLabs */}
        <div className="bg-purple-50/90 rounded-3xl p-4 border border-purple-200/80 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="text-base">🎙️</span>
              <div>
                <h3 className="text-purple-950 font-extrabold text-xs">AI Voice Brief</h3>
                <p className="text-purple-600/80 text-[10px] font-semibold">Spoken English summary by ElevenLabs AI</p>
              </div>
            </div>
            <span className="text-[9px] bg-purple-200/80 text-purple-800 font-extrabold px-2 py-0.5 rounded-full">
              Voice AI
            </span>
          </div>

          {latestTranscript && (
            <div className="bg-white/80 rounded-2xl px-3.5 py-2.5 border border-purple-100/80 shadow-xs">
              <p className="text-[11px] text-purple-900 italic leading-relaxed line-clamp-2">
                &ldquo;{latestTranscript}&rdquo;
              </p>
            </div>
          )}

          <button
            onClick={handleListenSummary}
            className={`w-full rounded-2xl px-4 py-3 flex items-center justify-center space-x-2.5 active:scale-[0.99] transition-all shadow-sm ${
              isPlayingAudio
                ? "bg-purple-700 text-white border border-purple-600 shadow-purple-700/20"
                : "bg-gradient-to-r from-purple-700 to-indigo-700 text-white hover:opacity-95 shadow-purple-700/20"
            }`}
          >
            <div className="w-7 h-7 rounded-xl flex items-center justify-center bg-white/20">
              {isPlayingAudio ? <StopCircle size={15} className="text-white" /> : <Volume2 size={15} className="text-white" />}
            </div>
            <span className="font-extrabold text-xs tracking-wide">
              {isPlayingAudio ? "Stop Audio Brief" : latestAudioAvailable ? "Listen to Corn Audio Brief" : "Listen to Sample Brief"}
            </span>
          </button>
        </div>

        {/* Cost of Production vs. Market Benchmark Chart */}
        <div className="bg-white rounded-3xl p-4 shadow-xs border border-slate-100">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="font-extrabold text-slate-800 text-sm">Corn HPP vs. Market Price</h3>
              <p className="text-[10px] text-slate-500 font-medium">
                Production cost history vs. national corn price benchmark
              </p>
            </div>
            <span className="text-[10px] font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">Rp / kg</span>
          </div>
          <HppConfidenceChart values={hppValues} marketPrice={DEMO_MARKET_PRICE} />
        </div>

        {/* Market Price Today */}
        <div className="bg-white rounded-3xl p-4 shadow-xs border border-slate-100">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-extrabold text-slate-800 text-sm">Market Price Today ({MARKET_CROP})</h3>
            <span className="text-[10px] text-slate-400 font-medium">Bapanas Benchmark</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center text-xl">🌽</div>
              <div>
                <p className="text-[10px] text-slate-500 font-semibold">Harvest Margin</p>
                <span className={"text-xs font-extrabold px-2.5 py-0.5 rounded-full " + (isAboveMarket ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-700")}>
                  {isAboveMarket ? "▲ PROFITABLE" : "▼ BELOW HPP"}
                </span>
              </div>
            </div>
            <div className="text-right">
              <p className="text-2xl font-black text-slate-900">Rp {DEMO_MARKET_PRICE.toLocaleString("en-US")}</p>
              <p className="text-[10px] text-slate-500 font-medium">/ kg dry kernel</p>
              <div className="flex items-center justify-end space-x-1 mt-0.5">
                {isAboveMarket ? <TrendingUp size={12} className="text-emerald-600" /> : <TrendingDown size={12} className="text-red-500" />}
                <span className={"text-[10px] font-bold " + (isAboveMarket ? "text-emerald-600" : "text-red-500")}>
                  {isAboveMarket ? `+Rp ${(DEMO_MARKET_PRICE - hpp).toLocaleString()} profit margin` : "Below your HPP"}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Upload Stats Row */}
        <div className="bg-white rounded-3xl px-4 py-3.5 shadow-xs border border-slate-100 flex items-center justify-between">
          <div>
            <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">Verified Corn Records</p>
            <div className="flex items-center space-x-2 mt-0.5">
              <span className="font-black text-emerald-700 text-base">Rp {walletBalance.toLocaleString("en-US")}</span>
              <span className="text-slate-300">|</span>
              <span className="text-slate-600 text-xs font-semibold">{ledger.length} receipts</span>
            </div>
          </div>
          <button onClick={() => router.push("/receipts")} className="flex items-center space-x-1 text-emerald-700 text-xs font-bold hover:text-emerald-800 transition-colors">
            <span>View ledger</span>
            <ChevronRight size={14} />
          </button>
        </div>
      </main>

      {/* Floating Sticky Upload Actions */}
      <div className="fixed bottom-16 left-1/2 -translate-x-1/2 w-full max-w-md px-4 z-40 space-y-2">
        {/* Primary Instant Photo Button */}
        <label className={"w-full flex items-center justify-center space-x-2.5 py-3.5 rounded-2xl font-extrabold text-sm shadow-xl cursor-pointer active:scale-[0.98] transition-all " + (uploading ? "bg-slate-400 cursor-not-allowed" : "bg-slate-900 hover:bg-slate-800 shadow-slate-900/30")}>
          {uploading ? (
            <><span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /><span className="text-white">Auditing Receipt...</span></>
          ) : (
            <><Camera size={18} className="text-white" /><span className="text-white">📷 SNAP CORN RECEIPT</span></>
          )}
          <input type="file" accept="image/*" capture="environment" className="hidden" disabled={uploading}
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileSelect(f); e.target.value = ""; }} />
        </label>

        {/* Secondary Dual Action Row: Gallery + Bulk Upload */}
        {!uploading && (
          <div className="grid grid-cols-2 gap-2">
            <label className="flex items-center justify-center space-x-1.5 py-2.5 rounded-xl text-slate-600 text-xs font-bold cursor-pointer hover:text-emerald-700 transition-colors bg-white/95 backdrop-blur-xs border border-slate-200/80 shadow-xs">
              <ImageIcon size={14} className="text-slate-500" />
              <span>Gallery Photo</span>
              <input type="file" accept="image/*" className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileSelect(f); e.target.value = ""; }} />
            </label>

            <label className="flex items-center justify-center space-x-1.5 py-2.5 rounded-xl text-emerald-800 text-xs font-bold cursor-pointer hover:text-emerald-900 transition-colors bg-emerald-50 border border-emerald-200 shadow-xs">
              <Layers size={14} className="text-emerald-700" />
              <span>Bulk Upload Batch</span>
              <input type="file" accept="image/*" multiple className="hidden"
                onChange={(e) => { handleBatchSelect(e.target.files); e.target.value = ""; }} />
            </label>
          </div>
        )}
      </div>

      {/* Interactive Batch Processing Modal */}
      {batchModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-sm w-full p-5 space-y-4 shadow-2xl animate-scale-up max-h-[85vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-emerald-100 rounded-xl flex items-center justify-center text-sm">
                  🌽
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-sm">Bulk Corn Audit</h3>
                  <p className="text-[10px] text-slate-500 font-medium">
                    {batchProcessing ? "Analyzing receipt queue with Gemini AI..." : "Batch processing complete"}
                  </p>
                </div>
              </div>
              {!batchProcessing && (
                <button onClick={() => setBatchModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                  <X size={18} />
                </button>
              )}
            </div>

            {/* Summary Metrics Banner */}
            <div className="grid grid-cols-2 gap-2 bg-slate-50 rounded-2xl p-3 border border-slate-100">
              <div>
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Total Incentive</p>
                <p className="text-base font-black text-emerald-700 mt-0.5">
                  +Rp {batchTotalReward.toLocaleString("en-US")}
                </p>
              </div>
              <div className="text-right">
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Total Added Cost</p>
                <p className="text-base font-black text-slate-900 mt-0.5">
                  Rp {batchTotalCost.toLocaleString("en-US")}
                </p>
              </div>
            </div>

            {/* Item-by-item Progress Queue */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1 min-h-[160px]">
              {batchItems.map((item, idx) => (
                <div
                  key={idx}
                  className="bg-slate-50 rounded-xl p-3 border border-slate-100 flex items-center justify-between text-xs transition-all"
                >
                  <div className="flex items-center space-x-2.5 min-w-0">
                    <div className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0">
                      {item.status === "processing" ? (
                        <Loader2 size={16} className="text-emerald-600 animate-spin" />
                      ) : item.status === "done" ? (
                        <CheckCircle2 size={16} className="text-emerald-600" />
                      ) : item.status === "error" ? (
                        <AlertTriangle size={16} className="text-red-500" />
                      ) : (
                        <span className="w-2.5 h-2.5 rounded-full bg-slate-300" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-slate-800 truncate text-[11px]">{item.merchant || item.filename}</p>
                      <p className="text-[9px] text-slate-400 font-medium">
                        {item.status === "processing"
                          ? "AI Auditing..."
                          : item.category || item.filename}
                      </p>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    {item.amount !== undefined && (
                      <p className="font-extrabold text-slate-900 text-[11px]">Rp {item.amount.toLocaleString()}</p>
                    )}
                    {item.reward !== undefined && item.reward > 0 && (
                      <p className="text-[9px] font-bold text-emerald-600">+Rp {item.reward.toLocaleString()}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Batch Voice Brief if present */}
            {batchAudioUrl && (
              <div className="bg-purple-50 rounded-2xl p-3 border border-purple-100 space-y-1.5">
                <div className="flex items-center space-x-1.5 text-purple-900 text-[11px] font-extrabold">
                  <Volume2 size={14} className="text-purple-700" />
                  <span>Batch Voice Summary Available</span>
                </div>
                {batchTranscript && (
                  <p className="text-[10px] text-purple-900 italic line-clamp-2">&ldquo;{batchTranscript}&rdquo;</p>
                )}
                <audio controls src={batchAudioUrl} className="w-full h-7 rounded-lg accent-purple-600" />
              </div>
            )}

            {/* Footer Buttons */}
            {batchCompleted ? (
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <button
                  onClick={() => {
                    setBatchModalOpen(false);
                    router.push("/receipts");
                  }}
                  className="w-full bg-emerald-700 hover:bg-emerald-800 text-white py-3 rounded-2xl font-extrabold text-xs flex items-center justify-center space-x-1.5 transition-colors shadow-md shadow-emerald-700/20"
                >
                  <span>View All in Receipts Ledger</span>
                  <ArrowRight size={14} />
                </button>
                <button
                  onClick={() => setBatchModalOpen(false)}
                  className="w-full bg-slate-100 text-slate-600 py-2.5 rounded-2xl font-bold text-xs hover:bg-slate-200"
                >
                  Done
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-center space-x-2 py-3 text-slate-500 text-xs font-semibold">
                <Loader2 size={16} className="text-emerald-600 animate-spin" />
                <span>Processing corn receipts batch...</span>
              </div>
            )}
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  );
}

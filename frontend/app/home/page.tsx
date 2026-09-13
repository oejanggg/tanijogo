"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useProtected } from "../lib/use-protected";
import { useAuth } from "../lib/auth-context";
import {
  Wallet, Camera, Image as ImageIcon, Volume2, TrendingUp,
  TrendingDown, ChevronRight, LogOut, StopCircle,
  Layers, CheckCircle2, AlertTriangle,
  X, ArrowRight, Loader2, Calendar
} from "lucide-react";
import BottomNav from "../components/BottomNav";
import {
  fetchAllReceipts,
  saveLedgerReceipt,
  saveLedgerReceiptsBatch,
  LedgerItem
} from "../lib/ledger-storage";

export type CommodityType = "corn" | "chili" | "rice";

interface CommodityMonthData {
  month: string;
  monthShort: string;
  marketPrice: number;
  hpp: number;
}

interface CommodityInfo {
  id: CommodityType;
  name: string;
  shortName: string;
  icon: string;
  unit: string;
  marketPrice: number;
  benchmarkAgency: string;
  defaultHpp: number;
  history3Months: CommodityMonthData[];
  guideText: string;
}

const COMMODITIES: Record<CommodityType, CommodityInfo> = {
  corn: {
    id: "corn",
    name: "Dried Corn (Jagung Pipil)",
    shortName: "Corn",
    icon: "🌽",
    unit: "kg dry kernel",
    marketPrice: 5500,
    benchmarkAgency: "Bapenas Benchmark",
    defaultHpp: 4200,
    history3Months: [
      { month: "July 2026", monthShort: "Jul", marketPrice: 5200, hpp: 4100 },
      { month: "August 2026", monthShort: "Aug", marketPrice: 5350, hpp: 4250 },
      { month: "September 2026", monthShort: "Sep", marketPrice: 5500, hpp: 4200 },
    ],
    guideText: "When production cost stays below Rp 5,500/kg, you secure a healthy harvest profit.",
  },
  chili: {
    id: "chili",
    name: "Red Chili (Cabai Merah)",
    shortName: "Chili",
    icon: "🌶️",
    unit: "kg fresh chili",
    marketPrice: 32000,
    benchmarkAgency: "PIHPS Benchmark",
    defaultHpp: 23200,
    history3Months: [
      { month: "July 2026", monthShort: "Jul", marketPrice: 28000, hpp: 22000 },
      { month: "August 2026", monthShort: "Aug", marketPrice: 35000, hpp: 24500 },
      { month: "September 2026", monthShort: "Sep", marketPrice: 32000, hpp: 23200 },
    ],
    guideText: "Chili prices fluctuate rapidly. Keeping BEP under Rp 28,000 shields against sudden dips.",
  },
  rice: {
    id: "rice",
    name: "Milled Grain (Padi / Gabah)",
    shortName: "Rice",
    icon: "🌾",
    unit: "kg dry grain (GKG)",
    marketPrice: 7200,
    benchmarkAgency: "BEP Bapenas GKG",
    defaultHpp: 5250,
    history3Months: [
      { month: "July 2026", monthShort: "Jul", marketPrice: 6800, hpp: 5100 },
      { month: "August 2026", monthShort: "Aug", marketPrice: 7000, hpp: 5300 },
      { month: "September 2026", monthShort: "Sep", marketPrice: 7200, hpp: 5250 },
    ],
    guideText: "Government GKG benchmark guarantees Rp 7,200/kg. Track fertilizer & labor to secure returns.",
  },
};

// 3-Month Historical Price & Cost Trend Chart
function ThreeMonthPriceChart({
  commodity,
  currentHpp,
}: {
  commodity: CommodityInfo;
  currentHpp: number;
}) {
  // Replace current month HPP with user's actual HPP if calculated
  const chartData = commodity.history3Months.map((m, idx) => {
    if (idx === 2 && currentHpp > 0) {
      return { ...m, hpp: currentHpp };
    }
    return m;
  });

  const allPrices = chartData.flatMap((d) => [d.marketPrice, d.hpp]);
  const maxVal = Math.max(...allPrices) * 1.18;

  const currentMonthData = chartData[2];
  const currentMargin = currentMonthData.marketPrice - currentMonthData.hpp;
  const isProfitable = currentMargin >= 0;

  return (
    <div className="space-y-3.5">
      {/* Current Month Callout Badge */}
      <div className="flex items-center justify-between bg-slate-50/90 rounded-2xl p-3 border border-slate-100">
        <div>
          <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
            {currentMonthData.month} Status
          </span>
          <p className="text-sm font-black text-slate-900 mt-0.5">
            Rp {currentMonthData.marketPrice.toLocaleString("en-US")}{" "}
            <span className="text-[11px] font-medium text-slate-400">/ {commodity.unit}</span>
          </p>
        </div>
        <div className="text-right">
          <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
            Net Profit Margin
          </span>
          <p
            className={`text-sm font-black mt-0.5 ${
              isProfitable ? "text-emerald-600" : "text-rose-500"
            }`}
          >
            {isProfitable ? `+Rp ${currentMargin.toLocaleString("en-US")}` : `-Rp ${Math.abs(currentMargin).toLocaleString("en-US")}`}
          </p>
        </div>
      </div>

      {/* 3 Months Paired Bar Chart */}
      <div className="relative pt-2 pb-1">
        <div className="grid grid-cols-3 gap-3">
          {chartData.map((d, i) => {
            const isCurrent = i === 2;
            const marketHeight = Math.max(16, (d.marketPrice / maxVal) * 100);
            const hppHeight = Math.max(16, (d.hpp / maxVal) * 100);
            const margin = d.marketPrice - d.hpp;
            const prof = margin >= 0;

            return (
              <div
                key={d.monthShort}
                className={`flex flex-col items-center p-2 rounded-2xl border transition-all ${
                  isCurrent
                    ? "bg-emerald-50/50 border-emerald-300/80 shadow-xs"
                    : "bg-slate-50/60 border-slate-100"
                }`}
              >
                {/* Month Name */}
                <div className="flex items-center space-x-1 mb-2">
                  <Calendar size={11} className={isCurrent ? "text-emerald-700" : "text-slate-400"} />
                  <span
                    className={`text-[11px] font-extrabold ${
                      isCurrent ? "text-emerald-900" : "text-slate-600"
                    }`}
                  >
                    {d.monthShort}
                  </span>
                  {isCurrent && (
                    <span className="bg-emerald-600 text-white text-[8px] font-black px-1 rounded uppercase">
                      Now
                    </span>
                  )}
                </div>

                {/* Bars Area */}
                <div className="w-full flex items-end justify-center space-x-2 h-28 px-1 pb-1">
                  {/* Market Price Bar */}
                  <div className="flex-1 flex flex-col items-center group relative cursor-pointer h-full justify-end">
                    <div className="absolute -top-7 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900 text-white text-[9px] font-bold py-0.5 px-1 rounded whitespace-nowrap z-20 pointer-events-none shadow-md">
                      Market: Rp {d.marketPrice.toLocaleString()}
                    </div>
                    <div
                      className="w-full rounded-t-md bg-gradient-to-t from-amber-500 to-amber-400 transition-all duration-500"
                      style={{ height: `${marketHeight}%` }}
                    />
                    <span className="text-[8px] font-bold text-amber-700 mt-1">Mkt</span>
                  </div>

                  {/* Farmer BEP Bar */}
                  <div className="flex-1 flex flex-col items-center group relative cursor-pointer h-full justify-end">
                    <div className="absolute -top-7 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900 text-white text-[9px] font-bold py-0.5 px-1 rounded whitespace-nowrap z-20 pointer-events-none shadow-md">
                      BEP: Rp {d.hpp.toLocaleString()}
                    </div>
                    <div
                      className={`w-full rounded-t-md transition-all duration-500 ${
                        prof
                          ? "bg-gradient-to-t from-emerald-600 to-emerald-400"
                          : "bg-gradient-to-t from-rose-500 to-rose-400"
                      }`}
                      style={{ height: `${hppHeight}%` }}
                    />
                    <span className={`text-[8px] font-bold mt-1 ${prof ? "text-emerald-700" : "text-rose-600"}`}>
                      BEP
                    </span>
                  </div>
                </div>

                {/* Margin Value Tag */}
                <div className="w-full text-center mt-1 pt-1 border-t border-slate-200/60">
                  <span
                    className={`text-[9px] font-black ${
                      prof ? "text-emerald-700" : "text-rose-600"
                    }`}
                  >
                    {prof ? `+Rp ${margin.toLocaleString()}` : `-Rp ${Math.abs(margin).toLocaleString()}`}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Legend & Guide */}
      <div className="bg-slate-50/80 rounded-xl p-2.5 border border-slate-100 flex items-center justify-between text-[10px]">
        <div className="flex items-center space-x-1.5">
          <span className="w-2.5 h-2.5 bg-amber-400 rounded-xs" />
          <span className="font-semibold text-slate-700">Market Price</span>
        </div>
        <div className="flex items-center space-x-1.5">
          <span className="w-2.5 h-2.5 bg-emerald-500 rounded-xs" />
          <span className="font-semibold text-slate-700">Farm Cost (BEP)</span>
        </div>
        <div className="flex items-center space-x-1.5">
          <span className="w-2.5 h-2.5 bg-rose-400 rounded-xs" />
          <span className="font-semibold text-slate-700">Deficit</span>
        </div>
      </div>

      <p className="text-[10px] text-slate-400 leading-relaxed font-medium">
        {commodity.icon} <strong className="text-slate-600">3-Month Farmer Insight:</strong> {commodity.guideText}
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
  const [selectedCommodity, setSelectedCommodity] = useState<CommodityType>("corn");
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

  const activeCommodity = COMMODITIES[selectedCommodity];

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
    setUploading(true);
    primeAudioContext();

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("commodity", selectedCommodity);

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const res = await fetch(`${apiUrl}/audit`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        throw new Error(`Server returned ${res.status}`);
      }

      const data = await res.json();
      const rec = data.transaction_record || data.evaluation || {};
      const fin = data.financials || {};
      const isOriginal = rec.is_original_receipt !== false;

      const newLedgerItem: LedgerItem = {
        id: crypto.randomUUID(),
        user_id: user?.id || null,
        merchant_name: rec.merchant_name || "Farm Supplier",
        primary_category: rec.primary_receipt_category || `${activeCommodity.shortName} Input`,
        quality_score: rec.image_quality_score ?? 8,
        reward_earned: data.reward || 0,
        total_production_cost: fin.total_production_cost || rec.total_amount_idr || 0,
        hpp_per_kg: fin.hpp_per_kg || activeCommodity.defaultHpp,
        fraud_detected: !isOriginal,
        created_at: new Date().toISOString(),
        voice_transcript: data.voice_brief?.transcript || null,
        audio_url: data.voice_brief?.audio_url ? `${apiUrl}${data.voice_brief.audio_url}` : null,
      };

      await saveLedgerReceipt(newLedgerItem);
      await fetchLedger();

      if (fin.hpp_per_kg) {
        setLastHpp(fin.hpp_per_kg);
        localStorage.setItem("lastHpp", String(fin.hpp_per_kg));
      }

      if (data.voice_brief?.audio_url) {
        const fullAudioUrl = `${apiUrl}${data.voice_brief.audio_url}`;
        if (audioRef.current) {
          audioRef.current.pause();
          audioRef.current = null;
        }
        const audio = new Audio(fullAudioUrl);
        audio.play().catch(() => {});
        audio.onended = () => { audioRef.current = null; setIsPlayingAudio(false); };
        audioRef.current = audio;
        setIsPlayingAudio(true);
      }

      router.push("/receipts");
    } catch (err: any) {
      alert(`Could not process receipt: ${err.message || "Network error"}`);
    } finally {
      setUploading(false);
    }
  };

  // Bulk / Multiple files upload handler
  const handleBatchSelect = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const fileList = Array.from(files);
    primeAudioContext();

    setBatchItems(
      fileList.map((f) => ({
        filename: f.name,
        status: "pending",
      }))
    );
    setBatchCurrentIndex(0);
    setBatchTotalReward(0);
    setBatchTotalCost(0);
    setBatchCompleted(false);
    setBatchProcessing(true);
    setBatchAudioUrl(null);
    setBatchTranscript(null);
    setBatchModalOpen(true);

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

    try {
      const batchFormData = new FormData();
      fileList.forEach((f) => batchFormData.append("files", f));
      batchFormData.append("commodity", selectedCommodity);

      const batchRes = await fetch(`${apiUrl}/audit-batch`, {
        method: "POST",
        body: batchFormData,
      });

      if (batchRes.ok) {
        const batchData = await batchRes.json();
        const savedEntries: LedgerItem[] = [];
        let rewardAccumulator = 0;
        let costAccumulator = 0;

        const updatedProgress: BatchItemProgress[] = batchData.receipts.map((r: any, idx: number) => {
          const evalData = r.evaluation || {};
          const finData = r.financials || {};
          const isOk = r.status === "verified";

          const reward = r.reward || 0;
          const cost = finData.total_production_cost || evalData.total_amount_idr || 0;
          if (isOk) {
            rewardAccumulator += reward;
            costAccumulator += cost;
          }

          const entry: LedgerItem = {
            id: crypto.randomUUID(),
            user_id: user?.id || null,
            merchant_name: evalData.merchant_name || `Supplier #${idx + 1}`,
            primary_category: evalData.primary_receipt_category || `${activeCommodity.shortName} Input`,
            quality_score: evalData.image_quality_score ?? 8,
            reward_earned: reward,
            total_production_cost: cost,
            hpp_per_kg: finData.hpp_per_kg || activeCommodity.defaultHpp,
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
            category: evalData.primary_receipt_category || `${activeCommodity.shortName} Input`,
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
        throw new Error(`Batch API status ${batchRes.status}`);
      }
    } catch (batchErr) {
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
          singleForm.append("commodity", selectedCommodity);
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
            merchant_name: rec.merchant_name || "Farm Supplier",
            primary_category: rec.primary_receipt_category || `${activeCommodity.shortName} Input`,
            quality_score: rec.image_quality_score ?? 8,
            reward_earned: reward,
            total_production_cost: cost,
            hpp_per_kg: fin.hpp_per_kg || activeCommodity.defaultHpp,
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

  const hpp = lastHpp ?? activeCommodity.defaultHpp;
  const isAboveMarket = activeCommodity.marketPrice > hpp;
  const latestTranscript = ledger.find((r) => r.voice_transcript)?.voice_transcript;
  const latestAudioAvailable = ledger.some((r) => r.audio_url);

  return (
    <div className="min-h-dvh bg-slate-50 max-w-md mx-auto pb-[calc(11.5rem+env(safe-area-inset-bottom,0px))] font-sans relative">
      {/* Header - Styled with safe area awareness for iPhone Dynamic Island / Notch */}
      <header className="bg-gradient-to-br from-emerald-900 via-emerald-800 to-teal-800 px-4 sm:px-5 pt-[max(2.5rem,calc(env(safe-area-inset-top)+0.75rem))] pb-5 relative overflow-hidden">
        <div className="absolute -top-8 -right-8 w-36 h-36 bg-white/5 rounded-full blur-2xl pointer-events-none" />
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-10 h-10 bg-white/15 rounded-xl flex items-center justify-center text-xl shrink-0">
              {activeCommodity.icon}
            </div>
            <div className="min-w-0">
              <h1 className="text-white font-extrabold text-base leading-none truncate">TaniJaga</h1>
              <p className="text-emerald-300/70 text-[10px] font-medium mt-0.5 truncate">
                Farmer&apos;s Cost Ledger
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2 shrink-0">
            <div className="text-right mr-1 hidden sm:block">
              <p className="text-emerald-200/60 text-[9px] font-medium leading-none">Signed in as</p>
              <p className="text-emerald-100 text-[11px] font-bold truncate max-w-[120px]">
                {user?.email || "Farmer"}
              </p>
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

        {/* Wallet Balance Card */}
        <div className="mt-4 bg-white/10 backdrop-blur-md rounded-2xl p-3.5 border border-white/15 flex items-center justify-between">
          <div>
            <p className="text-emerald-200/70 text-[10px] font-bold uppercase tracking-wider">
              Total Incentive Earned
            </p>
            <p className="text-white font-black text-xl mt-0.5">
              Rp {walletBalance.toLocaleString("en-US")}
            </p>
          </div>
          <div className="bg-gradient-to-br from-emerald-500 to-teal-500 p-2.5 rounded-xl shadow-lg">
            <Wallet size={20} className="text-white" />
          </div>
        </div>
      </header>

      <main className="px-4 pt-3.5 space-y-3.5">
        {/* Commodity Selector Switcher */}
        <div className="bg-white rounded-2xl p-1.5 border border-slate-200/80 shadow-xs flex items-center space-x-1">
          {(["corn", "chili", "rice"] as CommodityType[]).map((cid) => {
            const item = COMMODITIES[cid];
            const active = selectedCommodity === cid;
            return (
              <button
                key={cid}
                onClick={() => setSelectedCommodity(cid)}
                className={`flex-1 flex items-center justify-center space-x-1.5 py-2 px-2 rounded-xl text-xs font-extrabold transition-all ${
                  active
                    ? "bg-emerald-800 text-white shadow-sm shadow-emerald-900/20"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/70"
                }`}
              >
                <span className="text-sm">{item.icon}</span>
                <span className="truncate">{item.shortName}</span>
              </button>
            );
          })}
        </div>

        {/* Break-even Point Card for selected commodity */}
        <div className="bg-gradient-to-br from-emerald-700 to-teal-700 rounded-3xl p-4 sm:p-5 text-white shadow-lg shadow-emerald-700/20 relative overflow-hidden">
          <div className="absolute -top-6 -right-6 w-32 h-32 bg-white/5 rounded-full blur-xl" />
          <div className="flex items-center justify-between">
            <p className="text-emerald-100/80 text-xs font-bold uppercase tracking-widest">
              {activeCommodity.shortName} Break Even Point
            </p>
            <span className="text-[10px] font-extrabold bg-white/20 px-2 py-0.5 rounded-full">
              {activeCommodity.icon} {activeCommodity.shortName}
            </span>
          </div>
          <p className="text-3xl sm:text-4xl font-black mt-1.5 mb-0.5">
            Rp {hpp.toLocaleString("en-US")}
          </p>
          <p className="text-emerald-200/70 text-[11px] font-semibold">
            / {activeCommodity.unit} harvest
          </p>
          <div className="mt-3.5 bg-amber-400/20 border border-amber-300/30 rounded-2xl px-3.5 py-2.5">
            <p className="text-amber-100 text-xs font-bold leading-snug">
              ⚠️ Selling above Rp {hpp.toLocaleString()} guarantees a profit. Market benchmark is Rp {activeCommodity.marketPrice.toLocaleString("en-US")}/{activeCommodity.unit.split(" ")[0]}.
            </p>
          </div>
        </div>

        {/* 3-Month Price & BEP Chart Card */}
        <div className="bg-white rounded-3xl p-4 shadow-xs border border-slate-100">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="font-extrabold text-slate-800 text-sm">
                3-Month Price &amp; Cost Trend
              </h3>
              <p className="text-[10px] text-slate-500 font-medium">
                {activeCommodity.name} benchmark vs. farm BEP
              </p>
            </div>
            <span className="text-[10px] font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
              Last 3 Mos
            </span>
          </div>
          <ThreeMonthPriceChart
            commodity={activeCommodity}
            currentHpp={hpp}
          />
        </div>

        {/* Market Price Today Widget */}
        <div className="bg-white rounded-3xl p-4 shadow-xs border border-slate-100">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-extrabold text-slate-800 text-sm truncate mr-2">
              Market Price Today ({activeCommodity.shortName})
            </h3>
            <span className="text-[10px] text-slate-400 font-medium shrink-0">
              {activeCommodity.benchmarkAgency}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center text-xl shrink-0">
                {activeCommodity.icon}
              </div>
              <div>
                <p className="text-[10px] text-slate-500 font-semibold">Harvest Margin</p>
                <span
                  className={
                    "text-xs font-extrabold px-2.5 py-0.5 rounded-full " +
                    (isAboveMarket ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-700")
                  }
                >
                  {isAboveMarket ? "▲ PROFITABLE" : "▼ BELOW BEP"}
                </span>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xl sm:text-2xl font-black text-slate-900">
                Rp {activeCommodity.marketPrice.toLocaleString("en-US")}
              </p>
              <p className="text-[10px] text-slate-500 font-medium">
                / {activeCommodity.unit}
              </p>
              <div className="flex items-center justify-end space-x-1 mt-0.5">
                {isAboveMarket ? (
                  <TrendingUp size={12} className="text-emerald-600" />
                ) : (
                  <TrendingDown size={12} className="text-red-500" />
                )}
                <span
                  className={
                    "text-[10px] font-bold " +
                    (isAboveMarket ? "text-emerald-600" : "text-red-500")
                  }
                >
                  {isAboveMarket
                    ? `+Rp ${(activeCommodity.marketPrice - hpp).toLocaleString()} profit margin`
                    : "Below your BEP"}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Listen Summary by ElevenLabs AI */}
        <div className="bg-purple-50/90 rounded-3xl p-4 border border-purple-200/80 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="text-base">🎙️</span>
              <div>
                <h3 className="text-purple-950 font-extrabold text-xs">AI Voice Brief</h3>
                <p className="text-purple-600/80 text-[10px] font-semibold">
                  Spoken farm brief by ElevenLabs AI
                </p>
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
              {isPlayingAudio ? (
                <StopCircle size={15} className="text-white" />
              ) : (
                <Volume2 size={15} className="text-white" />
              )}
            </div>
            <span className="font-extrabold text-xs tracking-wide">
              {isPlayingAudio
                ? "Stop Audio Brief"
                : latestAudioAvailable
                ? "Listen to Voice Brief"
                : "Listen to Sample Brief"}
            </span>
          </button>
        </div>

        {/* Ledger Link Card */}
        <div className="bg-white rounded-3xl px-4 py-3.5 shadow-xs border border-slate-100 flex items-center justify-between">
          <div>
            <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">
              Verified Farm Receipts
            </p>
            <div className="flex items-center space-x-2 mt-0.5">
              <span className="font-black text-emerald-700 text-base">
                Rp {walletBalance.toLocaleString("en-US")}
              </span>
              <span className="text-slate-300">|</span>
              <span className="text-slate-600 text-xs font-semibold">
                {ledger.length} receipts
              </span>
            </div>
          </div>
          <button
            onClick={() => router.push("/receipts")}
            className="flex items-center space-x-1 text-emerald-700 text-xs font-bold hover:text-emerald-800 transition-colors"
          >
            <span>View ledger</span>
            <ChevronRight size={14} />
          </button>
        </div>
      </main>

      {/* Floating Sticky Upload Actions Dock - Elevated & safe-area padded for iPhone */}
      <div className="fixed bottom-[calc(4.25rem+env(safe-area-inset-bottom,0px)+0.5rem)] left-1/2 -translate-x-1/2 w-full max-w-md px-4 z-40 pointer-events-none">
        <div className="pointer-events-auto space-y-2">
          {/* Primary Instant Photo Button (Generalised title) */}
          <label
            className={
              "w-full flex items-center justify-center space-x-2.5 py-3.5 rounded-2xl font-extrabold text-sm shadow-xl cursor-pointer active:scale-[0.98] transition-all " +
              (uploading
                ? "bg-slate-400 cursor-not-allowed text-white"
                : "bg-slate-900 hover:bg-slate-800 shadow-slate-900/30 text-white")
            }
          >
            {uploading ? (
              <>
                <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Auditing Receipt...</span>
              </>
            ) : (
              <>
                <Camera size={18} />
                <span>📷 SNAP RECEIPT</span>
              </>
            )}
            <input
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

          {/* Secondary Dual Action Row: Gallery + Bulk Upload */}
          {!uploading && (
            <div className="grid grid-cols-2 gap-2">
              <label className="flex items-center justify-center space-x-1.5 py-2.5 rounded-xl text-slate-700 text-xs font-bold cursor-pointer hover:text-emerald-700 transition-colors bg-white/95 backdrop-blur-md border border-slate-200/90 shadow-sm">
                <ImageIcon size={14} className="text-slate-500" />
                <span>Gallery Photo</span>
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

              <label className="flex items-center justify-center space-x-1.5 py-2.5 rounded-xl text-emerald-900 text-xs font-bold cursor-pointer hover:text-emerald-950 transition-colors bg-emerald-50/95 backdrop-blur-md border border-emerald-300 shadow-sm">
                <Layers size={14} className="text-emerald-700" />
                <span>Bulk Upload Batch</span>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    handleBatchSelect(e.target.files);
                    e.target.value = "";
                  }}
                />
              </label>
            </div>
          )}
        </div>
      </div>

      {/* Interactive Batch Processing Modal */}
      {batchModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-3xl w-[calc(100vw-2rem)] max-w-sm p-5 space-y-4 shadow-2xl animate-scale-up max-h-[85vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-emerald-100 rounded-xl flex items-center justify-center text-sm">
                  {activeCommodity.icon}
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-sm">Bulk Receipt Audit</h3>
                  <p className="text-[10px] text-slate-500 font-medium">
                    {batchProcessing
                      ? "Analyzing receipt queue with Gemini AI..."
                      : "Batch processing complete"}
                  </p>
                </div>
              </div>
              {!batchProcessing && (
                <button
                  onClick={() => setBatchModalOpen(false)}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <X size={18} />
                </button>
              )}
            </div>

            {/* Summary Metrics Banner */}
            <div className="grid grid-cols-2 gap-2 bg-slate-50 rounded-2xl p-3 border border-slate-100">
              <div>
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                  Total Incentive
                </p>
                <p className="text-base font-black text-emerald-700 mt-0.5">
                  +Rp {batchTotalReward.toLocaleString("en-US")}
                </p>
              </div>
              <div className="text-right">
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                  Total Added Cost
                </p>
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
                      <p className="font-bold text-slate-800 truncate text-[11px]">
                        {item.merchant || item.filename}
                      </p>
                      <p className="text-[9px] text-slate-400 font-medium">
                        {item.status === "processing"
                          ? "AI Auditing..."
                          : item.category || item.filename}
                      </p>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    {item.amount !== undefined && (
                      <p className="font-extrabold text-slate-900 text-[11px]">
                        Rp {item.amount.toLocaleString()}
                      </p>
                    )}
                    {item.reward !== undefined && item.reward > 0 && (
                      <p className="text-[9px] font-bold text-emerald-600">
                        +Rp {item.reward.toLocaleString()}
                      </p>
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
                  <p className="text-[10px] text-purple-900 italic line-clamp-2">
                    &ldquo;{batchTranscript}&rdquo;
                  </p>
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
                <span>Processing receipts batch...</span>
              </div>
            )}
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  );
}

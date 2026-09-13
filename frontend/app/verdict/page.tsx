"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2, AlertTriangle, XCircle, Volume2,
  ChevronLeft, Camera, HelpCircle, RefreshCw, Loader2,
  StopCircle, Sparkles
} from "lucide-react";
import BottomNav from "../components/BottomNav";

type VerdictState = "ACCEPTED" | "RETAKE" | "REJECTED";

function dataReward(result: any, record: any): number {
  if (result?.reward !== undefined) return result.reward;
  if (record?.reward_earned_idr !== undefined) return record.reward_earned_idr;
  return 0;
}

export default function VerdictPage() {
  const router = useRouter();
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [autoplayBlocked, setAutoplayBlocked] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const raw = sessionStorage.getItem("auditResult");
    if (raw) {
      try {
        setResult(JSON.parse(raw));
      } catch {}
    }
    // Reduced delay for immediate responsiveness
    const t = setTimeout(() => setLoading(false), 250);
    return () => clearTimeout(t);
  }, []);

  const record = result?.transaction_record || result?.evaluation || {};
  const financials = result?.financials || {};
  const voice = result?.voice_brief || {};
  const reward = dataReward(result, record);
  const isOriginal = record?.is_original_receipt;
  const fraudFlags: string[] = record?.fraud_flags || [];
  const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
  const audioSrc = voice.audio_url ? `${apiBase}${voice.audio_url}` : null;

  // Attempt automatic audio playback immediately after loading completes
  useEffect(() => {
    if (!loading && audioSrc && audioRef.current) {
      const p = audioRef.current.play();
      if (p !== undefined) {
        p.then(() => {
          setIsPlayingAudio(true);
          setAutoplayBlocked(false);
        }).catch(() => {
          // Autoplay blocked by browser policy until user gesture
          setAutoplayBlocked(true);
          setIsPlayingAudio(false);
        });
      }
    }
  }, [loading, audioSrc]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 max-w-md mx-auto flex flex-col items-center justify-center space-y-5 pb-24 font-sans">
        <div className="w-20 h-20 bg-emerald-50 rounded-3xl flex items-center justify-center border border-emerald-200 shadow-sm">
          <Loader2 size={36} className="text-emerald-600 animate-spin" />
        </div>
        <div className="text-center space-y-1">
          <p className="font-extrabold text-slate-800 text-lg">Reviewing your upload...</p>
          <p className="text-slate-500 text-sm font-medium">AI is analyzing receipt clarity and amounts</p>
        </div>
        <BottomNav />
      </div>
    );
  }

  if (!result) {
    return (
      <div className="min-h-screen bg-slate-50 max-w-md mx-auto flex flex-col items-center justify-center space-y-4 pb-24 font-sans">
        <p className="text-slate-600 font-semibold text-sm">No audit data found. Return to Home to upload.</p>
        <button onClick={() => router.push("/home")} className="bg-emerald-700 text-white px-6 py-3 rounded-2xl font-bold text-sm shadow-md">
          Back to Home
        </button>
        <BottomNav />
      </div>
    );
  }

  let verdictState: VerdictState = "ACCEPTED";
  if (!isOriginal && fraudFlags.length > 0) verdictState = "REJECTED";
  else if (!isOriginal) verdictState = "RETAKE";

  const verdictConfig: Record<VerdictState, { bg: string; border: string; icon: any; iconColor: string; iconBg: string; label: string; labelColor: string; labelBg: string; desc: string; subDesc: string }> = {
    ACCEPTED: {
      bg: "bg-emerald-50", border: "border-emerald-200",
      icon: CheckCircle2, iconColor: "text-emerald-600", iconBg: "bg-emerald-100",
      label: "ACCEPTED", labelColor: "text-emerald-700", labelBg: "bg-emerald-100",
      desc: "Quality passed", subDesc: "You earned incentive from this upload.",
    },
    RETAKE: {
      bg: "bg-amber-50", border: "border-amber-200",
      icon: RefreshCw, iconColor: "text-amber-600", iconBg: "bg-amber-100",
      label: "RETAKE", labelColor: "text-amber-700", labelBg: "bg-amber-100",
      desc: "Needs retake", subDesc: "Blurry, cropped, or glare detected.",
    },
    REJECTED: {
      bg: "bg-red-50", border: "border-red-200",
      icon: XCircle, iconColor: "text-red-600", iconBg: "bg-red-100",
      label: "REJECTED", labelColor: "text-red-700", labelBg: "bg-red-100",
      desc: "No payment", subDesc: "This image does not meet farm audit criteria.",
    },
  };

  const cfg = verdictConfig[verdictState];

  const handleToggleAudio = () => {
    if (!audioRef.current) return;
    if (isPlayingAudio) {
      audioRef.current.pause();
      setIsPlayingAudio(false);
    } else {
      audioRef.current.play().then(() => {
        setIsPlayingAudio(true);
        setAutoplayBlocked(false);
      }).catch((e) => {
        alert("Audio playback error: " + e.message);
      });
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 max-w-md mx-auto pb-24 font-sans">
      <header className="bg-white border-b border-slate-100 px-5 pt-12 pb-4">
        <button onClick={() => router.push("/home")} className="flex items-center space-x-1 text-slate-600 hover:text-emerald-700 mb-3 transition-colors">
          <ChevronLeft size={22} />
          <span className="text-sm font-semibold">Home</span>
        </button>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-extrabold text-slate-900">Photo Verdict</h1>
            <p className="text-slate-500 text-xs font-medium mt-0.5">TaniJaga AI · Corn expense evaluation</p>
          </div>
          <span className="text-[10px] font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">🌽 Corn</span>
        </div>
      </header>

      <main className="px-4 pt-4 space-y-4">
        {/* Merchant info */}
        {record.merchant_name && (
          <div className="bg-white rounded-2xl px-4 py-3 border border-slate-100 shadow-xs flex items-center space-x-3">
            <div className="w-8 h-8 bg-slate-100 rounded-xl flex items-center justify-center text-base">🏪</div>
            <div>
              <p className="font-bold text-slate-900 text-sm">{record.merchant_name}</p>
              <p className="text-[10px] text-slate-400 font-medium">{record.primary_receipt_category || record.primary_category || "Agricultural Receipt"}</p>
            </div>
          </div>
        )}

        {/* Autoplay Fallback Prominent Button if browser blocked direct playback */}
        {audioSrc && autoplayBlocked && !isPlayingAudio && (
          <button
            onClick={handleToggleAudio}
            className="w-full bg-gradient-to-r from-purple-700 via-indigo-700 to-purple-800 text-white p-3.5 rounded-2xl font-extrabold text-xs shadow-lg shadow-purple-600/30 flex items-center justify-between animate-pulse active:scale-[0.99] transition-all"
          >
            <div className="flex items-center space-x-2.5">
              <div className="w-7 h-7 bg-white/20 rounded-xl flex items-center justify-center">
                <Volume2 size={16} className="text-white" />
              </div>
              <span className="text-left font-extrabold">Tap to Listen to AI Voice Brief</span>
            </div>
            <span className="bg-white/20 text-[9px] px-2 py-0.5 rounded-full font-bold">ElevenLabs AI</span>
          </button>
        )}

        {/* Verdict Card */}
        <div className={"rounded-3xl p-5 border " + cfg.bg + " " + cfg.border}>
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-3">Verdict Status</p>
          {(["ACCEPTED", "RETAKE", "REJECTED"] as VerdictState[]).map((state) => {
            const c = verdictConfig[state];
            const StateIcon = c.icon;
            const isActive = state === verdictState;
            return (
              <div key={state} className={"flex items-start space-x-3 py-2.5 px-3 rounded-2xl mb-2 transition-all " + (isActive ? c.bg + " " + c.border + " border shadow-xs" : "opacity-35")}>
                <div className={"w-8 h-8 rounded-xl flex items-center justify-center shrink-0 " + c.iconBg}>
                  <StateIcon size={18} className={c.iconColor} />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <span className={"text-xs font-extrabold px-2 py-0.5 rounded-lg " + c.labelBg + " " + c.labelColor}>{c.label}</span>
                  </div>
                  <p className="text-[10px] text-slate-500 font-medium mt-0.5">{isActive ? c.subDesc : c.desc}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Amount Earned & Audio Controls */}
        <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-bold text-slate-700">Incentive earned</p>
            {audioSrc && (
              <button
                onClick={handleToggleAudio}
                className={"flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all " + (isPlayingAudio ? "bg-purple-700 text-white" : "bg-purple-50 border border-purple-200 text-purple-700 hover:bg-purple-100")}
              >
                {isPlayingAudio ? <StopCircle size={14} /> : <Volume2 size={14} />}
                <span>{isPlayingAudio ? "Stop audio" : "Speak aloud"}</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className={"p-4 rounded-2xl text-center " + (reward > 0 ? "bg-emerald-50 border border-emerald-200" : "bg-slate-50 border border-slate-200")}>
              <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wide">This upload</p>
              <p className={"text-2xl font-black mt-1 " + (reward > 0 ? "text-emerald-700" : "text-slate-400")}>
                Rp {reward.toLocaleString("en-US")}
              </p>
            </div>
            <div className="p-4 rounded-2xl text-center bg-slate-50 border border-slate-200">
              <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wide">AI read total</p>
              <p className="text-2xl font-black mt-1 text-slate-800">
                Rp {(financials.total_production_cost || record.total_amount_idr || 0).toLocaleString("en-US")}
              </p>
            </div>
          </div>

          {/* Hidden audio element with programmatic ref */}
          {audioSrc && (
            <div className="mt-3">
              <audio
                ref={audioRef}
                src={audioSrc}
                controls
                className="w-full h-9 rounded-xl accent-purple-600"
                onPlay={() => setIsPlayingAudio(true)}
                onEnded={() => setIsPlayingAudio(false)}
                onPause={() => setIsPlayingAudio(false)}
              />
            </div>
          )}

          {voice.transcript && (
            <div className="mt-3 bg-purple-50/80 rounded-2xl px-4 py-3 border border-purple-100">
              <p className="text-[10px] text-purple-700 font-bold uppercase tracking-wider mb-1">AI Voice Brief</p>
              <p className="text-xs text-purple-900 italic leading-relaxed">&ldquo;{voice.transcript}&rdquo;</p>
            </div>
          )}

          {verdictState === "ACCEPTED" && (
            <div className="mt-4 space-y-2.5">
              <button onClick={() => router.push("/confirm")}
                className="w-full border border-slate-200 bg-slate-50 text-slate-700 py-3.5 rounded-2xl font-bold text-sm hover:bg-slate-100 active:scale-[0.99] transition-all">
                View receipt details & classify
              </button>
              <button onClick={() => router.push("/home")}
                className="w-full bg-slate-900 text-white py-3.5 rounded-2xl font-extrabold text-sm hover:bg-slate-800 active:scale-[0.99] transition-all shadow-lg">
                Continue →
              </button>
            </div>
          )}
        </div>

        {/* Receipt breakdown (ACCEPTED) */}
        {verdictState === "ACCEPTED" && (
          <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-xs space-y-2">
            <h3 className="font-bold text-slate-800 text-sm">Receipt Breakdown (AI Extracted)</h3>
            <div className="space-y-2 pt-1">
              <div className="flex items-center justify-between py-2.5 border-b border-slate-100">
                <div>
                  <p className="text-sm font-semibold text-slate-700">Production Cost Total</p>
                  <p className="text-[10px] text-slate-400 font-medium">Calculated from receipt items</p>
                </div>
                <p className="font-extrabold text-slate-900">Rp {(financials.total_production_cost || record.total_amount_idr || 0).toLocaleString("en-US")}</p>
              </div>
              <div className="flex items-center justify-between py-2.5 border-b border-slate-100">
                <p className="text-sm font-semibold text-slate-700">BEP / kg</p>
                <p className="font-extrabold text-emerald-700">Rp {(financials.hpp_per_kg || record.hpp_per_kg_idr || 0).toLocaleString("en-US")}</p>
              </div>
              <div className="flex items-center justify-between py-2">
                <p className="text-sm font-semibold text-slate-700">Quality Score</p>
                <span className="bg-emerald-100 text-emerald-800 font-extrabold text-sm px-3 py-1 rounded-full">
                  {record.image_quality_score}/10
                </span>
              </div>
            </div>
            <button onClick={() => router.push("/confirm")}
              className="w-full bg-slate-900 text-white py-3.5 rounded-2xl font-extrabold text-sm hover:bg-slate-800 active:scale-[0.99] transition-all shadow-lg mt-2">
              Classify this receipt →
            </button>
          </div>
        )}

        {/* Retake / Rejected */}
        {(verdictState === "RETAKE" || verdictState === "REJECTED") && (
          <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-xs space-y-3">
            {verdictState === "RETAKE" ? (
              <>
                <button className="w-full border border-slate-200 text-slate-700 py-3 rounded-2xl font-semibold text-sm flex items-center justify-center space-x-2 hover:bg-slate-50">
                  <HelpCircle size={16} /><span>How to take a clear receipt photo</span>
                </button>
                <label className="w-full bg-slate-900 text-white py-3.5 rounded-2xl font-extrabold text-sm hover:bg-slate-800 active:scale-[0.99] transition-all shadow-lg flex items-center justify-center space-x-2 cursor-pointer">
                  <Camera size={18} /><span>Retake photo</span>
                  <input type="file" accept="image/*" capture="environment" className="hidden"
                    onChange={() => { sessionStorage.removeItem("auditResult"); router.push("/home"); }} />
                </label>
                {fraudFlags[0] && (
                  <div className="bg-amber-50 rounded-2xl px-4 py-3 border border-amber-100">
                    <p className="text-[10px] text-amber-600 font-bold uppercase tracking-wider mb-1">Reason</p>
                    <p className="text-xs text-amber-800 font-medium">{fraudFlags[0]}</p>
                  </div>
                )}
              </>
            ) : (
              <>
                <div className="bg-red-50 border border-red-200 rounded-2xl p-4 space-y-2">
                  <div className="flex items-center space-x-2"><AlertTriangle size={16} className="text-red-600 shrink-0" /><p className="font-extrabold text-red-900 text-sm">No incentive credited</p></div>
                  {fraudFlags.map((flag, i) => (
                    <p key={i} className="text-xs text-red-700 font-medium">• {flag}</p>
                  ))}
                </div>
                <button className="w-full border border-slate-200 text-slate-700 py-3 rounded-2xl font-semibold text-sm flex items-center justify-center space-x-2 hover:bg-slate-50">
                  <HelpCircle size={16} /><span>Receipt audit guidelines</span>
                </button>
                <label className="w-full bg-slate-900 text-white py-3.5 rounded-2xl font-extrabold text-sm hover:bg-slate-800 active:scale-[0.99] transition-all shadow-lg flex items-center justify-center space-x-2 cursor-pointer">
                  <Camera size={18} /><span>Try another receipt photo</span>
                  <input type="file" accept="image/*" capture="environment" className="hidden"
                    onChange={() => { sessionStorage.removeItem("auditResult"); router.push("/home"); }} />
                </label>
              </>
            )}
          </div>
        )}
      </main>
      <BottomNav />
    </div>
  );
}

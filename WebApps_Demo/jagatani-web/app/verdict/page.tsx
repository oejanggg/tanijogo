"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2, AlertTriangle, XCircle, Volume2,
  ChevronLeft, Camera, HelpCircle, RefreshCw
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

  useEffect(() => {
    const raw = sessionStorage.getItem("auditResult");
    if (raw) {
      try { setResult(JSON.parse(raw)); } catch {}
    }
    const t = setTimeout(() => setLoading(false), 900);
    return () => clearTimeout(t);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 max-w-md mx-auto flex flex-col items-center justify-center space-y-4 pb-24">
        <div className="w-16 h-16 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" />
        <div className="text-center space-y-1">
          <p className="font-extrabold text-slate-800 text-lg">Reviewing your upload...</p>
          <p className="text-slate-500 text-sm font-medium">Harap tunggu sebentar</p>
        </div>
        <BottomNav />
      </div>
    );
  }

  if (!result) {
    return (
      <div className="min-h-screen bg-slate-50 max-w-md mx-auto flex flex-col items-center justify-center space-y-4 pb-24">
        <p className="text-slate-600 font-semibold text-sm">Tidak ada data audit. Kembali ke Home.</p>
        <button onClick={() => router.push("/home")} className="bg-emerald-700 text-white px-6 py-3 rounded-2xl font-bold text-sm">
          Kembali ke Home
        </button>
        <BottomNav />
      </div>
    );
  }

  const record = result.transaction_record || result.evaluation || {};
  const financials = result.financials || {};
  const voice = result.voice_brief || {};
  const reward = dataReward(result, record);
  const isOriginal = record.is_original_receipt;
  const fraudFlags = record.fraud_flags || [];
  const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
  const audioSrc = voice.audio_url ? `${apiBase}${voice.audio_url}` : null;

  let verdictState: VerdictState = "ACCEPTED";
  if (!isOriginal && fraudFlags.length > 0) verdictState = "REJECTED";
  else if (!isOriginal) verdictState = "RETAKE";

  const verdictConfig = {
    ACCEPTED: {
      bg: "bg-emerald-50",
      border: "border-emerald-200",
      icon: CheckCircle2,
      iconColor: "text-emerald-600",
      iconBg: "bg-emerald-100",
      label: "ACCEPTED",
      labelColor: "text-emerald-700",
      labelBg: "bg-emerald-100",
      desc: "Quality passed",
      subDesc: "You earned from this upload.",
    },
    RETAKE: {
      bg: "bg-amber-50",
      border: "border-amber-200",
      icon: RefreshCw,
      iconColor: "text-amber-600",
      iconBg: "bg-amber-100",
      label: "RETAKE",
      labelColor: "text-amber-700",
      labelBg: "bg-amber-100",
      desc: "To upload",
      subDesc: "Blurry, cropped, or glare detected.",
    },
    REJECTED: {
      bg: "bg-red-50",
      border: "border-red-200",
      icon: XCircle,
      iconColor: "text-red-600",
      iconBg: "bg-red-100",
      label: "REJECTED",
      labelColor: "text-red-700",
      labelBg: "bg-red-100",
      desc: "No payment",
      subDesc: "This image can't be used as a payment.",
    },
  };

  const cfg = verdictConfig[verdictState];
  const Icon = cfg.icon;

  return (
    <div className="min-h-screen bg-slate-50 max-w-md mx-auto pb-24 font-sans">
      {/* Header */}
      <header className="bg-white border-b border-slate-100 px-5 pt-12 pb-4">
        <button onClick={() => router.push("/home")} className="flex items-center space-x-1 text-slate-600 hover:text-emerald-700 mb-3 transition-colors">
          <ChevronLeft size={22} />
          <span className="text-sm font-semibold">Home</span>
        </button>
        <h1 className="text-xl font-extrabold text-slate-900">Photo Verdict</h1>
        <p className="text-slate-500 text-xs font-medium mt-0.5">Shows immediately after capture</p>
      </header>

      <main className="px-4 pt-4 space-y-4">
        {/* Verdict Card */}
        <div className={"rounded-3xl p-5 border " + cfg.bg + " " + cfg.border}>
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-3">Verdict</p>

          {/* All 3 states shown with current highlighted */}
          {(["ACCEPTED", "RETAKE", "REJECTED"] as VerdictState[]).map((state) => {
            const c = verdictConfig[state];
            const StateIcon = c.icon;
            const isActive = state === verdictState;
            return (
              <div key={state} className={"flex items-start space-x-3 py-2.5 px-3 rounded-2xl mb-2 transition-all " + (isActive ? c.bg + " " + c.border + " border" : "opacity-40")}>
                <div className={"w-8 h-8 rounded-xl flex items-center justify-center shrink-0 " + c.iconBg}>
                  <StateIcon size={18} className={c.iconColor} />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <span className={"text-xs font-extrabold px-2 py-0.5 rounded-lg " + c.labelBg + " " + c.labelColor}>
                      {c.label}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-500 font-medium mt-0.5">{isActive ? c.subDesc : c.desc}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Amount Earned */}
        <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-bold text-slate-700">Amount earned</p>
            {voice.transcript && (
              <button className="flex items-center space-x-1.5 bg-purple-50 border border-purple-200 px-3 py-1.5 rounded-xl text-purple-700 text-xs font-bold hover:bg-purple-100 transition-colors">
                <Volume2 size={14} />
                <span>Speak aloud</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className={"p-4 rounded-2xl text-center " + (reward > 0 ? "bg-emerald-50 border border-emerald-200" : "bg-slate-50 border border-slate-200")}>
              <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wide">This upload</p>
              <p className={"text-2xl font-black mt-1 " + (reward > 0 ? "text-emerald-700" : "text-slate-400")}>
                Rp {reward.toLocaleString("id-ID")}
              </p>
            </div>
            <div className="p-4 rounded-2xl text-center bg-slate-50 border border-slate-200">
              <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wide">AI read</p>
              <p className="text-2xl font-black mt-1 text-slate-800">
                Rp {(financials.total_production_cost || record.total_production_cost_idr || 0).toLocaleString("id-ID")}
              </p>
            </div>
          </div>

          {/* Audio player */}
          {audioSrc && (
            <audio key={audioSrc} controls autoPlay className="w-full mt-3 h-9 rounded-xl accent-purple-600">
              <source src={audioSrc} type="audio/mpeg" />
            </audio>
          )}

          {verdictState === "ACCEPTED" && (
            <div className="mt-4 space-y-2.5">
              <button
                onClick={() => router.push("/confirm")}
                className="w-full border border-slate-200 bg-slate-50 text-slate-700 py-3.5 rounded-2xl font-bold text-sm hover:bg-slate-100 active:scale-[0.99] transition-all"
              >
                View receipt details
              </button>
              <button
                onClick={() => router.push("/home")}
                className="w-full bg-slate-900 text-white py-3.5 rounded-2xl font-extrabold text-sm hover:bg-slate-800 active:scale-[0.99] transition-all shadow-lg"
              >
                Continue →
              </button>
            </div>
          )}
        </div>

        {/* Receipt Total (AI read) */}
        {verdictState === "ACCEPTED" && (
          <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-xs space-y-2">
            <h3 className="font-bold text-slate-800 text-sm">Receipt total (AI read)</h3>
            <p className="text-[10px] text-slate-500 font-medium">For your record</p>
            <div className="space-y-2 pt-1">
              <div className="flex items-center justify-between py-2.5 border-b border-slate-100">
                <div>
                  <p className="text-sm font-semibold text-slate-700">Total</p>
                  <p className="text-[10px] text-slate-400 font-medium">Calculated from the image</p>
                </div>
                <div className="flex items-center space-x-2">
                  <p className="font-extrabold text-slate-900">
                    Rp {(financials.total_production_cost || 0).toLocaleString("id-ID")}
                  </p>
                  <button className="text-slate-400 hover:text-emerald-600 transition-colors">
                    <RefreshCw size={14} />
                  </button>
                </div>
              </div>
              <div className="flex items-center justify-between py-2">
                <div>
                  <p className="text-sm font-semibold text-slate-700">Uploaded</p>
                  <p className="text-[10px] text-slate-400 font-medium">Just now</p>
                </div>
                <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full">Live</span>
              </div>
            </div>
            <button
              onClick={() => router.push("/confirm")}
              className="w-full bg-slate-900 text-white py-3.5 rounded-2xl font-extrabold text-sm hover:bg-slate-800 active:scale-[0.99] transition-all shadow-lg mt-2"
            >
              View receipt details
            </button>
          </div>
        )}

        {/* Retake / Rejected Section */}
        {(verdictState === "RETAKE" || verdictState === "REJECTED") && (
          <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-xs space-y-3">
            {verdictState === "RETAKE" ? (
              <>
                <button className="w-full border border-slate-200 text-slate-700 py-3 rounded-2xl font-semibold text-sm flex items-center justify-center space-x-2 hover:bg-slate-50">
                  <HelpCircle size={16} />
                  <span>How to take a good receipt</span>
                </button>
                <label className="w-full bg-slate-900 text-white py-3.5 rounded-2xl font-extrabold text-sm hover:bg-slate-800 active:scale-[0.99] transition-all shadow-lg flex items-center justify-center space-x-2 cursor-pointer">
                  <Camera size={18} />
                  <span>Retake photo</span>
                  <input type="file" accept="image/*" capture="environment" className="hidden"
                    onChange={(e) => { sessionStorage.removeItem("auditResult"); router.push("/home"); }} />
                </label>
                <div className="bg-slate-50 rounded-2xl px-4 py-3 border border-slate-100">
                  <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider mb-1">Retake reason</p>
                  <p className="text-xs text-slate-600 italic">{fraudFlags[0] || "One short sentence will appear here."}</p>
                </div>
              </>
            ) : (
              <>
                {/* No payment made */}
                <div className="bg-red-50 border border-red-200 rounded-2xl p-4 space-y-2">
                  <p className="font-extrabold text-red-900 text-sm">No payment made</p>
                  <p className="text-[10px] text-red-600 font-medium">Sistem anti-duplikat aktif</p>
                  <div className="space-y-2 pt-1">
                    {[
                      { label: "Verdict", value: "No payment" },
                      { label: "Reason", value: fraudFlags[0] || "Looks like this receipt was already uploaded." },
                    ].map(({ label, value }) => (
                      <div key={label} className="flex items-start justify-between space-x-2">
                        <span className="text-[10px] text-red-500 font-bold w-14 shrink-0">{label}</span>
                        <span className="text-[10px] text-red-700 font-medium text-right leading-snug">{value}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <button className="w-full border border-slate-200 text-slate-700 py-3 rounded-2xl font-semibold text-sm flex items-center justify-center space-x-2 hover:bg-slate-50">
                  <HelpCircle size={16} />
                  <span>Help</span>
                </button>
                <label className="w-full bg-slate-900 text-white py-3.5 rounded-2xl font-extrabold text-sm hover:bg-slate-800 active:scale-[0.99] transition-all shadow-lg flex items-center justify-center space-x-2 cursor-pointer">
                  <Camera size={18} />
                  <span>Try another photo</span>
                  <input type="file" accept="image/*" capture="environment" className="hidden"
                    onChange={(e) => { sessionStorage.removeItem("auditResult"); router.push("/home"); }} />
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

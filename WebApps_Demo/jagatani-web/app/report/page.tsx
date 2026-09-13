"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, Share2, CheckCircle2, AlertCircle, Clock, BarChart2 } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { useProtected } from "../lib/use-protected";
import BottomNav from "../components/BottomNav";

export default function ReportPage() {
  const router = useRouter();
  const { user } = useProtected();
  const [ledger, setLedger] = useState<any[]>([]);
  const [showPartial, setShowPartial] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("farmer_ledger")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        if (data) setLedger(data);
      });
  }, [user]);

  const totalReceipts = ledger.length;
  const totalExpenses = ledger.reduce((s, r) => s + (r.total_production_cost || 0), 0);
  const validReceipts = ledger.filter((r) => !r.fraud_detected).length;

  // Determine months with data
  const monthsWithData = new Set(
    ledger.map((r) => {
      const d = new Date(r.created_at);
      return `${d.getFullYear()}-${d.getMonth()}`;
    })
  ).size;
  const TARGET_MONTHS = 3;
  const hasEnoughHistory = monthsWithData >= TARGET_MONTHS;
  const monthsNeeded = Math.max(0, TARGET_MONTHS - monthsWithData);

  // Date range
  const dates = ledger.map((r) => new Date(r.created_at)).sort((a, b) => a.getTime() - b.getTime());
  const startDate =
    dates[0]?.toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" }) || "—";
  const endDate =
    dates[dates.length - 1]?.toLocaleDateString("en-US", {
      day: "numeric",
      month: "short",
      year: "numeric",
    }) || "—";

  const handleShare = () => {
    if (navigator.share) {
      navigator
        .share({
          title: "SukaTani KUR Credit Report",
          text: `SukaTani Bank Report: ${validReceipts} verified receipts, Rp ${totalExpenses.toLocaleString("en-US")} confirmed expenses.`,
        })
        .catch(() => {});
    } else {
      navigator.clipboard?.writeText(window.location.href);
      alert("Report link copied to clipboard: " + window.location.href);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 max-w-md mx-auto pb-24 font-sans">
      {/* Header */}
      <header className="bg-white border-b border-slate-100 px-5 pt-12 pb-4">
        <button
          onClick={() => router.push("/home")}
          className="flex items-center space-x-1 text-slate-600 hover:text-emerald-700 mb-3 transition-colors"
        >
          <ChevronLeft size={22} />
          <span className="text-sm font-semibold">Home</span>
        </button>
        <div className="flex items-center space-x-2.5">
          <div className="w-9 h-9 bg-amber-100 rounded-xl flex items-center justify-center">
            <BarChart2 size={20} className="text-amber-700" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-slate-900">Report for the Bank</h1>
            <p className="text-slate-500 text-xs font-medium">Show or share with your loan officer</p>
          </div>
        </div>
      </header>

      <main className="px-4 pt-4 space-y-4">
        {/* KUR Credit Report Card */}
        <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-xs space-y-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                Credit Rating Assessment
              </p>
              <h2 className="font-black text-slate-900 text-lg leading-tight">KUR Credit Report</h2>
            </div>
            {/* Verification badge */}
            {hasEnoughHistory && (
              <div className="bg-emerald-100 border border-emerald-300 rounded-xl px-3 py-1.5 flex items-center space-x-1.5">
                <CheckCircle2 size={14} className="text-emerald-700" />
                <span className="text-emerald-800 text-[10px] font-extrabold uppercase">Verified</span>
              </div>
            )}
          </div>

          {/* Main report card (glassmorphic) */}
          <div className="bg-gradient-to-br from-emerald-900 via-emerald-800 to-teal-900 rounded-2xl p-5 space-y-4 relative overflow-hidden">
            <div className="absolute -top-8 -right-8 w-32 h-32 bg-white/5 rounded-full blur-2xl pointer-events-none" />
            <div className="absolute bottom-0 -left-4 w-24 h-24 bg-teal-400/10 rounded-full blur-xl pointer-events-none" />

            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-emerald-200/70 text-[9px] font-bold uppercase tracking-widest">
                  SukaTani Verified
                </p>
                <p className="text-white font-extrabold text-base">Farmer Financial Statement</p>
              </div>
              <div className="w-10 h-10 bg-white/15 rounded-xl flex items-center justify-center border border-white/20">
                <span className="text-xl">🌾</span>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: "Valid Receipts", value: String(validReceipts) },
                {
                  label: "Total Cost",
                  value: "Rp " + (totalExpenses >= 1000 ? (totalExpenses / 1000).toFixed(0) + "K" : totalExpenses),
                },
                { label: "History", value: monthsWithData + " mos" },
              ].map(({ label, value }) => (
                <div key={label} className="bg-white/10 rounded-xl p-2.5 text-center border border-white/10">
                  <p className="text-emerald-200/70 text-[9px] font-bold uppercase tracking-wide">{label}</p>
                  <p className="text-white font-extrabold text-sm mt-0.5">{value}</p>
                </div>
              ))}
            </div>

            {/* Date range */}
            <p className="text-emerald-200/60 text-[10px] font-medium">
              Period: {startDate} — {endDate}
            </p>
          </div>

          {/* Verified row */}
          <div className="bg-emerald-50 border border-emerald-100 rounded-2xl px-4 py-3 flex items-center space-x-3">
            <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
            <p className="text-xs text-emerald-800 font-semibold leading-snug">
              Receipts: {validReceipts} • Expenses: Rp {totalExpenses.toLocaleString("en-US")} • Verified by SukaTani AI
            </p>
          </div>

          {/* Share Button */}
          {hasEnoughHistory && (
            <button
              onClick={handleShare}
              className="w-full bg-slate-900 text-white py-4 rounded-2xl font-extrabold text-sm hover:bg-slate-800 active:scale-[0.99] transition-all shadow-lg flex items-center justify-center space-x-2"
            >
              <Share2 size={18} />
              <span>Share with Bank Officer</span>
            </button>
          )}
        </div>

        {/* Not enough history state */}
        {!hasEnoughHistory && (
          <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-xs space-y-4">
            <div className="flex items-start space-x-3">
              <div className="w-9 h-9 bg-amber-100 rounded-xl flex items-center justify-center shrink-0 mt-0.5">
                <AlertCircle size={18} className="text-amber-700" />
              </div>
              <div>
                <h3 className="font-extrabold text-slate-800 text-sm">Building Credit History</h3>
                <p className="text-slate-500 text-xs font-medium mt-0.5">
                  Bank underwriters require at least {TARGET_MONTHS} months of verified records
                </p>
              </div>
            </div>

            {/* Progress card */}
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold text-slate-700">Audit Progress</p>
                <p className="text-[10px] font-bold text-slate-500">
                  {monthsWithData}/{TARGET_MONTHS} months recorded
                </p>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-emerald-600 to-teal-500 rounded-full transition-all duration-700"
                  style={{ width: `${Math.min(100, (monthsWithData / TARGET_MONTHS) * 100)}%` }}
                />
              </div>
              <div className="flex items-center space-x-2 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2.5">
                <Clock size={14} className="text-amber-600 shrink-0" />
                <p className="text-xs text-amber-800 font-semibold">
                  Need {monthsNeeded} more month{monthsNeeded !== 1 ? "s" : ""} of data
                </p>
              </div>
              <p className="text-[10px] text-slate-500 font-medium leading-relaxed">
                After you log receipts across {monthsNeeded} more month{monthsNeeded !== 1 ? "s" : ""}, your official KUR credit certificate will be unlocked for direct export to bank loan officers.
              </p>
            </div>

            {/* CTA to add more */}
            <button
              onClick={() => router.push("/home")}
              className="w-full bg-gradient-to-r from-emerald-700 to-teal-600 text-white py-3.5 rounded-2xl font-bold text-sm hover:from-emerald-800 hover:to-teal-700 active:scale-[0.99] transition-all shadow-md shadow-emerald-600/20"
            >
              Upload Receipt Now
            </button>
          </div>
        )}
      </main>
      <BottomNav />
    </div>
  );
}

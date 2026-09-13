"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, Receipt as ReceiptIcon, AlertCircle, ChevronDown, ChevronUp, Volume2 } from "lucide-react";
import { useProtected } from "../lib/use-protected";
import BottomNav from "../components/BottomNav";
import { fetchAllReceipts, LedgerItem } from "../lib/ledger-storage";

const CATEGORY_STYLE: Record<string, { bg: string; text: string; emoji: string }> = {
  seed: { bg: "bg-emerald-100", text: "text-emerald-800", emoji: "🌱" },
  fertilizer: { bg: "bg-emerald-100", text: "text-emerald-800", emoji: "🌱" },
  fuel: { bg: "bg-amber-100", text: "text-amber-800", emoji: "⚡" },
  electricity: { bg: "bg-amber-100", text: "text-amber-800", emoji: "⚡" },
  labor: { bg: "bg-blue-100", text: "text-blue-800", emoji: "👷" },
  tools: { bg: "bg-purple-100", text: "text-purple-800", emoji: "🔧" },
  equipment: { bg: "bg-purple-100", text: "text-purple-800", emoji: "🔧" },
};

function getCategoryStyle(cat: string) {
  const key = Object.keys(CATEGORY_STYLE).find((k) => (cat || "").toLowerCase().includes(k));
  return key ? CATEGORY_STYLE[key] : { bg: "bg-slate-100", text: "text-slate-700", emoji: "🧾" };
}

function groupByMonth(rows: LedgerItem[]) {
  const groups: Record<string, LedgerItem[]> = {};
  rows.forEach((row) => {
    const d = new Date(row.created_at || Date.now());
    const key = d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
    if (!groups[key]) groups[key] = [];
    groups[key].push(row);
  });
  return groups;
}

export default function ReceiptsPage() {
  const router = useRouter();
  const { user } = useProtected();
  const [ledger, setLedger] = useState<LedgerItem[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    fetchAllReceipts(user?.id).then((data) => {
      setLedger(data);
    });
  }, [user]);

  const totalExpenses = ledger.reduce((s, r) => s + (r.total_production_cost || 0), 0);
  const totalReward = ledger.reduce((s, r) => s + (r.reward_earned || 0), 0);
  const grouped = groupByMonth(ledger);

  return (
    <div className="min-h-screen bg-slate-50 max-w-md mx-auto pb-24 font-sans">
      {/* Header */}
      <header className="bg-white border-b border-slate-100 px-5 pt-12 pb-4">
        <button onClick={() => router.push("/home")} className="flex items-center space-x-1 text-slate-600 hover:text-emerald-700 mb-3 transition-colors">
          <ChevronLeft size={22} />
          <span className="text-sm font-semibold">Home</span>
        </button>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-extrabold text-slate-900">Receipts</h1>
            <p className="text-slate-500 text-xs font-medium mt-0.5">Farm ledger records · Verified uploads</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">Total Expenses</p>
            <p className="font-black text-slate-900 text-sm">Rp {totalExpenses.toLocaleString("en-US")}</p>
            <p className="text-[10px] text-emerald-600 font-bold">{ledger.length} receipts · +Rp {totalReward.toLocaleString("en-US")}</p>
          </div>
        </div>
      </header>

      <main className="px-4 pt-4 space-y-6">
        {ledger.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 space-y-3">
            <div className="w-16 h-16 bg-slate-100 rounded-3xl flex items-center justify-center">
              <ReceiptIcon size={32} className="text-slate-400" />
            </div>
            <p className="font-bold text-slate-700 text-base">No receipts recorded yet</p>
            <p className="text-slate-500 text-xs text-center max-w-[220px] leading-relaxed">
              Photograph or upload your farm receipt to start building your verified expense history
            </p>
            <button onClick={() => router.push("/home")}
              className="bg-emerald-700 text-white px-6 py-3 rounded-2xl font-bold text-sm mt-2 hover:bg-emerald-800 transition-colors shadow-md shadow-emerald-600/20">
              Photograph Receipt
            </button>
          </div>
        ) : (
          Object.entries(grouped).map(([month, rows]) => {
            const monthTotal = rows.reduce((s, r) => s + (r.reward_earned || 0), 0);
            const monthCost = rows.reduce((s, r) => s + (r.total_production_cost || 0), 0);
            return (
              <div key={month} className="space-y-2.5">
                <div className="flex items-center justify-between px-1">
                  <h2 className="font-extrabold text-slate-800 text-sm">{month}</h2>
                  <div className="text-right">
                    <p className="text-[10px] text-slate-500 font-semibold">
                      Cost: Rp {monthCost.toLocaleString("en-US")} · {rows.length} receipts
                    </p>
                    <p className="text-[10px] text-emerald-600 font-bold">
                      Incentive: +Rp {monthTotal.toLocaleString("en-US")}
                    </p>
                  </div>
                </div>

                {rows.map((row) => {
                  const catStyle = getCategoryStyle(row.primary_category);
                  const date = new Date(row.created_at || Date.now());
                  const isOpen = expanded === row.id;
                  return (
                    <div key={row.id} className="bg-white rounded-2xl border border-slate-100 shadow-xs overflow-hidden">
                      <button
                        className="w-full flex items-center space-x-3 p-4 text-left hover:bg-slate-50/50 transition-colors active:scale-[0.99]"
                        onClick={() => setExpanded(isOpen ? null : row.id)}
                      >
                        <div className="w-14 h-14 bg-slate-100 rounded-xl flex items-center justify-center shrink-0 border border-slate-200 text-2xl">
                          {catStyle.emoji}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-slate-900 text-sm truncate">{row.merchant_name || "Farm Supplier"}</p>
                          <div className="flex items-center space-x-1.5 mt-1 flex-wrap gap-y-1">
                            <span className={"text-[10px] font-bold px-2 py-0.5 rounded-md " + catStyle.bg + " " + catStyle.text}>
                              {(row.primary_category || "Farm Input").replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                            </span>
                            <span className="text-[10px] text-slate-400 font-medium">
                              {date.toLocaleDateString("en-US", { day: "numeric", month: "short" })}
                            </span>
                            {row.fraud_detected && (
                              <span className="text-[10px] text-red-600 font-bold flex items-center space-x-0.5">
                                <AlertCircle size={9} /><span>Rejected</span>
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="text-right shrink-0 space-y-0.5">
                          <p className="font-extrabold text-slate-900 text-sm">
                            Rp {(row.total_production_cost || 0).toLocaleString("en-US")}
                          </p>
                          <p className={"text-[10px] font-bold " + (row.reward_earned > 0 ? "text-emerald-600" : "text-red-500")}>
                            {row.reward_earned > 0 ? "+" : ""}Rp {(row.reward_earned || 0).toLocaleString("en-US")}
                          </p>
                          {isOpen ? <ChevronUp size={12} className="text-slate-400 mx-auto" /> : <ChevronDown size={12} className="text-slate-400 mx-auto" />}
                        </div>
                      </button>

                      {/* Expandable details & transcript */}
                      {isOpen && (
                        <div className="px-4 pb-4 space-y-2.5 border-t border-slate-100 pt-3">
                          {row.hpp_per_kg > 0 && (
                            <div className="bg-emerald-50 rounded-xl px-3 py-2 flex items-center justify-between">
                              <span className="text-xs text-emerald-700 font-semibold">HPP / kg</span>
                              <span className="text-xs font-extrabold text-emerald-800">Rp {row.hpp_per_kg.toLocaleString("en-US")}</span>
                            </div>
                          )}
                          {row.voice_transcript ? (
                            <div className="bg-purple-50 rounded-xl px-3 py-2.5 border border-purple-100">
                              <p className="text-[10px] text-purple-700 font-bold uppercase tracking-wider mb-1">AI Voice Brief Transcript</p>
                              <p className="text-xs text-purple-900 italic leading-relaxed">&ldquo;{row.voice_transcript}&rdquo;</p>
                            </div>
                          ) : (
                            <p className="text-[10px] text-slate-400 font-medium text-center py-1">Standard farm transaction record</p>
                          )}
                          {row.audio_url && (
                            <audio controls className="w-full h-8 rounded-xl accent-purple-600">
                              <source src={row.audio_url} type="audio/mpeg" />
                            </audio>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })
        )}
      </main>
      <BottomNav />
    </div>
  );
}

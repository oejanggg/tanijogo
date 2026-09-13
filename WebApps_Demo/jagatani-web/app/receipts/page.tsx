"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, Receipt as ReceiptIcon, AlertCircle } from "lucide-react";
import { supabase } from "../../lib/supabase";
import BottomNav from "../components/BottomNav";

type LedgerRow = {
  id: string;
  merchant_name: string;
  primary_category: string;
  reward_earned: number;
  fraud_detected: boolean;
  created_at: string;
  total_production_cost: number;
};

function groupByMonth(rows: LedgerRow[]) {
  const groups: Record<string, LedgerRow[]> = {};
  rows.forEach((row) => {
    const d = new Date(row.created_at);
    const key = d.toLocaleDateString("id-ID", { month: "long", year: "numeric" });
    if (!groups[key]) groups[key] = [];
    groups[key].push(row);
  });
  return groups;
}

const CATEGORY_COLORS: Record<string, { bg: string; text: string; emoji: string }> = {
  seed: { bg: "bg-emerald-100", text: "text-emerald-800", emoji: "🌱" },
  fertilizer: { bg: "bg-emerald-100", text: "text-emerald-800", emoji: "🌱" },
  fuel: { bg: "bg-amber-100", text: "text-amber-800", emoji: "⚡" },
  electricity: { bg: "bg-amber-100", text: "text-amber-800", emoji: "⚡" },
  labor: { bg: "bg-blue-100", text: "text-blue-800", emoji: "👷" },
  tools: { bg: "bg-purple-100", text: "text-purple-800", emoji: "🔧" },
  equipment: { bg: "bg-purple-100", text: "text-purple-800", emoji: "🔧" },
};

function getCategoryStyle(cat: string) {
  const key = Object.keys(CATEGORY_COLORS).find((k) =>
    (cat || "").toLowerCase().includes(k)
  );
  return key ? CATEGORY_COLORS[key] : { bg: "bg-slate-100", text: "text-slate-700", emoji: "🧾" };
}

export default function ReceiptsPage() {
  const router = useRouter();
  const [ledger, setLedger] = useState<LedgerRow[]>([]);
  const [totalExpenses, setTotalExpenses] = useState(0);

  useEffect(() => {
    supabase
      .from("farmer_ledger")
      .select("*")
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        if (data) {
          setLedger(data as LedgerRow[]);
          setTotalExpenses(data.reduce((s, r) => s + (r.total_production_cost || 0), 0));
        }
      });
  }, []);

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
            <p className="text-slate-500 text-xs font-medium mt-0.5">Grouped by month</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">Total</p>
            <p className="font-black text-slate-900 text-sm">Rp {totalExpenses.toLocaleString("id-ID")}</p>
            <p className="text-[10px] text-slate-400 font-medium">{ledger.length} receipts</p>
          </div>
        </div>
      </header>

      <main className="px-4 pt-4 space-y-6">
        {ledger.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 space-y-3">
            <div className="w-16 h-16 bg-slate-100 rounded-3xl flex items-center justify-center">
              <ReceiptIcon size={32} className="text-slate-400" />
            </div>
            <p className="font-bold text-slate-700 text-base">Belum ada nota</p>
            <p className="text-slate-500 text-xs text-center max-w-[220px] leading-relaxed">
              Upload nota pertanian pertamamu untuk mulai mencatat pengeluaran
            </p>
            <button
              onClick={() => router.push("/home")}
              className="bg-emerald-700 text-white px-6 py-3 rounded-2xl font-bold text-sm mt-2 hover:bg-emerald-800 transition-colors shadow-md shadow-emerald-600/20"
            >
              Photograph Receipt
            </button>
          </div>
        ) : (
          Object.entries(grouped).map(([month, rows]) => {
            const monthTotal = rows.reduce((s, r) => s + (r.reward_earned || 0), 0);
            const monthCost = rows.reduce((s, r) => s + (r.total_production_cost || 0), 0);
            return (
              <div key={month} className="space-y-2.5">
                {/* Month Header */}
                <div className="flex items-center justify-between px-1">
                  <h2 className="font-extrabold text-slate-800 text-sm">{month}</h2>
                  <div className="text-right">
                    <p className="text-[10px] text-slate-500 font-semibold">
                      Total: Rp {monthCost.toLocaleString("id-ID")} • {rows.length} receipts
                    </p>
                    <p className="text-[10px] text-emerald-600 font-bold">
                      Insentif: Rp {monthTotal.toLocaleString("id-ID")}
                    </p>
                  </div>
                </div>

                {/* Month rows */}
                {rows.map((row) => {
                  const catStyle = getCategoryStyle(row.primary_category);
                  const date = new Date(row.created_at);
                  return (
                    <div
                      key={row.id}
                      className="bg-white rounded-2xl p-4 border border-slate-100 shadow-xs flex items-center space-x-3 hover:border-emerald-200 transition-all cursor-pointer active:scale-[0.99]"
                    >
                      {/* Thumbnail placeholder */}
                      <div className="w-14 h-14 bg-slate-100 rounded-xl flex items-center justify-center shrink-0 border border-slate-200 overflow-hidden">
                        <span className="text-2xl">{catStyle.emoji}</span>
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-slate-900 text-sm truncate">{row.merchant_name || "Toko Pertanian"}</p>
                        <div className="flex items-center space-x-1.5 mt-1">
                          <span className={"text-[10px] font-bold px-2 py-0.5 rounded-md " + catStyle.bg + " " + catStyle.text}>
                            {row.primary_category || "Input Tani"}
                          </span>
                          <span className="text-[10px] text-slate-400 font-medium">
                            {date.toLocaleDateString("id-ID", { day: "numeric", month: "short" })}
                          </span>
                        </div>
                        {row.fraud_detected && (
                          <div className="flex items-center space-x-1 mt-1">
                            <AlertCircle size={10} className="text-red-500" />
                            <span className="text-[10px] text-red-600 font-bold">Ditolak</span>
                          </div>
                        )}
                      </div>

                      {/* Amount */}
                      <div className="text-right shrink-0">
                        <p className="text-[10px] text-slate-400 font-medium">Biaya</p>
                        <p className="font-extrabold text-slate-900 text-sm">
                          Rp {(row.total_production_cost || 0).toLocaleString("id-ID")}
                        </p>
                        <p className={"text-[10px] font-bold " + (row.reward_earned > 0 ? "text-emerald-600" : "text-red-500")}>
                          {row.reward_earned > 0 ? "+" : ""}Rp {(row.reward_earned || 0).toLocaleString("id-ID")}
                        </p>
                      </div>
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

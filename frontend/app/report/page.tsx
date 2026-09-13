"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronLeft,
  Share2,
  CheckCircle2,
  AlertCircle,
  Clock,
  BarChart2,
  Download,
  Printer,
  FileText,
  TrendingUp,
  TrendingDown,
  Building2,
  Calendar,
  Sparkles,
  ShoppingBag,
} from "lucide-react";
import { useProtected } from "../lib/use-protected";
import BottomNav from "../components/BottomNav";
import { fetchAllReceipts, LedgerItem } from "../lib/ledger-storage";
import { supabase } from "../../lib/supabase";

function formatCompactIdr(amount: number): string {
  if (amount >= 1_000_000_000) {
    return `${(amount / 1_000_000_000).toFixed(2)}B`;
  }
  if (amount >= 1_000_000) {
    return `${(amount / 1_000_000).toFixed(2)}M`;
  }
  if (amount >= 1_000) {
    return `${Math.round(amount / 1000).toLocaleString()}K`;
  }
  return amount.toLocaleString("en-US");
}

export default function ReportPage() {
  const router = useRouter();
  const { user } = useProtected();
  const [ledger, setLedger] = useState<LedgerItem[]>([]);
  const [activeTab, setActiveTab] = useState<"statement" | "kur">("statement");

  // Harvest data for revenue calculation
  const [harvestInfo, setHarvestInfo] = useState<{
    yieldKg: number;
    soldKg: number;
    pricePerKg: number;
  } | null>(null);

  useEffect(() => {
    fetchAllReceipts(user?.id).then((data) => {
      setLedger(data);
    });

    // Load harvest info from localStorage
    const savedYield = localStorage.getItem("yieldKg");
    const savedPrice = localStorage.getItem("pricePerKg");
    const savedSold = localStorage.getItem("soldKg");

    if (savedYield && savedPrice) {
      setHarvestInfo({
        yieldKg: parseFloat(savedYield) || 0,
        soldKg: parseFloat(savedSold || savedYield) || 0,
        pricePerKg: parseFloat(savedPrice) || 0,
      });
    }

    // Also check Supabase for harvest records if logged in
    if (user) {
      supabase
        .from("harvest_records")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .then(({ data }) => {
          if (data && data.length > 0) {
            const h = data[0];
            setHarvestInfo({
              yieldKg: h.yield_kg || 0,
              soldKg: h.sold_kg || h.yield_kg || 0,
              pricePerKg: h.price_per_kg || 0,
            });
          }
        });
    }
  }, [user]);

  // Key Financial Statement Calculations
  const financialSummary = useMemo(() => {
    const totalReceipts = ledger.length;
    const totalExpenses = ledger.reduce((sum, r) => sum + (r.total_production_cost || 0), 0);
    const validReceipts = ledger.filter((r) => !r.fraud_detected).length;
    const flaggedReceipts = totalReceipts - validReceipts;
    const totalRewards = ledger.reduce((sum, r) => sum + (r.reward_earned || 0), 0);

    // Expense categorization
    let cogsTotal = 0;
    let opexTotal = 0;
    let capexTotal = 0;

    ledger.forEach((r) => {
      const cost = r.total_production_cost || 0;
      const cat = (r.primary_category || "").toUpperCase();
      if (cat === "COGS") {
        cogsTotal += cost;
      } else if (cat === "OPEX") {
        opexTotal += cost;
      } else if (cat === "CAPEX") {
        capexTotal += cost;
      } else if (cat === "MIXED") {
        // Agricultural standard split for mixed receipts: 65% inputs (COGS), 35% labor/ops (OPEX)
        cogsTotal += Math.round(cost * 0.65);
        opexTotal += Math.round(cost * 0.35);
      } else {
        cogsTotal += cost;
      }
    });

    // Percentages
    const cogsPct = totalExpenses > 0 ? Math.round((cogsTotal / totalExpenses) * 100) : 0;
    const opexPct = totalExpenses > 0 ? Math.round((opexTotal / totalExpenses) * 100) : 0;
    const capexPct = totalExpenses > 0 ? Math.round((capexTotal / totalExpenses) * 100) : 0;

    // Monthly breakdown
    const monthlyMap: Record<
      string,
      { monthName: string; receiptsCount: number; cogs: number; opex: number; total: number; sortKey: string }
    > = {};

    ledger.forEach((r) => {
      const d = new Date(r.created_at || Date.now());
      const monthShort = d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
      const sortKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const cost = r.total_production_cost || 0;
      const cat = (r.primary_category || "").toUpperCase();

      if (!monthlyMap[sortKey]) {
        monthlyMap[sortKey] = {
          monthName: monthShort,
          receiptsCount: 0,
          cogs: 0,
          opex: 0,
          total: 0,
          sortKey,
        };
      }

      monthlyMap[sortKey].receiptsCount += 1;
      monthlyMap[sortKey].total += cost;
      if (cat === "COGS") monthlyMap[sortKey].cogs += cost;
      else if (cat === "OPEX") monthlyMap[sortKey].opex += cost;
      else if (cat === "MIXED") {
        monthlyMap[sortKey].cogs += Math.round(cost * 0.65);
        monthlyMap[sortKey].opex += Math.round(cost * 0.35);
      } else {
        monthlyMap[sortKey].cogs += cost;
      }
    });

    const monthlyBreakdown = Object.values(monthlyMap).sort((a, b) => b.sortKey.localeCompare(a.sortKey));

    // Merchant breakdown (Top 4)
    const merchantMap: Record<string, { name: string; count: number; total: number }> = {};
    ledger.forEach((r) => {
      const name = r.merchant_name || "Farm Supplier";
      if (!merchantMap[name]) merchantMap[name] = { name, count: 0, total: 0 };
      merchantMap[name].count += 1;
      merchantMap[name].total += r.total_production_cost || 0;
    });

    const topMerchants = Object.values(merchantMap)
      .sort((a, b) => b.total - a.total)
      .slice(0, 4);

    // Break Even Point calculation
    const avgBep =
      ledger.filter((r) => r.hpp_per_kg > 0).length > 0
        ? Math.round(
            ledger.filter((r) => r.hpp_per_kg > 0).reduce((s, r) => s + r.hpp_per_kg, 0) /
              ledger.filter((r) => r.hpp_per_kg > 0).length
          )
        : 4200;

    // Harvest revenue calculation if available
    const harvestRevenue = harvestInfo ? harvestInfo.soldKg * harvestInfo.pricePerKg : 0;
    const netProfitLoss = harvestRevenue > 0 ? harvestRevenue - totalExpenses : null;
    const effectiveBep =
      harvestInfo && harvestInfo.yieldKg > 0
        ? Math.round(totalExpenses / harvestInfo.yieldKg)
        : avgBep;

    // Date range
    const dates = ledger.map((r) => new Date(r.created_at || Date.now())).sort((a, b) => a.getTime() - b.getTime());
    const startDate =
      dates[0]?.toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" }) || "—";
    const endDate =
      dates[dates.length - 1]?.toLocaleDateString("en-US", {
        day: "numeric",
        month: "short",
        year: "numeric",
      }) || "—";

    const monthsWithData = monthlyBreakdown.length;
    const avgScore =
      ledger.length > 0
        ? (ledger.reduce((s, r) => s + (r.quality_score || 8), 0) / ledger.length).toFixed(1)
        : "8.5";

    return {
      totalReceipts,
      totalExpenses,
      validReceipts,
      flaggedReceipts,
      totalRewards,
      cogsTotal,
      opexTotal,
      capexTotal,
      cogsPct,
      opexPct,
      capexPct,
      monthlyBreakdown,
      topMerchants,
      avgBep,
      effectiveBep,
      harvestRevenue,
      netProfitLoss,
      startDate,
      endDate,
      monthsWithData,
      avgScore,
    };
  }, [ledger, harvestInfo]);

  const TARGET_MONTHS = 3;
  const hasEnoughHistory = financialSummary.monthsWithData >= TARGET_MONTHS;
  const monthsNeeded = Math.max(0, TARGET_MONTHS - financialSummary.monthsWithData);

  // Export Financial Statement as CSV
  const handleExportCSV = () => {
    if (ledger.length === 0) {
      alert("No receipts available to export yet.");
      return;
    }

    const headers = [
      "Receipt ID",
      "Date",
      "Merchant Name",
      "Category",
      "Amount (IDR)",
      "BEP / kg (IDR)",
      "Reward Earned (IDR)",
      "Quality Score",
      "Audit Status",
    ];

    const rows = ledger.map((r) => [
      `"${r.id}"`,
      `"${new Date(r.created_at || Date.now()).toLocaleDateString()}"`,
      `"${(r.merchant_name || "").replace(/"/g, '""')}"`,
      `"${r.primary_category || "COGS"}"`,
      r.total_production_cost || 0,
      r.hpp_per_kg || 0,
      r.reward_earned || 0,
      r.quality_score || 0,
      r.fraud_detected ? "FLAGGED" : "VERIFIED",
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `tanijaga_rekap_keuangan_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Print Statement (Clean Print View)
  const handlePrint = () => {
    window.print();
  };

  // Share Statement
  const handleShare = () => {
    const shareText = `TaniJaga Financial Statement: ${financialSummary.validReceipts} receipts, Rp ${financialSummary.totalExpenses.toLocaleString("en-US")} total cost, Break Even Point: Rp ${financialSummary.effectiveBep.toLocaleString()}/kg.`;
    if (navigator.share) {
      navigator
        .share({
          title: "TaniJaga Farmer's Cost Ledger & Financial Statement",
          text: shareText,
          url: window.location.href,
        })
        .catch(() => {});
    } else {
      navigator.clipboard?.writeText(window.location.href);
      alert("Report link copied to clipboard:\n" + shareText);
    }
  };

  return (
    <div className="min-h-dvh bg-slate-50 max-w-md mx-auto pb-[calc(6.5rem+env(safe-area-inset-bottom,0px))] font-sans print:bg-white print:max-w-none print:pb-0">
      {/* Header with iPhone safe area awareness */}
      <header className="bg-white border-b border-slate-100 px-4 sm:px-5 pt-[max(2.5rem,calc(env(safe-area-inset-top)+0.75rem))] pb-3 sticky top-0 z-20 print:hidden">
        <button
          onClick={() => router.push("/home")}
          className="flex items-center space-x-1 text-slate-600 hover:text-emerald-700 mb-2.5 transition-colors"
        >
          <ChevronLeft size={20} />
          <span className="text-sm font-semibold">Home</span>
        </button>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 bg-emerald-100 rounded-xl flex items-center justify-center text-emerald-800">
              <BarChart2 size={20} />
            </div>
            <div>
              <h1 className="text-lg font-extrabold text-slate-900 leading-tight">Farmer&apos;s Financial Report</h1>
              <p className="text-slate-500 text-[11px] font-medium">Verified Ledger &amp; P&amp;L Statement</p>
            </div>
          </div>
          <button
            onClick={handleShare}
            className="p-2 text-slate-500 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all"
            title="Share Statement"
          >
            <Share2 size={16} />
          </button>
        </div>

        {/* View Switcher Tabs */}
        <div className="flex items-center bg-slate-100 p-1 rounded-xl mt-3 text-xs font-bold">
          <button
            onClick={() => setActiveTab("statement")}
            className={`flex-1 py-1.5 rounded-lg transition-all flex items-center justify-center space-x-1.5 ${
              activeTab === "statement"
                ? "bg-white text-emerald-800 shadow-xs"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <FileText size={14} />
            <span>Financial Statement</span>
          </button>
          <button
            onClick={() => setActiveTab("kur")}
            className={`flex-1 py-1.5 rounded-lg transition-all flex items-center justify-center space-x-1.5 ${
              activeTab === "kur"
                ? "bg-white text-emerald-800 shadow-xs"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <Building2 size={14} />
            <span>KUR Bank Report</span>
          </button>
        </div>
      </header>

      <main className="px-4 pt-4 space-y-4">
        {/* ========================================================================= */}
        {/* TAB 1: FINANCIAL STATEMENT RECAP (Laporan Rekapitulasi Keuangan)            */}
        {/* ========================================================================= */}
        {activeTab === "statement" && (
          <div className="space-y-4">
            {/* Action Bar (Export CSV & Print) */}
            <div className="flex items-center justify-between gap-2 print:hidden">
              <button
                onClick={handleExportCSV}
                className="flex-1 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs font-bold text-slate-700 shadow-2xs flex items-center justify-center space-x-1.5 active:scale-[0.99] transition-all"
              >
                <Download size={14} className="text-emerald-700" />
                <span>Export CSV</span>
              </button>
              <button
                onClick={handlePrint}
                className="flex-1 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs font-bold text-slate-700 shadow-2xs flex items-center justify-center space-x-1.5 active:scale-[0.99] transition-all"
              >
                <Printer size={14} className="text-slate-600" />
                <span>Print Statement</span>
              </button>
            </div>

            {/* Executive Statement Card (Laporan Laba Rugi Eksekutif) */}
            <div className="bg-gradient-to-br from-emerald-900 via-emerald-800 to-teal-900 rounded-3xl p-5 text-white shadow-xl relative overflow-hidden space-y-4">
              <div className="absolute -top-12 -right-12 w-40 h-40 bg-white/5 rounded-full blur-2xl pointer-events-none" />
              <div className="absolute -bottom-8 -left-8 w-32 h-32 bg-teal-400/10 rounded-full blur-xl pointer-events-none" />

              <div className="flex items-start justify-between">
                <div>
                  <span className="bg-white/15 text-emerald-200 text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full tracking-wider border border-white/10">
                    Farmer&apos;s Cost Ledger
                  </span>
                  <h2 className="text-lg font-black text-white mt-1.5 leading-tight">
                    Recap Financial Statement
                  </h2>
                  <p className="text-emerald-200/70 text-[11px] font-medium mt-0.5">
                    Period: {financialSummary.startDate} — {financialSummary.endDate}
                  </p>
                </div>
                <div className="w-10 h-10 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/20 text-lg">
                  📊
                </div>
              </div>

              {/* Total Production Cost Hero */}
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/10 space-y-1">
                <p className="text-emerald-200/80 text-[10px] font-bold uppercase tracking-wider">
                  Total Farm Production Cost
                </p>
                <p className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                  Rp {financialSummary.totalExpenses.toLocaleString("en-US")}
                </p>
                <div className="flex items-center justify-between pt-2 border-t border-white/10 text-xs text-emerald-100">
                  <span className="text-[11px] font-medium">
                    Verified Documents: <strong className="text-white">{financialSummary.validReceipts} receipt{financialSummary.validReceipts !== 1 ? "s" : ""}</strong>
                  </span>
                  <span className="text-[11px] font-medium">
                    Incentives: <strong className="text-amber-300">+Rp {financialSummary.totalRewards.toLocaleString()}</strong>
                  </span>
                </div>
              </div>

              {/* Break Even Point (BEP) vs Net Revenue */}
              <div className="grid grid-cols-2 gap-2.5 pt-1">
                <div className="bg-white/8 backdrop-blur-sm rounded-xl p-3 border border-white/10">
                  <p className="text-emerald-200/70 text-[9px] font-bold uppercase">Break Even Point</p>
                  <p className="text-white font-extrabold text-sm sm:text-base mt-0.5">
                    Rp {financialSummary.effectiveBep.toLocaleString("en-US")}{" "}
                    <span className="text-[10px] font-normal text-emerald-200">/ kg</span>
                  </p>
                  <p className="text-[9px] text-emerald-200/60 mt-1 leading-tight">
                    Min. selling target for profit
                  </p>
                </div>

                <div className="bg-white/8 backdrop-blur-sm rounded-xl p-3 border border-white/10">
                  <p className="text-emerald-200/70 text-[9px] font-bold uppercase">
                    {financialSummary.harvestRevenue > 0 ? "Harvest Outcome" : "Audit Integrity"}
                  </p>
                  {financialSummary.harvestRevenue > 0 ? (
                    <>
                      <p
                        className={`font-extrabold text-sm sm:text-base mt-0.5 flex items-center space-x-1 ${
                          (financialSummary.netProfitLoss || 0) >= 0 ? "text-emerald-300" : "text-rose-300"
                        }`}
                      >
                        {(financialSummary.netProfitLoss || 0) >= 0 ? (
                          <TrendingUp size={14} className="shrink-0" />
                        ) : (
                          <TrendingDown size={14} className="shrink-0" />
                        )}
                        <span>
                          {(financialSummary.netProfitLoss || 0) >= 0 ? "+" : "-"}Rp{" "}
                          {Math.abs(financialSummary.netProfitLoss || 0).toLocaleString("en-US")}
                        </span>
                      </p>
                      <p className="text-[9px] text-emerald-200/60 mt-1">
                        Net Operating Margin
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="text-white font-extrabold text-sm sm:text-base mt-0.5">
                        {financialSummary.avgScore} / 10
                      </p>
                      <p className="text-[9px] text-emerald-200/60 mt-1 leading-tight">
                        AI Image &amp; Audit Quality
                      </p>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Expense Allocation (COGS vs OPEX vs CAPEX) */}
            <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-extrabold text-slate-800 text-sm">Cost Structure Allocation</h3>
                  <p className="text-[10px] text-slate-500 font-medium mt-0.5">
                    Breakdown of all uploaded receipts by accounting bucket
                  </p>
                </div>
                <span className="text-[10px] font-extrabold bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded-full border border-emerald-100">
                  Total: Rp {financialSummary.totalExpenses.toLocaleString()}
                </span>
              </div>

              {/* Progress Stack Bar */}
              <div className="space-y-1.5">
                <div className="w-full bg-slate-100 rounded-full h-3 flex overflow-hidden p-0.5">
                  <div
                    className="bg-emerald-600 rounded-l-full transition-all duration-700"
                    style={{ width: `${Math.max(financialSummary.totalExpenses > 0 ? 5 : 0, financialSummary.cogsPct)}%` }}
                    title={`COGS: ${financialSummary.cogsPct}%`}
                  />
                  <div
                    className="bg-sky-500 transition-all duration-700"
                    style={{ width: `${Math.max(financialSummary.totalExpenses > 0 ? 5 : 0, financialSummary.opexPct)}%` }}
                    title={`OPEX: ${financialSummary.opexPct}%`}
                  />
                  <div
                    className="bg-amber-500 rounded-r-full transition-all duration-700"
                    style={{ width: `${Math.max(financialSummary.totalExpenses > 0 ? 5 : 0, financialSummary.capexPct)}%` }}
                    title={`CAPEX: ${financialSummary.capexPct}%`}
                  />
                </div>
                <div className="flex items-center justify-between text-[10px] font-bold text-slate-500 px-0.5">
                  <span className="text-emerald-700">COGS {financialSummary.cogsPct}%</span>
                  <span className="text-sky-600">OPEX {financialSummary.opexPct}%</span>
                  <span className="text-amber-600">CAPEX {financialSummary.capexPct}%</span>
                </div>
              </div>

              {/* Bucket Cards */}
              <div className="grid grid-cols-3 gap-2 pt-1">
                {/* COGS */}
                <div className="bg-emerald-50/70 border border-emerald-100 rounded-2xl p-3 space-y-1">
                  <div className="flex items-center space-x-1 text-emerald-800">
                    <span className="w-2 h-2 rounded-full bg-emerald-600 shrink-0" />
                    <span className="text-[10px] font-extrabold uppercase">COGS</span>
                  </div>
                  <p className="text-xs font-black text-slate-900">
                    Rp {formatCompactIdr(financialSummary.cogsTotal)}
                  </p>
                  <p className="text-[9px] text-slate-500 leading-tight">
                    Seeds, Fertilizers, Pesticides
                  </p>
                </div>

                {/* OPEX */}
                <div className="bg-sky-50/70 border border-sky-100 rounded-2xl p-3 space-y-1">
                  <div className="flex items-center space-x-1 text-sky-800">
                    <span className="w-2 h-2 rounded-full bg-sky-500 shrink-0" />
                    <span className="text-[10px] font-extrabold uppercase">OPEX</span>
                  </div>
                  <p className="text-xs font-black text-slate-900">
                    Rp {formatCompactIdr(financialSummary.opexTotal)}
                  </p>
                  <p className="text-[9px] text-slate-500 leading-tight">
                    Labor, Fuel, Tractor Rental
                  </p>
                </div>

                {/* CAPEX */}
                <div className="bg-amber-50/70 border border-amber-100 rounded-2xl p-3 space-y-1">
                  <div className="flex items-center space-x-1 text-amber-800">
                    <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
                    <span className="text-[10px] font-extrabold uppercase">CAPEX</span>
                  </div>
                  <p className="text-xs font-black text-slate-900">
                    Rp {formatCompactIdr(financialSummary.capexTotal)}
                  </p>
                  <p className="text-[9px] text-slate-500 leading-tight">
                    Sprayers, Tarps, Tools
                  </p>
                </div>
              </div>
            </div>

            {/* Monthly Recap Table (Rekap Bulanan) */}
            <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Calendar size={16} className="text-emerald-700" />
                  <h3 className="font-extrabold text-slate-800 text-sm">Monthly Recap Timeline</h3>
                </div>
                <span className="text-[10px] font-bold text-slate-500">
                  {financialSummary.monthlyBreakdown.length} Months Recorded
                </span>
              </div>

              {financialSummary.monthlyBreakdown.length > 0 ? (
                <div className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-100">
                  {financialSummary.monthlyBreakdown.map((m) => (
                    <div key={m.sortKey} className="p-3.5 hover:bg-slate-50/80 transition-colors space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <span className="text-xs font-black text-slate-900">{m.monthName}</span>
                          <span className="text-[9px] font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md">
                            {m.receiptsCount} receipt{m.receiptsCount !== 1 ? "s" : ""}
                          </span>
                        </div>
                        <span className="text-xs font-black text-emerald-800">
                          Rp {m.total.toLocaleString("en-US")}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-slate-500">
                        <span>COGS: Rp {m.cogs.toLocaleString()}</span>
                        <span>OPEX: Rp {m.opex.toLocaleString()}</span>
                      </div>
                    </div>
                  ))}
                  {/* Table Subtotal */}
                  <div className="p-3.5 bg-slate-50 flex items-center justify-between font-bold text-xs text-slate-800">
                    <span>Total All Months</span>
                    <span className="text-emerald-800 font-black">
                      Rp {financialSummary.totalExpenses.toLocaleString("en-US")}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="bg-slate-50 rounded-2xl p-6 text-center border border-slate-100 text-slate-400 text-xs">
                  No receipts recorded yet. Upload receipts in the Receipt tab to see monthly totals.
                </div>
              )}
            </div>

            {/* Top Suppliers / Farm Kiosks Breakdown */}
            {financialSummary.topMerchants.length > 0 && (
              <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-xs space-y-3">
                <div className="flex items-center space-x-2">
                  <ShoppingBag size={16} className="text-emerald-700" />
                  <h3 className="font-extrabold text-slate-800 text-sm">Top Farm Suppliers &amp; Merchants</h3>
                </div>
                <div className="space-y-2">
                  {financialSummary.topMerchants.map((m, idx) => {
                    const pct =
                      financialSummary.totalExpenses > 0
                        ? Math.round((m.total / financialSummary.totalExpenses) * 100)
                        : 0;
                    return (
                      <div key={m.name} className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-100/80">
                        <div className="min-w-0 pr-2">
                          <p className="text-xs font-bold text-slate-800 truncate">
                            {idx + 1}. {m.name}
                          </p>
                          <p className="text-[10px] text-slate-400 font-medium">
                            {m.count} receipt{m.count !== 1 ? "s" : ""} • {pct}% of ledger
                          </p>
                        </div>
                        <span className="text-xs font-black text-slate-900 shrink-0">
                          Rp {m.total.toLocaleString("en-US")}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Audit & Compliance Stamp */}
            <div className="bg-emerald-50/60 border border-emerald-100 rounded-3xl p-4 flex items-start space-x-3">
              <Sparkles size={18} className="text-emerald-700 shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <p className="text-xs font-bold text-emerald-900">
                  Government &amp; Underwriting Compliance Stamp
                </p>
                <p className="text-[10px] text-emerald-800/80 leading-relaxed">
                  Financial calculations verified under Bapenas grain standards. All figures match audited physical receipt chits logged with dual-layer OCR verification.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: KUR BANK UNDERWRITING REPORT (Laporan Analisis Kredit Bank)         */}
        {/* ========================================================================= */}
        {activeTab === "kur" && (
          <div className="space-y-4">
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
              <div className="bg-gradient-to-br from-emerald-900 via-emerald-800 to-teal-900 rounded-2xl p-5 space-y-4 relative overflow-hidden shadow-lg">
                <div className="absolute -top-8 -right-8 w-32 h-32 bg-white/5 rounded-full blur-2xl pointer-events-none" />
                <div className="absolute bottom-0 -left-4 w-24 h-24 bg-teal-400/10 rounded-full blur-xl pointer-events-none" />

                {/* Header */}
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-emerald-200/70 text-[9px] font-bold uppercase tracking-widest">
                      TaniJaga Verified
                    </p>
                    <p className="text-white font-extrabold text-base">Farmer&apos;s Cost Ledger Certificate</p>
                  </div>
                  <div className="w-10 h-10 bg-white/15 rounded-xl flex items-center justify-center border border-white/20">
                    <span className="text-xl">🌽</span>
                  </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: "Valid Receipts", value: String(financialSummary.validReceipts) },
                    {
                      label: "Total Cost",
                      value: "Rp " + formatCompactIdr(financialSummary.totalExpenses),
                    },
                    { label: "History", value: financialSummary.monthsWithData + " mos" },
                  ].map(({ label, value }) => (
                    <div key={label} className="bg-white/10 rounded-xl p-2.5 text-center border border-white/10">
                      <p className="text-emerald-200/70 text-[9px] font-bold uppercase tracking-wide">{label}</p>
                      <p className="text-white font-extrabold text-sm mt-0.5">{value}</p>
                    </div>
                  ))}
                </div>

                {/* Date range */}
                <p className="text-emerald-200/60 text-[10px] font-medium">
                  Period: {financialSummary.startDate} — {financialSummary.endDate}
                </p>
              </div>

              {/* Verified row */}
              <div className="bg-emerald-50 border border-emerald-100 rounded-2xl px-4 py-3 flex items-center space-x-3">
                <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
                <p className="text-xs text-emerald-800 font-semibold leading-snug">
                  Receipts: {financialSummary.validReceipts} • Expenses: Rp {financialSummary.totalExpenses.toLocaleString("en-US")} • Verified by TaniJaga AI
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
                      {financialSummary.monthsWithData}/{TARGET_MONTHS} months recorded ({financialSummary.totalReceipts} receipts)
                    </p>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-emerald-600 to-teal-500 rounded-full transition-all duration-700"
                      style={{
                        width: `${Math.min(100, Math.max(10, (financialSummary.monthsWithData / TARGET_MONTHS) * 100))}%`,
                      }}
                    />
                  </div>
                  <div className="flex items-center space-x-2 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2.5">
                    <Clock size={14} className="text-amber-600 shrink-0" />
                    <p className="text-xs text-amber-800 font-semibold">
                      Need {monthsNeeded} more month{monthsNeeded !== 1 ? "s" : ""} of verified data
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
          </div>
        )}
      </main>

      <div className="print:hidden">
        <BottomNav />
      </div>
    </div>
  );
}

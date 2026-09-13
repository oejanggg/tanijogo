"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronLeft, Receipt as ReceiptIcon, AlertCircle, ChevronDown,
  ChevronUp, CheckSquare, Square, Trash2, Tag, Check, X,
  Upload, Layers, Loader2, Sparkles
} from "lucide-react";
import { useProtected } from "../lib/use-protected";
import BottomNav from "../components/BottomNav";
import {
  fetchAllReceipts,
  bulkUpdateLedgerReceipts,
  bulkDeleteLedgerReceipts,
  clearAllReceipts,
  LedgerItem
} from "../lib/ledger-storage";

const CATEGORY_STYLE: Record<string, { bg: string; text: string; emoji: string }> = {
  corn: { bg: "bg-amber-100", text: "text-amber-800", emoji: "🌽" },
  jagung: { bg: "bg-amber-100", text: "text-amber-800", emoji: "🌽" },
  chili: { bg: "bg-red-100", text: "text-red-800", emoji: "🌶️" },
  cabai: { bg: "bg-red-100", text: "text-red-800", emoji: "🌶️" },
  rice: { bg: "bg-emerald-100", text: "text-emerald-800", emoji: "🌾" },
  padi: { bg: "bg-emerald-100", text: "text-emerald-800", emoji: "🌾" },
  gabah: { bg: "bg-emerald-100", text: "text-emerald-800", emoji: "🌾" },
  seed: { bg: "bg-emerald-100", text: "text-emerald-800", emoji: "🌱" },
  fertilizer: { bg: "bg-emerald-100", text: "text-emerald-800", emoji: "🌱" },
  urea: { bg: "bg-emerald-100", text: "text-emerald-800", emoji: "🌱" },
  phonska: { bg: "bg-emerald-100", text: "text-emerald-800", emoji: "🌱" },
  pesticide: { bg: "bg-teal-100", text: "text-teal-800", emoji: "🧪" },
  herbicide: { bg: "bg-teal-100", text: "text-teal-800", emoji: "🧪" },
  fuel: { bg: "bg-amber-100", text: "text-amber-800", emoji: "⚡" },
  electricity: { bg: "bg-amber-100", text: "text-amber-800", emoji: "⚡" },
  labor: { bg: "bg-blue-100", text: "text-blue-800", emoji: "👷" },
  tillage: { bg: "bg-blue-100", text: "text-blue-800", emoji: "🚜" },
  tools: { bg: "bg-purple-100", text: "text-purple-800", emoji: "🔧" },
  equipment: { bg: "bg-purple-100", text: "text-purple-800", emoji: "⚙️" },
  sheller: { bg: "bg-amber-100", text: "text-amber-800", emoji: "🌽" },
};

const FARM_CATEGORIES = [
  "Hybrid Corn Seeds (BISI / Pioneer)",
  "Red Chili Seeds & Seedlings",
  "Certified Rice Seeds (Ciherang / Inpari)",
  "Urea & NPK Fertilizer",
  "Pesticide & Crop Protection",
  "Tractor Land Tillage Labor",
  "Planting & Harvesting Labor",
  "Machinery & Post-Harvest Shelling",
  "Diesel Fuel & Transport",
];

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

  // Bulk selection state
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);

  const loadReceipts = async () => {
    const data = await fetchAllReceipts(user?.id);
    setLedger(data);
  };

  useEffect(() => {
    loadReceipts();
  }, [user]);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedIds.length === ledger.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(ledger.map((r) => r.id));
    }
  };

  const handleBulkUpdateCategory = async (newCategory: string) => {
    if (selectedIds.length === 0) return;
    setActionLoading(true);
    await bulkUpdateLedgerReceipts(selectedIds, { primary_category: newCategory });
    await loadReceipts();
    setActionLoading(false);
    setShowCategoryModal(false);
    setNotification(`Updated category for ${selectedIds.length} receipts to "${newCategory}"`);
    setSelectedIds([]);
    setSelectMode(false);
    setTimeout(() => setNotification(null), 3000);
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    if (!window.confirm(`Are you sure you want to delete ${selectedIds.length} receipt(s)?`)) return;

    setActionLoading(true);
    await bulkDeleteLedgerReceipts(selectedIds);
    await loadReceipts();
    setActionLoading(false);
    setNotification(`Deleted ${selectedIds.length} receipts.`);
    setSelectedIds([]);
    setSelectMode(false);
    setTimeout(() => setNotification(null), 3000);
  };

  const handleResetAll = async () => {
    if (!window.confirm("Are you sure you want to reset and delete ALL records from this account?")) return;
    setActionLoading(true);
    await clearAllReceipts(user?.id);
    await loadReceipts();
    setActionLoading(false);
    setNotification("All receipts have been reset.");
    setSelectedIds([]);
    setSelectMode(false);
    setTimeout(() => setNotification(null), 3000);
  };

  const totalExpenses = ledger.reduce((s, r) => s + (r.total_production_cost || 0), 0);
  const totalReward = ledger.reduce((s, r) => s + (r.reward_earned || 0), 0);
  const grouped = groupByMonth(ledger);

  const selectedTotalCost = ledger
    .filter((r) => selectedIds.includes(r.id))
    .reduce((s, r) => s + (r.total_production_cost || 0), 0);

  return (
    <div className="min-h-dvh bg-slate-50 max-w-md mx-auto pb-[calc(7.5rem+env(safe-area-inset-bottom,0px))] font-sans relative">
      {/* Header with iPhone safe area awareness */}
      <header className="bg-white border-b border-slate-100 px-4 sm:px-5 pt-[max(2.5rem,calc(env(safe-area-inset-top)+0.75rem))] pb-4 sticky top-0 z-20">
        <div className="flex items-center justify-between mb-3">
          <button onClick={() => router.push("/home")} className="flex items-center space-x-1 text-slate-600 hover:text-emerald-700 transition-colors">
            <ChevronLeft size={22} />
            <span className="text-sm font-semibold">Home</span>
          </button>
          {ledger.length > 0 && (
            <div className="flex items-center space-x-1.5">
              <button
                onClick={handleResetAll}
                className="px-2.5 py-1 rounded-xl text-xs font-bold transition-all text-red-600 bg-red-50 hover:bg-red-100 border border-red-200/60 flex items-center space-x-1"
                title="Reset all receipts"
              >
                <Trash2 size={12} />
                <span>Reset All</span>
              </button>
              <button
                onClick={() => {
                  setSelectMode(!selectMode);
                  setSelectedIds([]);
                }}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${
                  selectMode
                    ? "bg-slate-900 text-white"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                {selectMode ? "Cancel Select" : "Bulk Update"}
              </button>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-center space-x-1.5">
              <h1 className="text-xl font-extrabold text-slate-900 truncate">Receipts Ledger</h1>
              <span className="text-xs shrink-0">📋</span>
            </div>
            <p className="text-slate-500 text-xs font-medium mt-0.5 truncate">Verified farm production records</p>
          </div>
          <div className="text-right shrink-0">
            <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">Total Expenses</p>
            <p className="font-black text-slate-900 text-sm whitespace-nowrap">Rp {totalExpenses.toLocaleString("en-US")}</p>
            <p className="text-[10px] text-emerald-600 font-bold whitespace-nowrap">{ledger.length} items · +Rp {totalReward.toLocaleString("en-US")}</p>
          </div>
        </div>

        {/* Select Mode Bar */}
        {selectMode && (
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between">
            <button
              onClick={handleSelectAll}
              className="flex items-center space-x-1.5 text-xs font-bold text-emerald-700 hover:text-emerald-800"
            >
              {selectedIds.length === ledger.length ? <CheckSquare size={16} /> : <Square size={16} />}
              <span>{selectedIds.length === ledger.length ? "Deselect All" : "Select All"}</span>
            </button>
            <span className="text-xs font-extrabold text-slate-700">
              {selectedIds.length} of {ledger.length} selected
            </span>
          </div>
        )}
      </header>

      {/* Notification Toast */}
      {notification && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 w-11/12 max-w-sm bg-slate-900 text-white text-xs font-bold py-2.5 px-4 rounded-2xl shadow-xl z-50 flex items-center justify-between animate-fade-in">
          <span>{notification}</span>
          <button onClick={() => setNotification(null)} className="text-slate-400 hover:text-white">
            <X size={14} />
          </button>
        </div>
      )}

      <main className="px-3.5 sm:px-4 pt-4 space-y-6">
        {ledger.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 space-y-3">
            <div className="w-16 h-16 bg-slate-100 rounded-3xl flex items-center justify-center">
              <ReceiptIcon size={32} className="text-slate-400" />
            </div>
            <p className="font-bold text-slate-700 text-base">No receipts recorded yet</p>
            <p className="text-slate-500 text-xs text-center max-w-[220px] leading-relaxed">
              Upload single or bulk farm expense receipts to build your audit ledger.
            </p>
            <button
              onClick={() => router.push("/home")}
              className="bg-emerald-700 text-white px-6 py-3 rounded-2xl font-bold text-sm mt-2 hover:bg-emerald-800 transition-colors shadow-md shadow-emerald-600/20"
            >
              Upload Receipts
            </button>
          </div>
        ) : (
          Object.entries(grouped).map(([month, rows]) => {
            const monthTotal = rows.reduce((s, r) => s + (r.reward_earned || 0), 0);
            const monthCost = rows.reduce((s, r) => s + (r.total_production_cost || 0), 0);
            return (
              <div key={month} className="space-y-2.5">
                <div className="flex items-center justify-between px-1 gap-2">
                  <h2 className="font-extrabold text-slate-800 text-sm truncate">{month}</h2>
                  <div className="text-right shrink-0">
                    <p className="text-[10px] text-slate-500 font-semibold whitespace-nowrap">
                      Cost: Rp {monthCost.toLocaleString("en-US")} · {rows.length} receipts
                    </p>
                    <p className="text-[10px] text-emerald-600 font-bold whitespace-nowrap">
                      Incentive: +Rp {monthTotal.toLocaleString("en-US")}
                    </p>
                  </div>
                </div>

                {rows.map((row) => {
                  const catStyle = getCategoryStyle(row.primary_category);
                  const date = new Date(row.created_at || Date.now());
                  const isOpen = expanded === row.id;
                  const isSelected = selectedIds.includes(row.id);

                  return (
                    <div
                      key={row.id}
                      className={`bg-white rounded-2xl border transition-all overflow-hidden ${
                        isSelected ? "border-emerald-500 ring-2 ring-emerald-500/20 shadow-sm" : "border-slate-100 shadow-xs"
                      }`}
                    >
                      <div className="flex items-center">
                        {selectMode && (
                          <div
                            onClick={() => toggleSelect(row.id)}
                            className="pl-3 pr-0 py-3.5 cursor-pointer text-emerald-600 hover:text-emerald-700 shrink-0"
                          >
                            {isSelected ? <CheckSquare size={19} /> : <Square size={19} className="text-slate-300" />}
                          </div>
                        )}

                        <button
                          className="flex-1 flex items-center p-3 sm:p-4 text-left hover:bg-slate-50/50 transition-colors gap-2.5 min-w-0"
                          onClick={() => {
                            if (selectMode) {
                              toggleSelect(row.id);
                            } else {
                              setExpanded(isOpen ? null : row.id);
                            }
                          }}
                        >
                          <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center shrink-0 border border-slate-200 text-xl">
                            {catStyle.emoji}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-slate-900 text-xs sm:text-sm truncate">{row.merchant_name || "Farm Supplier"}</p>
                            <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                              <span className={"text-[9px] sm:text-[10px] font-bold px-1.5 py-0.5 rounded-md truncate max-w-[130px] sm:max-w-[180px] " + catStyle.bg + " " + catStyle.text}>
                                {(row.primary_category || "Farm Input").replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                              </span>
                              <span className="text-[9px] sm:text-[10px] text-slate-400 font-medium whitespace-nowrap">
                                {date.toLocaleDateString("en-US", { day: "numeric", month: "short" })}
                              </span>
                              {row.fraud_detected && (
                                <span className="text-[9px] text-red-600 font-bold flex items-center space-x-0.5 shrink-0">
                                  <AlertCircle size={9} /><span>Rejected</span>
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="text-right shrink-0 pl-1.5 space-y-0.5">
                            <p className="font-extrabold text-slate-900 text-xs sm:text-sm whitespace-nowrap">
                              Rp {(row.total_production_cost || 0).toLocaleString("en-US")}
                            </p>
                            <p className={"text-[10px] font-bold whitespace-nowrap " + (row.reward_earned > 0 ? "text-emerald-600" : "text-red-500")}>
                              {row.reward_earned > 0 ? "+" : ""}Rp {(row.reward_earned || 0).toLocaleString("en-US")}
                            </p>
                            {!selectMode && (
                              isOpen ? <ChevronUp size={12} className="text-slate-400 ml-auto" /> : <ChevronDown size={12} className="text-slate-400 ml-auto" />
                            )}
                          </div>
                        </button>
                      </div>

                      {/* Expandable details & transcript */}
                      {isOpen && !selectMode && (
                        <div className="px-4 pb-4 space-y-2.5 border-t border-slate-100 pt-3">
                          {row.hpp_per_kg > 0 && (
                            <div className="bg-amber-50 rounded-xl px-3 py-2 flex items-center justify-between border border-amber-100">
                              <span className="text-xs text-amber-800 font-semibold">BEP / kg</span>
                              <span className="text-xs font-extrabold text-amber-900">Rp {row.hpp_per_kg.toLocaleString("en-US")}</span>
                            </div>
                          )}
                          {row.voice_transcript ? (
                            <div className="bg-purple-50 rounded-xl px-3 py-2.5 border border-purple-100">
                              <p className="text-[10px] text-purple-700 font-bold uppercase tracking-wider mb-1">AI Voice Brief Transcript</p>
                              <p className="text-xs text-purple-900 italic leading-relaxed">&ldquo;{row.voice_transcript}&rdquo;</p>
                            </div>
                          ) : (
                            <p className="text-[10px] text-slate-400 font-medium text-center py-1">Standard verified farm record</p>
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

      {/* Floating Bulk Action Bar */}
      {selectMode && selectedIds.length > 0 && (
        <div className="fixed bottom-16 left-1/2 -translate-x-1/2 w-full max-w-md px-4 z-40">
          <div className="bg-slate-900 text-white rounded-2xl p-3.5 shadow-2xl border border-slate-700 flex items-center justify-between">
            <div>
              <p className="text-xs font-extrabold">{selectedIds.length} Selected</p>
              <p className="text-[10px] text-slate-400">Total: Rp {selectedTotalCost.toLocaleString()}</p>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setShowCategoryModal(true)}
                disabled={actionLoading}
                className="bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-2 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-colors"
              >
                <Tag size={13} />
                <span>Update Category</span>
              </button>
              <button
                onClick={handleBulkDelete}
                disabled={actionLoading}
                className="bg-red-500/20 hover:bg-red-500/30 text-red-300 px-3 py-2 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-colors"
              >
                <Trash2 size={13} />
                <span>Delete</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Category Selection Modal */}
      {showCategoryModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl max-w-sm w-full p-5 space-y-4 shadow-2xl animate-scale-up">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-extrabold text-slate-900 text-sm">Bulk Update Category</h3>
                <p className="text-[11px] text-slate-500 font-medium">Assign new category for {selectedIds.length} receipts</p>
              </div>
              <button onClick={() => setShowCategoryModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
              {FARM_CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  onClick={() => handleBulkUpdateCategory(cat)}
                  className="w-full text-left p-3 rounded-xl hover:bg-emerald-50 hover:text-emerald-900 text-xs font-bold text-slate-700 transition-colors flex items-center justify-between group border border-slate-100"
                >
                  <span>{cat}</span>
                  <Check size={14} className="opacity-0 group-hover:opacity-100 text-emerald-600" />
                </button>
              ))}
            </div>

            <button
              onClick={() => setShowCategoryModal(false)}
              className="w-full bg-slate-100 text-slate-600 py-2.5 rounded-xl font-bold text-xs hover:bg-slate-200"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  );
}

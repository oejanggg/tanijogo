"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, Check, X, Delete } from "lucide-react";

const CATEGORIES = [
  { id: "seed", emoji: "🌱", title: "Seed and Fertilizer", desc: "Impacts planting inputs", color: "emerald" },
  { id: "fuel", emoji: "⚡", title: "Fuel and Electricity", desc: "Energy and operating costs", color: "amber" },
  { id: "labor", emoji: "👷", title: "Labor", desc: "Crew and wages", color: "blue" },
  { id: "tools", emoji: "🔧", title: "Tools and Equipment", desc: "Equipment & infrastructure", color: "purple" },
];

const catColors: Record<string, { bg: string; border: string; label: string; dot: string }> = {
  emerald: { bg: "bg-emerald-50", border: "border-emerald-300", label: "text-emerald-800", dot: "bg-emerald-500" },
  amber: { bg: "bg-amber-50", border: "border-amber-300", label: "text-amber-800", dot: "bg-amber-500" },
  blue: { bg: "bg-blue-50", border: "border-blue-300", label: "text-blue-800", dot: "bg-blue-500" },
  purple: { bg: "bg-purple-50", border: "border-purple-300", label: "text-purple-800", dot: "bg-purple-500" },
};

export default function ConfirmPage() {
  const router = useRouter();
  const [result, setResult] = useState<any>(null);
  const [amount, setAmount] = useState(0);
  const [showKeypad, setShowKeypad] = useState(false);
  const [keypadVal, setKeypadVal] = useState("");
  const [selectedCat, setSelectedCat] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);

  useEffect(() => {
    const raw = sessionStorage.getItem("auditResult");
    if (raw) {
      const data = JSON.parse(raw);
      setResult(data);
      const fin = data.financials || {};
      const rec = data.transaction_record || data.evaluation || {};
      setAmount(fin.total_production_cost || rec.total_production_cost_idr || 0);
    }
  }, []);

  const handleKeypad = (key: string) => {
    if (key === "DEL") setKeypadVal((v) => v.slice(0, -1));
    else if (key === "OK") {
      if (keypadVal) setAmount(parseInt(keypadVal.replace(/\D/g, ""), 10) || 0);
      setShowKeypad(false);
    } else setKeypadVal((v) => (v + key).slice(0, 10));
  };

  const handleConfirm = () => {
    setConfirmed(true);
    sessionStorage.setItem("confirmedCategory", selectedCat || "");
    setTimeout(() => router.push("/home"), 700);
  };

  return (
    <div className="min-h-screen bg-slate-50 max-w-md mx-auto pb-10 font-sans relative">
      {/* Header */}
      <header className="bg-white border-b border-slate-100 px-5 pt-12 pb-4">
        <button onClick={() => router.back()} className="flex items-center space-x-1 text-slate-600 hover:text-emerald-700 mb-3 transition-colors">
          <ChevronLeft size={22} />
          <span className="text-sm font-semibold">Photo Verdict</span>
        </button>
        <h1 className="text-xl font-extrabold text-slate-900">Confirm & Classify</h1>
        <p className="text-slate-500 text-xs font-medium mt-0.5">
          We&#39;ll use this amount to update your break-even price.
        </p>
      </header>

      <main className="px-4 pt-5 space-y-5">
        {/* Amount Confirmation */}
        <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-xs space-y-4">
          <p className="font-bold text-slate-700 text-sm">Is this the total?</p>
          <p className="text-[11px] text-slate-500 font-medium">Use this total?</p>

          {/* Big Amount Display */}
          <div className="text-center py-6">
            <p className="text-5xl font-black text-slate-900 tracking-tight">
              Rp {amount.toLocaleString("id-ID")}
            </p>
            <p className="text-slate-400 text-xs font-medium mt-1">Total yang terdeteksi AI</p>
          </div>

          {/* Extracted amount row */}
          <div className="bg-slate-50 rounded-2xl px-4 py-3 border border-slate-100 flex items-center justify-between">
            <div>
              <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wide">Extracted amount</p>
              <p className="font-extrabold text-slate-800 text-sm mt-0.5">Rp {amount.toLocaleString("id-ID")}</p>
            </div>
            <div className="flex items-center space-x-2">
              <button onClick={() => { setConfirmed(false); }}
                className="w-7 h-7 bg-emerald-100 rounded-xl flex items-center justify-center hover:bg-emerald-200 transition-colors">
                <Check size={14} className="text-emerald-700" />
              </button>
              <button onClick={() => setShowKeypad(true)}
                className="w-7 h-7 bg-red-50 rounded-xl flex items-center justify-center hover:bg-red-100 transition-colors">
                <X size={14} className="text-red-600" />
              </button>
            </div>
          </div>

          {/* Action buttons */}
          <div className="grid grid-cols-2 gap-3 pt-1">
            <button
              onClick={() => setShowKeypad(true)}
              className="py-3.5 rounded-2xl border border-slate-200 text-slate-700 font-bold text-sm hover:bg-slate-50 active:scale-[0.99] transition-all"
            >
              Fix
            </button>
            <button
              onClick={handleConfirm}
              disabled={!selectedCat}
              className="py-3.5 rounded-2xl bg-slate-900 text-white font-extrabold text-sm hover:bg-slate-800 disabled:opacity-50 active:scale-[0.99] transition-all shadow-lg"
            >
              Yes, it&#39;s the total
            </button>
          </div>
        </div>

        {/* Category Classification */}
        <div className="space-y-3">
          <div className="px-1">
            <p className="font-extrabold text-slate-800 text-sm">What was this for?</p>
            <p className="text-[11px] text-slate-500 font-medium mt-0.5">Pilih kategori pengeluaran</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {CATEGORIES.map(({ id, emoji, title, desc, color }) => {
              const c = catColors[color];
              const isSelected = selectedCat === id;
              return (
                <button
                  key={id}
                  onClick={() => setSelectedCat(id)}
                  className={"p-4 rounded-2xl border-2 text-left space-y-2 transition-all duration-200 active:scale-[0.97] " +
                    (isSelected ? c.bg + " " + c.border + " shadow-sm" : "bg-white border-slate-100 hover:border-slate-200")}
                >
                  <div className="flex items-center space-x-1.5">
                    <span className="text-xl">{emoji}</span>
                    {isSelected && <span className={"w-2 h-2 rounded-full " + c.dot} />}
                  </div>
                  <div>
                    <p className={"text-xs font-extrabold leading-tight " + (isSelected ? c.label : "text-slate-800")}>
                      {title}
                    </p>
                    <p className="text-[10px] text-slate-500 font-medium mt-0.5 leading-snug">{desc}</p>
                  </div>
                </button>
              );
            })}
          </div>
          {!selectedCat && (
            <p className="text-[11px] text-slate-400 font-medium text-center">Pilih kategori untuk melanjutkan</p>
          )}
        </div>

        {/* Confirm button */}
        <button
          onClick={handleConfirm}
          disabled={!selectedCat}
          className="w-full bg-gradient-to-r from-emerald-700 to-teal-600 text-white py-4 rounded-2xl font-extrabold text-sm hover:from-emerald-800 hover:to-teal-700 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.99] transition-all shadow-lg shadow-emerald-600/25 flex items-center justify-center space-x-2"
        >
          {confirmed ? (
            <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /><span>Menyimpan...</span></>
          ) : (
            <span>✓ Konfirmasi & Simpan</span>
          )}
        </button>
      </main>

      {/* Numeric Keypad Overlay */}
      {showKeypad && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-end justify-center">
          <div className="bg-white rounded-t-3xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-extrabold text-slate-900">Enter the total</h2>
              <button onClick={() => setShowKeypad(false)} className="text-slate-400 hover:text-red-500">
                <X size={22} />
              </button>
            </div>
            <p className="text-[11px] text-slate-500 font-medium">Use this keypad. No keyboard input.</p>

            {/* Display */}
            <div className="bg-slate-50 rounded-2xl px-5 py-4 text-right border border-slate-200">
              <p className="text-3xl font-black text-slate-900 tracking-tight">
                Rp {keypadVal ? parseInt(keypadVal, 10).toLocaleString("id-ID") : "0"}
              </p>
            </div>

            {/* Keys */}
            <div className="grid grid-cols-3 gap-2.5">
              {["1","2","3","4","5","6","7","8","9","000","0","DEL"].map((key) => (
                <button
                  key={key}
                  onClick={() => handleKeypad(key)}
                  className={"py-4 rounded-2xl font-extrabold text-lg transition-all active:scale-95 " +
                    (key === "DEL" ? "bg-red-50 text-red-600 hover:bg-red-100" :
                     key === "000" ? "bg-slate-100 text-slate-700 hover:bg-slate-200" :
                     "bg-slate-100 text-slate-900 hover:bg-slate-200")}
                >
                  {key === "DEL" ? <Delete size={20} className="mx-auto" /> : key}
                </button>
              ))}
            </div>
            <button
              onClick={() => handleKeypad("OK")}
              className="w-full bg-gradient-to-r from-emerald-700 to-teal-600 text-white py-4 rounded-2xl font-extrabold text-base shadow-lg shadow-emerald-600/25 active:scale-[0.99] transition-all"
            >
              Konfirmasi Jumlah
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

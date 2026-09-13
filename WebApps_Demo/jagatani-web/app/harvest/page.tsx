"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, TrendingUp, TrendingDown, Sprout } from "lucide-react";
import BottomNav from "../components/BottomNav";

export default function HarvestPage() {
  const router = useRouter();
  const [yieldKg, setYieldKg] = useState("");
  const [soldKg, setSoldKg] = useState("");
  const [pricePerKg, setPricePerKg] = useState("");
  const [hppPerKg, setHppPerKg] = useState<number | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const h = localStorage.getItem("lastHpp");
    if (h) setHppPerKg(parseFloat(h));
    const y = localStorage.getItem("yieldKg");
    if (y) setYieldKg(y);
  }, []);

  const yieldNum = parseFloat(yieldKg) || 0;
  const soldNum = parseFloat(soldKg) || 0;
  const priceNum = parseFloat(pricePerKg) || 0;

  const actualRevenue = soldNum * priceNum;
  const breakEvenRevenue = yieldNum * (hppPerKg || 0);
  const profitLoss = actualRevenue - breakEvenRevenue;
  const isProfitable = profitLoss >= 0;
  const hasResult = yieldNum > 0 && soldNum > 0 && priceNum > 0;

  const handleSave = () => {
    localStorage.setItem("yieldKg", yieldKg);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="min-h-screen bg-slate-50 max-w-md mx-auto pb-24 font-sans">
      {/* Header */}
      <header className="bg-white border-b border-slate-100 px-5 pt-12 pb-4">
        <button onClick={() => router.push("/home")} className="flex items-center space-x-1 text-slate-600 hover:text-emerald-700 mb-3 transition-colors">
          <ChevronLeft size={22} />
          <span className="text-sm font-semibold">Home</span>
        </button>
        <div className="flex items-center space-x-2.5">
          <div className="w-9 h-9 bg-emerald-100 rounded-xl flex items-center justify-center">
            <Sprout size={20} className="text-emerald-700" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-slate-900">Harvest & Yield</h1>
            <p className="text-slate-500 text-xs font-medium">Update data panen kamu</p>
          </div>
        </div>
      </header>

      <main className="px-4 pt-5 space-y-4">
        {/* Input Form */}
        <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-xs space-y-4">
          <div>
            <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-1.5">
              Perkiraan hasil panen (Kg) *
            </label>
            <input
              type="number"
              placeholder="Masukkan jumlah Kg"
              value={yieldKg}
              onChange={(e) => setYieldKg(e.target.value)}
              className="w-full border border-slate-200 bg-slate-50/50 rounded-xl px-4 py-3.5 text-sm font-semibold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400 transition-all"
            />
            <p className="text-[10px] text-slate-400 font-medium mt-1">This number determines the break-even price.</p>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-1.5">
              Kg yang terjual setelah panen
            </label>
            <input
              type="number"
              placeholder="kg sold"
              value={soldKg}
              onChange={(e) => setSoldKg(e.target.value)}
              className="w-full border border-slate-200 bg-slate-50/50 rounded-xl px-4 py-3.5 text-sm font-semibold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400 transition-all"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-1.5">
              Harga jual (total atau per Kg)
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-semibold text-sm">Rp</span>
              <input
                type="number"
                placeholder="0"
                value={pricePerKg}
                onChange={(e) => setPricePerKg(e.target.value)}
                className="w-full border border-slate-200 bg-slate-50/50 rounded-xl pl-10 pr-4 py-3.5 text-sm font-semibold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400 transition-all"
              />
            </div>
            <p className="text-[10px] text-slate-400 font-medium mt-1">e.g. Rp 3.50 per kg atau total penjualan</p>
          </div>

          <button
            onClick={handleSave}
            disabled={!yieldKg}
            className="w-full bg-gradient-to-r from-emerald-700 to-teal-600 text-white py-3.5 rounded-2xl font-extrabold text-sm hover:from-emerald-800 hover:to-teal-700 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.99] transition-all shadow-lg shadow-emerald-600/25"
          >
            {saved ? "✓ Tersimpan!" : "Simpan & Hitung Break-even"}
          </button>
        </div>

        {/* Season Result */}
        <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-xs space-y-3">
          <div>
            <h2 className="font-extrabold text-slate-800 text-sm">Season result</h2>
            <p className="text-[10px] text-slate-500 font-medium mt-0.5">Break-even vs actual outcome</p>
          </div>

          {hasResult ? (
            <div className={"rounded-2xl p-4 border space-y-3 " + (isProfitable ? "bg-emerald-50 border-emerald-200" : "bg-red-50 border-red-200")}>
              <div className="flex items-center space-x-2">
                {isProfitable ? (
                  <TrendingUp size={22} className="text-emerald-700" />
                ) : (
                  <TrendingDown size={22} className="text-red-600" />
                )}
                <p className={"font-extrabold text-base " + (isProfitable ? "text-emerald-900" : "text-red-800")}>
                  {isProfitable ? "✅ Musim ini UNTUNG!" : "⚠️ Musim ini RUGI"}
                </p>
              </div>

              <div className="space-y-2">
                {[
                  { label: "Pendapatan aktual", value: actualRevenue, color: isProfitable ? "text-emerald-800" : "text-red-700" },
                  { label: "Break-even target", value: breakEvenRevenue, color: "text-slate-700" },
                  { label: isProfitable ? "Keuntungan bersih" : "Kerugian", value: Math.abs(profitLoss), color: isProfitable ? "text-emerald-700" : "text-red-600" },
                ].map(({ label, value, color }) => (
                  <div key={label} className="flex items-center justify-between py-1.5 border-b border-white/60 last:border-0">
                    <span className="text-xs font-semibold text-slate-600">{label}</span>
                    <span className={"font-extrabold text-sm " + color}>
                      {isProfitable && label.includes("Keuntungan") ? "+" : ""}
                      {!isProfitable && label.includes("Kerugian") ? "-" : ""}
                      Rp {value.toLocaleString("id-ID")}
                    </span>
                  </div>
                ))}
              </div>

              <div className={"text-center py-3 rounded-xl font-extrabold text-sm " + (isProfitable ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800")}>
                {isProfitable
                  ? `🎉 Kamu untung Rp ${profitLoss.toLocaleString("id-ID")} musim ini!`
                  : `Rugi Rp ${Math.abs(profitLoss).toLocaleString("id-ID")} — naikkan harga jual!`}
              </div>
            </div>
          ) : (
            <div className="bg-slate-50 border border-dashed border-slate-200 rounded-2xl p-8 text-center space-y-2">
              <p className="text-slate-400 text-sm font-semibold">Isi data panen di atas</p>
              <p className="text-slate-400 text-xs font-medium">Hasil musim tanam akan muncul di sini</p>
            </div>
          )}
        </div>

        {hasResult && (
          <div className="bg-slate-50 rounded-2xl px-4 py-3 border border-slate-200 flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-700">Did this season make or lose money?</p>
            <span className={"font-extrabold text-sm " + (isProfitable ? "text-emerald-600" : "text-red-600")}>
              {isProfitable ? "Made" : "Lost"} — Rp {Math.abs(profitLoss).toLocaleString("id-ID")}
            </span>
          </div>
        )}
      </main>
      <BottomNav />
    </div>
  );
}

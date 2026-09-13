"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, TrendingUp, TrendingDown, Sprout, Loader2, CheckCircle2 } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { useProtected } from "../lib/use-protected";
import BottomNav from "../components/BottomNav";

export default function HarvestPage() {
  const router = useRouter();
  const { user } = useProtected();

  const [yieldKg, setYieldKg] = useState("");
  const [soldKg, setSoldKg] = useState("");
  const [pricePerKg, setPricePerKg] = useState("");
  const [hppPerKg, setHppPerKg] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const h = localStorage.getItem("lastHpp");
    if (h) setHppPerKg(parseFloat(h));
    const y = localStorage.getItem("yieldKg");
    if (y) setYieldKg(y);

    if (user) {
      // Load latest harvest record from Supabase if available
      supabase
        .from("harvest_records")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .then(({ data, error }) => {
          if (data && data.length > 0) {
            const r = data[0];
            if (r.yield_kg) setYieldKg(String(r.yield_kg));
            if (r.sold_kg) setSoldKg(String(r.sold_kg));
            if (r.price_per_kg) setPricePerKg(String(r.price_per_kg));
          }
        });
    }
  }, [user]);

  const yieldNum = parseFloat(yieldKg) || 0;
  const soldNum = parseFloat(soldKg) || 0;
  const priceNum = parseFloat(pricePerKg) || 0;

  const actualRevenue = soldNum * priceNum;
  const breakEvenRevenue = yieldNum * (hppPerKg || 0);
  const profitLoss = actualRevenue - breakEvenRevenue;
  const isProfitable = profitLoss >= 0;
  const hasResult = yieldNum > 0 && soldNum > 0 && priceNum > 0;

  const handleSave = async () => {
    localStorage.setItem("yieldKg", yieldKg);
    setSaving(true);

    if (user) {
      try {
        await supabase.from("harvest_records").insert([
          {
            user_id: user.id,
            yield_kg: yieldNum,
            sold_kg: soldNum,
            price_per_kg: priceNum,
            season_profit: profitLoss,
            is_profitable: isProfitable,
          },
        ]);
      } catch (e) {
        console.warn("Could not save to harvest_records table:", e);
      }
    }

    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
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
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 bg-amber-100 rounded-xl flex items-center justify-center text-lg">
              🌽
            </div>
            <div>
              <h1 className="text-xl font-extrabold text-slate-900">Corn Harvest &amp; Yield</h1>
              <p className="text-slate-500 text-xs font-medium">TaniJaga Dried Corn (Jagung Pipil) Calculator</p>
            </div>
          </div>
          <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
            Standard: 15% Moisture
          </span>
        </div>
      </header>

      <main className="px-4 pt-5 space-y-4">
        {/* Corn Benchmark Banner */}
        <div className="bg-amber-50 rounded-2xl p-3.5 border border-amber-200/80 flex items-start space-x-2.5">
          <span className="text-base">💡</span>
          <div>
            <p className="text-xs font-bold text-amber-900">National Corn Benchmark: Rp 5,500 / kg</p>
            <p className="text-[10px] text-amber-700 leading-relaxed mt-0.5">
              Government reference price (HAP) for dry corn kernels. Enter your harvest numbers below to ensure your sale price stays safely above your HPP.
            </p>
          </div>
        </div>

        {/* Input Form */}
        <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-xs space-y-4">
          <div>
            <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-1.5">
              Estimated Corn Harvest Yield (Kg) *
            </label>
            <input
              type="number"
              placeholder="e.g. 5000"
              value={yieldKg}
              onChange={(e) => setYieldKg(e.target.value)}
              className="w-full border border-slate-200 bg-slate-50/50 rounded-xl px-4 py-3.5 text-sm font-semibold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400 transition-all"
            />
            <p className="text-[10px] text-slate-400 font-medium mt-1">
              Standard yield for 1 hectare hybrid corn (BISI/Pioneer) is ~5,000 kg.
            </p>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-1.5">
              Kg Corn Sold After Drying
            </label>
            <input
              type="number"
              placeholder="e.g. 4800"
              value={soldKg}
              onChange={(e) => setSoldKg(e.target.value)}
              className="w-full border border-slate-200 bg-slate-50/50 rounded-xl px-4 py-3.5 text-sm font-semibold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400 transition-all"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-1.5">
              Corn Selling Price (per Kg)
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-semibold text-sm">
                Rp
              </span>
              <input
                type="number"
                placeholder="e.g. 5500"
                value={pricePerKg}
                onChange={(e) => setPricePerKg(e.target.value)}
                className="w-full border border-slate-200 bg-slate-50/50 rounded-xl pl-10 pr-4 py-3.5 text-sm font-semibold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400 transition-all"
              />
            </div>
            <p className="text-[10px] text-slate-400 font-medium mt-1">
              Wholesale price received from collector / feed mill per kg
            </p>
          </div>

          <button
            onClick={handleSave}
            disabled={!yieldKg || saving}
            className="w-full bg-gradient-to-r from-emerald-700 to-teal-600 text-white py-3.5 rounded-2xl font-extrabold text-sm hover:from-emerald-800 hover:to-teal-700 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.99] transition-all shadow-lg shadow-emerald-600/25 flex items-center justify-center space-x-2"
          >
            {saving ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>Saving to database...</span>
              </>
            ) : saved ? (
              <>
                <CheckCircle2 size={16} />
                <span>✓ Saved to Database!</span>
              </>
            ) : (
              <span>Save & Calculate Break-even</span>
            )}
          </button>
        </div>

        {/* Season Result */}
        <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-xs space-y-3">
          <div>
            <h2 className="font-extrabold text-slate-800 text-sm">Season Financial Result</h2>
            <p className="text-[10px] text-slate-500 font-medium mt-0.5">
              Break-even target vs actual market outcome
            </p>
          </div>

          {hasResult ? (
            <div
              className={
                "rounded-2xl p-4 border space-y-3 " +
                (isProfitable
                  ? "bg-emerald-50 border-emerald-200"
                  : "bg-red-50 border-red-200")
              }
            >
              <div className="flex items-center space-x-2">
                {isProfitable ? (
                  <TrendingUp size={22} className="text-emerald-700" />
                ) : (
                  <TrendingDown size={22} className="text-red-600" />
                )}
                <p
                  className={
                    "font-extrabold text-base " +
                    (isProfitable ? "text-emerald-900" : "text-red-800")
                  }
                >
                  {isProfitable ? "✅ Profitable Season!" : "⚠️ Season Loss"}
                </p>
              </div>

              <div className="space-y-2">
                {[
                  {
                    label: "Actual Revenue",
                    value: actualRevenue,
                    color: isProfitable ? "text-emerald-800" : "text-red-700",
                  },
                  {
                    label: "Break-even Target",
                    value: breakEvenRevenue,
                    color: "text-slate-700",
                  },
                  {
                    label: isProfitable ? "Net Profit" : "Net Loss",
                    value: Math.abs(profitLoss),
                    color: isProfitable ? "text-emerald-700" : "text-red-600",
                  },
                ].map(({ label, value, color }) => (
                  <div
                    key={label}
                    className="flex items-center justify-between py-1.5 border-b border-white/60 last:border-0"
                  >
                    <span className="text-xs font-semibold text-slate-600">{label}</span>
                    <span className={"font-extrabold text-sm " + color}>
                      {isProfitable && label.includes("Profit") ? "+" : ""}
                      {!isProfitable && label.includes("Loss") ? "-" : ""}
                      Rp {value.toLocaleString("en-US")}
                    </span>
                  </div>
                ))}
              </div>

              <div
                className={
                  "text-center py-3 rounded-xl font-extrabold text-sm " +
                  (isProfitable
                    ? "bg-emerald-100 text-emerald-800"
                    : "bg-red-100 text-red-800")
                }
              >
                {isProfitable
                  ? `🎉 You made Rp ${profitLoss.toLocaleString("en-US")} profit this season!`
                  : `Loss of Rp ${Math.abs(profitLoss).toLocaleString("en-US")} — sell above break-even price!`}
              </div>
            </div>
          ) : (
            <div className="bg-slate-50 border border-dashed border-slate-200 rounded-2xl p-8 text-center space-y-2">
              <p className="text-slate-400 text-sm font-semibold">Enter harvest data above</p>
              <p className="text-slate-400 text-xs font-medium">
                Your season financial outcome will appear here
              </p>
            </div>
          )}
        </div>

        {hasResult && (
          <div className="bg-slate-50 rounded-2xl px-4 py-3 border border-slate-200 flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-700">Did this season make money?</p>
            <span
              className={
                "font-extrabold text-sm " +
                (isProfitable ? "text-emerald-600" : "text-red-600")
              }
            >
              {isProfitable ? "Profitable" : "Loss"} — Rp {Math.abs(profitLoss).toLocaleString("en-US")}
            </span>
          </div>
        )}
      </main>
      <BottomNav />
    </div>
  );
}

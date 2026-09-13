"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, TrendingUp, TrendingDown, Loader2, CheckCircle2 } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { useProtected } from "../lib/use-protected";
import BottomNav from "../components/BottomNav";

type CommodityType = "corn" | "chili" | "rice";

interface CommodityConfig {
  id: CommodityType;
  name: string;
  shortName: string;
  icon: string;
  unit: string;
  standardYield: number;
  benchmarkPrice: number;
  standardQuality: string;
  yieldHelp: string;
}

const COMMODITY_OPTIONS: Record<CommodityType, CommodityConfig> = {
  corn: {
    id: "corn",
    name: "Dried Corn (Jagung Pipil)",
    shortName: "Corn",
    icon: "🌽",
    unit: "kg dry kernel",
    standardYield: 5000,
    benchmarkPrice: 5500,
    standardQuality: "15% Moisture",
    yieldHelp: "Standard yield for 1 hectare hybrid corn (BISI/Pioneer) is ~5,000 kg.",
  },
  chili: {
    id: "chili",
    name: "Red Chili (Cabai Merah)",
    shortName: "Chili",
    icon: "🌶️",
    unit: "kg fresh chili",
    standardYield: 1200,
    benchmarkPrice: 32000,
    standardQuality: "Grade A Keriting",
    yieldHelp: "Average yield for 1 hectare open-field red chili is ~1,200 - 1,500 kg.",
  },
  rice: {
    id: "rice",
    name: "Milled Grain (Padi / Gabah)",
    shortName: "Rice",
    icon: "🌾",
    unit: "kg dry grain (GKG)",
    standardYield: 5500,
    benchmarkPrice: 7200,
    standardQuality: "Dry Grain GKG",
    yieldHelp: "Standard yield for 1 hectare irrigated lowland rice is ~5,000 - 6,000 kg.",
  },
};

export default function HarvestPage() {
  const router = useRouter();
  const { user } = useProtected();

  const [selectedCrop, setSelectedCrop] = useState<CommodityType>("corn");
  const [yieldKg, setYieldKg] = useState("");
  const [soldKg, setSoldKg] = useState("");
  const [pricePerKg, setPricePerKg] = useState("");
  const [hppPerKg, setHppPerKg] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const activeCrop = COMMODITY_OPTIONS[selectedCrop];

  useEffect(() => {
    const h = localStorage.getItem("lastHpp");
    if (h) setHppPerKg(parseFloat(h));
    const y = localStorage.getItem("yieldKg");
    if (y) setYieldKg(y);

    if (user) {
      supabase
        .from("harvest_records")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .then(({ data }) => {
          if (data && data.length > 0) {
            const r = data[0];
            if (r.yield_kg) setYieldKg(String(r.yield_kg));
            if (r.sold_kg) setSoldKg(String(r.sold_kg));
            if (r.price_per_kg) setPricePerKg(String(r.price_per_kg));
          }
        });
    }
  }, [user]);

  const handleCropSwitch = (crop: CommodityType) => {
    setSelectedCrop(crop);
    const target = COMMODITY_OPTIONS[crop];
    if (!yieldKg) setYieldKg(String(target.standardYield));
    if (!pricePerKg) setPricePerKg(String(target.benchmarkPrice));
  };

  const yieldNum = parseFloat(yieldKg) || 0;
  const soldNum = parseFloat(soldKg) || 0;
  const priceNum = parseFloat(pricePerKg) || 0;

  const effectiveHpp = hppPerKg && hppPerKg > 0 ? hppPerKg : (activeCrop.benchmarkPrice * 0.76);
  const actualRevenue = soldNum * priceNum;
  const breakEvenRevenue = yieldNum * effectiveHpp;
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
    <div className="min-h-dvh bg-slate-50 max-w-md mx-auto pb-[calc(6.5rem+env(safe-area-inset-bottom,0px))] font-sans">
      {/* Header with iPhone safe area top */}
      <header className="bg-white border-b border-slate-100 px-4 sm:px-5 pt-[max(2.5rem,calc(env(safe-area-inset-top)+0.75rem))] pb-4 sticky top-0 z-20">
        <button
          onClick={() => router.push("/home")}
          className="flex items-center space-x-1 text-slate-600 hover:text-emerald-700 mb-2.5 transition-colors"
        >
          <ChevronLeft size={20} />
          <span className="text-sm font-semibold">Home</span>
        </button>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2.5 min-w-0">
            <div className="w-9 h-9 bg-emerald-100 rounded-xl flex items-center justify-center text-lg shrink-0">
              {activeCrop.icon}
            </div>
            <div className="min-w-0">
              <h1 className="text-lg sm:text-xl font-extrabold text-slate-900 truncate">
                Harvest &amp; Yield Outcome
              </h1>
              <p className="text-slate-500 text-xs font-medium truncate">
                {activeCrop.name} Margin Calculator
              </p>
            </div>
          </div>
          <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full shrink-0">
            {activeCrop.standardQuality}
          </span>
        </div>
      </header>

      <main className="px-4 pt-4 space-y-4">
        {/* Commodity Selector Switcher */}
        <div className="bg-white rounded-2xl p-1.5 border border-slate-200/80 shadow-xs flex items-center space-x-1">
          {(["corn", "chili", "rice"] as CommodityType[]).map((cid) => {
            const item = COMMODITY_OPTIONS[cid];
            const active = selectedCrop === cid;
            return (
              <button
                key={cid}
                onClick={() => handleCropSwitch(cid)}
                className={`flex-1 flex items-center justify-center space-x-1.5 py-2 px-2 rounded-xl text-xs font-extrabold transition-all ${
                  active
                    ? "bg-emerald-800 text-white shadow-sm shadow-emerald-900/20"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/70"
                }`}
              >
                <span className="text-sm">{item.icon}</span>
                <span className="truncate">{item.shortName}</span>
              </button>
            );
          })}
        </div>

        {/* Commodity Benchmark Banner */}
        <div className="bg-amber-50 rounded-2xl p-3.5 border border-amber-200/80 flex items-start space-x-2.5">
          <span className="text-base shrink-0">💡</span>
          <div>
            <p className="text-xs font-bold text-amber-900">
              National {activeCrop.shortName} Benchmark: Rp {activeCrop.benchmarkPrice.toLocaleString()} / kg
            </p>
            <p className="text-[10px] text-amber-700 leading-relaxed mt-0.5">
              Government reference price. Enter your harvest numbers below to ensure your wholesale selling price stays safely above your BEP.
            </p>
          </div>
        </div>

        {/* Input Form */}
        <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-100 shadow-xs space-y-4">
          <div>
            <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-1.5">
              Estimated {activeCrop.shortName} Harvest Yield ({activeCrop.unit}) *
            </label>
            <input
              type="number"
              placeholder={`e.g. ${activeCrop.standardYield}`}
              value={yieldKg}
              onChange={(e) => setYieldKg(e.target.value)}
              className="w-full border border-slate-200 bg-slate-50/50 rounded-xl px-4 py-3 text-sm font-semibold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400 transition-all"
            />
            <p className="text-[10px] text-slate-400 font-medium mt-1">
              {activeCrop.yieldHelp}
            </p>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-1.5">
              Kg {activeCrop.shortName} Sold
            </label>
            <input
              type="number"
              placeholder={`e.g. ${Math.round(activeCrop.standardYield * 0.95)}`}
              value={soldKg}
              onChange={(e) => setSoldKg(e.target.value)}
              className="w-full border border-slate-200 bg-slate-50/50 rounded-xl px-4 py-3 text-sm font-semibold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400 transition-all"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-1.5">
              Selling Price (per kg)
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-semibold text-sm">
                Rp
              </span>
              <input
                type="number"
                placeholder={`e.g. ${activeCrop.benchmarkPrice}`}
                value={pricePerKg}
                onChange={(e) => setPricePerKg(e.target.value)}
                className="w-full border border-slate-200 bg-slate-50/50 rounded-xl pl-10 pr-4 py-3 text-sm font-semibold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400 transition-all"
              />
            </div>
            <p className="text-[10px] text-slate-400 font-medium mt-1">
              Price received from collector, trader, or off-taker
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
              <span>Save &amp; Calculate Break Even Point</span>
            )}
          </button>
        </div>

        {/* Season Result */}
        <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-100 shadow-xs space-y-3">
          <div>
            <h2 className="font-extrabold text-slate-800 text-sm">Season Financial Result</h2>
            <p className="text-[10px] text-slate-500 font-medium mt-0.5">
              Break Even Point (BEP) target vs actual market outcome
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
                  <TrendingUp size={22} className="text-emerald-700 shrink-0" />
                ) : (
                  <TrendingDown size={22} className="text-red-600 shrink-0" />
                )}
                <p
                  className={
                    "font-extrabold text-base " +
                    (isProfitable ? "text-emerald-800" : "text-red-700")
                  }
                >
                  {isProfitable
                    ? `Estimated Profit: +Rp ${profitLoss.toLocaleString("en-US")}`
                    : `Estimated Deficit: -Rp ${Math.abs(profitLoss).toLocaleString("en-US")}`}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs border-t border-slate-200/60 pt-3">
                <div>
                  <span className="text-[10px] text-slate-500 font-bold uppercase">Actual Revenue</span>
                  <p className="font-bold text-slate-900 mt-0.5">
                    Rp {actualRevenue.toLocaleString("en-US")}
                  </p>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 font-bold uppercase">Break Even Point (BEP)</span>
                  <p className="font-bold text-slate-900 mt-0.5">
                    Rp {breakEvenRevenue.toLocaleString("en-US")}
                  </p>
                </div>
              </div>

              <p
                className={
                  "text-xs leading-relaxed font-semibold " +
                  (isProfitable ? "text-emerald-900" : "text-red-800")
                }
              >
                {isProfitable
                  ? `🎉 Excellent work! Your selling price (Rp ${priceNum.toLocaleString()}/kg) exceeds your Break Even Point (Rp ${Math.round(effectiveHpp).toLocaleString()}/kg).`
                  : `⚠️ Your selling price (Rp ${priceNum.toLocaleString()}/kg) is below your Break Even Point (Rp ${Math.round(effectiveHpp).toLocaleString()}/kg). Review receipts to identify cost drivers.`}
              </p>
            </div>
          ) : (
            <div className="bg-slate-50 rounded-2xl p-4 text-center border border-slate-100 text-slate-400 text-xs font-medium">
              Fill in yield and price details above to calculate your net season margin.
            </div>
          )}
        </div>
      </main>

      <BottomNav />
    </div>
  );
}

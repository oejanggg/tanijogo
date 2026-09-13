"use client";

import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Wallet, AlertTriangle, CheckCircle2, Receipt, Volume2, Camera, Image as ImageIcon, Sparkles, RefreshCw, ChevronRight } from 'lucide-react';

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [ledger, setLedger] = useState<any[]>([]);
  const [walletBalance, setWalletBalance] = useState(0);

  // Fetch historical data on mount
  useEffect(() => {
    fetchLedger();
  }, []);

  const fetchLedger = async () => {
    const { data, error } = await supabase
      .from('farmer_ledger')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error("Error fetching ledger:", error);
      return;
    }

    if (data) {
      setLedger(data);
      const totalEarned = data.reduce((sum, row) => sum + (row.reward_earned || 0), 0);
      setWalletBalance(totalEarned);
    }
  };

  const handleFileChange = (selectedFile: File | null) => {
    if (!selectedFile) return;
    setFile(selectedFile);
    setPreviewUrl(URL.createObjectURL(selectedFile));
  };

  const handleUpload = async (fileToUpload?: File) => {
    const activeFile = fileToUpload || file;
    if (!activeFile) return;
    setLoading(true);

    const formData = new FormData();
    formData.append('file', activeFile);

    try {
      const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      const res = await fetch(`${apiBaseUrl}/audit`, {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const errorDetails = await res.text();
        console.error(`Backend error (${res.status}):`, errorDetails);
        alert(`Server Error (${res.status}). Check backend logs or browser console.`);
        return;
      }
      
      const data = await res.json();
      setResult(data);
      setFile(null); // Clear selected file for fresh upload
      setPreviewUrl(null);

      const rec = data.transaction_record || data.evaluation;
      const fin = data.financials || {};

      if (rec) {
        const { error: insertError } = await supabase.from('farmer_ledger').insert([{
          merchant_name: rec.merchant_name,
          primary_category: rec.primary_receipt_category || rec.primary_category,
          quality_score: rec.image_quality_score,
          reward_earned: data.reward ?? rec.reward_earned_idr ?? 0,
          total_production_cost: fin.total_production_cost ?? rec.total_production_cost_idr,
          hpp_per_kg: fin.hpp_per_kg ?? rec.hpp_per_kg_idr,
          fraud_detected: rec.is_original_receipt !== undefined ? !rec.is_original_receipt : false
        }]);

        if (insertError) {
          console.error("Supabase client insert (optional):", insertError);
        }
      }
      
      // Always refresh ledger to show the new entry immediately
      await fetchLedger();
    } catch (err) {
      console.error("Upload failed:", err);
      alert("Failed to connect to the audit server.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100/70 font-sans text-slate-900 pb-16 selection:bg-emerald-500 selection:text-white">
      {/* Top Mobile Container Header */}
      <header className="bg-gradient-to-br from-emerald-900 via-emerald-800 to-teal-900 text-white pt-8 pb-8 px-5 rounded-b-[2.5rem] shadow-xl max-w-md mx-auto relative overflow-hidden transition-all duration-300">
        {/* Glow backdrop blur rings */}
        <div className="absolute -top-12 -right-12 w-44 h-44 bg-emerald-400/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 -left-10 w-36 h-36 bg-teal-400/15 rounded-full blur-2xl pointer-events-none" />

        <div className="flex justify-between items-center mb-5 relative z-10">
          <div>
            <h1 className="text-2xl font-black tracking-tight flex items-center space-x-2">
              <span className="bg-gradient-to-r from-white via-emerald-100 to-emerald-200 bg-clip-text text-transparent">SukaTani</span>
              <span className="text-[10px] tracking-wider uppercase font-extrabold bg-emerald-400/25 text-emerald-200 px-2.5 py-0.5 rounded-full border border-emerald-400/30 backdrop-blur-md">
                AI Audit
              </span>
            </h1>
            <p className="text-xs text-emerald-200/90 font-medium mt-0.5">Insentif & Keuangan Petani Indonesia</p>
          </div>
          <span className="flex items-center text-[11px] font-semibold bg-emerald-950/60 text-emerald-300 px-3 py-1 rounded-full border border-emerald-500/30 backdrop-blur-md shadow-inner">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse mr-2 shadow-sm shadow-emerald-400" />
            Supabase Live
          </span>
        </div>

        {/* Glassmorphism Wallet Balance Card */}
        <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-4 border border-white/20 shadow-xl flex items-center justify-between relative z-10 transition-transform duration-300 hover:scale-[1.01]">
          <div>
            <p className="text-emerald-200 text-[10px] font-bold uppercase tracking-wider">Total Insentif Terkumpul</p>
            <p className="text-3xl font-black text-white mt-1 tracking-tight">
              Rp {walletBalance.toLocaleString()}
            </p>
          </div>
          <div className="p-3 bg-gradient-to-tr from-emerald-500 to-teal-400 rounded-xl text-white shadow-lg shadow-emerald-900/40">
            <Wallet size={24} />
          </div>
        </div>
      </header>

      {/* Main Content Body */}
      <main className="max-w-md mx-auto px-4 mt-4 space-y-6">
        
        {/* Upload & Photo Scan Section */}
        <section className="bg-white/90 backdrop-blur-md p-5 rounded-3xl shadow-sm border border-slate-200/80 space-y-4 transition-all duration-300">
          <div className="text-center space-y-1">
            <h2 className="font-bold text-base text-slate-800 flex items-center justify-center space-x-1.5">
              <Sparkles size={18} className="text-emerald-600" />
              <span>Scan & Audit Nota Pertanian</span>
            </h2>
            <p className="text-xs text-slate-500 font-medium">Ambil foto nota untuk menghitung HPP & klaim insentif</p>
          </div>

          {previewUrl ? (
            <div className="relative rounded-2xl overflow-hidden border border-emerald-200 bg-emerald-50/50 p-3 space-y-3 animate-in fade-in zoom-in-95 duration-300">
              <div className="relative group overflow-hidden rounded-xl bg-white shadow-inner border border-emerald-100">
                <img 
                  src={previewUrl} 
                  alt="Receipt preview" 
                  className="max-h-52 w-full object-contain mx-auto transition-transform duration-300 group-hover:scale-[1.02]" 
                />
              </div>
              <div className="flex justify-between items-center px-1">
                <span className="text-xs text-emerald-950 font-semibold truncate max-w-[200px]">{file?.name}</span>
                <button
                  onClick={() => { setFile(null); setPreviewUrl(null); }}
                  className="text-xs text-red-600 font-bold bg-white px-3 py-1.5 rounded-xl border border-red-200 shadow-xs hover:bg-red-50 active:scale-95 transition-all flex items-center space-x-1"
                >
                  <RefreshCw size={12} />
                  <span>Ganti Foto</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 pt-1">
              {/* Direct Camera Capture Card */}
              <label className="border border-emerald-200/80 bg-emerald-50/60 hover:bg-emerald-100/70 hover:border-emerald-300 rounded-2xl p-4 flex flex-col items-center justify-center cursor-pointer transition-all duration-300 hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 space-y-2.5 group">
                <div className="p-3 bg-gradient-to-tr from-emerald-600 to-teal-500 text-white rounded-xl shadow-md shadow-emerald-600/30 group-hover:scale-110 transition-transform duration-300">
                  <Camera size={22} />
                </div>
                <div className="text-center">
                  <span className="text-xs font-bold text-emerald-950 block leading-tight">Foto Kamera</span>
                  <span className="text-[10px] text-emerald-700 font-medium mt-0.5 block">Ambil foto langsung</span>
                </div>
                <input 
                  type="file" 
                  accept="image/*" 
                  capture="environment"
                  className="hidden" 
                  onChange={(e) => handleFileChange(e.target.files?.[0] || null)}
                />
              </label>

              {/* Gallery File Card */}
              <label className="border border-slate-200 bg-slate-50/80 hover:bg-slate-100/80 hover:border-indigo-200 rounded-2xl p-4 flex flex-col items-center justify-center cursor-pointer transition-all duration-300 hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 space-y-2.5 group">
                <div className="p-3 bg-gradient-to-tr from-indigo-600 to-slate-700 text-white rounded-xl shadow-md shadow-indigo-600/25 group-hover:scale-110 transition-transform duration-300">
                  <ImageIcon size={22} />
                </div>
                <div className="text-center">
                  <span className="text-xs font-bold text-slate-800 block leading-tight">Pilih Galeri</span>
                  <span className="text-[10px] text-slate-500 font-medium mt-0.5 block">Upload dari hp</span>
                </div>
                <input 
                  type="file" 
                  accept="image/*" 
                  className="hidden" 
                  onChange={(e) => handleFileChange(e.target.files?.[0] || null)}
                />
              </label>
            </div>
          )}

          <button
            onClick={() => handleUpload()}
            disabled={!file || loading}
            className="w-full mt-2 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-600 text-white py-3.5 rounded-2xl font-bold text-sm hover:from-emerald-700 hover:to-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 shadow-md shadow-emerald-600/25 flex items-center justify-center space-x-2 active:scale-[0.99]"
          >
            {loading ? (
              <span className="flex items-center space-x-2">
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Menganalisis Nota...</span>
              </span>
            ) : (
              <span className="flex items-center justify-center space-x-1.5">
                <span>⚡ Audit Nota & Cairkan Insentif</span>
              </span>
            )}
          </button>
        </section>

        {/* Live Result Dashboard */}
        {result && (result.transaction_record || result.evaluation) && (
          (() => {
            const record = result.transaction_record || result.evaluation;
            const financials = result.financials || {};
            const reward = dataReward(result, record);
            const voice = result.voice_brief || {};
            const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
            const audioSrc = voice.audio_url ? `${apiBaseUrl}${voice.audio_url}` : null;

            return (
              <section className="bg-white p-5 rounded-3xl shadow-sm border border-slate-200/80 space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3.5">
                  <h2 className="font-extrabold text-lg text-slate-900 tracking-tight">Hasil Audit AI</h2>
                  {record.is_original_receipt ? (
                    <span className="flex items-center text-emerald-700 text-xs font-bold bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                      <CheckCircle2 size={14} className="mr-1.5 text-emerald-600 shrink-0" /> Nota Valid
                    </span>
                  ) : (
                    <span className="flex items-center text-red-700 text-xs font-bold bg-red-50 px-3 py-1 rounded-full border border-red-200">
                      <AlertTriangle size={14} className="mr-1.5 text-red-600 shrink-0" /> Terdeteksi Duplikat / Fraud
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-slate-50 p-3.5 rounded-2xl text-center border border-slate-100">
                    <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Quality Score</p>
                    <p className="text-2xl font-black text-slate-800 mt-0.5">{record.image_quality_score}/10</p>
                  </div>
                  <div className={`p-3.5 rounded-2xl text-center border ${reward > 0 ? 'bg-emerald-50/80 border-emerald-200' : 'bg-red-50/80 border-red-200'}`}>
                    <p className={`text-[10px] uppercase font-bold tracking-wider ${reward > 0 ? 'text-emerald-700' : 'text-red-700'}`}>Insentif</p>
                    <p className={`text-2xl font-black mt-0.5 ${reward > 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                      +Rp {reward.toLocaleString()}
                    </p>
                  </div>
                </div>

                {/* Fraud & Rejection Alert Banner */}
                {(!record.is_original_receipt || (record.fraud_flags && record.fraud_flags.length > 0)) && (
                  <div className="bg-red-50/90 border border-red-200/80 p-4 rounded-2xl space-y-2 animate-in fade-in duration-300">
                    <div className="flex items-center text-red-800 font-bold text-xs">
                      <AlertTriangle size={16} className="mr-2 text-red-600 shrink-0" />
                      <span>Insentif Ditolak Sistem (Rp 0)</span>
                    </div>
                    <ul className="text-xs text-red-700 list-disc list-inside space-y-1 font-medium leading-relaxed">
                      {record.fraud_flags?.map((flag: string, idx: number) => (
                        <li key={idx}>{flag}</li>
                      )) || <li>Nota tidak sesuai standar audit SukaTani</li>}
                    </ul>
                  </div>
                )}

                {/* Spoken Indonesian Voice Brief (ElevenLabs Multilingual V2) */}
                {voice.transcript && (
                  <div className="bg-purple-50/80 p-4 rounded-2xl border border-purple-200/70 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center text-purple-950 font-bold text-xs">
                        <Volume2 size={16} className="mr-1.5 text-purple-600 shrink-0" /> Audio Brief (Pak Joko)
                      </span>
                      <span className="text-[9px] uppercase tracking-wider font-extrabold bg-purple-200/80 text-purple-800 px-2 py-0.5 rounded-full">
                        ElevenLabs AI
                      </span>
                    </div>

                    <p className="text-xs text-purple-950 leading-relaxed italic bg-white/80 p-3 rounded-xl border border-purple-100/80 shadow-2xs">
                      "{voice.transcript}"
                    </p>

                    {/* Single Unified ElevenLabs Audio Player */}
                    {audioSrc ? (
                      <audio key={audioSrc} controls autoPlay className="w-full mt-2 h-9 rounded-xl accent-purple-600">
                        <source src={audioSrc} type="audio/mpeg" />
                        Your browser does not support the audio element.
                      </audio>
                    ) : (
                      <p className="text-xs text-purple-600 italic text-center py-2">
                        Audio brief script ready.
                      </p>
                    )}
                  </div>
                )}

                {/* Financial Intelligence */}
                <div className="bg-gradient-to-br from-blue-50/90 to-indigo-50/80 p-4 rounded-2xl border border-blue-200/70 space-y-3">
                  <div className="flex justify-between items-center">
                    <h3 className="font-bold text-xs text-blue-950 uppercase tracking-wider">Financial Intelligence</h3>
                    <span className="text-[10px] bg-blue-200/80 text-blue-900 font-extrabold px-2 py-0.5 rounded-full">HPP Engine</span>
                  </div>

                  {record.estimated_yield_kg && (
                    <p className="text-xs text-blue-800 font-medium">Estimasi Hasil Panen: 1.5 Ton ({record.estimated_yield_kg} Kg)</p>
                  )}

                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center text-xs font-semibold">
                      <span className="text-blue-900">Total Biaya Produksi:</span>
                      <span className="font-extrabold text-blue-950">
                        Rp {(financials.total_production_cost ?? record.total_production_cost_idr ?? 0).toLocaleString()}
                      </span>
                    </div>
                    
                    {/* Visual Cost Category Distribution Bar */}
                    {(() => {
                      const total = financials.total_production_cost || 1;
                      const cogsPct = Math.round(((financials.cogs_total || 0) / total) * 100);
                      const opexPct = Math.round(((financials.opex_total || 0) / total) * 100);
                      const capexPct = Math.min(100 - cogsPct - opexPct, 100);

                      return (
                        <div className="space-y-2 pt-1">
                          <div className="w-full bg-blue-200/60 h-2.5 rounded-full overflow-hidden flex shadow-inner">
                            <div style={{ width: `${cogsPct}%` }} className="bg-emerald-500 h-full transition-all duration-700 ease-out" title={`COGS ${cogsPct}%`} />
                            <div style={{ width: `${opexPct}%` }} className="bg-amber-500 h-full transition-all duration-700 ease-out" title={`OPEX ${opexPct}%`} />
                            <div style={{ width: `${capexPct}%` }} className="bg-purple-500 h-full transition-all duration-700 ease-out" title={`Amortized CAPEX ${capexPct}%`} />
                          </div>
                          <div className="grid grid-cols-3 gap-1 text-[10px] font-semibold pt-1">
                            <div className="flex items-center text-emerald-900">
                              <span className="w-2 h-2 rounded-full bg-emerald-500 mr-1 shrink-0" />
                              <span>COGS: Rp {(financials.cogs_total || 0).toLocaleString()}</span>
                            </div>
                            <div className="flex items-center text-amber-900">
                              <span className="w-2 h-2 rounded-full bg-amber-500 mr-1 shrink-0" />
                              <span>OPEX: Rp {(financials.opex_total || 0).toLocaleString()}</span>
                            </div>
                            <div className="flex items-center text-purple-900">
                              <span className="w-2 h-2 rounded-full bg-purple-500 mr-1 shrink-0" />
                              <span>CAPEX*: Rp {(financials.amortized_capex || 0).toLocaleString()}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                  </div>

                  <div className="flex justify-between items-center pt-2.5 border-t border-blue-200/80">
                    <div>
                      <span className="font-extrabold text-blue-950 block text-xs">Target Break-even HPP:</span>
                      <span className="text-[10px] text-blue-700 font-medium">Harga jual min. per Kg</span>
                    </div>
                    <span className="font-black text-lg text-blue-900 bg-white px-3 py-1 rounded-xl border border-blue-200 shadow-2xs">
                      Rp {(financials.hpp_per_kg ?? record.hpp_per_kg_idr ?? 0).toLocaleString()} <span className="text-xs font-semibold text-slate-500">/ Kg</span>
                    </span>
                  </div>
                </div>
              </section>
            );
          })()
        )}

        {/* Historical Ledger Section */}
        <section className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h3 className="font-extrabold text-sm text-slate-800 flex items-center space-x-1.5">
              <Receipt size={16} className="text-emerald-700" />
              <span>Riwayat Ledger (Supabase)</span>
            </h3>
            <span className="text-[10px] font-bold bg-slate-200 text-slate-700 px-2 py-0.5 rounded-full">
              {ledger.length} Transaksi
            </span>
          </div>

          <div className="space-y-2.5">
            {ledger.map((row) => (
              <div 
                key={row.id} 
                className="bg-white p-4 rounded-2xl shadow-2xs border border-slate-200/70 flex justify-between items-center hover:border-emerald-200 transition-all duration-200"
              >
                <div>
                  <p className="font-bold text-xs text-slate-900">{row.merchant_name || 'Toko Tani'}</p>
                  <div className="flex items-center text-[10px] mt-1 space-x-2">
                    <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md font-semibold">{row.primary_category || 'Input Tani'}</span>
                    <span className="text-slate-400 font-medium">
                      {row.created_at ? new Date(row.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }) : 'Baru'}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`font-black text-sm ${row.reward_earned > 0 ? 'text-emerald-600' : 'text-slate-400'}`}>
                    +Rp {(row.reward_earned || 0).toLocaleString()}
                  </p>
                  {row.fraud_detected && <p className="text-[10px] text-red-500 font-bold">Ditolak System</p>}
                </div>
              </div>
            ))}

            {ledger.length === 0 && (
              <div className="bg-white/60 rounded-2xl p-6 text-center border border-dashed border-slate-200 space-y-1">
                <p className="text-xs text-slate-500 font-medium">Belum ada nota yang di-audit.</p>
                <p className="text-[10px] text-slate-400">Upload nota pertama kamu di atas untuk mengumpulkan insentif!</p>
              </div>
            )}
          </div>
        </section>

      </main>
    </div>
  );
}

// Helper function for reward fallback
function dataReward(result: any, record: any): number {
  if (result.reward !== undefined) return result.reward;
  if (record.reward_earned_idr !== undefined) return record.reward_earned_idr;
  return 0;
}
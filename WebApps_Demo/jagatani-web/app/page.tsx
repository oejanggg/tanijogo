"use client";

import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Upload, Wallet, AlertTriangle, CheckCircle2, Receipt, Volume2, Camera, Image as ImageIcon } from 'lucide-react';

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
    <div className="min-h-screen bg-gray-50 font-sans text-gray-900 pb-10">
      {/* Header & Wallet */}
      <header className="bg-emerald-700 text-white p-6 rounded-b-3xl shadow-lg max-w-md mx-auto">
        <h1 className="text-2xl font-bold mb-4">SukaTani</h1>
        <div className="bg-white/20 rounded-xl p-4 flex items-center justify-between">
          <div>
            <p className="text-emerald-100 text-sm font-medium">Data Incentives Earned</p>
            <p className="text-3xl font-bold">Rp {walletBalance.toLocaleString()}</p>
          </div>
          <Wallet size={32} className="text-emerald-100" />
        </div>
      </header>

      <main className="max-w-md mx-auto p-4 mt-4 space-y-6">
        
        {/* Upload & Photo Scan Section */}
        <section className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 text-center space-y-4">
          <h2 className="font-bold text-lg text-gray-800">Audit & Scan Farm Receipt</h2>

          {previewUrl ? (
            <div className="relative rounded-xl overflow-hidden border-2 border-emerald-500 bg-black/5 p-2 space-y-2">
              <img src={previewUrl} alt="Receipt preview" className="max-h-48 w-full object-contain rounded-lg mx-auto" />
              <div className="flex justify-between items-center px-2">
                <span className="text-xs text-emerald-800 font-semibold truncate max-w-[200px]">{file?.name}</span>
                <button
                  onClick={() => { setFile(null); setPreviewUrl(null); }}
                  className="text-xs text-red-600 font-bold underline"
                >
                  Ulangi / Reset
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {/* Direct Camera Capture Button */}
              <label className="border-2 border-dashed border-emerald-400 bg-emerald-50 hover:bg-emerald-100 rounded-xl p-5 flex flex-col items-center justify-center cursor-pointer transition-colors space-y-2">
                <div className="p-3 bg-emerald-600 text-white rounded-full shadow-md">
                  <Camera size={24} />
                </div>
                <span className="text-xs font-bold text-emerald-900">Foto Nota (Kamera)</span>
                <span className="text-[10px] text-emerald-600">Ambil foto langsung</span>
                <input 
                  type="file" 
                  accept="image/*" 
                  capture="environment"
                  className="hidden" 
                  onChange={(e) => handleFileChange(e.target.files?.[0] || null)}
                />
              </label>

              {/* Upload File / Gallery Button */}
              <label className="border-2 border-dashed border-gray-300 bg-gray-50 hover:bg-gray-100 rounded-xl p-5 flex flex-col items-center justify-center cursor-pointer transition-colors space-y-2">
                <div className="p-3 bg-gray-700 text-white rounded-full shadow-md">
                  <ImageIcon size={24} />
                </div>
                <span className="text-xs font-bold text-gray-800">Pilih File / Galeri</span>
                <span className="text-[10px] text-gray-500">Upload dari hp</span>
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
            className="w-full mt-2 bg-emerald-600 text-white py-3.5 rounded-xl font-bold text-base hover:bg-emerald-700 disabled:bg-gray-300 transition-colors shadow-sm flex items-center justify-center space-x-2"
          >
            {loading ? (
              <span>Sedang Menganalisis Nota...</span>
            ) : (
              <span>⚡ Audit Nota & Cairkan Insentif</span>
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
              <section className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-4">
                <div className="flex items-center justify-between border-b pb-4">
                  <h2 className="font-bold text-xl">Audit Verdict</h2>
                  {record.is_original_receipt ? (
                    <span className="flex items-center text-emerald-600 text-sm font-bold bg-emerald-50 px-3 py-1 rounded-full">
                      <CheckCircle2 size={16} className="mr-1" /> Valid
                    </span>
                  ) : (
                    <span className="flex items-center text-red-600 text-sm font-bold bg-red-50 px-3 py-1 rounded-full">
                      <AlertTriangle size={16} className="mr-1" /> Fraud Flag
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-50 p-3 rounded-lg text-center">
                    <p className="text-xs text-gray-500 uppercase font-semibold">Quality Score</p>
                    <p className="text-2xl font-bold text-gray-800">{record.image_quality_score}/10</p>
                  </div>
                  <div className={`p-3 rounded-lg text-center border ${reward > 0 ? 'bg-emerald-50 border-emerald-100' : 'bg-red-50 border-red-100'}`}>
                    <p className={`text-xs uppercase font-semibold ${reward > 0 ? 'text-emerald-600' : 'text-red-600'}`}>Reward</p>
                    <p className={`text-2xl font-bold ${reward > 0 ? 'text-emerald-700' : 'text-red-600'}`}>+Rp {reward.toLocaleString()}</p>
                  </div>
                </div>

                {/* Fraud & Rejection Alert Banner */}
                {(!record.is_original_receipt || (record.fraud_flags && record.fraud_flags.length > 0)) && (
                  <div className="bg-red-50 border border-red-200 p-4 rounded-xl space-y-2">
                    <div className="flex items-center text-red-800 font-bold text-sm">
                      <AlertTriangle size={18} className="mr-2 text-red-600 shrink-0" />
                      <span>Insentif Ditolak Sistem (Rp 0)</span>
                    </div>
                    <ul className="text-xs text-red-700 list-disc list-inside space-y-1 font-medium">
                      {record.fraud_flags?.map((flag: string, idx: number) => (
                        <li key={idx}>{flag}</li>
                      )) || <li>Nota tidak sesuai standar audit SukaTani</li>}
                    </ul>
                  </div>
                )}

                {/* Spoken Indonesian Voice Brief (ElevenLabs Multilingual V2) */}
                {voice.transcript && (
                  <div className="bg-purple-50 p-4 rounded-xl border border-purple-100 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center text-purple-900 font-bold text-sm">
                        <Volume2 size={18} className="mr-1.5 text-purple-600" /> Audio Brief (Pak Joko)
                      </span>
                      <span className="text-[10px] uppercase tracking-wider font-bold bg-purple-200 text-purple-800 px-2 py-0.5 rounded">
                        Built with ElevenLabs
                      </span>
                    </div>

                    <p className="text-xs text-purple-900 leading-relaxed italic bg-white/70 p-3 rounded-lg border border-purple-100">
                      "{voice.transcript}"
                    </p>

                    {/* Single Unified ElevenLabs Audio Player */}
                    {audioSrc ? (
                      <audio key={audioSrc} controls autoPlay className="w-full mt-2 h-10 rounded-lg accent-purple-600">
                        <source src={audioSrc} type="audio/mpeg" />
                        Your browser does not support the audio element.
                      </audio>
                    ) : (
                      <p className="text-xs text-purple-600 italic text-center py-2">
                        Audio brief script ready. (Configure ELEVENLABS_API_KEY for MP3 voice playback)
                      </p>
                    )}
                  </div>
                )}

                {/* Financial Intelligence */}
                <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 space-y-3">
                  <div className="flex justify-between items-center">
                    <h3 className="font-bold text-blue-900">Financial Intelligence</h3>
                    <span className="text-xs bg-blue-100 text-blue-800 font-semibold px-2 py-0.5 rounded">HPP Engine</span>
                  </div>

                  {record.estimated_yield_kg && (
                    <p className="text-xs text-blue-700">Calculated for 1.5 Tons ({record.estimated_yield_kg} Kg) harvest yield</p>
                  )}

                  <div className="space-y-1">
                    <div className="flex justify-between items-center text-sm font-medium">
                      <span className="text-blue-800">Total Cost of Production:</span>
                      <span className="font-bold">Rp {(financials.total_production_cost ?? record.total_production_cost_idr ?? 0).toLocaleString()}</span>
                    </div>
                    
                    {/* Visual Cost Category Distribution Bar */}
                    {(() => {
                      const total = financials.total_production_cost || 1;
                      const cogsPct = Math.round(((financials.cogs_total || 0) / total) * 100);
                      const opexPct = Math.round(((financials.opex_total || 0) / total) * 100);
                      const capexPct = Math.min(100 - cogsPct - opexPct, 100);

                      return (
                        <div className="space-y-2 pt-1">
                          <div className="w-full bg-gray-200 h-2.5 rounded-full overflow-hidden flex">
                            <div style={{ width: `${cogsPct}%` }} className="bg-emerald-500 h-full" title={`COGS ${cogsPct}%`} />
                            <div style={{ width: `${opexPct}%` }} className="bg-amber-500 h-full" title={`OPEX ${opexPct}%`} />
                            <div style={{ width: `${capexPct}%` }} className="bg-purple-500 h-full" title={`Amortized CAPEX ${capexPct}%`} />
                          </div>
                          <div className="grid grid-cols-3 gap-1 text-[11px] font-medium pt-1">
                            <div className="flex items-center text-emerald-800">
                              <span className="w-2 h-2 rounded-full bg-emerald-500 mr-1 shrink-0" />
                              <span>COGS: Rp {(financials.cogs_total || 0).toLocaleString()}</span>
                            </div>
                            <div className="flex items-center text-amber-800">
                              <span className="w-2 h-2 rounded-full bg-amber-500 mr-1 shrink-0" />
                              <span>OPEX: Rp {(financials.opex_total || 0).toLocaleString()}</span>
                            </div>
                            <div className="flex items-center text-purple-800">
                              <span className="w-2 h-2 rounded-full bg-purple-500 mr-1 shrink-0" />
                              <span>CAPEX*: Rp {(financials.amortized_capex || 0).toLocaleString()}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                  </div>

                  <div className="flex justify-between items-center pt-2 border-t border-blue-200">
                    <div>
                      <span className="font-bold text-blue-900 block text-sm">Target Break-even HPP:</span>
                      <span className="text-[10px] text-blue-600">Minimum sell price per Kg</span>
                    </div>
                    <span className="font-extrabold text-xl text-blue-700 bg-white px-3 py-1 rounded-lg border border-blue-200 shadow-sm">
                      Rp {(financials.hpp_per_kg ?? record.hpp_per_kg_idr ?? 0).toLocaleString()} <span className="text-xs font-normal text-gray-500">/ Kg</span>
                    </span>
                  </div>
                </div>
              </section>
            );
          })()
        )}

        {/* Historical Ledger */}
        <section>
          <h3 className="font-bold text-gray-800 mb-3 flex items-center">
            <Receipt size={18} className="mr-2" /> Transaction Ledger
          </h3>
          <div className="space-y-3">
            {ledger.map((row) => (
              <div key={row.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex justify-between items-center">
                <div>
                  <p className="font-bold text-gray-800">{row.merchant_name}</p>
                  <div className="flex items-center text-xs mt-1 space-x-2">
                    <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded font-medium">{row.primary_category}</span>
                    <span className="text-gray-500">{new Date(row.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-emerald-600">+Rp {(row.reward_earned || 0).toLocaleString()}</p>
                  {row.fraud_detected && <p className="text-xs text-red-500 font-medium">Rejected</p>}
                </div>
              </div>
            ))}
            {ledger.length === 0 && (
              <p className="text-center text-sm text-gray-500 py-6">No receipts uploaded yet.</p>
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
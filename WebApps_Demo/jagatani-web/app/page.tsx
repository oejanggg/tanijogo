"use client";

import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Upload, Wallet, AlertTriangle, CheckCircle2, Receipt, Volume2 } from 'lucide-react';

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
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

  const handleUpload = async () => {
    if (!file) return;
    setLoading(true);

    const formData = new FormData();
    formData.append('file', file);

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
        
        {/* Upload Section */}
        <section className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 text-center">
          <h2 className="font-semibold text-lg mb-4">Upload Farm Receipt</h2>
          <label className="border-2 border-dashed border-emerald-300 bg-emerald-50 rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer hover:bg-emerald-100 transition-colors">
            <Upload size={32} className="text-emerald-600 mb-2" />
            <span className="text-sm font-medium text-emerald-800">
              {file ? file.name : 'Tap to scan nota'}
            </span>
            <input 
              type="file" 
              accept="image/*" 
              capture="environment"
              className="hidden" 
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
          </label>

          <button
            onClick={handleUpload}
            disabled={!file || loading}
            className="w-full mt-4 bg-emerald-600 text-white py-3 rounded-xl font-bold text-lg hover:bg-emerald-700 disabled:bg-gray-300 transition-colors"
          >
            {loading ? 'Analyzing Receipt...' : 'Submit & Earn'}
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
                  <div className="bg-emerald-50 p-3 rounded-lg text-center border border-emerald-100">
                    <p className="text-xs text-emerald-600 uppercase font-semibold">Reward</p>
                    <p className="text-2xl font-bold text-emerald-700">+Rp {reward.toLocaleString()}</p>
                  </div>
                </div>

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
                <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                  <h3 className="font-bold text-blue-900 mb-1">Financial Intelligence</h3>
                  {record.estimated_yield_kg && (
                    <p className="text-sm text-blue-800 mb-2">Based on estimated {record.estimated_yield_kg} Kg yield</p>
                  )}
                  <div className="flex justify-between items-center text-sm font-medium">
                    <span className="text-blue-700">Total Production Cost:</span>
                    <span>Rp {(financials.total_production_cost ?? record.total_production_cost_idr ?? 0).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center mt-2 pt-2 border-t border-blue-200">
                    <span className="font-bold text-blue-900">Target HPP / Kg:</span>
                    <span className="font-bold text-lg text-blue-700">Rp {(financials.hpp_per_kg ?? record.hpp_per_kg_idr ?? 0).toLocaleString()}</span>
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
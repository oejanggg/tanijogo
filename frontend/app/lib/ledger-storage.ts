import { supabase } from "../../lib/supabase";

export interface LedgerItem {
  id: string;
  user_id?: string | null;
  merchant_name: string;
  primary_category: string;
  quality_score: number;
  reward_earned: number;
  total_production_cost: number;
  hpp_per_kg: number;
  fraud_detected: boolean;
  created_at: string;
  voice_transcript?: string | null;
  audio_url?: string | null;
}

const STORAGE_KEY = "tanijaga_farmer_ledger";
const LEGACY_STORAGE_KEY = "sukatani_farmer_ledger";

/**
 * Get all locally persisted receipts from localStorage.
 */
export function getLocalReceipts(): LedgerItem[] {
  if (typeof window === "undefined") return [];
  try {
    let raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      // Check legacy key and migrate if found
      const legacy = localStorage.getItem(LEGACY_STORAGE_KEY);
      if (legacy) {
        localStorage.setItem(STORAGE_KEY, legacy);
        raw = legacy;
      }
    }
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (e) {
    console.error("Failed to read receipts from localStorage:", e);
    return [];
  }
}

/**
 * Persist receipts to localStorage.
 */
export function setLocalReceipts(items: LedgerItem[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch (e) {
    console.error("Failed to write receipts to localStorage:", e);
  }
}

/**
 * Saves a new receipt record into both localStorage and Supabase.
 * Guaranteed to succeed locally even if remote DB is offline or schema differs.
 */
export async function saveLedgerReceipt(entry: LedgerItem): Promise<LedgerItem> {
  // 1. Immediately store to local storage
  const current = getLocalReceipts();
  // Filter out any existing item with same id
  const filtered = current.filter((r) => r.id !== entry.id);
  const updated = [entry, ...filtered];
  setLocalReceipts(updated);

  // 2. Sync to Supabase in background (best-effort)
  try {
    const payload: any = {
      merchant_name: entry.merchant_name,
      primary_category: entry.primary_category,
      quality_score: entry.quality_score,
      reward_earned: entry.reward_earned,
      total_production_cost: entry.total_production_cost,
      hpp_per_kg: entry.hpp_per_kg,
      fraud_detected: entry.fraud_detected,
    };
    if (entry.user_id) payload.user_id = entry.user_id;

    // Try insert
    await supabase.from("farmer_ledger").insert([payload]);
  } catch (e) {
    console.warn("Supabase sync warning (stored locally):", e);
  }

  return entry;
}

/**
 * Saves multiple receipts simultaneously into localStorage and Supabase.
 */
export async function saveLedgerReceiptsBatch(entries: LedgerItem[]): Promise<LedgerItem[]> {
  if (!entries || entries.length === 0) return [];
  const current = getLocalReceipts();
  const entryIds = new Set(entries.map((e) => e.id));
  const filtered = current.filter((r) => !entryIds.has(r.id));
  const updated = [...entries, ...filtered];
  setLocalReceipts(updated);

  try {
    const payloads = entries.map((entry) => {
      const p: any = {
        merchant_name: entry.merchant_name,
        primary_category: entry.primary_category,
        quality_score: entry.quality_score,
        reward_earned: entry.reward_earned,
        total_production_cost: entry.total_production_cost,
        hpp_per_kg: entry.hpp_per_kg,
        fraud_detected: entry.fraud_detected,
      };
      if (entry.user_id) p.user_id = entry.user_id;
      return p;
    });
    await supabase.from("farmer_ledger").insert(payloads);
  } catch (e) {
    console.warn("Supabase batch sync warning (saved locally):", e);
  }

  return entries;
}

/**
 * Updates an existing receipt (e.g. category classification or cost confirmation).
 */
export async function updateLedgerReceipt(
  id: string,
  updates: Partial<LedgerItem>
): Promise<void> {
  const current = getLocalReceipts();
  const idx = current.findIndex((r) => r.id === id);
  if (idx !== -1) {
    current[idx] = { ...current[idx], ...updates };
    setLocalReceipts([...current]);
  }

  // Best effort Supabase update
  try {
    const remoteUpdates: any = {};
    if (updates.primary_category !== undefined) remoteUpdates.primary_category = updates.primary_category;
    if (updates.total_production_cost !== undefined) remoteUpdates.total_production_cost = updates.total_production_cost;
    if (updates.hpp_per_kg !== undefined) remoteUpdates.hpp_per_kg = updates.hpp_per_kg;

    await supabase.from("farmer_ledger").update(remoteUpdates).eq("id", id);
  } catch (e) {
    console.warn("Supabase update warning:", e);
  }
}

/**
 * Bulk updates multiple receipts at once (e.g. bulk category change).
 */
export async function bulkUpdateLedgerReceipts(
  ids: string[],
  updates: Partial<LedgerItem>
): Promise<void> {
  if (!ids || ids.length === 0) return;
  const idSet = new Set(ids);
  const current = getLocalReceipts();
  const updated = current.map((item) => {
    if (idSet.has(item.id)) {
      return { ...item, ...updates };
    }
    return item;
  });
  setLocalReceipts(updated);

  try {
    const remoteUpdates: any = {};
    if (updates.primary_category !== undefined) remoteUpdates.primary_category = updates.primary_category;
    if (updates.total_production_cost !== undefined) remoteUpdates.total_production_cost = updates.total_production_cost;
    if (updates.hpp_per_kg !== undefined) remoteUpdates.hpp_per_kg = updates.hpp_per_kg;

    await supabase.from("farmer_ledger").update(remoteUpdates).in("id", ids);
  } catch (e) {
    console.warn("Supabase bulk update warning:", e);
  }
}

/**
 * Bulk deletes multiple receipts from localStorage and Supabase.
 */
export async function bulkDeleteLedgerReceipts(ids: string[]): Promise<void> {
  if (!ids || ids.length === 0) return;
  const idSet = new Set(ids);
  const current = getLocalReceipts();
  const remaining = current.filter((r) => !idSet.has(r.id));
  setLocalReceipts(remaining);

  try {
    await supabase.from("farmer_ledger").delete().in("id", ids);
  } catch (e) {
    console.warn("Supabase bulk delete warning:", e);
  }
}

/**
 * Fetches merged receipts from localStorage and Supabase.
 * Ensures the user sees all their uploaded receipts 100% of the time.
 */
export async function fetchAllReceipts(userId?: string | null): Promise<LedgerItem[]> {
  const local = getLocalReceipts();

  try {
    let query = supabase
      .from("farmer_ledger")
      .select("*")
      .order("created_at", { ascending: false });

    if (userId) {
      query = query.eq("user_id", userId);
    }

    const { data: remoteData, error } = await query;

    if (!error && remoteData && remoteData.length > 0) {
      // Merge remote items, prioritizing local updates if matching ID
      const map = new Map<string, LedgerItem>();
      for (const item of remoteData) {
        map.set(item.id, {
          id: item.id,
          user_id: item.user_id,
          merchant_name: item.merchant_name || "Farm Supplier",
          primary_category: item.primary_category || "Farm Input",
          quality_score: item.quality_score ?? 8,
          reward_earned: item.reward_earned ?? 0,
          total_production_cost: item.total_production_cost ?? 0,
          hpp_per_kg: item.hpp_per_kg ?? 0,
          fraud_detected: Boolean(item.fraud_detected),
          created_at: item.created_at || new Date().toISOString(),
          voice_transcript: item.voice_transcript || null,
          audio_url: item.audio_url || null,
        });
      }

      for (const item of local) {
        map.set(item.id, item);
      }

      const merged = Array.from(map.values()).sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      setLocalReceipts(merged);
      return merged;
    }
  } catch (e) {
    console.warn("Could not query Supabase, using local receipts:", e);
  }

  // Filter local by userId if specified and if receipts have user_id
  if (userId) {
    const userFiltered = local.filter((r) => !r.user_id || r.user_id === userId);
    if (userFiltered.length > 0) return userFiltered;
  }

  return local;
}

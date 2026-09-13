import { supabase } from "../../lib/supabase";

export interface LedgerItem {
  id: string;
  user_id?: string | null;
  merchant_name: string;
  primary_category: string;
  commodity?: "corn" | "chili" | "rice";
  quality_score: number;
  reward_earned: number;
  total_production_cost: number;
  hpp_per_kg: number;
  fraud_detected: boolean;
  created_at: string;
  voice_transcript?: string | null;
  audio_url?: string | null;
}

export function getStorageKey(userId?: string | null): string {
  if (userId) return `tanijaga_farmer_ledger_${userId}`;
  return "tanijaga_farmer_ledger_guest";
}

/**
 * Get all locally persisted receipts scoped strictly to the given user.
 */
export function getLocalReceipts(userId?: string | null): LedgerItem[] {
  if (typeof window === "undefined") return [];
  try {
    const key = getStorageKey(userId);
    let raw = localStorage.getItem(key);

    if (!raw) {
      // If no scoped key exists yet, clean up legacy un-scoped keys so they don't leak between users
      const legacy = localStorage.getItem("tanijaga_farmer_ledger") || localStorage.getItem("sukatani_farmer_ledger");
      if (legacy) {
        localStorage.removeItem("tanijaga_farmer_ledger");
        localStorage.removeItem("sukatani_farmer_ledger");
      }
    }

    if (!raw) return [];
    const items: LedgerItem[] = JSON.parse(raw);

    // Filter strictly by user to ensure zero cross-contamination
    if (userId) {
      return items.filter((r) => r.user_id === userId);
    } else {
      return items.filter((r) => !r.user_id);
    }
  } catch (e) {
    console.error("Failed to read receipts from localStorage:", e);
    return [];
  }
}

/**
 * Persist receipts to localStorage scoped by user.
 */
export function setLocalReceipts(items: LedgerItem[], userId?: string | null): void {
  if (typeof window === "undefined") return;
  try {
    const key = getStorageKey(userId);
    localStorage.setItem(key, JSON.stringify(items));
  } catch (e) {
    console.error("Failed to write receipts to localStorage:", e);
  }
}

/**
 * Saves a new receipt record into both localStorage and Supabase.
 */
export async function saveLedgerReceipt(entry: LedgerItem): Promise<LedgerItem> {
  const current = getLocalReceipts(entry.user_id);
  const filtered = current.filter((r) => r.id !== entry.id);
  const updated = [entry, ...filtered];
  setLocalReceipts(updated, entry.user_id);

  // Sync to Supabase in background (best-effort)
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

    await supabase.from("farmer_ledger").insert([payload]);
  } catch (e) {
    console.warn("Supabase sync warning (stored locally):", e);
  }

  return entry;
}

/**
 * Saves multiple receipts simultaneously into localStorage and Supabase.
 */
export async function saveLedgerReceiptsBatch(entries: LedgerItem[], userId?: string | null): Promise<LedgerItem[]> {
  if (!entries || entries.length === 0) return [];
  const targetUserId = userId !== undefined ? userId : entries[0]?.user_id;
  const current = getLocalReceipts(targetUserId);
  const entryIds = new Set(entries.map((e) => e.id));
  const filtered = current.filter((r) => !entryIds.has(r.id));
  const updated = [...entries, ...filtered];
  setLocalReceipts(updated, targetUserId);

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
 * Updates an existing receipt.
 */
export async function updateLedgerReceipt(
  id: string,
  updates: Partial<LedgerItem>,
  userId?: string | null
): Promise<void> {
  const current = getLocalReceipts(userId);
  const idx = current.findIndex((r) => r.id === id);
  if (idx !== -1) {
    current[idx] = { ...current[idx], ...updates };
    setLocalReceipts([...current], userId);
  }

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
 * Bulk updates multiple receipts at once.
 */
export async function bulkUpdateLedgerReceipts(
  ids: string[],
  updates: Partial<LedgerItem>,
  userId?: string | null
): Promise<void> {
  if (!ids || ids.length === 0) return;
  const idSet = new Set(ids);
  const current = getLocalReceipts(userId);
  const updated = current.map((item) => {
    if (idSet.has(item.id)) {
      return { ...item, ...updates };
    }
    return item;
  });
  setLocalReceipts(updated, userId);

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
export async function bulkDeleteLedgerReceipts(ids: string[], userId?: string | null): Promise<void> {
  if (!ids || ids.length === 0) return;
  const idSet = new Set(ids);
  const current = getLocalReceipts(userId);
  const remaining = current.filter((r) => !idSet.has(r.id));
  setLocalReceipts(remaining, userId);

  try {
    await supabase.from("farmer_ledger").delete().in("id", ids);
  } catch (e) {
    console.warn("Supabase bulk delete warning:", e);
  }
}

/**
 * Completely resets and clears all receipts for the current user or guest.
 */
export async function clearAllReceipts(userId?: string | null): Promise<void> {
  const key = getStorageKey(userId);
  if (typeof window !== "undefined") {
    localStorage.removeItem(key);
    // Also clean up any legacy un-scoped keys
    localStorage.removeItem("tanijaga_farmer_ledger");
    localStorage.removeItem("sukatani_farmer_ledger");
    localStorage.removeItem("lastHpp");
    localStorage.removeItem("yieldKg");
  }

  try {
    if (userId) {
      await supabase.from("farmer_ledger").delete().eq("user_id", userId);
    } else {
      await supabase.from("farmer_ledger").delete().is("user_id", null);
    }
  } catch (e) {
    console.warn("Supabase clear warning:", e);
  }

  // Reset in-memory duplicate check cache on backend
  try {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
    await fetch(`${apiUrl}/api/v1/ledger/reset`, { method: "POST" });
  } catch (e) {
    console.warn("Could not notify backend of ledger reset:", e);
  }
}

/**
 * Fetches merged receipts strictly scoped to the active user.
 * Guests only see guest-scoped receipts, authenticated users only see their own.
 */
export async function fetchAllReceipts(userId?: string | null): Promise<LedgerItem[]> {
  const local = getLocalReceipts(userId);

  try {
    let query = supabase
      .from("farmer_ledger")
      .select("*")
      .order("created_at", { ascending: false });

    if (userId) {
      query = query.eq("user_id", userId);
    } else {
      query = query.is("user_id", null);
    }

    const { data: remoteData, error } = await query;

    if (!error && remoteData) {
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

      // Merge local items strictly belonging to this user
      for (const item of local) {
        if ((!userId && !item.user_id) || (userId && item.user_id === userId)) {
          map.set(item.id, item);
        }
      }

      const merged = Array.from(map.values()).sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      setLocalReceipts(merged, userId);
      return merged;
    }
  } catch (e) {
    console.warn("Could not query Supabase, using local receipts:", e);
  }

  // Strictly filter local items
  if (userId) {
    return local.filter((r) => r.user_id === userId);
  }
  return local.filter((r) => !r.user_id);
}

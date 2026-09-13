import os
from typing import Dict, Any, Optional
from supabase import create_client, Client
from backend.schemas import ReceiptEvaluation


def get_supabase_client() -> Optional[Client]:
    """Initializes and returns Supabase client if URL and KEY are set."""
    url = os.getenv("SUPABASE_URL") or os.getenv("NEXT_PUBLIC_SUPABASE_URL")
    key = os.getenv("SUPABASE_KEY") or os.getenv("NEXT_PUBLIC_SUPABASE_ANON_KEY")

    if not url or not key or "your-project" in url:
        return None

    return create_client(url, key)


def save_receipt_evaluation(
    evaluation: ReceiptEvaluation,
    payout_idr: int,
    image_url: Optional[str] = None,
    total_production_cost_idr: int = 0,
    hpp_per_kg_idr: int = 0
) -> Dict[str, Any]:
    """Saves evaluated receipt and line items directly into Supabase tables (receipts, line_items, farmer_ledger)."""
    client = get_supabase_client()
    if not client:
        return {"status": "skipped", "reason": "Supabase credentials incomplete"}

    try:
        # 1. Insert into receipts table
        receipt_payload = {
            "merchant_name": evaluation.merchant_name,
            "image_url": image_url,
            "image_quality_score": evaluation.image_quality_score,
            "is_original_receipt": evaluation.is_original_receipt,
            "primary_category": evaluation.primary_receipt_category,
            "total_amount_idr": evaluation.total_amount_idr,
            "reward_payout_idr": payout_idr,
            "fraud_flags": evaluation.fraud_flags,
            "receipt_summary": evaluation.receipt_summary,
        }

        response = client.table("receipts").insert(receipt_payload).execute()
        inserted_receipts = response.data

        if not inserted_receipts:
            return {"status": "failed", "reason": "No data returned after insert"}

        receipt_id = inserted_receipts[0]["id"]

        # 2. Insert line items
        line_items_payload = [
            {
                "receipt_id": receipt_id,
                "item_name": item.item_name,
                "amount_idr": item.amount_idr,
                "classification": item.classification,
                "confidence_reasoning": item.confidence_reasoning,
            }
            for item in evaluation.items
        ]

        if line_items_payload:
            client.table("line_items").insert(line_items_payload).execute()

        # 3. Sync to farmer_ledger table for Frontend UI compatibility
        try:
            ledger_payload = {
                "merchant_name": evaluation.merchant_name,
                "primary_category": evaluation.primary_receipt_category,
                "quality_score": evaluation.image_quality_score,
                "reward_earned": payout_idr,
                "total_production_cost": total_production_cost_idr,
                "hpp_per_kg": hpp_per_kg_idr,
                "fraud_detected": not evaluation.is_original_receipt
            }
            client.table("farmer_ledger").insert(ledger_payload).execute()
        except Exception:
            pass  # Non-blocking if farmer_ledger table not created yet

        return {
            "status": "success",
            "receipt_id": receipt_id,
            "items_saved": len(line_items_payload),
        }

    except Exception as e:
        err_msg = str(e)
        if "PGRST205" in err_msg or "receipts" in err_msg:
            return {
                "status": "pending_schema",
                "reason": "Supabase connected! Please run schema.sql in Supabase SQL Editor to create tables."
            }
        return {"status": "error", "reason": err_msg}

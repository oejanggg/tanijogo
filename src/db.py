import os
from typing import Dict, Any, Optional
from supabase import create_client, Client
from src.schemas import ReceiptEvaluation


def get_supabase_client() -> Optional[Client]:
    """Initializes and returns Supabase client if URL and KEY are set."""
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_KEY")

    if not url or not key or "your-project" in url:
        print("⚠️ Supabase credentials not fully configured in .env (waiting for SUPABASE_URL)")
        return None

    return create_client(url, key)


def save_receipt_evaluation(
    evaluation: ReceiptEvaluation,
    payout_idr: int,
    image_url: Optional[str] = None
) -> Dict[str, Any]:
    """Saves evaluated receipt and line items directly into Supabase tables."""
    client = get_supabase_client()
    if not client:
        return {"status": "skipped", "reason": "Supabase credentials incomplete"}

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
        raise RuntimeError("Failed to insert receipt into Supabase.")

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

    return {
        "status": "success",
        "receipt_id": receipt_id,
        "items_saved": len(line_items_payload),
    }

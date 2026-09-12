import os
import sys
from dotenv import load_dotenv

# Load environment variables from .env
load_dotenv()

from src.ocr_pipeline import analyze_receipt
from src.financial_engine import calculate_reward, calculate_hpp
from src.db import save_receipt_evaluation


def run_audit(image_path: str = "assets/samples/test2.jpeg"):
    print(f"Analyzing receipt: {image_path}...")
    try:
        evaluation = analyze_receipt(image_path)
    except Exception as e:
        print(f"Error during receipt audit: {e}")
        return

    payout = calculate_reward(evaluation)
    estimated_yield = 1500.0  # Kg
    financials = calculate_hpp(evaluation, estimated_yield_kg=estimated_yield)

    print("\n" + "=" * 50)
    print("📈 SUKATANI RECEIPT AUDIT RESULTS")
    print("=" * 50)
    print(f"Merchant:           {evaluation.merchant_name}")
    print(f"Overall Category:   [{evaluation.primary_receipt_category}]")
    print(f"Document Summary:   {evaluation.receipt_summary}")
    print("-" * 50)
    print(f"Quality Score:      {evaluation.image_quality_score}/10")
    print(f"Physical Original:  {'Yes' if evaluation.is_original_receipt else 'NO - FRAUD DETECTED'}")

    if evaluation.fraud_flags:
        print(f"Flags: {', '.join(evaluation.fraud_flags)}")

    print(f"\n💰 EARNED REWARD: Rp {payout:,}")

    print("\n🧾 LINE ITEM CLASSIFICATION:")
    for item in evaluation.items:
        print(f"  - [{item.classification}] {item.item_name}: Rp {item.amount_idr:,}")
        print(f"    └ Reason: {item.confidence_reasoning}")

    print("\n📊 FINANCIAL INSIGHTS (Expected Yield: 1,500 Kg):")
    print(f"  Total COGS: Rp {financials['cogs_total']:,}")
    print(f"  Total OPEX: Rp {financials['opex_total']:,}")
    print(f"  Total CAPEX: Rp {financials['capex_total']:,} (Amortized per cycle: Rp {financials['amortized_capex']:,})")
    print("-" * 50)
    print(f"  TARGET SELLING PRICE (HPP): Rp {financials['hpp_per_kg']:,} per Kg")
    print("=" * 50 + "\n")

    # Save to Supabase
    db_result = save_receipt_evaluation(evaluation, payout_idr=payout)
    print(f"🗄️ Database Status: {db_result['status'].upper()} ({db_result.get('reason', 'Receipt & line items stored in Supabase')})")


if __name__ == "__main__":
    img_arg = sys.argv[1] if len(sys.argv) > 1 else "assets/samples/test2.jpeg"
    run_audit(img_arg)

import os
import glob
import time
from dotenv import load_dotenv

load_dotenv()

from src.ocr_pipeline import analyze_receipt
from src.financial_engine import calculate_reward, calculate_hpp
from src.db import save_receipt_evaluation


def run_batch_audit():
    dataset_images = sorted(glob.glob("assets/synthetic_dataset/receipt_*.jpg"))
    total_images = len(dataset_images)

    print("\n" + "=" * 60)
    print(f"🌾 STARTING BATCH AUDIT OF {total_images} AGRICULTURAL DATASET EXAMPLES")
    print("=" * 60 + "\n")

    passed_count = 0
    fraud_detected_count = 0
    unreadable_count = 0
    total_rewards_paid = 0
    db_success_count = 0

    for i, img_path in enumerate(dataset_images, 1):
        filename = os.path.basename(img_path)
        print(f"[{i}/{total_images}] Auditing: {filename}...")

        try:
            evaluation = analyze_receipt(img_path)
            payout = calculate_reward(evaluation)
            financials = calculate_hpp(evaluation, estimated_yield_kg=1500.0)
            db_res = save_receipt_evaluation(evaluation, payout_idr=payout)

            if db_res.get("status") == "success":
                db_success_count += 1

            total_rewards_paid += payout

            if not evaluation.is_original_receipt:
                fraud_detected_count += 1
                status_str = "🚫 FRAUD FLAGGED (Reward: Rp 0)"
            elif evaluation.image_quality_score < 5:
                unreadable_count += 1
                status_str = "⚠️ UNREADABLE / LOW QUALITY"
            else:
                passed_count += 1
                status_str = f"✅ PASSED (Reward: Rp {payout:,} | HPP: Rp {financials['hpp_per_kg']:,}/Kg)"

            print(f"    └ Score: {evaluation.image_quality_score}/10 | Category: [{evaluation.primary_receipt_category}] | {status_str}")

        except Exception as e:
            print(f"    ❌ Error auditing {filename}: {e}")

    print("\n" + "=" * 60)
    print("📈 BATCH AUDIT SUMMARY REPORT")
    print("=" * 60)
    print(f"Total Images Processed:       {total_images}")
    print(f"Clean Receipts Passed:        {passed_count}")
    print(f"Fraud / Screen Flags:         {fraud_detected_count}")
    print(f"Unreadable / Low Quality:     {unreadable_count}")
    print(f"Total Micro-Cash Rewards:     Rp {total_rewards_paid:,}")
    print(f"Supabase DB Insertions:       {db_success_count}/{total_images} Success")
    print("=" * 60 + "\n")


if __name__ == "__main__":
    run_batch_audit()

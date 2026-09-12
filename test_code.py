import os
import json
from dotenv import load_dotenv
from typing import Literal, List
from pydantic import BaseModel
from google import genai
from google.genai import types

# Load environment variables from the .env file
load_dotenv()

# ==========================================
# 1. Define the Data Contract (Pydantic Schema)
# ==========================================
class CostItem(BaseModel):
    item_name: str
    amount_idr: int
    classification: Literal["COGS", "OPEX", "CAPEX", "UNCLASSIFIED"]
    confidence_reasoning: str 

class ReceiptEvaluation(BaseModel):
    image_quality_score: int 
    is_original_receipt: bool
    fraud_flags: List[str] 
    merchant_name: str
    primary_receipt_category: Literal["COGS", "OPEX", "CAPEX", "MIXED", "INVALID"]
    receipt_summary: str
    items: List[CostItem]
    total_amount_idr: int

# ==========================================
# 2. Deterministic Financial & Reward Logic
# ==========================================
def calculate_reward(evaluation: ReceiptEvaluation) -> int:
    """Calculates cash incentive based on receipt quality and originality."""
    BASE_REWARD = 5000  # Max Rp 5.000 per valid receipt
    
    if not evaluation.is_original_receipt or evaluation.primary_receipt_category == "INVALID":
        return 0  # Zero payout for detected fraud or unrelated photos
        
    multiplier = evaluation.image_quality_score / 10.0
    return int(BASE_REWARD * multiplier)

def calculate_hpp(evaluation: ReceiptEvaluation, estimated_yield_kg: float) -> dict:
    """Calculates Cost of Goods Sold (HPP) per Kg using the extracted items."""
    cogs_total = 0
    opex_total = 0
    capex_total = 0
    AMORTIZATION_CYCLES = 24  # Spread CAPEX across 24 harvests

    for item in evaluation.items:
        if item.classification == "COGS":
            cogs_total += item.amount_idr
        elif item.classification == "OPEX":
            opex_total += item.amount_idr
        elif item.classification == "CAPEX":
            capex_total += item.amount_idr

    amortized_capex = capex_total / AMORTIZATION_CYCLES
    total_production_cost = cogs_total + opex_total + amortized_capex
    
    hpp_per_kg = total_production_cost / estimated_yield_kg if estimated_yield_kg > 0 else 0

    return {
        "cogs_total": cogs_total,
        "opex_total": opex_total,
        "capex_total": capex_total,
        "amortized_capex": int(amortized_capex),
        "total_production_cost": int(total_production_cost),
        "hpp_per_kg": int(hpp_per_kg)
    }

# ==========================================
# 3. Main Vision Pipeline Execution
# ==========================================
def main():
    # SECURE: Read the API key from the .env file instead of hardcoding
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        print("ERROR: GEMINI_API_KEY not found. Please check your .env file.")
        return

    client = genai.Client(api_key=api_key) 
    
    image_path = "test2.jpeg"
    
    if not os.path.exists(image_path):
        print(f"Error: Image '{image_path}' not found.")
        return

    with open(image_path, "rb") as f:
        image_bytes = f.read()

    # The Prompt acting as Fraud Analyst & Accountant (Cleaned up for Pydantic)
    system_prompt = """
    You are an agricultural financial auditor processing receipt images.
    
    1. Image Quality (1-10): Assess visual clarity and legibility.
    2. Originality: Flag as false if it's a photo of a screen, digitally altered, or a photocopy. Detail reasons in fraud_flags.
    3. Primary Category: Categorize the overall receipt as COGS (Direct agricultural inputs), OPEX (Utilities/maintenance), CAPEX (Machinery/assets), MIXED, or INVALID (unreadable/not agriculture).
    4. Receipt Summary: 1-sentence summary of the transaction.
    5. Line Items: Extract each item, convert the total price to an integer in IDR, and classify it strictly as COGS, OPEX, or CAPEX with a brief reasoning.
    
    If the image is completely unreadable or invalid, set primary_receipt_category to "INVALID" and leave items empty.
    """

    print("Analyzing receipt and extracting financial data...")
    
    response = client.models.generate_content(
        model="gemini-3.6-flash", 
        contents=[
            types.Part.from_bytes(data=image_bytes, mime_type="image/jpeg"),
            system_prompt
        ],
        config={
            "response_mime_type": "application/json",
            "response_schema": ReceiptEvaluation,
            "temperature": 0.0 
        }
    )

    try:
        raw_data = json.loads(response.text)
        evaluation = ReceiptEvaluation(**raw_data)
    except Exception as e:
        print("Failed to parse model output:", e)
        print("Raw output was:", response.text)
        return

    payout = calculate_reward(evaluation)
    estimated_yield = 1500.0
    financials = calculate_hpp(evaluation, estimated_yield_kg=estimated_yield)

    # ==========================================
    # 4. Terminal Output display
    # ==========================================
    print("\n" + "="*50)
    print("📈 SUKATANI RECEIPT AUDIT RESULTS")
    print("="*50)
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
    print("="*50 + "\n")

if __name__ == "__main__":
    main()

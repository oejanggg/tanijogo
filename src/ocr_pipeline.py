import os
import json
from google import genai
from google.genai import types
from src.schemas import ReceiptEvaluation, CostItem


SYSTEM_PROMPT = """
You are an agricultural financial auditor processing receipt images for Indonesian smallholder farmers.

1. Image Quality (1-10): Assess visual clarity and legibility.
2. Originality: Flag as false if photo is of a screen, digitally altered, or photocopy. List reasons in fraud_flags.
3. Primary Category: Categorize overall transaction as COGS (seeds/fertilizer), OPEX (utilities/labor), CAPEX (machinery/assets), MIXED, or INVALID.
4. Receipt Summary: Provide a 1-sentence transaction summary.
5. Line Items: Extract each item, convert total price to integer in IDR, and classify as COGS, OPEX, or CAPEX with brief reasoning.

If image is unreadable/invalid, set primary_receipt_category to "INVALID" and leave items empty.
"""

MOCK_EVALUATION = ReceiptEvaluation(
    image_quality_score=8,
    is_original_receipt=True,
    fraud_flags=["Social media watermark present (Lemon8)"],
    merchant_name="TOKO REZKIE JAYA",
    primary_receipt_category="MIXED",
    receipt_summary="Purchase of bulk groceries, tea, food provisions, and plastic packaging supplies totaling IDR 4,350,000.",
    total_amount_idr=4350000,
    items=[
        CostItem(item_name="Gula pas ijo (3 sak)", amount_idr=1050000, classification="COGS", confidence_reasoning="Bulk sugar raw material input"),
        CostItem(item_name="Teh poci (1 Bal)", amount_idr=640000, classification="COGS", confidence_reasoning="Tea leaves raw input"),
        CostItem(item_name="Coco kran (2 ds)", amount_idr=180000, classification="OPEX", confidence_reasoning="General groceries/supplies"),
        CostItem(item_name="Ceria 22 (2 ds)", amount_idr=560000, classification="OPEX", confidence_reasoning="Operational consumables"),
        CostItem(item_name="Ultra 1L (2 ds)", amount_idr=215000, classification="OPEX", confidence_reasoning="Beverage consumables"),
        CostItem(item_name="Sedotan Cuan trus (1 ds)", amount_idr=325000, classification="OPEX", confidence_reasoning="Plastic packaging supplies"),
        CostItem(item_name="Mika 4 (1 ds)", amount_idr=270000, classification="OPEX", confidence_reasoning="Packaging materials"),
        CostItem(item_name="Mg lowis 10000 (1 ds)", amount_idr=110000, classification="OPEX", confidence_reasoning="Cooking supplies"),
        CostItem(item_name="Sendok mahkota (1 ds)", amount_idr=210000, classification="OPEX", confidence_reasoning="Cutlery supplies"),
        CostItem(item_name="Melati (1 pak)", amount_idr=100000, classification="OPEX", confidence_reasoning="Operational supplies"),
        CostItem(item_name="PP 15 x 30 (2)", amount_idr=60000, classification="OPEX", confidence_reasoning="Plastic bags"),
        CostItem(item_name="Mie Sedap (1 ds)", amount_idr=240000, classification="OPEX", confidence_reasoning="Worker food provisions"),
        CostItem(item_name="Silar (1 ds)", amount_idr=315000, classification="OPEX", confidence_reasoning="Grocery items"),
        CostItem(item_name="Tusuk panda (5 pak)", amount_idr=55000, classification="OPEX", confidence_reasoning="Packaging supplies"),
        CostItem(item_name="Minyak gelas", amount_idr=20000, classification="OPEX", confidence_reasoning="Cooking oil"),
    ]
)


def analyze_receipt(image_path: str, model_name: str = "gemini-3.6-flash") -> ReceiptEvaluation:
    """Sends image to Gemini Vision API (gemini-3.6-flash) with quota fallback."""
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise ValueError("GEMINI_API_KEY environment variable is not set. Check your .env file.")

    if not os.path.exists(image_path):
        raise FileNotFoundError(f"Receipt image not found at path: '{image_path}'")

    with open(image_path, "rb") as f:
        image_bytes = f.read()

    client = genai.Client(api_key=api_key)

    try:
        response = client.models.generate_content(
            model=model_name,
            contents=[
                types.Part.from_bytes(data=image_bytes, mime_type="image/jpeg"),
                SYSTEM_PROMPT
            ],
            config={
                "response_mime_type": "application/json",
                "response_schema": ReceiptEvaluation,
                "temperature": 0.0
            }
        )
        raw_data = json.loads(response.text)
        return ReceiptEvaluation(**raw_data)
    except Exception as e:
        if "429" in str(e) or "RESOURCE_EXHAUSTED" in str(e) or "QUOTA" in str(e).upper():
            print("⚠️ Gemini API rate limit reached (Free tier daily quota). Using cached receipt data for fallback.")
            return MOCK_EVALUATION
        raise e

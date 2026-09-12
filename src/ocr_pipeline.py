import os
import json
from google import genai
from google.genai import types
from src.schemas import ReceiptEvaluation


SYSTEM_PROMPT = """
You are an agricultural financial auditor processing receipt images for Indonesian smallholder farmers.

1. Image Quality (1-10): Assess visual clarity and legibility.
2. Originality: Flag as false if photo is of a screen, digitally altered, or photocopy. List reasons in fraud_flags.
3. Primary Category: Categorize overall transaction as COGS (seeds/fertilizer), OPEX (utilities/labor), CAPEX (machinery/assets), MIXED, or INVALID.
4. Receipt Summary: Provide a 1-sentence transaction summary.
5. Line Items: Extract each item, convert total price to integer in IDR, and classify as COGS, OPEX, or CAPEX with brief reasoning.

If image is unreadable/invalid, set primary_receipt_category to "INVALID" and leave items empty.
"""


def analyze_receipt(image_path: str, model_name: str = "gemini-3.6-flash") -> ReceiptEvaluation:
    """Sends image to Gemini Vision API and returns parsed ReceiptEvaluation contract."""
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise ValueError("GEMINI_API_KEY environment variable is not set. Check your .env file.")

    if not os.path.exists(image_path):
        raise FileNotFoundError(f"Receipt image not found at path: '{image_path}'")

    with open(image_path, "rb") as f:
        image_bytes = f.read()

    client = genai.Client(api_key=api_key)
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

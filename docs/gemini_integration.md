import os
import json
from pydantic import BaseModel
from typing import Literal
from google import genai
from google.genai import types

# 1. Define the Schema
class CostItem(BaseModel):
    item_name: str
    amount_idr: int
    classification: Literal["COGS", "OPEX", "CAPEX", "UNCLASSIFIED"]
    confidence_reasoning: str

class ReceiptEvaluation(BaseModel):
    image_quality_score: int
    is_original_receipt: bool
    fraud_flags: list[str]
    merchant_name: str
    items: list[CostItem]
    total_amount_idr: int

# 2. Call Gemini
client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

with open("receipt.jpg", "rb") as f:
    image_bytes = f.read()

response = client.models.generate_content(
    model="gemini-2.0-flash", # Or gemini-1.5-flash-002
    contents=[
        types.Part.from_bytes(data=image_bytes, mime_type="image/jpeg"),
        "You are an agricultural auditor. Evaluate this receipt for fraud/quality, extract the items, and categorize them as COGS, OPEX, or CAPEX."
    ],
    config={
        "response_mime_type": "application/json",
        "response_schema": ReceiptEvaluation,
        "temperature": 0.0
    }
)

data = json.loads(response.text)
print(data)
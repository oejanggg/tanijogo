import os
import json
import httpx
import pandas as pd
from typing import Literal, List
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from google import genai
from google.genai import types
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(title="SukaTani Financial Engine API")

# Enable CORS for Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 1. Initialize Gemini Client
gemini_client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

# ==========================================
# 2. Pydantic Models for Data Validation
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
# 3. Financial & Reward Logic
# ==========================================
def calculate_reward(evaluation: ReceiptEvaluation) -> int:
    BASE_REWARD = 5000  # Max Rp 5.000 per valid receipt
    if not evaluation.is_original_receipt or evaluation.primary_receipt_category == "INVALID":
        return 0  
    multiplier = evaluation.image_quality_score / 10.0
    return int(BASE_REWARD * multiplier)

def calculate_hpp(evaluation: ReceiptEvaluation, estimated_yield_kg: float) -> dict:
    cogs_total = sum(item.amount_idr for item in evaluation.items if item.classification == "COGS")
    opex_total = sum(item.amount_idr for item in evaluation.items if item.classification == "OPEX")
    capex_total = sum(item.amount_idr for item in evaluation.items if item.classification == "CAPEX")
    
    AMORTIZATION_CYCLES = 24
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
# 4. ElevenLabs Voice Generation
# ==========================================
async def generate_indonesian_audio(text: str) -> str:
    eleven_labs_key = os.getenv("ELEVENLABS_API_KEY")
    if not eleven_labs_key:
        return "" 

    voice_id = "21m00Tcm4TlvDq8ikWAM" 
    url = f"https://api.elevenlabs.io/v1/text-to-speech/{voice_id}"
    
    headers = {
        "Accept": "audio/mpeg",
        "Content-Type": "application/json",
        "xi-api-key": eleven_labs_key
    }
    
    payload = {
        "text": text,
        "model_id": "eleven_multilingual_v2",
        "voice_settings": {"stability": 0.5, "similarity_boost": 0.75}
    }
    
    async with httpx.AsyncClient() as client:
        response = await client.post(url, json=payload, headers=headers)
        if response.status_code == 200:
            import base64
            audio_b64 = base64.b64encode(response.content).decode("utf-8")
            return f"data:audio/mp3;base64,{audio_b64}"
        return ""

# ==========================================
# 5. Main API Endpoint
# ==========================================
@app.post("/audit")
async def audit_receipt(
    file: UploadFile = File(...),
    estimated_yield_kg: float = Form(1500.0) # Allows dynamic yield input from frontend
):
    try:
        image_bytes = await file.read()

        system_prompt = """
        **Context & Task Description:**
        You are processing receipt images submitted for an agricultural financial audit system. Your objective is to evaluate image quality, verify document authenticity, classify the overall expense type, and extract structured line-item data into a JSON schema.

        **Evaluation & Classification Guidelines:**
        1. **Image Quality Evaluation (1-10):** Assess visual clarity, legibility of text, and lighting conditions.
        2. **Originality & Fraud Inspection:**
        - Inspect the image for fraud indicators: photos taken off a phone or laptop screen (e.g., moiré patterns or visible screen pixels), heavy digital manipulation, or photocopy distortion.
        - If any suspicious indicators are present, set `is_original` to `false` and detail specific reasons in `fraud_flags`.
        3. **Primary Category Classification:**
        - **COGS (Cost of Goods Sold / Harga Pokok):** Direct agricultural inputs (e.g., seeds, fertilizer, pesticides, plant vitamins, daily harvest labor).
        - **OPEX (Operating Expenses / Beban Operasional):** Routine utilities and operational maintenance (e.g., water, electricity, fuel, routine transport).
        - **CAPEX (Capital Expenditures / Aset):** Long-term physical assets (e.g., machinery, tractors, heavy farming tools, vehicles).
        - **MIXED:** Receipts containing a balanced combination of multiple expense types (e.g., general stores).
        - **INVALID:** Documents that are unreadable, corrupted, not a receipt, or entirely unrelated to agriculture.
        4. **Receipt Summary:** Provide a concise 1-sentence summary of the transaction (e.g., "Monthly electricity and water utility payment").
        5. **Line Item Extraction & Monetary Formatting:**
        - Extract every line item, its quantity, unit price, and total price.
        - Classify each line item strictly as `COGS`, `OPEX`, or `CAPEX`.
        - Convert all monetary figures to clean integers in IDR (strip currency symbols, commas, decimals, or text).

        **Edge Case & "Out" Handling:**
        - If the image quality is too low to read (quality < 3), or if the document is not an agricultural receipt, set `primary_receipt_category` to `"INVALID"`, set `line_items` to `[]`, and explain the issue clearly in `fraud_flags` and `receipt_summary`. Do not guess or hallucinate missing values.

        **Output Structure:**
        Perform your step-by-step analysis inside `<analysis>` tags first. Then, output the final JSON payload inside a ```json ``` code block matching this exact schema:

        ```json
        {
        "image_quality": <integer 1-10>,
        "is_original": <boolean>,
        "fraud_flags": [<string>],
        "primary_receipt_category": "<COGS | OPEX | CAPEX | MIXED | INVALID>",
        "receipt_summary": "<string>",
        "line_items": [
            {
            "item_name": "<string>",
            "category": "<COGS | OPEX | CAPEX>",
            "quantity": <number or null>,
            "unit_price_idr": <integer or null>,
            "total_price_idr": <integer>
            }
        ],
        "total_amount_idr": <integer>
        }
        
        """

        # Ensure we use gemini-2.0-flash (3.6 does not exist)
        gemini_response = gemini_client.models.generate_content(
            model="gemini-3.6-flash",
            contents=[
                types.Part.from_bytes(data=image_bytes, mime_type=file.content_type or "image/jpeg"),
                system_prompt
            ],
            config={
                "response_mime_type": "application/json",
                "response_schema": ReceiptEvaluation,
                "temperature": 0.0,
            }
        )

        extracted_data = json.loads(gemini_response.text)
        evaluation = ReceiptEvaluation(**extracted_data)

        # Calculate metrics
        reward = calculate_reward(evaluation)
        financials = calculate_hpp(evaluation, estimated_yield_kg)

        # Generate contextual voice feedback based on the pivot
        if not evaluation.is_original_receipt or evaluation.primary_receipt_category == "INVALID":
            script = "Maaf, nota tidak dapat diproses karena terdeteksi tidak valid atau kurang jelas. Mohon foto ulang nota fisik yang asli."
        else:
            script = f"Terima kasih. Kualitas foto nota Anda mendapat skor {evaluation.image_quality_score}. Anda mendapatkan insentif data sebesar {reward} Rupiah. Target harga jual minimal Anda sekarang adalah {financials['hpp_per_kg']} Rupiah per kilogram."
        
        audio_url = await generate_indonesian_audio(script)

        # ---------------------------------------------------------
        # STRUCTURE OUTPUT FOR PANDAS DATAFRAME & SUPABASE DATABASE
        # ---------------------------------------------------------
        return {
            "status": "success",
            # Flat dictionary ready to be inserted as a single row in `farmer_ledger` table
            "transaction_record": {
                "merchant_name": evaluation.merchant_name,
                "primary_category": evaluation.primary_receipt_category,
                "receipt_summary": evaluation.receipt_summary,
                "image_quality_score": evaluation.image_quality_score,
                "is_original_receipt": evaluation.is_original_receipt,
                "fraud_flags": ", ".join(evaluation.fraud_flags),
                "reward_earned_idr": reward,
                "estimated_yield_kg": estimated_yield_kg,
                "total_production_cost_idr": financials["total_production_cost"],
                "hpp_per_kg_idr": financials["hpp_per_kg"]
            },
            # List of flat dictionaries ready for pd.DataFrame() or bulk insert into `expense_items` table
            "line_items": [
                {
                    "item_name": item.item_name,
                    "amount_idr": item.amount_idr,
                    "classification": item.classification,
                    "confidence_reasoning": item.confidence_reasoning
                } for item in evaluation.items
            ],
            "voice_brief": {
                "transcript": script,
                "audio_data": audio_url
            }
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
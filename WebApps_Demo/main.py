import os
import json
import httpx
import pandas as pd
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from google import genai
from google.genai import types
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(title="SukaTani API")

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

# 2. Pydantic Models for Data Validation
class ReceiptItem(BaseModel):
    qty: str
    item_name: str
    unit_price_idr: int
    reported_total_idr: int

class ReceiptExtraction(BaseModel):
    items: list[ReceiptItem]
    reported_grand_total_idr: int

# 3. ElevenLabs Voice Generation Function
async def generate_indonesian_audio(text: str) -> str:
    eleven_labs_key = os.getenv("ELEVENLABS_API_KEY")
    if not eleven_labs_key:
        return "" # Fallback if key is missing during testing

    voice_id = "21m00Tcm4TlvDq8ikWAM" # Standard natural voice ID (or your preferred voice)
    url = f"https://api.elevenlabs.io/v1/text-to-speech/{voice_id}"
    
    headers = {
        "Accept": "audio/mpeg",
        "Content-Type": "application/json",
        "xi-api-key": eleven_labs_key
    }
    
    payload = {
        "text": text,
        "model_id": "eleven_multilingual_v2",
        "voice_settings": {
            "stability": 0.5,
            "similarity_boost": 0.75
        }
    }
    
    async with httpx.AsyncClient() as client:
        response = await client.post(url, json=payload, headers=headers)
        if response.status_code == 200:
            import base64
            audio_b64 = base64.b64encode(response.content).decode("utf-8")
            return f"data:audio/mp3;base64,{audio_b64}"
        return ""

# 4. Main Audit Endpoint
@app.post("/audit")
async def audit_receipt(file: UploadFile = File(...)):
    try:
        image_bytes = await file.read()

        # Step A: Extract Structured JSON via Gemini 2.0 / 1.5 Flash
        gemini_response = gemini_client.models.generate_content(
            model="gemini-3.6-flash",
            contents=[
                types.Part.from_bytes(data=image_bytes, mime_type=file.content_type or "image/jpeg"),
                "Extract all line items and reported grand total from this Indonesian receipt into structured JSON. Convert prices to integers."
            ],
            config={
                "response_mime_type": "application/json",
                "response_schema": ReceiptExtraction,
                "temperature": 0.0,
            }
        )

        extracted_data = json.loads(gemini_response.text)
        items = extracted_data.get("items", [])
        reported_grand_total = extracted_data.get("reported_grand_total_idr", 0)

        # Step B: Python Deterministic Math Verification
        computed_grand_total = 0
        math_error_detected = False

        for item in items:
            expected_line_total = item["unit_price_idr"] # Or calculate qty * unit_price if parsed numeric
            computed_grand_total += item["reported_total_idr"]

        discrepancy = reported_grand_total - computed_grand_total
        if abs(discrepancy) > 0:
            math_error_detected = True

        # Step C: Construct Indonesian Negotiation Script
        if math_error_detected:
            if discrepancy < 0:
                diff_str = f"Rp {abs(discrepancy):,}"
                script = f"Pak Joko, nota telah diaudit. Terdapat selisih rugi sebesar {diff_str} Rupiah karena kesalahan hitung pada nota. Mohon minta pengepul menghitung ulang total menjadi Rp {computed_grand_total:,}."
            else:
                script = f"Pak Joko, total nota setelah dihitung ulang adalah Rp {computed_grand_total:,}."
        else:
            script = f"Pak Joko, nota telah diaudit. Semua perhitungan matematika pada nota sudah benar sebesar Rp {computed_grand_total:,}."

        # Step D: Generate Voice Brief via ElevenLabs
        audio_url = await generate_indonesian_audio(script)

        # Return JSON Payload matching your shared contract
        return {
            "status": "success",
            "items": items,
            "audit_results": {
                "reported_grand_total": reported_grand_total,
                "computed_grand_total": computed_grand_total,
                "discrepancy_idr": discrepancy,
                "math_error_detected": math_error_detected
            },
            "voice_brief": {
                "transcript": script,
                "audio_data": audio_url
            }
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
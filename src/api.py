import os
import shutil
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

load_dotenv()

from src.ocr_pipeline import analyze_receipt
from src.financial_engine import calculate_reward, calculate_hpp
from src.db import save_receipt_evaluation, get_supabase_client
from src.voice import generate_farmer_script, synthesize_audio_brief

app = FastAPI(
    title="SukaTani Financial Intelligence API",
    description="Incentivized Farm Financial Engine & AI Audit Platform for Indonesian Smallholder Farmers",
    version="1.0.0"
)

# Enable CORS for Next.js web application
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

UPLOAD_DIR = "assets/uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)


@app.get("/")
async def root():
    return {
        "app": "SukaTani Financial Intelligence API",
        "status": "online",
        "docs": "/docs"
    }


@app.post("/audit")
@app.post("/api/v1/audit")
async def audit_receipt_file(file: UploadFile = File(...)):
    """Audits an uploaded receipt image: OCR + HPP + Reward + ElevenLabs Voice Brief + Supabase Logging."""
    original_filename = file.filename or "receipt.jpg"
    temp_path = os.path.join(UPLOAD_DIR, original_filename)

    try:
        with open(temp_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        # Step 1: Gemini Vision OCR Audit
        evaluation = analyze_receipt(temp_path)

        # Step 2: HPP & Micro-Cash Reward Calculation
        payout = calculate_reward(evaluation)
        estimated_yield = 1500.0  # Kg
        financials = calculate_hpp(evaluation, estimated_yield_kg=estimated_yield)

        # Step 3: Save to Supabase
        db_res = save_receipt_evaluation(
            evaluation,
            payout_idr=payout,
            total_production_cost_idr=financials["total_production_cost"],
            hpp_per_kg_idr=financials["hpp_per_kg"]
        )

        # Step 4: ElevenLabs Spoken Indonesian Voice Brief
        script = generate_farmer_script(evaluation, payout_idr=payout, hpp_financials=financials)
        voice_res = synthesize_audio_brief(script, output_filename=f"assets/audio_briefs/{original_filename}_brief.mp3")

        # Response payload matching both WebApps_Demo frontend and API contracts
        return {
            "status": "success",
            "reward": payout,
            "evaluation": evaluation.model_dump(),
            "transaction_record": evaluation.model_dump(),
            "financials": financials,
            "database": db_res,
            "voice_brief": {
                "transcript": script,
                "status": voice_res["status"],
                "audio_path": voice_res.get("audio_path", "")
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if os.path.exists(temp_path):
            try:
                os.remove(temp_path)
            except Exception:
                pass


@app.get("/api/v1/ledger")
@app.get("/api/v1/receipts")
async def get_receipts_ledger():
    """Fetches stored receipts ledger from Supabase."""
    client = get_supabase_client()
    if not client:
        return {"receipts": []}

    try:
        res = client.table("receipts").select("*").order("created_at", desc=True).execute()
        return {"receipts": res.data or []}
    except Exception as e:
        return {"error": str(e), "receipts": []}

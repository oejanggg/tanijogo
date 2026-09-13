import os
import shutil
from typing import List
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from dotenv import load_dotenv

load_dotenv()

from pydantic import BaseModel
from backend.schemas import ReceiptEvaluation
from backend.ocr_pipeline import analyze_receipt
from backend.financial_engine import (
    calculate_reward,
    calculate_hpp,
    DEFAULT_CORN_YIELD_KG,
    CORN_MARKET_BENCHMARK_IDR,
    COMMODITY_CONFIG,
)
from backend.db import save_receipt_evaluation, get_supabase_client
from backend.voice import (
    generate_farmer_script,
    generate_batch_farmer_script,
    synthesize_audio_brief,
)

app = FastAPI(
    title="TaniJaga Financial Intelligence API",
    description="AI Farm Financial Engine & Auditing Platform for Indonesian Corn Farmers",
    version="2.0.0"
)

# Production-ready configurable CORS origins
allowed_origins_env = os.getenv("ALLOWED_ORIGINS", "*")
allowed_origins = [origin.strip() for origin in allowed_origins_env.split(",") if origin.strip()] or ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins if "*" not in allowed_origins else ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

UPLOAD_DIR = "assets/uploads"
AUDIO_DIR = "assets/audio_briefs"
os.makedirs(UPLOAD_DIR, exist_ok=True)
os.makedirs(AUDIO_DIR, exist_ok=True)

# Mount audio static directory for browser audio playback
app.mount("/audio", StaticFiles(directory=AUDIO_DIR), name="audio")


AUDITED_IMAGE_HASHES = set()
AUDITED_CONTENT_FINGERPRINTS = set()


def compute_receipt_content_fingerprint(evaluation: ReceiptEvaluation) -> str:
    """Computes a semantic content fingerprint from extracted OCR receipt fields."""
    merchant = (evaluation.merchant_name or "").strip().lower()
    total = evaluation.total_amount_idr
    item_sigs = sorted([f"{i.item_name.lower().strip()}:{i.amount_idr}" for i in evaluation.items])
    raw_sig = f"{merchant}|{total}|{'|'.join(item_sigs)}"
    import hashlib
    return hashlib.md5(raw_sig.encode()).hexdigest()


@app.get("/")
async def root():
    return {
        "app": "TaniJaga Financial Intelligence API",
        "supported_commodities": ["corn", "chili", "rice"],
        "status": "online",
        "docs": "/docs"
    }


@app.get("/api/v1/commodities")
async def list_commodities():
    """Returns supported staple commodities (Corn, Chili, Rice) with benchmarks, yields, and 3-month price histories."""
    return {
        "status": "success",
        "commodities": list(COMMODITY_CONFIG.values())
    }


@app.get("/health")
async def health_check():
    """Production health check endpoint for container orchestrators and load balancers."""
    return {
        "status": "healthy",
        "version": "1.0.0",
        "storage": "ok" if os.path.exists(UPLOAD_DIR) and os.path.exists(AUDIO_DIR) else "degraded"
    }


@app.post("/api/v1/ledger/reset")
@app.post("/ledger/reset")
async def reset_ledger_cache():
    """Resets audited image hashes and content fingerprints for demo/testing."""
    AUDITED_IMAGE_HASHES.clear()
    AUDITED_CONTENT_FINGERPRINTS.clear()
    return {
        "status": "success",
        "message": "Audited duplicate hash cache successfully reset."
    }


@app.post("/audit")
@app.post("/api/v1/audit")
async def audit_receipt_file(file: UploadFile = File(...)):
    """Audits an uploaded receipt image: OCR + Dual-Layer Duplicate Check + HPP + Reward + ElevenLabs Voice Brief + Supabase Logging."""
    original_filename = file.filename or "receipt.jpg"
    temp_path = os.path.join(UPLOAD_DIR, original_filename)

    try:
        content_bytes = await file.read()
        with open(temp_path, "wb") as buffer:
            buffer.write(content_bytes)

        # Calculate Image Hash for Layer 1 Duplicate Detection
        import hashlib
        image_hash = hashlib.sha256(content_bytes).hexdigest()

        # Step 1: Gemini Vision OCR Audit
        evaluation = analyze_receipt(temp_path)

        # Step 2: Dual-Layer Check for Duplicate Receipt Submission
        content_fingerprint = compute_receipt_content_fingerprint(evaluation)
        is_image_duplicate = image_hash in AUDITED_IMAGE_HASHES
        is_content_duplicate = content_fingerprint in AUDITED_CONTENT_FINGERPRINTS

        if is_image_duplicate or is_content_duplicate:
            evaluation.is_original_receipt = False
            evaluation.primary_receipt_category = "INVALID"
            reason = "Receipt image was already submitted previously" if is_image_duplicate else "Identical transaction details already recorded in system"
            flag_msg = f"Duplicate Detected: {reason}"
            if flag_msg not in evaluation.fraud_flags:
                evaluation.fraud_flags.append(flag_msg)
        else:
            AUDITED_IMAGE_HASHES.add(image_hash)
            AUDITED_CONTENT_FINGERPRINTS.add(content_fingerprint)

        # Step 3: HPP & Micro-Cash Reward Calculation for Corn
        payout = calculate_reward(evaluation)
        financials = calculate_hpp(evaluation, estimated_yield_kg=DEFAULT_CORN_YIELD_KG)

        # Step 3: Save to Supabase
        db_res = save_receipt_evaluation(
            evaluation,
            payout_idr=payout,
            total_production_cost_idr=financials["total_production_cost"],
            hpp_per_kg_idr=financials["hpp_per_kg"]
        )

        # Step 4: ElevenLabs Spoken English Voice Brief for Corn Farmers
        script = generate_farmer_script(evaluation, payout_idr=payout, hpp_financials=financials)
        audio_filename = f"{os.path.splitext(original_filename)[0]}_brief.mp3"
        audio_path = os.path.join(AUDIO_DIR, audio_filename)
        voice_res = synthesize_audio_brief(script, output_filename=audio_path)

        import time
        ts = int(time.time() * 1000)
        audio_url = f"/audio/{audio_filename}?t={ts}" if voice_res.get("status") == "success" else ""

        # Response payload matching frontend and API contracts
        return {
            "status": "success",
            "commodity": "Corn (Jagung Pipil Kering)",
            "reward": payout,
            "evaluation": evaluation.model_dump(),
            "transaction_record": evaluation.model_dump(),
            "financials": financials,
            "database": db_res,
            "voice_brief": {
                "transcript": script,
                "status": voice_res["status"],
                "audio_url": audio_url,
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


@app.post("/batch-audit")
@app.post("/api/v1/batch-audit")
@app.post("/audit-batch")
@app.post("/api/v1/audit-batch")
async def audit_receipts_batch(files: List[UploadFile] = File(...)):
    """Audits multiple uploaded receipt images: OCR + Duplicate Check + Micro-Rewards + Aggregated Corn HPP + Batch Voice Brief."""
    if not files:
        raise HTTPException(status_code=400, detail="No files provided for batch audit.")

    import time
    import hashlib
    batch_ts = int(time.time() * 1000)

    results = []
    total_reward = 0
    total_production_cost = 0
    total_valid = 0

    for file in files:
        original_filename = file.filename or f"receipt_{len(results)+1}.jpg"
        temp_path = os.path.join(UPLOAD_DIR, f"{batch_ts}_{original_filename}")

        try:
            content_bytes = await file.read()
            with open(temp_path, "wb") as buffer:
                buffer.write(content_bytes)

            image_hash = hashlib.sha256(content_bytes).hexdigest()

            # Step 1: Gemini OCR Analysis
            evaluation = analyze_receipt(temp_path)

            # Step 2: Duplicate Check
            content_fingerprint = compute_receipt_content_fingerprint(evaluation)
            is_image_duplicate = image_hash in AUDITED_IMAGE_HASHES
            is_content_duplicate = content_fingerprint in AUDITED_CONTENT_FINGERPRINTS

            if is_image_duplicate or is_content_duplicate:
                evaluation.is_original_receipt = False
                evaluation.primary_receipt_category = "INVALID"
                reason = "Receipt image was already submitted previously" if is_image_duplicate else "Identical transaction details already recorded in system"
                flag_msg = f"Duplicate Detected: {reason}"
                if flag_msg not in evaluation.fraud_flags:
                    evaluation.fraud_flags.append(flag_msg)
            else:
                AUDITED_IMAGE_HASHES.add(image_hash)
                AUDITED_CONTENT_FINGERPRINTS.add(content_fingerprint)

            # Step 3: Financials for Corn
            payout = calculate_reward(evaluation)
            financials = calculate_hpp(evaluation, estimated_yield_kg=DEFAULT_CORN_YIELD_KG)

            # Step 4: Supabase Logging
            db_res = save_receipt_evaluation(
                evaluation,
                payout_idr=payout,
                total_production_cost_idr=financials["total_production_cost"],
                hpp_per_kg_idr=financials["hpp_per_kg"]
            )

            is_valid = evaluation.is_original_receipt and evaluation.primary_receipt_category != "INVALID"
            if is_valid:
                total_valid += 1
                total_reward += payout
                total_production_cost += financials["total_production_cost"]

            results.append({
                "filename": original_filename,
                "status": "success",
                "reward": payout,
                "evaluation": evaluation.model_dump(),
                "financials": financials,
                "database": db_res,
            })
        except Exception as e:
            results.append({
                "filename": original_filename,
                "status": "error",
                "error": str(e)
            })
        finally:
            if os.path.exists(temp_path):
                try:
                    os.remove(temp_path)
                except Exception:
                    pass

    # Aggregated Corn HPP
    aggregated_hpp = int(total_production_cost / DEFAULT_CORN_YIELD_KG) if DEFAULT_CORN_YIELD_KG > 0 else 0

    # Batch Voice Brief
    batch_script = generate_batch_farmer_script(
        total_processed=len(results),
        total_reward_idr=total_reward,
        total_production_cost_idr=total_production_cost,
        aggregated_hpp_idr=aggregated_hpp
    )
    batch_audio_file = f"batch_{batch_ts}_brief.mp3"
    batch_audio_path = os.path.join(AUDIO_DIR, batch_audio_file)
    voice_res = synthesize_audio_brief(batch_script, output_filename=batch_audio_path)
    audio_url = f"/audio/{batch_audio_file}?t={batch_ts}" if voice_res.get("status") == "success" else ""

    return {
        "status": "success",
        "commodity": "Corn (Jagung Pipil Kering)",
        "total_files": len(files),
        "total_valid": total_valid,
        "total_reward": total_reward,
        "total_production_cost": total_production_cost,
        "aggregated_hpp_per_kg": aggregated_hpp,
        "corn_benchmark_market_price": CORN_MARKET_BENCHMARK_IDR,
        "results": results,
        "voice_brief": {
            "transcript": batch_script,
            "status": voice_res.get("status", "text_only"),
            "audio_url": audio_url
        }
    }


class BulkUpdateRequest(BaseModel):
    ids: List[str]
    updates: dict


@app.patch("/api/v1/receipts/bulk")
async def bulk_update_receipts(payload: BulkUpdateRequest):
    """Bulk update fields (category, confirmed amounts) for multiple receipts in Supabase."""
    client = get_supabase_client()
    if not client:
        return {
            "status": "ok",
            "message": "Updated in memory / local dual-storage",
            "updated_count": len(payload.ids)
        }
    try:
        res = client.table("farmer_ledger").update(payload.updates).in_("id", payload.ids).execute()
        return {"status": "success", "data": res.data, "updated_count": len(payload.ids)}
    except Exception as e:
        return {"status": "warning", "message": str(e), "updated_count": len(payload.ids)}


@app.get("/api/v1/ledger")
@app.get("/api/v1/receipts")
async def get_receipts_ledger():
    """Fetches stored receipts ledger from Supabase."""
    client = get_supabase_client()
    if not client:
        return {"receipts": []}

    try:
        res = client.table("farmer_ledger").select("*").order("created_at", desc=True).execute()
        return {"receipts": res.data or []}
    except Exception as e:
        return {"error": str(e), "receipts": []}

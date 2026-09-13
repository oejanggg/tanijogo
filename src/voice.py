import os
import requests
from typing import Dict, Any, Optional
from src.schemas import ReceiptEvaluation


def format_idr_english(amount: int) -> str:
    """Formats IDR amounts into natural English spoken words for ElevenLabs TTS."""
    if amount <= 0:
        return "zero rupiah"
    if amount >= 1_000_000_000:
        val = amount / 1_000_000_000
        s = f"{val:.1f}".rstrip("0").rstrip(".")
        return f"{s} billion rupiah"
    elif amount >= 1_000_000:
        val = amount / 1_000_000
        s = f"{val:.1f}".rstrip("0").rstrip(".")
        return f"{s} million rupiah"
    elif amount >= 1_000:
        val = amount / 1_000
        s = f"{val:.1f}".rstrip("0").rstrip(".")
        return f"{s} thousand rupiah"
    else:
        return f"{amount} rupiah"


def generate_farmer_script(
    evaluation: ReceiptEvaluation,
    payout_idr: int,
    hpp_financials: Dict[str, Any],
    farmer_name: str = "Farmer"
) -> str:
    """
    Generates a warm, natural English audio brief for the farmer.
    Tailored for ElevenLabs TTS with expressive punctuation and pacing.
    """
    merchant = evaluation.merchant_name or "the farm supplier"
    score = evaluation.image_quality_score
    payout_str = format_idr_english(payout_idr)

    if not evaluation.is_original_receipt or evaluation.primary_receipt_category == "INVALID":
        flags_text = ", ".join(evaluation.fraud_flags) if evaluation.fraud_flags else "Receipt does not meet audit standards"
        return (
            f"Attention, {farmer_name}! "
            f"Your receipt from {merchant} has been flagged by our AI audit system. "
            f"The reason is: {flags_text}. "
            f"No incentive payment has been made for this submission. "
            f"Please retake the photo with better lighting, or use a different receipt. "
            f"Contact support if you need help."
        )

    hpp = hpp_financials.get("hpp_per_kg", 0)
    total_cost = hpp_financials.get("total_production_cost", 0)
    cost_str = format_idr_english(total_cost)
    hpp_str = format_idr_english(hpp)

    return (
        f"Great news, {farmer_name}! "
        f"Your receipt from {merchant} has been verified by SukaTani AI. "
        f"Image quality score: {score} out of 10. "
        f"Your cash incentive of {payout_str} has been credited to your wallet. "
        f"Total production cost recorded: {cost_str}. "
        f"Your break-even price is {hpp_str} per kilogram. "
        f"Do not sell below this price, or you will lose money. "
        f"Great work! Keep uploading your receipts to build your KUR credit report."
    )


def synthesize_audio_brief(
    script_text: str,
    output_filename: str = "assets/audio_briefs/brief.mp3",
    voice_id: Optional[str] = None
) -> Dict[str, Any]:
    """
    Synthesizes English audio using ElevenLabs Turbo V2.5 TTS API.
    Saves MP3 file to output_filename.
    """
    api_key = os.getenv("ELEVENLABS_API_KEY")
    if not voice_id:
        # George (JBFqnCBsd6RMkjVDRZzb) - Natural, warm, conversational male voice
        voice_id = os.getenv("ELEVENLABS_VOICE_ID", "JBFqnCBsd6RMkjVDRZzb")

    os.makedirs(os.path.dirname(output_filename), exist_ok=True)

    if not api_key or api_key.startswith("your_"):
        return {
            "status": "text_only",
            "script": script_text,
            "reason": "ELEVENLABS_API_KEY not configured in .env."
        }

    url = f"https://api.elevenlabs.io/v1/text-to-speech/{voice_id}"
    headers = {
        "Accept": "audio/mpeg",
        "Content-Type": "application/json",
        "xi-api-key": api_key
    }
    model_id = os.getenv("ELEVENLABS_MODEL_ID", "eleven_turbo_v2_5")
    payload = {
        "text": script_text,
        "model_id": model_id,
        "voice_settings": {
            "stability": 0.40,
            "similarity_boost": 0.85,
            "style": 0.15,
            "use_speaker_boost": True,
            "speed": 1.10
        }
    }

    try:
        response = requests.post(url, json=payload, headers=headers, timeout=15)
        if response.status_code != 200 and model_id == "eleven_turbo_v2_5":
            payload["model_id"] = "eleven_multilingual_v2"
            response = requests.post(url, json=payload, headers=headers, timeout=15)

        if response.status_code == 200:
            with open(output_filename, "wb") as f:
                f.write(response.content)
            return {
                "status": "success",
                "audio_path": output_filename,
                "script": script_text,
                "voice_id": voice_id,
                "model": payload["model_id"]
            }
        else:
            return {
                "status": "error",
                "script": script_text,
                "reason": f"ElevenLabs API Error ({response.status_code}): {response.text}"
            }
    except Exception as e:
        return {
            "status": "error",
            "script": script_text,
            "reason": str(e)
        }

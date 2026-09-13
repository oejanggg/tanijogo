import os
import requests
from typing import Dict, Any, Optional
from src.schemas import ReceiptEvaluation


def terbilang(n: int) -> str:
    """Recursively converts an integer to Indonesian spoken words with natural breath pauses."""
    if n <= 0:
        return "nol"
    
    units = ["", "satu", "dua", "tiga", "empat", "lima", "enam", "tujuh", "delapan", "sembilan", "sepuluh", "sebelas"]
    
    def _convert(x: int) -> str:
        if x < 12:
            return units[x]
        elif x < 20:
            return _convert(x - 10) + " belas"
        elif x < 100:
            rem = _convert(x % 10)
            return (_convert(x // 10) + " puluh " + (rem if rem else "")).strip()
        elif x < 200:
            rem = _convert(x - 100)
            return ("seratus " + (rem if rem else "")).strip()
        elif x < 1000:
            rem = _convert(x % 100)
            return (_convert(x // 100) + " ratus " + (rem if rem else "")).strip()
        elif x < 2000:
            rem = _convert(x - 1000)
            return ("seribu " + (rem if rem else "")).strip()
        elif x < 1000000:
            ribu_part = _convert(x // 1000)
            sisa_part = _convert(x % 1000)
            if sisa_part:
                return f"{ribu_part} ribu, {sisa_part}"
            return f"{ribu_part} ribu"
        elif x < 1000000000:
            juta_part = _convert(x // 1000000)
            sisa_part = _convert(x % 1000000)
            if sisa_part:
                return f"{juta_part} juta, {sisa_part}"
            return f"{juta_part} juta"
        return str(x)

    res = _convert(n)
    return " ".join(res.split())


def format_idr_speech(amount: int) -> str:
    """Formats numeric amounts into crystal-clear spoken Indonesian text for ElevenLabs TTS."""
    if amount <= 0:
        return "nol rupiah"
    return f"{terbilang(amount)} rupiah"


def generate_farmer_script(
    evaluation: ReceiptEvaluation,
    payout_idr: int,
    hpp_financials: Dict[str, Any],
    farmer_name: str = "Pak Joko"
) -> str:
    """
    Generates a warm, natural, conversational Indonesian spoken negotiation brief for Pak Joko.
    Tailored for ElevenLabs spoken audio synthesis with expressive punctuation.
    """
    merchant = evaluation.merchant_name or "Pengepul Tani"
    score = evaluation.image_quality_score

    payout_str = format_idr_speech(payout_idr)

    if not evaluation.is_original_receipt or evaluation.primary_receipt_category == "INVALID":
        flags_text = ", ".join(evaluation.fraud_flags) if evaluation.fraud_flags else "Nota tidak sesuai standar"
        return (
            f"Perhatian {farmer_name}! Audit nota dari {merchant} mendeteksi ada masalah, nih! "
            f"Penyebab utamanya: {flags_text}. "
            f"Insentif tunai otomatis belum bisa cair, dan tercatat {payout_str}. "
            f"Minta pengepul hitung ulang total nota Anda, ya Pak, sebelum pembayaran diselesaikan!"
        )

    hpp = hpp_financials.get("hpp_per_kg", 0)
    total_cost = hpp_financials.get("total_production_cost", 0)

    cost_str = format_idr_speech(total_cost)
    hpp_str = format_idr_speech(hpp)

    script = (
        f"Halo {farmer_name}! Audit nota dari {merchant} sudah beres, nih! "
        f"Kejelasan foto notanya dapet nilai {score} dari 10. Mantap! "
        f"Insentif tunai Anda langsung cair, sebesar {payout_str}. "
        f"Total biaya produksi panen kali ini, tercatat {cost_str}. "
        f"Biar tidak rugi, patokan harga jual break-even Ha-Pe-Pe Bapak itu {hpp_str} per kilo, ya. "
        f"Jangan mau jual di bawah harga Ha-Pe-Pe! Semangat, dan sukses panennya, Pak!"
    )
    return script


def synthesize_audio_brief(
    script_text: str,
    output_filename: str = "assets/audio_briefs/brief.mp3",
    voice_id: Optional[str] = None
) -> Dict[str, Any]:
    """
    Synthesizes Indonesian audio using ElevenLabs Turbo V2.5 TTS API.
    Saves MP3 file to output_filename.
    """
    api_key = os.getenv("ELEVENLABS_API_KEY")
    if not voice_id:
        # Default: George (JBFqnCBsd6RMkjVDRZzb) - Natural, warm, conversational male voice
        voice_id = os.getenv("ELEVENLABS_VOICE_ID", "JBFqnCBsd6RMkjVDRZzb")

    os.makedirs(os.path.dirname(output_filename), exist_ok=True)

    if not api_key or api_key.startswith("your_"):
        return {
            "status": "text_only",
            "script": script_text,
            "reason": "ELEVENLABS_API_KEY not configured in .env."
        }

    # Direct ElevenLabs HTTP REST API call for 100% reliability
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
            "stability": 0.35,
            "similarity_boost": 0.85,
            "style": 0.20,
            "use_speaker_boost": True,
            "speed": 1.15
        }
    }

    try:
        response = requests.post(url, json=payload, headers=headers, timeout=15)
        if response.status_code != 200 and model_id == "eleven_turbo_v2_5":
            # Fallback to eleven_multilingual_v2 if turbo model returns error
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

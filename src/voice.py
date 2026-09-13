import os
import requests
from typing import Dict, Any, Optional
from src.schemas import ReceiptEvaluation


def terbilang(n: int) -> str:
    """Recursively converts an integer to Indonesian spoken words."""
    if n == 0:
        return ""
    satuan = ["", "satu", "dua", "tiga", "empat", "lima", "enam", "tujuh", "delapan", "sembilan", "sepuluh", "sebelas"]
    if n < 12:
        return satuan[n]
    elif n < 20:
        return terbilang(n - 10) + " belas"
    elif n < 100:
        return (terbilang(n // 10) + " puluh " + terbilang(n % 10)).strip()
    elif n < 200:
        return ("seratus " + terbilang(n - 100)).strip()
    elif n < 1000:
        return (terbilang(n // 100) + " ratus " + terbilang(n % 100)).strip()
    elif n < 2000:
        return ("seribu " + terbilang(n - 1000)).strip()
    elif n < 1000000:
        return (terbilang(n // 1000) + " ribu " + terbilang(n % 1000)).strip()
    elif n < 1000000000:
        return (terbilang(n // 1000000) + " juta " + terbilang(n % 1000000)).strip()
    return str(n)


def format_idr_speech(amount: int) -> str:
    """Formats numeric amounts into crystal-clear spoken Indonesian text for ElevenLabs TTS."""
    if amount <= 0:
        return "nol rupiah"
    words = " ".join(terbilang(amount).split())
    return f"{words} rupiah"


def generate_farmer_script(
    evaluation: ReceiptEvaluation,
    payout_idr: int,
    hpp_financials: Dict[str, Any],
    farmer_name: str = "Pak Joko"
) -> str:
    """
    Generates a natural, assertive Indonesian spoken negotiation brief for Pak Joko.
    Tailored for ElevenLabs spoken audio synthesis.
    """
    merchant = evaluation.merchant_name or "Pengepul Tani"
    score = evaluation.image_quality_score

    payout_str = format_idr_speech(payout_idr)

    if not evaluation.is_original_receipt or evaluation.primary_receipt_category == "INVALID":
        flags_text = ", ".join(evaluation.fraud_flags) if evaluation.fraud_flags else "Nota tidak sesuai standar"
        return (
            f"Perhatian {farmer_name}! Audit nota dari {merchant} mendeteksi indikasi masalah. "
            f"Penyebab utama: {flags_text}. "
            f"Insentif tunai otomatis adalah {payout_str}. "
            f"Minta pengepul hitung ulang total nota Anda sebelum pembayaran diselesaikan!"
        )

    hpp = hpp_financials.get("hpp_per_kg", 0)
    total_cost = hpp_financials.get("total_production_cost", 0)

    cost_str = format_idr_speech(total_cost)
    hpp_str = format_idr_speech(hpp)

    script = (
        f"Halo {farmer_name}, audit nota dari {merchant} selesai! "
        f"Kejelasan foto nota bernilai {score} dari 10. "
        f"Anda mendapatkan insentif tunai sebesar {payout_str}. "
        f"Total biaya produksi panen ini tercatat {cost_str}. "
        f"Target harga jual break-even H.P.P. Anda adalah {hpp_str} per kilo. "
        f"Jangan jual di bawah harga H.P.P. agar tidak rugi. Sukses panennya!"
    )
    return script


def synthesize_audio_brief(
    script_text: str,
    output_filename: str = "assets/audio_briefs/brief.mp3",
    voice_id: Optional[str] = None
) -> Dict[str, Any]:
    """
    Synthesizes Indonesian audio using ElevenLabs Multilingual V2 TTS API.
    Saves MP3 file to output_filename.
    """
    api_key = os.getenv("ELEVENLABS_API_KEY")
    if not voice_id:
        voice_id = os.getenv("ELEVENLABS_VOICE_ID", "21m00Tcm4TlvDq8ikWAM")  # Default Rachel / Multilingual

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
    payload = {
        "text": script_text,
        "model_id": "eleven_multilingual_v2",
        "voice_settings": {
            "stability": 0.45,
            "similarity_boost": 0.8,
            "speed": 1.15
        }
    }

    try:
        response = requests.post(url, json=payload, headers=headers, timeout=15)
        if response.status_code == 200:
            with open(output_filename, "wb") as f:
                f.write(response.content)
            return {
                "status": "success",
                "audio_path": output_filename,
                "script": script_text,
                "voice_id": voice_id,
                "model": "eleven_multilingual_v2"
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

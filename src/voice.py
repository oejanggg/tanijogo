import os
from typing import Dict, Any, Optional
from src.schemas import ReceiptEvaluation

try:
    from elevenlabs.client import ElevenLabs
    from elevenlabs import save
    HAS_ELEVENLABS_SDK = True
except ImportError:
    HAS_ELEVENLABS_SDK = False


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

    if not evaluation.is_original_receipt or evaluation.primary_receipt_category == "INVALID":
        flags_text = ", ".join(evaluation.fraud_flags) if evaluation.fraud_flags else "Nota tidak sesuai standar"
        return (
            f"Perhatian {farmer_name}! Audit nota dari {merchant} mendeteksi indikasi masalah. "
            f"Penyebab utama: {flags_text}. "
            f"Insentif tunai otomatis adalah nol rupiah. "
            f"Minta pengepul hitung ulang total nota Anda sebelum pembayaran diselesaikan!"
        )

    hpp = hpp_financials.get("hpp_per_kg", 0)
    total_cost = hpp_financials.get("total_production_cost", 0)

    script = (
        f"Halo {farmer_name}, audit nota dari {merchant} selesai! "
        f"Kejelasan foto nota bernilai {score} dari 10. "
        f"Anda mendapatkan insentif tunai sebesar Rp {payout_idr:,}. "
        f"Total biaya produksi panen ini tercatat Rp {total_cost:,}. "
        f"Target harga jual break-even HPP Anda adalah Rp {hpp:,} per kilo. "
        f"Jangan jual di bawah harga HPP agar tidak rugi. Sukses panennya!"
    )
    return script


def synthesize_audio_brief(
    script_text: str,
    output_filename: str = "assets/audio_briefs/brief.mp3",
    voice_id: Optional[str] = None
) -> Dict[str, Any]:
    """
    Synthesizes Indonesian audio using ElevenLabs Multilingual V2 model.
    Saves MP3 file to output_filename.
    """
    api_key = os.getenv("ELEVENLABS_API_KEY")
    if not voice_id:
        voice_id = os.getenv("ELEVENLABS_VOICE_ID", "21m00Tcm4TlvDq8ikWAM")  # Default Rachel / Multilingual

    os.makedirs(os.path.dirname(output_filename), exist_ok=True)

    if not api_key or api_key.startswith("your_") or not HAS_ELEVENLABS_SDK:
        return {
            "status": "text_only",
            "script": script_text,
            "reason": "ELEVENLABS_API_KEY not configured. Set ELEVENLABS_API_KEY in .env to generate live MP3 audio."
        }

    try:
        client = ElevenLabs(api_key=api_key)
        audio = client.generate(
            text=script_text,
            voice=voice_id,
            model="eleven_multilingual_v2"
        )
        
        save(audio, output_filename)
        return {
            "status": "success",
            "audio_path": output_filename,
            "script": script_text,
            "voice_id": voice_id,
            "model": "eleven_multilingual_v2"
        }
    except Exception as e:
        return {
            "status": "error",
            "script": script_text,
            "reason": str(e)
        }

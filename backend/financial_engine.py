from typing import Dict, Any
from backend.schemas import ReceiptEvaluation, CostItem


CORN_MARKET_BENCHMARK_IDR = 5500  # Badan Pangan Nasional benchmark for dried corn kernels (Rp/kg)
DEFAULT_CORN_YIELD_KG = 5000.0   # Standard hybrid corn yield per hectare

COMMODITY_CONFIG = {
    "corn": {
        "id": "corn",
        "name": "Corn (Jagung Pipil Kering)",
        "short_name": "Corn",
        "emoji": "🌽",
        "market_benchmark_idr": 5500,
        "default_yield_kg": 5000.0,
        "unit": "kg",
        "history_3m": [
            {"month": "Jul 2026", "market_price": 5200, "hpp": 4100},
            {"month": "Aug 2026", "market_price": 5400, "hpp": 4350},
            {"month": "Sep 2026", "market_price": 5500, "hpp": 4200},
        ]
    },
    "chili": {
        "id": "chili",
        "name": "Red Chili (Cabai Merah Keriting)",
        "short_name": "Chili",
        "emoji": "🌶️",
        "market_benchmark_idr": 32000,
        "default_yield_kg": 1200.0,
        "unit": "kg",
        "history_3m": [
            {"month": "Jul 2026", "market_price": 28500, "hpp": 22000},
            {"month": "Aug 2026", "market_price": 34000, "hpp": 24500},
            {"month": "Sep 2026", "market_price": 32000, "hpp": 21800},
        ]
    },
    "rice": {
        "id": "rice",
        "name": "Rice (Gabah Kering Panen)",
        "short_name": "Rice",
        "emoji": "🌾",
        "market_benchmark_idr": 7200,
        "default_yield_kg": 5500.0,
        "unit": "kg",
        "history_3m": [
            {"month": "Jul 2026", "market_price": 6900, "hpp": 5200},
            {"month": "Aug 2026", "market_price": 7100, "hpp": 5400},
            {"month": "Sep 2026", "market_price": 7200, "hpp": 5100},
        ]
    }
}


def calculate_reward(evaluation: ReceiptEvaluation, base_reward_idr: int = 5000) -> int:
    """
    Calculates micro-cash incentive reward based on image quality score.
    Returns 0 if fraud is detected or receipt is invalid.
    """
    if not evaluation.is_original_receipt or evaluation.primary_receipt_category == "INVALID":
        return 0

    multiplier = max(0.0, min(1.0, evaluation.image_quality_score / 10.0))
    return int(base_reward_idr * multiplier)


def calculate_hpp(
    evaluation: ReceiptEvaluation,
    estimated_yield_kg: float = DEFAULT_CORN_YIELD_KG,
    amortization_cycles: int = 24
) -> Dict[str, Any]:
    """
    Calculates Cost of Goods Sold (HPP / Harga Pokok Penjualan) per Kg.
    Formula: Total Cost = COGS + OPEX + (CAPEX / Amortization Cycles)
             HPP per Kg = Total Cost / Harvest Yield (Kg)
    """
    cogs_total = 0
    opex_total = 0
    capex_total = 0

    for item in evaluation.items:
        if item.classification == "COGS":
            cogs_total += item.amount_idr
        elif item.classification == "OPEX":
            opex_total += item.amount_idr
        elif item.classification == "CAPEX":
            capex_total += item.amount_idr

    amortized_capex = capex_total / amortization_cycles if amortization_cycles > 0 else 0
    total_production_cost = cogs_total + opex_total + amortized_capex
    hpp_per_kg = (total_production_cost / estimated_yield_kg) if estimated_yield_kg > 0 else 0.0

    return {
        "cogs_total": cogs_total,
        "opex_total": opex_total,
        "capex_total": capex_total,
        "amortized_capex": int(amortized_capex),
        "total_production_cost": int(total_production_cost),
        "hpp_per_kg": int(hpp_per_kg)
    }

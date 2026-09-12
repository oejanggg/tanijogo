from typing import Dict, Any
from src.schemas import ReceiptEvaluation


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
    estimated_yield_kg: float,
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

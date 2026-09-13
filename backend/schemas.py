from typing import Literal, List
from pydantic import BaseModel, Field


class CostItem(BaseModel):
    """Extracted line item from agricultural receipt."""
    item_name: str = Field(description="Name or description of the purchased item")
    amount_idr: int = Field(description="Total item price in Indonesian Rupiah (IDR)")
    classification: Literal["COGS", "OPEX", "CAPEX", "UNCLASSIFIED"] = Field(
        description="Expense bucket: COGS (seeds/fertilizer), OPEX (utilities/labor), CAPEX (machinery/assets)"
    )
    confidence_reasoning: str = Field(description="Brief explanation for the expense classification")


class ReceiptEvaluation(BaseModel):
    """Complete audit evaluation contract returned by Gemini Vision."""
    image_quality_score: int = Field(
        description="Visual clarity and legibility score from 1 to 10"
    )
    is_original_receipt: bool = Field(
        description="True if physical paper receipt; False if photo of screen, edited, or fraud"
    )
    fraud_flags: List[str] = Field(
        default_factory=list,
        description="List of detected anomalies or fraud indicators"
    )
    merchant_name: str = Field(description="Store or seller name on receipt")
    primary_receipt_category: Literal["COGS", "OPEX", "CAPEX", "MIXED", "INVALID"] = Field(
        description="Overall receipt transaction category"
    )
    receipt_summary: str = Field(description="One-sentence summary of the transaction")
    items: List[CostItem] = Field(default_factory=list, description="Extracted line items")
    total_amount_idr: int = Field(description="Reported grand total in IDR")

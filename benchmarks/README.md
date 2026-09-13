# TaniJaga Evaluation & Benchmark Suite 🧪

This directory contains automated testing scripts, exploratory notebooks, and evaluation datasets used to benchmark Google Gemini Vision OCR accuracy, fraud detection sensitivity, and Break Even Point (BEP) calculation logic.

---

## 📂 Directory Contents

- **`synthetic_dataset/`**: 50 synthetic agricultural receipts representing real-world farmgate conditions:
  - Clean printed kiosk receipts
  - Faded handwritten paper slips
  - Blurry and low-lighting images
  - Duplicate submissions & fraudulent tampering
  - Ground truth metadata documented in `manifest.json`.
- **`scripts/`**:
  - `batch_audit_50.py`: Automated batch audit runner across all 50 dataset images, reporting extraction accuracy, fraud detection rates, and financial statistics.
  - `generate_50_eval_dataset.py` & `generate_farm_receipts.py`: Procedural receipt generators synthesizing realistic Indonesian agricultural store invoices via Pillow.
- **`Test_Code.ipynb`**: Exploratory Jupyter notebook for testing Gemini multimodal prompts and Pydantic schemas.

---

## 🚀 Running the Benchmark

```bash
# Ensure the virtual environment is active
source .venv/bin/activate

# Execute the 50-receipt batch audit benchmark
python benchmarks/scripts/batch_audit_50.py
```

### Evaluated Metrics
1. **Extraction Accuracy**: Line items, quantities, unit prices, and total amount matching ground truth.
2. **Category Classification**: Correct identification of `fertilizer`, `seeds`, `pesticides`, `equipment`, `labor`, and `fuel`.
3. **Fraud & Anomaly Sensitivity**: Detection of duplicates, unreasonable price spikes, and illegible receipt photos.
4. **Financial Consistency**: Correct application of commodity baseline yields (Corn, Chili, Rice) and BEP calculation.

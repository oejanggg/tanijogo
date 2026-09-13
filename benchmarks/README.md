# SukaTani Evaluation & Benchmark Suite

This directory contains testing scripts, exploratory notebooks, and evaluation datasets used during the hackathon to benchmark Gemini Vision OCR accuracy, fraud detection sensitivity, and HPP calculation logic.

---

## Directory Contents

- **`synthetic_dataset/`**: 50 synthetic agricultural receipts representing real-world farmgate conditions (clean, blurry, fraudulent, out-of-scope). Accompanied by ground truth metadata in `manifest.json`.
- **`scripts/`**:
  - `batch_audit_50.py`: Automated batch audit runner across all 50 dataset images, reporting accuracy, fraud flags, and financial statistics.
  - `generate_50_eval_dataset.py` & `generate_farm_receipts.py`: Generators used to synthesize Indonesian farmgate receipts via Pillow.
- **`Test_Code.ipynb`**: Exploratory Jupyter notebook for testing Gemini API prompts and schema generation.

---

## Running the Benchmark

```bash
# Ensure virtual environment is active
source .venv/bin/activate

# Run the 50-receipt audit benchmark
python benchmarks/scripts/batch_audit_50.py
```

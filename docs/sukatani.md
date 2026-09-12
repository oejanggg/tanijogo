# SukaTani: Incentivized Farm Financial Engine
**Hackathon Master Blueprint**

## 1. Project Overview (The Pivot)
SukaTani has pivoted from a simple receipt math-checker to a **Data Monetization and Financial Intelligence Platform** for Indonesian smallholder farmers. 

The hardest problem in ag-tech is getting farmers to log their expenses. SukaTani solves this by offering instant micro-cash rewards for uploading photos of agricultural receipts. In return, the platform automatically categorizes expenses and calculates the farmer's true **HPP (Harga Pokok Penjualan / Cost of Goods Sold)**, ensuring they never sell their harvest at a loss.

### The 4-Step Pipeline
1. **Quality & Fraud Audit:** Gemini Vision analyzes the photo for legibility, lighting, and originality (e.g., rejecting photos of a laptop screen).
2. **Expense Classification:** Extracts line items into strict buckets: `COGS` (seeds/fertilizer), `OPEX` (fuel/salaries), and `CAPEX` (machinery).
3. **Incentive Payout:** A deterministic Python script calculates a cash reward based on the image quality score.
4. **HPP Calculation:** Aggregates costs against expected yield to output the true break-even price per kg.

---

## 2. Tech Stack
*   **Vision/OCR:** Gemini 2.0 Flash / 1.5 Flash (via `google-genai` SDK) for messy handwriting and JSON structuring.
*   **Backend:** Python FastAPI (deployed on Railway/Render).
*   **Frontend:** Next.js + Tailwind CSS (deployed on Vercel).
*   **Audio/Voice:** ElevenLabs API for spoken Indonesian negotiation/summary briefs.

---

## 3. Core Mathematics

**The HPP (Break-Even) Formula:**
```text
Total Production Cost = Σ COGS + Σ OPEX + (Σ CAPEX / Amortization Cycles)
HPP per Kg = Total Production Cost / Estimated Harvest Yield (Kg)
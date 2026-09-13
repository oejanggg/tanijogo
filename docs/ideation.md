# **AI Hackathon Product Ideation & Design Thinking Document**

# **Product Name:**&nbsp;

**Hackathon Track Selection \[Bold The Choosen\]:**

> * Track 1**:** Improve an Existing Business Capability  
> * Track 2**:** Create a New Business Capability  
> * Track 3**:** Solve a Business Problem

&nbsp;

Ideation:

1. POS system \- knowledge hub dari SME/seller per produk dan nanti bisa buat forecast revenue/expenditure  
   Pain point: manually created \> fully automated end to end POS  
   Feature: ex. Reduce foodwaste in a restaurant to optimise revenue  
2. Collateral Credit scoring specific for farm/plantation  
   Variable: collateral identification of kredit usaha mikro: plant growth analysis, area detector  
3. Face recognition \> check if the user’s face is exposed in the internet  
4. Data masking service \> Privacy Related: uu pdp? dpia/pia based mitigation  
5. SME scoring: like CV corrector but for business. What are the inputs/parameters?  
6. OCR \+ Receipt analysis \> SME decision making (automated ledger) \> simplify to 1 time/business process (ex. From farmer to distributor)  
   Biar petani gak ketipu  
   &nbsp;

**Primary Track:** **Track 3: Solve a Business Problem: Reducing fraud and help farmer transaction process**

**Co-Entry / Special Track:** **Special Track: Built With ElevenLabs**

## ---

### **1\. Strategic Alignment & Winning Strategy**

#### **1.1 Playbook Alignment**

* **Target Industry:** Smallholder Agriculture & Farmgate Commodity Trade (High-Value Horticulture: Red Chili & Shallots in Indonesia).  
* **The Tedious Work:** Post-harvest receipt auditing and paper ledger bookkeeping. After every harvest, farmers and cooperative admins must decipher handwritten scale receipts (*nota timbangan*), manually calculate complex gross-to-net weight deductions (*potongan susut/refraksi*), verify handwritten unit price arithmetic on a pocket calculator, and hand-copy transactions into physical notebooks.

* **Financial Impact (“Name the Dollar”):**  
  *(Modeled on a standard 30-farmer cooperative cluster / Gapoktan generating 120 harvest transactions per month)*  
  * **Current Process Cost:**  
    0.5 hours/receipt×$8/hour (admin labor)×120 receipts=$480/month ( Rp 7.7M)  
    *Hidden Value Leakage:* An average undetected loss of **$35 / Rp 550,000 per transaction** from manual arithmetic errors, inflated moisture deductions (\>15%), and suppressed farmgate price spreads. Total extracted farmer income: **$4,200 / Rp 66M per month**.  
  * **Post-Implementation Cost (TaniJaga):**  
    Dual-pass Vision LLM tokens \+ ElevenLabs voice synthesis \+ cloud hosting \=  
    $0.15/audit×120 receipts=$18/month ( Rp 290,000)  
  * **Net Dollar Savings / Value Created:**  
    **$462/month** in direct administrative overhead eliminated \+ up to **$4,200/month (\~$50,000/year)** in reclaimed farmer income protected from middleman leakage per cluster.

### **2\. Problem Identification & User Research**

#### **2.1 Empathize (User & Behavioral Insights)**

* **User Persona Profile:**  
  * **Name:** Pak Joko (48)  
  * **Role/Industry:** Smallholder Chili Farmer & Head of *Kelompok Tani* (Garut, West Java).  
  * **Key Motivations:** Protect harvest margins against seasonal volatility, avoid being short-changed by local middlemen (*pengepul/tengkulak*), and build an auditable cash flow track record to qualify for subsidized bank microcredit (*KUR BRI/Mandiri*) instead of loan sharks (*ijon*).  
* **User Behaviors & Routines:**  
  * **05:30 – 14:00 (Field Labor):** Harvesters pick perishable chili under high heat. Focus is entirely on physical sorting and crating.  
  * **14:30 – 17:00 (The Handover):** Meet middleman at the farmgate. Produce is weighed on analog scales; the middleman scribbles crate weights, arbitrary moisture cuts, and prices onto a carbon-copy paper chit (*nota timbangan*).  
  * **17:00 – 18:00 (Settlement):** Cash or partial IOUs (*bon gantung*) are handed over. Pak Joko pockets the crumpled paper slip without verifying the math on-site due to social awkwardness (*sungkan*) and time pressure.  
  * **Evening (Exhaustion):** Slips are stuffed into plastic drawers. No formal digital books are kept; calculations are never audited against wholesale market movements.  
* **Current Pain Points & Operational Bottlenecks:**  
  * **Perishability Pressure & Information Asymmetry:** Fresh chili rots within 48 hours without cold storage. Middlemen exploit this urgency by demanding 15–20% "moisture/spoilage deductions" (*potongan susut*) and quoting suppressed prices well below daily terminal market rates (*Pasar Induk Kramat Jati*).  
  * **Manual Math Auditing Friction:** Receipts contain multiple crate lines, varying tare deductions, and 6-digit sums. After 10 hours of manual labor, farmers lack the cognitive energy and tools to catch handwritten arithmetic errors before the middleman leaves.  
  * **Digital Interface Rejection:** Complex SaaS portals, text forms, and multi-step UI apps fail immediately with farmers who have soiled hands, outdoor glare, and low digital literacy.  
  * **Institutional Credit Invisibility:** Transactions remain trapped on physical paper. Banks classify the farm as "unbankable" due to lack of verifiable transaction histories.

#### **2.2 Define (Problem Statement)**

> **Indonesian smallholder horticulture farmers** need a way to **instantly audit handwritten harvest receipts and verify fair market pricing at the farmgate** because **reliance on illegible paper chits, opaque middleman deduction practices, and post-harvest physical exhaustion prevent them from catching arithmetic errors and price suppression before cash changes hands.**

### **3\. Solution Concept & AI Feasibility**

#### **3.1 Ideated AI Solution**

* **Product Concept Name:** **SukaTani** — Automated Farmgate Receipt Auditor & Fair-Trade Ledger  
* **Core Value Proposition:**  
  TaniJaga eliminates information asymmetry and transaction leakage at the farmgate. A single smartphone photo of a messy, handwritten receipt triggers an instant arithmetic check, deduction benchmark audit, and market price comparison. Using an agentic self-correcting vision pipeline paired with ElevenLabs spoken Indonesian audio, it delivers a direct verbal verdict into the farmer's ear within 5 seconds—while silently compiling an institutional-grade digital cash ledger.

#### **Key Features (In-Scope for 48-Hour Hackathon)**

* **Feature 1: Dual-Pass Vision-LLM Ingestion with Self-Correction \[Essential\]**  
  * *Pass 1 (Extraction):* Ingests crumpled, handwritten Indonesian chits (*nota timbangan*) via Gemini 1.5 Flash / GPT-4o-mini, outputting structured JSON (Crate lines, Gross Weight, Deductions %, Net Weight, Unit Price, Payout).  
  * *Pass 2 (Agentic Reflection):* A deterministic verification layer calculates ∣(Gross−Tare)×Price−Reported Total∣. If an anomaly exists (Δ\>0), a reflection loop re-prompts the model with targeted crop coordinates to adjudicate between digit misrecognition and actual middleman arithmetic fraud.  
* **Feature 2: Real-Time Fairness & Market Discrepancy Engine \[Essential\]**  
  * *Math Audit:* Flags exact handwritten calculation errors.  
  * *Deduction Thresholding:* Triggers warning flags when moisture/dirt deductions exceed the regional 8% acceptable threshold.  
  * *Wholesale Delta Benchmark:* Queries indexed commodity pricing (*Pasar Induk Kramat Jati*) to calculate the exact Rupiah spread lost to predatory farmgate pricing.  
* **Feature 3: Spoken Negotiation Brief (ElevenLabs) & Bankable Auto-Ledger \[High Value\]**  
  * *Spoken Advisor:* Generates an assertive, colloquial Indonesian voice note:  
    *"Pak Joko, nota cabai merah diaudit. Hitungan ada selisih rugi Rp 150.000 karena salah kali di nota. Potongan susut juga 16%, padahal standar hari ini 8%. Minta pengepul hitung ulang total jadi Rp 2.450.000."*  
  * *Zero-Touch Cash Ledger:* Automatically records audited transactions into Supabase/SQLite, tracking cumulative revenue, volume sold, and cash-in-hand to produce an exportable ledger for Bank BRI *KUR* loan officers.

### **4\. Preliminary Submission Execution Plan (Due: 12:00 PM Mon, Sep 14\)**

#### **4.1 Track Declarations**

* **Primary Track:** **Track 3: Solve a Business Problem** (Direct attack on agricultural supply chain leakage and financial invisibility).  
* **Special Track:** **Built With ElevenLabs** (Voice is the core accessibility interface, delivering real-time spoken negotiation scripts to non-desk field workers).

#### **4.2 Architecture & Public Codebase Plan (GitHub)**

Structure the repository to guarantee maximum marks in **Code Quality (6 pts)** and **Technical Difficulty (8 pts)**:

Plaintext

tanijaga/

├── api/

│   ├── main.py                  \# FastAPI core routes (/audit, /stream-voice, /ledger)

│   ├── vision\_agent.py          \# Dual-pass OCR extraction \+ bounding box crop logic

│   ├── rules\_engine.py          \# Deterministic math, deduction & market price checker

│   └── voice\_service.py         \# ElevenLabs Conversational/TTS streaming wrapper

├── evals/                       \# PROVES MODEL EVALUATION (6/6 Rubric Points)

│   ├── benchmark\_receipts/      \# 15 synthetic/real annotated Indonesian handwritten chits

│   ├── ground\_truth.json        \# Annotated values (gross, net, price, true error)

│   └── run\_evals.py             \# Script calculating Field Extraction F1 & Math Recall

├── web/                         \# Next.js 14 \+ Tailwind CSS (Mobile PWA viewport)

│   ├── components/              \# Camera capture, receipt review, live audio player

│   └── pages/index.tsx          \# Real-time inspection dashboard & bank ledger

├── README.md                    \# Architecture diagram, unit economics, eval benchmarks

└── Dockerfile                   \# One-click reproduction container

&nbsp;

#### **4.3 Production Deployment Strategy**

* **Frontend:** Deployed to **Vercel** with custom mobile viewport optimization.  
* **Backend API:** Deployed to **Railway** or **Render** connected to GitHub CI/CD.  
* **Database:** Managed **Supabase (PostgreSQL)** for real-time ledger sync.  
* *Rule:* Never submit localhost URLs. Both endpoints must be live with HTTPS.

#### **4.4 3–5 Minute Demo Video Storyboard (Strict 4:00 Target)**

| Timestamp | Section | Visual on Screen | Spoken Script Focus |
| ----- | ----- | ----- | ----- |
| **0:00 – 0:45** | **The Hook & Problem** | Hold a real, messy, handwritten Indonesian paper chit with visible scribbles and math mistakes. | "This 10-cent paper chit costs Indonesian chili farmers 18% of their income. After 10 hours of manual labor, farmers can't audit handwritten math or check Jakarta wholesale price drops." |
| **0:45 – 1:45** | **Live End-to-End Demo** | Live phone capture on production URL → UI extracts fields → Red highlight on math fraud → **ElevenLabs audio plays on speaker**. | "Watch TaniJaga in action. We upload the crumpled slip. Within 3 seconds, the dual-pass vision engine extracts the data, flags an intentional Rp 200,000 math error, and ElevenLabs speaks directly to Pak Joko with the exact pushback script." |
| **1:45 – 2:45** | **Technical Depth & Architecture** | Architecture slide \+ quick switch to code showing `evals/run_evals.py`and the reflection loop. | "This is not a simple API wrapper. We built a dual-pass verification loop with spatial reflection to eliminate digit hallucination, backed by an automated evaluation suite achieving 94% extraction accuracy across noisy carbon copies." |
| **2:45 – 3:30** | **Business Impact & Ledger** | Dashboard view showing the auto-updated cash-in-hand ledger and bank-ready export for *KUR*microcredit. | "Every audited slip converts into a bank-grade cashflow statement. We solve immediate farmgate leakage and unlock institutional credit, transforming an unbankable 33-million farmer segment into auditable businesses." |
| **3:30 – 4:00** | **Feasibility & Unit Economics** | Slide showing cost breakdown ($0.15/audit vs. $35 saved) and go-to-market via village cooperatives (*Gapoktan*). | "At 15 cents of compute per audit, the ROI is over 200x on day one. TaniJaga brings transparency to the farmgate." |

### 

### **48-Hour Build Milestones**

* **Hours 0–12:** Finalize FastAPI backend; test prompt engineering on 5 messy receipt samples using Gemini Flash / GPT-4o-mini structured JSON output.  
* **Hours 12–24:** Implement the reflection verification loop and connect ElevenLabs Multilingual SDK with a warm, natural Indonesian voice profile.  
* **Hours 24–36:** Build mobile-responsive frontend (camera upload \+ audio waveform player \+ auto-updating cash ledger).  
* **Hours 36–42:** Deploy to Vercel/Railway; populate `/evals` benchmark data and run validation scripts.  
* **Hours 42–48:** Record demo video, write documentation in `README.md`, and complete preliminary submission form.

&nbsp;

&nbsp;

&nbsp;

&nbsp;

&nbsp;

&nbsp;

&nbsp;

&nbsp;

&nbsp;

&nbsp;

&nbsp;

&nbsp;

### **What to Keep Real vs. What to Cut / Simplify**

| Feature | The Trap (Will Kill Your 48h) | The Smart 48-Hour Execution |
| ----- | ----- | ----- |
| **Receipt Vision OCR** | Writing custom OpenCV deskewing, contour detection, or local OCR models. | Send the raw image straight to **Gemini 1.5 Flash** or **GPT-4o-mini** with Pydantic structured JSON outputs. They handle shadows and tilted handwriting out of the box. |
| **Agentic Reflection** | Complex bounding-box image cropping and coordinate math. | **Text-conditioned reflection**: If Python math fails (Δ\>0), send the image back once with: *"Math check failed: (Gross \- Tare) \* Price \= X, but receipt says Y. Re-read the numbers carefully. Did the writer make a math error, or did you misread a digit?"* |
| **Wholesale Market Data** | Building a live web scraper for Jakarta wholesale markets (fragile, anti-bot blocks). | **Static Mock JSON table** (`market_prices.json`) containing today's baseline prices for 4 commodities (Cabai Merah Keriting, Cabai Rawit, Bawang Merah, Gabah). |
| **ElevenLabs Voice** | Building a complex WebRTC/WebSocket bidirectional audio pipeline. | **Standard REST Text-to-Speech call**: Generate a 15-second MP3/WAV file from the audit summary and stream it directly to an HTML5 `<audio>` player on the frontend. |
| **The Evaluation Suite** | Annotating 100 receipts manually. | Annotate just **10 synthetic/real receipt images** in a JSON file (`ground_truth.json`) and run a 30-line Python script that outputs an accuracy table in the terminal. |

### **The 48-Hour Execution Schedule**

#### **Block 1: The Core Backend Pipeline (Hours 0–12)**

* Set up a FastAPI repo with three endpoints: `/upload-receipt`, `/audit`, `/generate-voice`.  
* Define the Pydantic schema for receipt extraction (commodity, gross weight, tare deduction, unit price, total).  
* Implement the deterministic math check in standard Python.  
* Connect the ElevenLabs API to generate a natural Indonesian audio response based on the audit verdict.

#### **Block 2: The Frontend & Integration (Hours 12–24)**

* Build a single-page Next.js app styled as a mobile interface (using Tailwind CSS).  
* Add a drag-and-drop / phone camera file input.  
* Display the side-by-side comparison: original image on the left, extracted breakdown with red/green flags on the right.  
* Add an auto-playing audio player with a waveform visualization for the ElevenLabs output.  
* Add a simple table below showing previous transactions (the "Bankable Ledger").

#### **Block 3: Deployment & `/evals` (Hours 24–36)**

* **Deploy immediately**: Push frontend to **Vercel** and backend to **Railway** or **Render**. Ensure HTTPS works and CORS is configured.  
* Set up the `/evals` folder with 10 sample receipts (5 normal, 5 with math/deduction fraud) to prove technical depth for the judges.  
* Take screenshots of the architecture and evaluation metrics for the repo `README.md`.

#### **Block 4: Video Walkthrough & Polish (Hours 36–48)**

* **Never leave the video to the last 3 hours.** Video recording, screen capture syncing, and rendering always take longer than planned.  
* Script a tight 3.5-minute video following the storyboard.  
* Record the working live production URL.  
* Submit to the portal well before the 12:00 PM deadline.

### **The Minimal Tech Stack**

* **Frontend:** Next.js 14, Tailwind CSS, Lucide-react (Vercel).  
* **Backend:** Python FastAPI, Pydantic, Uvicorn (Railway).  
* **AI & Voice:** Gemini 1.5 Flash (OCR/Reflection) \+ ElevenLabs Multilingual v2 API.  
* **Storage:** Supabase (free tier) or local SQLite synced to frontend state.

&nbsp;

&nbsp;

&nbsp;

&nbsp;

&nbsp;

&nbsp;

&nbsp;

&nbsp;

&nbsp;

&nbsp;

&nbsp;

&nbsp;

&nbsp;

### **The 5-Person Role Distribution**

| Role | Primary Focus | Exact Deliverables |
| ----- | ----- | ----- |
| **Person 1: AI & Vision Pipeline** | Vision LLM & Reflection Loop | FastAPI endpoint for OCR extraction; prompt templates with Pydantic output; second-pass reflection logic to detect digit hallucination vs. calculation fraud. |
| **Person 2: Backend Logic & ElevenLabs** | Deterministic Engine & Audio | Math discrepancy calculator; wholesale market benchmark lookup; ElevenLabs streaming audio service (Indonesian voice prompt); Supabase ledger database integration. |
| **Person 3: Frontend & UI/UX Lead** | Mobile-First Web App | Next.js 14 \+ Tailwind PWA; camera capture/drag-and-drop; side-by-side audit display (original image vs. extracted lines); audio waveform player; live Vercel deployment. |
| **Person 4: Evals, Synthetic Data & Benchmarks** | Technical Rigor & Rubric Maxing | Creates 15–20 realistic handwritten Indonesian receipts (normal, math fraud, excessive cuts); builds `/evals/run_evals.py` test harness; generates accuracy tables for the README. |
| **Person 5: Product Lead, Video Director & DevOps** | Storyboard, Video, Docs & Deploy | Video script and production (record/edit 3–5 min video); writes GitHub `README.md` (architecture diagrams, unit economics, trade-off matrix); Railway CI/CD setup; manages submission portal. |

### **48-Hour Master Timeline (Sat 12:00 PM – Mon 12:00 PM)**

#### **Phase 1: Lock the Contract & Setup (Sat 12:00 PM – 4:00 PM)**

* **All:** Spend 45 minutes defining the exact JSON contract between Frontend and Backend (see schema below).  
* **Person 1 & 2:** Initialize FastAPI repository; configure Gemini/GPT-4o-mini and ElevenLabs API keys; deploy skeleton to Railway/Render.  
* **Person 3:** Initialize Next.js repository on Vercel; build UI layout with hardcoded mock JSON.  
* **Person 4:** Handwrite and photograph 10 sample Indonesian chits (*nota timbangan*) with deliberate math errors and excessive moisture deductions.  
* **Person 5:** Set up shared Google Drive/Figma, write the 3.5-minute video storyboard, and set up the submission checklist.

#### **Phase 2: Functional Core Loop (Sat 4:00 PM – Midnight)**

* **Person 1:** Get one-shot Vision LLM extraction working reliably with handwritten images.  
* **Person 2:** Wire the deterministic math verification and trigger ElevenLabs Indonesian audio output using the audit findings.  
* **Person 3:** Build the image upload component, real-time status indicators, and audio playback widget.  
* **Person 4:** Label ground-truth values (true weight, deduction %, true total) for the test receipts into `ground_truth.json`.  
* **Person 5:** Draft the `README.md` structure, system architecture diagram, and business impact sections.  
* **Milestone (Midnight Sat):** First end-to-end integration test (Upload receipt image on localhost → see data → hear ElevenLabs audio).

#### **Phase 3: Technical Depth & Hardening (Sun 12:00 AM – 12:00 PM)**

* *Sleep rotation:* Stagger sleep (e.g., 2 sleep while 3 build, then swap) so development never halts.  
* **Person 1:** Implement the second-pass reflection loop: if (Gross−Tare)×Price=Total, trigger agentic self-verification to adjudicate between OCR error and seller calculation fraud.  
* **Person 2:** Connect Supabase to auto-save every verified receipt into the running farmer ledger; build `/ledger` GET endpoint.  
* **Person 3:** Connect frontend to live Railway API (switch off mocks); build the historical ledger table view.  
* **Person 4:** Finalize `/evals/run_evals.py` measuring extraction accuracy, precision, and fraud detection recall across all test receipts.  
* **Person 5:** Review production build on mobile viewports; refine the video recording script.

#### **Phase 4: Feature Freeze & Production Deployment (Sun 12:00 PM – 6:00 PM)**

* **STRICT FEATURE FREEZE AT 4:00 PM SUNDAY.** No new features after this point.  
* Verify live HTTPS production deployment: Vercel frontend talking seamlessly to Railway backend.  
* Run end-to-end smoke tests on 3 separate devices (desktop, Android phone, iPhone).  
* Capture all necessary screen recordings and audio clips for the video.

#### **Phase 5: Video Production, Documentation & Evals (Sun 6:00 PM – Mon 2:00 AM)**

* **Person 5:** Edit the 3–5 minute demo video (voiceover, live app screen captures, callouts, English subtitles for ElevenLabs audio).  
* **Person 4 & 1:** Run final evaluation benchmarks; insert the benchmark results table into `README.md`.  
* **Person 2 & 3:** Fix minor UI visual bugs and ensure zero crashes on edge cases (e.g., blur image alert).  
* Upload the finalized video to YouTube (Unlisted) or Loom; verify audio levels.

#### **Phase 6: Buffer & Submission (Mon 2:00 AM – 12:00 PM)**

* Complete team rest.  
* **10:00 AM Monday:** Conduct final sanity check on the public GitHub repository (clean commits, secrets removed, README rendering properly).  
* Verify production URL works in an incognito window.  
* **11:00 AM Monday (1 hour before deadline):** Submit project URL, GitHub repo, track declarations, and video link.

### **The Shared JSON Contract (Lock This at Hour 1\)**

This contract prevents the frontend and backend teams from blocking each other:

JSON

{

  "receipt\_id": "rec\_10492",

  "commodity": "Cabai Merah Keriting",

  "raw\_extraction": {

    "gross\_weight\_kg": 145.0,

    "deduction\_percentage": 16.0,

    "net\_weight\_kg": 121.8,

    "unit\_price\_idr": 28000,

    "reported\_total\_idr": 3200000

  },

  "audit\_results": {

    "computed\_total\_idr": 3410400,

    "math\_discrepancy\_idr": \-210400,

    "math\_error\_detected": true,

    "excessive\_deduction\_detected": true,

    "deduction\_threshold\_standard\_pct": 8.0,

    "daily\_wholesale\_benchmark\_idr": 34000,

    "price\_spread\_loss\_idr": \-730800,

    "total\_estimated\_leakage\_idr": \-941200

  },

  "voice\_brief": {

    "transcript\_id": "Pak Joko, nota cabai merah diaudit. Ada selisih rugi Rp 210.000 karena salah hitung di nota, dan potongan susut 16% terlalu tinggi. Minta pengepul hitung ulang total jadi Rp 3.410.000.",

    "audio\_base64\_or\_url": "https://api.tanijaga.com/audio/rec\_10492.mp3"

  }

}

&nbsp;

### **Deliverable Checklist for Sunday Night**

* \[ \] Public GitHub repo with zero committed `.env` files or API keys.  
* \[ \] Working production URL (no `localhost` anywhere in the demo video or links).  
* \[ \] Automated evaluation script (`python evals/run_evals.py`) that executes in terminal.  
* \[ \] English subtitles overlaid whenever ElevenLabs speaks Indonesian during the video.  
* \[ \] Video duration strictly between 3:00 and 4:30.

&nbsp;
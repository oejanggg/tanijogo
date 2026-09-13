# SukaTani — 2-Minute Hackathon Pitch & Presentation Script

**Track**: Track 3 (Solve a Business Problem) & Special Track: Built With ElevenLabs  
**Target Audience**: Judges, Impact Investors, and Smallholder Farmers in Indonesia  
**Tagline**: *Incentivized Farm Financial Engine & AI Audit Platform for Indonesian Smallholder Farmers*

---

## 🎙️ 2-Minute Pitch Script

### 0:00 - 0:25: Problem Statement (Pak Joko's Reality)
> "Meet Pak Joko, a smallholder chili farmer in Blitar, East Java. Like over 28 million smallholder farmers across Indonesia, Pak Joko suffers from **financial opacity**. He buys fertilizer, pays harvest laborers, and buys equipment—keeping all receipts crumpled in a pocket. At harvest time, middleman traders (*pengepul*) offer him arbitrary prices below his true cost of production, forcing him into a cycle of seasonal debt because he never knew his true **HPP (Harga Pokok Penjualan)** break-even price."

---

### 0:25 - 0:50: The Solution (SukaTani Platform)
> "Enter **SukaTani**—the incentivized farm financial engine that turns physical receipt chits into real-time financial intelligence. 
> 
> Here is how simple it is: Pak Joko takes out his mobile phone, snaps a picture of his handwritten store receipt, and taps **Submit & Earn**."

---

### 0:50 - 1:20: The AI Engine & Incentives (Gemini 3.6 Vision + HPP Engine + Supabase)
> "Behind the scenes, our two-phase pipeline triggers:
> 1. **Gemini 3.6 Vision OCR** extracts item names, total amounts, and categorizes line items into COGS (inputs), OPEX (labor/fuel), and CAPEX (machinery).
> 2. **Financial Engine**: Calculates Pak Joko's true HPP break-even price per kilogram (`HPP/Kg = (COGS + OPEX + Amortized CAPEX) / Harvest Yield`).
> 3. **Data Incentives**: To encourage data submission, Pak Joko receives an instant micro-cash incentive (up to Rp 5.000) straight into his digital wallet for valid receipts, logged immutably into Supabase PostgreSQL."

---

### 1:20 - 1:45: Special Track Feature (Built With ElevenLabs)
> "Because Pak Joko is in the field and may have limited literacy, SukaTani synthesizes an **assertive spoken negotiation brief powered by ElevenLabs Multilingual V2 & Turbo V2.5**:
> 
> *(Play Audio Brief Demo)*
> 
> 🔊 *"Halo Pak Joko! Audit nota dari Pengepul Pak Dadang sudah beres, nih! Insentif tunai Anda cair lima ribu rupiah. Target harga jual break-even Ha-Pe-Pe Bapak itu tiga ratus tujuh puluh satu rupiah per kilo. Jangan mau jual di bawah harga Ha-Pe-Pe! Semangat Pak!"*
> 
> ElevenLabs empowers Pak Joko with an AI voice assistant right at the trading desk to negotiate confidently with middleman buyers."

---

### 1:45 - 2:00: Impact & Closing
> "With SukaTani, farmers get financial clarity and cash rewards, micro-finance lenders get audited credit profiles, and Indonesian agriculture gets transparent data. 
> 
> **SukaTani: Empowering Farmers, One Receipt & One Voice Brief at a Time. Thank you!**"

---

## 🛠️ Key Technical Architecture Summary for Judges

| Component | Technology | Role |
| :--- | :--- | :--- |
| **Frontend** | Next.js 14, Tailwind CSS, Lucide Icons | Mobile-first web app PWA |
| **Backend API** | FastAPI (Python 3.14), Uvicorn | Financial calculation REST endpoints |
| **Vision OCR** | Gemini 3.6 Flash Vision API | Receipt OCR & fraud detection |
| **Voice Synthesis** | ElevenLabs Multilingual V2 / Turbo V2.5 | Spoken Indonesian negotiation brief (`assets/audio_briefs/`) |
| **Database** | Supabase (PostgreSQL) | Dual-logged `receipts`, `line_items`, and `farmer_ledger` |
| **Testing** | 50 Synthetic Receipt Dataset (`assets/synthetic_dataset/`) | 100% automated batch audit verification |

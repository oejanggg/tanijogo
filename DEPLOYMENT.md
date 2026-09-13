# SukaTani Production Deployment Guide

This guide covers production deployment for the complete **SukaTani** ecosystem:
- **Frontend**: Next.js 16 Web Application (Mobile-first PWA responsive UI)
- **Backend API**: Python FastAPI Financial Intelligence Engine
- **Database & Auth**: Supabase PostgreSQL with Row Level Security (RLS)
- **AI Pipelines**: Google Gemini 2.5 Vision OCR & ElevenLabs Audio Briefs

---

## 1. Database Setup (Supabase)

Before deploying the frontend or backend, ensure your Supabase database schema and Auth are prepared:

1. Open your [Supabase Dashboard](https://supabase.com/dashboard) and navigate to **SQL Editor**.
2. Run the migration script located at [`docs/supabase_migration.sql`](file:///Users/rayes/Documents/hackathon/docs/supabase_migration.sql).
3. This creates:
   - `profiles` table (farmer name, phone) with RLS policies
   - `farmer_ledger` user isolation (`user_id`, `voice_transcript`, `audio_url`)
   - `harvest_records` table with RLS
4. Under **Authentication → Providers → Email**, ensure Email sign up is enabled.

---

## 2. Environment Variables

### Backend (`backend/api.py` / Container)
| Variable | Description | Example |
|---|---|---|
| `GEMINI_API_KEY` | Google Gemini API Key | `AIzaSy...` |
| `ELEVENLABS_API_KEY` | ElevenLabs TTS API Key | `sk_...` |
| `ELEVENLABS_VOICE_ID` | Voice ID (Defaults to George) | `JBFqnCBsd6RMkjVDRZzb` |
| `ELEVENLABS_MODEL_ID` | Model ID | `eleven_turbo_v2_5` |
| `SUPABASE_URL` | Supabase Project URL | `https://xxxx.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Service Role Key | `eyJ...` |
| `ALLOWED_ORIGINS` | Comma-separated CORS origins | `https://sukatani.app,https://your-app.netlify.app` |
| `PORT` | API Server Port (assigned by host) | `8000` |

### Frontend (`frontend`)
| Variable | Description | Example |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase Project URL | `https://xxxx.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase Public Anon Key | `eyJ...` |
| `NEXT_PUBLIC_API_URL` | Public URL of the FastAPI Backend | `https://api.sukatani.app` |

---

## 3. Deployment Option A: Cloud Hosting (Free Netlify Setup)

### Deploy Frontend to Netlify (100% Free)
1. Push your code to GitHub (branch `release/production-ready`).
2. Go to [Netlify](https://app.netlify.com) and log in with your GitHub account.
3. Click **Add new site** → **Import an existing project** → Select `oejanggg/tanijogo`.
4. Configure the build settings (already set via `netlify.toml`):
   - **Branch**: `release/production-ready`
   - **Base directory**: `frontend`
   - **Build command**: `npm run build`
   - **Publish directory**: `frontend/out`
5. Under **Site configuration → Environment variables**, add:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `NEXT_PUBLIC_API_URL` (URL of your backend API)
6. Click **Deploy site**. Netlify will build and host your site with free SSL at `https://<your-site>.netlify.app`.

### Deploy Backend to Render (100% Free Tier)
1. Connect repository to [Render](https://render.com).
2. Create a new **Web Service** using the included `render.yaml` Blueprint or:
   - **Runtime**: Python 3.11
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn backend.api:app --host 0.0.0.0 --port $PORT`
   - **Health Check Path**: `/health`
3. Add your environment variables (`GEMINI_API_KEY`, `ELEVENLABS_API_KEY`, `SUPABASE_URL`, etc.).
4. Set `ALLOWED_ORIGINS` to your Netlify site URL (e.g. `https://your-site.netlify.app`).

#### On Railway:
1. In [Railway](https://railway.app), create a new project from your GitHub repo.
2. Railway will automatically detect the root `Dockerfile`.
3. Set the Environment Variables in the service settings.

---

## 4. Deployment Option B: Full-Stack Docker Compose (VPS / Single Host)

For deployment on a dedicated VPS (e.g. AWS EC2, DigitalOcean Droplet, GCP Compute Engine):

1. Clone the repository and checkout the production branch:
   ```bash
   git clone https://github.com/oejanggg/tanijogo.git
   cd tanijogo
   git checkout release/production-ready
   ```

2. Create a `.env` file in the root directory:
   ```bash
   cp .env.example .env
   # Fill in your real production keys
   ```

3. Build and launch containers with Docker Compose:
   ```bash
   docker compose up -d --build
   ```

4. Verify services:
   - Frontend: `http://<YOUR_SERVER_IP>:3000`
   - Backend API: `http://<YOUR_SERVER_IP>:8000`
   - Health Check: `curl http://<YOUR_SERVER_IP>:8000/health`

---

## 5. Post-Deployment Verification Checklist

- [ ] Visit frontend `/` and check responsiveness.
- [ ] Create a new farmer account at `/signup`.
- [ ] Check Supabase `auth.users` and `profiles` tables for new user entry.
- [ ] Sign in at `/login` and redirect to `/home`.
- [ ] Upload a test receipt photo and verify:
  - Gemini OCR audit runs successfully.
  - HPP break-even price is calculated.
  - ElevenLabs English voice brief streams and plays.
- [ ] Confirm and classify the receipt at `/confirm`.
- [ ] Verify `/receipts` only displays receipts for the logged-in user.
- [ ] Check `/report` for the user's verified financial certificate.
- [ ] Click Log Out in the header and verify session terminates.

# TaniJaga Frontend 📱
**Farmer's Cost Ledger – Mobile-First Web Application**

Built with **Next.js 16 (App Router)**, **React 19**, and **Tailwind CSS**, the TaniJaga frontend is an accessible, mobile-first progressive web application engineered specifically for rural smallholder farmers.

---

## 🌾 Features & Pages

| Route | Page | Purpose & Functionality |
|---|---|---|
| `/` | **Landing / Splash** | Welcome screen, value proposition, and redirection to login or home. |
| `/login` & `/signup` | **Authentication** | Supabase Auth email signup, profile creation, and session persistence. |
| `/home` | **Dashboard** | Micro-incentive wallet balance, audio briefing playback, commodity toggle (Corn, Chili, Rice), real-time BEP card with Bapenas benchmark comparison, and receipt camera/upload modal. |
| `/verdict` | **AI Audit Result** | Displays extracted line items, merchant name, image quality score (1-10), cash reward earned, and audio briefing player. |
| `/confirm` | **Manual Review** | Large high-contrast touch keypad allowing farmers to review and adjust line items or expense categories. |
| `/receipts` | **Farmer's Ledger** | Chronological expense ledger with voice transcript dropdowns, category badges, and batch image audit upload. |
| `/harvest` | **Harvest Calculator** | Interactive seasonal yield & price modeling, computing farmer-specific BEP/kg for Corn, Chili, and Rice. |
| `/report` | **KUR Bank Credit Report** | Financial statement recap, gross revenue vs. operational costs, supplier breakdown, and printable bank underwriting report. |

---

## ⚙️ Environment Configuration

Create a `.env.local` file inside the `frontend/` directory (or copy from `.env.example`):

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key

# Python FastAPI Backend URL
NEXT_PUBLIC_API_URL=http://localhost:8000
```

> **Note**: For production deployments (e.g. Netlify), set `NEXT_PUBLIC_API_URL` to your production backend URL (e.g., `https://api.tanijaga.com`).

---

## 🛠️ Local Development

```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser (or use mobile device simulation in DevTools).

---

## 🏗️ Production Build & Verification

```bash
# Check TypeScript types and generate production bundle
npm run build

# Start production server locally
npm run start
```

### Static Exports & Netlify Deployment
The frontend is configured to build seamlessly for static edge delivery and Netlify hosting:
- Build settings are configured via `frontend/netlify.toml` and root `netlify.toml`.
- API rewrites and Single Page Application routing redirects are handled via `public/_redirects`.

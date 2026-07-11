# Collector Lens ◈

**AI-powered collectible identification, market valuation, and buy/hold/sell intelligence — built for the Renaiss ecosystem.**

🔗 **Live Demo:** [collector-lens.vercel.app](https://collector-lens.vercel.app)

---

## What it does

Drop any photo of a physical or onchain collectible and get:

- **Instant identification** — name, category, brand, year, edition
- **Real market valuation** — low / mid / high price range sourced from live web data
- **Buy / Hold / Sell signal** — AI-powered with cited reasoning
- **Condition grade** — Mint to Poor with visible detail notes
- **Rarity score** — 1–10 scale with context
- **Market trend** — Rising / Stable / Declining with analyst note
- **Similar sales** — real comparable transactions with sources
- **TCG market prices** — live ungraded and PSA graded prices from PriceCharting
- **PSA grading data** — population reports and grade premiums via live search
- **Renaiss ecosystem panel** — marketplace search, vault eligibility, BNB Chain NFT check
- **Scan history** — every scan saved to your account

## Supported collectibles

Trading Cards (Pokémon, One Piece, Magic, YuGiOh, Sports Cards) · NFTs · SBTs · Sports Memorabilia · Vintage Toys · Comic Books · Coins · Action Figures · Sneakers · Art Prints · Watches

---

## Renaiss Integration

Collector Lens is built natively for the Renaiss Protocol ecosystem on BNB Chain:

- **Marketplace deep link** — scan any supported card and jump directly to its Renaiss marketplace listing
- **Vault eligibility check** — instantly know if a collectible qualifies for Renaiss vault tokenization
- **PSA grading context** — PSA population and grade data surfaces the same signals Renaiss uses for its FMV/CMV oracle
- **BNB Chain wallet check** — connects your wallet to detect Renaiss NFTs you already hold
- **Renaiss marketplace search** — live search results for the scanned card on renaiss.xyz

---

## Tech Stack

| Layer       | Technology                                |
| ----------- | ----------------------------------------- |
| Frontend    | Next.js 16, Tailwind CSS                  |
| Auth        | Privy (wallet + Google + email)           |
| Vision AI   | Groq Llama 4 Scout (image identification) |
| Analysis AI | Groq Llama 3.3 70B (market analysis)      |
| Web Search  | Tavily (live price and PSA data)          |
| TCG Prices  | PriceCharting API                         |
| Database    | Supabase (scan history)                   |
| Blockchain  | BNB Smart Chain via BNBScan API           |
| Deployment  | Vercel                                    |

---

## Getting Started

### 1. Clone and install

```bash
git clone https://github.com/yourusername/collector-lens.git
cd collector-lens
npm install --legacy-peer-deps
```

### 2. Set up environment variables

Create `.env.local` in the project root:

```env
# AI
GROQ_API_KEY=gsk_your_key          # console.groq.com (free)
TAVILY_API_KEY=tvly-your_key       # app.tavily.com (free)

# Auth
NEXT_PUBLIC_PRIVY_APP_ID=clxxx     # dashboard.privy.io (free)

# Database
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...

# Optional (kept for fallback)
OPENROUTER_API_KEY=sk-or-v1-xxx
```

### 3. Set up Supabase table

Run this in your Supabase SQL Editor:

```sql
create table scans (
  id uuid default gen_random_uuid() primary key,
  user_id text not null,
  created_at timestamp with time zone default now(),
  item_name text,
  category text,
  condition text,
  estimated_value_low numeric,
  estimated_value_mid numeric,
  estimated_value_high numeric,
  signal text,
  rarity text,
  rarity_score numeric,
  market_trend text,
  confidence_score numeric,
  description text,
  signal_reason text
);

alter table scans disable row level security;
```

### 4. Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## Deploy to Vercel

```bash
# Push to GitHub first
git add .
git commit -m "Initial deploy"
git push

# Then connect repo on vercel.com
# Add all env vars under Settings → Environment Variables
```

---

## Project Structure

```
app/
├── page.tsx              # Main UI — hero, features, scanner, results
├── providers.tsx         # Privy auth provider
├── globals.css           # Design system — dark/light theme variables
├── layout.tsx            # Root layout
├── api/analyze/
│   └── route.ts          # AI pipeline — vision → web search → analysis
├── lib/
│   └── supabase.ts       # Database client and scan helpers
└── components/
    └── ScanHistory.tsx   # Slide-in scan history drawer
```

---

## How it works

```
User uploads photo
    ↓
Groq Llama 4 Scout (vision)
    → Identifies item with full detail
    ↓
Parallel data fetch:
    → Tavily web search (real sold prices, PSA data, Renaiss listings)
    → PriceCharting API (TCG market prices)
    → PSA registry search
    → BNB Chain wallet check (if connected)
    ↓
Groq Llama 3.3 70B (analysis)
    → Synthesizes all data into valuation
    → Generates signal + reasoning from real sources
    ↓
Results displayed + saved to Supabase
```

---

## Built for

**Renaiss Tech Hackathon Season 1 — AI Track**

Renaiss Protocol is building the first liquidity infrastructure for physical collectibles on BNB Chain, linking PSA-authenticated cards to onchain NFTs with transparent pricing and instant liquidity.

Collector Lens serves as an intelligence layer for the Renaiss ecosystem — helping collectors identify, appraise, and make informed decisions on any collectible, with native integration into the Renaiss marketplace and vault system.

---

_Built with Groq · Tavily · Privy · Supabase · Next.js_

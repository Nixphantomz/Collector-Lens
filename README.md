# Collector Lens 🔎

AI-powered collectible identifier, valuator, and buy/hold/sell signal generator — built for the Renaiss Tech Hackathon S1.

## What it does

Drop any photo of a collectible (trading card, sports memorabilia, vintage toy, comic book, coin, action figure, sneaker, etc.) and get:

- ✅ **Instant identification** — name, category, description
- 💰 **Value estimate** — low / mid / high range in USD
- 📊 **Condition grade** — Mint to Poor with notes
- 💎 **Rarity score** — 1–10 rarity rating
- 📈 **Market trend** — Rising / Stable / Declining
- 🎯 **Buy / Hold / Sell signal** — with analyst reasoning
- 🧾 **Similar sales** — comparable recent transactions
- 🔑 **Key factors** — what's driving the valuation

## Stack

- **Next.js 15** (App Router)
- **Tailwind CSS**
- **Google Gemini 2.0 Flash** — multimodal AI for image analysis
- **Vercel** — deployment

## Getting started

1. Clone the repo
2. Install dependencies: `npm install`
3. Get a free Gemini API key at [aistudio.google.com](https://aistudio.google.com)
4. Copy `.env.example` to `.env.local` and add your key
5. Run: `npm run dev`
6. Open [http://localhost:3000](http://localhost:3000)

## Deploy to Vercel

```bash
vercel deploy
```

Add `GEMINI_API_KEY` as an environment variable in your Vercel project settings.

## Built for

Renaiss Tech Hackathon Season 1 — AI Track

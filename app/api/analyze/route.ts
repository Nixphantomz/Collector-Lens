import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey || apiKey === "your_openrouter_api_key_here") {
      return NextResponse.json(
        { error: "OpenRouter API key not configured. Add OPENROUTER_API_KEY to your .env.local file." },
        { status: 500 }
      );
    }

    const { imageBase64, mimeType } = await req.json();

    if (!imageBase64) {
      return NextResponse.json({ error: "No image provided" }, { status: 400 });
    }

    const prompt = `You are an expert collectibles analyst and appraiser with deep knowledge of trading cards, sports memorabilia, vintage toys, comic books, coins, stamps, action figures, and all types of collectibles.

Analyze this image and return ONLY a valid JSON object (no markdown, no backticks, just raw JSON) with this exact structure:

{
  "identified": true,
  "name": "Full name of the collectible",
  "category": "Category (e.g. Trading Card, Sports Memorabilia, Vintage Toy, Comic Book, Coin, Action Figure, etc.)",
  "description": "2-3 sentence description of what this item is",
  "condition": "Mint / Near Mint / Excellent / Good / Fair / Poor",
  "conditionNotes": "Brief note about visible condition indicators",
  "estimatedValue": {
    "low": 10,
    "mid": 25,
    "high": 50,
    "currency": "USD"
  },
  "rarity": "Common / Uncommon / Rare / Very Rare / Ultra Rare / One of a Kind",
  "rarityScore": 5,
  "signal": "HOLD",
  "signalReason": "2-3 sentence explanation of the hold/buy/sell recommendation",
  "marketTrend": "Stable",
  "trendNote": "Brief note on current market sentiment for this type of item",
  "keyFactors": ["factor 1", "factor 2", "factor 3"],
  "similarSales": [
    { "description": "Similar item description", "price": 20, "timeAgo": "2 weeks ago" },
    { "description": "Similar item description", "price": 30, "timeAgo": "1 month ago" }
  ],
  "confidenceScore": 75
}

Rules:
- rarityScore must be a number 1-10
- confidenceScore must be a number 0-100
- estimatedValue.low/mid/high must be numbers (no $ signs, no commas)
- similarSales prices must be numbers
- signal must be exactly one of: BUY, HOLD, or SELL
- marketTrend must be exactly one of: Rising, Stable, or Declining
- Return raw JSON only — no markdown fences, no explanation text before or after

If you cannot identify this as a collectible, still return the JSON with identified: false, name: "Unknown Item", and sensible numeric defaults for all number fields.`;

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://collector-lens.vercel.app",
        "X-Title": "Collector Lens",
      },
      body: JSON.stringify({
        model: "nvidia/nemotron-nano-12b-v2-vl:free",
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: prompt },
              {
                type: "image_url",
                image_url: {
                  url: `data:${mimeType || "image/jpeg"};base64,${imageBase64}`,
                },
              },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("OpenRouter error:", errText);
      throw new Error(`OpenRouter API error: ${response.status} ${errText}`);
    }

    const json = await response.json();
    const text = json.choices?.[0]?.message?.content ?? "";

    const cleaned = text
      .replace(/```json\n?/g, "")
      .replace(/```\n?/g, "")
      .trim();

    let data;
    try {
      data = JSON.parse(cleaned);
    } catch {
      const match = cleaned.match(/\{[\s\S]*\}/);
      if (match) {
        data = JSON.parse(match[0]);
      } else {
        throw new Error("Could not parse AI response as JSON");
      }
    }

    return NextResponse.json(data);
  } catch (error: any) {
    console.error("Analysis error:", error);
    const message =
      error?.message?.includes("401")
        ? "Invalid OpenRouter API key. Check your .env.local file."
        : error?.message?.includes("JSON")
        ? "AI returned an unexpected response format. Please try again."
        : "Analysis failed: " + (error?.message ?? "Unknown error");
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
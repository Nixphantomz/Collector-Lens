import { NextRequest, NextResponse } from "next/server";
import Groq from "groq-sdk";

// Step 1: Identify collectible using Groq vision
async function identifyItem(groq: Groq, imageBase64: string, mimeType: string) {
  const response = await groq.chat.completions.create({
    model: "meta-llama/llama-4-scout-17b-16e-instruct",
    max_tokens: 600,
    temperature: 0.1, // near-deterministic
    messages: [{
      role: "user",
      content: [
        {
          type: "text",
          text: `You are a collectibles authentication expert. Identify this item with maximum precision.
Be specific: include exact model name, year, colorway, edition, material, size, or any other identifiers visible.
Reply with ONLY valid JSON, no other text before or after:
{"name":"exact full product name","category":"Trading Card/Sports Memorabilia/Vintage Toy/Comic Book/Coin/Watch/Electronics/Action Figure/Sneaker/Art/Other","year":"year","brand":"brand","description":"2 precise sentences","condition":"Mint/Near Mint/Excellent/Good/Fair/Poor","conditionNotes":"specific visible details","identified":true}`
        },
        {
          type: "image_url",
          image_url: { url: `data:${mimeType || "image/jpeg"};base64,${imageBase64}` }
        }
      ]
    }]
  });

  const raw = response.choices[0]?.message?.content ?? "";
  console.log("Vision:", raw.slice(0, 200));
  const cleaned = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
  const match = cleaned.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("Vision model did not return valid JSON");
  return JSON.parse(match[0]);
}

// Step 2: Tavily web search — get raw results with URLs
async function searchMarketData(tavilyKey: string, itemName: string, category: string) {
  // Run two targeted searches in parallel
  const isDigital = ["NFT", "SBT", "Digital Art"].some(t => category.includes(t));
  const [priceSearch, soldSearch] = await Promise.all([
    fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: tavilyKey,
        query: `"${itemName}" sold price site:ebay.com OR site:pricecharting.com OR site:stockx.com OR site:pwccmarketplace.com`,
        search_depth: "advanced",
        max_results: 4,
        include_answer: true,
        include_raw_content: false,
      })
    }),
    fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: tavilyKey,
        query: isDigital
          ? `${itemName} collection stats holders floor price trend`
          : `${itemName} ${category} market value auction results 2024 2025`,
        search_depth: "advanced",
        max_results: 4,
        include_answer: true,
        include_raw_content: false,
      })
    })
  ]);

  const results: any[] = [];
  let combinedAnswer = "";

  if (priceSearch.ok) {
    const d = await priceSearch.json();
    combinedAnswer += d.answer ? `Price data: ${d.answer}\n` : "";
    results.push(...(d.results ?? []));
  }
  if (soldSearch.ok) {
    const d = await soldSearch.json();
    combinedAnswer += d.answer ? `Market data: ${d.answer}\n` : "";
    // Avoid duplicates by URL
    const existingUrls = new Set(results.map((r: any) => r.url));
    for (const r of (d.results ?? [])) {
      if (!existingUrls.has(r.url)) results.push(r);
    }
  }

  console.log("Tavily combined answer:", combinedAnswer.slice(0, 300));
  console.log("Tavily sources:", results.map((r: any) => r.url));
  return { answer: combinedAnswer, results };
}

// Step 3: Analyze search data into final structured valuation
async function analyzeWithSearch(groq: Groq, identity: any, searchData: any) {
  const sourceContext = searchData?.results?.length
    ? searchData.results.map((r: any) =>
        `Source: ${r.title} (${r.url})\nContent: ${r.content?.slice(0, 200)}`
      ).join("\n\n")
    : "No web sources available.";

  const response = await groq.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    max_tokens: 1200,
    temperature: 0.1, // near-deterministic for consistent results
    seed: 42,         // same seed = same output for same input
    messages: [
      {
        role: "system",
        content: `You are a precise collectibles market analyst. Your valuations must be grounded in the provided source data.
Rules:
- Extract actual prices from source content when available — do not invent numbers
- If sources show a price range, use the lowest as "low" and highest as "high"
- Set confidenceScore based on source quality: real sold listings = 80-95, general estimates = 40-60
- Sources must include the actual URLs from the data provided
- Be consistent: same item + same data = same output every time`
      },
      {
        role: "user",
        content: `Analyze this collectible and provide a market valuation.

ITEM: ${identity.name}
Category: ${identity.category}
Type: ${["NFT","SBT","Digital Art"].some((t: string) => identity.category?.includes(t)) ? "Onchain/Digital Collectible" : "Physical Collectible"}
Condition: ${identity.condition}
Year: ${identity.year}

SEARCH RESULTS:
${searchData?.answer || "No direct answer available."}

SOURCE DETAILS:
${sourceContext}

Return ONLY valid JSON, nothing else before or after:
{
  "estimatedValue": {"low": 0, "mid": 0, "high": 0},
  "marketTrend": "Rising/Stable/Declining",
  "trendNote": "specific market context from sources",
  "signal": "BUY/HOLD/SELL",
  "signalReason": "precise 2-sentence reasoning citing actual data",
  "rarityScore": 5,
  "rarity": "Common/Uncommon/Rare/Very Rare/Ultra Rare",
  "keyFactors": ["specific factor 1", "specific factor 2", "specific factor 3"],
  "similarSales": [
    {"description": "specific item name and details", "price": 0, "timeAgo": "timeframe", "source": "platform name"}
  ],
  "sources": [
    {"name": "descriptive source title", "url": "exact URL from search results"}
  ],
  "confidenceScore": 70,
  "dataNote": "brief note on data quality e.g. based on 4 recent eBay sold listings"
}`
      }
    ]
  });

  const raw = response.choices[0]?.message?.content ?? "";
  console.log("Analysis:", raw.slice(0, 300));
  const cleaned = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
  const match = cleaned.match(/\{[\s\S]*\}/);
  if (!match) return null;
  return JSON.parse(match[0]);
}

// PSA population report lookup (free, no key needed)
async function getPSAData(itemName: string, category: string) {
  const isCard = ["pokemon", "pokémon", "one piece", "magic", "yugioh", "sports card", "trading card"].some(
    t => itemName.toLowerCase().includes(t) || category.toLowerCase().includes("trading card")
  );
  if (!isCard) return null;

  try {
    // Extract card name for PSA search
    const searchQuery = encodeURIComponent(itemName.split(" ").slice(0, 6).join(" "));
    const res = await fetch(
      `https://www.psacard.com/pop/search?q=${searchQuery}`,
      {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          "Accept": "application/json, text/plain, */*",
        }
      }
    );

    // PSA doesn't have a free JSON API so we use Tavily to search their pop report
    // This is handled in the search step - here we just return the link
    return {
      searchUrl: `https://www.psacard.com/pop/search?q=${searchQuery}`,
      registryUrl: `https://www.psacard.com/cardlookup?cardName=${searchQuery}`,
      name: itemName,
    };
  } catch (e) {
    console.log("PSA lookup failed:", e);
    return null;
  }
}

// BNB Chain wallet NFT lookup via BNBScan API
async function getBNBChainNFTs(walletAddress: string) {
  if (!walletAddress) return null;

  try {
    const RENAISS_CONTRACT = "0x"; // placeholder - update with real Renaiss contract when available
    const res = await fetch(
      `https://api.bscscan.com/api?module=account&action=tokennfttx&address=${walletAddress}&startblock=0&endblock=99999999&sort=desc&apikey=YourApiKeyToken`,
      { headers: { "User-Agent": "CollectorLens/1.0" } }
    );

    if (!res.ok) return null;
    const data = await res.json();

    if (data.status === "1" && data.result?.length > 0) {
      // Filter for Renaiss-related NFTs
      const renaiссNFTs = data.result.filter((tx: any) =>
        tx.contractAddress?.toLowerCase().includes("renaiss") ||
        tx.tokenName?.toLowerCase().includes("renaiss") ||
        tx.tokenSymbol?.toLowerCase().includes("REN")
      );

      return {
        totalNFTs: data.result.length,
        renaiссNFTs: renaiссNFTs.length,
        recentNFTs: data.result.slice(0, 3).map((tx: any) => ({
          name: tx.tokenName,
          symbol: tx.tokenSymbol,
          tokenId: tx.tokenID,
          contract: tx.contractAddress,
        })),
      };
    }
    return null;
  } catch (e) {
    console.log("BNBScan lookup failed:", e);
    return null;
  }
}

// TCG price lookup via PriceCharting (free, no key needed)
async function getTCGPrice(itemName: string, category: string) {
  const isTCG = ["pokemon", "pokémon", "one piece", "magic", "yugioh"].some(
    t => itemName.toLowerCase().includes(t) || category.toLowerCase().includes("trading card")
  );
  if (!isTCG) return null;

  try {
    const searchName = encodeURIComponent(itemName.split(" ").slice(0, 5).join(" "));
    const res = await fetch(
      `https://www.pricecharting.com/api/product?q=${searchName}`,
      { headers: { "User-Agent": "CollectorLens/1.0" } }
    );
    if (!res.ok) return null;
    const data = await res.json();

    if (data?.status === "success" && data?.products?.length > 0) {
      const product = data.products[0];
      return {
        source: "PriceCharting",
        url: `https://www.pricecharting.com/game/${product["console-name"] || "cards"}/${product["id"] || ""}`,
        loose: product["loose-price"] ? Number(product["loose-price"]) / 100 : null,
        graded: product["graded-price"] ? Number(product["graded-price"]) / 100 : null,
        name: product["product-name"] || itemName,
      };
    }
    return null;
  } catch (e) {
    console.log("PriceCharting lookup failed:", e);
    return null;
  }
}

export async function POST(req: NextRequest) {
  try {
    const groqKey = process.env.GROQ_API_KEY;
    const tavilyKey = process.env.TAVILY_API_KEY;

    if (!groqKey) {
      return NextResponse.json(
        { error: "GROQ_API_KEY not configured in .env.local" },
        { status: 500 }
      );
    }

    const groq = new Groq({ apiKey: groqKey });
    const { imageBase64, mimeType, walletAddress } = await req.json();
    if (!imageBase64) return NextResponse.json({ error: "No image provided" }, { status: 400 });

    // Step 1: Identify
    const identity = await identifyItem(groq, imageBase64, mimeType);
    console.log("Identified:", identity.name);

    // Step 2a: TCG price lookup (free, no key needed)
    const tcgPrice = await getTCGPrice(identity.name, identity.category);

    // Step 2b: PSA data lookup
    const psaData = await getPSAData(identity.name, identity.category);
    if (psaData) console.log("PSA data found for:", identity.name);

    // Step 2c: BNB Chain wallet check
    const bnbData = walletAddress ? await getBNBChainNFTs(walletAddress) : null;
    if (bnbData) console.log("BNB NFTs found:", bnbData.totalNFTs);
    if (tcgPrice) {
      console.log("PriceCharting price found:", tcgPrice.name, "graded:", tcgPrice.graded, "loose:", tcgPrice.loose);
    }

    // Step 2b: Search
    let searchData = null;
    if (tavilyKey) {
      try {
        searchData = await searchMarketData(tavilyKey, identity.name, identity.category);
      } catch (e) {
        console.log("Tavily search failed, continuing without web data");
      }
    }

    // Step 3: Analyze
    const market = await analyzeWithSearch(groq, identity, searchData);

    const result = {
      identified: identity.identified ?? true,
      name: identity.name,
      category: identity.category,
      year: identity.year,
      brand: identity.brand,
      description: identity.description,
      condition: identity.condition,
      conditionNotes: identity.conditionNotes,
      estimatedValue: { ...(market?.estimatedValue ?? { low: 0, mid: 0, high: 0 }), currency: "USD" },
      rarity: market?.rarity ?? "Unknown",
      rarityScore: market?.rarityScore ?? 5,
      signal: (market?.signal ?? "HOLD") as "BUY" | "HOLD" | "SELL",
      signalReason: market?.signalReason ?? "Insufficient market data.",
      marketTrend: (market?.marketTrend ?? "Stable") as "Rising" | "Stable" | "Declining",
      trendNote: market?.trendNote ?? "",
      keyFactors: market?.keyFactors ?? [],
      similarSales: market?.similarSales ?? [],
      sources: market?.sources ?? [],
      confidenceScore: market?.confidenceScore ?? 40,
      dataNote: market?.dataNote ?? "",
      searchQuery: `${identity.name} ${identity.category} market value`,
      webSearchUsed: searchData !== null,
      tcgPrice: tcgPrice || null,
      psaData: psaData || null,
      bnbData: bnbData || null,
    };

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Analysis error:", error);
    return NextResponse.json(
      { error: "Analysis failed: " + (error?.message ?? "Unknown error") },
      { status: 500 }
    );
  }
}
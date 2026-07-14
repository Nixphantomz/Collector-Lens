"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { Web3Providers } from "./providers";
import ScanHistory from "./components/ScanHistory";
import { saveScan } from "./lib/supabase";

interface AnalysisResult {
  identified: boolean;
  name: string;
  category: string;
  description: string;
  condition: string;
  conditionNotes: string;
  psaGrade?: string | null;
  psaCertNumber?: string | null;
  confidence?: string;
  confidenceReason?: string | null;
  confidenceNote?: string | null;
  estimatedValue: { low: number; mid: number; high: number; currency: string };
  rarity: string;
  rarityScore: number;
  signal: "BUY" | "HOLD" | "SELL";
  signalReason: string;
  marketTrend: "Rising" | "Stable" | "Declining";
  trendNote: string;
  keyFactors: string[];
  similarSales: { description: string; price: number; timeAgo: string }[];
  confidenceScore: number;
  sources?: { name: string; url?: string }[];
  searchQuery?: string;
  dataNote?: string;
  year?: string;
  brand?: string;
  webSearchUsed?: boolean;
  tcgPrice?: {
    source: string;
    url: string;
    loose: number | null;
    graded: number | null;
    name: string;
  } | null;
  psaData?: {
    searchUrl: string;
    registryUrl: string;
    renaisssSearchUrl: string;
    name: string;
    psaPopulation?: { summary: string; sources: { name: string; url: string }[] } | null;
    renaiссListings?: { summary: string; sources: { name: string; url: string }[] } | null;
  } | null;
  bnbData?: {
    totalNFTs: number;
    renaiссNFTs: number;
    recentNFTs: { name: string; symbol: string; tokenId: string; contract: string }[];
  } | null;
  error?: string;
}

const SIGNAL = {
  BUY:  { color: "var(--green)", bg: "var(--green-bg)", border: "var(--green-bd)", emoji: "↑", label: "BUY"  },
  HOLD: { color: "var(--amber)", bg: "var(--amber-bg)", border: "var(--amber-bd)", emoji: "→", label: "HOLD" },
  SELL: { color: "var(--red)",   bg: "var(--red-bg)",   border: "var(--red-bd)",   emoji: "↓", label: "SELL" },
};

const TREND = {
  Rising:    { color: "var(--green)", icon: "▲" },
  Stable:    { color: "var(--amber)", icon: "●" },
  Declining: { color: "var(--red)",   icon: "▼" },
};

// Renaiss ecosystem helpers
const RENAISS_CATEGORIES = ["Trading Card", "NFT", "SBT"];
const RENAISS_TCG = ["pokemon", "pokémon", "one piece", "magic", "yugioh", "yu-gi-oh"];

function isRenaissSupportedCategory(category: string) {
  return RENAISS_CATEGORIES.some(c => category?.toLowerCase().includes(c.toLowerCase()));
}

function isRenaissTCG(name: string) {
  return RENAISS_TCG.some(t => name?.toLowerCase().includes(t));
}

function getRenaissSearchUrl(itemName: string) {
  // Extract card name for search — take first 3 words to keep it clean
  const query = itemName.split(" ").slice(0, 4).join(" ");
  return `https://www.renaiss.xyz/marketplace?search=${encodeURIComponent(query)}`;
}

function RenaissBadge({ name, category }: { name: string; category: string }) {
  const isSupported = isRenaissSupportedCategory(category) || isRenaissTCG(name);
  const isTCG = isRenaissTCG(name);
  const searchUrl = getRenaissSearchUrl(name);

  if (!isSupported && !isTCG) return null;

  return (
    <div style={{
      borderRadius: 14,
      border: "1px solid rgba(255,165,0,0.25)",
      background: "rgba(255,140,0,0.05)",
      overflow: "hidden",
    }}>
      {/* Header */}
      <div style={{
        padding: "12px 16px",
        borderBottom: "1px solid rgba(255,165,0,0.15)",
        display: "flex", alignItems: "center", gap: 10,
      }}>
        <div style={{
          width: 28, height: 28, borderRadius: 7, flexShrink: 0,
          background: "rgba(255,140,0,0.12)", border: "1px solid rgba(255,165,0,0.3)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 14,
        }}>◈</div>
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#f59e0b", letterSpacing: "-0.01em" }}>
            Renaiss Ecosystem
          </div>
          <div style={{ fontSize: 10, color: "var(--text-3)", marginTop: 1 }}>
            Physical Collectible Finance Network on BNB Chain
          </div>
        </div>
        <div style={{
          marginLeft: "auto", fontSize: 9, fontWeight: 700,
          color: "#22c55e", background: "rgba(34,197,94,0.1)",
          border: "1px solid rgba(34,197,94,0.25)",
          padding: "3px 8px", borderRadius: 20, letterSpacing: "0.06em",
        }}>
          ELIGIBLE
        </div>
      </div>

      {/* Body */}
      <div style={{ padding: "14px 16px", display: "flex", flexDirection: "column", gap: 10 }}>

        {/* Eligibility info */}
        <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
          {[
            { icon: "✓", text: "Eligible for Renaiss vault custody", color: "#22c55e" },
            { icon: "✓", text: "Tradeable on Renaiss marketplace", color: "#22c55e" },
            isTCG
              ? { icon: "✓", text: "PSA-graded cards supported — tokenizable as NFT on BNB Chain", color: "#22c55e" }
              : { icon: "◈", text: "SBT or NFT — verifiable onchain via Renaiss Protocol", color: "#f59e0b" },
          ].map((item, i) => (
            <div key={i} style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
              <span style={{ color: item.color, fontSize: 11, flexShrink: 0, marginTop: 1 }}>{item.icon}</span>
              <span style={{ fontSize: 12, color: "var(--text-2)", lineHeight: 1.5 }}>{item.text}</span>
            </div>
          ))}
        </div>

        {/* CTA buttons */}
        <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
          <a
            href={searchUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              flex: 1, padding: "10px 14px", borderRadius: 9, textAlign: "center",
              background: "#f59e0b", color: "#0a0808",
              fontSize: 12, fontWeight: 700, textDecoration: "none",
              letterSpacing: "0.01em",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
            }}
          >
            Find on Renaiss →
          </a>
          <a
            href="https://www.renaiss.xyz"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              padding: "10px 14px", borderRadius: 9,
              background: "rgba(255,140,0,0.08)", border: "1px solid rgba(255,165,0,0.2)",
              color: "#f59e0b", fontSize: 12, fontWeight: 600,
              textDecoration: "none",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}
          >
            renaiss.xyz ↗
          </a>
        </div>
      </div>
    </div>
  );
}

const FEATURES = [
  {
    icon: "◈",
    title: "Physical & Digital Collectibles",
    desc: "Scan trading cards, memorabilia, vintage toys, coins — or NFT and SBT artwork. One tool for the full collector economy.",
  },
  {
    icon: "◎",
    title: "Real Market Valuation",
    desc: "Live web search pulls actual sold prices from eBay, StockX, OpenSea, and auction houses — not guesses.",
  },
  {
    icon: "◆",
    title: "Buy / Hold / Sell Signal",
    desc: "AI-powered signals with cited reasoning to help you make smarter decisions on any collectible.",
  },
  {
    icon: "◐",
    title: "Rarity & Condition Grade",
    desc: "Understand where your item sits on the rarity spectrum and how condition or trait rarity affects its value.",
  },
  {
    icon: "◑",
    title: "Onchain Collectible Support",
    desc: "Identify NFTs, SBTs, and tokenized collectibles from their artwork and get market context from onchain data.",
  },
  {
    icon: "◒",
    title: "Sourced Analysis",
    desc: "Every valuation cites its sources — real listings, auction results, and market indexes — so you can verify.",
  },
];

const STATS = [
  { value: "10+", label: "Collectible Categories" },
  { value: "Web3", label: "NFT & SBT Support" },
  { value: "< 15s", label: "Analysis Time" },
  { value: "Free", label: "No Cost to Use" },
];

/* ── Sub-components ── */

function ThemeToggle({ dark, onToggle }: { dark: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      aria-label="Toggle theme"
      style={{ display: "flex", alignItems: "center", gap: 8, background: "none", border: "none", cursor: "pointer", padding: 4 }}
    >
      <span style={{ fontSize: 14, userSelect: "none" }}>{dark ? "🌙" : "☀️"}</span>
      <div className={`toggle-track${!dark ? " active" : ""}`}>
        <div className="toggle-thumb" />
      </div>
      <span style={{ fontSize: 11, color: "var(--text-3)", letterSpacing: "0.06em" }}>
        {dark ? "DARK" : "LIGHT"}
      </span>
    </button>
  );
}

function RarityBar({ score }: { score: number }) {
  const colors = ["#f87171","#fb923c","#fbbf24","#a3e635","#34d399","#22d3ee","#818cf8","#c084fc","#e2e0f0","#f0eef8"];
  return (
    <div style={{ display: "flex", gap: 4 }}>
      {Array.from({ length: 10 }).map((_, i) => (
        <div key={i} className="rarity-pip" style={{
          flex: 1,
          background: i < score ? colors[i] : "var(--surface-3)",
        }} />
      ))}
    </div>
  );
}

function ConfidenceArc({ score }: { score: number }) {
  const r = 28, cx = 36, cy = 36;
  const circ = Math.PI * r;
  const dash = (score / 100) * circ;
  return (
    <svg width={72} height={44} viewBox="0 0 72 44">
      <path d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
        fill="none" stroke="var(--surface-3)" strokeWidth={6} strokeLinecap="round" />
      <path d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
        fill="none" stroke="var(--accent-2)" strokeWidth={6} strokeLinecap="round"
        strokeDasharray={`${dash} ${circ}`} />
      <text x={cx} y={cy - 4} textAnchor="middle" fontSize={13} fontWeight={700} fill="var(--accent-2)">
        {score}%
      </text>
    </svg>
  );
}

function SkeletonLoader() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {[110, 72, 190, 150, 110].map((h, i) => (
        <div key={i} className="shimmer" style={{ height: h, borderRadius: 14 }} />
      ))}
    </div>
  );
}

function ScanOverlay() {
  return (
    <div style={{
      position: "absolute", inset: 0,
      background: "rgba(8,8,15,0.75)",
      backdropFilter: "blur(4px)",
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center", gap: 18,
      borderRadius: 14,
    }}>
      <div style={{ position: "relative", width: 60, height: 60 }}>
        <div className="pulse-ring" style={{
          position: "absolute", inset: 0, borderRadius: "50%",
          border: "2px solid var(--accent)",
        }} />
        <div style={{
          position: "absolute", inset: 8, borderRadius: "50%",
          border: "2px solid var(--accent)", opacity: 0.4,
        }} />
        <div style={{
          position: "absolute", inset: 0,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 22, color: "var(--accent)",
        }}>◈</div>
      </div>
      <div style={{ textAlign: "center" }}>
        <div style={{ color: "var(--accent)", fontSize: 13, fontWeight: 700, letterSpacing: "0.12em" }}>SCANNING</div>
        <div style={{ color: "var(--text-3)", fontSize: 11, marginTop: 4 }}>Identifying collectible...</div>
      </div>
    </div>
  );
}

/* ── Main ── */
function HomeInner({ dark, setDark }: { dark: boolean; setDark: (v: (d: boolean) => boolean) => void }) {
  const { ready, authenticated, user, login, logout } = usePrivy();
  const [image, setImage] = useState<string | null>(null);
  const [imageMime, setImageMime] = useState("image/jpeg");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const appSectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = document.documentElement;
    if (dark) {
      root.removeAttribute("data-theme");
    } else {
      root.setAttribute("data-theme", "light");
    }
  }, [dark]);

  const scrollToApp = () => {
    appSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const processFile = (file: File) => {
    if (!file.type.startsWith("image/")) { setError("Please upload an image file."); return; }
    setImageFile(file);
    setImageMime(file.type);
    setResult(null);
    setError(null);
    const reader = new FileReader();
    reader.onload = (e) => setImage(e.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  }, []);

  const analyze = async () => {
    if (!image || !imageFile) return;
    setLoading(true); setError(null); setResult(null);
    try {
      const base64 = image.split(",")[1];
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageBase64: base64,
          mimeType: imageMime,
          walletAddress: user?.wallet?.address || null,
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setResult(data);

      // Save to scan history if user is authenticated
      if (authenticated && user) {
        const userId = user.wallet?.address || user.email?.address || user.id || null;
        console.log("Saving scan for user:", userId, "auth:", authenticated);
        if (userId) {
          try {
            const saved = await saveScan({
              user_id: userId,
              item_name: data.name || "Unknown",
              category: data.category || "Other",
              condition: data.condition || "Unknown",
              estimated_value_low: Number(data.estimatedValue?.low ?? 0),
              estimated_value_mid: Number(data.estimatedValue?.mid ?? 0),
              estimated_value_high: Number(data.estimatedValue?.high ?? 0),
              signal: data.signal || "HOLD",
              rarity: data.rarity || "Unknown",
              rarity_score: Number(data.rarityScore ?? 5),
              market_trend: data.marketTrend || "Stable",
              confidence_score: Number(data.confidenceScore ?? 50),
              description: data.description || "",
              signal_reason: data.signalReason || "",
            });
            console.log("Scan saved:", saved);
          } catch (saveErr) {
            console.error("Failed to save scan:", saveErr);
          }
        } else {
          console.warn("No userId found on user object:", JSON.stringify(user));
        }
      } else {
        console.log("Not saving - authenticated:", authenticated, "user:", !!user);
      }
    } catch (err: any) {
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setImage(null); setResult(null); setError(null); setImageFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const sig = result ? SIGNAL[result.signal] : null;
  const trd = result ? TREND[result.marketTrend] : null;

  return (
    <main style={{ minHeight: "100vh", position: "relative", zIndex: 1 }}>

      {/* ── Header ── */}
      <header style={{
        borderBottom: "1px solid var(--border)",
        padding: "14px 28px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        background: "var(--header-bg)",
        backdropFilter: "blur(16px)",
        position: "sticky", top: 0, zIndex: 20,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: "var(--accent-dim)",
            border: "1px solid var(--border)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 18, color: "var(--accent-2)",
          }}>◈</div>
          <div>
            <div style={{ fontWeight: 800, fontSize: 15, letterSpacing: "-0.03em", color: "var(--text-1)" }}>
              Collector Lens
            </div>
            <div className="eyebrow" style={{ marginTop: 1 }}>AI Collectible Analyst</div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <button onClick={scrollToApp} style={{
            fontSize: 13, fontWeight: 600, color: "var(--text-2)",
            background: "none", border: "none", cursor: "pointer",
            display: "none",
          }}>
            Try it →
          </button>
          <div className="renaiss-badge" style={{
            fontSize: 11, color: "var(--accent)", padding: "5px 12px",
            border: "1px solid var(--accent-dim)", borderRadius: 20,
            letterSpacing: "0.07em", fontWeight: 600,
            background: "var(--accent-glow)",
          }}>
            WEB3 + AI
          </div>
          {ready && (
            authenticated ? (
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{
                  fontSize: 12, color: "var(--text-2)",
                  maxWidth: 120, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                }}>
                  {user?.email?.address || user?.wallet?.address?.slice(0,6) + "..." + user?.wallet?.address?.slice(-4) || "Connected"}
                </div>
                <button onClick={logout} style={{
                  fontSize: 11, color: "var(--text-3)", padding: "5px 12px",
                  background: "var(--surface-2)", border: "1px solid var(--border)",
                  borderRadius: 20, cursor: "pointer", letterSpacing: "0.05em",
                }}>
                  Sign out
                </button>
              </div>
            ) : (
              <button onClick={login} style={{
                fontSize: 12, fontWeight: 700, color: "var(--bg)",
                padding: "8px 16px", borderRadius: 20,
                background: "var(--accent)", border: "none",
                cursor: "pointer", letterSpacing: "0.03em",
              }}>
                Sign in
              </button>
            )
          )}
          <ThemeToggle dark={dark} onToggle={() => setDark(d => !d)} />
        </div>
      </header>

      {/* ═══════════════════════════════════════
          HERO SECTION
      ═══════════════════════════════════════ */}
      <section style={{
        minHeight: "92vh",
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        padding: "80px 24px 60px",
        position: "relative", overflow: "hidden",
        textAlign: "center",
      }}>
        {/* Radial glow behind hero */}
        <div style={{
          position: "absolute",
          top: "30%", left: "50%",
          transform: "translate(-50%, -50%)",
          width: 600, height: 600,
          borderRadius: "50%",
          background: "radial-gradient(circle, var(--accent-glow) 0%, transparent 70%)",
          pointerEvents: "none",
          zIndex: 0,
        }} />

        <div style={{ position: "relative", zIndex: 1, maxWidth: 720 }}>
          {/* Badge */}
          <div className="fade-in" style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            padding: "6px 14px", borderRadius: 20, marginBottom: 32,
            background: "var(--surface-2)", border: "1px solid var(--border)",
            fontSize: 12, color: "var(--text-2)", fontWeight: 500,
          }}>
            <span style={{
              width: 6, height: 6, borderRadius: "50%",
              background: "var(--green)", display: "inline-block",
              boxShadow: "0 0 6px var(--green)",
            }} />
            Physical & Onchain Collectible Intelligence
          </div>

          {/* Headline */}
          <h1 className="fade-in" style={{
            fontSize: "clamp(40px, 7vw, 76px)",
            fontWeight: 900,
            letterSpacing: "-0.045em",
            lineHeight: 1.04,
            marginBottom: 24,
            background: "linear-gradient(160deg, var(--text-1) 0%, var(--accent) 50%, var(--violet) 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}>
            Know exactly<br />what it's worth.
          </h1>

          {/* Subheadline */}
          <p className="fade-in" style={{
            fontSize: 18, color: "var(--text-2)", lineHeight: 1.7,
            maxWidth: 520, margin: "0 auto 40px",
          }}>
            Drop any collectible photo — trading cards, memorabilia, coins, NFTs, or SBTs — and get instant AI-powered identification, real market valuation, and a buy/hold/sell signal.
          </p>

          {/* CTAs */}
          <div className="fade-in hero-ctas" style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <button
              onClick={() => { if (authenticated) { scrollToApp(); } else { login(); } }}
              className="btn-primary"
              style={{ fontSize: 15, padding: "14px 32px", borderRadius: 10 }}
            >
              {authenticated ? "Scan a Collectible →" : "Get Started →"}
            </button>
            <a
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                fontSize: 14, padding: "14px 24px", borderRadius: 10,
                background: "var(--surface-2)", border: "1px solid var(--border)",
                color: "var(--text-2)", textDecoration: "none", fontWeight: 500,
                transition: "color 0.15s, border-color 0.15s",
              }}
            >
              View on GitHub →
            </a>
          </div>

          {/* Scroll hint */}
          <div style={{ marginTop: 60, color: "var(--text-3)", fontSize: 12, letterSpacing: "0.06em" }}>
            <div style={{ marginBottom: 8 }}>SCROLL TO TRY IT</div>
            <div style={{ fontSize: 18, animation: "bounce 1.8s ease-in-out infinite" }}>↓</div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════
          STATS BAR
      ═══════════════════════════════════════ */}
      <section style={{
        borderTop: "1px solid var(--border)",
        borderBottom: "1px solid var(--border)",
        background: "var(--surface)",
        padding: "28px 24px",
      }}>
        <div style={{
          maxWidth: 800, margin: "0 auto",
          display: "grid", gridTemplateColumns: "repeat(4, 1fr)",
          gap: 0,
        }} className="stats-grid">
          {STATS.map((s, i) => (
            <div key={s.label} style={{
              textAlign: "center",
              borderRight: i < STATS.length - 1 ? "1px solid var(--border)" : "none",
              padding: "4px 16px",
            }}>
              <div style={{
                fontSize: 26, fontWeight: 900, letterSpacing: "-0.04em",
                color: "var(--accent-2)", marginBottom: 4,
              }}>{s.value}</div>
              <div className="eyebrow">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ═══════════════════════════════════════
          FEATURES GRID
      ═══════════════════════════════════════ */}
      <section style={{ padding: "80px 24px", maxWidth: 1020, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 56 }}>
          <div className="eyebrow" style={{ marginBottom: 12 }}>What you get</div>
          <h2 style={{
            fontSize: "clamp(28px, 4vw, 42px)", fontWeight: 800,
            letterSpacing: "-0.04em", color: "var(--text-1)", lineHeight: 1.15,
          }}>
            Everything a collector needs<br />to make smarter decisions
          </h2>
        </div>

        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: 16,
        }} className="features-grid">
          {FEATURES.map((f) => (
            <div key={f.title} className="card" style={{ padding: "24px" }}>
              <div style={{
                width: 42, height: 42, borderRadius: 10, marginBottom: 16,
                background: "var(--surface-2)", border: "1px solid var(--border)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 18, color: "var(--accent)",
              }}>
                {f.icon}
              </div>
              <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text-1)", marginBottom: 8, letterSpacing: "-0.02em" }}>
                {f.title}
              </div>
              <div style={{ fontSize: 13, color: "var(--text-2)", lineHeight: 1.65 }}>
                {f.desc}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ═══════════════════════════════════════
          HOW IT WORKS
      ═══════════════════════════════════════ */}
      <section style={{
        padding: "60px 24px 80px",
        background: "var(--surface)",
        borderTop: "1px solid var(--border)",
        borderBottom: "1px solid var(--border)",
      }}>
        <div style={{ maxWidth: 700, margin: "0 auto", textAlign: "center" }}>
          <div className="eyebrow" style={{ marginBottom: 12 }}>How it works</div>
          <h2 style={{
            fontSize: "clamp(24px, 3.5vw, 36px)", fontWeight: 800,
            letterSpacing: "-0.04em", color: "var(--text-1)",
            marginBottom: 48, lineHeight: 1.2,
          }}>
            Three steps. Under 10 seconds.
          </h2>

          <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
            {[
              { step: "01", title: "Upload a photo", desc: "Drag and drop or browse any image of your collectible — card, toy, coin, or memorabilia." },
              { step: "02", title: "AI scans and identifies", desc: "AI vision analyses the image, identifies the item, and runs a live web search for real sold prices and market data." },
              { step: "03", title: "Get your analysis", desc: "Instant valuation, condition grade, rarity score, market trend, and a buy/hold/sell signal." },
            ].map((item, i, arr) => (
              <div key={item.step} style={{ display: "flex", gap: 24, alignItems: "flex-start", position: "relative" }}>
                {/* Line connector */}
                {i < arr.length - 1 && (
                  <div style={{
                    position: "absolute",
                    left: 20, top: 52,
                    width: 1, height: "calc(100% - 8px)",
                    background: "var(--border)",
                  }} />
                )}
                {/* Step number */}
                <div style={{
                  width: 42, height: 42, borderRadius: "50%", flexShrink: 0,
                  background: "var(--surface-2)", border: "1px solid var(--border)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 11, fontWeight: 800, color: "var(--accent)",
                  letterSpacing: "0.05em", zIndex: 1,
                }}>
                  {item.step}
                </div>
                {/* Content */}
                <div style={{ paddingBottom: i < arr.length - 1 ? 40 : 0, textAlign: "left" }}>
                  <div style={{ fontSize: 16, fontWeight: 700, color: "var(--text-1)", marginBottom: 6, marginTop: 10, letterSpacing: "-0.02em" }}>
                    {item.title}
                  </div>
                  <div style={{ fontSize: 13, color: "var(--text-2)", lineHeight: 1.65 }}>
                    {item.desc}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════
          APP SECTION (Upload + Results)
      ═══════════════════════════════════════ */}
      <section ref={appSectionRef} style={{ padding: "80px 24px 60px" }}>
        {/* Section header */}
        <div style={{ textAlign: "center", marginBottom: 48, maxWidth: 520, margin: "0 auto 48px" }}>
          <div className="eyebrow" style={{ marginBottom: 12 }}>Try it now</div>
          <h2 style={{
            fontSize: "clamp(28px, 4vw, 40px)", fontWeight: 800,
            letterSpacing: "-0.04em", color: "var(--text-1)", lineHeight: 1.15,
          }}>
            Drop your collectible.<br />Get the full picture.
          </h2>
        </div>

        {/* Auth gate */}
        {ready && !authenticated && (
          <div style={{
            maxWidth: 480, margin: "0 auto 48px", textAlign: "center",
            padding: "40px 32px", borderRadius: 20,
            background: "var(--surface)", border: "1px solid var(--border)",
          }}>
            <div style={{
              width: 56, height: 56, borderRadius: 16, margin: "0 auto 20px",
              background: "var(--surface-2)", border: "1px solid var(--border)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 24,
            }}>🔒</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: "var(--text-1)", marginBottom: 10, letterSpacing: "-0.03em" }}>
              Sign in to scan
            </div>
            <div style={{ fontSize: 14, color: "var(--text-2)", lineHeight: 1.65, marginBottom: 24 }}>
              Connect your wallet or sign in with Google or email to access the scanner and save your scan history.
            </div>
            <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
              <button onClick={login} style={{
                padding: "12px 28px", borderRadius: 10,
                background: "var(--accent)", border: "none",
                color: "var(--bg)", fontWeight: 700, fontSize: 14,
                cursor: "pointer",
              }}>
                Connect Wallet
              </button>
              <button onClick={login} style={{
                padding: "12px 22px", borderRadius: 10,
                background: "var(--surface-2)", border: "1px solid var(--border)",
                color: "var(--text-2)", fontWeight: 600, fontSize: 13,
                cursor: "pointer",
              }}>
                Sign in with Google
              </button>
            </div>
            <div style={{ marginTop: 16, fontSize: 11, color: "var(--text-3)" }}>
              Wallet · Google · Email — all supported
            </div>
          </div>
        )}

        {ready && authenticated && <div className="app-grid" style={{
          maxWidth: 1020, margin: "0 auto",
          display: "grid",
          gridTemplateColumns: result || loading ? "minmax(0,1fr) minmax(0,1fr)" : "minmax(0, 560px)",
          justifyContent: "center",
          gap: 28,
          alignItems: "start",
        }}>

          {/* Left: Upload */}
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {/* Upload zone */}
            <div
              className={`upload-zone${dragging ? " dragging" : ""}`}
              onClick={() => !image && fileInputRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
              style={{ cursor: image ? "default" : "pointer" }}
            >
              {image ? (
                <div style={{ position: "relative", width: "100%", height: "100%" }}>
                  <img src={image} alt="Collectible"
                    style={{ width: "100%", maxHeight: 380, objectFit: "contain", display: "block", padding: 20 }} />
                  {loading && <ScanOverlay />}
                </div>
              ) : (
                <div style={{ textAlign: "center", padding: 56 }}>
                  <div style={{
                    width: 72, height: 72, borderRadius: 18, margin: "0 auto 20px",
                    background: "var(--surface-2)", border: "1px solid var(--border)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 30, color: "var(--text-3)",
                  }}>◈</div>
                  <div style={{ color: "var(--text-2)", fontSize: 15, fontWeight: 600, marginBottom: 8 }}>
                    Drop your collectible photo here
                  </div>
                  <div style={{ color: "var(--text-3)", fontSize: 12, marginBottom: 20 }}>
                    JPG, PNG, or WEBP · any collectible type
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6, justifyContent: "center" }}>
                    {["Trading Cards","NFTs","SBTs","Memorabilia","Coins","Sneakers"].map(c => (
                      <span key={c} className="category-pill" style={{ fontSize: 11 }}>{c}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <input ref={fileInputRef} type="file" accept="image/*"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) processFile(f); }}
              style={{ display: "none" }} />

            <div style={{ display: "flex", gap: 10 }}>
              {image && !loading ? (
                <>
                  <button className="btn-primary" onClick={analyze} style={{ flex: 1 }}>
                    Analyze Collectible →
                  </button>
                  <button className="btn-ghost" onClick={reset}>Clear</button>
                </>
              ) : !image ? (
                <button className="btn-ghost" onClick={() => fileInputRef.current?.click()} style={{ flex: 1 }}>
                  Browse files
                </button>
              ) : null}
            </div>

            {error && (
              <div style={{
                padding: "13px 16px", borderRadius: 10,
                background: "var(--red-bg)", border: "1px solid var(--red-bd)",
                color: "var(--red)", fontSize: 13,
              }}>
                ⚠ {error}
              </div>
            )}
          </div>

          {/* Right: Results */}
          {(loading || result) && (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {loading && <SkeletonLoader />}

              {result && !loading && (
                <div className="stagger" style={{ display: "flex", flexDirection: "column", gap: 14 }}>

                  {/* Signal */}
                  {sig && (
                    <div style={{
                      padding: "18px 20px", borderRadius: 14,
                      background: sig.bg, border: `1px solid ${sig.border}`,
                      display: "flex", alignItems: "center", justifyContent: "space-between",
                    }}>
                      <div>
                        <div className="eyebrow" style={{ color: sig.color, marginBottom: 6 }}>Signal</div>
                        <div style={{ fontSize: 32, fontWeight: 900, color: sig.color, letterSpacing: "-0.03em", lineHeight: 1 }}>
                          {sig.emoji} {sig.label}
                        </div>
                      </div>
                      <div style={{ textAlign: "center" }}>
                        <div className="eyebrow" style={{ marginBottom: 4 }}>Confidence</div>
                        <ConfidenceArc score={result.confidenceScore} />
                      </div>
                    </div>
                  )}

                  {/* Identity */}
                  <div className="card">
                    <div className="eyebrow" style={{ marginBottom: 8 }}>Identified as</div>
                    <div style={{ fontSize: 21, fontWeight: 800, letterSpacing: "-0.03em", color: "var(--text-1)", marginBottom: 6 }}>
                      {result.name}
                    </div>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
                      <div style={{
                        display: "inline-block", fontSize: 11, fontWeight: 600,
                        color: "var(--violet)", background: "var(--violet-dim)",
                        padding: "3px 10px", borderRadius: 20,
                        letterSpacing: "0.04em",
                      }}>
                        {result.category}
                      </div>
                      {result.psaGrade && (
                        <div style={{
                          display: "inline-block", fontSize: 11, fontWeight: 800,
                          color: "#fff", background: "#1e40af",
                          padding: "3px 10px", borderRadius: 20,
                          letterSpacing: "0.04em",
                        }}>
                          PSA {result.psaGrade}
                        </div>
                      )}
                      {(result.confidence === "low" || result.confidence === "medium") && (
                        <div style={{
                          display: "inline-flex", alignItems: "center", gap: 6,
                          fontSize: 11, fontWeight: 600,
                          color: result.confidence === "low" ? "var(--amber)" : "var(--text-3)",
                          background: result.confidence === "low" ? "var(--amber-bg)" : "var(--surface-2)",
                          border: `1px solid ${result.confidence === "low" ? "var(--amber-bd)" : "var(--border)"}`,
                          padding: "3px 10px", borderRadius: 20,
                          letterSpacing: "0.04em",
                        }}>
                          {result.confidence === "low" ? "⚠" : "◎"} {result.confidence === "low" ? "Low" : "Medium"} confidence
                        </div>
                      )}
                    </div>
                    <div style={{ fontSize: 13, color: "var(--text-2)", lineHeight: 1.7 }}>
                      {result.description}
                    </div>

                    {/* Confidence explanation */}
                    {(result.confidenceReason || result.confidenceNote) && (
                      <div style={{
                        marginTop: 12, padding: "10px 14px", borderRadius: 10,
                        background: result.confidence === "low"
                          ? "var(--amber-bg)"
                          : result.confidence === "high"
                          ? "var(--green-bg)"
                          : "var(--surface-2)",
                        border: `1px solid ${result.confidence === "low"
                          ? "var(--amber-bd)"
                          : result.confidence === "high"
                          ? "var(--green-bd)"
                          : "var(--border)"}`,
                        display: "flex", flexDirection: "column", gap: 8,
                      }}>
                        {result.confidenceReason && (
                          <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                            <span style={{ fontSize: 13, flexShrink: 0 }}>
                              {result.confidence === "low" ? "⚠" : result.confidence === "high" ? "✓" : "◎"}
                            </span>
                            <div>
                              <div style={{
                                fontSize: 10, fontWeight: 700, letterSpacing: "0.08em",
                                textTransform: "uppercase", marginBottom: 3,
                                color: result.confidence === "low" ? "var(--amber)"
                                  : result.confidence === "high" ? "var(--green)"
                                  : "var(--text-3)",
                              }}>
                                ID Confidence · {result.confidence}
                              </div>
                              <div style={{ fontSize: 12, color: "var(--text-2)", lineHeight: 1.6 }}>
                                {result.confidenceReason}
                              </div>
                            </div>
                          </div>
                        )}
                        {result.confidenceNote && (
                          <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                            <span style={{ fontSize: 13, flexShrink: 0 }}>📊</span>
                            <div>
                              <div style={{
                                fontSize: 10, fontWeight: 700, letterSpacing: "0.08em",
                                textTransform: "uppercase", marginBottom: 3,
                                color: "var(--text-3)",
                              }}>
                                Valuation Confidence
                              </div>
                              <div style={{ fontSize: 12, color: "var(--text-2)", lineHeight: 1.6 }}>
                                {result.confidenceNote}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Valuation */}
                  <div className="card-silver">
                    <div className="eyebrow" style={{ marginBottom: 14 }}>Estimated value</div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
                      {[
                        { label: "Low",  value: result.estimatedValue.low,  highlight: false },
                        { label: "Mid",  value: result.estimatedValue.mid,  highlight: true  },
                        { label: "High", value: result.estimatedValue.high, highlight: false },
                      ].map(({ label, value, highlight }) => (
                        <div key={label} style={{
                          textAlign: "center", padding: "14px 8px", borderRadius: 10,
                          background: highlight ? "var(--accent-glow)" : "var(--surface-2)",
                          border: `1px solid ${highlight ? "var(--accent-dim)" : "var(--border)"}`,
                        }}>
                          <div className="eyebrow" style={{ marginBottom: 7 }}>{label}</div>
                          <div style={{
                            fontSize: highlight ? 22 : 17, fontWeight: 800,
                            color: highlight ? "var(--accent-2)" : "var(--text-1)",
                            letterSpacing: "-0.02em",
                          }}>
                            ${value.toLocaleString()}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* TCG Market Price from PriceCharting */}
                  {result.tcgPrice && (
                    <div style={{
                      padding: "14px 16px", borderRadius: 12,
                      background: "var(--surface)", border: "1px solid var(--border)",
                    }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                        <div className="eyebrow">TCG Market Price</div>
                        <a
                          href={result.tcgPrice.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ fontSize: 11, color: "var(--violet)", textDecoration: "none" }}
                        >
                          PriceCharting ↗
                        </a>
                      </div>
                      <div style={{ display: "flex", gap: 10 }}>
                        {result.tcgPrice.loose != null && (
                          <div style={{
                            flex: 1, textAlign: "center", padding: "10px 8px", borderRadius: 8,
                            background: "var(--surface-2)", border: "1px solid var(--border)",
                          }}>
                            <div style={{ fontSize: 9, color: "var(--text-3)", letterSpacing: "0.08em", marginBottom: 4 }}>UNGRADED</div>
                            <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text-1)" }}>
                              ${result.tcgPrice.loose.toLocaleString()}
                            </div>
                          </div>
                        )}
                        {result.tcgPrice.graded != null && (
                          <div style={{
                            flex: 1, textAlign: "center", padding: "10px 8px", borderRadius: 8,
                            background: "var(--accent-glow)", border: "1px solid var(--accent-dim)",
                          }}>
                            <div style={{ fontSize: 9, color: "var(--text-3)", letterSpacing: "0.08em", marginBottom: 4 }}>PSA GRADED</div>
                            <div style={{ fontSize: 15, fontWeight: 700, color: "var(--accent-2)" }}>
                              ${result.tcgPrice.graded.toLocaleString()}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Condition + Rarity */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    <div className="card">
                      <div className="eyebrow" style={{ marginBottom: 8 }}>Condition</div>
                      <div style={{ fontSize: 17, fontWeight: 700, color: "var(--text-1)", marginBottom: 6 }}>
                        {result.condition}
                      </div>
                      <div style={{ fontSize: 11, color: "var(--text-2)", lineHeight: 1.55 }}>
                        {result.conditionNotes}
                      </div>
                    </div>
                    <div className="card">
                      <div className="eyebrow" style={{ marginBottom: 8 }}>Rarity</div>
                      <div style={{ fontSize: 17, fontWeight: 700, color: "var(--accent)", marginBottom: 12 }}>
                        {result.rarity}
                      </div>
                      <RarityBar score={result.rarityScore} />
                      <div style={{ fontSize: 10, color: "var(--text-3)", marginTop: 6 }}>{result.rarityScore}/10</div>
                    </div>
                  </div>

                  {/* Market trend */}
                  {trd && (
                    <div className="card" style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
                      <div style={{
                        width: 44, height: 44, borderRadius: 10, flexShrink: 0,
                        background: "var(--surface-2)", border: "1px solid var(--border)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 18, color: trd.color,
                      }}>
                        {trd.icon}
                      </div>
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                          <div className="eyebrow">Market trend</div>
                          <div style={{ fontSize: 12, fontWeight: 700, color: trd.color }}>{result.marketTrend}</div>
                        </div>
                        <div style={{ fontSize: 13, color: "var(--text-2)", lineHeight: 1.65 }}>{result.trendNote}</div>
                      </div>
                    </div>
                  )}

                  {/* Analyst note */}
                  <div className="card" style={{ borderLeft: "3px solid var(--accent)", borderRadius: "0 14px 14px 0" }}>
                    <div className="eyebrow" style={{ marginBottom: 8 }}>Analyst note</div>
                    <div style={{ fontSize: 13, color: "var(--text-2)", lineHeight: 1.75 }}>
                      {result.signalReason}
                    </div>
                  </div>

                  {/* Key factors */}
                  {result.keyFactors?.length > 0 && (
                    <div className="card">
                      <div className="eyebrow" style={{ marginBottom: 12 }}>Key factors</div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
                        {result.keyFactors.map((f, i) => (
                          <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                            <div style={{
                              width: 20, height: 20, borderRadius: 6, flexShrink: 0,
                              background: "var(--accent-glow)", border: "1px solid var(--accent-dim)",
                              display: "flex", alignItems: "center", justifyContent: "center",
                              fontSize: 9, color: "var(--accent)", fontWeight: 800,
                            }}>{i + 1}</div>
                            <span style={{ fontSize: 13, color: "var(--text-2)", lineHeight: 1.6 }}>{f}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Similar sales */}
                  {result.similarSales?.length > 0 && (
                    <div className="card">
                      <div className="eyebrow" style={{ marginBottom: 12 }}>Similar sales</div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        {result.similarSales.map((s, i) => (
                          <div key={i} style={{
                            display: "flex", justifyContent: "space-between", alignItems: "center",
                            padding: "11px 14px", borderRadius: 10,
                            background: "var(--surface-2)", border: "1px solid var(--border)", gap: 12,
                          }}>
                            <div>
                              <div style={{ fontSize: 12, color: "var(--text-1)", fontWeight: 500, marginBottom: 2 }}>
                                {s.description}
                              </div>
                              <div style={{ fontSize: 11, color: "var(--text-3)" }}>{s.timeAgo}</div>
                            </div>
                            <div style={{ fontSize: 15, fontWeight: 800, color: "var(--accent-2)", flexShrink: 0, letterSpacing: "-0.02em" }}>
                              ${s.price.toLocaleString()}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Sources */}
                  {result.sources && result.sources.length > 0 && (
                    <div className="card">
                      <div className="eyebrow" style={{ marginBottom: 12 }}>Data sources</div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                        {result.sources.map((s: { name: string; url?: string }, i: number) => (
                          <div key={i} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <div style={{
                              width: 6, height: 6, borderRadius: "50%", flexShrink: 0,
                              background: "var(--accent)",
                            }} />
                            {s.url ? (
                              <a href={s.url} target="_blank" rel="noopener noreferrer" style={{
                                fontSize: 12, color: "var(--violet)", textDecoration: "none",
                              }}>
                                {s.name} ↗
                              </a>
                            ) : (
                              <span style={{ fontSize: 12, color: "var(--text-2)" }}>{s.name}</span>
                            )}
                          </div>
                        ))}
                      </div>
                      {result.dataNote && (
                        <div style={{
                          marginTop: 10, padding: "8px 12px", borderRadius: 8,
                          background: "var(--green-bg)", border: "1px solid var(--green-bd)",
                          fontSize: 11, color: "var(--green)",
                        }}>
                          ✓ {result.dataNote}
                        </div>
                      )}
                      {result.searchQuery && (
                        <div style={{
                          marginTop: 8, padding: "8px 12px", borderRadius: 8,
                          background: "var(--surface-2)", border: "1px solid var(--border)",
                          fontSize: 11, color: "var(--text-3)", fontFamily: "monospace",
                        }}>
                          🔍 {result.searchQuery}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Renaiss Ecosystem Panel */}
                  <RenaissBadge
                    name={result.name}
                    category={result.category}
                  />

                  {/* PSA + Renaiss Marketplace Panel */}
                  {result.psaData && (
                    <div style={{
                      borderRadius: 14, overflow: "hidden",
                      border: "1px solid rgba(59,130,246,0.2)",
                      background: "var(--surface)",
                    }}>
                      {/* Header */}
                      <div style={{
                        padding: "12px 16px",
                        borderBottom: "1px solid var(--border)",
                        display: "flex", alignItems: "center", justifyContent: "space-between",
                      }}>
                        <div className="eyebrow">PSA Grading + Renaiss Vault</div>
                        <div style={{ display: "flex", gap: 6 }}>
                          <span style={{
                            fontSize: 9, fontWeight: 700, color: "#3b82f6",
                            background: "rgba(59,130,246,0.1)", border: "1px solid rgba(59,130,246,0.2)",
                            padding: "2px 7px", borderRadius: 20,
                          }}>PSA</span>
                          <span style={{
                            fontSize: 9, fontWeight: 700, color: "#f59e0b",
                            background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.2)",
                            padding: "2px 7px", borderRadius: 20,
                          }}>RENAISS</span>
                        </div>
                      </div>

                      <div style={{ padding: "14px 16px", display: "flex", flexDirection: "column", gap: 12 }}>

                        {/* PSA Population data from Tavily */}
                        {result.psaData.psaPopulation ? (
                          <div>
                            <div style={{ fontSize: 11, fontWeight: 700, color: "#3b82f6", marginBottom: 6 }}>
                              📊 PSA Population & Grade Data
                            </div>
                            <div style={{
                              fontSize: 12, color: "var(--text-2)", lineHeight: 1.65,
                              padding: "10px 12px", borderRadius: 8,
                              background: "rgba(59,130,246,0.05)", border: "1px solid rgba(59,130,246,0.15)",
                            }}>
                              {result.psaData.psaPopulation.summary}
                            </div>
                            {result.psaData.psaPopulation.sources.map((s, i) => (
                              <a key={i} href={s.url} target="_blank" rel="noopener noreferrer"
                                style={{ display: "block", fontSize: 11, color: "#3b82f6", marginTop: 6, textDecoration: "none" }}>
                                {s.name} ↗
                              </a>
                            ))}
                          </div>
                        ) : (
                          <div style={{ fontSize: 12, color: "var(--text-2)", lineHeight: 1.6 }}>
                            PSA-graded versions are eligible for Renaiss vault tokenization on BNB Chain. Higher grades (PSA 9–10) command the strongest premiums.
                          </div>
                        )}

                        {/* Renaiss marketplace listing data */}
                        {result.psaData.renaiссListings && (
                          <div>
                            <div style={{ fontSize: 11, fontWeight: 700, color: "#f59e0b", marginBottom: 6 }}>
                              ◈ Renaiss Marketplace Activity
                            </div>
                            <div style={{
                              fontSize: 12, color: "var(--text-2)", lineHeight: 1.65,
                              padding: "10px 12px", borderRadius: 8,
                              background: "rgba(245,158,11,0.05)", border: "1px solid rgba(245,158,11,0.15)",
                            }}>
                              {result.psaData.renaiссListings.summary}
                            </div>
                            {result.psaData.renaiссListings.sources.map((s, i) => (
                              <a key={i} href={s.url} target="_blank" rel="noopener noreferrer"
                                style={{ display: "block", fontSize: 11, color: "#f59e0b", marginTop: 6, textDecoration: "none" }}>
                                {s.name} ↗
                              </a>
                            ))}
                          </div>
                        )}

                        {/* CTA links */}
                        <div style={{ display: "flex", gap: 8 }}>
                          <a href={result.psaData.searchUrl} target="_blank" rel="noopener noreferrer"
                            style={{
                              flex: 1, padding: "9px 12px", borderRadius: 8, textAlign: "center",
                              background: "rgba(59,130,246,0.08)", border: "1px solid rgba(59,130,246,0.2)",
                              color: "#3b82f6", fontSize: 11, fontWeight: 600, textDecoration: "none",
                            }}>
                            PSA Pop Report ↗
                          </a>
                          <a href={result.psaData.renaisssSearchUrl} target="_blank" rel="noopener noreferrer"
                            style={{
                              flex: 1, padding: "9px 12px", borderRadius: 8, textAlign: "center",
                              background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)",
                              color: "#f59e0b", fontSize: 11, fontWeight: 600, textDecoration: "none",
                            }}>
                            Find on Renaiss ↗
                          </a>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* BNB Chain Panel */}
                  {result.bnbData && result.bnbData.totalNFTs > 0 && (
                    <div style={{
                      padding: "16px", borderRadius: 12,
                      background: "var(--surface)", border: "1px solid rgba(243,186,47,0.25)",
                    }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                        <div className="eyebrow" style={{ marginBottom: 0 }}>Your BNB Chain Wallet</div>
                        <div style={{
                          fontSize: 10, fontWeight: 700, color: "#f3ba2f",
                          background: "rgba(243,186,47,0.1)", border: "1px solid rgba(243,186,47,0.25)",
                          padding: "3px 8px", borderRadius: 20, letterSpacing: "0.06em",
                        }}>BNB CHAIN</div>
                      </div>
                      <div style={{ fontSize: 13, color: "var(--text-2)", marginBottom: 10 }}>
                        <span style={{ color: "var(--text-1)", fontWeight: 700 }}>{result.bnbData.totalNFTs}</span> NFTs detected in connected wallet
                        {result.bnbData.renaiссNFTs > 0 && (
                          <span style={{ color: "#f59e0b", fontWeight: 700 }}>
                            {" "}· {result.bnbData.renaiссNFTs} Renaiss collectibles
                          </span>
                        )}
                      </div>
                      {result.bnbData.recentNFTs.map((nft, i) => (
                        <div key={i} style={{
                          padding: "8px 12px", borderRadius: 8, marginBottom: 6,
                          background: "var(--surface-2)", border: "1px solid var(--border)",
                          display: "flex", justifyContent: "space-between", alignItems: "center",
                        }}>
                          <div>
                            <div style={{ fontSize: 12, color: "var(--text-1)", fontWeight: 600 }}>{nft.name || "Unknown NFT"}</div>
                            <div style={{ fontSize: 10, color: "var(--text-3)" }}>#{nft.tokenId} · {nft.symbol}</div>
                          </div>
                          <a
                            href={`https://bscscan.com/token/${nft.contract}?a=${nft.tokenId}`}
                            target="_blank" rel="noopener noreferrer"
                            style={{ fontSize: 11, color: "#f3ba2f", textDecoration: "none" }}
                          >
                            View ↗
                          </a>
                        </div>
                      ))}
                    </div>
                  )}

                  <button className="btn-ghost" onClick={reset} style={{ width: "100%", marginTop: 4 }}>
                    ← Scan another item
                  </button>
                </div>
              )}
            </div>
          )}
        </div>}
      </section>

      {/* ── Footer ── */}
      <footer style={{
        borderTop: "1px solid var(--border)",
        padding: "32px 24px",
        background: "var(--surface)",
      }}>
        <div style={{
          maxWidth: 1020, margin: "0 auto",
          display: "flex", justifyContent: "space-between", alignItems: "center",
          flexWrap: "wrap", gap: 16,
        }} className="footer-inner">
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 28, height: 28, borderRadius: 7,
              background: "var(--accent-dim)", border: "1px solid var(--border)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 14, color: "var(--accent-2)",
            }}>◈</div>
            <span style={{ fontWeight: 700, fontSize: 13, color: "var(--text-1)" }}>Collector Lens</span>
          </div>
          <div style={{ fontSize: 11, color: "var(--text-3)", letterSpacing: "0.04em", textAlign: "center" }}>
            PHYSICAL & ONCHAIN COLLECTIBLE INTELLIGENCE · BUILT WITH GROQ + TAVILY
          </div>
          <div style={{ fontSize: 11, color: "var(--text-3)" }}>
            © 2026 Collector Lens
          </div>
        </div>
      </footer>

      <style>{`
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(6px); }
        }
      `}</style>

      {/* Scan History Drawer */}
      {authenticated && user && (
        <ScanHistory
          userId={user.wallet?.address || user.email?.address || user.id || ''}
        />
      )}
    </main>
  );
}

export default function Home() {
  const [dark, setDark] = useState(true);
  return (
    <Web3Providers isDark={dark}>
      <HomeInner dark={dark} setDark={setDark} />
    </Web3Providers>
  );
}
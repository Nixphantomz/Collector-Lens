"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { Web3Providers } from "./providers";

interface AnalysisResult {
  identified: boolean;
  name: string;
  category: string;
  description: string;
  condition: string;
  conditionNotes: string;
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
        body: JSON.stringify({ imageBase64: base64, mimeType: imageMime }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setResult(data);
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
                    <div style={{
                      display: "inline-block", fontSize: 11, fontWeight: 600,
                      color: "var(--violet)", background: "var(--violet-dim)",
                      padding: "3px 10px", borderRadius: 20, marginBottom: 12,
                      letterSpacing: "0.04em",
                    }}>
                      {result.category}
                    </div>
                    <div style={{ fontSize: 13, color: "var(--text-2)", lineHeight: 1.7 }}>
                      {result.description}
                    </div>
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
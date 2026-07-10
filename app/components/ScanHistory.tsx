'use client';

import { useState, useEffect } from 'react';
import { getUserScans, deleteScan, ScanRecord } from '../lib/supabase';

const SIGNAL_COLORS = {
  BUY:  { color: 'var(--green)', bg: 'var(--green-bg)', border: 'var(--green-bd)' },
  HOLD: { color: 'var(--amber)', bg: 'var(--amber-bg)', border: 'var(--amber-bd)' },
  SELL: { color: 'var(--red)',   bg: 'var(--red-bg)',   border: 'var(--red-bd)'   },
};

const TREND_ICONS = {
  Rising:    { icon: '▲', color: 'var(--green)' },
  Stable:    { icon: '●', color: 'var(--amber)' },
  Declining: { icon: '▼', color: 'var(--red)'   },
};

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}

export default function ScanHistory({ userId }: { userId: string }) {
  const [scans, setScans] = useState<ScanRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (userId && isOpen) {
      loadScans();
    }
  }, [userId, isOpen]);

  const loadScans = async () => {
    setLoading(true);
    const data = await getUserScans(userId);
    setScans(data);
    setLoading(false);
  };

  const handleDelete = async (id: string) => {
    setDeleting(id);
    const success = await deleteScan(id);
    if (success) {
      setScans(prev => prev.filter(s => s.id !== id));
    }
    setDeleting(null);
  };

  const sig = (signal: string) =>
    SIGNAL_COLORS[signal as keyof typeof SIGNAL_COLORS] || SIGNAL_COLORS.HOLD;

  const trd = (trend: string) =>
    TREND_ICONS[trend as keyof typeof TREND_ICONS] || TREND_ICONS.Stable;

  return (
    <>
      {/* Toggle button */}
      <button
        onClick={() => setIsOpen(o => !o)}
        style={{
          position: 'fixed', bottom: 24, right: 24, zIndex: 50,
          width: 52, height: 52, borderRadius: '50%',
          background: 'var(--surface)', border: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', fontSize: 20,
          boxShadow: '0 4px 24px rgba(0,0,0,0.3)',
          transition: 'transform 0.2s, box-shadow 0.2s',
        }}
        title="Scan History"
      >
        {isOpen ? '✕' : '🕐'}
        {scans.length > 0 && !isOpen && (
          <div style={{
            position: 'absolute', top: -4, right: -4,
            width: 18, height: 18, borderRadius: '50%',
            background: 'var(--accent)', color: 'var(--bg)',
            fontSize: 10, fontWeight: 800,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {scans.length}
          </div>
        )}
      </button>

      {/* Drawer */}
      {isOpen && (
        <div style={{
          position: 'fixed', top: 0, right: 0, bottom: 0,
          width: '100%', maxWidth: 420, zIndex: 40,
          background: 'var(--surface)',
          borderLeft: '1px solid var(--border)',
          display: 'flex', flexDirection: 'column',
          boxShadow: '-8px 0 40px rgba(0,0,0,0.3)',
          animation: 'slideIn 0.25s cubic-bezier(0.16,1,0.3,1)',
        }}>
          <style>{`
            @keyframes slideIn {
              from { transform: translateX(100%); }
              to { transform: translateX(0); }
            }
          `}</style>

          {/* Header */}
          <div style={{
            padding: '20px 24px',
            borderBottom: '1px solid var(--border)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            flexShrink: 0,
          }}>
            <div>
              <div style={{ fontWeight: 800, fontSize: 16, color: 'var(--text-1)', letterSpacing: '-0.02em' }}>
                Scan History
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>
                {scans.length} scan{scans.length !== 1 ? 's' : ''} saved
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              style={{
                background: 'var(--surface-2)', border: '1px solid var(--border)',
                borderRadius: 8, width: 32, height: 32,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', fontSize: 14, color: 'var(--text-2)',
              }}
            >✕</button>
          </div>

          {/* Content */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
            {loading ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[1,2,3].map(i => (
                  <div key={i} className="shimmer" style={{ height: 80, borderRadius: 12 }} />
                ))}
              </div>
            ) : scans.length === 0 ? (
              <div style={{
                textAlign: 'center', padding: '60px 20px',
                color: 'var(--text-3)',
              }}>
                <div style={{ fontSize: 40, marginBottom: 16 }}>◈</div>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-2)', marginBottom: 8 }}>
                  No scans yet
                </div>
                <div style={{ fontSize: 12 }}>
                  Your scan history will appear here after you analyse your first collectible.
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {scans.map(scan => {
                  const s = sig(scan.signal);
                  const t = trd(scan.market_trend);
                  const isExpanded = expanded === scan.id;

                  return (
                    <div
                      key={scan.id}
                      style={{
                        background: 'var(--surface-2)',
                        border: '1px solid var(--border)',
                        borderRadius: 12,
                        overflow: 'hidden',
                        transition: 'border-color 0.2s',
                      }}
                    >
                      {/* Scan card header */}
                      <div
                        onClick={() => setExpanded(isExpanded ? null : scan.id!)}
                        style={{
                          padding: '14px 16px',
                          cursor: 'pointer',
                          display: 'flex', alignItems: 'center', gap: 12,
                        }}
                      >
                        {/* Signal pill */}
                        <div style={{
                          padding: '4px 10px', borderRadius: 20, flexShrink: 0,
                          background: s.bg, border: `1px solid ${s.border}`,
                          fontSize: 11, fontWeight: 800, color: s.color,
                          letterSpacing: '0.06em',
                        }}>
                          {scan.signal}
                        </div>

                        {/* Item info */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{
                            fontSize: 13, fontWeight: 700, color: 'var(--text-1)',
                            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                          }}>
                            {scan.item_name}
                          </div>
                          <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>
                            {scan.category} · {scan.created_at ? timeAgo(scan.created_at) : ''}
                          </div>
                        </div>

                        {/* Mid value */}
                        <div style={{
                          fontSize: 14, fontWeight: 800,
                          color: 'var(--accent-2)', flexShrink: 0,
                          letterSpacing: '-0.02em',
                        }}>
                          ${scan.estimated_value_mid.toLocaleString()}
                        </div>

                        {/* Expand arrow */}
                        <div style={{
                          fontSize: 10, color: 'var(--text-3)', flexShrink: 0,
                          transform: isExpanded ? 'rotate(180deg)' : 'none',
                          transition: 'transform 0.2s',
                        }}>▼</div>
                      </div>

                      {/* Expanded details */}
                      {isExpanded && (
                        <div style={{
                          borderTop: '1px solid var(--border)',
                          padding: '14px 16px',
                          display: 'flex', flexDirection: 'column', gap: 12,
                        }}>
                          {/* Value range */}
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                            {[
                              { label: 'Low', value: scan.estimated_value_low },
                              { label: 'Mid', value: scan.estimated_value_mid, highlight: true },
                              { label: 'High', value: scan.estimated_value_high },
                            ].map(({ label, value, highlight }) => (
                              <div key={label} style={{
                                textAlign: 'center', padding: '10px 6px', borderRadius: 8,
                                background: highlight ? 'var(--accent-glow)' : 'var(--surface-3)',
                                border: `1px solid ${highlight ? 'var(--accent-dim)' : 'var(--border)'}`,
                              }}>
                                <div style={{ fontSize: 9, color: 'var(--text-3)', letterSpacing: '0.08em', marginBottom: 4 }}>
                                  {label.toUpperCase()}
                                </div>
                                <div style={{
                                  fontSize: highlight ? 15 : 13, fontWeight: 700,
                                  color: highlight ? 'var(--accent-2)' : 'var(--text-1)',
                                }}>
                                  ${value.toLocaleString()}
                                </div>
                              </div>
                            ))}
                          </div>

                          {/* Condition + Rarity + Trend */}
                          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                            <span style={{
                              fontSize: 11, padding: '3px 10px', borderRadius: 20,
                              background: 'var(--surface-3)', border: '1px solid var(--border)',
                              color: 'var(--text-2)',
                            }}>
                              {scan.condition}
                            </span>
                            <span style={{
                              fontSize: 11, padding: '3px 10px', borderRadius: 20,
                              background: 'var(--surface-3)', border: '1px solid var(--border)',
                              color: 'var(--accent)',
                            }}>
                              {scan.rarity}
                            </span>
                            <span style={{
                              fontSize: 11, padding: '3px 10px', borderRadius: 20,
                              background: 'var(--surface-3)', border: '1px solid var(--border)',
                              color: t.color,
                            }}>
                              {t.icon} {scan.market_trend}
                            </span>
                            <span style={{
                              fontSize: 11, padding: '3px 10px', borderRadius: 20,
                              background: 'var(--surface-3)', border: '1px solid var(--border)',
                              color: 'var(--text-3)',
                            }}>
                              {scan.confidence_score}% confidence
                            </span>
                          </div>

                          {/* Signal reason */}
                          <div style={{
                            fontSize: 12, color: 'var(--text-2)', lineHeight: 1.6,
                            padding: '10px 12px', borderRadius: 8,
                            background: 'var(--surface-3)',
                            borderLeft: `3px solid ${s.color}`,
                          }}>
                            {scan.signal_reason}
                          </div>

                          {/* Delete button */}
                          <button
                            onClick={() => handleDelete(scan.id!)}
                            disabled={deleting === scan.id}
                            style={{
                              padding: '8px', borderRadius: 8, width: '100%',
                              background: 'none', border: '1px solid var(--border)',
                              color: 'var(--red)', fontSize: 12, cursor: 'pointer',
                              opacity: deleting === scan.id ? 0.5 : 1,
                            }}
                          >
                            {deleting === scan.id ? 'Deleting...' : '🗑 Delete scan'}
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
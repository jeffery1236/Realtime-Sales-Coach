import { useState, useRef } from "react";

const BACKEND_URL = "http://localhost:8001";

// ---------------------------------------------------------------------------
// Reusable card / section components
// ---------------------------------------------------------------------------

function MetricCard({ label, value, color, icon }) {
  return (
    <div style={{
      background: "rgba(15,23,42,0.6)", borderRadius: 12,
      border: `1px solid ${color}25`, padding: "18px 22px",
      display: "flex", flexDirection: "column", gap: 8, flex: 1, minWidth: 150,
    }}>
      <div style={{
        fontSize: 13, fontWeight: 700, color: "#64748b", letterSpacing: "0.08em",
        fontFamily: "'IBM Plex Mono', monospace", textTransform: "uppercase",
      }}>
        {icon && <span style={{ marginRight: 6 }}>{icon}</span>}{label}
      </div>
      <div style={{ fontSize: 22, fontWeight: 700, color, letterSpacing: "-0.01em" }}>
        {value}
      </div>
    </div>
  );
}

function SectionCard({ title, icon, color, children }) {
  return (
    <div style={{
      background: "rgba(15,23,42,0.5)", borderRadius: 14,
      border: "1px solid rgba(51,65,85,0.35)", overflow: "hidden",
    }}>
      <div style={{
        padding: "14px 20px", borderBottom: "1px solid rgba(51,65,85,0.25)",
        display: "flex", alignItems: "center", gap: 10,
      }}>
        {icon && <span style={{ fontSize: 17 }}>{icon}</span>}
        <span style={{
          fontSize: 14, fontWeight: 700, color: color || "#94a3b8",
          letterSpacing: "0.06em", fontFamily: "'IBM Plex Mono', monospace",
        }}>
          {title}
        </span>
      </div>
      <div style={{ padding: "16px 20px" }}>{children}</div>
    </div>
  );
}

function BulletList({ items, color = "#cbd5e1", bulletColor }) {
  if (!items || items.length === 0) return <EmptyState />;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {items.map((item, i) => (
        <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
          <div style={{
            width: 6, height: 6, borderRadius: "50%", flexShrink: 0, marginTop: 7,
            background: bulletColor || color,
          }} />
          <div style={{ fontSize: 16, color, lineHeight: 1.7 }}>{item}</div>
        </div>
      ))}
    </div>
  );
}

function NumberedList({ items, color = "#cbd5e1", accentColor = "#06b6d4" }) {
  if (!items || items.length === 0) return <EmptyState />;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {items.map((item, i) => (
        <div key={i} style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
          <div style={{
            width: 28, height: 28, borderRadius: 8, flexShrink: 0,
            background: `${accentColor}15`, border: `1px solid ${accentColor}30`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 14, fontWeight: 700, color: accentColor,
            fontFamily: "'IBM Plex Mono', monospace",
          }}>
            {i + 1}
          </div>
          <div style={{ fontSize: 16, color, lineHeight: 1.7, paddingTop: 3 }}>{item}</div>
        </div>
      ))}
    </div>
  );
}

function EmptyState() {
  return <div style={{ fontSize: 16, color: "#475569", fontStyle: "italic" }}>No data available</div>;
}

function ScoreGauge({ score, label }) {
  const pct = Math.round(score * 100);
  const color = pct >= 70 ? "#22c55e" : pct >= 40 ? "#f59e0b" : "#ef4444";
  const circumference = 2 * Math.PI * 36;
  const offset = circumference - (pct / 100) * circumference;

  return (
    <div style={{
      background: "rgba(15,23,42,0.6)", borderRadius: 12,
      border: `1px solid ${color}25`, padding: "16px 20px",
      display: "flex", alignItems: "center", gap: 16, flex: 1, minWidth: 180,
    }}>
      <svg width="56" height="56" viewBox="0 0 80 80">
        <circle cx="40" cy="40" r="36" fill="none" stroke="#1e293b" strokeWidth="6" />
        <circle
          cx="40" cy="40" r="36" fill="none" stroke={color} strokeWidth="6"
          strokeDasharray={circumference} strokeDashoffset={offset}
          strokeLinecap="round"
          transform="rotate(-90 40 40)"
          style={{ transition: "stroke-dashoffset 1s ease" }}
        />
        <text x="40" y="44" textAnchor="middle" fill={color} fontSize="18" fontWeight="700"
          fontFamily="'IBM Plex Mono', monospace">
          {pct}%
        </text>
      </svg>
      <div>
        <div style={{
          fontSize: 13, fontWeight: 700, color: "#64748b", letterSpacing: "0.08em",
          fontFamily: "'IBM Plex Mono', monospace", textTransform: "uppercase",
        }}>
          {label}
        </div>
        <div style={{ fontSize: 15, color: "#94a3b8", marginTop: 2 }}>
          {pct >= 70 ? "Strong" : pct >= 40 ? "Needs Work" : "Critical"}
        </div>
      </div>
    </div>
  );
}

function OutcomeBadge({ outcome }) {
  const isSuccess = outcome?.toLowerCase() === "success";
  const color = isSuccess ? "#22c55e" : "#ef4444";
  return (
    <div style={{
      background: "rgba(15,23,42,0.6)", borderRadius: 12,
      border: `1px solid ${color}25`, padding: "16px 20px",
      display: "flex", alignItems: "center", gap: 12, flex: 1, minWidth: 140,
    }}>
      <div style={{
        width: 36, height: 36, borderRadius: 10,
        background: `${color}15`, border: `1px solid ${color}30`,
        display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18,
      }}>
        {isSuccess ? "✅" : "❌"}
      </div>
      <div>
        <div style={{
          fontSize: 13, fontWeight: 700, color: "#64748b", letterSpacing: "0.08em",
          fontFamily: "'IBM Plex Mono', monospace",
        }}>
          OUTCOME
        </div>
        <div style={{
          fontSize: 20, fontWeight: 700, color, letterSpacing: "0.02em", textTransform: "uppercase",
        }}>
          {outcome || "Unknown"}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Dashboard
// ---------------------------------------------------------------------------

export default function PostSalesDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const contentRef = useRef(null);

  const fetchAnalysis = async () => {
    setLoading(true);
    setError(null);
    setData(null);
    try {
      const resp = await fetch(`${BACKEND_URL}/api/postsales_analysis`);
      const json = await resp.json();
      if (json.error) {
        setError(json.error);
      } else {
        setData(json);
      }
    } catch (err) {
      setError(`Backend connection failed: ${err.message}. Is the server running on port 8001?`);
    } finally {
      setLoading(false);
    }
  };

  const rep = data?.rep_insights;
  const prospect = data?.prospect_insights;

  return (
    <div style={{
      width: "100%", height: "100vh", background: "#0a0f1a",
      color: "#e2e8f0", fontFamily: "'DM Sans', 'Segoe UI', system-ui, sans-serif",
      display: "flex", flexDirection: "column", overflow: "hidden",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,wght@0,400;0,500;0,600;0,700&family=IBM+Plex+Mono:wght@400;500;600;700&display=swap');
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes pulse-dot {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(1.4); }
        }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #334155; border-radius: 4px; }
      `}</style>

      {/* --- TOP BAR --- */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "12px 24px", borderBottom: "1px solid rgba(51,65,85,0.4)",
        background: "rgba(15,23,42,0.8)", backdropFilter: "blur(12px)", flexShrink: 0,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8,
            background: "linear-gradient(135deg, #06b6d4, #0891b2)",
            display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16,
          }}>🎯</div>
          <div>
            <span style={{ fontWeight: 700, fontSize: 16, letterSpacing: "-0.01em" }}>SalesCoach</span>
            <span style={{ color: "#06b6d4", fontWeight: 400, marginLeft: 4 }}>AI</span>
          </div>
          <span style={{
            fontSize: 9, fontWeight: 700, letterSpacing: "0.08em",
            color: "#a78bfa", background: "rgba(167,139,250,0.1)",
            padding: "3px 8px", borderRadius: 4, marginLeft: 8,
            fontFamily: "'IBM Plex Mono', monospace",
            border: "1px solid rgba(167,139,250,0.2)",
          }}>
            POST-CALL ANALYSIS
          </span>
        </div>

        <button
          onClick={fetchAnalysis}
          disabled={loading}
          style={{
            padding: "10px 24px", borderRadius: 8, border: "none",
            fontWeight: 600, fontSize: 15, cursor: loading ? "wait" : "pointer",
            fontFamily: "'DM Sans', sans-serif", transition: "all 0.2s ease",
            background: loading ? "rgba(100,116,139,0.2)" : "linear-gradient(135deg, #06b6d4, #0891b2)",
            color: loading ? "#64748b" : "#0f172a",
            display: "flex", alignItems: "center", gap: 8,
          }}
        >
          {loading && (
            <div style={{
              width: 14, height: 14, borderRadius: "50%",
              border: "2px solid #64748b", borderTopColor: "transparent",
              animation: "spin 0.8s linear infinite",
            }} />
          )}
          {loading ? "Analyzing..." : data ? "↻ Re-analyze" : "▶ Generate Analysis"}
        </button>
      </div>

      {/* --- CONTENT --- */}
      <div ref={contentRef} style={{ flex: 1, overflow: "auto", padding: "24px 32px" }}>

        {/* IDLE STATE */}
        {!data && !loading && !error && (
          <div style={{
            display: "flex", flexDirection: "column", alignItems: "center",
            justifyContent: "center", height: "100%", gap: 16, opacity: 0.5,
          }}>
            <div style={{ fontSize: 56 }}>📊</div>
            <div style={{ fontSize: 24, fontWeight: 600, color: "#64748b" }}>Post-Call Analysis</div>
            <div style={{ fontSize: 16, color: "#475569", maxWidth: 420, textAlign: "center", lineHeight: 1.6 }}>
              Click <strong style={{ color: "#06b6d4" }}>Generate Analysis</strong> to run the Airia post-sales analysis pipeline on the last call
            </div>
          </div>
        )}

        {/* LOADING STATE */}
        {loading && (
          <div style={{
            display: "flex", flexDirection: "column", alignItems: "center",
            justifyContent: "center", height: "100%", gap: 20,
          }}>
            <div style={{
              width: 48, height: 48, borderRadius: "50%",
              border: "3px solid #1e293b", borderTopColor: "#06b6d4",
              animation: "spin 1s linear infinite",
            }} />
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 20, fontWeight: 600, color: "#e2e8f0" }}>
                Analyzing call with Airia
              </div>
              <div style={{
                fontSize: 14, color: "#64748b", marginTop: 6,
                fontFamily: "'IBM Plex Mono', monospace",
              }}>
                Mining rep insights, prospect patterns, and playbook recommendations...
              </div>
            </div>
          </div>
        )}

        {/* ERROR STATE */}
        {error && (
          <div style={{
            display: "flex", flexDirection: "column", alignItems: "center",
            justifyContent: "center", height: "100%", gap: 16,
          }}>
            <div style={{ fontSize: 48 }}>⚠️</div>
            <div style={{ fontSize: 20, fontWeight: 600, color: "#ef4444" }}>Analysis Failed</div>
            <div style={{ fontSize: 16, color: "#fca5a5", maxWidth: 440, textAlign: "center", lineHeight: 1.5 }}>
              {error}
            </div>
            <button
              onClick={fetchAnalysis}
              style={{
                marginTop: 8, padding: "8px 20px", borderRadius: 8,
                background: "rgba(6,182,212,0.15)", color: "#06b6d4",
                border: "1px solid rgba(6,182,212,0.3)",
                fontWeight: 600, fontSize: 15, cursor: "pointer",
                fontFamily: "'DM Sans', sans-serif",
              }}
            >
              Try Again
            </button>
          </div>
        )}

        {/* RESULTS */}
        {data && !loading && (
          <div style={{ animation: "fadeInUp 0.5s ease", maxWidth: 1200, margin: "0 auto" }}>

            {/* --- Metrics Row --- */}
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 24 }}>
              <OutcomeBadge outcome={data.call_outcome} />
              <ScoreGauge
                score={data.nudge_effectiveness_score ?? 0}
                label="Nudge Effectiveness"
              />
              <MetricCard label="Call ID" value={data.call_id || "—"} color="#94a3b8" icon="📞" />
              <MetricCard label="Rep" value={data.rep_id || "—"} color="#06b6d4" icon="🧑" />
              <MetricCard label="Prospect" value={data.prospect_id || "—"} color="#f59e0b" icon="🏢" />
            </div>

            {/* --- Call Summary --- */}
            <SectionCard title="CALL SUMMARY" icon="📋" color="#94a3b8">
              <div style={{ fontSize: 17, color: "#cbd5e1", lineHeight: 1.7 }}>
                {data.call_summary || "No summary available."}
              </div>
            </SectionCard>

            {/* --- Two-column: Rep + Prospect --- */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 16 }}>

              {/* LEFT: Rep Insights */}
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <SectionCard title="STRENGTHS" icon="💪" color="#22c55e">
                  <BulletList items={rep?.strengths} color="#86efac" bulletColor="#22c55e" />
                </SectionCard>

                <SectionCard title="IMPROVEMENT AREAS" icon="📈" color="#f59e0b">
                  <BulletList items={rep?.improvement_areas} color="#fcd34d" bulletColor="#f59e0b" />
                </SectionCard>

                <SectionCard title="BEHAVIORAL PATTERNS" icon="🔄" color="#3b82f6">
                  <BulletList items={rep?.patterns} color="#93c5fd" bulletColor="#3b82f6" />
                </SectionCard>

                {rep?.nudge_compliance_rate !== undefined && (
                  <SectionCard title="NUDGE COMPLIANCE" icon="📊" color="#06b6d4">
                    <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                      <ScoreGauge score={rep.nudge_compliance_rate} label="Compliance Rate" />
                    </div>
                  </SectionCard>
                )}
              </div>

              {/* RIGHT: Prospect Insights */}
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <SectionCard title="COMMUNICATION STYLE" icon="💬" color="#a78bfa">
                  <div style={{ fontSize: 16, color: "#c4b5fd", lineHeight: 1.7 }}>
                    {prospect?.communication_style || "No data available."}
                  </div>
                </SectionCard>

                <SectionCard title="KNOWN OBJECTIONS" icon="🚫" color="#ef4444">
                  <BulletList items={prospect?.known_objections} color="#fca5a5" bulletColor="#ef4444" />
                </SectionCard>

                <SectionCard title="WHAT WORKS" icon="✅" color="#22c55e">
                  <BulletList items={prospect?.what_works} color="#86efac" bulletColor="#22c55e" />
                </SectionCard>

                <SectionCard title="WHAT DOESN'T WORK" icon="⛔" color="#f59e0b">
                  <BulletList items={prospect?.what_doesnt_work} color="#fcd34d" bulletColor="#f59e0b" />
                </SectionCard>

                <SectionCard title="BUYING SIGNALS OBSERVED" icon="🟢" color="#06b6d4">
                  <BulletList items={prospect?.buying_signals_observed} color="#67e8f9" bulletColor="#06b6d4" />
                </SectionCard>
              </div>
            </div>

            {/* --- Playbook Recommendations --- */}
            <div style={{ marginTop: 16, marginBottom: 40 }}>
              <SectionCard title="RECOMMENDED PLAYBOOK UPDATES" icon="📘" color="#a78bfa">
                <NumberedList
                  items={data.recommended_playbook_updates}
                  color="#cbd5e1"
                  accentColor="#a78bfa"
                />
              </SectionCard>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

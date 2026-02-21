import { useState, useEffect, useRef, useCallback } from "react";

const BACKEND_URL = "http://localhost:8001";

const PARTICIPANTS = {
  rep: { name: "Alex Chen", role: "Account Executive" },
  prospect: { name: "Sarah Miller", role: "VP Engineering, Acme Corp" },
};

const REP_CONTEXT_LINE = {
  speaker: "rep",
  text: "Our platform starts at $18,000 annually, which includes full onboarding and support.",
  emotion: "Confident",
};

const EVENT_COLORS = {
  PRICE_OBJECTION: { bg: "rgba(239,68,68,0.15)", border: "#ef4444", text: "#fca5a5" },
  COMPETITOR_MENTIONED: { bg: "rgba(245,158,11,0.15)", border: "#f59e0b", text: "#fcd34d" },
  PROSPECT_FRUSTRATED: { bg: "rgba(239,68,68,0.15)", border: "#ef4444", text: "#fca5a5" },
  PROSPECT_CONFUSED: { bg: "rgba(239,68,68,0.15)", border: "#ef4444", text: "#fca5a5" },
  PRICE_STATED: { bg: "rgba(100,116,139,0.15)", border: "#64748b", text: "#94a3b8" },
  BUYING_SIGNAL: { bg: "rgba(34,197,94,0.15)", border: "#22c55e", text: "#86efac" },
  BUDGET_REVEALED: { bg: "rgba(34,197,94,0.15)", border: "#22c55e", text: "#86efac" },
  REP_FOLLOWED_NUDGE: { bg: "rgba(34,197,94,0.15)", border: "#22c55e", text: "#86efac" },
  DE_ESCALATION_SUCCESSFUL: { bg: "rgba(34,197,94,0.15)", border: "#22c55e", text: "#86efac" },
  VAGUE_OBJECTION_UNCLARIFIED: { bg: "rgba(245,158,11,0.15)", border: "#f59e0b", text: "#fcd34d" },
  REP_TALKING_TOO_MUCH: { bg: "rgba(245,158,11,0.15)", border: "#f59e0b", text: "#fcd34d" },
  REP_INTERRUPTED: { bg: "rgba(245,158,11,0.15)", border: "#f59e0b", text: "#fcd34d" },
};

const EMOTION_ICONS = {
  Confident: "😎", Neutral: "😐", Frustrated: "😤", Calm: "😌",
  Confused: "😕", Agitated: "😤", Uncertain: "😕",
};

const PHASE_CONFIG = {
  intro: { label: "INTRO", color: "#64748b" },
  pitch: { label: "PITCH", color: "#64748b" },
  qa: { label: "Q&A", color: "#3b82f6" },
  objection: { label: "OBJECTION", color: "#f59e0b" },
  negotiation: { label: "NEGOTIATION", color: "#22c55e" },
  close: { label: "CLOSE", color: "#06b6d4" },
  opening: { label: "OPENING", color: "#64748b" },
  discovery: { label: "DISCOVERY", color: "#3b82f6" },
};

// ---------------------------------------------------------------------------
// Visual Components (same look as mock_demo_ui.jsx)
// ---------------------------------------------------------------------------

function Waveform({ active, color = "#06b6d4" }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 2, height: 40 }}>
      {Array.from({ length: 32 }).map((_, i) => (
        <div
          key={i}
          style={{
            width: 3,
            borderRadius: 2,
            backgroundColor: color,
            opacity: active ? 0.7 : 0.15,
            height: active ? `${12 + Math.sin(i * 0.7) * 14 + Math.random() * 16}px` : "4px",
            transition: `height ${0.15 + Math.random() * 0.1}s ease`,
          }}
        />
      ))}
    </div>
  );
}

function ParticipantCard({ name, role, emotion, isSpeaking, isProspect }) {
  const initials = name.split(" ").map((n) => n[0]).join("");
  const ringColor = isProspect ? "#f59e0b" : "#06b6d4";

  return (
    <div
      style={{
        flex: 1, display: "flex", flexDirection: "column", alignItems: "center",
        gap: 16, padding: "32px 20px",
        background: isSpeaking ? `radial-gradient(ellipse at center, ${ringColor}08 0%, transparent 70%)` : "transparent",
        borderRadius: 16, transition: "all 0.5s ease", position: "relative",
      }}
    >
      <div
        style={{
          width: 96, height: 96, borderRadius: "50%",
          background: isProspect ? "linear-gradient(135deg, #f59e0b, #d97706)" : "linear-gradient(135deg, #06b6d4, #0891b2)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 32, fontWeight: 700, color: "#0f172a",
          boxShadow: isSpeaking ? `0 0 0 3px ${ringColor}40, 0 0 30px ${ringColor}20` : "0 0 0 3px transparent",
          transition: "box-shadow 0.4s ease", position: "relative",
        }}
      >
        {initials}
        {emotion && (
          <span style={{ position: "absolute", bottom: -4, right: -4, fontSize: 22, filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.5))" }}>
            {EMOTION_ICONS[emotion] || "😐"}
          </span>
        )}
      </div>
      <div style={{ textAlign: "center" }}>
        <div style={{ color: "#e2e8f0", fontSize: 15, fontWeight: 600 }}>{name}</div>
        <div style={{ color: "#64748b", fontSize: 12, marginTop: 2, fontFamily: "'IBM Plex Mono', monospace" }}>{role}</div>
      </div>
      <Waveform active={isSpeaking} color={ringColor} />
      {isSpeaking && (
        <div style={{
          position: "absolute", top: 12, right: 12,
          display: "flex", alignItems: "center", gap: 6,
          background: "rgba(6,182,212,0.15)", padding: "4px 10px",
          borderRadius: 20, border: "1px solid rgba(6,182,212,0.3)",
        }}>
          <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#06b6d4", animation: "pulse-dot 1.5s ease-in-out infinite" }} />
          <span style={{ fontSize: 10, color: "#06b6d4", fontFamily: "'IBM Plex Mono', monospace", fontWeight: 600 }}>SPEAKING</span>
        </div>
      )}
    </div>
  );
}

function ActiveNudge({ event }) {
  if (!event) return null;

  const phaseConfig = PHASE_CONFIG[event.phase] || PHASE_CONFIG.opening;
  const hasNudge = event.coaching_needed && event.nudge;
  const isPositive = (event.events_detected || []).some(e =>
    ["REP_FOLLOWED_NUDGE", "DE_ESCALATION_SUCCESSFUL", "BUYING_SIGNAL", "BUDGET_REVEALED"].includes(e)
  );
  const isWarning = (event.events_detected || []).some(e =>
    ["PROSPECT_FRUSTRATED", "PRICE_OBJECTION"].includes(e)
  );
  const accentColor = isPositive ? "#22c55e" : isWarning ? "#f59e0b" : "#06b6d4";

  return (
    <div style={{ padding: 20, animation: "heroSlideIn 0.45s cubic-bezier(0.16, 1, 0.3, 1)", position: "relative" }}>
      <div style={{
        position: "absolute", top: 0, left: 20, right: 20, height: 2,
        background: `linear-gradient(90deg, transparent, ${accentColor}, transparent)`,
        borderRadius: 2,
      }} />

      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
        <span style={{
          fontSize: 12, fontWeight: 700, letterSpacing: "0.1em",
          color: phaseConfig.color, background: `${phaseConfig.color}18`,
          padding: "4px 10px", borderRadius: 4,
          fontFamily: "'IBM Plex Mono', monospace",
        }}>
          {phaseConfig.label}
        </span>
        {event.priority_event && (
          <span style={{
            fontSize: 12, fontWeight: 700, letterSpacing: "0.08em",
            color: isWarning ? "#ef4444" : "#22c55e",
            fontFamily: "'IBM Plex Mono', monospace",
          }}>
            ⚡ {event.priority_event.replace(/_/g, " ")}
          </span>
        )}
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: hasNudge ? 16 : 8 }}>
        {(event.events_detected || []).map((evt) => {
          const colors = EVENT_COLORS[evt] || EVENT_COLORS.PRICE_STATED;
          return (
            <span key={evt} style={{
              fontSize: 12, fontWeight: 600, color: colors.text,
              background: colors.bg, border: `1px solid ${colors.border}30`,
              padding: "4px 10px", borderRadius: 6,
              fontFamily: "'IBM Plex Mono', monospace", letterSpacing: "0.03em",
            }}>
              {evt.replace(/_/g, " ")}
            </span>
          );
        })}
      </div>

      {hasNudge && (
        <div style={{
          background: `linear-gradient(135deg, ${accentColor}0A 0%, rgba(15,23,42,0.95) 100%)`,
          borderRadius: 12, padding: 16,
          borderLeft: `3px solid ${accentColor}`,
          boxShadow: `0 0 24px ${accentColor}08`,
        }}>
          <div style={{
            fontSize: 12, fontWeight: 700, color: accentColor,
            letterSpacing: "0.08em", marginBottom: 8,
            fontFamily: "'IBM Plex Mono', monospace",
            display: "flex", alignItems: "center", gap: 6,
          }}>
            <span style={{ fontSize: 14 }}>💡</span> SAY THIS
          </div>
          <div style={{ fontSize: 14, color: "#f1f5f9", lineHeight: 1.6, fontWeight: 500, letterSpacing: "0.01em" }}>
            {event.nudge}
          </div>
        </div>
      )}

      {!hasNudge && event.note && (
        <div style={{
          display: "flex", alignItems: "flex-start", gap: 8,
          background: isPositive ? "rgba(34,197,94,0.06)" : "rgba(100,116,139,0.06)",
          padding: "10px 14px", borderRadius: 10,
          border: `1px solid ${isPositive ? "rgba(34,197,94,0.15)" : "rgba(100,116,139,0.15)"}`,
        }}>
          <span style={{ fontSize: 14, flexShrink: 0, marginTop: 1 }}>{isPositive ? "✅" : "👀"}</span>
          <div style={{ fontSize: 13, color: isPositive ? "#86efac" : "#94a3b8", lineHeight: 1.5 }}>{event.note}</div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Pipeline Status (shows real-time processing steps to judges)
// ---------------------------------------------------------------------------

const PIPELINE_STAGES = [
  { key: "transcribing", label: "Transcribing audio with Modulate AI", icon: "🎤" },
  { key: "coaching", label: "Generating coaching with Airia", icon: "🧠" },
];

function PipelineStatus({ status }) {
  const currentIdx = PIPELINE_STAGES.findIndex((s) => s.key === status);

  return (
    <div style={{ padding: "24px 20px", animation: "fadeInUp 0.3s ease" }}>
      <div style={{
        fontSize: 9, fontWeight: 700, color: "#06b6d4", letterSpacing: "0.1em",
        fontFamily: "'IBM Plex Mono', monospace", marginBottom: 20,
        display: "flex", alignItems: "center", gap: 6,
      }}>
        <div style={{
          width: 6, height: 6, borderRadius: "50%", background: "#06b6d4",
          animation: "pulse-dot 1.2s ease-in-out infinite",
        }} />
        PROCESSING LIVE
      </div>

      {PIPELINE_STAGES.map((stage, i) => {
        const isActive = stage.key === status;
        const isDone = i < currentIdx;

        return (
          <div
            key={stage.key}
            style={{
              display: "flex", alignItems: "center", gap: 12,
              padding: "10px 14px", marginBottom: 8, borderRadius: 10,
              background: isActive ? "rgba(6,182,212,0.06)" : "transparent",
              border: isActive ? "1px solid rgba(6,182,212,0.15)" : "1px solid transparent",
              opacity: isActive ? 1 : isDone ? 0.5 : 0.25,
              transition: "all 0.4s ease",
            }}
          >
            <span style={{ fontSize: 18, flexShrink: 0 }}>
              {isDone ? "✅" : stage.icon}
            </span>
            <div style={{ flex: 1 }}>
              <div style={{
                fontSize: 13, fontWeight: 600,
                color: isActive ? "#e2e8f0" : isDone ? "#94a3b8" : "#475569",
              }}>
                {stage.label}
              </div>
              {isActive && (
                <div style={{
                  fontSize: 11, color: "#06b6d4", marginTop: 4,
                  fontFamily: "'IBM Plex Mono', monospace",
                }}>
                  Processing...
                </div>
              )}
            </div>
            {isActive && (
              <div style={{
                width: 16, height: 16, borderRadius: "50%",
                border: "2px solid #06b6d4", borderTopColor: "transparent",
                animation: "spin 0.8s linear infinite",
              }} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export default function LiveDemoUI() {
  const [phase, setPhase] = useState("idle"); // idle | running | complete | error
  const [pipelineStatus, setPipelineStatus] = useState(null);
  const [elapsed, setElapsed] = useState(0);
  const [transcripts, setTranscripts] = useState([]);
  const [coaching, setCoaching] = useState(null);
  const [currentSpeaker, setCurrentSpeaker] = useState(null);
  const [prospectEmotion, setProspectEmotion] = useState("Neutral");
  const [repEmotion] = useState("Confident");
  const [error, setError] = useState(null);
  const transcriptRef = useRef(null);
  const timersRef = useRef([]);
  const intervalRef = useRef(null);
  const [waveKey, setWaveKey] = useState(0);

  useEffect(() => {
    if (phase !== "running" && phase !== "complete") return;
    const id = setInterval(() => setWaveKey((k) => k + 1), 200);
    return () => clearInterval(id);
  }, [phase]);

  useEffect(() => {
    if (phase !== "running" && phase !== "complete") return;
    intervalRef.current = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(intervalRef.current);
  }, [phase]);

  const formatTime = (s) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
  };

  useEffect(() => {
    if (transcriptRef.current) transcriptRef.current.scrollTop = transcriptRef.current.scrollHeight;
  }, [transcripts]);

  const startDemo = useCallback(async () => {
    setPhase("running");
    setTranscripts([]);
    setCoaching(null);
    setError(null);
    setElapsed(0);
    setCurrentSpeaker(null);
    setProspectEmotion("Neutral");
    setPipelineStatus("transcribing");
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];

    const demoStartTime = Date.now();

    // 1.5s: show rep's context line
    const t1 = setTimeout(() => {
      setTranscripts([REP_CONTEXT_LINE]);
      setCurrentSpeaker("rep");
    }, 1500);
    timersRef.current.push(t1);

    // 3.5s: switch to prospect speaking
    const t2 = setTimeout(() => {
      setCurrentSpeaker("prospect");
    }, 3500);
    timersRef.current.push(t2);

    try {
      const resp = await fetch(`${BACKEND_URL}/api/demo`);
      const data = await resp.json();

      if (data.error) {
        setError(data.error);
        setPhase("error");
        return;
      }

      // Ensure at least 5s have passed so context lines are visible
      const elapsed = Date.now() - demoStartTime;
      const minWait = Math.max(0, 5000 - elapsed);

      const t3 = setTimeout(() => {
        // Show real transcripts from Modulate
        setPipelineStatus("coaching");
        setCurrentSpeaker(null);

        const realTranscripts = (data.transcripts || []).map((u) => ({
          speaker: u.speaker === 0 ? "rep" : "prospect",
          text: u.text,
          emotion: u.emotion || "Neutral",
        }));

        setTranscripts((prev) => [...prev, ...realTranscripts]);

        const lastProspect = realTranscripts.filter((t) => t.speaker === "prospect").pop();
        if (lastProspect) setProspectEmotion(lastProspect.emotion);

        // Show coaching nudge after a pause
        const t4 = setTimeout(() => {
          setCoaching(data.coaching);
          setPipelineStatus("complete");
          setPhase("complete");
        }, 1500);
        timersRef.current.push(t4);
      }, minWait);
      timersRef.current.push(t3);
    } catch (err) {
      setError(`Backend connection failed: ${err.message}. Is the server running on port 8001?`);
      setPhase("error");
    }
  }, []);

  const stopDemo = () => {
    setPhase("idle");
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
    clearInterval(intervalRef.current);
    setCurrentSpeaker(null);
    setPipelineStatus(null);
  };

  const isActive = phase === "running" || phase === "complete";

  return (
    <div
      style={{
        width: "100%", height: "100vh", background: "#0a0f1a",
        color: "#e2e8f0", fontFamily: "'DM Sans', 'Segoe UI', system-ui, sans-serif",
        display: "flex", flexDirection: "column", overflow: "hidden",
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,wght@0,400;0,500;0,600;0,700&family=IBM+Plex+Mono:wght@400;500;600;700&display=swap');
        @keyframes heroSlideIn {
          from { opacity: 0; transform: translateY(12px) scale(0.98); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes pulse-dot {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(1.4); }
        }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 4px; }
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
            color: "#22c55e", background: "rgba(34,197,94,0.1)",
            padding: "3px 8px", borderRadius: 4, marginLeft: 8,
            fontFamily: "'IBM Plex Mono', monospace",
            border: "1px solid rgba(34,197,94,0.2)",
          }}>
            LIVE MODE
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          {isActive && (
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#ef4444", animation: "pulse-dot 1.2s ease-in-out infinite" }} />
              <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 13, fontWeight: 600, color: "#ef4444", letterSpacing: "0.05em" }}>LIVE</span>
              <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 14, color: "#94a3b8", fontWeight: 500, marginLeft: 4, fontVariantNumeric: "tabular-nums" }}>
                {formatTime(elapsed)}
              </span>
            </div>
          )}
          <button
            onClick={isActive ? stopDemo : startDemo}
            style={{
              padding: "8px 20px", borderRadius: 8, border: "none",
              fontWeight: 600, fontSize: 13, cursor: "pointer",
              fontFamily: "'DM Sans', sans-serif", transition: "all 0.2s ease",
              ...(isActive
                ? { background: "rgba(239,68,68,0.15)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.3)" }
                : { background: "linear-gradient(135deg, #06b6d4, #0891b2)", color: "#0f172a" }),
            }}
          >
            {isActive ? "⏹ End Call" : "▶ Start Demo Call"}
          </button>
        </div>
      </div>

      {/* --- MAIN CONTENT --- */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        {/* LEFT: Call Area */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", borderRight: "1px solid rgba(51,65,85,0.3)" }}>
          {/* Video Area */}
          <div style={{
            flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
            gap: 24, padding: 24, position: "relative", minHeight: 0,
            background: "radial-gradient(ellipse at 30% 50%, rgba(6,182,212,0.03) 0%, transparent 60%)",
          }}>
            {phase === "idle" && (
              <div style={{
                position: "absolute", inset: 0, display: "flex", flexDirection: "column",
                alignItems: "center", justifyContent: "center", gap: 16, zIndex: 10,
              }}>
                <div style={{ fontSize: 48, opacity: 0.4 }}>🎯</div>
                <div style={{ fontSize: 20, fontWeight: 600, color: "#64748b" }}>Ready to Coach</div>
                <div style={{ fontSize: 13, color: "#475569", maxWidth: 360, textAlign: "center", lineHeight: 1.5 }}>
                  Click <strong style={{ color: "#06b6d4" }}>Start Demo Call</strong> to process a real audio clip through Modulate AI + Airia coaching pipeline
                </div>
              </div>
            )}

            {phase === "error" && (
              <div style={{
                position: "absolute", inset: 0, display: "flex", flexDirection: "column",
                alignItems: "center", justifyContent: "center", gap: 16, zIndex: 10,
              }}>
                <div style={{ fontSize: 48 }}>⚠️</div>
                <div style={{ fontSize: 16, fontWeight: 600, color: "#ef4444" }}>Error</div>
                <div style={{ fontSize: 13, color: "#fca5a5", maxWidth: 400, textAlign: "center", lineHeight: 1.5 }}>
                  {error}
                </div>
                <button
                  onClick={() => { setPhase("idle"); setError(null); }}
                  style={{
                    marginTop: 8, padding: "8px 20px", borderRadius: 8,
                    background: "rgba(6,182,212,0.15)", color: "#06b6d4",
                    border: "1px solid rgba(6,182,212,0.3)",
                    fontWeight: 600, fontSize: 13, cursor: "pointer",
                    fontFamily: "'DM Sans', sans-serif",
                  }}
                >
                  Try Again
                </button>
              </div>
            )}

            {isActive && (
              <>
                <ParticipantCard
                  name={PARTICIPANTS.rep.name} role={PARTICIPANTS.rep.role}
                  emotion={repEmotion} isSpeaking={currentSpeaker === "rep"}
                  isProspect={false} key={`rep-${waveKey}`}
                />
                <div style={{ width: 1, height: "60%", background: "linear-gradient(to bottom, transparent, #334155, transparent)" }} />
                <ParticipantCard
                  name={PARTICIPANTS.prospect.name} role={PARTICIPANTS.prospect.role}
                  emotion={prospectEmotion} isSpeaking={currentSpeaker === "prospect"}
                  isProspect={true} key={`prospect-${waveKey}`}
                />
              </>
            )}
          </div>

          {/* Transcript */}
          <div style={{ height: 200, borderTop: "1px solid rgba(51,65,85,0.3)", display: "flex", flexDirection: "column", flexShrink: 0 }}>
            <div style={{ padding: "10px 20px", display: "flex", alignItems: "center", gap: 8, borderBottom: "1px solid rgba(51,65,85,0.2)" }}>
              <span style={{ fontSize: 14, color: "#64748b", fontWeight: 600, fontFamily: "'IBM Plex Mono', monospace", letterSpacing: "0.08em" }}>
                📝 LIVE TRANSCRIPT
              </span>
              {transcripts.length > 0 && (
                <span style={{ fontSize: 14, color: "#475569", fontFamily: "'IBM Plex Mono', monospace" }}>({transcripts.length})</span>
              )}
            </div>
            <div ref={transcriptRef} style={{ flex: 1, overflow: "auto", padding: "12px 20px", display: "flex", flexDirection: "column", gap: 8 }}>
              {transcripts.length === 0 && isActive && (
                <div style={{ fontSize: 13, color: "#475569", fontStyle: "italic" }}>Listening...</div>
              )}
              {transcripts.map((t, i) => (
                <div key={i} style={{ display: "flex", gap: 10, animation: "fadeInUp 0.3s ease" }}>
                  <span style={{
                    fontSize: 13, fontWeight: 700, color: t.speaker === "rep" ? "#06b6d4" : "#f59e0b",
                    fontFamily: "'IBM Plex Mono', monospace", minWidth: 70, flexShrink: 0, paddingTop: 2,
                  }}>
                    {t.speaker === "rep" ? "REP" : "PROSPECT"}
                  </span>
                  <span style={{ fontSize: 16, color: "#cbd5e1", lineHeight: 1.5 }}>{t.text}</span>
                  <span style={{ fontSize: 13, color: "#475569", fontFamily: "'IBM Plex Mono', monospace", flexShrink: 0, paddingTop: 2 }}>
                    {t.emotion}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT: Coaching Panel */}
        <div style={{
          width: 380, display: "flex", flexDirection: "column",
          background: "rgba(15,23,42,0.5)", flexShrink: 0,
        }}>
          <div style={{
            padding: "14px 20px", borderBottom: "1px solid rgba(51,65,85,0.3)",
            display: "flex", alignItems: "center", justifyContent: "space-between",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 16 }}>🧠</span>
              <span style={{ fontSize: 16, fontWeight: 700, color: "#94a3b8", letterSpacing: "0.08em", fontFamily: "'IBM Plex Mono', monospace" }}>
                COACHING
              </span>
            </div>
          </div>

          <div style={{ flex: 1, overflow: "auto" }}>
            {coaching ? (
              <ActiveNudge event={coaching} />
            ) : pipelineStatus && pipelineStatus !== "complete" ? (
              <PipelineStatus status={pipelineStatus} />
            ) : (
              <div style={{
                padding: 40, display: "flex", flexDirection: "column",
                alignItems: "center", justifyContent: "center", gap: 12, opacity: 0.35,
              }}>
                <span style={{ fontSize: 36 }}>🧠</span>
                <span style={{ fontSize: 12, color: "#64748b", textAlign: "center", lineHeight: 1.5 }}>
                  {isActive ? "Analyzing conversation…" : "Coaching events will appear here"}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

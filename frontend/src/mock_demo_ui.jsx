import { useState, useEffect, useRef, useCallback } from "react";

// --- Demo Data ---
const DEMO_SCENARIO = {
  participants: {
    rep: { name: "Alex Chen", role: "Account Executive" },
    prospect: { name: "Sarah Miller", role: "VP Engineering, Acme Corp" },
  },
  timeline: [
    {
      delay: 1500,
      type: "transcript",
      speaker: "rep",
      text: "Thanks for hopping on, Sarah. I wanted to walk you through how our platform handles process intelligence at scale.",
      emotion: "Confident",
    },
    {
      delay: 4500,
      type: "transcript",
      speaker: "prospect",
      text: "Sure, we've been evaluating a few tools. What's pricing look like?",
      emotion: "Neutral",
    },
    {
      delay: 7000,
      type: "transcript",
      speaker: "rep",
      text: "Great question. Our platform starts at $18,000 annually for teams your size.",
      emotion: "Confident",
    },
    {
      delay: 9000,
      type: "coaching",
      event: {
        phase: "objection",
        events_detected: ["PRICE_STATED"],
        coaching_needed: false,
        priority_event: null,
        nudge: null,
        note: "Price anchored. Watch for prospect reaction.",
      },
    },
    {
      delay: 11000,
      type: "transcript",
      speaker: "prospect",
      text: "We're actually already in talks with Salesforce on this. And even setting that aside, the number you quoted is just... too much. We're a 200-person company, not an enterprise.",
      emotion: "Frustrated",
    },
    {
      delay: 13500,
      type: "emotion_shift",
      speaker: "prospect",
      from: "Neutral",
      to: "Frustrated",
    },
    {
      delay: 14500,
      type: "coaching",
      event: {
        phase: "objection",
        events_detected: [
          "PRICE_OBJECTION",
          "COMPETITOR_MENTIONED",
          "PROSPECT_FRUSTRATED",
        ],
        coaching_needed: true,
        priority_event: "PROSPECT_FRUSTRATED",
        nudge:
          "Acknowledge their frustration first — don't defend the price yet. Say: \"I hear you — $18K feels out of reach for a 200-person org, and I appreciate you being direct. Let me ask: what budget would make sense for your team, and what specific outcomes are you hoping to achieve?\"",
        knowledge_base_used: false,
      },
    },
    {
      delay: 22000,
      type: "transcript",
      speaker: "rep",
      text: "I hear you, Sarah — $18K feels like a lot for a 200-person org, and I appreciate you being direct about that. What budget range would make sense, and what outcomes matter most to your team?",
      emotion: "Calm",
    },
    {
      delay: 25000,
      type: "coaching",
      event: {
        phase: "discovery",
        events_detected: ["REP_FOLLOWED_NUDGE", "DE_ESCALATION_SUCCESSFUL"],
        coaching_needed: false,
        priority_event: "DE_ESCALATION_SUCCESSFUL",
        nudge: null,
        note: "Good recovery. Prospect tone is softening — stay in discovery mode.",
      },
    },
    {
      delay: 27000,
      type: "transcript",
      speaker: "prospect",
      text: "Well... honestly, if we could keep it under $12K and see clear ROI within 90 days, that would get my CFO on board.",
      emotion: "Calm",
    },
    {
      delay: 29500,
      type: "coaching",
      event: {
        phase: "negotiation",
        events_detected: ["BUDGET_REVEALED", "BUYING_SIGNAL"],
        coaching_needed: true,
        priority_event: "BUYING_SIGNAL",
        nudge:
          "She just revealed her budget AND a decision path. Don't counter-offer yet — anchor on outcomes first. Say: \"90-day ROI is exactly what we optimize for. Let me show you a case study from a 180-person team that hit 3x ROI in 60 days — then we can talk numbers that work.\"",
      },
    },
  ],
};

const EVENT_COLORS = {
  PRICE_OBJECTION: { bg: "rgba(239,68,68,0.15)", border: "#ef4444", text: "#fca5a5" },
  COMPETITOR_MENTIONED: { bg: "rgba(245,158,11,0.15)", border: "#f59e0b", text: "#fcd34d" },
  PROSPECT_FRUSTRATED: { bg: "rgba(239,68,68,0.15)", border: "#ef4444", text: "#fca5a5" },
  PRICE_STATED: { bg: "rgba(100,116,139,0.15)", border: "#64748b", text: "#94a3b8" },
  BUYING_SIGNAL: { bg: "rgba(34,197,94,0.15)", border: "#22c55e", text: "#86efac" },
  BUDGET_REVEALED: { bg: "rgba(34,197,94,0.15)", border: "#22c55e", text: "#86efac" },
  REP_FOLLOWED_NUDGE: { bg: "rgba(34,197,94,0.15)", border: "#22c55e", text: "#86efac" },
  DE_ESCALATION_SUCCESSFUL: { bg: "rgba(34,197,94,0.15)", border: "#22c55e", text: "#86efac" },
};

const EMOTION_ICONS = { Confident: "😎", Neutral: "😐", Frustrated: "😤", Calm: "😌" };

const PHASE_CONFIG = {
  opening: { label: "OPENING", color: "#64748b" },
  objection: { label: "OBJECTION", color: "#f59e0b" },
  discovery: { label: "DISCOVERY", color: "#3b82f6" },
  negotiation: { label: "NEGOTIATION", color: "#22c55e" },
};

// --- Waveform ---
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

// --- Participant Card ---
function ParticipantCard({ name, role, emotion, isSpeaking, isProspect }) {
  const initials = name.split(" ").map((n) => n[0]).join("");
  const ringColor = isProspect ? "#f59e0b" : "#06b6d4";

  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 16,
        padding: "32px 20px",
        background: isSpeaking ? `radial-gradient(ellipse at center, ${ringColor}08 0%, transparent 70%)` : "transparent",
        borderRadius: 16,
        transition: "all 0.5s ease",
        position: "relative",
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

// --- Active Nudge (Hero Zone) ---
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
    <div
      style={{
        padding: 24,
        animation: "heroSlideIn 0.45s cubic-bezier(0.16, 1, 0.3, 1)",
        position: "relative",
      }}
    >
      {/* Top accent bar */}
      <div style={{
        position: "absolute", top: 0, left: 20, right: 20, height: 2,
        background: `linear-gradient(90deg, transparent, ${accentColor}, transparent)`,
        borderRadius: 2,
      }} />

      {/* Phase + Priority */}
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

      {/* Event Tags */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: hasNudge ? 16 : 8 }}>
        {(event.events_detected || []).map((evt) => {
          const colors = EVENT_COLORS[evt] || EVENT_COLORS.PRICE_STATED;
          return (
            <span key={evt} style={{
              fontSize: 14, fontWeight: 600, color: colors.text,
              background: colors.bg, border: `1px solid ${colors.border}30`,
              padding: "4px 10px", borderRadius: 6,
              fontFamily: "'IBM Plex Mono', monospace", letterSpacing: "0.03em",
            }}>
              {evt.replace(/_/g, " ")}
            </span>
          );
        })}
      </div>

      {/* Nudge Content - the big focus area */}
      {hasNudge && (
        <div style={{
          background: `linear-gradient(135deg, ${accentColor}0A 0%, rgba(15,23,42,0.95) 100%)`,
          borderRadius: 12, padding: 16,
          borderLeft: `3px solid ${accentColor}`,
          boxShadow: `0 0 24px ${accentColor}08`,
        }}>
          <div style={{
            fontSize: 14, fontWeight: 700, color: accentColor,
            letterSpacing: "0.08em", marginBottom: 8,
            fontFamily: "'IBM Plex Mono', monospace",
            display: "flex", alignItems: "center", gap: 6,
          }}>
            <span style={{ fontSize: 20 }}>💡</span> SAY THIS
          </div>
          <div style={{
            fontSize: 16, color: "#f1f5f9", lineHeight: 1.6,
            fontWeight: 500, letterSpacing: "0.01em",
          }}>
            {event.nudge}
          </div>
        </div>
      )}

      {/* Status note for non-nudge events */}
      {!hasNudge && event.note && (
        <div style={{
          display: "flex", alignItems: "flex-start", gap: 8,
          background: isPositive ? "rgba(34,197,94,0.06)" : "rgba(100,116,139,0.06)",
          padding: "10px 14px", borderRadius: 10,
          border: `1px solid ${isPositive ? "rgba(34,197,94,0.15)" : "rgba(100,116,139,0.15)"}`,
        }}>
          <span style={{ fontSize: 14, flexShrink: 0, marginTop: 1 }}>
            {isPositive ? "✅" : "👀"}
          </span>
          <div style={{ fontSize: 14, color: isPositive ? "#86efac" : "#94a3b8", lineHeight: 1.5 }}>
            {event.note}
          </div>
        </div>
      )}
    </div>
  );
}

// --- History Item (collapsed, dimmed) ---
function HistoryItem({ event, index }) {
  const phaseConfig = PHASE_CONFIG[event.phase] || PHASE_CONFIG.opening;
  const isPositive = (event.events_detected || []).some(e =>
    ["REP_FOLLOWED_NUDGE", "DE_ESCALATION_SUCCESSFUL", "BUYING_SIGNAL", "BUDGET_REVEALED"].includes(e)
  );

  return (
    <div style={{
      padding: "8px 14px",
      display: "flex", alignItems: "center", gap: 10,
      opacity: 0.45,
      transition: "opacity 0.3s ease",
      borderBottom: "1px solid rgba(51,65,85,0.15)",
    }}
    onMouseEnter={(e) => e.currentTarget.style.opacity = "0.75"}
    onMouseLeave={(e) => e.currentTarget.style.opacity = "0.45"}
    >
      {/* Index dot */}
      <div style={{
        width: 20, height: 20, borderRadius: "50%", flexShrink: 0,
        background: `${phaseConfig.color}15`,
        border: `1px solid ${phaseConfig.color}30`,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 9, fontWeight: 700, color: phaseConfig.color,
        fontFamily: "'IBM Plex Mono', monospace",
      }}>
        {index + 1}
      </div>

      {/* Summary */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{
            fontSize: 9, fontWeight: 700, color: phaseConfig.color,
            fontFamily: "'IBM Plex Mono', monospace", letterSpacing: "0.06em",
          }}>
            {phaseConfig.label}
          </span>
          <span style={{ fontSize: 9, color: "#475569" }}>·</span>
          <span style={{
            fontSize: 9, color: "#475569",
            fontFamily: "'IBM Plex Mono', monospace",
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          }}>
            {(event.events_detected || []).map(e => e.replace(/_/g, " ")).join(", ")}
          </span>
        </div>
        {event.coaching_needed && event.nudge && (
          <div style={{
            fontSize: 11, color: "#64748b", marginTop: 2,
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          }}>
            💡 {event.nudge.slice(0, 60)}…
          </div>
        )}
        {!event.coaching_needed && event.note && (
          <div style={{
            fontSize: 14, color: "#475569", marginTop: 2,
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          }}>
            {isPositive ? "✅" : "👀"} {event.note}
          </div>
        )}
      </div>
    </div>
  );
}


// --- Main App ---
export default function SalesCoachAI() {
  const [isRunning, setIsRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [transcripts, setTranscripts] = useState([]);
  const [coachingEvents, setCoachingEvents] = useState([]);
  const [currentSpeaker, setCurrentSpeaker] = useState(null);
  const [prospectEmotion, setProspectEmotion] = useState("Neutral");
  const [repEmotion, setRepEmotion] = useState("Confident");
  const [emotionAlert, setEmotionAlert] = useState(null);
  const transcriptRef = useRef(null);
  const historyRef = useRef(null);
  const timersRef = useRef([]);
  const intervalRef = useRef(null);
  const [waveKey, setWaveKey] = useState(0);

  useEffect(() => {
    if (!isRunning) return;
    const id = setInterval(() => setWaveKey((k) => k + 1), 200);
    return () => clearInterval(id);
  }, [isRunning]);

  useEffect(() => {
    if (!isRunning) return;
    intervalRef.current = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(intervalRef.current);
  }, [isRunning]);

  const formatTime = (s) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
  };

  const activeEvent = coachingEvents.length > 0 ? coachingEvents[coachingEvents.length - 1] : null;
  const historyEvents = coachingEvents.slice(0, -1);

  const startDemo = useCallback(() => {
    setTranscripts([]);
    setCoachingEvents([]);
    setCurrentSpeaker(null);
    setProspectEmotion("Neutral");
    setRepEmotion("Confident");
    setEmotionAlert(null);
    setElapsed(0);
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
    setIsRunning(true);

    DEMO_SCENARIO.timeline.forEach((event) => {
      const tid = setTimeout(() => {
        if (event.type === "transcript") {
          setTranscripts((prev) => [...prev, event]);
          setCurrentSpeaker(event.speaker);
          if (event.speaker === "prospect" && event.emotion) setProspectEmotion(event.emotion);
          if (event.speaker === "rep" && event.emotion) setRepEmotion(event.emotion);
          const clearTid = setTimeout(() => setCurrentSpeaker(null), 2500);
          timersRef.current.push(clearTid);
        } else if (event.type === "coaching") {
          setCoachingEvents((prev) => [...prev, event.event]);
        } else if (event.type === "emotion_shift") {
          setEmotionAlert(event);
          const clearTid = setTimeout(() => setEmotionAlert(null), 4000);
          timersRef.current.push(clearTid);
        }
      }, event.delay);
      timersRef.current.push(tid);
    });
  }, []);

  const stopDemo = () => {
    setIsRunning(false);
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
    clearInterval(intervalRef.current);
    setCurrentSpeaker(null);
  };

  useEffect(() => {
    if (transcriptRef.current) transcriptRef.current.scrollTop = transcriptRef.current.scrollHeight;
  }, [transcripts]);

  useEffect(() => {
    if (historyRef.current) historyRef.current.scrollTop = historyRef.current.scrollHeight;
  }, [historyEvents.length]);

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
        @keyframes alertPulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.4); }
          50% { box-shadow: 0 0 20px 4px rgba(239, 68, 68, 0.15); }
        }
        @keyframes borderGlow {
          0%, 100% { border-color: rgba(6,182,212,0.2); }
          50% { border-color: rgba(6,182,212,0.5); }
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
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          {isRunning && (
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#ef4444", animation: "pulse-dot 1.2s ease-in-out infinite" }} />
              <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 13, fontWeight: 600, color: "#ef4444", letterSpacing: "0.05em" }}>LIVE</span>
              <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 14, color: "#94a3b8", fontWeight: 500, marginLeft: 4, fontVariantNumeric: "tabular-nums" }}>
                {formatTime(elapsed)}
              </span>
            </div>
          )}
          <button
            onClick={isRunning ? stopDemo : startDemo}
            style={{
              padding: "8px 20px", borderRadius: 8, border: "none",
              fontWeight: 600, fontSize: 13, cursor: "pointer",
              fontFamily: "'DM Sans', sans-serif", transition: "all 0.2s ease",
              ...(isRunning
                ? { background: "rgba(239,68,68,0.15)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.3)" }
                : { background: "linear-gradient(135deg, #06b6d4, #0891b2)", color: "#0f172a" }),
            }}
          >
            {isRunning ? "⏹ End Call" : "▶ Start Demo Call"}
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
            {!isRunning && (
              <div style={{
                position: "absolute", inset: 0, display: "flex", flexDirection: "column",
                alignItems: "center", justifyContent: "center", gap: 16, zIndex: 10,
              }}>
                <div style={{ fontSize: 48, opacity: 0.4 }}>🎯</div>
                <div style={{ fontSize: 20, fontWeight: 600, color: "#64748b" }}>Ready to Coach</div>
                <div style={{ fontSize: 13, color: "#475569", maxWidth: 320, textAlign: "center", lineHeight: 1.5 }}>
                  Click <strong style={{ color: "#06b6d4" }}>Start Demo Call</strong> to see real-time sales coaching in action
                </div>
              </div>
            )}

            {isRunning && (
              <>
                <ParticipantCard name={DEMO_SCENARIO.participants.rep.name} role={DEMO_SCENARIO.participants.rep.role} emotion={repEmotion} isSpeaking={currentSpeaker === "rep"} isProspect={false} key={`rep-${waveKey}`} />
                <div style={{ width: 1, height: "60%", background: "linear-gradient(to bottom, transparent, #334155, transparent)" }} />
                <ParticipantCard name={DEMO_SCENARIO.participants.prospect.name} role={DEMO_SCENARIO.participants.prospect.role} emotion={prospectEmotion} isSpeaking={currentSpeaker === "prospect"} isProspect={true} key={`prospect-${waveKey}`} />
              </>
            )}

            {emotionAlert && (
              <div style={{
                position: "absolute", top: 16, left: "50%", transform: "translateX(-50%)",
                background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)",
                borderRadius: 10, padding: "8px 16px", display: "flex", alignItems: "center", gap: 10,
                animation: "heroSlideIn 0.3s ease, alertPulse 2s infinite", zIndex: 20,
              }}>
                <span style={{ fontSize: 16 }}>⚠️</span>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "#ef4444", letterSpacing: "0.08em", fontFamily: "'IBM Plex Mono', monospace" }}>
                    EMOTION SHIFT DETECTED
                  </div>
                  <div style={{ fontSize: 14, color: "#fca5a5" }}>
                    {DEMO_SCENARIO.participants.prospect.name}: {emotionAlert.from} → {emotionAlert.to}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Transcript */}
          <div style={{ height: 200, borderTop: "1px solid rgba(51,65,85,0.3)", display: "flex", flexDirection: "column", flexShrink: 0 }}>
            <div style={{ padding: "10px 20px", display: "flex", alignItems: "center", gap: 8, borderBottom: "1px solid rgba(51,65,85,0.2)" }}>
              <span style={{ fontSize: 10, color: "#64748b", fontWeight: 600, fontFamily: "'IBM Plex Mono', monospace", letterSpacing: "0.08em" }}>
                📝 LIVE TRANSCRIPT
              </span>
              {transcripts.length > 0 && (
                <span style={{ fontSize: 10, color: "#475569", fontFamily: "'IBM Plex Mono', monospace" }}>({transcripts.length})</span>
              )}
            </div>
            <div ref={transcriptRef} style={{ flex: 1, overflow: "auto", padding: "12px 20px", display: "flex", flexDirection: "column", gap: 8 }}>
              {transcripts.length === 0 && isRunning && (
                <div style={{ fontSize: 13, color: "#475569", fontStyle: "italic" }}>Listening...</div>
              )}
              {transcripts.map((t, i) => (
                <div key={i} style={{ display: "flex", gap: 10, animation: "fadeInUp 0.3s ease" }}>
                  <span style={{
                    fontSize: 11, fontWeight: 700, color: t.speaker === "rep" ? "#06b6d4" : "#f59e0b",
                    fontFamily: "'IBM Plex Mono', monospace", minWidth: 70, flexShrink: 0, paddingTop: 2,
                  }}>
                    {t.speaker === "rep" ? "REP" : "PROSPECT"}
                  </span>
                  <span style={{ fontSize: 13, color: "#cbd5e1", lineHeight: 1.5 }}>{t.text}</span>
                  <span style={{ fontSize: 11, color: "#475569", fontFamily: "'IBM Plex Mono', monospace", flexShrink: 0, paddingTop: 2 }}>
                    {t.emotion}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT: Coaching Panel — Redesigned */}
        <div style={{
          width: 500, display: "flex", flexDirection: "column",
          background: "rgba(15,23,42,0.5)", flexShrink: 0,
        }}>
          {/* Panel Header */}
          <div style={{
            padding: "14px 20px", borderBottom: "1px solid rgba(51,65,85,0.3)",
            display: "flex", alignItems: "center", justifyContent: "space-between",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 14 }}>🧠</span>
              <span style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", letterSpacing: "0.08em", fontFamily: "'IBM Plex Mono', monospace" }}>
                COACHING
              </span>
            </div>
            {coachingEvents.length > 0 && (
              <span style={{
                fontSize: 11, color: "#06b6d4", fontWeight: 600,
                fontFamily: "'IBM Plex Mono', monospace",
                background: "rgba(6,182,212,0.1)", padding: "2px 8px", borderRadius: 10,
              }}>
                {coachingEvents.length}
              </span>
            )}
          </div>

          {/* HERO ZONE: Active coaching event */}
          <div style={{
            flexShrink: 0,
            borderBottom: activeEvent ? "1px solid rgba(51,65,85,0.3)" : "none",
            minHeight: activeEvent ? "auto" : 0,
          }}>
            {activeEvent ? (
              <ActiveNudge event={activeEvent} key={coachingEvents.length} />
            ) : (
              <div style={{
                padding: 40, display: "flex", flexDirection: "column",
                alignItems: "center", justifyContent: "center", gap: 12, opacity: 0.35,
              }}>
                <span style={{ fontSize: 36 }}>🧠</span>
                <span style={{ fontSize: 12, color: "#64748b", textAlign: "center", lineHeight: 1.5 }}>
                  {isRunning ? "Analyzing conversation…" : "Coaching events will appear here"}
                </span>
              </div>
            )}
          </div>

          {/* HISTORY ZONE: Previous events, collapsed & dimmed */}
          {historyEvents.length > 0 && (
            <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
              <div style={{
                padding: "8px 20px",
                borderBottom: "1px solid rgba(51,65,85,0.15)",
                display: "flex", alignItems: "center", gap: 6,
              }}>
                <span style={{
                  fontSize: 9, fontWeight: 600, color: "#475569",
                  letterSpacing: "0.08em", fontFamily: "'IBM Plex Mono', monospace",
                }}>
                  HISTORY
                </span>
                <span style={{
                  fontSize: 9, color: "#334155",
                  fontFamily: "'IBM Plex Mono', monospace",
                }}>
                  ({historyEvents.length})
                </span>
              </div>
              <div ref={historyRef} style={{ flex: 1, overflow: "auto" }}>
                {historyEvents.map((event, i) => (
                  <HistoryItem key={i} event={event} index={i} />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
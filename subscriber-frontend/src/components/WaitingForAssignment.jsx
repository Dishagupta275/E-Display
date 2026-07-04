
import { useState } from "react";

// Shown when this display's device_uid is either brand-new (not yet seen by
// the backend) or registered but not yet assigned to a class. It polls
// /devices/identify in the background and the parent App will switch screens
// automatically the moment an admin assigns a class — no action needed here.
export default function WaitingForAssignment({ deviceId, secondsUntilRetry }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(deviceId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard not available — ignore */
    }
  };

  return (
    <div style={s.container}>
      <div style={s.card}>
        <div style={s.iconCircle}>📺</div>
        <h1 style={s.title}>Display Not Yet Assigned</h1>
        <p style={s.subtitle}>
          This screen registered itself automatically, but no class has been
          linked to it yet.
        </p>

        <div style={s.idBox}>
          <span style={s.idLabel}>DEVICE ID</span>
          <div style={s.idRow}>
            <code style={s.idValue}>{deviceId || "generating…"}</code>
            <button style={s.copyBtn} onClick={handleCopy}>
              {copied ? "✓ Copied" : "Copy"}
            </button>
          </div>
        </div>

        <div style={s.steps}>
          <p style={s.stepsTitle}>What to do</p>
          <ol style={s.stepsList}>
            <li>Open the Publisher Portal on any computer.</li>
            <li>Go to <strong>Manage Displays / Device Monitor</strong>.</li>
            <li>Find this device in the <strong>Unassigned</strong> list (it appeared there automatically).</li>
            <li>Give it a name and pick the class it should show.</li>
          </ol>
        </div>

        <div style={s.statusRow}>
          <span style={s.pulseDot} />
          Checking for assignment{secondsUntilRetry != null ? ` in ${secondsUntilRetry}s…` : "…"}
        </div>
        <p style={s.hint}>This screen will switch automatically once assigned — no restart needed.</p>
      </div>
    </div>
  );
}

const s = {
  container: {
    minHeight: "100vh",
    background: "linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontFamily: "'Segoe UI', sans-serif",
    padding: 24,
  },
  card: {
    background: "#fff",
    borderRadius: 20,
    padding: "44px 48px",
    maxWidth: 520,
    width: "100%",
    boxShadow: "0 20px 60px rgba(0,0,0,0.35)",
    textAlign: "center",
  },
  iconCircle: {
    width: 72,
    height: 72,
    margin: "0 auto 20px",
    borderRadius: "50%",
    background: "#eef2ff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 34,
  },
  title: {
    fontSize: 24,
    fontWeight: 800,
    color: "#111827",
    margin: "0 0 8px",
  },
  subtitle: {
    fontSize: 14,
    color: "#6b7280",
    margin: "0 0 28px",
    lineHeight: 1.6,
  },
  idBox: {
    background: "#f8fafc",
    border: "1.5px dashed #c7d2fe",
    borderRadius: 12,
    padding: "16px 18px",
    marginBottom: 24,
    textAlign: "left",
  },
  idLabel: {
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: 1.2,
    color: "#9ca3af",
  },
  idRow: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    marginTop: 8,
  },
  idValue: {
    flex: 1,
    fontSize: 13,
    color: "#312e81",
    background: "#eef2ff",
    padding: "8px 10px",
    borderRadius: 8,
    wordBreak: "break-all",
  },
  copyBtn: {
    flexShrink: 0,
    background: "#4f46e5",
    color: "#fff",
    border: "none",
    borderRadius: 8,
    padding: "8px 14px",
    fontSize: 12,
    fontWeight: 700,
    cursor: "pointer",
  },
  steps: {
    background: "#fff",
    border: "1px solid #e5e7eb",
    borderRadius: 12,
    padding: "16px 20px",
    marginBottom: 24,
    textAlign: "left",
  },
  stepsTitle: {
    fontSize: 12,
    fontWeight: 700,
    color: "#374151",
    margin: "0 0 8px",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  stepsList: {
    margin: 0,
    paddingLeft: 20,
    fontSize: 13,
    color: "#4b5563",
    lineHeight: 1.8,
  },
  statusRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    fontSize: 13,
    color: "#4f46e5",
    fontWeight: 600,
  },
  pulseDot: {
    width: 8,
    height: 8,
    borderRadius: "50%",
    background: "#4f46e5",
    display: "inline-block",
    animation: "pulse 1.4s ease-in-out infinite",
  },
  hint: {
    fontSize: 11,
    color: "#9ca3af",
    marginTop: 10,
  },
};

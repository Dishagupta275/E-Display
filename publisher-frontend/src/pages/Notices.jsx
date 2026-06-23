import React, { useEffect, useState } from "react";
import { useToast } from "../components/Toast";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";

const c = {
  bg: "#f5f4f0", surface: "#ffffff", border: "#e2e0d8",
  borderHover: "#c8c5ba", text: "#1a1917", textMuted: "#7a7670",
  textSubtle: "#b0ada6", accent: "#2d2b28", accentHover: "#454340",
  tag: "#eeece7", tagText: "#6b6760",
};
const font = "'Nunito', 'Helvetica Neue', sans-serif";

function ClassPicker({ classes, selected, onChange }) {
  const allSelected = selected === "all";

  const toggle = (name) => {
    if (allSelected) {
      onChange([name]);
    } else {
      const next = selected.includes(name)
        ? selected.filter((c) => c !== name)
        : [...selected, name];
      onChange(next.length === 0 ? "all" : next);
    }
  };

  return (
    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 }}>
      <button
        onClick={() => onChange("all")}
        style={{
          padding: "4px 14px", borderRadius: 999, fontSize: 12, fontWeight: 700,
          fontFamily: font, cursor: "pointer",
          border: `1.5px solid ${allSelected ? c.accent : c.border}`,
          background: allSelected ? c.accent : c.surface,
          color: allSelected ? "#fff" : c.textMuted,
          transition: "all 0.15s",
        }}
      >🌐 All</button>

      {classes.map((name) => {
        const active = !allSelected && selected.includes(name);
        return (
          <button key={name} onClick={() => toggle(name)} style={{
            padding: "4px 14px", borderRadius: 999, fontSize: 12, fontWeight: 700,
            fontFamily: font, cursor: "pointer",
            border: `1.5px solid ${active ? c.accent : c.border}`,
            background: active ? c.accent : c.surface,
            color: active ? "#fff" : c.textMuted,
            transition: "all 0.15s",
          }}>
            {name}{active && " ✓"}
          </button>
        );
      })}
    </div>
  );
}

export default function Notices() {
  const [notices, setNotices] = useState([{ text: "", target: "all" }]);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const { addToast, ToastContainer } = useToast();

  useEffect(() => {
    Promise.all([
      fetch(`${API_BASE}/api/notices`).then((r) => r.json()),
      fetch(`${API_BASE}/api/classes`).then((r) => r.json()),
    ])
      .then(([noticeData, classData]) => {
        // /api/classes returns { "CSE": { "1": [...], "2": [...] }, ... }
        const flat = [];
        if (classData && typeof classData === "object" && !Array.isArray(classData)) {
          Object.values(classData).forEach(dept => {
            Object.values(dept).forEach(yearArr => {
              if (Array.isArray(yearArr)) yearArr.forEach(c => flat.push(c.display_name || c.name || c));
            });
          });
        }
        setClasses(flat);
        if (Array.isArray(noticeData) && noticeData.length > 0) {
          if (typeof noticeData[0] === "string") {
            setNotices(noticeData.map((t) => ({ text: t, target: "all" })));
          } else {
            setNotices(noticeData);
          }
        }
      })
      .catch(() => addToast("Failed to load data", "error"))
      .finally(() => setLoading(false));
  }, []);

  const updateText = (idx, value) =>
    setNotices((prev) => prev.map((n, i) => i === idx ? { ...n, text: value } : n));
  const updateTarget = (idx, value) =>
    setNotices((prev) => prev.map((n, i) => i === idx ? { ...n, target: value } : n));
  const addNotice = () =>
    setNotices((prev) => [...prev, { text: "", target: "all" }]);
  const removeNotice = (idx) => {
    if (notices.length === 1) return;
    setNotices((prev) => prev.filter((_, i) => i !== idx));
  };
  const moveUp = (idx) => {
    if (idx === 0) return;
    const next = [...notices]; [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]]; setNotices(next);
  };
  const moveDown = (idx) => {
    if (idx === notices.length - 1) return;
    const next = [...notices]; [next[idx + 1], next[idx]] = [next[idx], next[idx + 1]]; setNotices(next);
  };

  const cleaned = () => notices.filter((n) => n.text.trim());
  const previewText = cleaned().map((n) => n.text.trim()).join("   •   ");

  const targetLabel = (target) => {
    if (target === "all") return "All classes";
    if (Array.isArray(target) && target.length > 0) return target.join(", ");
    return "All classes";
  };

  const handleSave = async () => {
    const data = cleaned();
    if (!data.length) { addToast("Add at least one notice", "warning"); return; }
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE}/api/notices`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Save failed");
      addToast("Notices saved!", "success");
    } catch (err) { addToast(err.message, "error"); }
    finally { setSaving(false); }
  };

  const handlePublish = async () => {
    const data = cleaned();
    if (!data.length) { addToast("Add at least one notice", "warning"); return; }
    setPublishing(true);
    try {
      const res = await fetch(`${API_BASE}/api/notices/publish`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Publish failed");
      addToast("Notices published!", "success");
    } catch (err) { addToast(err.message, "error"); }
    finally { setPublishing(false); }
  };

  return (
    <div style={{ maxWidth: 750, margin: "0 auto", fontFamily: font, color: c.text }}>
      <ToastContainer />

      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ margin: "0 0 5px", fontSize: 22, fontWeight: 800, color: c.text }}>📢 Manage Notices</h2>
        <p style={{ margin: 0, color: c.textMuted, fontSize: 13 }}>
          Each notice can be sent to all classes or specific ones. Publish pushes live instantly.
        </p>
      </div>

      {/* Preview bar */}
      <div style={{
        background: "#0d5f8a", color: "#fff", borderRadius: 16,
        overflow: "hidden", marginBottom: 24,
        display: "flex", alignItems: "center", height: 44,
      }}>
        <span style={{
          background: "#ff9636", color: "#000", fontWeight: 800, fontFamily: font,
          padding: "0 16px", height: "100%", display: "flex",
          alignItems: "center", flexShrink: 0, fontSize: 13,
        }}>📢 NOTICE</span>
        <div style={{ overflow: "hidden", flex: 1 }}>
          <span style={{
            display: "inline-block", whiteSpace: "nowrap",
            fontStyle: "italic", paddingLeft: 20, fontSize: 14,
            animation: "scroll-preview 12s linear infinite",
          }}>
            {previewText || "Your notices will appear here..."}
          </span>
        </div>
      </div>

      {/* Notice List */}
      {loading ? (
        <div className="loading-spinner" style={{ margin: "40px auto" }} />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 24 }}>
          {notices.map((notice, idx) => (
            <div key={idx} style={{
              background: c.surface, border: `1.5px solid ${c.border}`,
              borderRadius: 20, padding: "16px 18px",
            }}>
              {/* Row 1 */}
              <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 12 }}>
                {/* Order controls */}
                <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                  <button onClick={() => moveUp(idx)} disabled={idx === 0} style={orderBtn}>▲</button>
                  <button onClick={() => moveDown(idx)} disabled={idx === notices.length - 1} style={orderBtn}>▼</button>
                </div>

                {/* Badge */}
                <span style={{
                  minWidth: 26, height: 26, borderRadius: 999,
                  background: c.tag, color: c.tagText,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 12, fontWeight: 800, flexShrink: 0,
                }}>{idx + 1}</span>

                {/* Text input */}
                <input
                  value={notice.text}
                  onChange={(e) => updateText(idx, e.target.value)}
                  placeholder={`Notice ${idx + 1}...`}
                  style={{
                    flex: 1, padding: "9px 14px", fontSize: 14, fontFamily: font,
                    border: `1.5px solid ${c.border}`, borderRadius: 12,
                    background: c.bg, color: c.text, outline: "none",
                    transition: "border-color 0.15s",
                  }}
                  onFocus={(e) => e.target.style.borderColor = c.borderHover}
                  onBlur={(e) => e.target.style.borderColor = c.border}
                />

                {/* Delete */}
                <button
                  onClick={() => removeNotice(idx)}
                  disabled={notices.length === 1}
                  style={{
                    width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 13, background: c.tag, color: c.textSubtle,
                    border: `1.5px solid ${c.border}`, borderRadius: 10,
                    cursor: "pointer", transition: "all 0.15s",
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "#fdeaea"; e.currentTarget.style.color = "#c84040"; e.currentTarget.style.borderColor = "#f0cece"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = c.tag; e.currentTarget.style.color = c.textSubtle; e.currentTarget.style.borderColor = c.border; }}
                >✕</button>
              </div>

              {/* Row 2: target */}
              <div style={{ paddingLeft: 72 }}>
                <div style={{ fontSize: 12, fontWeight: 800, color: c.textMuted, marginBottom: 4, letterSpacing: "0.04em" }}>
                  📡 Broadcast to: <span style={{ color: c.text }}>{targetLabel(notice.target)}</span>
                </div>
                <ClassPicker
                  classes={classes}
                  selected={notice.target}
                  onChange={(val) => updateTarget(idx, val)}
                />
              </div>
            </div>
          ))}

          <button
            onClick={addNotice}
            style={{
              alignSelf: "flex-start", padding: "8px 18px", fontSize: 13, fontWeight: 700,
              fontFamily: font, background: c.tag, color: c.text,
              border: `1.5px solid ${c.border}`, borderRadius: 12, cursor: "pointer",
              transition: "all 0.15s",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = c.borderHover; e.currentTarget.style.transform = "translateY(-1px)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = c.border; e.currentTarget.style.transform = "translateY(0)"; }}
          >+ Add Notice</button>
        </div>
      )}

      {/* Actions */}
      <div style={{ display: "flex", gap: 10 }}>
        <Btn onClick={handleSave} disabled={saving} variant="secondary">
          {saving ? "Saving..." : "💾 Save"}
        </Btn>
        <Btn onClick={handlePublish} disabled={publishing} variant="primary">
          {publishing ? "Publishing..." : "📡 Save & Publish"}
        </Btn>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&display=swap');
        @keyframes scroll-preview { 0%{transform:translateX(0)} 100%{transform:translateX(-60%)} }
      `}</style>
    </div>
  );
}

const orderBtn = {
  padding: "2px 8px", fontSize: 10, fontFamily: font, fontWeight: 700,
  background: "#eeece7", border: "1.5px solid #e2e0d8", borderRadius: 6, cursor: "pointer",
};

function Btn({ onClick, disabled, variant = "ghost", children }) {
  const variants = {
    primary: { background: c.accent, color: "#fff", borderColor: c.accent },
    secondary: { background: c.surface, color: c.text, borderColor: c.border },
    ghost: { background: c.tag, color: c.textMuted, borderColor: c.border },
  };
  return (
    <button onClick={onClick} disabled={disabled} style={{
      padding: "10px 20px", fontSize: 13, fontWeight: 800,
      fontFamily: font, cursor: "pointer", borderRadius: 12,
      border: "1.5px solid", opacity: disabled ? 0.6 : 1,
      transition: "all 0.15s", ...variants[variant],
    }}
      onMouseEnter={(e) => { if (!disabled) e.currentTarget.style.transform = "translateY(-1px)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; }}
    >{children}</button>
  );
}
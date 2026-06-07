import React, { useEffect, useState } from "react";
import { useToast } from "../components/Toast";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";

function ClassPicker({ classes, selected, onChange }) {
  const allSelected = selected === "all";

  const toggle = (name) => {
    if (allSelected) {
      // switching from all → deselect all except this one
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
      {/* ALL button */}
      <button
        onClick={() => onChange("all")}
        style={{
          padding: "4px 12px", borderRadius: 6, fontSize: 12,
          fontWeight: 700, cursor: "pointer", border: "2px solid",
          borderColor: allSelected ? "#2563eb" : "var(--border)",
          background: allSelected ? "#2563eb" : "var(--bg)",
          color: allSelected ? "#fff" : "var(--text-muted)",
          transition: "all 0.15s",
        }}
      >
        🌐 All
      </button>

      {/* Per-class buttons */}
      {classes.map((name) => {
        const active = !allSelected && selected.includes(name);
        return (
          <button
            key={name}
            onClick={() => toggle(name)}
            style={{
              padding: "4px 12px", borderRadius: 6, fontSize: 12,
              fontWeight: 700, cursor: "pointer", border: "2px solid",
              borderColor: active ? "#7c3aed" : "var(--border)",
              background: active ? "#7c3aed" : "var(--bg)",
              color: active ? "#fff" : "var(--text-muted)",
              transition: "all 0.15s",
            }}
          >
            {name}{active && " ✓"}
          </button>
        );
      })}
    </div>
  );
}

export default function Notices() {
  // Each notice: { text: string, target: "all" | string[] }
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
        const classList = Array.isArray(classData)
          ? classData.map((c) => (typeof c === "string" ? c : c.name))
          : [];
        setClasses(classList);

        // Support old format (plain string array) and new format (objects)
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
    const next = [...notices];
    [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
    setNotices(next);
  };

  const moveDown = (idx) => {
    if (idx === notices.length - 1) return;
    const next = [...notices];
    [next[idx + 1], next[idx]] = [next[idx], next[idx + 1]];
    setNotices(next);
  };

  const cleaned = () => notices.filter((n) => n.text.trim());

  const previewText = cleaned().map((n) => n.text.trim()).join("   •   ");

  const handleSave = async () => {
    const data = cleaned();
    if (!data.length) { addToast("Add at least one notice", "warning"); return; }
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE}/api/notices`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Save failed");
      addToast("Notices saved!", "success");
    } catch (err) {
      addToast(err.message, "error");
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = async () => {
    const data = cleaned();
    if (!data.length) { addToast("Add at least one notice", "warning"); return; }
    setPublishing(true);
    try {
      const res = await fetch(`${API_BASE}/api/notices/publish`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Publish failed");
      addToast("Notices published!", "success");
    } catch (err) {
      addToast(err.message, "error");
    } finally {
      setPublishing(false);
    }
  };

  const targetLabel = (target) => {
    if (target === "all") return "All classes";
    if (Array.isArray(target) && target.length > 0) return target.join(", ");
    return "All classes";
  };

  return (
    <div style={{ maxWidth: 750, margin: "0 auto" }}>
      <ToastContainer />

      <div style={{ marginBottom: 24 }}>
        <h2 style={{ margin: "0 0 6px", fontSize: 22, fontWeight: 800 }}>📢 Manage Notices</h2>
        <p style={{ margin: 0, color: "var(--text-muted)", fontSize: 14 }}>
          Each notice can be sent to all classes or specific ones. Publish pushes live instantly.
        </p>
      </div>

      {/* Preview bar */}
      <div style={{
        background: "#0d5f8a", color: "#fff", borderRadius: 8,
        overflow: "hidden", marginBottom: 28,
        display: "flex", alignItems: "center", height: 40,
      }}>
        <span style={{
          background: "#ff9636", color: "#000", fontWeight: 700,
          padding: "0 14px", height: "100%", display: "flex",
          alignItems: "center", flexShrink: 0, fontSize: 13,
        }}>📢 NOTICE</span>
        <div style={{ overflow: "hidden", flex: 1 }}>
          <span style={{
            display: "inline-block", whiteSpace: "nowrap",
            fontStyle: "italic", paddingLeft: 20, fontSize: 15,
            animation: "scroll-preview 12s linear infinite",
          }}>
            {previewText || "Your notices will appear here..."}
          </span>
        </div>
        <style>{`@keyframes scroll-preview{0%{transform:translateX(0)}100%{transform:translateX(-60%)}}`}</style>
      </div>

      {/* Notice list */}
      {loading ? (
        <div className="loading-spinner" style={{ margin: "40px auto" }} />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 28 }}>
          {notices.map((notice, idx) => (
            <div key={idx} className="card" style={{ padding: 16 }}>
              {/* Row 1: order + input + delete */}
              <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 10 }}>
                {/* Order controls */}
                <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  <button onClick={() => moveUp(idx)} disabled={idx === 0}
                    style={{ padding: "2px 7px", fontSize: 11, background: "var(--slate-100)", border: "1px solid var(--border)", borderRadius: 4, cursor: "pointer" }}>▲</button>
                  <button onClick={() => moveDown(idx)} disabled={idx === notices.length - 1}
                    style={{ padding: "2px 7px", fontSize: 11, background: "var(--slate-100)", border: "1px solid var(--border)", borderRadius: 4, cursor: "pointer" }}>▼</button>
                </div>

                {/* Badge */}
                <span style={{
                  minWidth: 26, height: 26, borderRadius: "50%",
                  background: "var(--slate-200)", color: "var(--slate-600)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 12, fontWeight: 700, flexShrink: 0,
                }}>{idx + 1}</span>

                {/* Text input */}
                <input
                  value={notice.text}
                  onChange={(e) => updateText(idx, e.target.value)}
                  placeholder={`Notice ${idx + 1}...`}
                  style={{ flex: 1 }}
                />

                {/* Delete */}
                <button onClick={() => removeNotice(idx)} disabled={notices.length === 1}
                  style={{ padding: "6px 10px", background: "transparent", border: "1px solid var(--border)", borderRadius: 6, color: "var(--text-muted)", cursor: "pointer", fontSize: 16 }}>✕</button>
              </div>

              {/* Row 2: class selector */}
              <div style={{ paddingLeft: 72 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)", marginBottom: 4 }}>
                  📡 Broadcast to: <span style={{ color: "var(--slate-700)" }}>{targetLabel(notice.target)}</span>
                </div>
                <ClassPicker
                  classes={classes}
                  selected={notice.target}
                  onChange={(val) => updateTarget(idx, val)}
                />
              </div>
            </div>
          ))}

          <button onClick={addNotice} className="btn-secondary" style={{ alignSelf: "flex-start" }}>
            + Add Notice
          </button>
        </div>
      )}

      {/* Actions */}
      <div style={{ display: "flex", gap: 10 }}>
        <button onClick={handleSave} className="btn-primary" disabled={saving}>
          {saving ? "Saving..." : "💾 Save"}
        </button>
        <button onClick={handlePublish} className="btn-accent" disabled={publishing}>
          {publishing ? "Publishing..." : "📡 Save & Publish"}
        </button>
      </div>
    </div>
  );
}

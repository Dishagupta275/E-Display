import React, { useEffect, useState } from "react";
import { useToast } from "../components/Toast";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";

export default function Notices() {
  const [notices, setNotices] = useState([""]);
  const [classes, setClasses] = useState([]);
  const [target, setTarget] = useState("all"); // "all" | "select"
  const [selectedClasses, setSelectedClasses] = useState([]);
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
        setNotices(Array.isArray(noticeData) && noticeData.length > 0 ? noticeData : [""]);
        setClasses(Array.isArray(classData) ? classData.map((c) => (typeof c === "string" ? c : c.name)) : []);
      })
      .catch(() => addToast("Failed to load data", "error"))
      .finally(() => setLoading(false));
  }, []);

  const toggleClass = (name) => {
    setSelectedClasses((prev) =>
      prev.includes(name) ? prev.filter((c) => c !== name) : [...prev, name]
    );
  };

  const updateNotice = (idx, value) =>
    setNotices((prev) => prev.map((n, i) => (i === idx ? value : n)));
  const addNotice = () => setNotices((prev) => [...prev, ""]);
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

  const cleaned = () => notices.map((n) => n.trim()).filter(Boolean);

  const getTargetClasses = () =>
    target === "all" ? classes : selectedClasses;

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
    const targets = getTargetClasses();
    if (target === "select" && targets.length === 0) {
      addToast("Select at least one class", "warning"); return;
    }
    setPublishing(true);
    try {
      const res = await fetch(`${API_BASE}/api/notices/publish`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notices: data, classes: targets }),
      });
      if (!res.ok) throw new Error("Publish failed");
      const label = target === "all" ? "all classes" : targets.join(", ");
      addToast(`Notices published to ${label}!`, "success");
    } catch (err) {
      addToast(err.message, "error");
    } finally {
      setPublishing(false);
    }
  };

  return (
    <div style={{ maxWidth: 700, margin: "0 auto" }}>
      <ToastContainer />

      <div style={{ marginBottom: 24 }}>
        <h2 style={{ margin: "0 0 6px", fontSize: 22, fontWeight: 800 }}>📢 Manage Notices</h2>
        <p style={{ margin: 0, color: "var(--text-muted)", fontSize: 14 }}>
          Write notices and choose which classes see them. Publish pushes live instantly via MQTT.
        </p>
      </div>

      {/* Live preview */}
      <div style={{
        background: "#0d5f8a", color: "#fff",
        borderRadius: 8, overflow: "hidden",
        marginBottom: 24, display: "flex", alignItems: "center", height: 40,
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
            {cleaned().join("   •   ") || "Your notices will appear here..."}
          </span>
        </div>
        <style>{`@keyframes scroll-preview { 0%{transform:translateX(0)} 100%{transform:translateX(-60%)} }`}</style>
      </div>

      {/* Notices list */}
      {loading ? (
        <div className="loading-spinner" style={{ margin: "40px auto" }} />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 28 }}>
          {notices.map((notice, idx) => (
            <div key={idx} style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <button onClick={() => moveUp(idx)} disabled={idx === 0}
                  style={{ padding: "2px 7px", fontSize: 11, background: "var(--slate-100)", border: "1px solid var(--border)", borderRadius: 4, cursor: "pointer" }}>▲</button>
                <button onClick={() => moveDown(idx)} disabled={idx === notices.length - 1}
                  style={{ padding: "2px 7px", fontSize: 11, background: "var(--slate-100)", border: "1px solid var(--border)", borderRadius: 4, cursor: "pointer" }}>▼</button>
              </div>
              <span style={{
                minWidth: 26, height: 26, borderRadius: "50%",
                background: "var(--slate-200)", color: "var(--slate-600)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 12, fontWeight: 700, flexShrink: 0,
              }}>{idx + 1}</span>
              <input
                value={notice}
                onChange={(e) => updateNotice(idx, e.target.value)}
                placeholder={`Notice ${idx + 1}...`}
                style={{ flex: 1 }}
              />
              <button onClick={() => removeNotice(idx)} disabled={notices.length === 1}
                style={{ padding: "6px 10px", background: "transparent", border: "1px solid var(--border)", borderRadius: 6, color: "var(--text-muted)", cursor: "pointer", fontSize: 16 }}>✕</button>
            </div>
          ))}
          <button onClick={addNotice} className="btn-secondary" style={{ alignSelf: "flex-start", marginTop: 4 }}>
            + Add Notice
          </button>
        </div>
      )}

      {/* ── Broadcast target ── */}
      <div className="card" style={{ marginBottom: 24 }}>
        <h3 style={{ margin: "0 0 14px", fontSize: 15, fontWeight: 700 }}>📡 Broadcast To</h3>

        {/* All / Select toggle */}
        <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
          {["all", "select"].map((opt) => (
            <button
              key={opt}
              onClick={() => setTarget(opt)}
              style={{
                padding: "8px 20px", borderRadius: 8, fontWeight: 600, fontSize: 13,
                cursor: "pointer", border: "2px solid",
                borderColor: target === opt ? "var(--primary)" : "var(--border)",
                background: target === opt ? "var(--blue-50)" : "var(--bg)",
                color: target === opt ? "var(--primary)" : "var(--text-muted)",
                transition: "all 0.15s",
              }}
            >
              {opt === "all" ? "🌐 All Classes" : "🎯 Select Classes"}
            </button>
          ))}
        </div>

        {/* Class picker — shown when "select" */}
        {target === "select" && (
          <div>
            {classes.length === 0 ? (
              <p style={{ color: "var(--text-muted)", fontSize: 13, margin: 0 }}>
                No classes found. Create classes in the Dashboard first.
              </p>
            ) : (
              <>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {classes.map((name) => {
                    const active = selectedClasses.includes(name);
                    return (
                      <button
                        key={name}
                        onClick={() => toggleClass(name)}
                        style={{
                          padding: "7px 16px", borderRadius: 8,
                          fontWeight: 700, fontSize: 14, cursor: "pointer",
                          border: "2px solid",
                          borderColor: active ? "#2563eb" : "var(--border)",
                          background: active ? "#2563eb" : "var(--bg)",
                          color: active ? "#fff" : "var(--text-muted)",
                          transition: "all 0.15s",
                        }}
                      >
                        {name}
                        {active && <span style={{ marginLeft: 6, fontSize: 12 }}>✓</span>}
                      </button>
                    );
                  })}
                </div>
                {selectedClasses.length > 0 && (
                  <p style={{ fontSize: 12, color: "var(--text-muted)", margin: "10px 0 0" }}>
                    Will publish to: <strong>{selectedClasses.join(", ")}</strong>
                  </p>
                )}
              </>
            )}
          </div>
        )}

        {target === "all" && (
          <p style={{ fontSize: 12, color: "var(--text-muted)", margin: 0 }}>
            Will publish to all <strong>{classes.length}</strong> class{classes.length !== 1 ? "es" : ""}.
          </p>
        )}
      </div>

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

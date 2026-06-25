import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useToast } from "../components/Toast";

const API_BASE = import.meta.env.VITE_API_URL || "http:///e-dispy.onrender.com";

const c = {
  bg: "#f5f4f0", surface: "#ffffff", border: "#e2e0d8",
  borderHover: "#c8c5ba", text: "#1a1917", textMuted: "#7a7670",
  textSubtle: "#b0ada6", accent: "#2d2b28", accentHover: "#454340",
  tag: "#eeece7", tagText: "#6b6760",
};
const font = "'Nunito', 'Helvetica Neue', sans-serif";

const FIELDS = [
  { key: "collegeName",   label: "College Name",        placeholder: "SPHOORTHY ENGINEERING COLLEGE" },
  { key: "yearSemester",  label: "Year & Semester",     placeholder: "2ND YEAR B.TECH 1ST SEMESTER" },
  { key: "academicYear",  label: "Academic Year",       placeholder: "2024-2025" },
  { key: "classIncharge", label: "Class Incharge(s)",   placeholder: "DR. KAJA MASTHAN AND D. MAMATHA REDDY" },
  { key: "lectureHall",   label: "Lecture Hall / Room", placeholder: "406" },
];

export default function ClassSettings() {
  const { classname } = useParams();
  const nav = useNavigate();
  const { addToast, ToastContainer } = useToast();

  const [form, setForm] = useState({
    collegeName: "", yearSemester: "", academicYear: "",
    classIncharge: "", lectureHall: "",
    events: ["Seminar", "Workshop", "Exam"],
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [newEvent, setNewEvent] = useState("");

  useEffect(() => {
    fetch(`${API_BASE}/api/settings/${classname}`)
      .then((r) => r.json())
      .then((data) => setForm(data))
      .catch(() => addToast("Failed to load settings", "error"))
      .finally(() => setLoading(false));
  }, [classname]);

  const update = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  const addEvent = () => {
    const e = newEvent.trim();
    if (!e) return;
    update("events", [...(form.events || []), e]);
    setNewEvent("");
  };

  const removeEvent = (idx) =>
    update("events", form.events.filter((_, i) => i !== idx));

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE}/api/settings/${classname}`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error("Save failed");
      addToast("Settings saved!", "success");
    } catch (err) { addToast(err.message, "error"); }
    finally { setSaving(false); }
  };

  const handlePublish = async () => {
    setPublishing(true);
    try {
      const res = await fetch(`${API_BASE}/api/settings/${classname}/publish`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error("Publish failed");
      addToast(`Settings published to ${classname} display!`, "success");
    } catch (err) { addToast(err.message, "error"); }
    finally { setPublishing(false); }
  };

  return (
    <div style={{ maxWidth: 680, margin: "0 auto", fontFamily: font, color: c.text }}>
      <ToastContainer />

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 28 }}>
        <button
          onClick={() => nav(-1)}
          style={{
            padding: "8px 16px", fontSize: 13, fontWeight: 700,
            fontFamily: font, cursor: "pointer", borderRadius: 12,
            border: `1.5px solid ${c.border}`, background: c.tag,
            color: c.textMuted, transition: "all 0.15s",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = c.borderHover; e.currentTarget.style.color = c.text; }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = c.border; e.currentTarget.style.color = c.textMuted; }}
        >← Back</button>
        <div>
          <h2 style={{ margin: "0 0 4px", fontSize: 22, fontWeight: 800 }}>⚙️ Settings — {classname}</h2>
          <p style={{ margin: 0, color: c.textMuted, fontSize: 13 }}>
            Update display info. Publish pushes changes live to the screen.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="loading-spinner" style={{ margin: "60px auto" }} />
      ) : (
        <>
          {/* Main Fields */}
          <div style={{ background: c.surface, border: `1.5px solid ${c.border}`, borderRadius: 20, padding: "20px 22px", marginBottom: 16 }}>
            <h3 style={{ margin: "0 0 16px", fontSize: 13, fontWeight: 800, color: c.textMuted, letterSpacing: "0.06em", textTransform: "uppercase" }}>
              📋 Display Information
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {FIELDS.map(({ key, label, placeholder }) => (
                <div key={key}>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 800, marginBottom: 6, color: c.textMuted, letterSpacing: "0.04em" }}>
                    {label}
                  </label>
                  <input
                    value={form[key] || ""}
                    onChange={(e) => update(key, e.target.value)}
                    placeholder={placeholder}
                    style={{
                      width: "100%", padding: "9px 14px", fontSize: 14,
                      fontFamily: font, border: `1.5px solid ${c.border}`,
                      borderRadius: 12, background: c.bg, color: c.text,
                      outline: "none", boxSizing: "border-box", transition: "border-color 0.15s",
                    }}
                    onFocus={(e) => e.target.style.borderColor = c.borderHover}
                    onBlur={(e) => e.target.style.borderColor = c.border}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Events */}
          <div style={{ background: c.surface, border: `1.5px solid ${c.border}`, borderRadius: 20, padding: "20px 22px", marginBottom: 20 }}>
            <h3 style={{ margin: "0 0 14px", fontSize: 13, fontWeight: 800, color: c.textMuted, letterSpacing: "0.06em", textTransform: "uppercase" }}>
              📅 Upcoming Events
            </h3>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
              {(form.events || []).map((ev, idx) => (
                <div key={idx} style={{
                  display: "flex", alignItems: "center", gap: 6,
                  background: c.tag, border: `1.5px solid ${c.border}`,
                  borderRadius: 999, padding: "5px 12px",
                }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: c.text }}>{ev}</span>
                  <button onClick={() => removeEvent(idx)} style={{
                    background: "none", border: "none", cursor: "pointer",
                    color: c.textSubtle, fontSize: 13, padding: 0, lineHeight: 1,
                  }}>✕</button>
                </div>
              ))}
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <input
                value={newEvent}
                onChange={(e) => setNewEvent(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addEvent()}
                placeholder="Add event (e.g. Tech Fest)..."
                style={{
                  flex: 1, padding: "9px 14px", fontSize: 14, fontFamily: font,
                  border: `1.5px solid ${c.border}`, borderRadius: 12,
                  background: c.bg, color: c.text, outline: "none", transition: "border-color 0.15s",
                }}
                onFocus={(e) => e.target.style.borderColor = c.borderHover}
                onBlur={(e) => e.target.style.borderColor = c.border}
              />
              <button onClick={addEvent} style={{
                padding: "9px 16px", fontSize: 13, fontWeight: 700, fontFamily: font,
                background: c.tag, color: c.text, border: `1.5px solid ${c.border}`,
                borderRadius: 12, cursor: "pointer", transition: "all 0.15s",
              }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = c.borderHover; e.currentTarget.style.transform = "translateY(-1px)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = c.border; e.currentTarget.style.transform = "translateY(0)"; }}
              >+ Add</button>
            </div>
          </div>

          {/* Preview */}
          <div style={{ background: "#000", borderRadius: 12, overflow: "hidden", marginBottom: 24, fontSize: 13 }}>
            <div style={{ background: "#000", color: "#fff", padding: "10px 20px", textAlign: "center", fontWeight: 800, fontSize: 18 }}>
              {form.collegeName || "College Name"}
            </div>
            <div style={{ background: "#ff9636", color: "#000", textAlign: "center", fontWeight: 700, padding: "6px", fontSize: 13 }}>
              {classname} {form.yearSemester} ACADEMIC YEAR: {form.academicYear}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1.5fr" }}>
              <div style={{ background: "#00c9a7", padding: "8px 12px", fontSize: 12, fontWeight: 700 }}>
                CLASS INCHARGE: {form.classIncharge}
              </div>
              <div style={{ background: "#f9f871", padding: "8px 12px", fontSize: 12, fontWeight: 700 }}>
                Hall: {form.lectureHall}
              </div>
              <div style={{ background: "#f9f871", padding: "8px 12px", fontSize: 12, fontWeight: 700 }}>
                🕐 Live Clock | Date
              </div>
            </div>
          </div>

          {/* Actions */}
          <div style={{ display: "flex", gap: 10 }}>
            <Btn onClick={handleSave} disabled={saving} variant="secondary">
              {saving ? "Saving..." : "💾 Save"}
            </Btn>
            <Btn onClick={handlePublish} disabled={publishing} variant="primary">
              {publishing ? "Publishing..." : "📡 Save & Publish to Display"}
            </Btn>
          </div>
        </>
      )}

      <style>{`@import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&display=swap');`}</style>
    </div>
  );
}

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
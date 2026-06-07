import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useToast } from "../components/Toast";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";

const FIELDS = [
  { key: "collegeName",    label: "College Name",        placeholder: "SPHOORTHY ENGINEERING COLLEGE", type: "text" },
  { key: "yearSemester",   label: "Year & Semester",     placeholder: "2ND YEAR B.TECH 1ST SEMESTER",  type: "text" },
  { key: "academicYear",   label: "Academic Year",       placeholder: "2024-2025",                      type: "text" },
  { key: "classIncharge",  label: "Class Incharge(s)",   placeholder: "DR. KAJA MASTHAN AND D. MAMATHA REDDY", type: "text" },
  { key: "lectureHall",    label: "Lecture Hall / Room", placeholder: "406",                            type: "text" },
];

export default function ClassSettings() {
  const { classname } = useParams();
  const nav = useNavigate();
  const { addToast, ToastContainer } = useToast();

  const [form, setForm] = useState({
    collegeName: "",
    yearSemester: "",
    academicYear: "",
    classIncharge: "",
    lectureHall: "",
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
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error("Save failed");
      addToast("Settings saved!", "success");
    } catch (err) {
      addToast(err.message, "error");
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = async () => {
    setPublishing(true);
    try {
      const res = await fetch(`${API_BASE}/api/settings/${classname}/publish`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error("Publish failed");
      addToast(`Settings published to ${classname} display!`, "success");
    } catch (err) {
      addToast(err.message, "error");
    } finally {
      setPublishing(false);
    }
  };

  return (
    <div style={{ maxWidth: 680, margin: "0 auto" }}>
      <ToastContainer />

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
        <button onClick={() => nav(-1)} className="btn-secondary" style={{ padding: "7px 14px", fontSize: 13 }}>
          ← Back
        </button>
        <div>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800 }}>⚙️ Class Settings — {classname}</h2>
          <p style={{ margin: 0, color: "var(--text-muted)", fontSize: 13 }}>
            Update display info. Publish pushes changes live to the screen.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="loading-spinner" style={{ margin: "60px auto" }} />
      ) : (
        <>
          {/* Main fields */}
          <div className="card" style={{ marginBottom: 20 }}>
            <h3 style={{ margin: "0 0 16px", fontSize: 15, fontWeight: 700 }}>📋 Display Information</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {FIELDS.map(({ key, label, placeholder }) => (
                <div key={key}>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 5, color: "var(--slate-600)" }}>
                    {label}
                  </label>
                  <input
                    value={form[key] || ""}
                    onChange={(e) => update(key, e.target.value)}
                    placeholder={placeholder}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Events */}
          <div className="card" style={{ marginBottom: 24 }}>
            <h3 style={{ margin: "0 0 14px", fontSize: 15, fontWeight: 700 }}>📅 Upcoming Events</h3>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
              {(form.events || []).map((ev, idx) => (
                <div key={idx} style={{
                  display: "flex", alignItems: "center", gap: 6,
                  background: "var(--blue-50)", border: "1px solid var(--blue-100)",
                  borderRadius: 8, padding: "5px 10px",
                }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: "var(--blue-600)" }}>{ev}</span>
                  <button onClick={() => removeEvent(idx)} style={{
                    background: "none", border: "none", cursor: "pointer",
                    color: "var(--text-muted)", fontSize: 14, padding: 0, lineHeight: 1,
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
                style={{ flex: 1 }}
              />
              <button onClick={addEvent} className="btn-secondary" style={{ flexShrink: 0 }}>
                + Add
              </button>
            </div>
          </div>

          {/* Preview */}
          <div style={{
            background: "#000", borderRadius: 10, overflow: "hidden",
            marginBottom: 24, fontSize: 13,
          }}>
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
            <button onClick={handleSave} className="btn-primary" disabled={saving}>
              {saving ? "Saving..." : "💾 Save"}
            </button>
            <button onClick={handlePublish} className="btn-accent" disabled={publishing}>
              {publishing ? "Publishing..." : "📡 Save & Publish to Display"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

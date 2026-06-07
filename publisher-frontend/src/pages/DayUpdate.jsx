import React, { useEffect, useState } from "react";
import { getTimetable, saveTimetable, publishTimetable } from "../utils/api";
import { useParams, useNavigate } from "react-router-dom";
import { useToast } from "../components/Toast";

const c = {
  bg: "#f5f4f0", surface: "#ffffff", border: "#e2e0d8",
  borderHover: "#c8c5ba", text: "#1a1917", textMuted: "#7a7670",
  textSubtle: "#b0ada6", accent: "#2d2b28", accentHover: "#454340",
  tag: "#eeece7", tagText: "#6b6760",
};

const font = "'Nunito', 'Helvetica Neue', sans-serif";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export default function DayUpdate() {
  const { classname, day } = useParams();
  const nav = useNavigate();
  const [data, setData] = useState(null);
  const [publishing, setPublishing] = useState(false);
  const [saving, setSaving] = useState(false);
  const { addToast, ToastContainer } = useToast();

  useEffect(() => {
    getTimetable(classname).then((d) => {
      if (!d || !d.week) addToast("No timetable found — create one first", "warning");
      setData(d);
    }).catch((e) => {
      console.error(e);
      addToast("Failed to load timetable", "error");
    });
  }, [classname]);

  const updateCell = (idx, value) => {
    setData((prev) => {
      const next = { ...prev, week: { ...prev.week } };
      next.week[day] = [...next.week[day]];
      next.week[day][idx] = value;
      next.updatedAt = new Date().toISOString();
      return next;
    });
  };

  const onSave = async () => {
    setSaving(true);
    try {
      await saveTimetable(classname, data);
      addToast(`${day} saved!`, "success");
    } catch (err) {
      addToast("Save failed: " + err.message, "error");
    } finally { setSaving(false); }
  };

  const onPublishDay = async () => {
    setPublishing(true);
    try {
      await saveTimetable(classname, data);
      await publishTimetable(classname, data);
      addToast(`${day} updated & published to displays!`, "success");
    } catch (err) {
      addToast("Publish failed: " + err.message, "error");
    } finally { setPublishing(false); }
  };

  if (!data) return (
    <div style={{ textAlign: "center", padding: 40, fontFamily: font }}>
      <div className="loading-spinner" />
      <p style={{ color: c.textMuted, marginTop: 12 }}>Loading timetable...</p>
    </div>
  );

  if (!data.week) return (
    <div style={{ maxWidth: 800, margin: "0 auto", fontFamily: font }}>
      <ToastContainer />
      <h2 style={{ color: c.text }}>Day Update — {classname}</h2>
      <p style={{ color: c.textMuted }}>No timetable data available.</p>
    </div>
  );

  return (
    <div style={{ maxWidth: 800, margin: "0 auto", fontFamily: font, color: c.text }}>
      <ToastContainer />

      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ margin: "0 0 4px", fontSize: 22, fontWeight: 800, color: c.text }}>
          Day Update — {classname}
        </h2>
        <p style={{ margin: 0, fontSize: 13, color: c.textMuted }}>
          Edit subjects for a single day and publish instantly.
        </p>
      </div>

      {/* Day Tabs */}
      <div style={{ display: "flex", gap: 6, marginBottom: 20, flexWrap: "wrap" }}>
        {DAYS.map((d) => {
          const active = d === day;
          return (
            <button
              key={d}
              onClick={() => nav(`/day/${classname}/${d}`)}
              style={{
                padding: "7px 16px", fontSize: 13, fontWeight: 700,
                fontFamily: font, cursor: "pointer",
                borderRadius: "999px",
                border: `1.5px solid ${active ? c.accent : c.border}`,
                background: active ? c.accent : c.surface,
                color: active ? "#fff" : c.textMuted,
                transition: "all 0.15s",
              }}
              onMouseEnter={(e) => { if (!active) { e.currentTarget.style.borderColor = c.borderHover; e.currentTarget.style.color = c.text; } }}
              onMouseLeave={(e) => { if (!active) { e.currentTarget.style.borderColor = c.border; e.currentTarget.style.color = c.textMuted; } }}
            >
              {d}
            </button>
          );
        })}
      </div>

      {/* Period Inputs */}
      <div style={{
        background: c.surface, border: `1.5px solid ${c.border}`,
        borderRadius: 20, padding: "20px 22px", marginBottom: 20,
      }}>
        <h3 style={{ margin: "0 0 16px", fontSize: 13, fontWeight: 800, color: c.textMuted, letterSpacing: "0.06em", textTransform: "uppercase" }}>
          📅 {day} — Periods
        </h3>
        {data.periods.map((p, idx) => (
          <div key={idx} style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 10 }}>
            <div style={{
              minWidth: 140, fontSize: 12, fontWeight: 700, color: c.textSubtle,
              background: c.tag, padding: "6px 10px", borderRadius: 8,
              letterSpacing: "0.02em",
            }}>{p}</div>
            <input
              value={data.week[day]?.[idx] || ""}
              onChange={(e) => updateCell(idx, e.target.value)}
              placeholder="Subject"
              style={{
                flex: 1, padding: "9px 14px", fontSize: 14, fontFamily: font,
                border: `1.5px solid ${c.border}`, borderRadius: 12,
                background: c.bg, color: c.text, outline: "none",
                transition: "border-color 0.15s",
              }}
              onFocus={(e) => e.target.style.borderColor = c.borderHover}
              onBlur={(e) => e.target.style.borderColor = c.border}
            />
          </div>
        ))}
      </div>

      {/* Actions */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <Btn onClick={() => nav(-1)} variant="ghost">← Back</Btn>
        <Btn onClick={onSave} disabled={saving} variant="secondary">
          {saving ? "Saving..." : "💾 Save"}
        </Btn>
        <Btn onClick={onPublishDay} disabled={publishing} variant="primary">
          {publishing ? "Publishing..." : "📡 Publish Day"}
        </Btn>
      </div>

      <style>{`@import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&display=swap');`}</style>
    </div>
  );
}

function Btn({ onClick, disabled, variant = "ghost", children }) {
  const base = {
    padding: "9px 18px", fontSize: 13, fontWeight: 800,
    fontFamily: font, cursor: "pointer", borderRadius: 12,
    border: "1.5px solid", transition: "all 0.15s",
    opacity: disabled ? 0.6 : 1,
  };
  const variants = {
    primary: { background: c.accent, color: "#fff", borderColor: c.accent },
    secondary: { background: c.surface, color: c.text, borderColor: c.border },
    ghost: { background: c.tag, color: c.textMuted, borderColor: c.border },
  };
  return (
    <button onClick={onClick} disabled={disabled} style={{ ...base, ...variants[variant] }}
      onMouseEnter={(e) => { if (!disabled) e.currentTarget.style.transform = "translateY(-1px)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; }}
    >{children}</button>
  );
}
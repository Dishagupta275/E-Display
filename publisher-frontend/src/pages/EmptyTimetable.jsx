import React, { useEffect, useState, useRef } from "react";
import { getTimetable, saveTimetable, publishTimetable } from "../utils/api";
import { useParams } from "react-router-dom";
import { useToast } from "../components/Toast";

const c = {
  bg: "#f5f4f0", surface: "#ffffff", border: "#e2e0d8",
  borderHover: "#c8c5ba", text: "#1a1917", textMuted: "#7a7670",
  textSubtle: "#b0ada6", accent: "#2d2b28", accentHover: "#454340",
  tag: "#eeece7", tagText: "#6b6760",
};
const font = "'Nunito', 'Helvetica Neue', sans-serif";

const DEFAULT_PERIODS = [
  "9:00am-10:00am", "10:00am-10:50am", "10:50-11:00",
  "11:00am-11:50am", "11:50am-12:40pm", "12:40-1:30",
  "1:30pm-2:20pm", "2:20pm-3:10pm", "3:10pm-4:00pm",
];

export default function EmptyTimetable() {
  const { classname } = useParams();
  const [data, setData] = useState(null);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const originalRef = useRef(null);
  const { addToast, ToastContainer } = useToast();

  useEffect(() => {
    getTimetable(classname)
      .then((d) => {
        if (!d || !d.week) {
          const empty = makeEmptyData();
          setData(empty);
          originalRef.current = JSON.stringify(empty);
        } else {
          setData(d);
          originalRef.current = JSON.stringify(d);
        }
      })
      .catch(() => {
        const empty = makeEmptyData();
        setData(empty);
        originalRef.current = JSON.stringify(empty);
      });
  }, [classname]);

  const makeEmptyData = () => ({
    class: classname,
    updatedAt: new Date().toISOString(),
    periods: DEFAULT_PERIODS,
    week: {
      Monday: Array(DEFAULT_PERIODS.length).fill(""),
      Tuesday: Array(DEFAULT_PERIODS.length).fill(""),
      Wednesday: Array(DEFAULT_PERIODS.length).fill(""),
      Thursday: Array(DEFAULT_PERIODS.length).fill(""),
      Friday: Array(DEFAULT_PERIODS.length).fill(""),
      Saturday: Array(DEFAULT_PERIODS.length).fill(""),
    },
  });

  const updateCell = (day, idx, value) => {
    setData((prev) => {
      const next = { ...prev, week: { ...prev.week } };
      next.week[day] = [...next.week[day]];
      next.week[day][idx] = value;
      next.updatedAt = new Date().toISOString();
      return next;
    });
    setHasChanges(true);
  };

  const onSave = async () => {
    setSaving(true);
    try {
      await saveTimetable(classname, data);
      originalRef.current = JSON.stringify(data);
      setHasChanges(false);
      addToast("Timetable saved successfully!", "success");
    } catch (err) { addToast("Save failed: " + err.message, "error"); }
    finally { setSaving(false); }
  };

  const onPublish = async () => {
    setPublishing(true);
    try {
      await publishTimetable(classname, data);
      originalRef.current = JSON.stringify(data);
      setHasChanges(false);
      addToast("Published to displays via MQTT!", "success");
    } catch (err) { addToast("Publish failed: " + err.message, "error"); }
    finally { setPublishing(false); }
  };

  const onClearAll = () => {
    if (!data) return;
    setData((prev) => {
      const next = { ...prev, week: { ...prev.week } };
      Object.keys(next.week).forEach((day) => {
        next.week[day] = Array(prev.periods.length).fill("");
      });
      next.updatedAt = new Date().toISOString();
      return next;
    });
    setHasChanges(true);
    addToast("All subjects cleared", "info");
  };

  if (!data) return (
    <div style={{ textAlign: "center", padding: 40, fontFamily: font }}>
      <div className="loading-spinner" />
      <p style={{ color: c.textMuted, marginTop: 12 }}>Loading timetable...</p>
    </div>
  );

  return (
    <div style={{ maxWidth: 1000, margin: "0 auto", fontFamily: font, color: c.text }}>
      <ToastContainer />

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 24 }}>
        <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: c.text }}>
          Empty Timetable — {classname}
        </h2>
        {hasChanges && (
          <span style={{
            padding: "4px 12px", borderRadius: 999, fontSize: 12, fontWeight: 700,
            background: "#fef3c7", color: "#92400e",
            border: "1.5px solid #fde68a",
          }}>
            Unsaved changes
          </span>
        )}
      </div>

      {/* Days */}
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {Object.keys(data.week).map((day) => (
          <div key={day} style={{
            background: c.surface, border: `1.5px solid ${c.border}`,
            borderRadius: 20, padding: "18px 20px",
          }}>
            <h4 style={{
              margin: "0 0 14px", fontSize: 13, fontWeight: 800,
              color: c.textMuted, letterSpacing: "0.06em", textTransform: "uppercase",
            }}>{day}</h4>

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              {data.periods.map((p, idx) => (
                <div key={idx} style={{ display: "flex", flexDirection: "column", minWidth: 155 }}>
                  <div style={{
                    fontSize: 11, fontWeight: 700, color: c.textSubtle,
                    background: c.tag, padding: "4px 8px", borderRadius: 8,
                    marginBottom: 5, letterSpacing: "0.02em",
                  }}>{p}</div>
                  <input
                    value={data.week[day][idx]}
                    placeholder="Subject"
                    onChange={(e) => updateCell(day, idx, e.target.value)}
                    style={{
                      padding: "8px 10px", fontSize: 13, fontFamily: font,
                      border: `1.5px solid ${c.border}`, borderRadius: 10,
                      background: c.bg, color: c.text, outline: "none",
                      transition: "border-color 0.15s",
                    }}
                    onFocus={(e) => e.target.style.borderColor = c.borderHover}
                    onBlur={(e) => e.target.style.borderColor = c.border}
                  />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div style={{ marginTop: 20, display: "flex", gap: 8, flexWrap: "wrap" }}>
        <Btn onClick={onSave} disabled={saving} variant="secondary">
          {saving ? "Saving..." : "💾 Save"}
        </Btn>
        <Btn onClick={onPublish} disabled={publishing} variant="primary">
          {publishing ? "Publishing..." : "📡 Publish"}
        </Btn>
        <Btn onClick={onClearAll} variant="ghost">🗑️ Clear All</Btn>
      </div>

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
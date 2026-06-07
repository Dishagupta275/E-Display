import React, { useEffect, useState } from "react";
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

const DAY_ORDER = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export default function WeekUpdate() {
  const { classname } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const { addToast, ToastContainer } = useToast();

  useEffect(() => {
    getTimetable(classname)
      .then((d) => {
        if (!d || !d.week) addToast("No timetable found — create one from Empty Timetable first", "warning");
        setData(d);
      })
      .catch((e) => { console.error(e); addToast("Failed to load timetable", "error"); })
      .finally(() => setLoading(false));
  }, [classname]);

  const orderedDays = data?.week ? DAY_ORDER.filter((d) => d in data.week) : [];

  const updateCell = (day, idx, value) => {
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
      addToast("Timetable saved!", "success");
    } catch (err) { addToast("Save failed: " + err.message, "error"); }
    finally { setSaving(false); }
  };

  const onPublish = async () => {
    setPublishing(true);
    try {
      await saveTimetable(classname, data);
      await publishTimetable(classname, data);
      addToast("Week updated & published to displays!", "success");
    } catch (err) { addToast("Publish failed: " + err.message, "error"); }
    finally { setPublishing(false); }
  };

  if (loading) return (
    <div style={{ textAlign: "center", padding: 40, fontFamily: font }}>
      <div className="loading-spinner" />
      <p style={{ color: c.textMuted, marginTop: 12 }}>Loading timetable...</p>
    </div>
  );

  if (!data || !data.week) return (
    <div style={{ maxWidth: 1000, margin: "0 auto", fontFamily: font }}>
      <ToastContainer />
      <h2 style={{ color: c.text }}>Week Update — {classname}</h2>
      <p style={{ color: c.textMuted }}>No timetable data available. Please create an empty timetable first.</p>
    </div>
  );

  return (
    <div style={{ maxWidth: 1000, margin: "0 auto", fontFamily: font, color: c.text }}>
      <ToastContainer />

      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ margin: "0 0 4px", fontSize: 22, fontWeight: 800, color: c.text }}>
          Week Update — {classname}
        </h2>
        <p style={{ margin: 0, fontSize: 13, color: c.textMuted }}>
          Edit any slot in the week and publish when done.
        </p>
      </div>

      {/* Table */}
      <div style={{
        background: c.surface, border: `1.5px solid ${c.border}`,
        borderRadius: 20, overflow: "hidden", marginBottom: 20,
      }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: font }}>
            <thead>
              <tr style={{ background: c.tag }}>
                <th style={{
                  textAlign: "left", padding: "12px 16px",
                  fontSize: 11, fontWeight: 800, color: c.textMuted,
                  letterSpacing: "0.06em", textTransform: "uppercase",
                  borderBottom: `1.5px solid ${c.border}`, whiteSpace: "nowrap",
                }}>Period</th>
                {orderedDays.map((day) => (
                  <th key={day} style={{
                    textAlign: "left", padding: "12px 12px",
                    fontSize: 11, fontWeight: 800, color: c.textMuted,
                    letterSpacing: "0.06em", textTransform: "uppercase",
                    borderBottom: `1.5px solid ${c.border}`, whiteSpace: "nowrap",
                  }}>{day}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.periods.map((period, idx) => (
                <tr key={idx} style={{ borderBottom: `1.5px solid ${c.border}` }}
                  onMouseEnter={(e) => e.currentTarget.style.background = "#faf9f7"}
                  onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                >
                  <td style={{
                    padding: "10px 16px", fontSize: 11, fontWeight: 700,
                    color: c.textSubtle, whiteSpace: "nowrap",
                    background: c.tag, borderRight: `1.5px solid ${c.border}`,
                  }}>{period}</td>
                  {orderedDays.map((day) => (
                    <td key={day} style={{ padding: "8px 10px", verticalAlign: "top" }}>
                      <input
                        value={data.week[day][idx] || ""}
                        onChange={(e) => updateCell(day, idx, e.target.value)}
                        style={{
                          width: "100%", padding: "7px 10px", fontSize: 13,
                          fontFamily: font, border: `1.5px solid ${c.border}`,
                          borderRadius: 10, background: c.bg, color: c.text,
                          outline: "none", boxSizing: "border-box",
                          transition: "border-color 0.15s",
                        }}
                        onFocus={(e) => e.target.style.borderColor = c.borderHover}
                        onBlur={(e) => e.target.style.borderColor = c.border}
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: "flex", gap: 8 }}>
        <Btn onClick={onSave} disabled={saving} variant="secondary">
          {saving ? "Saving..." : "💾 Save Only"}
        </Btn>
        <Btn onClick={onPublish} disabled={publishing} variant="primary">
          {publishing ? "Publishing..." : "📡 Save & Publish"}
        </Btn>
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
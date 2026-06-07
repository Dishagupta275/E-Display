import React, { useEffect, useState } from "react";
import { getTimetable, saveTimetable, publishTimetable } from "../utils/api";
import { useParams } from "react-router-dom";
import { useToast } from "../components/Toast";

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
        if (!d || !d.week) {
          addToast("No timetable found — create one from Empty Timetable first", "warning");
        }
        setData(d);
      })
      .catch((e) => {
        console.error(e);
        addToast("Failed to load timetable", "error");
      })
      .finally(() => setLoading(false));
  }, [classname]);

  // Always iterate days in correct order
  const orderedDays = data?.week
    ? DAY_ORDER.filter((d) => d in data.week)
    : [];

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
    } catch (err) {
      addToast("Save failed: " + err.message, "error");
    } finally {
      setSaving(false);
    }
  };

  const onPublish = async () => {
    setPublishing(true);
    try {
      await saveTimetable(classname, data);
      await publishTimetable(classname, data);
      addToast("Week updated & published to displays!", "success");
    } catch (err) {
      addToast("Publish failed: " + err.message, "error");
    } finally {
      setPublishing(false);
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: 40 }}>
        <div className="loading-spinner" />
        <p style={{ color: "#888", marginTop: 12 }}>Loading timetable...</p>
      </div>
    );
  }

  if (!data || !data.week) {
    return (
      <div style={{ maxWidth: 1000, margin: "0 auto" }}>
        <ToastContainer />
        <h2>Week Update — {classname}</h2>
        <p style={{ color: "#888" }}>No timetable data available. Please create an empty timetable first.</p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 1000, margin: "0 auto" }}>
      <ToastContainer />
      <h2>Week Update — {classname}</h2>
      <p style={{ color: "#666" }}>Edit any slot in the week and publish when done.</p>

      <div style={{ overflowX: "auto", marginTop: 12 }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={thStyle}>Period</th>
              {orderedDays.map((day) => (
                <th key={day} style={thStyle}>{day}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.periods.map((period, idx) => (
              <tr key={idx}>
                <td style={tdStyle}>{period}</td>
                {orderedDays.map((day) => (
                  <td key={day} style={tdStyle}>
                    <input
                      value={data.week[day][idx] || ""}
                      onChange={(e) => updateCell(day, idx, e.target.value)}
                      style={{ width: "100%", padding: 6, borderRadius: 6, border: "1px solid #ddd" }}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ marginTop: 16, display: "flex", gap: 8 }}>
        <button onClick={onSave} style={saveBtn} disabled={saving}>
          {saving ? "Saving..." : "💾 Save Only"}
        </button>
        <button onClick={onPublish} style={primaryBtn} disabled={publishing}>
          {publishing ? "Publishing..." : "📡 Save & Publish"}
        </button>
      </div>
    </div>
  );
}

const thStyle = { textAlign: "left", padding: 8, borderBottom: "1px solid #eee", background: "#f8fafc", fontSize: 13, fontWeight: 700 };
const tdStyle = { padding: 8, borderBottom: "1px solid #f1f5f9", verticalAlign: "top" };
const primaryBtn = { padding: "9px 16px", background: "#8b5cf6", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontWeight: 600 };
const saveBtn = { padding: "9px 16px", background: "#0ea5e9", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontWeight: 600 };

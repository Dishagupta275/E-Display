import React, { useEffect, useState } from "react";
import { getTimetable, saveTimetable, publishTimetable } from "../utils/api";
import { useParams, useNavigate } from "react-router-dom";
import { useToast } from "../components/Toast";

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
      if (!d || !d.week) {
        addToast("No timetable found — create one first", "warning");
      }
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
    } finally {
      setSaving(false);
    }
  };

  const onPublishDay = async () => {
    setPublishing(true);
    try {
      await saveTimetable(classname, data);
      await publishTimetable(classname, data);
      addToast(`${day} updated & published to displays!`, "success");
    } catch (err) {
      addToast("Publish failed: " + err.message, "error");
    } finally {
      setPublishing(false);
    }
  };

  if (!data) {
    return (
      <div style={{ textAlign: "center", padding: 40 }}>
        <div className="loading-spinner" />
        <p style={{ color: "#888", marginTop: 12 }}>Loading timetable...</p>
      </div>
    );
  }

  if (!data.week) {
    return (
      <div style={{ maxWidth: 800, margin: "0 auto" }}>
        <ToastContainer />
        <h2>Day Update — {classname}</h2>
        <p style={{ color: "#888" }}>No timetable data available.</p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 800, margin: "0 auto" }}>
      <ToastContainer />

      <h2 style={{ marginBottom: 8 }}>Day Update — {classname}</h2>

      {/* ── Day Navigation Tabs ── */}
      <div style={{ display: "flex", gap: 4, marginBottom: 18, flexWrap: "wrap" }}>
        {DAYS.map((d) => (
          <button
            key={d}
            onClick={() => nav(`/day/${classname}/${d}`)}
            style={{
              padding: "7px 14px",
              borderRadius: 6,
              border: d === day ? "2px solid #0ea5e9" : "1px solid #cbd5e1",
              background: d === day ? "#0ea5e9" : "#fff",
              color: d === day ? "#fff" : "#374151",
              cursor: "pointer",
              fontWeight: d === day ? 700 : 500,
              fontSize: 13,
              transition: "all 0.15s",
            }}
          >
            {d}
          </button>
        ))}
      </div>

      {/* ── Period Inputs ── */}
      <div>
        {data.periods.map((p, idx) => (
          <div key={idx} style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 8 }}>
            <div style={{ minWidth: 130, color: "#555", fontSize: 14, fontWeight: 500 }}>{p}</div>
            <input
              value={data.week[day]?.[idx] || ""}
              onChange={(e) => updateCell(idx, e.target.value)}
              style={{
                flex: 1, padding: 9, borderRadius: 6,
                border: "1px solid #ddd", fontSize: 14,
              }}
              placeholder="Subject"
            />
          </div>
        ))}
      </div>

      {/* ── Action Buttons ── */}
      <div style={{ marginTop: 20, display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button onClick={() => nav(-1)} style={backBtn}>
          ← Back
        </button>
        <button onClick={onSave} style={saveBtn} disabled={saving}>
          {saving ? "Saving..." : "💾 Save"}
        </button>
        <button onClick={onPublishDay} style={publishBtn} disabled={publishing}>
          {publishing ? "Publishing..." : "📡 Publish Day"}
        </button>
      </div>
    </div>
  );
}

const backBtn = { padding: "9px 14px", background: "#f1f5f9", color: "#374151", border: "1px solid #cbd5e1", borderRadius: 6, cursor: "pointer", fontWeight: 600 };
const saveBtn = { padding: "9px 14px", background: "#0ea5e9", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontWeight: 600 };
const publishBtn = { padding: "9px 14px", background: "#8b5cf6", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontWeight: 600 };

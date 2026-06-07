import React, { useEffect, useState, useRef } from "react";
import { getTimetable, saveTimetable, publishTimetable } from "../utils/api";
import { useParams } from "react-router-dom";
import { useToast } from "../components/Toast";

/**
 * EmptyTimetable page loads an existing JSON (which may be empty strings for subjects)
 * and allows the publisher to fill subjects and save/publish.
 */

export default function EmptyTimetable() {
  const { classname } = useParams();
  const [data, setData] = useState(null);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const originalRef = useRef(null);
  const { addToast, ToastContainer } = useToast();

  // ✅ REQUIRED TIME SLOTS
  const DEFAULT_PERIODS = [
    "9:00am-10:00am",
    "10:00am-10:50am",
    "10:50-11:00",
    "11:00am-11:50am",
    "11:50am-12:40pm",
    "12:40-1:30",
    "1:30pm-2:20pm",
    "2:20pm-3:10pm",
    "3:10pm-4:00pm",
  ];

  useEffect(() => {
    getTimetable(classname)
      .then((d) => {
        // If empty response, create default structure
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
    } catch (err) {
      addToast("Save failed: " + err.message, "error");
    } finally {
      setSaving(false);
    }
  };

  const onPublish = async () => {
    setPublishing(true);
    try {
      await publishTimetable(classname, data);
      originalRef.current = JSON.stringify(data);
      setHasChanges(false);
      addToast("Published to displays via MQTT!", "success");
    } catch (err) {
      addToast("Publish failed: " + err.message, "error");
    } finally {
      setPublishing(false);
    }
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

  if (!data) {
    return (
      <div style={{ textAlign: "center", padding: 40 }}>
        <div className="loading-spinner" />
        <p style={{ color: "#888", marginTop: 12 }}>Loading timetable...</p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 1000, margin: "0 auto" }}>
      <ToastContainer />

      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <h2 style={{ margin: 0 }}>Empty Timetable — {classname}</h2>
        {hasChanges && (
          <span style={{
            padding: "3px 10px", borderRadius: 12, fontSize: 12, fontWeight: 600,
            background: "#fef3c7", color: "#92400e",
          }}>
            Unsaved changes
          </span>
        )}
      </div>

      <div style={{ marginTop: 12 }}>
        {Object.keys(data.week).map((day) => (
          <div key={day} style={{ marginBottom: 18 }}>
            <h4 style={{ marginBottom: 6 }}>{day}</h4>

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              {data.periods.map((p, idx) => (
                <div
                  key={idx}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    minWidth: 160,
                  }}
                >
                  <div style={{ fontSize: 12, color: "#555" }}>{p}</div>

                  <input
                    value={data.week[day][idx]}
                    placeholder="Subject"
                    onChange={(e) => updateCell(day, idx, e.target.value)}
                    style={{
                      padding: 8,
                      borderRadius: 6,
                      border: "1px solid #ccc",
                    }}
                  />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 20, display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button onClick={onSave} style={primaryBtn} disabled={saving}>
          {saving ? "Saving..." : "💾 Save"}
        </button>

        <button onClick={onPublish} style={publishBtn} disabled={publishing}>
          {publishing ? "Publishing..." : "📡 Publish"}
        </button>

        <button onClick={onClearAll} style={clearBtn}>
          🧹 Clear All
        </button>
      </div>
    </div>
  );
}

const primaryBtn = {
  padding: "9px 16px",
  background: "#0ea5e9",
  color: "#fff",
  border: "none",
  borderRadius: 6,
  cursor: "pointer",
  fontWeight: 600,
};

const publishBtn = {
  padding: "9px 16px",
  background: "#8b5cf6",
  color: "#fff",
  border: "none",
  borderRadius: 6,
  cursor: "pointer",
  fontWeight: 600,
};

const clearBtn = {
  padding: "9px 16px",
  background: "#fff",
  color: "#64748b",
  border: "1px solid #cbd5e1",
  borderRadius: 6,
  cursor: "pointer",
  fontWeight: 600,
};

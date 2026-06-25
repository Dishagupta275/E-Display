import React, { useEffect, useState } from "react";
import { getTimetable, saveTimetable, publishTimetable } from "../utils/api";
import { useParams } from "react-router-dom";

/**
 * EmptyTimetable page loads an existing JSON (which may be empty strings for subjects)
 * and allows the publisher to fill subjects and save/publish.
 */

export default function EmptyTimetable() {
  const { classname } = useParams();
  const [data, setData] = useState(null);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);

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
      .then((d) => setData(d))
      .catch(() => {
        // create a new empty structure if not found
        setData({
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
      });
  }, [classname]);

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
    await saveTimetable(classname, data);
    setSaving(false);
    alert("Saved locally");
  };

  const onPublish = async () => {
    setPublishing(true);
    await publishTimetable(classname, data);
    setPublishing(false);
    alert("Published via backend to MQTT");
  };

  if (!data) return <div>Loading...</div>;

  return (
    <div style={{ maxWidth: 1000, margin: "0 auto" }}>
      <h2>Empty Timetable — {classname}</h2>

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

      <div style={{ marginTop: 20 }}>
        <button
          onClick={onSave}
          style={primaryBtn}
          disabled={saving}
        >
          {saving ? "Saving..." : "Save"}
        </button>

        <button
          onClick={onPublish}
          style={secondaryBtn}
          disabled={publishing}
        >
          {publishing ? "Publishing..." : "Publish"}
        </button>
      </div>
    </div>
  );
}

const primaryBtn = {
  padding: "8px 14px",
  marginRight: 8,
  background: "#0ea5e9",
  color: "#fff",
  border: "none",
  borderRadius: 6,
  cursor: "pointer",
};

const secondaryBtn = {
  padding: "8px 14px",
  background: "#e2e8f0",
  color: "#000",
  border: "none",
  borderRadius: 6,
  cursor: "pointer",
};

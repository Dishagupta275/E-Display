import { useEffect, useState } from "react";
import { timetableAPI, subjectsAPI, classesAPI } from "../utils/api";
import { useParams, useNavigate } from "react-router-dom";
import Layout from "../components/Layout";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export default function WeekUpdate() {
  const { classId } = useParams();
  const nav = useNavigate();

  const [timetable, setTimetable]   = useState({});
  const [timings, setTimings]       = useState([]);
  const [subjects, setSubjects]     = useState([]);
  const [classInfo, setClassInfo]   = useState(null);
  const [loading, setLoading]       = useState(true);
  const [saving, setSaving]         = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [saveMsg, setSaveMsg]       = useState(null);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [ttRes, timingsRes, classesRes] = await Promise.all([
          timetableAPI.get(classId),
          timetableAPI.getTimings(),
          classesAPI.getAll(),
        ]);

        const tt = ttRes.data?.timetable || ttRes.data || {};
        setTimetable(tt);
        setTimings(timingsRes.data || []);

        const allClasses = [];
        Object.values(classesRes.data || {}).forEach((dept) => {
          Object.values(dept).forEach((yearList) => allClasses.push(...yearList));
        });
        const cls = allClasses.find((c) => c.id === parseInt(classId));
        if (cls) {
          setClassInfo(cls);
          const subjRes = await subjectsAPI.getByDept(cls.department_id, cls.year);
          setSubjects(subjRes.data || []);
        }
      } catch (e) {
        console.error(e);
        alert("Failed to load timetable. Make sure period timings are set first.");
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, [classId]);

  const updateSlot = (day, periodNumber, subjectId) => {
    setTimetable((prev) => {
      const daySlots = [...(prev[day] || [])];
      const idx = daySlots.findIndex((s) => s.period_number === periodNumber);
      if (idx >= 0) {
        daySlots[idx] = { ...daySlots[idx], subject_id: subjectId };
      } else {
        daySlots.push({ period_number: periodNumber, subject_id: subjectId, slot_type: "subject" });
      }
      return { ...prev, [day]: daySlots };
    });
  };

  const buildSlotsArray = () => {
    const slots = [];
    DAYS.forEach((day) => {
      (timetable[day] || []).forEach((slot) => {
        slots.push({
          day,
          period_number: slot.period_number,
          slot_type:     slot.subject_id ? "subject" : "free",
          subject_id:    slot.subject_id || null,
          faculty_id:    slot.faculty_id || null,
          room_number:   slot.room_number || null,
        });
      });
    });
    return slots;
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveMsg(null);
    try {
      const slots = buildSlotsArray();
      await timetableAPI.save(classId, slots);
      setSaveMsg({ type: "success", text: "✅ Timetable saved successfully!" });
    } catch (e) {
      setSaveMsg({ type: "error", text: "❌ Failed to save: " + (e?.response?.data?.message || e.message) });
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = async () => {
    setPublishing(true);
    setSaveMsg(null);
    try {
      await timetableAPI.save(classId, buildSlotsArray());
      const pubRes = await timetableAPI.publish(classId);
      const liveSent = pubRes?.data?.live_update_sent;
      setSaveMsg({
        type: liveSent === false ? "warn" : "success",
        text: liveSent === false
          ? "⚠️ Saved, but the live display update may be delayed (MQTT was reconnecting). It will catch up shortly, or refresh the display to be sure."
          : "📡 Timetable saved and published to display!",
      });
    } catch (e) {
      setSaveMsg({ type: "error", text: "❌ Failed to publish: " + (e?.response?.data?.message || e.message) });
    } finally {
      setPublishing(false);
    }
  };

  if (loading) {
    return (
      <Layout pageTitle="🗓 Timetable Editor">
        <div style={s.page}>
          <div style={s.center}>
            <div style={s.spinner} />
            <p style={{ color: "#6b7280", marginTop: 16 }}>Loading timetable…</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (timings.length === 0) {
    return (
      <Layout pageTitle="🗓 Timetable Editor">
        <div style={s.page}>
          <div style={s.noTimings}>
            <p style={{ fontSize: 48, margin: 0 }}>⏰</p>
            <h3 style={s.noTimingsTitle}>No Period Timings Set</h3>
            <p style={s.noTimingsBody}>
              Ask the Principal to set period timings first before editing timetables.
            </p>
            <button onClick={() => nav("/timings")} style={s.publishBtn}>
              Go to Timings →
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout pageTitle={`🗓 Timetable Editor — ${classInfo?.display_name || `Class ${classId}`}`}>
      <div style={s.page}>

        {saveMsg && (
          <div style={{ ...s.msgBanner, ...MSG_STYLES[saveMsg.type] }}>
            {saveMsg.text}
          </div>
        )}

        {subjects.length === 0 && (
          <div style={s.warnBanner}>
            ⚠️ No subjects found for this class. Add subjects first to assign them to periods.
          </div>
        )}

        <div style={s.actions}>
          <button onClick={handleSave} disabled={saving} style={s.saveBtn}>
            {saving ? "Saving…" : "💾 Save Timetable"}
          </button>
          <button onClick={handlePublish} disabled={publishing} style={s.publishBtn}>
            {publishing ? "Publishing…" : "📡 Save & Publish to Display"}
          </button>
        </div>

        <div style={s.tableWrapper}>
          <table style={s.table}>
            <thead>
              <tr>
                <th style={s.th}>Period / Time</th>
                {DAYS.map((day) => (
                  <th key={day} style={s.th}>{day}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {timings.map((timing) => {
                const isBreak = timing.label === "Break" ||
                                timing.label === "Lunch" ||
                                timing.slot_type === "break";
                return (
                  <tr key={timing.period_number}>
                    <td style={s.periodCell}>
                      <div style={s.periodNum}>P{timing.period_number}</div>
                      <div style={s.periodTime}>
                        {timing.start_time} – {timing.end_time}
                      </div>
                      {timing.label && (
                        <div style={s.periodLabel}>{timing.label}</div>
                      )}
                    </td>

                    {DAYS.map((day) => {
                      const slot = (timetable[day] || []).find(
                        (s) => s.period_number === timing.period_number
                      );
                      return (
                        <td
                          key={day}
                          style={{ ...s.td, background: isBreak ? "#f9fafb" : "#fff" }}
                        >
                          {isBreak ? (
                            <div style={s.breakLabel}>{timing.label}</div>
                          ) : (
                            <select
                              value={slot?.subject_id || ""}
                              onChange={(e) =>
                                updateSlot(
                                  day,
                                  timing.period_number,
                                  e.target.value ? parseInt(e.target.value) : null
                                )
                              }
                              style={s.select}
                            >
                              <option value="">— Free —</option>
                              {subjects.map((subj) => (
                                <option key={subj.id} value={subj.id}>
                                  {subj.code} — {subj.name}
                                </option>
                              ))}
                            </select>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div style={{ ...s.actions, marginTop: 20, marginBottom: 0 }}>
          <button onClick={handleSave} disabled={saving} style={s.saveBtn}>
            {saving ? "Saving…" : "💾 Save Timetable"}
          </button>
          <button onClick={handlePublish} disabled={publishing} style={s.publishBtn}>
            {publishing ? "Publishing…" : "📡 Save & Publish to Display"}
          </button>
        </div>

      </div>
    </Layout>
  );
}

const MSG_STYLES = {
  success: { background: "#dcfce7", color: "#16a34a", border: "1px solid #86efac" },
  warn:    { background: "#fffbeb", color: "#92400e", border: "1px solid #fcd34d" },
  error:   { background: "#fee2e2", color: "#991b1b", border: "1px solid #fca5a5" },
};

const s = {
  page: {
    minHeight: "100vh",
    background: "#f0f2f5",
    padding: "28px 32px",
    fontFamily: "'Segoe UI', Arial, sans-serif",
  },
  center: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "80px 0",
  },
  spinner: {
    width: 36,
    height: 36,
    border: "3px solid #e5e7eb",
    borderTop: "3px solid #1e3a8a",
    borderRadius: "50%",
    animation: "spin 0.8s linear infinite",
  },
  noTimings: {
    textAlign: "center",
    padding: "80px 32px",
    background: "#fff",
    border: "1px solid #e5e7eb",
    borderRadius: 12,
    boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
  },
  noTimingsTitle: { color: "#1e3a8a", margin: "12px 0 6px", fontSize: 18 },
  noTimingsBody: { color: "#6b7280", margin: 0, fontSize: 14 },
  actions: { display: "flex", gap: 12, marginBottom: 20 },
  saveBtn: {
    padding: "10px 24px", background: "#fff", color: "#1e3a8a",
    border: "1px solid #1e3a8a", borderRadius: 8, cursor: "pointer",
    fontWeight: 600, fontSize: 14,
  },
  publishBtn: {
    padding: "10px 24px", background: "#1e3a8a", color: "#fff",
    border: "none", borderRadius: 8, cursor: "pointer",
    fontWeight: 600, fontSize: 14,
  },
  msgBanner: { borderRadius: 8, padding: "12px 16px", marginBottom: 16, fontSize: 14, fontWeight: 500 },
  warnBanner: {
    background: "#fffbeb", border: "1px solid #fcd34d", color: "#92400e",
    borderRadius: 8, padding: "12px 16px", marginBottom: 16, fontSize: 13,
  },
  tableWrapper: {
    overflowX: "auto", background: "#fff", border: "1px solid #e5e7eb",
    borderRadius: 12, boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
  },
  table: { width: "100%", borderCollapse: "collapse", minWidth: 900 },
  th: {
    padding: "12px 8px", background: "#1e3a8a", color: "#fff", textAlign: "center",
    fontSize: 13, fontWeight: 600, borderRight: "1px solid rgba(255,255,255,0.12)",
  },
  td: { padding: 6, borderBottom: "1px solid #f0f0f0", borderRight: "1px solid #f0f0f0", verticalAlign: "middle" },
  periodCell: {
    padding: "8px 12px", textAlign: "center", background: "#f8fafc",
    borderRight: "2px solid #e5e7eb", minWidth: 100,
  },
  periodNum: { fontWeight: 700, color: "#1e3a8a", fontSize: 14 },
  periodTime: { fontSize: 11, color: "#6b7280", marginTop: 2 },
  periodLabel: { fontSize: 10, color: "#dc2626", fontWeight: 600, marginTop: 2 },
  breakLabel: { textAlign: "center", color: "#9ca3af", fontSize: 12, fontStyle: "italic", padding: "8px 0" },
  select: {
    width: "100%", padding: "6px 4px", borderRadius: 6,
    border: "1px solid #d1d5db", fontSize: 12, background: "#fff", color: "#111827",
  },
};
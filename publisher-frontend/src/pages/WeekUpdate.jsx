import { useEffect, useState } from "react";
import { timetableAPI, subjectsAPI, classesAPI } from "../utils/api";
import { useParams, useNavigate } from "react-router-dom";

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

        // ✅ backend returns { class_id, class_name, timetable: {...} }
        const tt = ttRes.data?.timetable || ttRes.data || {};
        setTimetable(tt);
        setTimings(timingsRes.data || []);

        // Find class info
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

  // Update a single slot's subject
  const updateSlot = (day, periodNumber, subjectId) => {
    setTimetable((prev) => {
      const daySlots = [...(prev[day] || [])];
      const idx = daySlots.findIndex((s) => s.period_number === periodNumber);
      if (idx >= 0) {
        daySlots[idx] = { ...daySlots[idx], subject_id: subjectId };
      } else {
        // slot doesn't exist yet, create it
        daySlots.push({ period_number: periodNumber, subject_id: subjectId, slot_type: "subject" });
      }
      return { ...prev, [day]: daySlots };
    });
  };

  // ✅ backend expects a plain ARRAY not { slots: [...] }
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
      // ✅ pass array directly — api.js wraps it as { slots } but backend wants raw array
      // So we call api directly here
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
      // Save first, then publish
      await timetableAPI.save(classId, buildSlotsArray());
      await timetableAPI.publish(classId);
      setSaveMsg({ type: "success", text: "📡 Timetable saved and published to display!" });
    } catch (e) {
      setSaveMsg({ type: "error", text: "❌ Failed to publish: " + (e?.response?.data?.message || e.message) });
    } finally {
      setPublishing(false);
    }
  };

  if (loading) return <div style={s.loading}>Loading timetable…</div>;

  // If no timings set yet
  if (timings.length === 0) return (
    <div style={s.container}>
      <div style={s.header}>
        <div>
          <h1 style={s.title}>E-DISPLAY</h1>
          <p style={s.subtitle}>Timetable Editor</p>
        </div>
        <button onClick={() => nav("/timetable")} style={s.backBtn}>← Back</button>
      </div>
      <div style={s.noTimings}>
        <p style={{ fontSize: 48 }}>⏰</p>
        <h3 style={{ color: "#1a237e" }}>No Period Timings Set</h3>
        <p style={{ color: "#666" }}>
          Ask the Principal to set period timings first before editing timetables.
        </p>
        <button onClick={() => nav("/timings")} style={s.publishBtn}>
          Go to Timings →
        </button>
      </div>
    </div>
  );

  return (
    <div style={s.container}>

      {/* Header */}
      <div style={s.header}>
        <div>
          <h1 style={s.title}>E-DISPLAY</h1>
          <p style={s.subtitle}>
            Timetable Editor — {classInfo?.display_name || `Class ${classId}`}
          </p>
        </div>
        <button onClick={() => nav("/timetable")} style={s.backBtn}>← Back</button>
      </div>

      <div style={s.content}>

        {/* Save message */}
        {saveMsg && (
          <div style={{
            ...s.msgBanner,
            background: saveMsg.type === "success" ? "#e8f5e9" : "#fee2e2",
            color:      saveMsg.type === "success" ? "#2e7d32" : "#991b1b",
            border:     `1px solid ${saveMsg.type === "success" ? "#a5d6a7" : "#fca5a5"}`,
          }}>
            {saveMsg.text}
          </div>
        )}

        {/* No subjects warning */}
        {subjects.length === 0 && (
          <div style={s.warnBanner}>
            ⚠️ No subjects found for this class. Add subjects first to assign them to periods.
          </div>
        )}

        {/* Action buttons */}
        <div style={s.actions}>
          <button onClick={handleSave} disabled={saving} style={s.saveBtn}>
            {saving ? "Saving…" : "💾 Save Timetable"}
          </button>
          <button onClick={handlePublish} disabled={publishing} style={s.publishBtn}>
            {publishing ? "Publishing…" : "📡 Save & Publish to Display"}
          </button>
        </div>

        {/* Timetable grid */}
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
                    {/* Period info cell */}
                    <td style={s.periodCell}>
                      <div style={s.periodNum}>P{timing.period_number}</div>
                      <div style={s.periodTime}>
                        {timing.start_time} – {timing.end_time}
                      </div>
                      {timing.label && (
                        <div style={s.periodLabel}>{timing.label}</div>
                      )}
                    </td>

                    {/* Day cells */}
                    {DAYS.map((day) => {
                      const slot = (timetable[day] || []).find(
                        (s) => s.period_number === timing.period_number
                      );
                      return (
                        <td
                          key={day}
                          style={{ ...s.td, background: isBreak ? "#f3f4f6" : "#fff" }}
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

        {/* Bottom actions */}
        <div style={{ ...s.actions, marginTop: 20 }}>
          <button onClick={handleSave} disabled={saving} style={s.saveBtn}>
            {saving ? "Saving…" : "💾 Save Timetable"}
          </button>
          <button onClick={handlePublish} disabled={publishing} style={s.publishBtn}>
            {publishing ? "Publishing…" : "📡 Save & Publish to Display"}
          </button>
        </div>

      </div>
    </div>
  );
}

const s = {
  container:   { minHeight: "100vh", background: "#f0f4f8", fontFamily: "sans-serif" },
  header:      { background: "linear-gradient(135deg, #1a237e, #0d47a1)", color: "#fff", padding: "20px 32px", display: "flex", justifyContent: "space-between", alignItems: "center" },
  title:       { margin: 0, fontSize: 24, fontWeight: 800, letterSpacing: 2 },
  subtitle:    { margin: "4px 0 0", fontSize: 13, opacity: 0.8 },
  backBtn:     { padding: "8px 16px", background: "rgba(255,255,255,0.2)", color: "#fff", border: "1px solid rgba(255,255,255,0.4)", borderRadius: 6, cursor: "pointer" },
  content:     { padding: "24px 32px" },
  loading:     { textAlign: "center", padding: 60, fontSize: 18, color: "#666" },
  noTimings:   { textAlign: "center", padding: 80, background: "#fff", margin: 32, borderRadius: 12, boxShadow: "0 2px 8px rgba(0,0,0,0.06)" },
  actions:     { display: "flex", gap: 12, marginBottom: 20 },
  saveBtn:     { padding: "10px 24px", background: "#fff", color: "#1a237e", border: "2px solid #1a237e", borderRadius: 8, cursor: "pointer", fontWeight: 600, fontSize: 14 },
  publishBtn:  { padding: "10px 24px", background: "#1a237e", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 600, fontSize: 14 },
  msgBanner:   { borderRadius: 8, padding: "12px 16px", marginBottom: 16, fontSize: 14, fontWeight: 500 },
  warnBanner:  { background: "#fff8e1", border: "1px solid #ffe082", color: "#856404", borderRadius: 8, padding: "12px 16px", marginBottom: 16, fontSize: 14 },
  tableWrapper:{ overflowX: "auto", background: "#fff", borderRadius: 10, boxShadow: "0 2px 8px rgba(0,0,0,0.06)" },
  table:       { width: "100%", borderCollapse: "collapse", minWidth: 900 },
  th:          { padding: "12px 8px", background: "#1a237e", color: "#fff", textAlign: "center", fontSize: 13, fontWeight: 600, borderRight: "1px solid rgba(255,255,255,0.1)" },
  td:          { padding: 6, borderBottom: "1px solid #f0f0f0", borderRight: "1px solid #f0f0f0", verticalAlign: "middle" },
  periodCell:  { padding: "8px 12px", textAlign: "center", background: "#f8fafc", borderRight: "2px solid #e0e0e0", minWidth: 100 },
  periodNum:   { fontWeight: 700, color: "#1a237e", fontSize: 14 },
  periodTime:  { fontSize: 11, color: "#666", marginTop: 2 },
  periodLabel: { fontSize: 10, color: "#e53935", fontWeight: 600, marginTop: 2 },
  breakLabel:  { textAlign: "center", color: "#9ca3af", fontSize: 12, fontStyle: "italic", padding: "8px 0" },
  select:      { width: "100%", padding: "6px 4px", borderRadius: 4, border: "1px solid #ddd", fontSize: 12, background: "#fff" },
};
import { useEffect, useState } from "react";
import { timetableAPI, subjectsAPI, classesAPI } from "../utils/api";
import { useParams, useNavigate } from "react-router-dom";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export default function DayUpdate() {
  const { classId } = useParams();
  const nav = useNavigate();

  const [timetable, setTimetable]   = useState({});
  const [timings, setTimings]       = useState([]);
  const [subjects, setSubjects]     = useState([]);
  const [classInfo, setClassInfo]   = useState(null);
  const [selectedDay, setSelectedDay] = useState("Monday");
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

        setTimetable(ttRes.data.timetable || {});
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
        alert("Failed to load timetable.");
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, [classId]);

  const updateSlot = (periodNumber, subjectId) => {
    setTimetable((prev) => {
      const daySlots = [...(prev[selectedDay] || [])];
      const idx = daySlots.findIndex((s) => s.period_number === periodNumber);
      if (idx >= 0) {
        daySlots[idx] = { ...daySlots[idx], subject_id: subjectId, slot_type: subjectId ? "subject" : "free" };
      } else {
        daySlots.push({ period_number: periodNumber, subject_id: subjectId, slot_type: subjectId ? "subject" : "free" });
      }
      return { ...prev, [selectedDay]: daySlots };
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
      await timetableAPI.save(classId, buildSlotsArray());
      setSaveMsg({ type: "success", text: "✅ Timetable saved!" });
    } catch (e) {
      setSaveMsg({ type: "error", text: "❌ " + (e?.response?.data?.message || e.message) });
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = async () => {
    setPublishing(true);
    setSaveMsg(null);
    try {
      await timetableAPI.save(classId, buildSlotsArray());
      await timetableAPI.publish(classId);
      setSaveMsg({ type: "success", text: "📡 Published to display!" });
    } catch (e) {
      setSaveMsg({ type: "error", text: "❌ " + (e?.response?.data?.message || e.message) });
    } finally {
      setPublishing(false);
    }
  };

  if (loading) return <div style={s.loading}>Loading timetable…</div>;

  const daySlots = timetable[selectedDay] || [];

  return (
    <div style={s.container}>

      {/* Header */}
      <div style={s.header}>
        <div>
          <h1 style={s.title}>E-DISPLAY</h1>
          <p style={s.subtitle}>
            Day Editor — {classInfo?.display_name || `Class ${classId}`}
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

        {/* Day selector tabs */}
        <div style={s.dayTabs}>
          {DAYS.map((day) => (
            <button
              key={day}
              onClick={() => setSelectedDay(day)}
              style={{
                ...s.dayTab,
                background:  selectedDay === day ? "#1a237e" : "#fff",
                color:       selectedDay === day ? "#fff"    : "#1a237e",
                borderColor: "#1a237e",
              }}
            >
              {day.slice(0, 3)}
            </button>
          ))}
        </div>

        {/* Day edit card */}
        <div style={s.card}>
          <h3 style={s.dayTitle}>{selectedDay}</h3>

          {timings.length === 0 ? (
            <p style={{ color: "#666", textAlign: "center", padding: 32 }}>
              No period timings set. Ask the Principal to set timings first.
            </p>
          ) : (
            <div style={s.periodList}>
              {timings.map((timing) => {
                const isBreak = timing.label === "Break" || timing.label === "Lunch";
                const slot    = daySlots.find((s) => s.period_number === timing.period_number);

                return (
                  <div
                    key={timing.period_number}
                    style={{ ...s.periodRow, background: isBreak ? "#f9fafb" : "#fff" }}
                  >
                    {/* Period info */}
                    <div style={s.periodInfo}>
                      <span style={s.periodNum}>P{timing.period_number}</span>
                      <span style={s.periodTime}>
                        {timing.start_time} – {timing.end_time}
                      </span>
                      {timing.label && (
                        <span style={s.periodLabelBadge}>{timing.label}</span>
                      )}
                    </div>

                    {/* Subject selector */}
                    <div style={s.periodSelect}>
                      {isBreak ? (
                        <span style={s.breakText}>{timing.label}</span>
                      ) : (
                        <select
                          value={slot?.subject_id || ""}
                          onChange={(e) =>
                            updateSlot(
                              timing.period_number,
                              e.target.value ? parseInt(e.target.value) : null
                            )
                          }
                          style={s.select}
                        >
                          <option value="">— Free Period —</option>
                          {subjects.map((subj) => (
                            <option key={subj.id} value={subj.id}>
                              {subj.code} — {subj.name}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Actions */}
        <div style={s.actions}>
          <button onClick={handleSave} disabled={saving} style={s.saveBtn}>
            {saving ? "Saving…" : "💾 Save"}
          </button>
          <button onClick={handlePublish} disabled={publishing} style={s.publishBtn}>
            {publishing ? "Publishing…" : "📡 Save & Publish"}
          </button>
        </div>

      </div>
    </div>
  );
}

const s = {
  container:       { minHeight: "100vh", background: "#f0f4f8", fontFamily: "sans-serif" },
  header:          { background: "linear-gradient(135deg, #1a237e, #0d47a1)", color: "#fff", padding: "20px 32px", display: "flex", justifyContent: "space-between", alignItems: "center" },
  title:           { margin: 0, fontSize: 24, fontWeight: 800, letterSpacing: 2 },
  subtitle:        { margin: "4px 0 0", fontSize: 13, opacity: 0.8 },
  backBtn:         { padding: "8px 16px", background: "rgba(255,255,255,0.2)", color: "#fff", border: "1px solid rgba(255,255,255,0.4)", borderRadius: 6, cursor: "pointer" },
  content:         { padding: "24px 32px" },
  loading:         { textAlign: "center", padding: 60, fontSize: 18, color: "#666" },
  msgBanner:       { borderRadius: 8, padding: "12px 16px", marginBottom: 16, fontSize: 14, fontWeight: 500 },
  dayTabs:         { display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" },
  dayTab:          { padding: "8px 18px", border: "1.5px solid", borderRadius: 8, cursor: "pointer", fontWeight: 600, fontSize: 14 },
  card:            { background: "#fff", borderRadius: 12, boxShadow: "0 2px 8px rgba(0,0,0,0.06)", padding: "20px 24px", marginBottom: 20 },
  dayTitle:        { fontSize: 18, fontWeight: 700, color: "#1a237e", margin: "0 0 16px" },
  periodList:      { display: "flex", flexDirection: "column", gap: 8 },
  periodRow:       { display: "flex", alignItems: "center", gap: 16, padding: "10px 14px", borderRadius: 8, border: "1px solid #f3f4f6" },
  periodInfo:      { display: "flex", alignItems: "center", gap: 10, minWidth: 200 },
  periodNum:       { fontWeight: 700, color: "#1a237e", fontSize: 15, minWidth: 30 },
  periodTime:      { fontSize: 13, color: "#6b7280" },
  periodLabelBadge:{ fontSize: 11, background: "#fee2e2", color: "#991b1b", padding: "2px 8px", borderRadius: 10, fontWeight: 600 },
  periodSelect:    { flex: 1 },
  select:          { width: "100%", padding: "8px 10px", borderRadius: 6, border: "1px solid #d1d5db", fontSize: 14, background: "#fff", outline: "none" },
  breakText:       { fontSize: 13, color: "#9ca3af", fontStyle: "italic" },
  actions:         { display: "flex", gap: 12 },
  saveBtn:         { padding: "10px 24px", background: "#fff", color: "#1a237e", border: "2px solid #1a237e", borderRadius: 8, cursor: "pointer", fontWeight: 600, fontSize: 14 },
  publishBtn:      { padding: "10px 24px", background: "#1a237e", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 600, fontSize: 14 },
};
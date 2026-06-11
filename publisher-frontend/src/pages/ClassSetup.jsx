import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { classesAPI } from "../utils/api";

export default function ClassSetup() {
  const { classId } = useParams();
  const nav = useNavigate();

  const [classInfo, setClassInfo]   = useState(null);
  const [faculty, setFaculty]       = useState([]);
  const [loading, setLoading]       = useState(true);
  const [saving, setSaving]         = useState(false);
  const [saveMsg, setSaveMsg]       = useState(null);

  // Editable fields
  const [form, setForm] = useState({
    display_name:      "",
    room_number:       "",
    section:           "",
    year:              "",
    class_incharge_id: "",
  });

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [classRes, facultyRes] = await Promise.all([
          classesAPI.getAll(),
          classesAPI.getFaculty(classId),
        ]);

        // Find this class from getAll response
        let found = null;
        Object.values(classRes.data || {}).forEach((dept) => {
          Object.values(dept).forEach((yearList) => {
            yearList.forEach((cls) => {
              if (cls.id === parseInt(classId)) found = cls;
            });
          });
        });

        if (found) {
          setClassInfo(found);
          setForm({
            display_name:      found.display_name      || "",
            room_number:       found.room_number        || "",
            section:           found.section            || "",
            year:              String(found.year)       || "1",
            class_incharge_id: found.class_incharge_id  ? String(found.class_incharge_id) : "",
          });
        }

        setFaculty(facultyRes.data || []);
      } catch (e) {
        console.error(e);
        setSaveMsg({ type: "error", text: "Failed to load class info." });
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, [classId]);

  const handleSave = async () => {
    setSaving(true);
    setSaveMsg(null);
    try {
      await classesAPI.update(classId, {
        display_name:      form.display_name,
        room_number:       form.room_number,
        section:           form.section,
        year:              parseInt(form.year),
        class_incharge_id: form.class_incharge_id ? parseInt(form.class_incharge_id) : null,
      });
      setSaveMsg({ type: "success", text: "✅ Class updated successfully!" });
    } catch (e) {
      setSaveMsg({
        type: "error",
        text: "❌ " + (e?.response?.data?.message || e.message),
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div style={s.loading}>Loading class info…</div>;

  if (!classInfo) return (
    <div style={s.container}>
      <div style={s.header}>
        <h1 style={s.title}>E-DISPLAY</h1>
        <button onClick={() => nav(-1)} style={s.backBtn}>← Back</button>
      </div>
      <div style={s.notFound}>
        <p style={{ fontSize: 40 }}>❌</p>
        <p style={{ color: "#666" }}>Class not found.</p>
      </div>
    </div>
  );

  return (
    <div style={s.container}>

      {/* Header */}
      <div style={s.header}>
        <div>
          <h1 style={s.title}>E-DISPLAY</h1>
          <p style={s.subtitle}>Class Setup — {classInfo.display_name}</p>
        </div>
        <button onClick={() => nav(-1)} style={s.backBtn}>← Back</button>
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

        {/* Class Info Card (read-only) */}
        <div style={s.card}>
          <p style={s.cardTitle}>📋 Class Information</p>
          <div style={s.infoGrid}>
            <InfoItem label="Class ID"   value={classInfo.id} />
            <InfoItem label="Department" value={classInfo.department_id} />
            <InfoItem label="Incharge"   value={classInfo.incharge_name || "Not assigned"} />
          </div>
        </div>

        {/* Edit Card */}
        <div style={s.card}>
          <p style={s.cardTitle}>⚙️ Edit Class Details</p>
          <div style={s.formGrid}>

            <div style={s.formGroup}>
              <label style={s.label}>Class Name *</label>
              <input
                style={s.input}
                value={form.display_name}
                onChange={(e) => setForm((f) => ({ ...f, display_name: e.target.value }))}
                placeholder="e.g. CSE-A"
              />
            </div>

            <div style={s.formGroup}>
              <label style={s.label}>Section *</label>
              <input
                style={s.input}
                value={form.section}
                onChange={(e) => setForm((f) => ({ ...f, section: e.target.value }))}
                placeholder="e.g. A, B, C"
              />
            </div>

            <div style={s.formGroup}>
              <label style={s.label}>Year *</label>
              <select
                style={s.input}
                value={form.year}
                onChange={(e) => setForm((f) => ({ ...f, year: e.target.value }))}
              >
                <option value="1">1st Year</option>
                <option value="2">2nd Year</option>
                <option value="3">3rd Year</option>
                <option value="4">4th Year</option>
              </select>
            </div>

            <div style={s.formGroup}>
              <label style={s.label}>Room Number</label>
              <input
                style={s.input}
                value={form.room_number}
                onChange={(e) => setForm((f) => ({ ...f, room_number: e.target.value }))}
                placeholder="e.g. 301"
              />
            </div>

            <div style={s.formGroup}>
              <label style={s.label}>Class Incharge (Faculty)</label>
              <select
                style={s.input}
                value={form.class_incharge_id}
                onChange={(e) => setForm((f) => ({ ...f, class_incharge_id: e.target.value }))}
              >
                <option value="">— Not assigned —</option>
                {faculty.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name} ({f.email})
                  </option>
                ))}
              </select>
              {faculty.length === 0 && (
                <p style={s.hintText}>
                  No faculty found. Add faculty members first via Users page.
                </p>
              )}
            </div>

          </div>

          <div style={s.actions}>
            <button style={s.saveBtn} onClick={handleSave} disabled={saving}>
              {saving ? "Saving…" : "💾 Save Changes"}
            </button>
            <button style={s.timetableBtn} onClick={() => nav(`/timetable/${classId}/week`)}>
              🗓 Edit Timetable
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}

function InfoItem({ label, value }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <span style={{ fontSize: 12, color: "#6b7280", fontWeight: 600, textTransform: "uppercase" }}>
        {label}
      </span>
      <span style={{ fontSize: 15, color: "#111827", fontWeight: 500 }}>{value}</span>
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
  notFound:    { textAlign: "center", padding: 80 },
  msgBanner:   { borderRadius: 8, padding: "12px 16px", marginBottom: 16, fontSize: 14, fontWeight: 500 },
  card:        { background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, padding: "20px 24px", marginBottom: 20, boxShadow: "0 1px 4px rgba(0,0,0,0.06)" },
  cardTitle:   { fontWeight: 600, fontSize: 15, color: "#111827", margin: "0 0 16px" },
  infoGrid:    { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 20 },
  formGrid:    { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16, marginBottom: 20 },
  formGroup:   { display: "flex", flexDirection: "column", gap: 4 },
  label:       { fontSize: 13, fontWeight: 600, color: "#374151" },
  input:       { border: "1px solid #d1d5db", borderRadius: 8, padding: "9px 12px", fontSize: 14, color: "#111827", outline: "none", background: "#fff", width: "100%", boxSizing: "border-box" },
  hintText:    { fontSize: 12, color: "#9ca3af", margin: "4px 0 0" },
  actions:     { display: "flex", gap: 12, flexWrap: "wrap" },
  saveBtn:     { padding: "10px 24px", background: "#1e3a8a", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 600, fontSize: 14 },
  timetableBtn:{ padding: "10px 24px", background: "#fff", color: "#1e3a8a", border: "2px solid #1e3a8a", borderRadius: 8, cursor: "pointer", fontWeight: 600, fontSize: 14 },
};
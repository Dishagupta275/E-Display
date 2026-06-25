import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { classesAPI, devicesAPI } from "../utils/api";
import Layout from "../components/Layout";

export default function ClassSetup() {
  const { classId } = useParams();
  const nav = useNavigate();

  const [classInfo, setClassInfo] = useState(null);
  const [faculty, setFaculty]     = useState([]);
  const [loading, setLoading]     = useState(true);
  const [saving, setSaving]       = useState(false);
  const [saveMsg, setSaveMsg]     = useState(null);

  const [form, setForm] = useState({
    display_name:      "",
    room_number:       "",
    section:           "",
    year:              "",
    class_incharge_id: "",
  });

  // ✅ new — device assignment state
  const [devices, setDevices]           = useState([]); // unassigned devices
  const [assignedDevice, setAssignedDevice] = useState(null); // device currently assigned to this class, if any
  const [selectedDeviceId, setSelectedDeviceId] = useState("");
  const [assigning, setAssigning]       = useState(false);
  const [assignMsg, setAssignMsg]       = useState(null);

  const fetchDevices = async () => {
    try {
      const res = await devicesAPI.getStatus();
      const all = res.data || [];
      const current = all.find((d) => d.class_id === parseInt(classId));
      const unassigned = all.filter((d) => !d.class_id);
      setAssignedDevice(current || null);
      setDevices(unassigned);
      setSelectedDeviceId(current ? String(current.id) : "");
    } catch (e) {
      console.error("Failed to fetch devices:", e);
    }
  };

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [classRes, facultyRes] = await Promise.all([
          classesAPI.getAll(),
          classesAPI.getFaculty(classId),
        ]);

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
            class_incharge_id: found.class_incharge_id ? String(found.class_incharge_id) : "",
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
    fetchDevices(); // ✅ new
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

  // ✅ new — assign/change/unassign device for this class
  const handleAssignDevice = async () => {
    setAssigning(true);
    setAssignMsg(null);
    try {
      if (selectedDeviceId) {
        await devicesAPI.assign(selectedDeviceId, { class_id: parseInt(classId) });
        setAssignMsg({ type: "success", text: "✅ Device assigned to this class!" });
      } else if (assignedDevice) {
        // Selected "— Unassigned —" while a device was previously assigned
        await devicesAPI.unassign(assignedDevice.id);
        setAssignMsg({ type: "success", text: "✅ Device unassigned from this class." });
      }
      fetchDevices();
    } catch (e) {
      setAssignMsg({
        type: "error",
        text: "❌ " + (e?.response?.data?.message || e.message),
      });
    } finally {
      setAssigning(false);
    }
  };

  if (loading) return (
    <Layout pageTitle="⚙️ Class Setup">
      <div style={s.loading}>Loading class info…</div>
    </Layout>
  );

  if (!classInfo) return (
    <Layout pageTitle="⚙️ Class Setup">
      <div style={s.notFound}>
        <p style={{ fontSize: 40 }}>❌</p>
        <p style={{ color: "#666" }}>Class not found.</p>
        <button onClick={() => nav(-1)} style={s.backBtn}>← Go Back</button>
      </div>
    </Layout>
  );

  return (
    <Layout pageTitle={`⚙️ Class Setup — ${classInfo.display_name}`}>

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
              <p style={s.hintText}>No faculty found. Add faculty via Users page.</p>
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
          <button style={s.backBtn} onClick={() => nav(-1)}>
            ← Back
          </button>
        </div>
      </div>

      {/* ✅ new — Device Assignment Card */}
      <div style={s.card}>
        <p style={s.cardTitle}>🖥️ Display Device</p>

        {assignMsg && (
          <div style={{
            ...s.msgBanner,
            background: assignMsg.type === "success" ? "#e8f5e9" : "#fee2e2",
            color:      assignMsg.type === "success" ? "#2e7d32" : "#991b1b",
            border:     `1px solid ${assignMsg.type === "success" ? "#a5d6a7" : "#fca5a5"}`,
          }}>
            {assignMsg.text}
          </div>
        )}

        <div style={s.formGroup}>
          <label style={s.label}>
            {assignedDevice
              ? `Currently assigned: ${assignedDevice.friendly_name || "Unnamed device"}`
              : "No device currently assigned to this class"}
          </label>
          <select
            style={s.input}
            value={selectedDeviceId}
            onChange={(e) => setSelectedDeviceId(e.target.value)}
          >
            <option value="">— Unassigned —</option>
            {assignedDevice && (
              <option value={String(assignedDevice.id)}>
                {assignedDevice.friendly_name || `Unnamed (${assignedDevice.device_uid.slice(0, 8)}…)`} (currently assigned)
              </option>
            )}
            {devices.map((d) => (
              <option key={d.id} value={d.id}>
                {d.friendly_name || `Unnamed (${d.device_uid.slice(0, 8)}…)`}
              </option>
            ))}
          </select>
          <p style={s.hintText}>
            Don't see your device? Open the display screen once first so it registers, then refresh this page.
          </p>
        </div>

        <div style={s.actions}>
          <button style={s.saveBtn} onClick={handleAssignDevice} disabled={assigning}>
            {assigning ? "Saving…" : "💾 Save Device Assignment"}
          </button>
        </div>
      </div>

    </Layout>
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
  backBtn:     { padding: "10px 24px", background: "#f1f5f9", color: "#334155", border: "1px solid #cbd5e1", borderRadius: 8, cursor: "pointer", fontWeight: 600, fontSize: 14 },
};
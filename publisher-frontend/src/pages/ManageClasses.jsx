import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { classesAPI } from "../utils/api";
import { useAuth } from "../context/AuthContext";
import { usersAPI } from "../utils/api";
const API_BASE = "https://e-display.onrender.com/api";

export default function ManageClasses() {
  const nav = useNavigate();
  const { currentUser } = useAuth();

  const [classes, setClasses]       = useState({});
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [facultyList, setFacultyList] = useState([]);

  const [form, setForm] = useState({
    display_name:      "",
    section:           "",
    room_number:       "",
    year:              "1",
    class_incharge_id: "",
  });
  const [formError, setFormError] = useState(null);
  const [creating, setCreating]   = useState(false);

  const isHOD     = currentUser?.role === "hod";
  const isAsstHOD = currentUser?.role === "asst_hod";
  const canCreate = isHOD || isAsstHOD;
  const canDelete = isHOD;

  // ── Fetch Classes ────────────────────────
  const fetchClasses = async () => {
    setLoading(true);
    try {
      const res = await classesAPI.getAll();
      setClasses(res.data || {});
    } catch (err) {
      setError("Failed to load classes.");
    } finally {
      setLoading(false);
    }
  };

  // ── Fetch Faculty ────────────────────────
  const fetchFaculty = async () => {
  try {
    const res = await usersAPI.getFaculty();
    if (Array.isArray(res.data)) {
      setFacultyList(res.data);
    }
  } catch (err) {
    console.error("Failed to fetch faculty:", err);
  }
};

  useEffect(() => {
    fetchClasses();
    fetchFaculty();
  }, []);

  // ── Flatten Classes ──────────────────────
  const flatClasses = [];
  Object.entries(classes).forEach(([deptName, years]) => {
    Object.entries(years).forEach(([year, classList]) => {
      classList.forEach((cls) => flatClasses.push({ ...cls, deptName }));
    });
  });

  // ── Create ───────────────────────────────
  const handleCreate = async () => {
    if (!form.display_name.trim()) { setFormError("Class name is required."); return; }
    if (!form.section.trim())      { setFormError("Section is required (e.g. A, B)."); return; }

    setCreating(true);
    setFormError(null);
    try {
      await classesAPI.create({
        display_name:      form.display_name.trim(),
        section:           form.section.trim().toUpperCase(),
        room_number:       form.room_number.trim(),
        year:              parseInt(form.year),
        class_incharge_id: form.class_incharge_id ? parseInt(form.class_incharge_id) : null,
      });
      setForm({ display_name: "", section: "", room_number: "", year: "1", class_incharge_id: "" });
      fetchClasses();
    } catch (err) {
      setFormError(err?.response?.data?.message || "Failed to create class.");
    } finally {
      setCreating(false);
    }
  };

  // ── Delete ───────────────────────────────
  const handleDelete = async (id) => {
    if (!window.confirm("Delete this class? This will also remove its timetable.")) return;
    setDeletingId(id);
    try {
      await classesAPI.delete(id);
      fetchClasses();
    } catch (err) {
      alert(err?.response?.data?.message || "Failed to delete class.");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div style={s.page}>
      <h2 style={s.pageTitle}> Manage Classes</h2>

      {canCreate && (
        <div style={s.card}>
          <p style={s.cardTitle}>Create New Class</p>
          <div style={s.formGrid}>

            <div style={s.formGroup}>
              <label style={s.label}>Class Name *</label>
              <input
                style={s.input}
                placeholder="e.g. CSE-A, ECE-B"
                value={form.display_name}
                onChange={(e) => setForm((f) => ({ ...f, display_name: e.target.value }))}
              />
            </div>

            <div style={s.formGroup}>
              <label style={s.label}>Section *</label>
              <input
                style={s.input}
                placeholder="e.g. A, B, C"
                value={form.section}
                onChange={(e) => setForm((f) => ({ ...f, section: e.target.value }))}
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
                placeholder="e.g. 301"
                value={form.room_number}
                onChange={(e) => setForm((f) => ({ ...f, room_number: e.target.value }))}
              />
            </div>

            <div style={s.formGroup}>
              <label style={s.label}>Class Incharge</label>
              <select
                style={s.input}
                value={form.class_incharge_id}
                onChange={(e) => setForm((f) => ({ ...f, class_incharge_id: e.target.value }))}
              >
                <option value="">— Select Class Incharge —</option>
                {facultyList.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </select>
            </div>

          </div>

          {formError && <p style={s.errorText}>⚠️ {formError}</p>}

          <button style={s.primaryBtn} onClick={handleCreate} disabled={creating}>
            {creating ? "Creating…" : "Create Class"}
          </button>
        </div>
      )}

      {error && <div style={s.errorBanner}>⚠️ {error}</div>}

      <div style={s.card}>
        <p style={s.cardTitle}>
          Existing Classes
          <span style={s.countBadge}>{flatClasses.length}</span>
        </p>

        {loading ? (
          <div style={s.center}>
            <div style={s.spinner} />
            <p style={{ color: "#6b7280", marginTop: 12 }}>Loading classes…</p>
          </div>
        ) : flatClasses.length === 0 ? (
          <div style={s.center}>
            <p style={{ fontSize: 40 }}>🏫</p>
            <p style={{ color: "#6b7280" }}>No classes yet. Create one above.</p>
          </div>
        ) : (
          <table style={s.table}>
            <thead>
              <tr style={s.thead}>
                <th style={s.th}>Class</th>
                <th style={s.th}>Section</th>
                <th style={s.th}>Department</th>
                <th style={s.th}>Year</th>
                <th style={s.th}>Room</th>
                <th style={s.th}>Incharge</th>
                <th style={s.th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {flatClasses.map((cls) => (
                <tr key={cls.id} style={s.tr}>
                  <td style={s.td}><span style={s.className}>{cls.display_name}</span></td>
                  <td style={s.td}>{cls.section || "—"}</td>
                  <td style={s.td}><span style={s.deptBadge}>{cls.deptName}</span></td>
                  <td style={s.td}>Year {cls.year}</td>
                  <td style={s.td}>{cls.room_number || "—"}</td>
                  <td style={s.td}>{cls.incharge_name || "—"}</td>
                  <td style={s.td}>
                    <div style={s.actions}>
                      <button
                        style={s.actionBtn}
                        onClick={() => nav(`/timetable/${cls.id}/week`)}
                      >
                        🗓 Timetable
                      </button>
                      <button
                        style={s.actionBtn}
                        onClick={() => nav(`/class-setup/${cls.id}`)}
                      >
                        ⚙️ Setup
                      </button>
                      {canDelete && (
                        <button
                          style={s.deleteBtn}
                          onClick={() => handleDelete(cls.id)}
                          disabled={deletingId === cls.id}
                        >
                          🗑
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

const s = {
  page: {
    minHeight: "100vh",
    background: "#f0f2f5",
    padding: "28px 32px",
    fontFamily: "'Segoe UI', Arial, sans-serif",
  },
  pageTitle: {
    fontSize: 22,
    fontWeight: 700,
    color: "#1e3a8a",
    marginBottom: 20,
  },
  card: {
    background: "#fff",
    border: "1px solid #e5e7eb",
    borderRadius: 12,
    padding: "20px 24px",
    marginBottom: 20,
    boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
  },
  cardTitle: {
    fontWeight: 600,
    fontSize: 15,
    color: "#111827",
    margin: "0 0 16px",
    display: "flex",
    alignItems: "center",
    gap: 8,
  },
  countBadge: {
    background: "#dbeafe",
    color: "#1e40af",
    fontSize: 12,
    fontWeight: 700,
    padding: "2px 8px",
    borderRadius: 20,
  },
  formGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
    gap: 16,
    marginBottom: 16,
  },
  formGroup: {
    display: "flex",
    flexDirection: "column",
    gap: 4,
  },
  label: {
    fontSize: 13,
    fontWeight: 600,
    color: "#374151",
  },
  input: {
    border: "1px solid #d1d5db",
    borderRadius: 8,
    padding: "9px 12px",
    fontSize: 14,
    color: "#111827",
    outline: "none",
    background: "#fff",
    width: "100%",
    boxSizing: "border-box",
  },
  primaryBtn: {
    background: "#1e3a8a",
    color: "#fff",
    border: "none",
    borderRadius: 8,
    padding: "10px 24px",
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer",
  },
  errorText: {
    fontSize: 13,
    color: "#dc2626",
    margin: "0 0 12px",
  },
  errorBanner: {
    background: "#fee2e2",
    border: "1px solid #fca5a5",
    color: "#991b1b",
    borderRadius: 8,
    padding: "12px 16px",
    marginBottom: 20,
    fontSize: 14,
  },
  center: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    padding: "40px 0",
  },
  spinner: {
    width: 32,
    height: 32,
    border: "3px solid #e5e7eb",
    borderTop: "3px solid #1e3a8a",
    borderRadius: "50%",
    animation: "spin 0.8s linear infinite",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
  },
  thead: {
    background: "#f9fafb",
  },
  th: {
    padding: "10px 14px",
    textAlign: "left",
    fontSize: 12,
    fontWeight: 600,
    color: "#6b7280",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    borderBottom: "1px solid #e5e7eb",
  },
  tr: {
    borderBottom: "1px solid #f3f4f6",
  },
  td: {
    padding: "12px 14px",
    fontSize: 14,
    color: "#374151",
    verticalAlign: "middle",
  },
  className: {
    fontWeight: 600,
    color: "#1e3a8a",
  },
  deptBadge: {
    background: "#dbeafe",
    color: "#1e40af",
    padding: "2px 8px",
    borderRadius: 20,
    fontSize: 12,
    fontWeight: 600,
  },
  actions: {
    display: "flex",
    gap: 8,
    alignItems: "center",
  },
  actionBtn: {
    background: "#f3f4f6",
    color: "#374151",
    border: "1px solid #e5e7eb",
    borderRadius: 6,
    padding: "5px 10px",
    fontSize: 12,
    cursor: "pointer",
    whiteSpace: "nowrap",
  },
  deleteBtn: {
    background: "#fee2e2",
    color: "#dc2626",
    border: "1px solid #fca5a5",
    borderRadius: 6,
    padding: "5px 8px",
    fontSize: 13,
    cursor: "pointer",
  },
};
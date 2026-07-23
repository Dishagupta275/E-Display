import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { classesAPI, devicesAPI } from "../utils/api";
import { useAuth } from "../context/AuthContext";
import { usersAPI } from "../utils/api";
import Layout from "../components/Layout";

// ✅ new — simple hook to detect mobile viewport
function useIsMobile(breakpoint = 640) {
  const [isMobile, setIsMobile] = useState(
    typeof window !== "undefined" ? window.innerWidth <= breakpoint : false
  );

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth <= breakpoint);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [breakpoint]);

  return isMobile;
}

export default function ManageClasses() {
  const nav = useNavigate();
  const { currentUser, hasPermission } = useAuth();
  const isMobile = useIsMobile(); // ✅ new

  const [classes, setClasses]       = useState({});
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [facultyList, setFacultyList] = useState([]);
  const [devices, setDevices]       = useState([]); // ✅ new

  const [form, setForm] = useState({
    display_name:      "",
    section:           "",
    room_number:       "",
    year:              "1",
    class_incharge_id: "",
    device_id:         "", // ✅ new
  });
  const [formError, setFormError] = useState(null);
  const [creating, setCreating]   = useState(false);

  const canCreate = hasPermission("create_class");
  const canDelete = hasPermission("delete_class");

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

  // ✅ new — fetch unassigned devices for the dropdown
  const fetchDevices = async () => {
    try {
      const res = await devicesAPI.getStatus();
      const unassigned = (res.data || []).filter((d) => !d.class_id);
      setDevices(unassigned);
    } catch (err) {
      console.error("Failed to fetch devices:", err);
    }
  };

  useEffect(() => {
    fetchClasses();
    fetchFaculty();
    fetchDevices(); // ✅ new
  }, []);

  const flatClasses = [];
  Object.entries(classes).forEach(([deptName, years]) => {
    Object.entries(years).forEach(([year, classList]) => {
      classList.forEach((cls) => flatClasses.push({ ...cls, deptName }));
    });
  });

  const handleCreate = async () => {
    if (!form.display_name.trim()) { setFormError("Class name is required."); return; }
    if (!form.section.trim())      { setFormError("Section is required (e.g. A, B)."); return; }

    setCreating(true);
    setFormError(null);
    try {
      const res = await classesAPI.create({
        display_name:      form.display_name.trim(),
        section:           form.section.trim().toUpperCase(),
        room_number:       form.room_number.trim(),
        year:              parseInt(form.year),
        class_incharge_id: form.class_incharge_id ? parseInt(form.class_incharge_id) : null,
      });

      // ✅ new — assign the chosen device to the newly created class
      const newClassId = res.data?.class?.id || res.data?.id;
      if (form.device_id && newClassId) {
        try {
          await devicesAPI.assign(form.device_id, { class_id: newClassId });
        } catch (err) {
          console.error("Class created, but device assignment failed:", err);
        }
      }

      setForm({ display_name: "", section: "", room_number: "", year: "1", class_incharge_id: "", device_id: "" });
      fetchClasses();
      fetchDevices(); // refresh unassigned list
    } catch (err) {
      setFormError(err?.response?.data?.message || "Failed to create class.");
    } finally {
      setCreating(false);
    }
  };

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
    <Layout pageTitle="🏫 Manage Classes">
      <div style={s.wrapper}>

        {canCreate && (
          <div style={s.card}>
            <p style={s.cardTitle}>Create New Class</p>
            <div style={isMobile ? s.formGridMobile : s.formGrid}>

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

              {/* ✅ new — device assignment at creation time */}
              <div style={s.formGroup}>
                <label style={s.label}>Assign Display Device (optional)</label>
                <select
                  style={s.input}
                  value={form.device_id}
                  onChange={(e) => setForm((f) => ({ ...f, device_id: e.target.value }))}
                >
                  <option value="">— Assign later in Device Manager —</option>
                  {devices.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.friendly_name || `Unnamed (${d.device_uid.slice(0, 8)}…)`}
                    </option>
                  ))}
                </select>
              </div>

            </div>

            {formError && <p style={s.errorText}>⚠️ {formError}</p>}

            <button
              style={isMobile ? s.primaryBtnMobile : s.primaryBtn}
              onClick={handleCreate}
              disabled={creating}
            >
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
          ) : isMobile ? (
            // ✅ new — card list replaces table on small screens
            <div style={s.cardList}>
              {flatClasses.map((cls) => (
                <div key={cls.id} style={s.classCard}>
                  <div style={s.classCardHeader}>
                    <span style={s.className}>{cls.display_name}</span>
                    <span style={s.deptBadge}>{cls.deptName}</span>
                  </div>

                  <div style={s.classCardRow}>
                    <span style={s.classCardLabel}>Section</span>
                    <span>{cls.section || "—"}</span>
                  </div>
                  <div style={s.classCardRow}>
                    <span style={s.classCardLabel}>Year</span>
                    <span>Year {cls.year}</span>
                  </div>
                  <div style={s.classCardRow}>
                    <span style={s.classCardLabel}>Room</span>
                    <span>{cls.room_number || "—"}</span>
                  </div>
                  <div style={s.classCardRow}>
                    <span style={s.classCardLabel}>Incharge</span>
                    <span>{cls.incharge_name || "—"}</span>
                  </div>

                  <div style={s.classCardActions}>
                    <button
                      style={s.actionBtnMobile}
                      onClick={() => nav(`/timetable/${cls.id}/week`)}
                    >
                      🗓 Timetable
                    </button>
                    <button
                      style={s.actionBtnMobile}
                      onClick={() => nav(`/class-setup/${cls.id}`)}
                    >
                      ⚙️ Setup
                    </button>
                    {canDelete && (
                      <button
                        style={s.deleteBtnMobile}
                        onClick={() => handleDelete(cls.id)}
                        disabled={deletingId === cls.id}
                      >
                        🗑 Delete
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={s.tableScroll}>
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
            </div>
          )}
        </div>

      </div>
    </Layout>
  );
}

const s = {
  wrapper: {
    display: "flex",
    flexDirection: "column",
    gap: 0,
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
    flexWrap: "wrap",
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
  // ✅ new — single column, tighter gap on mobile
  formGridMobile: {
    display: "grid",
    gridTemplateColumns: "1fr",
    gap: 12,
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
    fontSize: 16, // ✅ 16px prevents iOS Safari auto-zoom on focus
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
  // ✅ new — full-width, larger tap target on mobile
  primaryBtnMobile: {
    background: "#1e3a8a",
    color: "#fff",
    border: "none",
    borderRadius: 8,
    padding: "12px 24px",
    fontSize: 15,
    fontWeight: 600,
    cursor: "pointer",
    width: "100%",
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
  // ✅ new — allows the table to scroll horizontally instead of squashing on tablet widths
  tableScroll: {
    width: "100%",
    overflowX: "auto",
    WebkitOverflowScrolling: "touch",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    minWidth: 640,
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
    whiteSpace: "nowrap",
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

  // ✅ new styles — mobile card list for "Existing Classes"
  cardList: {
    display: "flex",
    flexDirection: "column",
    gap: 12,
  },
  classCard: {
    border: "1px solid #e5e7eb",
    borderRadius: 10,
    padding: "14px 16px",
    background: "#fafafa",
  },
  classCardHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
    gap: 8,
    flexWrap: "wrap",
  },
  classCardRow: {
    display: "flex",
    justifyContent: "space-between",
    fontSize: 13,
    color: "#374151",
    padding: "4px 0",
    borderBottom: "1px solid #f0f0f0",
  },
  classCardLabel: {
    color: "#9ca3af",
    fontWeight: 600,
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: "0.03em",
  },
  classCardActions: {
    display: "flex",
    gap: 8,
    marginTop: 12,
    flexWrap: "wrap",
  },
  actionBtnMobile: {
    background: "#f3f4f6",
    color: "#374151",
    border: "1px solid #e5e7eb",
    borderRadius: 6,
    padding: "8px 12px",
    fontSize: 13,
    cursor: "pointer",
    flex: "1 1 auto",
    textAlign: "center",
  },
  deleteBtnMobile: {
    background: "#fee2e2",
    color: "#dc2626",
    border: "1px solid #fca5a5",
    borderRadius: 6,
    padding: "8px 12px",
    fontSize: 13,
    cursor: "pointer",
    flex: "1 1 auto",
    textAlign: "center",
  },
};

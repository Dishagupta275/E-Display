import { useState, useEffect } from "react";
import { departmentsAPI, usersAPI } from "../utils/api";

export default function Departments() {
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState(null);
  const [newDeptName, setNewDeptName] = useState("");
  const [creating, setCreating]       = useState(false);
  const [createError, setCreateError] = useState(null);

  // HOD modal state
  const [hodModal, setHodModal]     = useState(null);
  const [hodForm, setHodForm]       = useState({ name: "", email: "", password: "", role: "hod" });
  const [hodError, setHodError]     = useState(null);
  const [hodLoading, setHodLoading] = useState(false);
  const [hodSuccess, setHodSuccess] = useState(null);

  const fetchDepartments = async () => {
    try {
      setError(null);
      const res = await departmentsAPI.getAll();
      setDepartments(res.data || []);
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to load departments.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchDepartments(); }, []);

  const handleCreate = async () => {
    const name = newDeptName.trim();
    if (!name) { setCreateError("Department name cannot be empty."); return; }
    setCreating(true);
    setCreateError(null);
    try {
      await departmentsAPI.create({ name });
      setNewDeptName("");
      fetchDepartments();
    } catch (err) {
      setCreateError(err?.response?.data?.message || "Failed to create department.");
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this department? This cannot be undone.")) return;
    try {
      await departmentsAPI.delete(id);
      setDepartments((prev) => prev.filter((d) => d.id !== id));
    } catch (err) {
      alert(err?.response?.data?.message || "Failed to delete department.");
    }
  };

  const openHodModal = (dept) => {
    setHodModal(dept);
    setHodForm({ name: "", email: "", password: "", role: "hod" });
    setHodError(null);
    setHodSuccess(null);
  };

  const closeHodModal = () => {
    setHodModal(null);
    setHodError(null);
    setHodSuccess(null);
  };

  const handleAddHod = async () => {
    const { name, email, password, role } = hodForm;
    if (!name.trim() || !email.trim() || !password.trim()) {
      setHodError("All fields are required.");
      return;
    }
    setHodLoading(true);
    setHodError(null);
    try {
      await usersAPI.create({
        name:          name.trim(),
        email:         email.trim(),
        password,
        role,
        department_id: hodModal.id,
      });
      setHodSuccess(`${role === "hod" ? "HOD" : "Asst. HOD"} added successfully.`);
      setHodForm({ name: "", email: "", password: "", role: "hod" });
      fetchDepartments();
    } catch (err) {
      setHodError(err?.response?.data?.message || "Failed to add user.");
    } finally {
      setHodLoading(false);
    }
  };

  const formatDate = (isoString) => {
    if (!isoString) return "—";
    return new Date(isoString).toLocaleDateString();
  };

  return (
    <div style={s.page}>

      <h2 style={s.pageTitle}>🏢 Departments</h2>

      {/* Create Department Card */}
      <div style={s.card}>
        <p style={s.cardTitle}>Create New Department</p>
        <div style={s.createRow}>
          <input
            style={{ ...s.input, flex: 1 }}
            placeholder="Department name e.g. CSE, ECE, MECH"
            value={newDeptName}
            onChange={(e) => { setNewDeptName(e.target.value); setCreateError(null); }}
            onKeyDown={(e) => e.key === "Enter" && handleCreate()}
          />
          <button style={s.primaryBtn} onClick={handleCreate} disabled={creating}>
            {creating ? "Creating…" : "Create"}
          </button>
        </div>
        {createError && <p style={s.errorText}>{createError}</p>}
      </div>

      {/* Error */}
      {error && <div style={s.errorBanner}>⚠️ {error}</div>}

      {/* Department Cards */}
      {loading ? (
        <div style={s.center}>
          <div style={s.spinner} />
          <p style={{ color: "#6b7280", marginTop: 16 }}>Loading departments…</p>
        </div>
      ) : departments.length === 0 ? (
        <div style={s.center}>
          <p style={{ fontSize: 48 }}>🏢</p>
          <p style={{ color: "#6b7280", marginTop: 8 }}>No departments yet. Create one above.</p>
        </div>
      ) : (
        <div style={s.grid}>
          {departments.map((dept) => (
            <div key={dept.id} style={s.deptCard}>
              <div style={s.deptTop}>
                <span style={{ fontSize: 28 }}>🏢</span>
                <div style={{ flex: 1 }}>
                  <p style={s.deptName}>{dept.name}</p>
                  <p style={s.deptMeta}>Created {formatDate(dept.created_at)}</p>
                </div>
                <button style={s.deleteBtn} onClick={() => handleDelete(dept.id)} title="Delete">
                  🗑
                </button>
              </div>

              {dept.users && dept.users.length > 0 && (
                <div style={s.hodList}>
                  {dept.users.map((u) => (
                    <div key={u.id} style={s.hodItem}>
                      <span style={s.hodName}>👤 {u.name}</span>
                      <span style={{
                        ...s.roleBadge,
                        background: u.role === "hod" ? "#dbeafe" : "#ede9fe",
                        color: u.role === "hod" ? "#1e40af" : "#6d28d9"
                      }}>
                        {u.role === "hod" ? "HOD" : "Asst. HOD"}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              <button style={s.outlineBtn} onClick={() => openHodModal(dept)}>
                + Add HOD / Asst HOD
              </button>
            </div>
          ))}
        </div>
      )}

      {/* HOD Modal */}
      {hodModal && (
        <div style={s.overlay} onClick={closeHodModal}>
          <div style={s.modal} onClick={(e) => e.stopPropagation()}>
            <div style={s.modalHeader}>
              <h3 style={s.modalTitle}>Add HOD / Asst HOD — {hodModal.name}</h3>
              <button style={s.closeBtn} onClick={closeHodModal}>✕</button>
            </div>

            <div style={s.modalBody}>
              <label style={s.label}>Role</label>
              <select
                style={s.input}
                value={hodForm.role}
                onChange={(e) => setHodForm((f) => ({ ...f, role: e.target.value }))}
              >
                <option value="hod">HOD</option>
                <option value="asst_hod">Assistant HOD</option>
              </select>

              <label style={s.label}>Full Name</label>
              <input
                style={s.input}
                placeholder="e.g. Dr. Ravi Kumar"
                value={hodForm.name}
                onChange={(e) => setHodForm((f) => ({ ...f, name: e.target.value }))}
              />

              <label style={s.label}>Email</label>
              <input
                style={s.input}
                type="email"
                placeholder="e.g. ravi@college.edu"
                value={hodForm.email}
                onChange={(e) => setHodForm((f) => ({ ...f, email: e.target.value }))}
              />

              <label style={s.label}>Password</label>
              <input
                style={s.input}
                type="password"
                placeholder="Set a password"
                value={hodForm.password}
                onChange={(e) => setHodForm((f) => ({ ...f, password: e.target.value }))}
              />

              {hodError   && <p style={s.errorText}>{hodError}</p>}
              {hodSuccess && <p style={s.successText}>✅ {hodSuccess}</p>}
            </div>

            <div style={s.modalFooter}>
              <button style={s.ghostBtn} onClick={closeHodModal}>Cancel</button>
              <button style={s.primaryBtn} onClick={handleAddHod} disabled={hodLoading}>
                {hodLoading ? "Adding…" : "Add User"}
              </button>
            </div>
          </div>
        </div>
      )}

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
    marginBottom: 24,
    boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
  },
  cardTitle: {
    fontWeight: 600,
    fontSize: 15,
    color: "#111827",
    margin: "0 0 14px",
  },
  createRow: {
    display: "flex",
    gap: 12,
    alignItems: "center",
    flexWrap: "wrap",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
    gap: 16,
  },
  deptCard: {
    background: "#fff",
    border: "1px solid #e5e7eb",
    borderRadius: 12,
    padding: "18px 18px 14px",
    boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
    display: "flex",
    flexDirection: "column",
    gap: 12,
  },
  deptTop: {
    display: "flex",
    alignItems: "flex-start",
    gap: 12,
  },
  deptName: {
    fontSize: 18,
    fontWeight: 700,
    color: "#1e3a8a",
    margin: 0,
  },
  deptMeta: {
    fontSize: 12,
    color: "#9ca3af",
    margin: "3px 0 0",
  },
  deleteBtn: {
    background: "none",
    border: "none",
    cursor: "pointer",
    fontSize: 16,
    padding: 2,
    color: "#ef4444",
    lineHeight: 1,
  },
  hodList: {
    display: "flex",
    flexDirection: "column",
    gap: 6,
    borderTop: "1px solid #f3f4f6",
    paddingTop: 10,
  },
  hodItem: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  hodName: {
    fontSize: 13,
    color: "#374151",
  },
  roleBadge: {
    fontSize: 11,
    fontWeight: 600,
    padding: "2px 8px",
    borderRadius: 20,
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
    whiteSpace: "nowrap",
  },
  outlineBtn: {
    background: "#fff",
    color: "#1e3a8a",
    border: "1.5px solid #1e3a8a",
    borderRadius: 8,
    padding: "8px 14px",
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer",
    width: "100%",
  },
  ghostBtn: {
    background: "#f3f4f6",
    color: "#374151",
    border: "none",
    borderRadius: 8,
    padding: "10px 20px",
    fontSize: 14,
    fontWeight: 500,
    cursor: "pointer",
  },
  input: {
    width: "100%",
    border: "1px solid #d1d5db",
    borderRadius: 8,
    padding: "9px 14px",
    fontSize: 14,
    color: "#111827",
    outline: "none",
    background: "#fff",
    boxSizing: "border-box",
    marginBottom: 2,
  },
  label: {
    display: "block",
    fontSize: 13,
    fontWeight: 600,
    color: "#374151",
    margin: "12px 0 4px",
  },
  errorText: {
    fontSize: 13,
    color: "#dc2626",
    margin: "6px 0 0",
  },
  successText: {
    fontSize: 13,
    color: "#16a34a",
    margin: "6px 0 0",
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
  overlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.4)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
  },
  modal: {
    background: "#fff",
    borderRadius: 14,
    width: "100%",
    maxWidth: 440,
    boxShadow: "0 8px 32px rgba(0,0,0,0.18)",
    overflow: "hidden",
  },
  modalHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "18px 24px",
    borderBottom: "1px solid #f3f4f6",
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: 700,
    color: "#1e3a8a",
    margin: 0,
  },
  closeBtn: {
    background: "none",
    border: "none",
    fontSize: 18,
    cursor: "pointer",
    color: "#6b7280",
    lineHeight: 1,
  },
  modalBody: {
    padding: "8px 24px 16px",
  },
  modalFooter: {
    display: "flex",
    justifyContent: "flex-end",
    gap: 10,
    padding: "14px 24px",
    borderTop: "1px solid #f3f4f6",
  },
};
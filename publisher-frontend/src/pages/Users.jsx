import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { usersAPI, departmentsAPI } from "../utils/api";

const ROLES = ["hod", "asst_hod", "faculty"];
const ROLE_LABELS = { hod: "HOD", asst_hod: "Asst HOD", faculty: "Faculty" };
const ROLE_COLORS = {
  hod:      { bg: "#dbeafe", color: "#1e40af" },
  asst_hod: { bg: "#ede9fe", color: "#6d28d9" },
  faculty:  { bg: "#dcfce7", color: "#15803d" },
};

export default function Users() {
  const { currentUser } = useAuth();

  const [users, setUsers]             = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState(null);

  const [filterRole, setFilterRole]   = useState("all");
  const [filterDept, setFilterDept]   = useState("all");
  const [search, setSearch]           = useState("");

  const [form, setForm] = useState({
    name: "", email: "", password: "", role: "faculty", department_id: "",
  });
  const [formError, setFormError] = useState(null);
  const [creating, setCreating]   = useState(false);
  const [showForm, setShowForm]   = useState(false);

  const [editUser, setEditUser]   = useState(null);
  const [editForm, setEditForm]   = useState({});
  const [editError, setEditError] = useState(null);
  const [saving, setSaving]       = useState(false);

  // ── Fetch Users ──────────────────────────
  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await usersAPI.getAll();
      setUsers(Array.isArray(res.data) ? res.data : []);
      setError(null);
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to load users.");
    } finally {
      setLoading(false);
    }
  };

  // ── Fetch Departments ────────────────────
  const fetchDepartments = async () => {
    try {
      const res = await departmentsAPI.getAll();
      if (Array.isArray(res.data)) setDepartments(res.data);
    } catch (_) {}
  };

  useEffect(() => {
    fetchUsers();
    fetchDepartments();
  }, []);

  // ── Create User ──────────────────────────
  const handleCreate = async () => {
    if (!form.name.trim())  { setFormError("Name is required."); return; }
    if (!form.email.trim()) { setFormError("Email is required."); return; }
    if (!form.password)     { setFormError("Password is required."); return; }
    if (["hod", "asst_hod"].includes(form.role) && !form.department_id) {
      setFormError("Department is required for HOD and Asst HOD.");
      return;
    }

    setCreating(true);
    setFormError(null);
    try {
      await usersAPI.create({
        name:          form.name.trim(),
        email:         form.email.trim(),
        password:      form.password,
        role:          form.role,
        department_id: form.department_id ? parseInt(form.department_id) : null,
      });
      setForm({ name: "", email: "", password: "", role: "faculty", department_id: "" });
      setShowForm(false);
      fetchUsers();
    } catch (err) {
      setFormError(err?.response?.data?.message || "Failed to create user.");
    } finally {
      setCreating(false);
    }
  };

  // ── Open Edit ────────────────────────────
  const openEdit = (user) => {
    setEditUser(user);
    setEditForm({
      name:          user.name,
      email:         user.email,
      role:          user.role,
      department_id: user.department_id || "",
      is_active:     user.is_active,
      password:      "",
    });
    setEditError(null);
  };

  // ── Save Edit ────────────────────────────
  const handleSave = async () => {
    setSaving(true);
    setEditError(null);
    try {
      const body = {
        name:          editForm.name,
        email:         editForm.email,
        role:          editForm.role,
        department_id: editForm.department_id ? parseInt(editForm.department_id) : null,
        is_active:     editForm.is_active,
      };
      if (editForm.password) body.password = editForm.password;

      await usersAPI.update(editUser.id, body);
      setEditUser(null);
      fetchUsers();
    } catch (err) {
      setEditError(err?.response?.data?.message || "Failed to update user.");
    } finally {
      setSaving(false);
    }
  };

  // ── Deactivate ───────────────────────────
  const handleDeactivate = async (user) => {
    if (!window.confirm(`Deactivate ${user.name}?`)) return;
    try {
      await usersAPI.delete(user.id);
      fetchUsers();
    } catch (err) {
      alert(err?.response?.data?.message || "Failed to deactivate.");
    }
  };

  // ── Filtered list ────────────────────────
  const getDeptName = (id) =>
    departments.find((d) => d.id === id)?.name || "—";

  const filtered = users.filter((u) => {
    const matchRole   = filterRole === "all" || u.role === filterRole;
    const matchDept   = filterDept === "all" || String(u.department_id) === filterDept;
    const matchSearch = !search ||
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase());
    return matchRole && matchDept && matchSearch;
  });

  const counts = {
    total:    users.length,
    hod:      users.filter((u) => u.role === "hod").length,
    asst_hod: users.filter((u) => u.role === "asst_hod").length,
    faculty:  users.filter((u) => u.role === "faculty").length,
    inactive: users.filter((u) => !u.is_active).length,
  };

  return (
    <div style={s.page}>

      <div style={s.topBar}>
        <div>
          <h2 style={s.pageTitle}>👥 User Management</h2>
          <p style={s.pageSub}>Create and manage HOD, Asst HOD, and Faculty accounts</p>
        </div>
        <button style={s.primaryBtn} onClick={() => setShowForm((v) => !v)}>
          {showForm ? "✕ Cancel" : "+ Add User"}
        </button>
      </div>

      {/* Summary Cards */}
      <div style={s.summaryRow}>
        <SummaryCard label="Total Users" value={counts.total}    color="#1e40af" bg="#dbeafe" />
        <SummaryCard label="HODs"         value={counts.hod}      color="#1e40af" bg="#dbeafe" />
        <SummaryCard label="Asst HODs"    value={counts.asst_hod} color="#6d28d9" bg="#ede9fe" />
        <SummaryCard label="Faculty"      value={counts.faculty}  color="#15803d" bg="#dcfce7" />
        <SummaryCard label="Inactive"     value={counts.inactive} color="#b91c1c" bg="#fee2e2" />
      </div>

      {/* Create Form */}
      {showForm && (
        <div style={s.card}>
          <p style={s.cardTitle}>Create New User</p>
          <div style={s.formGrid}>

            <div style={s.formGroup}>
              <label style={s.label}>Full Name *</label>
              <input
                style={s.input}
                placeholder="e.g. Dr. Ramesh Kumar"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>

            <div style={s.formGroup}>
              <label style={s.label}>Email *</label>
              <input
                style={s.input}
                type="email"
                placeholder="email@college.edu"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              />
            </div>

            <div style={s.formGroup}>
              <label style={s.label}>Password *</label>
              <input
                style={s.input}
                type="password"
                placeholder="Min 6 characters"
                value={form.password}
                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
              />
            </div>

            <div style={s.formGroup}>
              <label style={s.label}>Role *</label>
              <select
                style={s.input}
                value={form.role}
                onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
              >
                {ROLES.map((r) => (
                  <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                ))}
              </select>
            </div>

            <div style={s.formGroup}>
              <label style={s.label}>
                Department {["hod", "asst_hod"].includes(form.role) ? "*" : "(optional)"}
              </label>
              <select
                style={s.input}
                value={form.department_id}
                onChange={(e) => setForm((f) => ({ ...f, department_id: e.target.value }))}
              >
                <option value="">— Select Department —</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>

          </div>

          {formError && <p style={s.errorText}>⚠️ {formError}</p>}

          <button style={s.primaryBtn} onClick={handleCreate} disabled={creating}>
            {creating ? "Creating…" : "Create User"}
          </button>
        </div>
      )}

      {error && <div style={s.errorBanner}>⚠️ {error}</div>}

      {/* Filters + Table */}
      <div style={s.card}>
        <div style={s.filterRow}>
          <input
            style={{ ...s.input, flex: 1, minWidth: 180 }}
            placeholder="Search by name or email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select style={s.input} value={filterRole} onChange={(e) => setFilterRole(e.target.value)}>
            <option value="all">All Roles</option>
            {ROLES.map((r) => (
              <option key={r} value={r}>{ROLE_LABELS[r]}</option>
            ))}
          </select>
          <select style={s.input} value={filterDept} onChange={(e) => setFilterDept(e.target.value)}>
            <option value="all">All Departments</option>
            {departments.map((d) => (
              <option key={d.id} value={String(d.id)}>{d.name}</option>
            ))}
          </select>
        </div>

        {loading ? (
          <div style={s.center}>
            <div style={s.spinner} />
            <p style={{ color: "#6b7280", marginTop: 12 }}>Loading users…</p>
          </div>
        ) : filtered.length === 0 ? (
          <div style={s.center}>
            <p style={{ fontSize: 40 }}>👤</p>
            <p style={{ color: "#6b7280" }}>
              {users.length === 0 ? "No users yet. Add one above." : "No users match your filters."}
            </p>
          </div>
        ) : (
          <table style={s.table}>
            <thead>
              <tr style={s.thead}>
                <th style={s.th}>Name</th>
                <th style={s.th}>Email</th>
                <th style={s.th}>Role</th>
                <th style={s.th}>Department</th>
                <th style={s.th}>Status</th>
                <th style={s.th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((user) => (
                <tr key={user.id} style={s.tr}>
                  <td style={s.td}><span style={s.userName}>{user.name}</span></td>
                  <td style={s.td}><span style={s.userEmail}>{user.email}</span></td>
                  <td style={s.td}>
                    <span style={{
                      ...s.roleBadge,
                      background: ROLE_COLORS[user.role]?.bg || "#f3f4f6",
                      color:      ROLE_COLORS[user.role]?.color || "#374151",
                    }}>
                      {ROLE_LABELS[user.role] || user.role}
                    </span>
                  </td>
                  <td style={s.td}>{getDeptName(user.department_id)}</td>
                  <td style={s.td}>
                    <span style={{
                      ...s.statusBadge,
                      background: user.is_active ? "#dcfce7" : "#fee2e2",
                      color:      user.is_active ? "#15803d" : "#b91c1c",
                    }}>
                      {user.is_active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td style={s.td}>
                    <div style={s.actions}>
                      <button style={s.actionBtn} onClick={() => openEdit(user)}>✏️ Edit</button>
                      {user.is_active && (
                        <button style={s.deleteBtn} onClick={() => handleDeactivate(user)}>
                          🚫 Deactivate
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

      {/* Edit Modal */}
      {editUser && (
        <div style={s.modalBackdrop}>
          <div style={s.modal}>
            <div style={s.modalHeader}>
              <h3 style={s.modalTitle}>Edit — {editUser.name}</h3>
              <button style={s.closeBtn} onClick={() => setEditUser(null)}>✕</button>
            </div>

            <div style={s.formGrid}>
              <div style={s.formGroup}>
                <label style={s.label}>Full Name</label>
                <input style={s.input} value={editForm.name}
                  onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))} />
              </div>
              <div style={s.formGroup}>
                <label style={s.label}>Email</label>
                <input style={s.input} type="email" value={editForm.email}
                  onChange={(e) => setEditForm((f) => ({ ...f, email: e.target.value }))} />
              </div>
              <div style={s.formGroup}>
                <label style={s.label}>New Password (blank = keep)</label>
                <input style={s.input} type="password" placeholder="Leave blank to keep"
                  value={editForm.password}
                  onChange={(e) => setEditForm((f) => ({ ...f, password: e.target.value }))} />
              </div>
              <div style={s.formGroup}>
                <label style={s.label}>Role</label>
                <select style={s.input} value={editForm.role}
                  onChange={(e) => setEditForm((f) => ({ ...f, role: e.target.value }))}>
                  {ROLES.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
                </select>
              </div>
              <div style={s.formGroup}>
                <label style={s.label}>Department</label>
                <select style={s.input} value={editForm.department_id}
                  onChange={(e) => setEditForm((f) => ({ ...f, department_id: e.target.value }))}>
                  <option value="">— None —</option>
                  {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>
              <div style={s.formGroup}>
                <label style={s.label}>Status</label>
                <select style={s.input} value={editForm.is_active ? "true" : "false"}
                  onChange={(e) => setEditForm((f) => ({ ...f, is_active: e.target.value === "true" }))}>
                  <option value="true">Active</option>
                  <option value="false">Inactive</option>
                </select>
              </div>
            </div>

            {editError && <p style={s.errorText}>⚠️ {editError}</p>}

            <div style={s.modalFooter}>
              <button style={s.ghostBtn} onClick={() => setEditUser(null)}>Cancel</button>
              <button style={s.primaryBtn} onClick={handleSave} disabled={saving}>
                {saving ? "Saving…" : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

function SummaryCard({ label, value, color, bg }) {
  return (
    <div style={{ ...s.summaryCard, background: bg }}>
      <span style={{ ...s.summaryValue, color }}>{value}</span>
      <span style={{ ...s.summaryLabel, color }}>{label}</span>
    </div>
  );
}

const s = {
  page:       { minHeight: "100vh", background: "#f0f2f5", padding: "28px 32px", fontFamily: "'Segoe UI', Arial, sans-serif" },
  topBar:     { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 },
  pageTitle:  { fontSize: 22, fontWeight: 700, color: "#1e3a8a", margin: 0 },
  pageSub:    { fontSize: 13, color: "#6b7280", margin: "4px 0 0" },
  summaryRow: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 14, marginBottom: 24 },
  summaryCard:  { borderRadius: 10, padding: "16px 14px", display: "flex", flexDirection: "column", gap: 4 },
  summaryValue: { fontSize: 28, fontWeight: 700, lineHeight: 1 },
  summaryLabel: { fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", opacity: 0.8 },
  card:       { background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, padding: "20px 24px", marginBottom: 20, boxShadow: "0 1px 4px rgba(0,0,0,0.06)" },
  cardTitle:  { fontWeight: 600, fontSize: 15, color: "#111827", margin: "0 0 16px" },
  formGrid:   { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16, marginBottom: 16 },
  formGroup:  { display: "flex", flexDirection: "column", gap: 4 },
  label:      { fontSize: 13, fontWeight: 600, color: "#374151" },
  input:      { border: "1px solid #d1d5db", borderRadius: 8, padding: "9px 12px", fontSize: 14, color: "#111827", outline: "none", background: "#fff", boxSizing: "border-box", width: "100%" },
  filterRow:  { display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap" },
  primaryBtn: { background: "#1e3a8a", color: "#fff", border: "none", borderRadius: 8, padding: "10px 20px", fontSize: 14, fontWeight: 600, cursor: "pointer" },
  ghostBtn:   { background: "transparent", color: "#374151", border: "1px solid #d1d5db", borderRadius: 8, padding: "10px 20px", fontSize: 14, fontWeight: 600, cursor: "pointer" },
  errorText:  { fontSize: 13, color: "#dc2626", margin: "0 0 12px" },
  errorBanner:{ background: "#fee2e2", border: "1px solid #fca5a5", color: "#991b1b", borderRadius: 8, padding: "12px 16px", marginBottom: 20, fontSize: 14 },
  center:     { display: "flex", flexDirection: "column", alignItems: "center", padding: "40px 0" },
  spinner:    { width: 32, height: 32, border: "3px solid #e5e7eb", borderTop: "3px solid #1e3a8a", borderRadius: "50%", animation: "spin 0.8s linear infinite" },
  table:      { width: "100%", borderCollapse: "collapse" },
  thead:      { background: "#f9fafb" },
  th:         { padding: "10px 14px", textAlign: "left", fontSize: 12, fontWeight: 600, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em", borderBottom: "1px solid #e5e7eb" },
  tr:         { borderBottom: "1px solid #f3f4f6" },
  td:         { padding: "12px 14px", fontSize: 14, color: "#374151", verticalAlign: "middle" },
  userName:   { fontWeight: 600, color: "#111827" },
  userEmail:  { color: "#6b7280", fontSize: 13 },
  roleBadge:  { padding: "3px 10px", borderRadius: 20, fontSize: 12, fontWeight: 600 },
  statusBadge:{ padding: "3px 10px", borderRadius: 20, fontSize: 12, fontWeight: 600 },
  actions:    { display: "flex", gap: 8 },
  actionBtn:  { background: "#f3f4f6", color: "#374151", border: "1px solid #e5e7eb", borderRadius: 6, padding: "5px 10px", fontSize: 12, cursor: "pointer" },
  deleteBtn:  { background: "#fee2e2", color: "#dc2626", border: "1px solid #fca5a5", borderRadius: 6, padding: "5px 10px", fontSize: 12, cursor: "pointer" },
  modalBackdrop: { position: "fixed", top: 0, left: 0, width: "100%", height: "100%", background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 },
  modal:      { background: "#fff", borderRadius: 16, padding: "28px 32px", width: "100%", maxWidth: 640, boxShadow: "0 20px 60px rgba(0,0,0,0.2)" },
  modalHeader:{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 },
  modalTitle: { fontSize: 17, fontWeight: 700, color: "#111827", margin: 0 },
  closeBtn:   { background: "none", border: "none", fontSize: 18, cursor: "pointer", color: "#6b7280" },
  modalFooter:{ display: "flex", justifyContent: "flex-end", gap: 12, marginTop: 8 },
};
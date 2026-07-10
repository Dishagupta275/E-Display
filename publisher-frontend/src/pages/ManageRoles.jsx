import { useState, useEffect } from "react";
import { rolesAPI } from "../utils/api";
import Layout from "../components/Layout";

export default function ManageRoles() {
  const [roles, setRoles]           = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState(null);

  const [showForm, setShowForm]     = useState(false);
  const [form, setForm]             = useState({ name: "", description: "", permission_ids: [] });
  const [formError, setFormError]   = useState(null);
  const [saving, setSaving]         = useState(false);

  const [editRole, setEditRole]     = useState(null);
  const [editForm, setEditForm]     = useState({ name: "", description: "", permission_ids: [] });
  const [editError, setEditError]   = useState(null);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [rolesRes, permsRes] = await Promise.all([
        rolesAPI.getAll(),
        rolesAPI.getPermissions(),
      ]);
      setRoles(Array.isArray(rolesRes.data) ? rolesRes.data : []);
      setPermissions(Array.isArray(permsRes.data) ? permsRes.data : []);
      setError(null);
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to load roles.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, []);

  // Group permissions by category for a readable checklist
  const grouped = permissions.reduce((acc, p) => {
    const cat = p.category || "Other";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(p);
    return acc;
  }, {});

  const togglePermission = (ids, setIds, code) => {
    if (ids.includes(code)) setIds(ids.filter((c) => c !== code));
    else setIds([...ids, code]);
  };

  // form.permission_ids stores permission IDs (numbers); we look up by code for the checkbox state
  const permIdByCode = (code) => permissions.find((p) => p.code === code)?.id;
  const isChecked = (selectedIds, code) => selectedIds.includes(permIdByCode(code));
  const toggleId = (selectedIds, setSelectedIds, code) => {
    const id = permIdByCode(code);
    if (!id) return;
    if (selectedIds.includes(id)) setSelectedIds(selectedIds.filter((x) => x !== id));
    else setSelectedIds([...selectedIds, id]);
  };

  const handleCreate = async () => {
    if (!form.name.trim()) { setFormError("Role name is required."); return; }
    setSaving(true);
    setFormError(null);
    try {
      await rolesAPI.create({
        name: form.name.trim(),
        description: form.description.trim(),
        permission_ids: form.permission_ids,
      });
      setForm({ name: "", description: "", permission_ids: [] });
      setShowForm(false);
      fetchAll();
    } catch (err) {
      setFormError(err?.response?.data?.message || "Failed to create role.");
    } finally {
      setSaving(false);
    }
  };

  const openEdit = (role) => {
    setEditRole(role);
    const ids = role.permissions
      .map((code) => permIdByCode(code))
      .filter(Boolean);
    setEditForm({ name: role.name, description: role.description || "", permission_ids: ids });
    setEditError(null);
  };

  const handleSaveEdit = async () => {
    setSaving(true);
    setEditError(null);
    try {
      await rolesAPI.update(editRole.id, {
        name: editForm.name.trim(),
        description: editForm.description.trim(),
        permission_ids: editForm.permission_ids,
      });
      setEditRole(null);
      fetchAll();
    } catch (err) {
      setEditError(err?.response?.data?.message || "Failed to update role.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (role) => {
    if (!window.confirm(`Delete role "${role.name}"? This cannot be undone.`)) return;
    try {
      await rolesAPI.delete(role.id);
      fetchAll();
    } catch (err) {
      alert(err?.response?.data?.message || "Failed to delete role.");
    }
  };

  return (
    <Layout pageTitle="🔑 Manage Roles">
      <div style={s.page}>
        <div style={s.topBar}>
          <div>
            <h2 style={s.pageTitle}>🔑 Roles & Permissions</h2>
            <p style={s.pageSub}>Create custom roles (TPO, Placement Dept, Chairman, etc.) and control exactly what each one can access.</p>
          </div>
          <button style={s.primaryBtn} onClick={() => setShowForm((v) => !v)}>
            {showForm ? "✕ Cancel" : "+ New Role"}
          </button>
        </div>

        {error && <div style={s.errorBanner}>⚠️ {error}</div>}

        {/* Create Role Form */}
        {showForm && (
          <div style={s.card}>
            <p style={s.cardTitle}>Create New Role</p>

            <div style={s.formGroup}>
              <label style={s.label}>Role Name *</label>
              <input
                style={s.input}
                placeholder="e.g. TPO, Placement Dept, Chairman"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>

            <div style={s.formGroup}>
              <label style={s.label}>Description</label>
              <input
                style={s.input}
                placeholder="e.g. Training and Placement Officer"
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              />
            </div>

            <label style={s.label}>Permissions</label>
            <div style={s.permGrid}>
              {Object.entries(grouped).map(([category, perms]) => (
                <div key={category} style={s.permCategory}>
                  <p style={s.permCategoryTitle}>{category}</p>
                  {perms.map((p) => (
                    <label key={p.code} style={s.permRow}>
                      <input
                        type="checkbox"
                        checked={form.permission_ids.includes(p.id)}
                        onChange={() => toggleId(form.permission_ids, (ids) => setForm((f) => ({ ...f, permission_ids: ids })), p.code)}
                      />
                      {p.label}
                    </label>
                  ))}
                </div>
              ))}
            </div>

            {formError && <p style={s.errorText}>⚠️ {formError}</p>}

            <button style={s.primaryBtn} onClick={handleCreate} disabled={saving}>
              {saving ? "Creating…" : "Create Role"}
            </button>
          </div>
        )}

        {/* Roles List */}
        {loading ? (
          <div style={s.center}>
            <div style={s.spinner} />
            <p style={{ color: "#6b7280", marginTop: 12 }}>Loading roles…</p>
          </div>
        ) : (
          <div style={s.rolesGrid}>
            {roles.map((role) => (
              <div key={role.id} style={s.roleCard}>
                <div style={s.roleCardTop}>
                  <div>
                    <p style={s.roleName}>
                      {role.name}
                      {role.is_system_role && <span style={s.systemTag}>SYSTEM</span>}
                    </p>
                    {role.description && <p style={s.roleDesc}>{role.description}</p>}
                  </div>
                  {!role.is_system_role && (
                    <div style={s.roleActions}>
                      <button style={s.actionBtn} onClick={() => openEdit(role)}>✏️ Edit</button>
                      <button style={s.deleteBtn} onClick={() => handleDelete(role)}>🗑 Delete</button>
                    </div>
                  )}
                </div>
                <div style={s.permTags}>
                  {role.permissions.length === 0 ? (
                    <span style={s.noPerm}>No permissions assigned</span>
                  ) : (
                    role.permissions.map((code) => {
                      const perm = permissions.find((p) => p.code === code);
                      return <span key={code} style={s.permTag}>{perm?.label || code}</span>;
                    })
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Edit Modal */}
        {editRole && (
          <div style={s.modalBackdrop}>
            <div style={s.modal}>
              <div style={s.modalHeader}>
                <h3 style={s.modalTitle}>Edit Role — {editRole.name}</h3>
                <button style={s.closeBtn} onClick={() => setEditRole(null)}>✕</button>
              </div>

              <div style={s.formGroup}>
                <label style={s.label}>Role Name</label>
                <input
                  style={s.input}
                  value={editForm.name}
                  onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                />
              </div>

              <div style={s.formGroup}>
                <label style={s.label}>Description</label>
                <input
                  style={s.input}
                  value={editForm.description}
                  onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))}
                />
              </div>

              <label style={s.label}>Permissions</label>
              <div style={s.permGrid}>
                {Object.entries(grouped).map(([category, perms]) => (
                  <div key={category} style={s.permCategory}>
                    <p style={s.permCategoryTitle}>{category}</p>
                    {perms.map((p) => (
                      <label key={p.code} style={s.permRow}>
                        <input
                          type="checkbox"
                          checked={editForm.permission_ids.includes(p.id)}
                          onChange={() => toggleId(editForm.permission_ids, (ids) => setEditForm((f) => ({ ...f, permission_ids: ids })), p.code)}
                        />
                        {p.label}
                      </label>
                    ))}
                  </div>
                ))}
              </div>

              {editError && <p style={s.errorText}>⚠️ {editError}</p>}

              <div style={s.modalFooter}>
                <button style={s.ghostBtn} onClick={() => setEditRole(null)}>Cancel</button>
                <button style={s.primaryBtn} onClick={handleSaveEdit} disabled={saving}>
                  {saving ? "Saving…" : "Save Changes"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}

const s = {
  page:       { minHeight: "100vh", background: "#f0f2f5", padding: "28px 32px", fontFamily: "'Segoe UI', Arial, sans-serif" },
  topBar:     { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 },
  pageTitle:  { fontSize: 22, fontWeight: 700, color: "#1e3a8a", margin: 0 },
  pageSub:    { fontSize: 13, color: "#6b7280", margin: "4px 0 0", maxWidth: 520 },
  card:       { background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, padding: "20px 24px", marginBottom: 24, boxShadow: "0 1px 4px rgba(0,0,0,0.06)" },
  cardTitle:  { fontWeight: 600, fontSize: 15, color: "#111827", margin: "0 0 16px" },
  formGroup:  { display: "flex", flexDirection: "column", gap: 4, marginBottom: 14 },
  label:      { fontSize: 13, fontWeight: 600, color: "#374151" },
  input:      { border: "1px solid #d1d5db", borderRadius: 8, padding: "9px 12px", fontSize: 14, color: "#111827", outline: "none", background: "#fff", boxSizing: "border-box", width: "100%" },
  primaryBtn: { background: "#1e3a8a", color: "#fff", border: "none", borderRadius: 8, padding: "10px 20px", fontSize: 14, fontWeight: 600, cursor: "pointer" },
  ghostBtn:   { background: "transparent", color: "#374151", border: "1px solid #d1d5db", borderRadius: 8, padding: "10px 20px", fontSize: 14, fontWeight: 600, cursor: "pointer" },
  errorText:  { fontSize: 13, color: "#dc2626", margin: "8px 0" },
  errorBanner:{ background: "#fee2e2", border: "1px solid #fca5a5", color: "#991b1b", borderRadius: 8, padding: "12px 16px", marginBottom: 20, fontSize: 14 },
  center:     { display: "flex", flexDirection: "column", alignItems: "center", padding: "40px 0" },
  spinner:    { width: 32, height: 32, border: "3px solid #e5e7eb", borderTop: "3px solid #1e3a8a", borderRadius: "50%", animation: "spin 0.8s linear infinite" },

  permGrid:   { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 16, marginBottom: 8 },
  permCategory: { background: "#f9fafb", border: "1px solid #f0f0f0", borderRadius: 8, padding: "10px 12px" },
  permCategoryTitle: { fontSize: 11, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em", margin: "0 0 8px" },
  permRow:    { display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#374151", marginBottom: 6, cursor: "pointer" },

  rolesGrid:  { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 },
  roleCard:   { background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, padding: "18px 20px", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" },
  roleCardTop:{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 },
  roleName:   { fontSize: 16, fontWeight: 700, color: "#111827", margin: 0, display: "flex", alignItems: "center", gap: 8 },
  roleDesc:   { fontSize: 12, color: "#6b7280", margin: "4px 0 0" },
  systemTag:  { fontSize: 9, fontWeight: 700, background: "#fef3c7", color: "#92400e", padding: "2px 6px", borderRadius: 6, letterSpacing: "0.05em" },
  roleActions:{ display: "flex", gap: 6, flexShrink: 0 },
  actionBtn:  { background: "#f3f4f6", color: "#374151", border: "1px solid #e5e7eb", borderRadius: 6, padding: "5px 9px", fontSize: 11, cursor: "pointer" },
  deleteBtn:  { background: "#fee2e2", color: "#dc2626", border: "1px solid #fca5a5", borderRadius: 6, padding: "5px 9px", fontSize: 11, cursor: "pointer" },
  permTags:   { display: "flex", flexWrap: "wrap", gap: 6 },
  permTag:    { fontSize: 11, background: "#e0e7ff", color: "#3730a3", padding: "2px 8px", borderRadius: 12, fontWeight: 500 },
  noPerm:     { fontSize: 12, color: "#9ca3af", fontStyle: "italic" },

  modalBackdrop: { position: "fixed", top: 0, left: 0, width: "100%", height: "100%", background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 20 },
  modal:      { background: "#fff", borderRadius: 16, padding: "28px 32px", width: "100%", maxWidth: 640, maxHeight: "85vh", overflowY: "auto", boxShadow: "0 20px 60px rgba(0,0,0,0.2)" },
  modalHeader:{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  modalTitle: { fontSize: 17, fontWeight: 700, color: "#111827", margin: 0 },
  closeBtn:   { background: "none", border: "none", fontSize: 18, cursor: "pointer", color: "#6b7280" },
  modalFooter:{ display: "flex", justifyContent: "flex-end", gap: 12, marginTop: 16 },
};
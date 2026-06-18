import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { subjectsAPI, departmentsAPI } from "../utils/api";
import { useAuth } from "../context/AuthContext";

export default function Subjects() {
  const nav = useNavigate();
  const { currentUser, logout } = useAuth();

  const [departments, setDepartments] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Filters
  const [selectedDeptId, setSelectedDeptId] = useState("");
  const [selectedYear, setSelectedYear] = useState("1");

  // Create form
  const [form, setForm] = useState({ name: "", code: "" });
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState(null);
  const [createSuccess, setCreateSuccess] = useState(null);

  const canManage = ["hod", "asst_hod"].includes(currentUser?.role);

  // ── FETCH DEPARTMENTS ──────────────────
  useEffect(() => {
    departmentsAPI.getAll().then(res => {
      const depts = res.data || [];
      setDepartments(depts);

      // Auto-select user's own department for HOD/Asst HOD
      if (currentUser?.department_id) {
        setSelectedDeptId(String(currentUser.department_id));
      } else if (depts.length > 0) {
        setSelectedDeptId(String(depts[0].id));
      }
    }).catch(() => setError("Failed to load departments."));
  }, []);

  // ── FETCH SUBJECTS when dept or year changes ──
  useEffect(() => {
    if (!selectedDeptId || !selectedYear) return;
    fetchSubjects();
  }, [selectedDeptId, selectedYear]);

  const fetchSubjects = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await subjectsAPI.getByDept(
        parseInt(selectedDeptId),
        parseInt(selectedYear)
      );
      setSubjects(res.data || []);
    } catch (err) {
      setError("Failed to load subjects.");
      setSubjects([]);
    } finally {
      setLoading(false);
    }
  };

  // ── CREATE SUBJECT ─────────────────────
  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.code.trim()) {
      setCreateError("Subject name and code are both required.");
      return;
    }

    setCreating(true);
    setCreateError(null);
    setCreateSuccess(null);

    try {
      await subjectsAPI.create({
        name: form.name.trim(),
        code: form.code.trim().toUpperCase(),
        year: parseInt(selectedYear),
        // department_id is set by backend from the logged-in user's dept
      });
      setForm({ name: "", code: "" });
      setCreateSuccess(`Subject "${form.name.trim()}" added successfully.`);
      await fetchSubjects(); // refresh list
    } catch (err) {
      setCreateError(
        err.response?.data?.message || "Failed to create subject."
      );
    } finally {
      setCreating(false);
    }
  };

  // ── RENDER ─────────────────────────────
  return (
    <div style={styles.container}>

      {/* HEADER */}
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>E-DISPLAY</h1>
          <p style={styles.subtitle}>Smart Classroom Information System</p>
        </div>
        <div style={styles.userInfo}>
          <span style={styles.userName}>{currentUser?.name}</span>
          <span style={styles.userRole}>{currentUser?.role?.toUpperCase()}</span>
          <button onClick={logout} style={styles.logoutBtn}>Logout</button>
        </div>
      </div>

      {/* NAV */}
      <div style={styles.nav}>
        {[
          { label: "🏠 Dashboard", path: "/dashboard" },
          { label: "🏫 Classes", path: "/classes" },
          { label: "📚 Subjects", path: "/subjects" },
          { label: "🗓 Timetable", path: "/timetable" },
          { label: "📢 Notifications", path: "/notifications" },
        ].map(item => (
          <button
            key={item.path}
            onClick={() => nav(item.path)}
            style={{
              ...styles.navBtn,
              ...(window.location.pathname === item.path ? styles.navBtnActive : {}),
            }}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div style={styles.content}>
        <h2 style={styles.pageTitle}>📚 Subjects</h2>

        {/* FILTERS */}
        <div style={styles.card}>
          <div style={styles.filterRow}>

            {/* Department selector — principal can switch, HOD is locked */}
            <div style={styles.filterGroup}>
              <label style={styles.label}>Department</label>
              <select
                value={selectedDeptId}
                onChange={e => setSelectedDeptId(e.target.value)}
                style={styles.select}
                disabled={!!currentUser?.department_id}
              >
                {departments.map(dept => (
                  <option key={dept.id} value={dept.id}>{dept.name}</option>
                ))}
              </select>
            </div>

            {/* Year selector */}
            <div style={styles.filterGroup}>
              <label style={styles.label}>Year</label>
              <select
                value={selectedYear}
                onChange={e => setSelectedYear(e.target.value)}
                style={styles.select}
              >
                {[1, 2, 3, 4].map(y => (
                  <option key={y} value={y}>Year {y}</option>
                ))}
              </select>
            </div>

          </div>
        </div>

        {/* CREATE SUBJECT FORM — only for HOD and Asst HOD */}
        {canManage && (
          <div style={styles.card}>
            <h3 style={styles.cardTitle}>Add New Subject</h3>
            <form onSubmit={handleCreate} style={styles.formRow}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Subject Name</label>
                <input
                  type="text"
                  placeholder="e.g. Database Management Systems"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  style={styles.input}
                  disabled={creating}
                />
              </div>
              <div style={styles.formGroupSmall}>
                <label style={styles.label}>Code</label>
                <input
                  type="text"
                  placeholder="e.g. DBMS"
                  value={form.code}
                  onChange={e => setForm(f => ({ ...f, code: e.target.value }))}
                  style={styles.input}
                  disabled={creating}
                />
              </div>
              <div style={styles.formGroupBtn}>
                <label style={{ ...styles.label, opacity: 0 }}>_</label>
                <button
                  type="submit"
                  style={styles.primaryBtn}
                  disabled={creating}
                >
                  {creating ? "Adding..." : "+ Add Subject"}
                </button>
              </div>
            </form>
            {createError && <p style={styles.errorText}>{createError}</p>}
            {createSuccess && <p style={styles.successText}>{createSuccess}</p>}
          </div>
        )}

        {/* SUBJECTS LIST */}
        <div style={styles.card}>
          <h3 style={styles.cardTitle}>
            Subjects — {departments.find(d => String(d.id) === String(selectedDeptId))?.name || "..."} · Year {selectedYear}
            <span style={styles.countBadge}>{subjects.length}</span>
          </h3>

          {loading ? (
            <div style={styles.loading}>Loading subjects...</div>
          ) : error ? (
            <div style={styles.errorText}>{error}</div>
          ) : subjects.length === 0 ? (
            <div style={styles.empty}>
              No subjects found for this department and year.
              {canManage && " Add one using the form above."}
            </div>
          ) : (
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>#</th>
                  <th style={styles.th}>Subject Name</th>
                  <th style={styles.th}>Code</th>
                  <th style={styles.th}>Year</th>
                </tr>
              </thead>
              <tbody>
                {subjects.map((subject, idx) => (
                  <tr key={subject.id} style={idx % 2 === 0 ? styles.rowEven : styles.rowOdd}>
                    <td style={styles.td}>{idx + 1}</td>
                    <td style={styles.td}>{subject.name}</td>
                    <td style={styles.td}>
                      <span style={styles.codeBadge}>{subject.code}</span>
                    </td>
                    <td style={styles.td}>Year {subject.year}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

      </div>
    </div>
  );
}

const styles = {
  container: { minHeight: "100vh", background: "#f0f4f8", fontFamily: "sans-serif" },
  header: { background: "linear-gradient(135deg, #1a237e, #0d47a1)", color: "#fff", padding: "20px 32px", display: "flex", justifyContent: "space-between", alignItems: "center" },
  title: { margin: 0, fontSize: 24, fontWeight: 800, letterSpacing: 2 },
  subtitle: { margin: "4px 0 0", fontSize: 13, opacity: 0.8 },
  userInfo: { display: "flex", alignItems: "center", gap: 12 },
  userName: { fontWeight: 600, fontSize: 14, color: "#fff" },
  userRole: { fontSize: 11, background: "rgba(255,255,255,0.2)", padding: "2px 8px", borderRadius: 10, color: "#fff" },
  logoutBtn: { padding: "8px 16px", background: "rgba(255,255,255,0.2)", color: "#fff", border: "1px solid rgba(255,255,255,0.4)", borderRadius: 6, cursor: "pointer", fontSize: 13 },
  nav: { background: "#fff", padding: "12px 32px", display: "flex", gap: 8, borderBottom: "1px solid #e0e0e0", flexWrap: "wrap" },
  navBtn: { padding: "8px 16px", background: "transparent", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 14, color: "#444" },
  navBtnActive: { background: "#e8eaf6", color: "#1a237e", fontWeight: 600 },
  content: { padding: "24px 32px" },
  pageTitle: { fontSize: 20, fontWeight: 700, color: "#1a237e", marginBottom: 24 },
  card: { background: "#fff", borderRadius: 10, padding: "20px 24px", marginBottom: 20, boxShadow: "0 2px 8px rgba(0,0,0,0.06)" },
  cardTitle: { fontSize: 15, fontWeight: 600, color: "#333", marginBottom: 16, marginTop: 0, display: "flex", alignItems: "center", gap: 8 },
  countBadge: { background: "#e8eaf6", color: "#1a237e", fontSize: 12, fontWeight: 700, padding: "2px 8px", borderRadius: 10 },
  filterRow: { display: "flex", gap: 20, flexWrap: "wrap" },
  filterGroup: { display: "flex", flexDirection: "column", gap: 6, minWidth: 180 },
  formRow: { display: "flex", gap: 16, alignItems: "flex-end", flexWrap: "wrap" },
  formGroup: { display: "flex", flexDirection: "column", gap: 6, flex: 2 },
  formGroupSmall: { display: "flex", flexDirection: "column", gap: 6, flex: 1, minWidth: 100 },
  formGroupBtn: { display: "flex", flexDirection: "column", gap: 6 },
  label: { fontSize: 13, fontWeight: 600, color: "#555" },
  input: { padding: "10px 14px", border: "1px solid #ddd", borderRadius: 6, fontSize: 14, outline: "none" },
  select: { padding: "10px 14px", border: "1px solid #ddd", borderRadius: 6, fontSize: 14, outline: "none", background: "#fff" },
  primaryBtn: { padding: "10px 20px", background: "#1a237e", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 14, fontWeight: 600, whiteSpace: "nowrap" },
  errorText: { color: "#c62828", fontSize: 13, marginTop: 8 },
  successText: { color: "#2e7d32", fontSize: 13, marginTop: 8 },
  loading: { textAlign: "center", padding: 32, color: "#666" },
  empty: { textAlign: "center", padding: 32, color: "#888", fontSize: 14 },
  table: { width: "100%", borderCollapse: "collapse" },
  th: { textAlign: "left", padding: "10px 14px", background: "#1a237e", color: "#fff", fontSize: 13, fontWeight: 600 },
  td: { padding: "10px 14px", fontSize: 14, color: "#333", borderBottom: "1px solid #f0f0f0" },
  rowEven: { background: "#fff" },
  rowOdd: { background: "#f8f9ff" },
  codeBadge: { background: "#e3f2fd", color: "#0d47a1", padding: "2px 10px", borderRadius: 10, fontSize: 12, fontWeight: 700 },
};
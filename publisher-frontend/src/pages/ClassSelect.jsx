import { useEffect, useState } from "react";
import { classesAPI } from "../utils/api";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function ClassSelect() {
  const [classes, setClasses] = useState({});
  const [loading, setLoading] = useState(true);
  const nav = useNavigate();
  const { currentUser, logout } = useAuth();

  useEffect(() => {
    classesAPI.getAll()
      .then(res => setClasses(res.data || {}))
      .catch(err => console.error("Failed to load classes", err))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>E-DISPLAY</h1>
          <p style={styles.subtitle}>Select Class — Timetable Management</p>
        </div>
        <div style={styles.headerRight}>
          <button onClick={() => nav("/dashboard")} style={styles.backBtn}>← Dashboard</button>
          <button onClick={logout} style={styles.logoutBtn}>Logout</button>
        </div>
      </div>

      <div style={styles.content}>
        <h2 style={styles.pageTitle}>🗓 Select a Class to Manage Timetable</h2>

        {loading ? (
          <div style={styles.loading}>Loading classes...</div>
        ) : Object.keys(classes).length === 0 ? (
          <div style={styles.empty}>
            No classes found. <button onClick={() => nav("/classes")} style={styles.linkBtn}>Create classes first</button>
          </div>
        ) : (
          Object.entries(classes).map(([deptName, years]) => (
            <div key={deptName} style={styles.deptSection}>
              <h3 style={styles.deptTitle}>{deptName}</h3>
              {Object.entries(years).map(([yearKey, classList]) => (
                classList.length > 0 && (
                  <div key={yearKey} style={styles.yearSection}>
                    <h4 style={styles.yearTitle}>Year {yearKey.replace("year_", "")}</h4>
                    <div style={styles.classGrid}>
                      {classList.map(cls => (
                        <div key={cls.id} style={styles.classCard}>
                          <div style={styles.classTop}>
                            <span style={styles.className}>{cls.display_name}</span>
                            <span style={styles.roomBadge}>Room {cls.room_number || "N/A"}</span>
                          </div>
                          <div style={styles.classActions}>
                            <button
                              onClick={() => nav(`/timetable/${cls.id}/week`)}
                              style={styles.primaryBtn}
                            >
                              🗓 Edit Week
                            </button>
                            <button
                              onClick={() => nav(`/timetable/${cls.id}/day`)}
                              style={styles.secondaryBtn}
                            >
                              📅 Day Edit
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              ))}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

const styles = {
  container: { minHeight: "100vh", background: "#f0f4f8", fontFamily: "sans-serif" },
  header: { background: "linear-gradient(135deg, #1a237e, #0d47a1)", color: "#fff", padding: "20px 32px", display: "flex", justifyContent: "space-between", alignItems: "center" },
  title: { margin: 0, fontSize: 24, fontWeight: 800, letterSpacing: 2 },
  subtitle: { margin: "4px 0 0", fontSize: 13, opacity: 0.8 },
  headerRight: { display: "flex", gap: 8 },
  backBtn: { padding: "8px 16px", background: "rgba(255,255,255,0.2)", color: "#fff", border: "1px solid rgba(255,255,255,0.4)", borderRadius: 6, cursor: "pointer", fontSize: 13 },
  logoutBtn: { padding: "8px 16px", background: "rgba(255,255,255,0.2)", color: "#fff", border: "1px solid rgba(255,255,255,0.4)", borderRadius: 6, cursor: "pointer", fontSize: 13 },
  content: { padding: "24px 32px" },
  pageTitle: { fontSize: 20, fontWeight: 700, color: "#1a237e", marginBottom: 24 },
  loading: { textAlign: "center", padding: 60, color: "#666" },
  empty: { textAlign: "center", padding: 60, color: "#666", background: "#fff", borderRadius: 10 },
  linkBtn: { background: "none", border: "none", color: "#0d47a1", cursor: "pointer", textDecoration: "underline" },
  deptSection: { marginBottom: 32 },
  deptTitle: { fontSize: 18, fontWeight: 700, color: "#1a237e", marginBottom: 12, padding: "8px 16px", background: "#e3f2fd", borderRadius: 8, display: "inline-block" },
  yearSection: { marginBottom: 20, marginLeft: 16 },
  yearTitle: { fontSize: 14, fontWeight: 600, color: "#666", marginBottom: 10, textTransform: "uppercase", letterSpacing: 1 },
  classGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 12 },
  classCard: { background: "#fff", borderRadius: 10, padding: 16, boxShadow: "0 2px 8px rgba(0,0,0,0.06)", border: "1px solid #e0e0e0" },
  classTop: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  className: { fontSize: 16, fontWeight: 700, color: "#1a237e" },
  roomBadge: { background: "#f3e5f5", color: "#7b1fa2", padding: "2px 8px", borderRadius: 10, fontSize: 11 },
  classActions: { display: "flex", gap: 8 },
  primaryBtn: { flex: 1, padding: "8px 0", background: "#1a237e", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 12 },
  secondaryBtn: { flex: 1, padding: "8px 0", background: "#fff", color: "#1a237e", border: "1px solid #1a237e", borderRadius: 6, cursor: "pointer", fontSize: 12 },
};
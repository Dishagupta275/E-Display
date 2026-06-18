import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { classesAPI, departmentsAPI, devicesAPI } from "../utils/api";

export default function Dashboard() {
  const nav = useNavigate();
  const { currentUser, logout } = useAuth();
  const [classes, setClasses] = useState({});
  const [stats, setStats] = useState({ departments: 0, classes: 0, devices: 0 });
  const [loading, setLoading] = useState(true);

  const canManage  = ['principal', 'hod', 'asst_hod'].includes(currentUser?.role);
  const isPrincipal = currentUser?.role === 'principal';
  const isHOD      = currentUser?.role === 'hod';

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [classesRes, deptsRes] = await Promise.all([
          classesAPI.getAll(),
          departmentsAPI.getAll(),
        ]);

        const classesData = classesRes.data || {};
        setClasses(classesData);

        // Count total classes
        let totalClasses = 0;
        Object.values(classesData).forEach((dept) => {
          Object.values(dept).forEach((yearClasses) => {
            totalClasses += yearClasses.length;
          });
        });

        // Count HOD's own department classes only
        let hodClasses = 0;
        if (currentUser?.department_id) {
          Object.values(classesData).forEach((dept) => {
            Object.values(dept).forEach((yearClasses) => {
              yearClasses.forEach((cls) => {
                if (cls.department_id === currentUser.department_id) {
                  hodClasses++;
                }
              });
            });
          });
        }

        // Fetch device status
        let onlineDevices = 0;
        try {
          const devicesRes = await devicesAPI.getStatus();
          onlineDevices = (devicesRes.data || []).filter((d) => d.is_online).length;
        } catch (e) {
          // device monitoring may not be set up yet
        }

        setStats({
          departments: deptsRes.data.length,
          classes:     isPrincipal ? totalClasses : hodClasses,
          devices:     onlineDevices,
        });

      } catch (err) {
        console.error("Failed to load dashboard data", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Flatten classes for display
  const flatClasses = [];
  Object.entries(classes).forEach(([deptName, years]) => {
    Object.entries(years).forEach(([year, classList]) => {
      classList.forEach((cls) => flatClasses.push({ ...cls, deptName }));
    });
  });

  // HOD only sees their own department's classes
  const visibleClasses = (isHOD || currentUser?.role === 'asst_hod')
    ? flatClasses.filter((c) => c.department_id === currentUser?.department_id)
    : flatClasses;

  const navItems = [
    { label: " Dashboard",     path: "/dashboard",    show: true },
    { label: " Departments",   path: "/departments",  show: isPrincipal },
    { label: " Classes",       path: "/classes",      show: canManage },
    { label: " Subjects",      path: "/subjects",     show: canManage },
    { label: " Timetable",     path: "/timetable",    show: true },
    { label: " Notifications", path: "/notifications",show: canManage },
    { label: " Devices",       path: "/devices",      show: isPrincipal || isHOD },
    { label: " Users",         path: "/users",        show: isPrincipal },
  ];

  return (
    <div style={styles.container}>

      {/* HEADER */}
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Sphoorthy Engineering College</h1>
          <p style={styles.subtitle}>Smart Classroom Information System : E-DISPLAY</p>
        </div>
        <div style={styles.userInfo}>
          <div style={styles.userDetails}>
            <span style={styles.userName}>{currentUser?.name}</span>
            <span style={styles.userRole}>{currentUser?.role?.toUpperCase()}</span>
            {currentUser?.department_id && (
              <span style={styles.userDept}>Dept ID: {currentUser.department_id}</span>
            )}
          </div>
          <button onClick={logout} style={styles.logoutBtn}>Logout</button>
        </div>
      </div>

      {/* NAV */}
      <div style={styles.nav}>
        {navItems
          .filter((item) => item.show)
          .map((item) => (
            <button
              key={item.path}
              onClick={() => nav(item.path)}
              style={styles.navBtn}
            >
              {item.label}
            </button>
          ))}
      </div>

      {/* STATS */}
      <div style={styles.statsGrid}>
        {[
          {
            label: "Departments",
            value: stats.departments,
            color: "#1a237e",
            icon:  "🏢",
            show:  isPrincipal,
          },
          {
            label: isPrincipal ? "Total Classes" : "My Classes",
            value: stats.classes,
            color: "#0d47a1",
            icon:  "🏫",
            show:  true,
          },
          {
            label: "Devices Online",
            value: stats.devices,
            color: "#006064",
            icon:  "🖥",
            show:  isPrincipal || isHOD,
          },
        ]
          .filter((s) => s.show)
          .map((stat) => (
            <div
              key={stat.label}
              style={{ ...styles.statCard, borderTop: `4px solid ${stat.color}` }}
            >
              <div style={styles.statIcon}>{stat.icon}</div>
              <div style={{ ...styles.statValue, color: stat.color }}>{stat.value}</div>
              <div style={styles.statLabel}>{stat.label}</div>
            </div>
          ))}
      </div>

      {/* ROLE BANNER */}
      <div style={styles.roleBanner}>
        {isPrincipal && (
          <div style={{ ...styles.roleCard, background: "#e8eaf6", borderLeft: "4px solid #1a237e" }}>
            <strong>Principal View</strong> — You have access to all departments and full system control.
          </div>
        )}
        {(isHOD || currentUser?.role === 'asst_hod') && (
          <div style={{ ...styles.roleCard, background: "#e3f2fd", borderLeft: "4px solid #0d47a1" }}>
            <strong>{currentUser?.role === 'hod' ? 'HOD' : 'Assistant HOD'} View</strong> — You can manage classes, subjects, timetables and notifications for your department only.
          </div>
        )}
        {currentUser?.role === 'faculty' && (
          <div style={{ ...styles.roleCard, background: "#e8f5e9", borderLeft: "4px solid #2e7d32" }}>
            <strong>Faculty View</strong> — You can view timetables and receive notifications. Contact your HOD for any changes.
          </div>
        )}
      </div>

      {/* CLASSES LIST */}
      <div style={styles.section}>
        <div style={styles.sectionHeader}>
          <h2 style={styles.sectionTitle}>📋 Classes</h2>
          {canManage && (
            <button onClick={() => nav("/classes")} style={styles.manageBtn}>
              Manage Classes →
            </button>
          )}
        </div>

        {loading ? (
          <div style={styles.loading}>Loading...</div>
        ) : visibleClasses.length === 0 ? (
          <div style={styles.empty}>
            No classes found.{" "}
            {canManage && (
              <button onClick={() => nav("/classes")} style={styles.linkBtn}>
                Create a class
              </button>
            )}
          </div>
        ) : (
          <div style={styles.classGrid}>
            {visibleClasses.map((cls) => (
              <div key={cls.id} style={styles.classCard}>
                <div style={styles.classHeader}>
                  <h3 style={styles.className}>{cls.display_name}</h3>
                  <span style={styles.classBadge}>{cls.deptName}</span>
                </div>
                <p style={styles.classRoom}>
                  📍 Room: {cls.room_number || "Not assigned"}
                </p>
                {cls.incharge_name && (
                  <p style={styles.classIncharge}>👤 {cls.incharge_name}</p>
                )}
                <div style={styles.classActions}>
                  <button
                    onClick={() => nav(`/timetable/${cls.id}/week`)}
                    style={styles.actionBtn}
                  >
                    🗓 Timetable
                  </button>
                  {canManage && (
                    <button
                      onClick={() => nav("/notifications")}
                      style={styles.actionBtnAlt}
                    >
                      📢 Notify
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}

const styles = {
  container:    { minHeight: "100vh", background: "#f0f4f8", fontFamily: "sans-serif" },
  header:       { background: "linear-gradient(135deg, #1a237e, #0d47a1)", color: "#fff", padding: "20px 32px", display: "flex", justifyContent: "space-between", alignItems: "center" },
  title:        { margin: 0, fontSize: 24, fontWeight: 800, letterSpacing: 2 },
  subtitle:     { margin: "4px 0 0", fontSize: 13, opacity: 0.8 },
  userInfo:     { display: "flex", alignItems: "center", gap: 16 },
  userDetails:  { textAlign: "right" },
  userName:     { display: "block", fontWeight: 600, fontSize: 15 },
  userRole:     { display: "block", fontSize: 11, opacity: 0.8, background: "rgba(255,255,255,0.2)", padding: "2px 8px", borderRadius: 10, marginTop: 2 },
  userDept:     { display: "block", fontSize: 11, opacity: 0.6, marginTop: 2 },
  logoutBtn:    { padding: "8px 16px", background: "rgba(255,255,255,0.2)", color: "#fff", border: "1px solid rgba(255,255,255,0.4)", borderRadius: 6, cursor: "pointer", fontSize: 13 },
  nav:          { background: "#fff", padding: "12px 32px", display: "flex", gap: 8, borderBottom: "1px solid #e0e0e0", flexWrap: "wrap" },
  navBtn:       { padding: "8px 16px", background: "transparent", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 14, color: "#444" },
  statsGrid:    { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16, padding: "24px 32px 0" },
  statCard:     { background: "#fff", borderRadius: 10, padding: 20, textAlign: "center", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" },
  statIcon:     { fontSize: 28, marginBottom: 8 },
  statValue:    { fontSize: 32, fontWeight: 800, marginBottom: 4 },
  statLabel:    { fontSize: 13, color: "#666" },
  roleBanner:   { padding: "16px 32px 0" },
  roleCard:     { padding: "12px 16px", borderRadius: 8, fontSize: 13, color: "#333" },
  section:      { padding: "24px 32px" },
  sectionHeader:{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  sectionTitle: { fontSize: 18, fontWeight: 700, color: "#1a237e", margin: 0 },
  manageBtn:    { padding: "7px 16px", background: "#1a237e", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 13 },
  loading:      { textAlign: "center", padding: 40, color: "#666" },
  empty:        { textAlign: "center", padding: 40, color: "#666", background: "#fff", borderRadius: 10 },
  linkBtn:      { background: "none", border: "none", color: "#0d47a1", cursor: "pointer", textDecoration: "underline", fontSize: 14 },
  classGrid:    { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 16 },
  classCard:    { background: "#fff", borderRadius: 10, padding: 16, boxShadow: "0 2px 8px rgba(0,0,0,0.06)" },
  classHeader:  { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  className:    { margin: 0, fontSize: 16, fontWeight: 700, color: "#1a237e" },
  classBadge:   { background: "#e3f2fd", color: "#0d47a1", padding: "2px 8px", borderRadius: 10, fontSize: 11, fontWeight: 600 },
  classRoom:    { margin: "0 0 4px", fontSize: 13, color: "#666" },
  classIncharge:{ margin: "0 0 12px", fontSize: 13, color: "#666" },
  classActions: { display: "flex", gap: 8, marginTop: 12 },
  actionBtn:    { flex: 1, padding: "7px 0", background: "#1a237e", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 12 },
  actionBtnAlt: { flex: 1, padding: "7px 0", background: "#fff", color: "#1a237e", border: "1px solid #1a237e", borderRadius: 6, cursor: "pointer", fontSize: 12 },
};
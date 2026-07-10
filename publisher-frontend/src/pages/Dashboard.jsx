import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { classesAPI, departmentsAPI, devicesAPI } from "../utils/api";
import Layout from "../components/Layout";

export default function Dashboard() {
  const nav = useNavigate();
  const { currentUser, hasPermission } = useAuth();
  const [classes, setClasses] = useState({});
  const [stats, setStats] = useState({ departments: 0, classes: 0, devices: 0 });
  const [loading, setLoading] = useState(true);

  const canManageClasses = hasPermission('create_class');
  const canSeeDepartments = hasPermission('create_department');
  const canSeeDevices = hasPermission('manage_devices');
  const isDeptScoped = !!currentUser?.department_id;

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [classesRes, deptsRes] = await Promise.all([
          classesAPI.getAll(),
          departmentsAPI.getAll(),
        ]);

        const classesData = classesRes.data || {};
        setClasses(classesData);

        let totalClasses = 0;
        Object.values(classesData).forEach((dept) => {
          Object.values(dept).forEach((yearClasses) => {
            totalClasses += yearClasses.length;
          });
        });

        let ownDeptClasses = 0;
        if (currentUser?.department_id) {
          Object.values(classesData).forEach((dept) => {
            Object.values(dept).forEach((yearClasses) => {
              yearClasses.forEach((cls) => {
                if (cls.department_id === currentUser.department_id) ownDeptClasses++;
              });
            });
          });
        }

        let onlineDevices = 0;
        try {
          const devicesRes = await devicesAPI.getStatus();
          onlineDevices = (devicesRes.data || []).filter((d) => d.is_online).length;
        } catch (e) {}

        setStats({
          departments: deptsRes.data.length,
          classes:     isDeptScoped ? ownDeptClasses : totalClasses,
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

  const flatClasses = [];
  Object.entries(classes).forEach(([deptName, years]) => {
    Object.entries(years).forEach(([year, classList]) => {
      classList.forEach((cls) => flatClasses.push({ ...cls, deptName }));
    });
  });

  const visibleClasses = isDeptScoped
    ? flatClasses.filter((c) => c.department_id === currentUser?.department_id)
    : flatClasses;

  const statCards = [
    { label: "Departments",                                     value: stats.departments, color: "#1a237e", bg: "#e8eaf6", icon: "🏢", show: canSeeDepartments },
    { label: isDeptScoped ? "My Classes" : "Total Classes",      value: stats.classes,     color: "#0d47a1", bg: "#e3f2fd", icon: "🏫", show: true },
    { label: "Devices Online",                                  value: stats.devices,     color: "#006064", bg: "#e0f7fa", icon: "🖥",  show: canSeeDevices },
  ].filter(s => s.show);

  return (
    <Layout pageTitle="🏠 Dashboard">

      {/* ── STAT CARDS ── */}
      <div style={s.statsGrid}>
        {statCards.map(stat => (
          <div key={stat.label} style={{ ...s.statCard, borderTop: `4px solid ${stat.color}` }}>
            <div style={s.statIcon}>{stat.icon}</div>
            <div style={{ ...s.statValue, color: stat.color }}>{stat.value}</div>
            <div style={s.statLabel}>{stat.label}</div>
          </div>
        ))}
      </div>

      {/* ── ROLE BANNER ── */}
      <div style={{ ...s.roleBanner, background: "#e8eaf6", borderLeft: "4px solid #1a237e" }}>
        <strong>{currentUser?.role} View</strong> — {
          !isDeptScoped
            ? "Full access to all departments and system settings."
            : "Manage classes, subjects, timetables and notifications for your department."
        }
      </div>

      {/* ── CLASSES SECTION ── */}
      <div style={s.section}>
        <div style={s.sectionHeader}>
          <h2 style={s.sectionTitle}>🏫 Classes</h2>
          {canManageClasses && (
            <button onClick={() => nav("/classes")} style={s.manageBtn}>
              Manage Classes →
            </button>
          )}
        </div>

        {loading ? (
          <div style={s.loading}>Loading...</div>
        ) : visibleClasses.length === 0 ? (
          <div style={s.empty}>
            No classes found.{" "}
            {canManageClasses && (
              <button onClick={() => nav("/classes")} style={s.linkBtn}>
                Create a class
              </button>
            )}
          </div>
        ) : (
          <div style={s.classGrid}>
            {visibleClasses.map((cls) => (
              <div key={cls.id} style={s.classCard}>
                <div style={s.classCardTop}>
                  <h3 style={s.className}>{cls.display_name}</h3>
                  <span style={s.classBadge}>{cls.deptName}</span>
                </div>
                <p style={s.classMeta}>📍 Room: {cls.room_number || "Not assigned"}</p>
                {cls.incharge_name && (
                  <p style={s.classMeta}>👤 {cls.incharge_name}</p>
                )}
                <div style={s.classActions}>
                  <button onClick={() => nav(`/timetable/${cls.id}/week`)} style={s.actionBtn}>
                    🗓 Timetable
                  </button>
                  {canManageClasses && (
                    <button onClick={() => nav("/notifications")} style={s.actionBtnOutline}>
                      📢 Notify
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </Layout>
  );
}

const s = {
  statsGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16, marginBottom: 20 },
  statCard: { background: "#fff", borderRadius: 10, padding: "20px 16px", textAlign: "center", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" },
  statIcon:  { fontSize: 30, marginBottom: 8 },
  statValue: { fontSize: 34, fontWeight: 800, marginBottom: 4 },
  statLabel: { fontSize: 13, color: "#666" },
  roleBanner: { padding: "12px 18px", borderRadius: 8, fontSize: 13, color: "#333", marginBottom: 20 },
  section:       { marginTop: 4 },
  sectionHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  sectionTitle:  { fontSize: 18, fontWeight: 700, color: "#1a237e", margin: 0 },
  manageBtn:     { padding: "8px 18px", background: "#1a237e", color: "#fff", border: "none", borderRadius: 7, cursor: "pointer", fontSize: 13, fontWeight: 600 },
  loading: { textAlign: "center", padding: 40, color: "#666" },
  empty:   { textAlign: "center", padding: 40, color: "#666", background: "#fff", borderRadius: 10 },
  linkBtn: { background: "none", border: "none", color: "#0d47a1", cursor: "pointer", textDecoration: "underline", fontSize: 14 },
  classGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 16 },
  classCard: { background: "#fff", borderRadius: 10, padding: 18, boxShadow: "0 2px 8px rgba(0,0,0,0.06)" },
  classCardTop: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  className:    { margin: 0, fontSize: 16, fontWeight: 700, color: "#1a237e" },
  classBadge:   { background: "#e3f2fd", color: "#0d47a1", padding: "2px 9px", borderRadius: 10, fontSize: 11, fontWeight: 600 },
  classMeta:    { margin: "0 0 4px", fontSize: 13, color: "#666" },
  classActions: { display: "flex", gap: 8, marginTop: 12 },
  actionBtn:        { flex: 1, padding: "8px 0", background: "#1a237e", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 12, fontWeight: 600 },
  actionBtnOutline: { flex: 1, padding: "8px 0", background: "#fff", color: "#1a237e", border: "1px solid #1a237e", borderRadius: 6, cursor: "pointer", fontSize: 12, fontWeight: 600 },
};
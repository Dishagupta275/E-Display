import { useEffect, useState } from "react";
import { classesAPI } from "../utils/api";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Layout from "../components/Layout";

// ✅ new — detect mobile viewport
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

export default function ClassSelect() {
  const [classes, setClasses] = useState({});
  const [loading, setLoading] = useState(true);
  const [activeDept, setActiveDept] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false); // ✅ new — mobile dept dropdown
  const nav = useNavigate();
  const isMobile = useIsMobile(); // ✅ new

  useEffect(() => {
    classesAPI.getAll()
      .then(res => {
        const data = res.data || {};
        setClasses(data);
        // auto-select first dept
        const firstDept = Object.keys(data)[0] || null;
        setActiveDept(firstDept);
      })
      .catch(err => console.error("Failed to load classes", err))
      .finally(() => setLoading(false));
  }, []);

  const deptList = Object.keys(classes);

  // count total classes in a dept
  const countClasses = (years) =>
    Object.values(years).reduce((sum, arr) => sum + arr.length, 0);

  return (
    <Layout pageTitle="🗓 Select Class — Timetable Management">

      {loading ? (
        <div style={s.loading}>Loading classes...</div>

      ) : deptList.length === 0 ? (
        <div style={s.empty}>
          No classes found.{" "}
          <button onClick={() => nav("/classes")} style={s.linkBtn}>
            Create classes first
          </button>
        </div>

      ) : (
        <div style={isMobile ? s.pageWrapMobile : s.pageWrap}>

          {/* ── LEFT: Department sidebar (desktop) ── */}
          {!isMobile && (
            <aside style={s.sidebar}>
              <div style={s.sidebarLabel}>Departments</div>
              {deptList.map(dept => (
                <button
                  key={dept}
                  style={{
                    ...s.deptBtn,
                    ...(activeDept === dept ? s.deptBtnActive : {}),
                  }}
                  onClick={() => setActiveDept(dept)}
                >
                  <span style={{
                    ...s.deptDot,
                    background: activeDept === dept ? "#1a237e" : "#cbd5e1",
                  }} />
                  <span style={s.deptBtnName}>{dept}</span>
                  <span style={{
                    ...s.deptCount,
                    ...(activeDept === dept ? s.deptCountActive : {}),
                  }}>
                    {countClasses(classes[dept])}
                  </span>
                </button>
              ))}
            </aside>
          )}

          {/* ── Department dropdown menu (mobile) ── */}
          {isMobile && (
            <div style={s.mobileDeptWrap}>
              <button
                style={s.mobileDeptToggle}
                onClick={() => setMenuOpen(o => !o)}
              >
                <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ ...s.deptDot, background: "#1a237e" }} />
                  <span style={{ fontWeight: 700, color: "#1a237e" }}>{activeDept}</span>
                  <span style={{ ...s.deptCount, ...s.deptCountActive }}>
                    {activeDept ? countClasses(classes[activeDept]) : 0}
                  </span>
                </span>
                <span style={{ transform: menuOpen ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.15s" }}>▾</span>
              </button>

              {menuOpen && (
                <div style={s.mobileDeptMenu}>
                  <div style={s.sidebarLabel}>Departments</div>
                  {deptList.map(dept => (
                    <button
                      key={dept}
                      style={{
                        ...s.deptBtn,
                        ...(activeDept === dept ? s.deptBtnActive : {}),
                      }}
                      onClick={() => { setActiveDept(dept); setMenuOpen(false); }}
                    >
                      <span style={{
                        ...s.deptDot,
                        background: activeDept === dept ? "#1a237e" : "#cbd5e1",
                      }} />
                      <span style={s.deptBtnName}>{dept}</span>
                      <span style={{
                        ...s.deptCount,
                        ...(activeDept === dept ? s.deptCountActive : {}),
                      }}>
                        {countClasses(classes[dept])}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── RIGHT: Classes panel ── */}
          <main style={isMobile ? s.contentMobile : s.content}>
            {activeDept && (
              <>
                {/* Content header */}
                <div style={s.contentHeader}>
                  <div>
                    <div style={s.contentTitle}>{activeDept}</div>
                    <div style={s.contentSub}>
                      {countClasses(classes[activeDept])} classrooms available
                    </div>
                  </div>
                </div>

                {/* Year groups */}
                {Object.entries(classes[activeDept]).map(([yearKey, classList]) =>
                  classList.length > 0 && (
                    <div key={yearKey} style={s.yearSection}>
                      <div style={s.yearLabelRow}>
                        <span style={s.yearBadge}>
                          Year {yearKey.replace("year_", "")}
                        </span>
                        <span style={s.yearCount}>{classList.length} rooms</span>
                      </div>

                      <div style={isMobile ? s.classGridMobile : s.classGrid}>
                        {classList.map(cls => (
                          <div key={cls.id} style={s.classCard}>
                            <div style={s.classTop}>
                              <span style={s.className}>{cls.display_name}</span>
                              <span style={s.roomBadge}>
                                Room {cls.room_number || "N/A"}
                              </span>
                            </div>
                            <div style={s.classActions}>
                              <button
                                onClick={() => nav(`/timetable/${cls.id}/week`)}
                                style={s.primaryBtn}
                              >
                                🗓 Edit Week
                              </button>
                              <button
                                onClick={() => nav(`/timetable/${cls.id}/day`)}
                                style={s.secondaryBtn}
                              >
                                📅 Day Edit
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                )}
              </>
            )}
          </main>

        </div>
      )}

    </Layout>
  );
}

const s = {
  loading:      { textAlign: "center", padding: 60, color: "#666" },
  empty:        { textAlign: "center", padding: 60, color: "#666", background: "#fff", borderRadius: 10 },
  linkBtn:      { background: "none", border: "none", color: "#0d47a1", cursor: "pointer", textDecoration: "underline" },

  /* ── Layout ── */
  pageWrap:     { display: "flex", gap: 0, minHeight: "calc(100vh - 180px)", background: "#f0f4f8", borderRadius: 12, overflow: "hidden", border: "1px solid #e0e0e0" },
  // ✅ new — stacked layout on mobile instead of side-by-side
  pageWrapMobile: { display: "flex", flexDirection: "column", gap: 0, minHeight: "calc(100vh - 180px)", background: "#f0f4f8", borderRadius: 12, overflow: "visible", border: "1px solid #e0e0e0" },

  // ✅ new — collapsible department dropdown for mobile
  mobileDeptWrap:   { position: "relative", borderBottom: "1.5px solid #e8eaf6", background: "#fff" },
  mobileDeptToggle: { width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px", background: "#fff", border: "none", cursor: "pointer", fontSize: 14 },
  mobileDeptMenu:   { position: "absolute", top: "100%", left: 0, right: 0, zIndex: 20, background: "#fff", borderBottom: "1.5px solid #e8eaf6", boxShadow: "0 8px 16px rgba(0,0,0,0.08)", padding: "10px 10px 14px", display: "flex", flexDirection: "column", gap: 3, maxHeight: "60vh", overflowY: "auto" },

  /* ── Sidebar ── */
  sidebar:      { width: 200, flexShrink: 0, background: "#ffffff", borderRight: "1.5px solid #e8eaf6", padding: "16px 10px", display: "flex", flexDirection: "column", gap: 3 },
  sidebarLabel: { fontSize: 10, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase", color: "#94a3b8", padding: "0 8px 10px" },

  deptBtn:         { display: "flex", alignItems: "center", gap: 9, width: "100%", padding: "10px 10px", borderRadius: 10, border: "none", background: "transparent", cursor: "pointer", textAlign: "left", color: "#475569" },
  deptBtnActive:   { background: "#e8eaf6", color: "#1a237e" },
  deptDot:         { width: 8, height: 8, borderRadius: "50%", flexShrink: 0 },
  deptBtnName:     { fontSize: 13, fontWeight: 500, flex: 1 },
  deptCount:       { fontSize: 11, fontWeight: 600, background: "#f1f5f9", color: "#94a3b8", borderRadius: 20, padding: "2px 8px", minWidth: 24, textAlign: "center" },
  deptCountActive: { background: "#e8eaf6", color: "#1a237e" },

  /* ── Content ── */
  content:       { flex: 1, padding: "24px 28px", overflowY: "auto", display: "flex", flexDirection: "column", gap: 24 },
  // ✅ new — tighter padding on mobile, full width
  contentMobile: { flex: 1, padding: "18px 14px", overflowY: "auto", display: "flex", flexDirection: "column", gap: 20 },
  contentHeader: { display: "flex", alignItems: "flex-start", justifyContent: "space-between" },
  contentTitle:  { fontSize: 20, fontWeight: 700, color: "#1a237e" },
  contentSub:    { fontSize: 13, color: "#64748b", marginTop: 3 },

  /* ── Year ── */
  yearSection:  { display: "flex", flexDirection: "column", gap: 12 },
  yearLabelRow: { display: "flex", alignItems: "center", gap: 10 },
  yearBadge:    { fontSize: 11, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase", color: "#1a237e", background: "#e8eaf6", border: "1px solid #c5cae9", borderRadius: 20, padding: "4px 12px" },
  yearCount:    { fontSize: 12, color: "#94a3b8" },

  /* ── Cards ── */
  classGrid:    { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 12 },
  // ✅ new — single column class cards on mobile
  classGridMobile: { display: "grid", gridTemplateColumns: "1fr", gap: 12 },
  classCard:    { background: "#fff", borderRadius: 10, padding: 16, boxShadow: "0 2px 8px rgba(0,0,0,0.06)", border: "1px solid #e0e0e0" },
  classTop:     { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  className:    { fontSize: 16, fontWeight: 700, color: "#1a237e" },
  roomBadge:    { background: "#f3e5f5", color: "#7b1fa2", padding: "2px 8px", borderRadius: 10, fontSize: 11 },
  classActions: { display: "flex", gap: 8 },
  primaryBtn:   { flex: 1, padding: "8px 0", background: "#1a237e", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 12 },
  secondaryBtn: { flex: 1, padding: "8px 0", background: "#fff", color: "#1a237e", border: "1px solid #1a237e", borderRadius: 6, cursor: "pointer", fontSize: 12 },
};

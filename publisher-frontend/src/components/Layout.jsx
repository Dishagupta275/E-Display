import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Layout({ children, pageTitle }) {
  const nav = useNavigate();
  const location = useLocation();
  const { currentUser, logout } = useAuth();

  // ── All possible nav items with role access control ──────────────────────
  // "roles" = which roles can see this item
  // principal → sees everything
  // hod       → their dept: classes, subjects, timetable, notifications
  // staff     → only timetable & notifications
  const ALL_NAV = [
    {
      label: "Dashboard",
      icon: "🏠",
      path: "/dashboard",
      roles: ["principal", "hod", "asst_hod", "faculty"],
    },
    {
      label: "Classes",
      icon: "🏫",
      path: "/classes",
      roles: [ "hod", "asst_hod"],
    },
    {
      label: "Subjects",
      icon: "📚",
      path: "/subjects",
      roles: ["hod", "asst_hod"],
    },
    {
      label: "Timetable",
      icon: "🗓",
      path: "/timetable",
      roles: ["principal", "hod", "asst_hod", "faculty"],
    },
    {
      label: "Notifications",
      icon: "📢",
      path: "/notifications",
      roles: ["principal", "hod", "asst_hod", "faculty"],
    },
    {
      label: "Departments",
      icon: "🏛",
      path: "/departments",
      roles: ["principal"],           // only principal manages departments
    },
    {
      label: "Users",
      icon: "👥",
      path: "/users",
      roles: ["principal"],           // only principal manages users
    },
    {
      label: "Notice Boards",
      icon: "🏠",
      path: "/notice-boards",
      roles: ["principal", "hod"],
    },
  ];

  // Filter nav items based on the logged-in user's role
  const navItems = ALL_NAV.filter(item =>
    item.roles.includes(currentUser?.role)
  );

  const roleColors = {
    hod:       { bg: "#ffd600", text: "#1a237e" },
    asst_hod:  { bg: "#40c4ff", text: "#01579b" },
    faculty:   { bg: "#69f0ae", text: "#1b5e20" },
    principal: { bg: "#ff6e40", text: "#fff" },
  };
  const roleStyle = roleColors[currentUser?.role] || { bg: "#e0e0e0", text: "#333" };

  return (
    <div style={s.root}>

      {/* ═══════════════════════════════════ HEADER */}
      <header style={s.header}>

        {/* LEFT — college logo + name */}
        <div style={s.brandArea}>
          <div style={s.logoWrap}>
            <img
              src="/college-logo.png"
              alt="Sphoorthi Engineering College"
              style={s.logoImg}
              onError={e => {
                e.target.style.display = "none";
                e.target.nextSibling.style.display = "flex";
              }}
            />
            <div style={{ ...s.logoFallback, display: "none" }}>🏛</div>
          </div>

          <div style={s.brandText}>
            <span style={s.collegeName}>Sphoorthi Engineering College</span>
            <span style={s.appName}>E‑DISPLAY &nbsp;·&nbsp; Smart Classroom System</span>
          </div>
        </div>

        {/* RIGHT — user chip + logout */}
        <div style={s.userArea}>
          <div style={s.userChip}>
            <div style={s.avatarCircle}>
              {currentUser?.name?.[0]?.toUpperCase() || "?"}
            </div>
            <div style={s.userMeta}>
              <span style={s.userName}>{currentUser?.name}</span>
              <span style={{ ...s.roleBadge, background: roleStyle.bg, color: roleStyle.text }}>
                {currentUser?.role?.replace("_", " ").toUpperCase()}
              </span>
            </div>
          </div>
          <button onClick={logout} style={s.logoutBtn}>
            <span>⏻</span> Logout
          </button>
        </div>

      </header>

      {/* ═══════════════════════════════════ NAV BAR */}
      <nav style={s.navbar}>
        <div style={s.navInner}>
          {navItems.map(item => {
            const active = location.pathname === item.path;
            return (
              <button
                key={item.path}
                onClick={() => nav(item.path)}
                style={{ ...s.navBtn, ...(active ? s.navBtnActive : {}) }}
              >
                <span style={s.navIcon}>{item.icon}</span>
                <span>{item.label}</span>
                {active && <span style={s.activeDot} />}
              </button>
            );
          })}
        </div>

        {pageTitle && (
          <div style={s.pageTitleStrip}>
            <span style={s.pageTitleText}>{pageTitle}</span>
          </div>
        )}
      </nav>

      {/* ═══════════════════════════════════ PAGE CONTENT */}
      <main style={s.main}>
        {children}
      </main>

      {/* ═══════════════════════════════════ FOOTER */}
      <footer style={s.footer}>
        © {new Date().getFullYear()} Sphoorthi Engineering College &nbsp;·&nbsp; E-Display System
      </footer>

    </div>
  );
}

/* ─────────────────────────────── STYLES ─────────────────────────────── */
const s = {
  root: {
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column",
    background: "#f0f4f8",
    fontFamily: "'Segoe UI', system-ui, sans-serif",
  },

  header: {
    background: "linear-gradient(120deg, #0d1b6e 0%, #1565c0 60%, #0288d1 100%)",
    padding: "0 32px",
    height: 72,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    boxShadow: "0 3px 12px rgba(0,0,0,0.25)",
    position: "sticky",
    top: 0,
    zIndex: 100,
  },

  brandArea: {
    display: "flex",
    alignItems: "center",
    gap: 14,
  },

  logoWrap: {
    width: 48,
    height: 48,
    borderRadius: 10,
    overflow: "hidden",
    border: "2px solid rgba(255,255,255,0.35)",
    background: "rgba(255,255,255,0.1)",
    flexShrink: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },

  logoImg: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
  },

  logoFallback: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 26,
  },

  brandText: {
    display: "flex",
    flexDirection: "column",
    gap: 2,
  },

  collegeName: {
    color: "#ffffff",
    fontWeight: 800,
    fontSize: 17,
    letterSpacing: 0.4,
    lineHeight: 1.2,
    textShadow: "0 1px 4px rgba(0,0,0,0.3)",
  },

  appName: {
    color: "rgba(255,255,255,0.75)",
    fontSize: 11.5,
    fontWeight: 500,
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },

  userArea: {
    display: "flex",
    alignItems: "center",
    gap: 12,
  },

  userChip: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    background: "rgba(255,255,255,0.12)",
    borderRadius: 40,
    padding: "6px 14px 6px 6px",
    border: "1px solid rgba(255,255,255,0.2)",
  },

  avatarCircle: {
    width: 34,
    height: 34,
    borderRadius: "50%",
    background: "linear-gradient(135deg, #ffd600, #ff6f00)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 800,
    fontSize: 15,
    color: "#1a237e",
    flexShrink: 0,
  },

  userMeta: {
    display: "flex",
    flexDirection: "column",
    gap: 2,
  },

  userName: {
    color: "#fff",
    fontSize: 13,
    fontWeight: 600,
    lineHeight: 1,
  },

  roleBadge: {
    fontSize: 9.5,
    fontWeight: 800,
    padding: "1px 7px",
    borderRadius: 8,
    letterSpacing: 0.8,
    lineHeight: 1.6,
    width: "fit-content",
  },

  logoutBtn: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    padding: "8px 16px",
    background: "rgba(255,255,255,0.15)",
    color: "#fff",
    border: "1px solid rgba(255,255,255,0.3)",
    borderRadius: 8,
    cursor: "pointer",
    fontSize: 13,
    fontWeight: 600,
    transition: "background 0.2s",
  },

  navbar: {
    background: "#fff",
    borderBottom: "2px solid #e8eaf6",
    boxShadow: "0 2px 6px rgba(0,0,0,0.06)",
  },

  navInner: {
    display: "flex",
    gap: 4,
    padding: "8px 28px 0",
    flexWrap: "wrap",
  },

  navBtn: {
    position: "relative",
    display: "flex",
    alignItems: "center",
    gap: 7,
    padding: "9px 18px 10px",
    background: "transparent",
    border: "none",
    borderRadius: "8px 8px 0 0",
    cursor: "pointer",
    fontSize: 13.5,
    fontWeight: 500,
    color: "#555",
    transition: "all 0.15s",
  },

  navBtnActive: {
    background: "#e8eaf6",
    color: "#1a237e",
    fontWeight: 700,
    borderBottom: "3px solid #1a237e",
  },

  navIcon: {
    fontSize: 16,
  },

  activeDot: {
    position: "absolute",
    bottom: -2,
    left: "50%",
    transform: "translateX(-50%)",
    width: 5,
    height: 5,
    borderRadius: "50%",
    background: "#1a237e",
  },

  pageTitleStrip: {
    padding: "7px 32px",
    background: "linear-gradient(90deg, #e8eaf6 0%, #f5f6ff 100%)",
    borderTop: "1px solid #e0e0e0",
  },

  pageTitleText: {
    fontSize: 13,
    fontWeight: 700,
    color: "#1a237e",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },

  main: {
    flex: 1,
    padding: "28px 32px",
  },

  footer: {
    textAlign: "center",
    padding: "12px",
    fontSize: 12,
    color: "#aaa",
    background: "#fff",
    borderTop: "1px solid #eee",
  },
};
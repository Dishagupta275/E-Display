import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useState } from "react";

export default function Layout({ children, pageTitle }) {
  const nav = useNavigate();
  const location = useLocation();
  const { currentUser, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  const ALL_NAV = [
    { label: "Dashboard",    icon: "🏠", path: "/dashboard",    roles: ["principal","hod","asst_hod","faculty"] },
    { label: "Classes",      icon: "🏫", path: "/classes",      roles: ["hod","asst_hod"] },
    { label: "Subjects",     icon: "📚", path: "/subjects",     roles: ["hod","asst_hod"] },
    { label: "Timetable",    icon: "🗓", path: "/timetable",    roles: ["principal","hod","asst_hod","faculty"] },
    { label: "Notifications",icon: "📢", path: "/notifications",roles: ["principal","hod","asst_hod","faculty"] },
    { label: "Departments",  icon: "🏛", path: "/departments",  roles: ["principal"] },
    { label: "Users",        icon: "👥", path: "/users",        roles: ["principal"] },
    { label: "Notice Boards",icon: "📋", path: "/notice-boards",roles: ["principal","hod"] },
    { label: "Add Device",   icon: "📺", path: "/devices",      roles: ["principal","hod"] },
  ];

  const navItems = ALL_NAV.filter(item => item.roles.includes(currentUser?.role));

  const roleColors = {
    hod:       { bg: "#ffd600", text: "#1a237e" },
    asst_hod:  { bg: "#40c4ff", text: "#01579b" },
    faculty:   { bg: "#69f0ae", text: "#1b5e20" },
    principal: { bg: "#ff6e40", text: "#fff" },
  };
  const roleStyle = roleColors[currentUser?.role] || { bg: "#e0e0e0", text: "#333" };

  const handleNav = (path) => {
    nav(path);
    setMenuOpen(false);
  };

  return (
    <div style={s.root}>
      <style>{`
        /* ── Reset & base ── */
        *, *::before, *::after { box-sizing: border-box; }

        /* ── Header ── */
        .edl-header {
          background: linear-gradient(120deg,#0d1b6e 0%,#1565c0 60%,#0288d1 100%);
          padding: 0 24px;
          height: 64px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          box-shadow: 0 3px 12px rgba(0,0,0,0.25);
          position: sticky;
          top: 0;
          z-index: 100;
          gap: 12px;
        }

        /* ── Brand area ── */
        .edl-brand {
          display: flex;
          align-items: center;
          gap: 12px;
          min-width: 0;
          flex: 1;
        }
        .edl-logo-wrap {
          width: 42px;
          height: 42px;
          border-radius: 10px;
          overflow: hidden;
          border: 2px solid rgba(255,255,255,0.35);
          background: rgba(255,255,255,0.1);
          flex-shrink: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 22px;
        }
        .edl-logo-wrap img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .edl-brand-text {
          display: flex;
          flex-direction: column;
          gap: 2px;
          min-width: 0;
        }
        .edl-college-name {
          color: #fff;
          font-weight: 800;
          font-size: 15px;
          letter-spacing: 0.3px;
          line-height: 1.2;
          z-index: 210;
          text-shadow: 0 1px 4px rgba(0,0,0,0.3);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .edl-app-name {
          color: rgba(255,255,255,0.75);
          font-size: 10px;
          font-weight: 500;
          letter-spacing: 1px;
          text-transform: uppercase;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        /* ── User area (desktop) ── */
        .edl-user-area {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-shrink: 0;
        }
        .edl-user-chip {
          display: flex;
          align-items: center;
          gap: 8px;
          background: rgba(255,255,255,0.12);
          border-radius: 40px;
          padding: 5px 12px 5px 5px;
          border: 1px solid rgba(255,255,255,0.2);
        }
        .edl-avatar {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: linear-gradient(135deg,#ffd600,#ff6f00);
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 800;
          font-size: 14px;
          color: #1a237e;
          flex-shrink: 0;
        }
        .edl-user-meta {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .edl-user-name {
          color: #fff;
          font-size: 12px;
          font-weight: 600;
          line-height: 1;
          white-space: nowrap;
        }
        .edl-role-badge {
          font-size: 9px;
          font-weight: 800;
          padding: 1px 6px;
          border-radius: 8px;
          letter-spacing: 0.7px;
          line-height: 1.6;
          width: fit-content;
        }
        .edl-logout-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 7px 14px;
          background: rgba(255,255,255,0.15);
          color: #fff;
          border: 1px solid rgba(255,255,255,0.3);
          border-radius: 8px;
          cursor: pointer;
          font-size: 12px;
          font-weight: 600;
          white-space: nowrap;
          font-family: inherit;
          transition: background 0.2s;
        }
        .edl-logout-btn:hover { background: rgba(255,255,255,0.25); }

        /* ── Hamburger (hidden on desktop) ── */
        .edl-hamburger {
          display: none;
          flex-direction: column;
          gap: 5px;
          background: rgba(255,255,255,0.15);
          border: 1px solid rgba(255,255,255,0.3);
          border-radius: 8px;
          padding: 9px 10px;
          cursor: pointer;
          flex-shrink: 0;
        }
        .edl-hamburger span {
          display: block;
          width: 20px;
          height: 2px;
          background: #fff;
          border-radius: 2px;
          transition: all 0.25s;
        }
        .edl-hamburger.open span:nth-child(1) { transform: translateY(7px) rotate(45deg); }
        .edl-hamburger.open span:nth-child(2) { opacity: 0; }
        .edl-hamburger.open span:nth-child(3) { transform: translateY(-7px) rotate(-45deg); }

        /* ── Desktop nav bar ── */
        .edl-navbar {
          background: #fff;
          border-bottom: 2px solid #e8eaf6;
          box-shadow: 0 2px 6px rgba(0,0,0,0.06);
        }
        .edl-nav-inner {
          display: flex;
          gap: 2px;
          padding: 8px 20px 0;
          flex-wrap: wrap;
          overflow-x: auto;
          scrollbar-width: none;
        }
        .edl-nav-inner::-webkit-scrollbar { display: none; }
        .edl-nav-btn {
          position: relative;
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 9px 14px 10px;
          background: transparent;
          border: none;
          border-radius: 8px 8px 0 0;
          cursor: pointer;
          font-size: 13px;
          font-weight: 500;
          color: #555;
          white-space: nowrap;
          font-family: inherit;
          transition: all 0.15s;
          flex-shrink: 0;
        }
        .edl-nav-btn:hover { background: #f0f4ff; color: #1a237e; }
        .edl-nav-btn.active {
          background: #e8eaf6;
          color: #1a237e;
          font-weight: 700;
          border-bottom: 3px solid #1a237e;
        }
        .edl-nav-icon { font-size: 15px; }
        .edl-active-dot {
          position: absolute;
          bottom: -2px;
          left: 50%;
          transform: translateX(-50%);
          width: 5px;
          height: 5px;
          border-radius: 50%;
          background: #1a237e;
        }
        .edl-page-title-strip {
          padding: 6px 24px;
          background: linear-gradient(90deg,#e8eaf6 0%,#f5f6ff 100%);
          border-top: 1px solid #e0e0e0;
        }
        .edl-page-title-text {
          font-size: 12px;
          font-weight: 700;
          color: #1a237e;
          letter-spacing: 0.5px;
          text-transform: uppercase;
        }

        /* ── Mobile drawer ── */
        .edl-drawer-overlay {
          display: none;
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.45);
          z-index: 210
        }
        .edl-drawer {
          position: fixed;
          top: 56px;
          left: 0;
          bottom: 0;
          width: 270px;
          background: #fff;
          z-index: 220
          display: flex;
          flex-direction: column;
          box-shadow: 4px 0 24px rgba(0,0,0,0.2);
          transform: translateX(-100%);
          transition: transform 0.28s cubic-bezier(0.4,0,0.2,1);
        }
        .edl-drawer.open { transform: translateX(0); }
        .edl-drawer-overlay.open { display: block; pointer-events: none; }

        .edl-drawer-header {
          background: linear-gradient(135deg,#0d1b6e,#1565c0);
          padding: 20px 20px 16px;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .edl-drawer-user {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .edl-drawer-avatar {
          width: 44px;
          height: 44px;
          border-radius: 50%;
          background: linear-gradient(135deg,#ffd600,#ff6f00);
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 800;
          font-size: 18px;
          color: #1a237e;
          flex-shrink: 0;
        }
        .edl-drawer-user-info { display: flex; flex-direction: column; gap: 4px; }
        .edl-drawer-user-name { color: #fff; font-weight: 700; font-size: 15px; }

        .edl-drawer-nav {
          flex: 1;
          overflow-y: auto;
          padding: 10px 0;
        }
        .edl-drawer-nav-btn {
          display: flex;
          align-items: center;
          gap: 12px;
          width: 100%;
          padding: 13px 20px;
          background: transparent;
          border: none;
          cursor: pointer;
          font-size: 14px;
          font-weight: 500;
          color: #444;
          font-family: inherit;
          text-align: left;
          transition: all 0.15s;
          border-left: 3px solid transparent;
        }
        .edl-drawer-nav-btn:hover { background: #f0f4ff; color: #1a237e; }
        .edl-drawer-nav-btn.active {
          background: #e8eaf6;
          color: #1a237e;
          font-weight: 700;
          border-left-color: #1a237e;
        }
        .edl-drawer-nav-icon { font-size: 18px; width: 24px; text-align: center; }

        .edl-drawer-footer {
          padding: 16px 20px;
          border-top: 1px solid #eee;
        }
        .edl-drawer-logout {
          display: flex;
          align-items: center;
          gap: 8px;
          width: 100%;
          padding: 11px 16px;
          background: #fff0f0;
          color: #c62828;
          border: 1px solid #ffcdd2;
          border-radius: 8px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 600;
          font-family: inherit;
          justify-content: center;
          transition: background 0.2s;
        }
        .edl-drawer-logout:hover { background: #ffcdd2; }

        /* ── Main & footer ── */
        .edl-main {
          flex: 1;
          padding: 24px 28px;
        }
        .edl-footer {
          text-align: center;
          padding: 12px;
          font-size: 11px;
          color: #aaa;
          background: #fff;
          border-top: 1px solid #eee;
        }

        /* ══════════════ RESPONSIVE BREAKPOINTS ══════════════ */

        /* Tablet: hide text in desktop nav, allow scroll */
        @media (max-width: 900px) {
          .edl-nav-btn span:last-child { display: none; }
          .edl-nav-btn { padding: 9px 12px 10px; }
          .edl-nav-icon { font-size: 18px; }
          .edl-main { padding: 20px 20px; }
        }

        /* Mobile: switch to hamburger + drawer */
        @media (max-width: 640px) {
          .edl-header { padding: 0 14px; height: 56px; }
          .edl-college-name { font-size: 13px; }
          .edl-app-name { display: none; }
          .edl-logo-wrap { width: 36px; height: 36px; border-radius: 8px; }

          /* Hide desktop nav bar and desktop user area */
          .edl-navbar { display: none; }
          .edl-user-chip { display: none !important; }
          .edl-logout-btn { display: none !important; }
          .edl-user-area { display: none !important; }

          /* Show hamburger */
          .edl-hamburger { display: flex; }

          .edl-main { padding: 16px 14px; }
          .edl-footer { font-size: 10px; padding: 10px; }
        }

        /* Very small screens */
        @media (max-width: 360px) {
          .edl-brand-text { display: none; }
        }
      `}</style>

      {/* ═══ HEADER ═══ */}
      <header className="edl-header">
        {/* Brand */}
        <div className="edl-brand">
          <div className="edl-logo-wrap">
            <img
              src="/college-logo.png"
              alt="Sphoorthy Engineering College"
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
              onError={e => {
                e.target.style.display = "none";
                e.target.nextSibling.style.display = "block";
              }}
            />
            <span style={{ display: "none", fontSize: 22 }}>🏛</span>
          </div>
          <div className="edl-brand-text">
            <span className="edl-college-name">Sphoorthy Engineering College</span>
            <span className="edl-app-name">E‑DISPLAY · Smart Classroom System</span>
          </div>
        </div>

        {/* Desktop: user chip + logout */}
        <div className="edl-user-area">
          <div className="edl-user-chip">
            <div className="edl-avatar">
              {currentUser?.name?.[0]?.toUpperCase() || "?"}
            </div>
            <div className="edl-user-meta">
              <span className="edl-user-name">{currentUser?.name}</span>
              <span
                className="edl-role-badge"
                style={{ background: roleStyle.bg, color: roleStyle.text }}
              >
                {currentUser?.role?.replace("_", " ").toUpperCase()}
              </span>
            </div>
          </div>
          <button className="edl-logout-btn" onClick={logout}>
            ⏻ Logout
          </button>
        </div>

        {/* Mobile: hamburger */}
        <button
          className={`edl-hamburger ${menuOpen ? "open" : ""}`}
          onClick={() => setMenuOpen(v => !v)}
          aria-label="Toggle menu"
        >
          <span /><span /><span />
        </button>
      </header>

      {/* ═══ DESKTOP NAV BAR ═══ */}
      <nav className="edl-navbar">
        <div className="edl-nav-inner">
          {navItems.map(item => {
            const active = location.pathname === item.path;
            return (
              <button
                key={item.path}
                className={`edl-nav-btn ${active ? "active" : ""}`}
                onClick={() => nav(item.path)}
              >
                <span className="edl-nav-icon">{item.icon}</span>
                <span>{item.label}</span>
                {active && <span className="edl-active-dot" />}
              </button>
            );
          })}
        </div>
        {pageTitle && (
          <div className="edl-page-title-strip">
            <span className="edl-page-title-text">{pageTitle}</span>
          </div>
        )}
      </nav>

      {/* ═══ MOBILE DRAWER ═══ */}
      {/* Overlay */}
      <div
        className={`edl-drawer-overlay ${menuOpen ? "open" : ""}`}
        onClick={() => setMenuOpen(false)}
      />

      {/* Drawer panel */}
      <div className={`edl-drawer ${menuOpen ? "open" : ""}`}>
        {/* Drawer header with user info */}
        <div className="edl-drawer-header">
          <div className="edl-drawer-user">
            <div className="edl-drawer-avatar">
              {currentUser?.name?.[0]?.toUpperCase() || "?"}
            </div>
            <div className="edl-drawer-user-info">
              <span className="edl-drawer-user-name">{currentUser?.name}</span>
              <span
                className="edl-role-badge"
                style={{ background: roleStyle.bg, color: roleStyle.text }}
              >
                {currentUser?.role?.replace("_", " ").toUpperCase()}
              </span>
            </div>
          </div>
          {pageTitle && (
            <span style={{ color: "rgba(255,255,255,0.6)", fontSize: 11, letterSpacing: 1, textTransform: "uppercase", fontWeight: 700 }}>
              {pageTitle}
            </span>
          )}
        </div>

        {/* Nav links */}
        <div className="edl-drawer-nav">
          {navItems.map(item => {
            const active = location.pathname === item.path;
            return (
              <button
                key={item.path}
                className={`edl-drawer-nav-btn ${active ? "active" : ""}`}
                onClick={() => handleNav(item.path)}
              >
                <span className="edl-drawer-nav-icon">{item.icon}</span>
                {item.label}
              </button>
            );
          })}
        </div>

        {/* Logout */}
        <div className="edl-drawer-footer">
          <button className="edl-drawer-logout" onClick={logout}>
            ⏻ Logout
          </button>
        </div>
      </div>

      {/* ═══ PAGE CONTENT ═══ */}
      <main className="edl-main">
        {children}
      </main>

      {/* ═══ FOOTER ═══ */}
      <footer className="edl-footer">
        © {new Date().getFullYear()} Sphoorthi Engineering College · E-Display System
      </footer>
    </div>
  );
}

const s = {
  root: {
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column",
    background: "#f0f4f8",
    fontFamily: "'Segoe UI', system-ui, sans-serif",
  },
};
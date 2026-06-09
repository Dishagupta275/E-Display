import React from "react";
import { Routes, Route, Link, useLocation } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import ClassSelect from "./pages/ClassSelect";
import EmptyTimetable from "./pages/EmptyTimetable";
import WeekUpdate from "./pages/WeekUpdate";
import DayUpdate from "./pages/DayUpdate";
import Notices from "./pages/Notices";
import ClassSettings from "./pages/ClassSettings";

const NAVBAR_HEIGHT = 60;

export default function App() {
  const location = useLocation();

  const isActive = (path) => {
    if (path === "/" && location.pathname === "/") return true;
    if (path !== "/" && location.pathname.startsWith(path)) return true;
    return false;
  };

  return (
    <div style={{ minHeight: "100vh", background: "#f1f5f9", display: "flex", flexDirection: "column" }}>
      
      {/* ── NAVBAR ── */}
      <nav style={{
        background: "linear-gradient(135deg, #0f172a 0%, #1e1b4b 45%, #0f172a 100%)",
        borderBottom: "1px solid rgba(139, 92, 246, 0.35)",
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        height: NAVBAR_HEIGHT,
        boxShadow: "0 4px 24px rgba(99, 102, 241, 0.2), 0 1px 0 rgba(139,92,246,0.2)",
      }}>
        <div style={{
          maxWidth: 1100,
          margin: "0 auto",
          padding: "0 24px",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 20,
        }}>

          {/* Logo */}
          <Link to="/" style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            color: "#fff",
            fontWeight: 800,
            fontSize: 16,
            letterSpacing: "-0.4px",
            textDecoration: "none",
            flexShrink: 0,
          }}>
            <span style={{
              background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
              borderRadius: 10,
              width: 34,
              height: 34,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 17,
              boxShadow: "0 2px 10px rgba(99,102,241,0.5)",
            }}>📺</span>
            <span style={{ color: "#fff" }}>E-Display</span>
            <span style={{
              color: "rgba(165,180,252,0.7)",
              fontWeight: 400,
              fontSize: 13,
              marginLeft: -4,
            }}>Publisher</span>
          </Link>

          {/* Nav Links */}
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            {[
              { label: "Dashboard", path: "/", icon: "⊞" },
              { label: "Empty Timetable", path: "/class-select/empty", icon: "🗓" },
              { label: "Update Timetable", path: "/class-select/update", icon: "✏️" },
              { label: "Notices", path: "/notices", icon: "📢" },
            ].map(({ label, path, icon }) => {
              const active = isActive(path);
              return (
                <Link key={path} to={path} style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  color: active ? "#fff" : "rgba(196,181,253,0.75)",
                  padding: "7px 14px",
                  borderRadius: 8,
                  fontWeight: active ? 600 : 400,
                  fontSize: 13.5,
                  background: active
                    ? "linear-gradient(135deg, rgba(99,102,241,0.55), rgba(139,92,246,0.45))"
                    : "transparent",
                  border: active
                    ? "1px solid rgba(139,92,246,0.5)"
                    : "1px solid transparent",
                  boxShadow: active
                    ? "0 2px 10px rgba(99,102,241,0.3), inset 0 1px 0 rgba(255,255,255,0.1)"
                    : "none",
                  transition: "all 0.18s ease",
                  textDecoration: "none",
                  whiteSpace: "nowrap",
                }}>
                  <span style={{ fontSize: 13 }}>{icon}</span>
                  {label}
                </Link>
              );
            })}
          </div>

        </div>

        {/* Bottom accent line */}
        <div style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: 2,
          background: "linear-gradient(90deg, transparent, #6366f1, #8b5cf6, #6366f1, transparent)",
          opacity: 0.6,
        }} />
      </nav>

      {/* Spacer */}
      <div style={{ height: NAVBAR_HEIGHT, flexShrink: 0 }} />

      {/* ── MAIN ── */}
      <main style={{
        flex: 1,
        padding: "28px 20px",
        maxWidth: 1100,
        margin: "0 auto",
        width: "100%",
        boxSizing: "border-box",
      }}>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/class-select/:mode" element={<ClassSelect />} />
          <Route path="/empty/:classname" element={<EmptyTimetable />} />
          <Route path="/week/:classname" element={<WeekUpdate />} />
          <Route path="/day/:classname/:day" element={<DayUpdate />} />
          <Route path="/notices" element={<Notices />} />
          <Route path="/settings/:classname" element={<ClassSettings />} />
          <Route path="*" element={
            <div style={{ textAlign: "center", padding: "80px 20px", color: "#94a3b8" }}>
              <div style={{ fontSize: 52, marginBottom: 16 }}>🔍</div>
              <h2 style={{ color: "#475569", marginBottom: 8 }}>404 — Page not found</h2>
              <p style={{ color: "#94a3b8", marginBottom: 24, fontSize: 14 }}>
                The page you're looking for doesn't exist.
              </p>
              <Link to="/" style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "10px 22px",
                background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
                color: "#fff",
                borderRadius: 8,
                fontWeight: 600,
                fontSize: 14,
                textDecoration: "none",
                boxShadow: "0 4px 14px rgba(99,102,241,0.4)",
              }}>
                ← Back to Dashboard
              </Link>
            </div>
          } />
        </Routes>
      </main>
    </div>
  );
}
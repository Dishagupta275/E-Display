import React from "react";
import { Routes, Route, Link, useLocation } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import ClassSelect from "./pages/ClassSelect";
import EmptyTimetable from "./pages/EmptyTimetable";
import WeekUpdate from "./pages/WeekUpdate";
import DayUpdate from "./pages/DayUpdate";
import Notices from "./pages/Notices";
import ClassSettings from "./pages/ClassSettings";

export default function App() {
  const location = useLocation();

  const isActive = (path) => {
    if (path === "/" && location.pathname === "/") return true;
    if (path !== "/" && location.pathname.startsWith(path)) return true;
    return false;
  };

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-subtle)", display: "flex", flexDirection: "column" }}>
      <nav style={{
        background: "var(--slate-900)",
        borderBottom: "1px solid rgba(255,255,255,0.08)",
        position: "sticky",
        top: 0,
        zIndex: 100,
        boxShadow: "0 2px 16px rgba(0,0,0,0.2)",
      }}>
        <div style={{
          maxWidth: 1100,
          margin: "0 auto",
          padding: "0 20px",
          height: 56,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 20,
        }}>
          <Link to="/" style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            color: "#fff",
            fontWeight: 800,
            fontSize: 15,
            letterSpacing: "-0.3px",
            textDecoration: "none",
          }}>
            <span style={{
              background: "linear-gradient(135deg, #3b82f6, #8b5cf6)",
              borderRadius: 8,
              padding: "5px 8px",
              fontSize: 16,
              lineHeight: 1,
            }}>📺</span>
            E-Display
            <span style={{ color: "var(--slate-400)", fontWeight: 400, fontSize: 13 }}>Publisher</span>
          </Link>

          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            {[
              { label: "Dashboard", path: "/" },
              { label: "Empty Timetable", path: "/class-select/empty" },
              { label: "Update Timetable", path: "/class-select/update" },
              { label: "📢 Notices", path: "/notices" },
            ].map(({ label, path }) => (
              <Link key={path} to={path} style={{
                color: isActive(path) ? "#fff" : "var(--slate-400)",
                padding: "6px 12px",
                borderRadius: 6,
                fontWeight: isActive(path) ? 600 : 400,
                fontSize: 13.5,
                background: isActive(path) ? "rgba(255,255,255,0.1)" : "transparent",
                transition: "all 0.15s",
                textDecoration: "none",
              }}>
                {label}
              </Link>
            ))}
          </div>
        </div>
      </nav>

      <main style={{ flex: 1, padding: "28px 20px", maxWidth: 1100, margin: "0 auto", width: "100%" }}>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/class-select/:mode" element={<ClassSelect />} />
          <Route path="/empty/:classname" element={<EmptyTimetable />} />
          <Route path="/week/:classname" element={<WeekUpdate />} />
          <Route path="/day/:classname/:day" element={<DayUpdate />} />
          <Route path="/notices" element={<Notices />} />
          <Route path="/settings/:classname" element={<ClassSettings />} />
          <Route path="*" element={
            <div style={{ textAlign: "center", padding: "80px 20px", color: "var(--slate-400)" }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>🔍</div>
              <h2 style={{ color: "var(--slate-700)" }}>404 — Page not found</h2>
              <Link to="/" className="btn-primary" style={{ display: "inline-block", marginTop: 12, textDecoration: "none" }}>
                Back to Dashboard
              </Link>
            </div>
          } />
        </Routes>
      </main>
    </div>
  );
}

import React from "react";
import { Routes, Route, Link, useLocation } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import ClassSelect from "./pages/ClassSelect";
import EmptyTimetable from "./pages/EmptyTimetable";
import WeekUpdate from "./pages/WeekUpdate";
import DayUpdate from "./pages/DayUpdate";

export default function App() {
  const location = useLocation();

  const isActive = (path) => {
    if (path === "/" && location.pathname === "/") return true;
    if (path !== "/" && location.pathname.startsWith(path)) return true;
    return false;
  };

  const linkStyle = (path) => ({
    color: "#fff",
    marginRight: 14,
    padding: "4px 10px",
    borderRadius: 6,
    fontWeight: isActive(path) ? 700 : 400,
    background: isActive(path) ? "rgba(255,255,255,0.15)" : "transparent",
    transition: "background 0.2s",
    fontSize: 14,
  });

  return (
    <div>
      <nav style={{
        padding: "10px 20px",
        background: "linear-gradient(135deg, #0f172a, #1e293b)",
        color: "#fff",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
      }}>
        <Link to="/" style={{ fontWeight: 700, color: "#fff", fontSize: 16, textDecoration: "none" }}>
          📺 E-Display • Publisher
        </Link>
        <div>
          <Link to="/" style={linkStyle("/")}>Dashboard</Link>
          <Link to="/class-select/empty" style={linkStyle("/class-select/empty")}>Empty Timetable</Link>
          <Link to="/class-select/update" style={linkStyle("/class-select/update")}>Update Timetable</Link>
        </div>
      </nav>

      <main style={{ padding: 20, minHeight: "calc(100vh - 56px)" }}>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/class-select/:mode" element={<ClassSelect />} />
          <Route path="/empty/:classname" element={<EmptyTimetable />} />
          <Route path="/week/:classname" element={<WeekUpdate />} />
          <Route path="/day/:classname/:day" element={<DayUpdate />} />
          <Route path="*" element={
            <div style={{ textAlign: "center", padding: 60, color: "#888" }}>
              <h2>404 — Page not found</h2>
              <Link to="/" style={{ color: "#0ea5e9" }}>Go to Dashboard</Link>
            </div>
          } />
        </Routes>
      </main>
    </div>
  );
}

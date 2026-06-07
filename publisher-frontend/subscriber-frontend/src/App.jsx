import React, { useEffect, useState } from "react";
import Display from "./Display";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";

export default function App() {
  // Read class from URL ?class=CSEC
  const params = new URLSearchParams(window.location.search);
  const classFromURL = params.get("class");

  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(classFromURL || null);

  useEffect(() => {
    fetch(`${API_BASE}/api/classes`)
      .then((r) => r.json())
      .then((data) => setClasses(Array.isArray(data) ? data : []))
      .catch(() => setClasses([]))
      .finally(() => setLoading(false));
  }, []);

  const handleSelect = (name) => {
    // Update URL so the page can be bookmarked/shared
    window.history.pushState({}, "", `?class=${name}`);
    setSelected(name);
  };

  const handleBack = () => {
    window.history.pushState({}, "", "/");
    setSelected(null);
  };

  // If a class is selected, show the display
  if (selected) {
    return (
      <div>
        {/* Small back button overlay */}
        <button
          onClick={handleBack}
          style={{
            position: "fixed",
            top: 10,
            left: 10,
            zIndex: 9999,
            padding: "6px 14px",
            background: "rgba(0,0,0,0.55)",
            color: "#fff",
            border: "none",
            borderRadius: 6,
            cursor: "pointer",
            fontSize: 13,
            fontWeight: 600,
            backdropFilter: "blur(4px)",
          }}
        >
          ← Back
        </button>
        <Display classNameOverride={selected} />
      </div>
    );
  }

  // Class selector home screen
  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(135deg, #0f172a 0%, #1e3a5f 100%)",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      fontFamily: "'Segoe UI', sans-serif",
      padding: 24,
    }}>
      <div style={{ textAlign: "center", marginBottom: 40 }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>📺</div>
        <h1 style={{ color: "#fff", margin: "0 0 8px", fontSize: 28, fontWeight: 800 }}>
          E-Display Subscriber
        </h1>
        <p style={{ color: "#94a3b8", margin: 0, fontSize: 15 }}>
          Select a class to view its live timetable
        </p>
      </div>

      {loading ? (
        <div style={{ color: "#94a3b8", fontSize: 15 }}>Loading classes...</div>
      ) : classes.length === 0 ? (
        <div style={{
          color: "#f87171", fontSize: 15, textAlign: "center",
          background: "rgba(239,68,68,0.1)", padding: "16px 24px",
          borderRadius: 10, border: "1px solid rgba(239,68,68,0.3)",
        }}>
          No classes found.<br />
          <span style={{ color: "#94a3b8", fontSize: 13 }}>
            Make sure the backend is running and classes are created in the Publisher.
          </span>
        </div>
      ) : (
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
          gap: 16,
          width: "100%",
          maxWidth: 600,
        }}>
          {classes.map((cls) => {
            const name = typeof cls === "string" ? cls : cls.name;
            return (
              <button
                key={name}
                onClick={() => handleSelect(name)}
                style={{
                  padding: "24px 16px",
                  background: "rgba(255,255,255,0.07)",
                  border: "1.5px solid rgba(255,255,255,0.15)",
                  borderRadius: 12,
                  color: "#fff",
                  fontSize: 20,
                  fontWeight: 800,
                  letterSpacing: "1px",
                  cursor: "pointer",
                  transition: "all 0.2s",
                  backdropFilter: "blur(8px)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "rgba(59,130,246,0.3)";
                  e.currentTarget.style.borderColor = "#3b82f6";
                  e.currentTarget.style.transform = "translateY(-2px)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "rgba(255,255,255,0.07)";
                  e.currentTarget.style.borderColor = "rgba(255,255,255,0.15)";
                  e.currentTarget.style.transform = "translateY(0)";
                }}
              >
                {name}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

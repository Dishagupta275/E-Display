import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getClasses, createClass, checkHealth } from "../utils/api";
import { useToast } from "../components/Toast";

export default function Dashboard() {
  const nav = useNavigate();
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newClassName, setNewClassName] = useState("");
  const [creating, setCreating] = useState(false);
  const [backendUp, setBackendUp] = useState(null);
  const { addToast, ToastContainer } = useToast();

  // Check backend health
  useEffect(() => {
    checkHealth().then(setBackendUp);
  }, []);

  // Load classes
  useEffect(() => {
    loadClasses();
  }, []);

  const loadClasses = () => {
    setLoading(true);
    getClasses()
      .then((c) => setClasses(Array.isArray(c) ? c : []))
      .catch(() => {
        setClasses([]);
        addToast("Failed to load classes — is the backend running?", "error");
      })
      .finally(() => setLoading(false));
  };

  const handleCreate = async () => {
    const name = newClassName.trim().toUpperCase();
    if (!name) {
      addToast("Enter a class name", "warning");
      return;
    }
    setCreating(true);
    try {
      await createClass(name);
      addToast(`Class "${name}" created!`, "success");
      setNewClassName("");
      loadClasses();
    } catch (err) {
      addToast(err.message, "error");
    } finally {
      setCreating(false);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "—";
    try {
      return new Date(dateStr).toLocaleString(undefined, {
        day: "2-digit", month: "short", year: "numeric",
        hour: "2-digit", minute: "2-digit",
      });
    } catch { return dateStr; }
  };

  return (
    <div style={{ maxWidth: 920, margin: "0 auto" }}>
      <ToastContainer />

      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
        <h1 style={{ margin: 0 }}>Publisher Dashboard</h1>
        {backendUp !== null && (
          <span style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            padding: "4px 10px", borderRadius: 20, fontSize: 13, fontWeight: 600,
            background: backendUp ? "#dcfce7" : "#fee2e2",
            color: backendUp ? "#166534" : "#991b1b",
          }}>
            <span style={{
              width: 8, height: 8, borderRadius: "50%",
              background: backendUp ? "#22c55e" : "#ef4444",
            }} />
            {backendUp ? "Backend Online" : "Backend Offline"}
          </span>
        )}
      </div>
      <p style={{ color: "#555", marginTop: 4 }}>Choose an action to prepare or update timetables and publish to displays.</p>

      {/* ── Action Cards ── */}
      <div style={{ display: "flex", gap: 16, marginTop: 20 }}>
        <div style={cardStyle}>
          <h3 style={{ marginTop: 0 }}>📝 Empty Timetable</h3>
          <p style={{ color: "#555", fontSize: 14 }}>Create or fill a blank timetable skeleton for a class.</p>
          <button onClick={() => nav("/class-select/empty")} style={btnStyle}>Open</button>
        </div>

        <div style={cardStyle}>
          <h3 style={{ marginTop: 0 }}>📋 Update Timetable</h3>
          <p style={{ color: "#555", fontSize: 14 }}>Choose week update (full-week edits) or day update (single-day edits).</p>
          <button onClick={() => nav("/class-select/update")} style={btnStyle}>Open</button>
        </div>
      </div>

      {/* ── Create New Class ── */}
      <div style={{ marginTop: 32, padding: 20, borderRadius: 8, border: "1px solid #e2e8f0", background: "#f8fafc" }}>
        <h3 style={{ marginTop: 0 }}>➕ Create New Class</h3>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <input
            value={newClassName}
            onChange={(e) => setNewClassName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            placeholder="e.g. CSEC, ECEA, MECHA"
            style={{
              flex: 1, padding: "10px 12px", borderRadius: 6,
              border: "1px solid #cbd5e1", fontSize: 14,
            }}
          />
          <button onClick={handleCreate} style={btnStyle} disabled={creating}>
            {creating ? "Creating..." : "Create"}
          </button>
        </div>
      </div>

      {/* ── Existing Classes ── */}
      <div style={{ marginTop: 28 }}>
        <h3>📚 Existing Classes ({classes.length})</h3>
        {loading ? (
          <div className="loading-spinner" style={{ margin: "20px auto" }} />
        ) : classes.length === 0 ? (
          <p style={{ color: "#888" }}>No classes found. Create one above to get started.</p>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 12 }}>
            {classes.map((cls) => {
              const name = typeof cls === "string" ? cls : cls.name;
              const updatedAt = typeof cls === "object" ? cls.updated_at : null;
              return (
                <div key={name} style={{
                  padding: 14, borderRadius: 8, border: "1px solid #e2e8f0",
                  background: "#fff", cursor: "pointer", transition: "box-shadow 0.2s",
                }}
                  onMouseEnter={(e) => e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.08)"}
                  onMouseLeave={(e) => e.currentTarget.style.boxShadow = "none"}
                >
                  <div style={{ fontWeight: 700, fontSize: 16 }}>{name}</div>
                  {updatedAt && (
                    <div style={{ fontSize: 12, color: "#888", marginTop: 4 }}>
                      Updated: {formatDate(updatedAt)}
                    </div>
                  )}
                  <div style={{ display: "flex", gap: 6, marginTop: 10 }}>
                    <button onClick={() => nav(`/empty/${name}`)} style={smallBtn}>Empty</button>
                    <button onClick={() => nav(`/week/${name}`)} style={smallBtn}>Week</button>
                    <button onClick={() => nav(`/day/${name}/Monday`)} style={smallBtn}>Day</button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

const cardStyle = {
  flex: 1, padding: 20, borderRadius: 10,
  border: "1px solid #e2e8f0", background: "#fff",
  boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
};

const btnStyle = {
  padding: "9px 16px", background: "#0ea5e9", color: "#fff",
  border: "none", borderRadius: 6, cursor: "pointer", fontWeight: 600, fontSize: 14,
};

const smallBtn = {
  padding: "5px 10px", borderRadius: 6, border: "1px solid #cbd5e1",
  background: "#fff", cursor: "pointer", fontSize: 13,
};

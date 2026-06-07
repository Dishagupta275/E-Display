import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getClasses, createClass, deleteClass, checkHealth } from "../utils/api";
import { useToast } from "../components/Toast";

export default function Dashboard() {
  const nav = useNavigate();
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newClassName, setNewClassName] = useState("");
  const [creating, setCreating] = useState(false);
  const [deletingClass, setDeletingClass] = useState(null);
  const [backendUp, setBackendUp] = useState(null);
  const { addToast, ToastContainer } = useToast();

  useEffect(() => {
    checkHealth().then(setBackendUp);
  }, []);

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
    if (!name) { addToast("Enter a class name", "warning"); return; }
    if (name.length > 20) { addToast("Class name too long (max 20 chars)", "warning"); return; }
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

  const handleDelete = async (name) => {
    if (!window.confirm(`Delete class "${name}" and all its timetable data?`)) return;
    setDeletingClass(name);
    try {
      await deleteClass(name);
      addToast(`Class "${name}" deleted`, "success");
      loadClasses();
    } catch (err) {
      addToast(err.message, "error");
    } finally {
      setDeletingClass(null);
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
    <div style={{ maxWidth: 960, margin: "0 auto" }}>
      <ToastContainer />

      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, marginBottom: 28 }}>
        <div>
          <h1 style={{ margin: "0 0 6px", fontSize: 26, fontWeight: 800 }}>Publisher Dashboard</h1>
          <p style={{ color: "var(--text-muted)", margin: 0, fontSize: 14 }}>
            Prepare and publish class timetables to your e-ink displays.
          </p>
        </div>
        {backendUp !== null && (
          <div className={`badge ${backendUp ? "badge-success" : "badge-error"}`} style={{ flexShrink: 0, marginTop: 4 }}>
            <span style={{
              width: 7, height: 7, borderRadius: "50%",
              background: backendUp ? "#22c55e" : "#ef4444",
              animation: backendUp ? "pulse 2s infinite" : "none",
            }} />
            {backendUp ? "Backend Online" : "Backend Offline"}
          </div>
        )}
      </div>

      {/* Action Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 28 }}>
        <ActionCard
          icon="📝"
          title="Empty Timetable"
          desc="Start fresh — fill a blank timetable skeleton for a class and publish."
          onClick={() => nav("/class-select/empty")}
          color="#2563eb"
        />
        <ActionCard
          icon="📋"
          title="Update Timetable"
          desc="Edit existing data — update by full week or a single day."
          onClick={() => nav("/class-select/update")}
          color="#7c3aed"
        />
      </div>

      {/* Create Class */}
      <div className="card" style={{ marginBottom: 28 }}>
        <h3 style={{ margin: "0 0 14px", fontSize: 15, fontWeight: 700 }}>➕ Create New Class</h3>
        <div style={{ display: "flex", gap: 10 }}>
          <input
            value={newClassName}
            onChange={(e) => setNewClassName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            placeholder="e.g. CSEC, ECEA, MECHA"
            style={{ flex: 1 }}
          />
          <button
            onClick={handleCreate}
            className="btn-primary"
            disabled={creating}
            style={{ flexShrink: 0, whiteSpace: "nowrap" }}
          >
            {creating ? "Creating..." : "Create Class"}
          </button>
        </div>
      </div>

      {/* Existing Classes */}
      <div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>
            📚 Existing Classes
            <span style={{
              marginLeft: 8, fontSize: 12, fontWeight: 600,
              background: "var(--slate-100)", color: "var(--slate-500)",
              padding: "2px 8px", borderRadius: 20,
            }}>{classes.length}</span>
          </h3>
          <button onClick={loadClasses} className="btn-secondary" style={{ fontSize: 12, padding: "5px 12px" }}>
            ↻ Refresh
          </button>
        </div>

        {loading ? (
          <div style={{ textAlign: "center", padding: 40 }}>
            <div className="loading-spinner" />
            <p style={{ color: "var(--text-muted)", marginTop: 12, fontSize: 14 }}>Loading classes...</p>
          </div>
        ) : classes.length === 0 ? (
          <div style={{
            textAlign: "center", padding: "40px 20px",
            border: "1.5px dashed var(--border-strong)",
            borderRadius: "var(--radius-lg)",
            color: "var(--text-muted)",
          }}>
            <div style={{ fontSize: 36, marginBottom: 8 }}>🏫</div>
            <p style={{ margin: 0, fontSize: 14 }}>No classes yet. Create one above to get started.</p>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 12 }}>
            {classes.map((cls) => {
              const name = typeof cls === "string" ? cls : cls.name;
              const updatedAt = typeof cls === "object" ? cls.updated_at : null;
              return (
                <div key={name} className="card" style={{ padding: 16 }}>
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 8 }}>
                    <div style={{ fontWeight: 800, fontSize: 18, letterSpacing: "0.5px", color: "var(--slate-800)" }}>
                      {name}
                    </div>
                    <button
                      onClick={() => handleDelete(name)}
                      disabled={deletingClass === name}
                      style={{
                        padding: "3px 7px", fontSize: 12,
                        background: "transparent",
                        color: "var(--text-subtle)",
                        border: "1px solid var(--border)",
                        borderRadius: 6,
                        cursor: "pointer",
                      }}
                      title="Delete class"
                    >
                      {deletingClass === name ? "..." : "✕"}
                    </button>
                  </div>

                  {updatedAt && (
                    <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 12 }}>
                      Updated {formatDate(updatedAt)}
                    </div>
                  )}

                  <div style={{ display: "flex", gap: 6 }}>
                    <button onClick={() => nav(`/empty/${name}`)} className="btn-secondary"
                      style={{ flex: 1, fontSize: 12, padding: "6px 8px" }}>Empty</button>
                    <button onClick={() => nav(`/week/${name}`)} className="btn-secondary"
                      style={{ flex: 1, fontSize: 12, padding: "6px 8px" }}>Week</button>
                    <button onClick={() => nav(`/day/${name}/Monday`)} className="btn-secondary"
                      style={{ flex: 1, fontSize: 12, padding: "6px 8px" }}>Day</button>
                    <button onClick={() => nav(`/settings/${name}`)} className="btn-secondary"
                      style={{ flex: 1, fontSize: 12, padding: "6px 8px" }} title="Class Settings">⚙️</button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </div>
  );
}

function ActionCard({ icon, title, desc, onClick, color }) {
  return (
    <div
      onClick={onClick}
      className="card"
      style={{
        cursor: "pointer",
        borderLeft: `3px solid ${color}`,
        transition: "box-shadow 0.2s, transform 0.15s",
        padding: "20px 22px",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = "var(--shadow-lg)";
        e.currentTarget.style.transform = "translateY(-1px)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = "var(--shadow)";
        e.currentTarget.style.transform = "translateY(0)";
      }}
    >
      <div style={{ fontSize: 28, marginBottom: 10 }}>{icon}</div>
      <h3 style={{ margin: "0 0 6px", fontSize: 15, color: "var(--slate-800)" }}>{title}</h3>
      <p style={{ margin: 0, fontSize: 13, color: "var(--text-muted)", lineHeight: 1.5 }}>{desc}</p>
      <div style={{ marginTop: 14, fontSize: 13, fontWeight: 600, color }}>Open →</div>
    </div>
  );
}

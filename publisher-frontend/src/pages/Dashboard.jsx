import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getClasses, createClass, deleteClass, checkHealth } from "../utils/api";
import { useToast } from "../components/Toast";

const c = {
  bg: "#f5f4f0",
  surface: "#ffffff",
  border: "#e2e0d8",
  borderHover: "#c8c5ba",
  text: "#1a1917",
  textMuted: "#7a7670",
  textSubtle: "#b0ada6",
  accent: "#2d2b28",
  accentHover: "#454340",
  rose: "#f9e8e8",
  roseBorder: "#f0cece",
  tag: "#eeece7",
  tagText: "#6b6760",
};

const r = {
  sm: "8px",
  md: "12px",
  lg: "16px",
  xl: "20px",
  full: "999px",
};

export default function Dashboard() {
  const nav = useNavigate();
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newClassName, setNewClassName] = useState("");
  const [creating, setCreating] = useState(false);
  const [deletingClass, setDeletingClass] = useState(null);
  const [backendUp, setBackendUp] = useState(null);
  const { addToast, ToastContainer } = useToast();

  useEffect(() => { checkHealth().then(setBackendUp); }, []);
  useEffect(() => { loadClasses(); }, []);

  const loadClasses = () => {
    setLoading(true);
    getClasses()
      .then((d) => setClasses(Array.isArray(d) ? d : []))
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
    } catch (err) { addToast(err.message, "error"); }
    finally { setCreating(false); }
  };

  const handleDelete = async (name) => {
    if (!window.confirm(`Delete class "${name}" and all its timetable data?`)) return;
    setDeletingClass(name);
    try {
      await deleteClass(name);
      addToast(`Class "${name}" deleted`, "success");
      loadClasses();
    } catch (err) { addToast(err.message, "error"); }
    finally { setDeletingClass(null); }
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
    <div style={{
      maxWidth: 980, margin: "0 auto",
      fontFamily: "'Nunito', 'Helvetica Neue', sans-serif",
      color: c.text, background: c.bg,
      minHeight: "100vh", padding: "36px 24px",
    }}>
      <ToastContainer />

      {/* Header */}
      <div style={{
        display: "flex", alignItems: "center",
        justifyContent: "space-between", gap: 16,
        marginBottom: 32,
      }}>
        <div>
          <h1 style={{
            margin: "0 0 5px", fontSize: 24, fontWeight: 800,
            letterSpacing: "-0.5px", color: c.text,
          }}>
            Publisher Dashboard ✨
          </h1>
          <p style={{ color: c.textMuted, margin: 0, fontSize: 13.5, lineHeight: 1.5 }}>
            Prepare and publish class timetables to your e-ink displays.
          </p>
        </div>
        {backendUp !== null && (
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 7,
            fontSize: 12, fontWeight: 700,
            padding: "6px 14px",
            borderRadius: r.full,
            border: `1.5px solid ${backendUp ? "#bfe5c8" : c.roseBorder}`,
            background: backendUp ? "#eef8f1" : c.rose,
            color: backendUp ? "#2d7a47" : "#a94040",
            flexShrink: 0,
          }}>
            <span style={{
              width: 7, height: 7, borderRadius: "50%",
              background: backendUp ? "#3eb968" : "#e05555",
              animation: backendUp ? "pulse 2s infinite" : "none",
            }} />
            {backendUp ? "Backend Online" : "Backend Offline"}
          </div>
        )}
      </div>

      {/* Action Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 24 }}>
        <ActionCard
          emoji="📝"
          title="Empty Timetable"
          desc="Start fresh — fill a blank timetable skeleton for a class and publish."
          onClick={() => nav("/class-select/empty")}
          accent="#e8f0fe"
          accentBorder="#c5d8fc"
          accentText="#2a5dbf"
        />
        <ActionCard
          emoji="📋"
          title="Update Timetable"
          desc="Edit existing data — update by full week or a single day."
          onClick={() => nav("/class-select/update")}
          accent="#f0ebfe"
          accentBorder="#d5c5fb"
          accentText="#6335c4"
        />
      </div>

      {/* Create Class */}
      <div style={{
        background: c.surface, borderRadius: r.xl,
        border: `1.5px solid ${c.border}`,
        padding: "20px 22px", marginBottom: 24,
      }}>
        <h3 style={{ margin: "0 0 13px", fontSize: 13, fontWeight: 800, color: c.textMuted, letterSpacing: "0.06em", textTransform: "uppercase" }}>
          ➕ New Class
        </h3>
        <div style={{ display: "flex", gap: 9 }}>
          <input
            value={newClassName}
            onChange={(e) => setNewClassName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            placeholder="e.g. CSEC, ECEA, MECHA"
            style={{
              flex: 1, padding: "10px 14px", fontSize: 14,
              border: `1.5px solid ${c.border}`,
              borderRadius: r.md,
              background: c.bg, color: c.text,
              outline: "none", fontFamily: "inherit",
              transition: "border-color 0.15s",
            }}
            onFocus={(e) => e.target.style.borderColor = c.borderHover}
            onBlur={(e) => e.target.style.borderColor = c.border}
          />
          <button
            onClick={handleCreate}
            disabled={creating}
            style={{
              padding: "10px 20px", fontSize: 13, fontWeight: 800,
              background: c.accent, color: "#fff",
              border: "none", borderRadius: r.md,
              cursor: "pointer", whiteSpace: "nowrap",
              fontFamily: "inherit", letterSpacing: "0.02em",
              transition: "background 0.15s, transform 0.1s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = c.accentHover;
              e.currentTarget.style.transform = "translateY(-1px)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = c.accent;
              e.currentTarget.style.transform = "translateY(0)";
            }}
          >
            {creating ? "Creating..." : "Create Class"}
          </button>
        </div>
      </div>

      {/* Existing Classes */}
      <div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <h3 style={{ margin: 0, fontSize: 13, fontWeight: 800, color: c.textMuted, letterSpacing: "0.06em", textTransform: "uppercase" }}>
            📚 Classes
            <span style={{
              marginLeft: 8, fontSize: 11, fontWeight: 700,
              background: c.tag, color: c.tagText,
              padding: "2px 9px", borderRadius: r.full,
            }}>{classes.length}</span>
          </h3>
          <button
            onClick={loadClasses}
            style={{
              padding: "6px 13px", fontSize: 12, fontWeight: 700,
              background: c.surface, color: c.textMuted,
              border: `1.5px solid ${c.border}`, borderRadius: r.full,
              cursor: "pointer", fontFamily: "inherit",
              transition: "border-color 0.15s",
            }}
            onMouseEnter={(e) => e.currentTarget.style.borderColor = c.borderHover}
            onMouseLeave={(e) => e.currentTarget.style.borderColor = c.border}
          >
            ↻ Refresh
          </button>
        </div>

        {loading ? (
          <div style={{ textAlign: "center", padding: 48 }}>
            <div className="loading-spinner" />
            <p style={{ color: c.textMuted, marginTop: 12, fontSize: 13 }}>Loading classes...</p>
          </div>
        ) : classes.length === 0 ? (
          <div style={{
            textAlign: "center", padding: "48px 20px",
            border: `1.5px dashed ${c.border}`,
            borderRadius: r.xl, color: c.textMuted,
          }}>
            <div style={{ fontSize: 38, marginBottom: 10 }}>🏫</div>
            <p style={{ margin: 0, fontSize: 14 }}>No classes yet. Create one above to get started.</p>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 12 }}>
            {classes.map((cls) => {
              const name = typeof cls === "string" ? cls : cls.name;
              const updatedAt = typeof cls === "object" ? cls.updated_at : null;
              return <ClassCard
                key={name}
                name={name}
                updatedAt={updatedAt}
                deleting={deletingClass === name}
                onDelete={() => handleDelete(name)}
                onEmpty={() => nav(`/empty/${name}`)}
                onWeek={() => nav(`/week/${name}`)}
                onDay={() => nav(`/day/${name}/Monday`)}
                onSettings={() => nav(`/settings/${name}`)}
                formatDate={formatDate}
              />;
            })}
          </div>
        )}
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&display=swap');
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.35} }
        @keyframes pop { 0%{transform:scale(0.97)} 100%{transform:scale(1)} }
      `}</style>
    </div>
  );
}

function ClassCard({ name, updatedAt, deleting, onDelete, onEmpty, onWeek, onDay, onSettings, formatDate }) {
  const [hovered, setHovered] = useState(false);
  const navBtns = [
    { label: "Empty", action: onEmpty },
    { label: "Week",  action: onWeek },
    { label: "Day",   action: onDay },
    { label: "⚙️",   action: onSettings, title: "Settings" },
  ];
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: "#fff",
        border: `1.5px solid ${hovered ? "#c8c5ba" : "#e2e0d8"}`,
        borderRadius: "16px",
        padding: "16px 16px 14px",
        transition: "border-color 0.18s, box-shadow 0.18s, transform 0.18s",
        boxShadow: hovered ? "0 6px 20px rgba(0,0,0,0.07)" : "0 1px 4px rgba(0,0,0,0.04)",
        transform: hovered ? "translateY(-2px)" : "translateY(0)",
        animation: "pop 0.15s ease",
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 3 }}>
        <div style={{ fontWeight: 900, fontSize: 22, letterSpacing: "0.5px", color: "#1a1917" }}>
          {name}
        </div>
        <button
          onClick={onDelete}
          disabled={deleting}
          title="Delete class"
          style={{
            width: 26, height: 26, display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 12, background: "#f5f4f0", color: "#b0ada6",
            border: "1.5px solid #e2e0d8", borderRadius: "8px",
            cursor: "pointer", transition: "background 0.15s, color 0.15s, border-color 0.15s",
            flexShrink: 0,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "#fdeaea";
            e.currentTarget.style.color = "#c84040";
            e.currentTarget.style.borderColor = "#f0cece";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "#f5f4f0";
            e.currentTarget.style.color = "#b0ada6";
            e.currentTarget.style.borderColor = "#e2e0d8";
          }}
        >
          {deleting ? "·" : "✕"}
        </button>
      </div>

      {updatedAt && (
        <div style={{ fontSize: 11, color: "#b0ada6", marginBottom: 12, letterSpacing: "0.01em" }}>
          Updated {formatDate(updatedAt)}
        </div>
      )}

      <div style={{ display: "flex", gap: 5, marginTop: updatedAt ? 0 : 10 }}>
        {navBtns.map(({ label, action, title }) => (
          <button
            key={label}
            onClick={action}
            title={title}
            style={{
              flex: 1, padding: "6px 4px", fontSize: 11, fontWeight: 700,
              background: "#f5f4f0", color: "#4a4845",
              border: "1.5px solid #e2e0d8", borderRadius: "9px",
              cursor: "pointer", fontFamily: "inherit",
              transition: "background 0.13s, border-color 0.13s, transform 0.1s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "#eeecea";
              e.currentTarget.style.borderColor = "#c8c5ba";
              e.currentTarget.style.transform = "translateY(-1px)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "#f5f4f0";
              e.currentTarget.style.borderColor = "#e2e0d8";
              e.currentTarget.style.transform = "translateY(0)";
            }}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}

function ActionCard({ emoji, title, desc, onClick, accent, accentBorder, accentText }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: hovered ? "#fafaf8" : "#ffffff",
        border: `1.5px solid ${hovered ? "#c8c5ba" : "#e2e0d8"}`,
        borderRadius: "20px",
        padding: "22px 22px 20px",
        cursor: "pointer",
        transition: "background 0.18s, border-color 0.18s, box-shadow 0.18s, transform 0.18s",
        boxShadow: hovered ? "0 8px 24px rgba(0,0,0,0.08)" : "0 1px 4px rgba(0,0,0,0.04)",
        transform: hovered ? "translateY(-3px)" : "translateY(0)",
      }}
    >
      <div style={{
        display: "inline-flex", alignItems: "center", gap: 6,
        fontSize: 11, fontWeight: 800, letterSpacing: "0.05em",
        padding: "4px 10px", borderRadius: "999px",
        marginBottom: 12,
        background: accent, color: accentText,
        border: `1.5px solid ${accentBorder}`,
      }}>
        {emoji} {title}
      </div>
      <p style={{
        margin: "0 0 14px", fontSize: 13, color: "#7a7670", lineHeight: 1.6,
        fontFamily: "inherit",
      }}>
        {desc}
      </p>
      <div style={{
        fontSize: 12, fontWeight: 800,
        color: hovered ? "#1a1917" : "#b0ada6",
        transition: "color 0.15s",
        letterSpacing: "0.02em",
      }}>
        Open →
      </div>
    </div>
  );
}
import React, { useEffect, useState } from "react";
import { getClasses, deleteClass } from "../utils/api";
import { useNavigate, useParams, Link } from "react-router-dom";
import ConfirmModal from "../components/ConfirmModal";
import { useToast } from "../components/Toast";

const c = {
  bg: "#f5f4f0", surface: "#ffffff", border: "#e2e0d8",
  borderHover: "#c8c5ba", text: "#1a1917", textMuted: "#7a7670",
  textSubtle: "#b0ada6", accent: "#2d2b28", accentHover: "#454340",
  tag: "#eeece7", tagText: "#6b6760",
};
const font = "'Nunito', 'Helvetica Neue', sans-serif";

export default function ClassSelect() {
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [delTarget, setDelTarget] = useState(null);
  const nav = useNavigate();
  const { mode } = useParams();
  const { addToast, ToastContainer } = useToast();

  const loadClasses = () => {
    setLoading(true);
    getClasses()
      .then((c) => setClasses(Array.isArray(c) ? c : []))
      .catch(() => { setClasses([]); addToast("Failed to load classes", "error"); })
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadClasses(); }, []);

  const handleDelete = async () => {
    if (!delTarget) return;
    try {
      await deleteClass(delTarget);
      addToast(`Class "${delTarget}" deleted`, "success");
      setDelTarget(null);
      loadClasses();
    } catch (err) {
      addToast(err.message, "error");
      setDelTarget(null);
    }
  };

  return (
    <div style={{ maxWidth: 860, margin: "0 auto", fontFamily: font, color: c.text }}>
      <ToastContainer />

      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h2 style={{ margin: "0 0 5px", fontSize: 22, fontWeight: 800, color: c.text }}>
          {mode === "empty" ? "📝 Empty Timetable" : "📋 Update Timetable"}
        </h2>
        <p style={{ margin: 0, fontSize: 13, color: c.textMuted }}>
          Select a class to {mode === "empty" ? "fill a blank timetable" : "edit an existing timetable"}.
        </p>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: 48 }}>
          <div className="loading-spinner" />
          <p style={{ color: c.textMuted, marginTop: 12, fontSize: 13 }}>Loading classes...</p>
        </div>
      ) : classes.length === 0 ? (
        <div style={{
          textAlign: "center", padding: "48px 20px",
          border: `1.5px dashed ${c.border}`, borderRadius: 20, color: c.textMuted,
        }}>
          <div style={{ fontSize: 36, marginBottom: 10 }}>🏫</div>
          <p style={{ fontSize: 15, margin: "0 0 6px" }}>No classes found</p>
          <p style={{ fontSize: 13, margin: 0 }}>
            Go to the{" "}
            <Link to="/" style={{ color: c.accent, fontWeight: 700 }}>Dashboard</Link>
            {" "}to create one.
          </p>
        </div>
      ) : (
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
          gap: 12, marginTop: 4,
        }}>
          {classes.map((cls) => {
            const name = typeof cls === "string" ? cls : cls.name;
            return <ClassCard
              key={name}
              name={name}
              mode={mode}
              onOpen={() => nav(mode === "empty" ? `/empty/${name}` : `/week/${name}`)}
              onDayEdit={() => nav(`/day/${name}/Monday`)}
              onDelete={() => setDelTarget(name)}
            />;
          })}
        </div>
      )}

      <ConfirmModal
        open={!!delTarget}
        title="Delete Class"
        message={`Are you sure you want to delete "${delTarget}"? This will permanently remove the class and its timetable.`}
        onCancel={() => setDelTarget(null)}
        onConfirm={handleDelete}
      />

      <style>{`@import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&display=swap');`}</style>
    </div>
  );
}

function ClassCard({ name, mode, onOpen, onDayEdit, onDelete }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: "#fff",
        border: `1.5px solid ${hovered ? c.borderHover : c.border}`,
        borderRadius: 16, padding: "16px 16px 14px",
        boxShadow: hovered ? "0 6px 20px rgba(0,0,0,0.07)" : "0 1px 4px rgba(0,0,0,0.04)",
        transform: hovered ? "translateY(-2px)" : "translateY(0)",
        transition: "all 0.18s",
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 12 }}>
        <div style={{ fontWeight: 900, fontSize: 22, letterSpacing: "0.5px", color: c.text }}>{name}</div>
        <button
          onClick={onDelete}
          title="Delete class"
          style={{
            width: 26, height: 26, display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 12, background: c.tag, color: c.textSubtle,
            border: `1.5px solid ${c.border}`, borderRadius: 8,
            cursor: "pointer", transition: "all 0.15s", flexShrink: 0,
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = "#fdeaea"; e.currentTarget.style.color = "#c84040"; e.currentTarget.style.borderColor = "#f0cece"; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = c.tag; e.currentTarget.style.color = c.textSubtle; e.currentTarget.style.borderColor = c.border; }}
        >✕</button>
      </div>

      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        <button onClick={onOpen} style={btnStyle(true)}
          onMouseEnter={(e) => e.currentTarget.style.transform = "translateY(-1px)"}
          onMouseLeave={(e) => e.currentTarget.style.transform = "translateY(0)"}
        >Open</button>
        {mode === "update" && (
          <button onClick={onDayEdit} style={btnStyle(false)}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = c.borderHover; e.currentTarget.style.transform = "translateY(-1px)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = c.border; e.currentTarget.style.transform = "translateY(0)"; }}
          >Day Edit</button>
        )}
      </div>
    </div>
  );
}

const btnStyle = (primary) => ({
  padding: "6px 14px", fontSize: 12, fontWeight: 700,
  fontFamily: font, cursor: "pointer", borderRadius: 9,
  border: `1.5px solid ${primary ? c.accent : c.border}`,
  background: primary ? c.accent : c.surface,
  color: primary ? "#fff" : c.textMuted,
  transition: "all 0.13s",
});
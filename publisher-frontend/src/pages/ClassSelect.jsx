import React, { useEffect, useState } from "react";
import { getClasses, deleteClass } from "../utils/api";
import { useNavigate, useParams, Link } from "react-router-dom";
import ConfirmModal from "../components/ConfirmModal";
import { useToast } from "../components/Toast";

export default function ClassSelect() {
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [delTarget, setDelTarget] = useState(null);
  const nav = useNavigate();
  const { mode } = useParams(); // 'empty' or 'update'
  const { addToast, ToastContainer } = useToast();

  const loadClasses = () => {
    setLoading(true);
    getClasses()
      .then((c) => setClasses(Array.isArray(c) ? c : []))
      .catch(() => {
        setClasses([]);
        addToast("Failed to load classes", "error");
      })
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
    <div style={{ maxWidth: 850, margin: "0 auto" }}>
      <ToastContainer />

      <h2>Select Class — {mode === "empty" ? "Empty Timetable" : "Update Timetable"}</h2>

      {loading ? (
        <div style={{ textAlign: "center", padding: 40 }}>
          <div className="loading-spinner" />
          <p style={{ color: "#888", marginTop: 12 }}>Loading classes...</p>
        </div>
      ) : classes.length === 0 ? (
        <div style={{ textAlign: "center", padding: 40, color: "#888" }}>
          <p style={{ fontSize: 18 }}>No classes found</p>
          <p>Go to the <Link to="/" style={{ color: "#0ea5e9" }}>Dashboard</Link> to create one.</p>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14, marginTop: 16 }}>
          {classes.map((cls) => {
            const name = typeof cls === "string" ? cls : cls.name;
            return (
              <div key={name} style={{
                padding: 14, border: "1px solid #e2e8f0", borderRadius: 10,
                background: "#fff", position: "relative",
              }}>
                <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 10 }}>{name}</div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  <button
                    onClick={() => nav(mode === "empty" ? `/empty/${name}` : `/week/${name}`)}
                    style={cardBtn}
                  >
                    Open
                  </button>
                  {mode === "update" && (
                    <button onClick={() => nav(`/day/${name}/Monday`)} style={cardBtnAlt}>
                      Day Edit
                    </button>
                  )}
                  <button
                    onClick={() => setDelTarget(name)}
                    style={deleteBtn}
                    title="Delete class"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            );
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
    </div>
  );
}

const cardBtn = {
  padding: "6px 12px", borderRadius: 6, border: "none",
  background: "#06b6d4", color: "#fff", cursor: "pointer", fontSize: 13, fontWeight: 600,
};
const cardBtnAlt = {
  padding: "6px 12px", borderRadius: 6, border: "1px solid #cbd5e1",
  background: "#fff", cursor: "pointer", fontSize: 13,
};
const deleteBtn = {
  padding: "6px 8px", borderRadius: 6, border: "1px solid #fecaca",
  background: "#fff", cursor: "pointer", fontSize: 13, marginLeft: "auto",
};

import React from "react";

export default function ConfirmModal({ open, title, message, onCancel, onConfirm }) {
  if (!open) return null;
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ background: "#fff", padding: 20, borderRadius: 8, width: 400 }}>
        <h3>{title}</h3>
        <p style={{ color: "#444" }}>{message}</p>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <button onClick={onCancel} style={{ padding: "6px 10px" }}>Cancel</button>
          <button onClick={onConfirm} style={{ padding: "6px 10px", background: "#ef4444", color: "#fff", border: "none", borderRadius: 6 }}>Confirm</button>
        </div>
      </div>
    </div>
  );
}

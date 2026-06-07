import React, { useEffect, useCallback } from "react";

export default function ConfirmModal({ open, title, message, onCancel, onConfirm }) {
  // Close on Escape key
  const handleKeyDown = useCallback((e) => {
    if (e.key === "Escape") onCancel?.();
  }, [onCancel]);

  useEffect(() => {
    if (open) {
      document.addEventListener("keydown", handleKeyDown);
      return () => document.removeEventListener("keydown", handleKeyDown);
    }
  }, [open, handleKeyDown]);

  if (!open) return null;

  return (
    <div
      style={{
        position: "fixed", inset: 0,
        background: "rgba(0,0,0,0.45)",
        display: "flex", alignItems: "center", justifyContent: "center",
        zIndex: 1000,
        animation: "fadeIn 0.15s ease",
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onCancel?.(); }}
    >
      <div style={{
        background: "#fff", padding: 24, borderRadius: 12, width: 420,
        boxShadow: "0 20px 60px rgba(0,0,0,0.15)",
        animation: "slideUp 0.2s ease",
      }}>
        <h3 style={{ margin: "0 0 8px", fontSize: 18 }}>{title}</h3>
        <p style={{ color: "#555", margin: "0 0 20px", lineHeight: 1.5 }}>{message}</p>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
          <button onClick={onCancel} style={{
            padding: "8px 16px", borderRadius: 6,
            border: "1px solid #d1d5db", background: "#fff",
            cursor: "pointer", fontWeight: 500,
          }}>
            Cancel
          </button>
          <button onClick={onConfirm} style={{
            padding: "8px 16px", borderRadius: 6,
            background: "#ef4444", color: "#fff",
            border: "none", cursor: "pointer", fontWeight: 600,
          }}>
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}

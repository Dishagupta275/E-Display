import React, { useState, useEffect, useCallback } from "react";

let toastIdCounter = 0;

/**
 * Toast notification system.
 * Usage:
 *   const { toasts, addToast, ToastContainer } = useToast();
 *   addToast("Saved successfully!", "success");
 */
export function useToast() {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = "info", duration = 3500) => {
    const id = ++toastIdCounter;
    setToasts((prev) => [...prev, { id, message, type, exiting: false }]);

    setTimeout(() => {
      setToasts((prev) =>
        prev.map((t) => (t.id === id ? { ...t, exiting: true } : t))
      );
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 300);
    }, duration);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) =>
      prev.map((t) => (t.id === id ? { ...t, exiting: true } : t))
    );
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 300);
  }, []);

  const ToastContainer = useCallback(
    () => (
      <div className="toast-container">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`toast toast-${t.type}${t.exiting ? " toast-exit" : ""}`}
          >
            <span className="toast-icon">
              {t.type === "success" && "✓"}
              {t.type === "error" && "✕"}
              {t.type === "info" && "ℹ"}
              {t.type === "warning" && "⚠"}
            </span>
            <span className="toast-message">{t.message}</span>
            <button className="toast-close" onClick={() => removeToast(t.id)}>
              ×
            </button>
          </div>
        ))}
      </div>
    ),
    [toasts, removeToast]
  );

  return { toasts, addToast, ToastContainer };
}

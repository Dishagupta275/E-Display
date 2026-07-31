import { useState } from "react";

// Fixed unlock PIN. Change this if you want a different code.
const UNLOCK_PIN = "1234";

/**
 * LockControl
 * A lock/unlock icon button + PIN entry modal.
 *
 * Props:
 * - locked: boolean          -> current lock state (owned by the parent screen)
 * - onLockedChange: fn(bool) -> called to update the lock state
 *
 * Usage: render <LockControl locked={locked} onLockedChange={setLocked} />
 * inside any screen's header, then guard exit/navigation logic in that
 * screen with `if (!locked) { ...navigate away... }`.
 */
export default function LockControl({ locked, onLockedChange }) {
  const [showPinModal, setShowPinModal] = useState(false);
  const [pinInput, setPinInput] = useState("");
  const [pinError, setPinError] = useState("");

  const handleIconClick = () => {
    if (locked) {
      // Already locked -> ask for PIN to unlock
      setPinInput("");
      setPinError("");
      setShowPinModal(true);
    } else {
      // Not locked -> lock immediately, no PIN needed to lock
      onLockedChange(true);
    }
  };

  const handlePinSubmit = (e) => {
    e.preventDefault();
    if (pinInput === UNLOCK_PIN) {
      onLockedChange(false);
      setShowPinModal(false);
      setPinInput("");
      setPinError("");
    } else {
      setPinError("Incorrect PIN. Try again.");
      setPinInput("");
    }
  };

  const closeModal = () => {
    setShowPinModal(false);
    setPinInput("");
    setPinError("");
  };

  return (
    <>
      <button
        onClick={handleIconClick}
        title={locked ? "Display locked — tap to unlock" : "Tap to lock display"}
        aria-label={locked ? "Unlock display" : "Lock display"}
        style={{
          ...styles.lockBtn,
          background: locked ? "rgba(220,38,38,0.9)" : "rgba(255,255,255,0.15)",
          borderColor: locked ? "rgba(220,38,38,1)" : "rgba(255,255,255,0.35)",
        }}
      >
        {locked ? (
          // Closed padlock
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="4" y="11" width="16" height="10" rx="2" />
            <path d="M8 11V7a4 4 0 0 1 8 0v4" />
          </svg>
        ) : (
          // Open padlock
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="4" y="11" width="16" height="10" rx="2" />
            <path d="M8 11V7a4 4 0 0 1 7.65-1.65" />
          </svg>
        )}
      </button>

      {showPinModal && (
        <div style={styles.backdrop} onClick={closeModal}>
          <form
            style={styles.modal}
            onClick={(e) => e.stopPropagation()}
            onSubmit={handlePinSubmit}
          >
            <div style={styles.modalIcon}>
              <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#0d2b6b" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <rect x="4" y="11" width="16" height="10" rx="2" />
                <path d="M8 11V7a4 4 0 0 1 8 0v4" />
              </svg>
            </div>
            <div style={styles.modalTitle}>Display Locked</div>
            <div style={styles.modalSubtitle}>Enter PIN to unlock and use the board normally</div>

            <input
              type="password"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={4}
              autoFocus
              value={pinInput}
              onChange={(e) => {
                setPinError("");
                setPinInput(e.target.value.replace(/\D/g, ""));
              }}
              placeholder="••••"
              style={styles.pinInput}
            />

            {pinError && <div style={styles.pinError}>{pinError}</div>}

            <div style={styles.btnRow}>
              <button type="button" onClick={closeModal} style={styles.cancelBtn}>
                Cancel
              </button>
              <button type="submit" style={styles.unlockBtn}>
                Unlock
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}

const styles = {
  lockBtn: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: 38,
    height: 38,
    borderRadius: 10,
    border: "1.5px solid",
    cursor: "pointer",
    transition: "all 0.15s",
    flexShrink: 0,
  },
  backdrop: {
    position: "fixed",
    inset: 0,
    width: "100vw",
    height: "100vh",
    background: "rgba(5,15,40,0.72)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 100000,
    backdropFilter: "blur(4px)",
  },
  modal: {
    width: 320,
    maxWidth: "88vw",
    background: "#fff",
    borderRadius: 16,
    padding: "32px 28px",
    textAlign: "center",
    boxShadow: "0 20px 60px rgba(0,0,0,0.35)",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
  },
  modalIcon: { display: "flex", justifyContent: "center", marginBottom: 10 },
  modalTitle: { fontSize: 19, fontWeight: 800, color: "#111827", marginBottom: 4 },
  modalSubtitle: { fontSize: 13, color: "#6b7280", marginBottom: 20 },
  pinInput: {
    width: "100%",
    boxSizing: "border-box",
    padding: "14px",
    fontSize: 24,
    letterSpacing: 10,
    textAlign: "center",
    borderRadius: 10,
    border: "1.5px solid #d1d5db",
    outline: "none",
    marginBottom: 8,
  },
  pinError: {
    color: "#dc2626",
    fontSize: 13,
    fontWeight: 600,
    marginBottom: 8,
  },
  btnRow: {
    display: "flex",
    gap: 10,
    width: "100%",
    marginTop: 12,
  },
  cancelBtn: {
    flex: 1,
    padding: "12px",
    borderRadius: 10,
    border: "1.5px solid #e5e7eb",
    background: "#fff",
    color: "#374151",
    fontWeight: 700,
    fontSize: 14,
    cursor: "pointer",
  },
  unlockBtn: {
    flex: 1,
    padding: "12px",
    borderRadius: 10,
    border: "none",
    background: "#0d2b6b",
    color: "#fff",
    fontWeight: 700,
    fontSize: 14,
    cursor: "pointer",
  },
};

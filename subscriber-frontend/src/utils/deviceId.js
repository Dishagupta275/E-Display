// Persistent, self-generated device identity for this physical display.
//
// Browsers cannot read a machine's MAC address from JS (security restriction),
// so instead we generate a random UUID the first time the display ever loads
// and store it in localStorage. Because localStorage is disk-backed, this ID
// survives app reloads, browser restarts, and power cuts to the Raspberry Pi.
// It only changes if someone wipes the browser profile or flashes a new SD card.

const STORAGE_KEY = "edisplay_device_id";

function generateUUID() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback for very old browsers/webviews without crypto.randomUUID
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Returns this device's persistent UUID, generating and saving one
 * on first run. Always call this instead of generating a UUID directly.
 */
export function getDeviceId() {
  try {
    let id = localStorage.getItem(STORAGE_KEY);
    if (!id) {
      id = generateUUID();
      localStorage.setItem(STORAGE_KEY, id);
    }
    return id;
  } catch (e) {
    // localStorage unavailable (e.g. private mode edge case) — fall back to
    // an in-memory id for this session only. Will re-register next load.
    return generateUUID();
  }
}

/**
 * Clears the stored device ID. Useful for a hidden "reset this display"
 * admin action — the device will register as brand-new on next load.
 */
export function resetDeviceId() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (e) {
    /* no-op */
  }
}

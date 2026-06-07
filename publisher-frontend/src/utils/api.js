// ── API Configuration ──
// In production, set VITE_API_URL in your Vercel/Netlify environment variables
// to point to your Render backend URL (e.g., https://e-display-backend.onrender.com)
const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";

export { API_BASE };

// ─── Classes ───

export async function getClasses() {
  const res = await fetch(`${API_BASE}/api/classes`);
  if (!res.ok) throw new Error("Failed to load classes");
  return res.json();
}

export async function createClass(name) {
  const res = await fetch(`${API_BASE}/api/classes`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Failed to create class");
  return data;
}

export async function deleteClass(cls) {
  const res = await fetch(`${API_BASE}/api/classes/${cls}`, {
    method: "DELETE",
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Failed to delete class");
  return data;
}

// ─── Timetable ───

export async function getTimetable(cls) {
  const res = await fetch(`${API_BASE}/api/timetable/${cls}`);
  if (!res.ok) throw new Error("Failed to load timetable");
  return res.json();
}

export async function saveTimetable(cls, data) {
  const res = await fetch(`${API_BASE}/api/timetable/${cls}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || "Save failed");
  }
  return res.json();
}

export async function publishTimetable(cls, data) {
  const res = await fetch(`${API_BASE}/api/timetable/${cls}/publish`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || "Publish failed");
  }
  return res.json();
}

// ─── Health ───

export async function checkHealth() {
  try {
    const res = await fetch(`${API_BASE}/api/health`);
    return res.ok;
  } catch {
    return false;
  }
}

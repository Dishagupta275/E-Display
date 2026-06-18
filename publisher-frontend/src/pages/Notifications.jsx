import { useEffect, useState } from "react";
import { classesAPI, notificationsAPI, departmentsAPI } from "../utils/api";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Layout from "../components/Layout";
export default function Notifications() {
  const nav = useNavigate();
  const { currentUser, logout } = useAuth();

  const [classes, setClasses]           = useState([]);
  const [departments, setDepartments]   = useState([]);
  const [active, setActive]             = useState([]);
  const [targetType, setTargetType]     = useState("all");
  const [targetId, setTargetId]         = useState("");
  const [notifType, setNotifType]       = useState("text");
  const [title, setTitle]               = useState("");
  const [message, setMessage]           = useState("");
  const [expiresMinutes, setExpiresMinutes] = useState(10);
  const [sending, setSending]           = useState(false);
  const [saveMsg, setSaveMsg]           = useState(null);
  const [deletingId, setDeletingId]     = useState(null);

  const isPrincipal = currentUser?.role === "principal";
  const isHOD       = currentUser?.role === "hod";
  const isAsstHOD   = currentUser?.role === "asst_hod";

  // For HOD/asst_hod, lock target to their department's classes only
  const visibleClasses = (isHOD || isAsstHOD)
    ? classes.filter((c) => c.department_id === currentUser?.department_id)
    : classes;

  const visibleDepartments = (isHOD || isAsstHOD)
    ? departments.filter((d) => d.id === currentUser?.department_id)
    : departments;

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [classesRes, deptsRes] = await Promise.all([
          classesAPI.getAll(),
          departmentsAPI.getAll(),
        ]);

        const flat = [];
        Object.values(classesRes.data || {}).forEach((dept) => {
          Object.values(dept).forEach((year) => flat.push(...year));
        });
        setClasses(flat);
        setDepartments(deptsRes.data || []);

        // Load active notifications for first class or all
        fetchActiveNotifications(flat);
      } catch (e) {
        console.error(e);
      }
    };
    fetchAll();
  }, []);

  const fetchActiveNotifications = async (classList) => {
    try {
      // Fetch active notifications using first class as reference
      const cls = classList?.[0];
      if (!cls) return;
      const res = await notificationsAPI.getActive(cls.id);
      setActive(res.data || []);
    } catch (e) {
      console.error(e);
    }
  };

  const handleSend = async () => {
    if (!title.trim())   { setSaveMsg({ type: "error", text: "Title is required." }); return; }
    if (!message.trim()) { setSaveMsg({ type: "error", text: "Message is required." }); return; }
    if (targetType === "class" && !targetId) {
      setSaveMsg({ type: "error", text: "Please select a class." }); return;
    }
    if (targetType === "department" && !targetId) {
      setSaveMsg({ type: "error", text: "Please select a department." }); return;
    }

    setSending(true);
    setSaveMsg(null);
    try {
      await notificationsAPI.send({
        title:             title.trim(),
        message:           message.trim(),
        notification_type: notifType,
        target_type:       targetType,
        target_id:         targetId ? parseInt(targetId) : null,
        expires_minutes:   parseInt(expiresMinutes),
      });
      setSaveMsg({ type: "success", text: "✅ Notification sent successfully!" });
      setTitle("");
      setMessage("");
      setTargetId("");
      // Refresh active list
      fetchActiveNotifications(classes);
    } catch (e) {
      setSaveMsg({
        type: "error",
        text: "❌ " + (e?.response?.data?.message || e.message),
      });
    } finally {
      setSending(false);
    }
  };

  const handleDelete = async (id) => {
    setDeletingId(id);
    try {
      await notificationsAPI.delete(id);
      setActive((prev) => prev.filter((n) => n.id !== id));
    } catch (e) {
      alert(e?.response?.data?.message || "Failed to delete notification.");
    } finally {
      setDeletingId(null);
    }
  };

  const formatExpiry = (isoString) => {
    if (!isoString) return "No expiry";
    const date = new Date(isoString);
    const now  = new Date();
    const diff = Math.floor((date - now) / 1000 / 60);
    if (diff <= 0) return "Expired";
    if (diff < 60) return `Expires in ${diff}m`;
    return `Expires in ${Math.floor(diff / 60)}h ${diff % 60}m`;
  };

  return (
  <Layout pageTitle="📢 Notifications">
    <div style={s.container}>
    

      <div style={s.content}>
        <div style={s.topBar}>
  <div>
    <h2 style={s.pageTitle}>📢 Notification Management</h2>
    <p style={s.pageSub}>
      Create and manage notifications across departments and classes
    </p>
  </div>
</div>

        {/* Save message */}
        {saveMsg && (
          <div style={{
            ...s.msgBanner,
            background: saveMsg.type === "success" ? "#e8f5e9" : "#fee2e2",
            color:      saveMsg.type === "success" ? "#2e7d32" : "#991b1b",
            border:     `1px solid ${saveMsg.type === "success" ? "#a5d6a7" : "#fca5a5"}`,
          }}>
            {saveMsg.text}
          </div>
        )}

        {/* asst_hod warning */}
        {isAsstHOD && (
          <div style={s.warnBanner}>
            ⚠️ Note: Notification sending requires HOD or Principal access. Contact your HOD to send notifications.
          </div>
        )}

        {/* Send Form — only HOD and Principal */}
        {(isPrincipal || isHOD) && (
          <div style={s.card}>
            <p style={s.cardTitle}>Compose Notification</p>

            {/* Target type */}
            <div style={s.formGroup}>
              <label style={s.label}>Send To</label>
              <div style={s.targetBtns}>
                {[
                  { value: "all",        label: "🏫 Entire College", show: isPrincipal },
                  { value: "department", label: "🏢 Department",     show: true },
                  { value: "class",      label: "📋 Single Class",   show: true },
                ]
                  .filter((opt) => opt.show)
                  .map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => { setTargetType(opt.value); setTargetId(""); }}
                      style={{
                        ...s.targetBtn,
                        background: targetType === opt.value ? "#1a237e" : "#f0f4f8",
                        color:      targetType === opt.value ? "#fff"    : "#444",
                      }}
                    >
                      {opt.label}
                    </button>
                  ))}
              </div>
            </div>

            {/* Department selector */}
            {targetType === "department" && (
              <div style={s.formGroup}>
                <label style={s.label}>Select Department</label>
                <select
                  style={s.input}
                  value={targetId}
                  onChange={(e) => setTargetId(e.target.value)}
                >
                  <option value="">— Select Department —</option>
                  {visibleDepartments.map((d) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Class selector */}
            {targetType === "class" && (
              <div style={s.formGroup}>
                <label style={s.label}>Select Class</label>
                <select
                  style={s.input}
                  value={targetId}
                  onChange={(e) => setTargetId(e.target.value)}
                >
                  <option value="">— Select Class —</option>
                  {visibleClasses.map((cls) => (
                    <option key={cls.id} value={cls.id}>{cls.display_name}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Notification type */}
            <div style={s.formGroup}>
              <label style={s.label}>Type</label>
              <select
                style={s.input}
                value={notifType}
                onChange={(e) => setNotifType(e.target.value)}
              >
                <option value="text">📝 Text Message</option>
                <option value="event">📅 Event</option>
                <option value="urgent">🚨 Urgent</option>
              </select>
            </div>

            {/* Title */}
            <div style={s.formGroup}>
              <label style={s.label}>Title *</label>
              <input
                style={s.input}
                placeholder="e.g. Lab shifted to Room 305"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            {/* Message */}
            <div style={s.formGroup}>
              <label style={s.label}>Message *</label>
              <textarea
                style={{ ...s.input, height: 100, resize: "vertical" }}
                placeholder="Type your notification message here..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
              />
            </div>

            {/* Duration */}
            <div style={s.formGroup}>
              <label style={s.label}>Display Duration</label>
              <select
                style={s.input}
                value={expiresMinutes}
                onChange={(e) => setExpiresMinutes(e.target.value)}
              >
                <option value={5}>5 minutes</option>
                <option value={10}>10 minutes</option>
                <option value={15}>15 minutes</option>
                <option value={30}>30 minutes</option>
                <option value={60}>1 hour</option>
              </select>
            </div>

            {/* Preview */}
            <div style={s.preview}>
              <div style={s.previewLabel}>📺 Display Preview</div>
              <div style={s.previewBox}>
                <div style={s.previewNotif}>
                  <div style={s.previewHeader}>{title || "Notification Title"}</div>
                  <div style={s.previewMsg}>{message || "Your message will appear here..."}</div>
                  <div style={s.previewMeta}>
                    {notifType.toUpperCase()} · {expiresMinutes} min
                  </div>
                </div>
              </div>
            </div>

            {/* Send button */}
            <button
              onClick={handleSend}
              disabled={sending}
              style={{ ...s.sendBtn, opacity: sending ? 0.7 : 1 }}
            >
              {sending ? "Sending…" : "📡 Send Notification"}
            </button>
          </div>
        )}

        {/* Active Notifications */}
        <div style={s.card}>
          <p style={s.cardTitle}>
            Active Notifications
            <span style={s.countBadge}>{active.length}</span>
          </p>

          {active.length === 0 ? (
            <div style={s.empty}>
              <p style={{ fontSize: 36 }}>🔔</p>
              <p style={{ color: "#9ca3af" }}>No active notifications right now.</p>
            </div>
          ) : (
            <div style={s.notifList}>
              {active.map((n) => (
                <div key={n.id} style={s.notifItem}>
                  <div style={s.notifLeft}>
                    <span style={{
                      ...s.typeBadge,
                      background: n.notification_type === "urgent" ? "#fee2e2" : "#dbeafe",
                      color:      n.notification_type === "urgent" ? "#991b1b" : "#1e40af",
                    }}>
                      {n.notification_type?.toUpperCase()}
                    </span>
                    <div>
                      <p style={s.notifTitle}>{n.title}</p>
                      <p style={s.notifMsg}>{n.message}</p>
                      <p style={s.notifMeta}>
                        To: {n.target_type} {n.target_id ? `#${n.target_id}` : "(all)"} ·{" "}
                        {formatExpiry(n.expires_at)}
                      </p>
                    </div>
                  </div>
                  {(isPrincipal || isHOD) && (
                    <button
                      style={s.deleteBtn}
                      onClick={() => handleDelete(n.id)}
                      disabled={deletingId === n.id}
                    >
                      🗑
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
        </div>
  </Layout>
  );
}

const s = {
  container:   { minHeight: "100vh", background: "#f0f4f8", fontFamily: "sans-serif" },
  content:     { padding: "24px 32px", maxWidth: 760, margin: "0 auto" },
  pageTitle:   { fontSize: 20, fontWeight: 700, color: "#1a237e", marginBottom: 20 },
  msgBanner:   { borderRadius: 8, padding: "12px 16px", marginBottom: 16, fontSize: 14, fontWeight: 500 },
  warnBanner:  { background: "#fff8e1", border: "1px solid #ffe082", color: "#856404", borderRadius: 8, padding: "12px 16px", marginBottom: 16, fontSize: 14 },
  card:        { background: "#fff", borderRadius: 12, padding: 24, boxShadow: "0 2px 12px rgba(0,0,0,0.08)", marginBottom: 20 },
  cardTitle:   { fontWeight: 700, fontSize: 15, color: "#111827", margin: "0 0 20px", display: "flex", alignItems: "center", gap: 8 },
  countBadge:  { background: "#dbeafe", color: "#1e40af", fontSize: 12, fontWeight: 700, padding: "2px 8px", borderRadius: 20 },
  formGroup:   { marginBottom: 18 },
  label:       { display: "block", marginBottom: 6, fontWeight: 600, color: "#374151", fontSize: 13 },
  input:       { width: "100%", padding: "10px 14px", borderRadius: 8, border: "1.5px solid #e0e0e0", fontSize: 14, boxSizing: "border-box", outline: "none", background: "#fff" },
  targetBtns:  { display: "flex", gap: 8, flexWrap: "wrap" },
  targetBtn:   { padding: "10px 20px", borderRadius: 8, border: "none", cursor: "pointer", fontWeight: 600, fontSize: 13 },
  preview:     { background: "#1a1a2e", borderRadius: 10, padding: 16, marginBottom: 20 },
  previewLabel:{ color: "#888", fontSize: 11, marginBottom: 10, textTransform: "uppercase", letterSpacing: 1 },
  previewBox:  { display: "flex", justifyContent: "center" },
  previewNotif:{ background: "rgba(255,255,255,0.1)", border: "2px solid rgba(255,255,255,0.3)", borderRadius: 8, padding: "16px 24px", maxWidth: 400, width: "100%", textAlign: "center" },
  previewHeader:{ color: "#fff", fontWeight: 700, fontSize: 16, marginBottom: 8 },
  previewMsg:  { color: "#ccc", fontSize: 14, lineHeight: 1.5, marginBottom: 8 },
  previewMeta: { color: "#888", fontSize: 11 },
  sendBtn:     { width: "100%", padding: 14, background: "linear-gradient(135deg, #1a237e, #0d47a1)", color: "#fff", border: "none", borderRadius: 8, fontSize: 16, fontWeight: 600, cursor: "pointer" },
  empty:       { textAlign: "center", padding: "32px 0" },
  notifList:   { display: "flex", flexDirection: "column", gap: 12 },
  notifItem:   { display: "flex", justifyContent: "space-between", alignItems: "flex-start", padding: "14px 16px", background: "#f9fafb", borderRadius: 8, border: "1px solid #f3f4f6" },
  notifLeft:   { display: "flex", gap: 12, alignItems: "flex-start" },
  typeBadge:   { fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 20, whiteSpace: "nowrap", marginTop: 2 },
  notifTitle:  { fontWeight: 600, fontSize: 14, color: "#111827", margin: "0 0 4px" },
  notifMsg:    { fontSize: 13, color: "#6b7280", margin: "0 0 4px" },
  notifMeta:   { fontSize: 11, color: "#9ca3af", margin: 0 },
  deleteBtn:   { background: "#fee2e2", color: "#dc2626", border: "1px solid #fca5a5", borderRadius: 6, padding: "5px 8px", fontSize: 13, cursor: "pointer", flexShrink: 0 },
};
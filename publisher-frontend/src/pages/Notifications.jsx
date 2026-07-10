import { useEffect, useState } from "react";
import { classesAPI, notificationsAPI, departmentsAPI } from "../utils/api";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Layout from "../components/Layout";

const TITLE_MAX   = 60;
const MESSAGE_MAX = 280;

export default function Notifications() {
  const nav = useNavigate();
  const { currentUser, logout, hasPermission } = useAuth();

  const [classes, setClasses]             = useState([]);
  const [departments, setDepartments]     = useState([]);
  const [active, setActive]               = useState([]);
  const [loadingActive, setLoadingActive] = useState(true);
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [targetType, setTargetType]       = useState("all");
  const [targetId, setTargetId]           = useState("");
  const [classDept, setClassDept]         = useState(""); // department filter, class-target flow only
  const [classYear, setClassYear]         = useState(""); // year filter, class-target flow only
  const [notifType, setNotifType]         = useState("text");
  const [title, setTitle]                 = useState("");
  const [message, setMessage]             = useState("");
  const [expiresMinutes, setExpiresMinutes] = useState(10);
  const [sending, setSending]             = useState(false);
  const [saveMsg, setSaveMsg]             = useState(null);
  const [deletingId, setDeletingId]       = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [confirmSend, setConfirmSend]     = useState(false);

  const canCompose = hasPermission("send_notification");
  const isDeptScoped = !!currentUser?.department_id;

  // Roles are dynamic/custom (see ManageRoles), so we can't check fixed
  // role-name strings like "HOD" or "Principal". Instead we derive scope
  // from department_id: department-scoped users are locked to their dept
  // (isHOD-equivalent), college-wide users are not (isPrincipal-equivalent).
  // Delete access mirrors the backend, which gates delete under the same
  // "send_notification" permission as sending — so we reuse canCompose
  // instead of inventing a separate role check.
  const isHOD = isDeptScoped;
  const isAsstHOD = false; // no separate read-only-department role exists yet
  const isPrincipal = !isDeptScoped && canCompose;

  // Department-scoped roles (HOD, Asst HOD, etc.) are locked to their own
  // department's classes; college-wide roles (Admin, TPO, ...) see everything.
  const visibleClasses = isDeptScoped
    ? classes.filter((c) => c.department_id === currentUser?.department_id)
    : classes;

  const visibleDepartments = isDeptScoped
    ? departments.filter((d) => d.id === currentUser?.department_id)
    : departments;

  // Cascading class picker: Department -> Year -> Class (section).
  // Dept-scoped users skip the department step (it's fixed to their own).
  const classFilterDeptId = isDeptScoped ? currentUser?.department_id : (classDept ? parseInt(classDept) : null);

  const classesInDept = classFilterDeptId
    ? visibleClasses.filter((c) => c.department_id === classFilterDeptId)
    : visibleClasses;

  // Only years that actually have classes in the chosen department, sorted ascending.
  const availableYears = Array.from(new Set(classesInDept.map((c) => c.year))).sort((a, b) => a - b);

  const classesForYear = classYear
    ? classesInDept.filter((c) => c.year === parseInt(classYear))
    : classesInDept;

  // If a department/year is picked and it only leaves one class, auto-select it —
  // same convenience pattern already used for the single-department HOD case below.
  useEffect(() => {
    if (targetType === "class" && classYear && classesForYear.length === 1) {
      setTargetId(String(classesForYear[0].id));
    }
  }, [targetType, classYear, classesForYear]);

  // HOD/AsstHOD only ever have one department to pick from — auto-select it
  // instead of making them choose from a dropdown with a single option.
  useEffect(() => {
    if ((isHOD || isAsstHOD) && targetType === "department" && visibleDepartments.length === 1) {
      setTargetId(String(visibleDepartments[0].id));
    }
  }, [targetType, visibleDepartments, isHOD, isAsstHOD]);

  // Auto-dismiss the save banner after a few seconds instead of leaving it
  // on screen until the next send/error.
  useEffect(() => {
    if (!saveMsg) return;
    const t = setTimeout(() => setSaveMsg(null), 4000);
    return () => clearTimeout(t);
  }, [saveMsg]);

  useEffect(() => {
    const fetchAll = async () => {
      setLoadingInitial(true);
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

        // Load every active notification relevant to this user, not just one class
        fetchActiveNotifications(flat, deptsRes.data || []);
      } catch (e) {
        console.error(e);
        setLoadingActive(false);
      } finally {
        setLoadingInitial(false);
      }
    };
    fetchAll();
  }, []);

  // Pulls active notifications across every visible class and dedupes by id.
  // (Previously this only checked classList[0], so "all" / department-wide
  // notifications could be missed depending on which class happened to be first.)
  const fetchActiveNotifications = async (classList, deptList) => {
    setLoadingActive(true);
    try {
      const relevantClasses = (isHOD || isAsstHOD)
        ? classList.filter((c) => c.department_id === currentUser?.department_id)
        : classList;

      if (!relevantClasses.length) {
        setActive([]);
        return;
      }

      const results = await Promise.all(
        relevantClasses.map((cls) =>
          notificationsAPI.getActive(cls.id).catch((e) => {
            console.error(`Failed to fetch notifications for class ${cls.id}`, e);
            return { data: [] };
          })
        )
      );

      const merged = new Map();
      results.forEach((res) => {
        (res.data || []).forEach((n) => merged.set(n.id, n));
      });

      const list = Array.from(merged.values()).sort((a, b) => {
        // Most recently created/sent first, if a timestamp is available
        const aTime = new Date(a.created_at || a.expires_at).getTime();
        const bTime = new Date(b.created_at || b.expires_at).getTime();
        return bTime - aTime;
      });

      setActive(list);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingActive(false);
    }
  };

  const validate = () => {
    if (!title.trim())   { setSaveMsg({ type: "error", text: "Title is required." }); return false; }
    if (!message.trim()) { setSaveMsg({ type: "error", text: "Message is required." }); return false; }
    if (title.length > TITLE_MAX) {
      setSaveMsg({ type: "error", text: `Title must be ${TITLE_MAX} characters or fewer.` }); return false;
    }
    if (message.length > MESSAGE_MAX) {
      setSaveMsg({ type: "error", text: `Message must be ${MESSAGE_MAX} characters or fewer.` }); return false;
    }
    if (targetType === "class" && !targetId) {
      setSaveMsg({ type: "error", text: "Please select a class." }); return false;
    }
    if (targetType === "department" && !targetId) {
      setSaveMsg({ type: "error", text: "Please select a department." }); return false;
    }
    return true;
  };

  // Entry point for the Send button. Urgent notices and college-wide blasts
  // get a confirm step first since they're the hardest to "undo" in practice
  // (everyone sees them immediately).
  const handleSendClick = () => {
    if (!validate()) return;
    if (notifType === "urgent" || targetType === "all") {
      setConfirmSend(true);
      return;
    }
    doSend();
  };

  const doSend = async () => {
    setConfirmSend(false);
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
      // Refresh active list across all classes
      fetchActiveNotifications(classes, departments);
    } catch (e) {
      setSaveMsg({
        type: "error",
        text: "❌ " + (e?.response?.data?.message || e.message),
      });
    } finally {
      setSending(false);
    }
  };

  const handleDeleteClick = (id) => setConfirmDeleteId(id);

  const handleDeleteConfirmed = async (id) => {
    setConfirmDeleteId(null);
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

  // Builds a human-readable "Sent to" label for a notification, e.g.
  // "Entire College", "CSE Department", "CSE-A (2nd Year)"
  const getTargetLabel = (n) => {
    if (n.target_type === "all") {
      return "🏫 Entire College";
    }
    if (n.target_type === "department") {
      const dept = departments.find((d) => d.id === n.target_id);
      return dept ? `🏢 ${dept.name} Department` : "🏢 Department (unknown)";
    }
    if (n.target_type === "class") {
      const cls = classes.find((c) => c.id === n.target_id);
      return cls ? `📋 ${cls.display_name}` : "📋 Class (unknown)";
    }
    return n.target_type;
  };

  // Urgent notices float to the top of the list so they're never missed
  // among routine text/event notices.
  const urgentActive = active.filter((n) => n.notification_type === "urgent");
  const otherActive  = active.filter((n) => n.notification_type !== "urgent");

  const renderNotifItem = (n) => (
    <div
      key={n.id}
      style={{
        ...s.notifItem,
        ...(n.notification_type === "urgent" ? s.notifItemUrgent : {}),
      }}
    >
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
          <p style={s.notifTarget}>Sent to: {getTargetLabel(n)}</p>
          <p style={s.notifMeta}>{formatExpiry(n.expires_at)}</p>
        </div>
      </div>
      {(isPrincipal || isHOD) && (
        confirmDeleteId === n.id ? (
          <div style={s.confirmRow}>
            <button
              style={s.confirmYesBtn}
              onClick={() => handleDeleteConfirmed(n.id)}
              disabled={deletingId === n.id}
            >
              {deletingId === n.id ? "…" : "Confirm"}
            </button>
            <button style={s.confirmNoBtn} onClick={() => setConfirmDeleteId(null)}>
              Cancel
            </button>
          </div>
        ) : (
          <button
            style={s.deleteBtn}
            onClick={() => handleDeleteClick(n.id)}
            disabled={deletingId === n.id}
          >
            🗑
          </button>
        )
      )}
    </div>
  );

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

        {/* Save message — full width, above both columns so it's never missed */}
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

        {/* ── Two-column layout ──
            Left: compose form (only place that scrolls long).
            Right: live preview (sticky) + active notifications list,
            so you can always see what's live while composing something new. */}
        <div style={canCompose ? s.layoutTwoCol : s.layoutOneCol}>

          {/* LEFT COLUMN — Compose form */}
          {canCompose && (
            <div style={s.colLeft}>
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
                          onClick={() => { setTargetType(opt.value); setTargetId(""); setClassDept(""); setClassYear(""); }}
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

                {/* Department selector — skipped entirely for HOD/AsstHOD since
                    they only ever have one department (auto-selected above) */}
                {targetType === "department" && !(isHOD || isAsstHOD) && (
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
                {targetType === "department" && (isHOD || isAsstHOD) && (
                  <div style={s.formGroup}>
                    <label style={s.label}>Department</label>
                    <div style={s.lockedField}>
                      🏢 {visibleDepartments[0]?.name || "Your department"}
                    </div>
                  </div>
                )}

                {/* Class selector — cascades Department -> Year -> Class so you're
                    never scrolling through every section in the college at once */}
                {targetType === "class" && (
                  <>
                    {visibleClasses.length === 0 ? (
                      <div style={s.formGroup}>
                        <label style={s.label}>Select Class</label>
                        <div style={s.emptyInline}>No classes found for your department.</div>
                      </div>
                    ) : (
                      <>
                        {/* Department step — skipped for dept-scoped users, they only have one */}
                        {!isDeptScoped && (
                          <div style={s.formGroup}>
                            <label style={s.label}>Department</label>
                            <select
                              style={s.input}
                              value={classDept}
                              onChange={(e) => { setClassDept(e.target.value); setClassYear(""); setTargetId(""); }}
                            >
                              <option value="">— Select Department —</option>
                              {visibleDepartments.map((d) => (
                                <option key={d.id} value={d.id}>{d.name}</option>
                              ))}
                            </select>
                          </div>
                        )}

                        {/* Year step — only shows once a department is chosen (or is implicit) */}
                        {(isDeptScoped || classDept) && (
                          <div style={s.formGroup}>
                            <label style={s.label}>Year</label>
                            {availableYears.length === 0 ? (
                              <div style={s.emptyInline}>No classes found for this department.</div>
                            ) : (
                              <select
                                style={s.input}
                                value={classYear}
                                onChange={(e) => { setClassYear(e.target.value); setTargetId(""); }}
                              >
                                <option value="">— Select Year —</option>
                                {availableYears.map((y) => (
                                  <option key={y} value={y}>{y === 1 ? "1st" : y === 2 ? "2nd" : y === 3 ? "3rd" : `${y}th`} Year</option>
                                ))}
                              </select>
                            )}
                          </div>
                        )}

                        {/* Class/section step — only shows once a year is chosen */}
                        {(isDeptScoped || classDept) && classYear && (
                          <div style={s.formGroup}>
                            <label style={s.label}>Section</label>
                            {classesForYear.length === 0 ? (
                              <div style={s.emptyInline}>No sections found for this year.</div>
                            ) : (
                              <select
                                style={s.input}
                                value={targetId}
                                onChange={(e) => setTargetId(e.target.value)}
                              >
                                <option value="">— Select Section —</option>
                                {classesForYear.map((cls) => (
                                  <option key={cls.id} value={cls.id}>{cls.display_name}</option>
                                ))}
                              </select>
                            )}
                          </div>
                        )}
                      </>
                    )}
                  </>
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
                    maxLength={TITLE_MAX}
                    onChange={(e) => setTitle(e.target.value)}
                  />
                  <div style={{
                    ...s.charCount,
                    color: title.length > TITLE_MAX - 10 ? "#dc2626" : "#9ca3af",
                  }}>
                    {title.length}/{TITLE_MAX}
                  </div>
                </div>

                {/* Message */}
                <div style={s.formGroup}>
                  <label style={s.label}>Message *</label>
                  <textarea
                    style={{ ...s.input, height: 100, resize: "vertical" }}
                    placeholder="Type your notification message here..."
                    value={message}
                    maxLength={MESSAGE_MAX}
                    onChange={(e) => setMessage(e.target.value)}
                  />
                  <div style={{
                    ...s.charCount,
                    color: message.length > MESSAGE_MAX - 30 ? "#dc2626" : "#9ca3af",
                  }}>
                    {message.length}/{MESSAGE_MAX}
                  </div>
                </div>

                {/* Duration */}
                <div style={s.formGroup}>
                  <label style={s.label}>Display Duration</label>
                  <select
                    style={s.input}
                    value={expiresMinutes}
                    onChange={(e) => setExpiresMinutes(parseInt(e.target.value, 10))}
                  >
                    <option value={5}>5 minutes</option>
                    <option value={10}>10 minutes</option>
                    <option value={15}>15 minutes</option>
                    <option value={30}>30 minutes</option>
                    <option value={60}>1 hour</option>
                    <option value={180}>3 hours</option>
                    <option value={480}>8 hours</option>
                    <option value={1440}>1 day</option>
                  </select>
                </div>

                {/* Send button — sits at the bottom of the form itself, no
                    need to scroll back up since the form column is independent
                    of the (separately scrolling) active list on the right */}
                <button
                  onClick={handleSendClick}
                  disabled={sending}
                  style={{ ...s.sendBtn, opacity: sending ? 0.7 : 1 }}
                >
                  {sending ? "Sending…" : "📡 Send Notification"}
                </button>
              </div>
            </div>
          )}

          {/* RIGHT COLUMN — Live preview (sticky) + Active notifications */}
          <div style={canCompose ? s.colRight : s.colFull}>

            {canCompose && (
              <div style={s.stickyPreviewWrap}>
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
              </div>
            )}

            <div style={s.card}>
              <p style={s.cardTitle}>
                Active Notifications
                <span style={s.countBadge}>{active.length}</span>
              </p>

              {loadingInitial || loadingActive ? (
                <div style={s.empty}>
                  <p style={{ fontSize: 36 }}>⏳</p>
                  <p style={{ color: "#9ca3af" }}>Loading active notifications…</p>
                </div>
              ) : active.length === 0 ? (
                <div style={s.empty}>
                  <p style={{ fontSize: 36 }}>🔔</p>
                  <p style={{ color: "#9ca3af" }}>No active notifications right now.</p>
                </div>
              ) : (
                <div style={s.notifList}>
                  {urgentActive.length > 0 && (
                    <>
                      <div style={s.groupLabel}>🚨 Urgent</div>
                      {urgentActive.map(renderNotifItem)}
                      {otherActive.length > 0 && <div style={s.groupLabel}>Other</div>}
                    </>
                  )}
                  {otherActive.map(renderNotifItem)}
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>

    {/* Confirm-send modal — only triggered for urgent / college-wide sends */}
    {confirmSend && (
      <div style={s.modalOverlay} onClick={() => setConfirmSend(false)}>
        <div style={s.modalBox} onClick={(e) => e.stopPropagation()}>
          <p style={s.modalTitle}>
            {notifType === "urgent" ? "🚨 Send urgent notification?" : "🏫 Send to entire college?"}
          </p>
          <p style={s.modalBody}>
            This will immediately appear on {targetType === "all" ? "every display in the college" : "all targeted displays"}.
            Double-check the title and message before sending.
          </p>
          <div style={s.modalActions}>
            <button style={s.modalCancelBtn} onClick={() => setConfirmSend(false)}>Cancel</button>
            <button style={s.modalSendBtn} onClick={doSend} disabled={sending}>
              {sending ? "Sending…" : "Yes, Send Now"}
            </button>
          </div>
        </div>
      </div>
    )}
  </Layout>
  );
}

const s = {
  container:   { minHeight: "100vh", background: "#f0f4f8", fontFamily: "sans-serif" },
  content:     { padding: "24px 32px", maxWidth: 1180, margin: "0 auto" },
  topBar:      { marginBottom: 4 },
  pageTitle:   { fontSize: 20, fontWeight: 700, color: "#1a237e", marginBottom: 4 },
  pageSub:     { fontSize: 13, color: "#6b7280", margin: "0 0 16px" },
  msgBanner:   { borderRadius: 8, padding: "12px 16px", marginBottom: 16, fontSize: 14, fontWeight: 500 },
  warnBanner:  { background: "#fff8e1", border: "1px solid #ffe082", color: "#856404", borderRadius: 8, padding: "12px 16px", marginBottom: 16, fontSize: 14 },

  // Layout: two independent columns on desktop, single stacked column on
  // narrow screens / for roles that can't compose (so they just see the list).
  layoutTwoCol: { display: "flex", gap: 24, alignItems: "flex-start", flexWrap: "wrap" },
  layoutOneCol: { display: "flex", flexDirection: "column", gap: 0 },
  colLeft:      { flex: "1 1 420px", minWidth: 340 },
  colRight:     { flex: "1 1 380px", minWidth: 320, display: "flex", flexDirection: "column", gap: 20 },
  colFull:      { flex: "1 1 auto", display: "flex", flexDirection: "column", gap: 20 },
  stickyPreviewWrap: { position: "sticky", top: 16, zIndex: 1 },

  card:        { background: "#fff", borderRadius: 12, padding: 24, boxShadow: "0 2px 12px rgba(0,0,0,0.08)" },
  cardTitle:   { fontWeight: 700, fontSize: 15, color: "#111827", margin: "0 0 20px", display: "flex", alignItems: "center", gap: 8 },
  countBadge:  { background: "#dbeafe", color: "#1e40af", fontSize: 12, fontWeight: 700, padding: "2px 8px", borderRadius: 20 },
  groupLabel:  { fontSize: 11, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: 0.5, margin: "4px 0 -2px" },
  formGroup:   { marginBottom: 18 },
  label:       { display: "block", marginBottom: 6, fontWeight: 600, color: "#374151", fontSize: 13 },
  input:       { width: "100%", padding: "10px 14px", borderRadius: 8, border: "1.5px solid #e0e0e0", fontSize: 14, boxSizing: "border-box", outline: "none", background: "#fff" },
  charCount:   { textAlign: "right", fontSize: 11, marginTop: 4 },
  lockedField: { padding: "10px 14px", borderRadius: 8, border: "1.5px solid #e0e0e0", fontSize: 14, background: "#f9fafb", color: "#374151", fontWeight: 600 },
  emptyInline: { padding: "10px 14px", borderRadius: 8, border: "1.5px dashed #e0e0e0", fontSize: 13, color: "#9ca3af", textAlign: "center" },
  targetBtns:  { display: "flex", gap: 8, flexWrap: "wrap" },
  targetBtn:   { padding: "10px 20px", borderRadius: 8, border: "none", cursor: "pointer", fontWeight: 600, fontSize: 13 },
  preview:     { background: "#1a1a2e", borderRadius: 10, padding: 16, boxShadow: "0 2px 12px rgba(0,0,0,0.08)" },
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
  notifItemUrgent: { background: "#fff5f5", border: "1px solid #fecaca", borderLeft: "4px solid #dc2626" },
  notifLeft:   { display: "flex", gap: 12, alignItems: "flex-start" },
  typeBadge:   { fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 20, whiteSpace: "nowrap", marginTop: 2 },
  notifTitle:  { fontWeight: 600, fontSize: 14, color: "#111827", margin: "0 0 4px" },
  notifMsg:    { fontSize: 13, color: "#6b7280", margin: "0 0 4px" },
  notifTarget: { fontSize: 12, color: "#1e40af", fontWeight: 600, margin: "0 0 4px" },
  notifMeta:   { fontSize: 11, color: "#9ca3af", margin: 0 },
  deleteBtn:   { background: "#fee2e2", color: "#dc2626", border: "1px solid #fca5a5", borderRadius: 6, padding: "5px 8px", fontSize: 13, cursor: "pointer", flexShrink: 0 },
  confirmRow:  { display: "flex", gap: 6, flexShrink: 0 },
  confirmYesBtn: { background: "#dc2626", color: "#fff", border: "none", borderRadius: 6, padding: "5px 10px", fontSize: 12, fontWeight: 600, cursor: "pointer" },
  confirmNoBtn:  { background: "#f3f4f6", color: "#374151", border: "1px solid #e5e7eb", borderRadius: 6, padding: "5px 10px", fontSize: 12, fontWeight: 600, cursor: "pointer" },
  modalOverlay: { position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 },
  modalBox:     { background: "#fff", borderRadius: 12, padding: 24, maxWidth: 380, width: "90%", boxShadow: "0 10px 40px rgba(0,0,0,0.2)" },
  modalTitle:   { fontWeight: 700, fontSize: 16, color: "#111827", margin: "0 0 10px" },
  modalBody:    { fontSize: 13, color: "#6b7280", margin: "0 0 20px", lineHeight: 1.5 },
  modalActions: { display: "flex", gap: 10, justifyContent: "flex-end" },
  modalCancelBtn: { background: "#f3f4f6", color: "#374151", border: "1px solid #e5e7eb", borderRadius: 8, padding: "9px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer" },
  modalSendBtn:   { background: "#dc2626", color: "#fff", border: "none", borderRadius: 8, padding: "9px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer" },
};
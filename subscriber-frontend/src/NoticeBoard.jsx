import { useEffect, useState, useRef } from "react";
import mqtt from "mqtt";
import LockControl from "./components/LockControl";

const API_BASE = import.meta.env.VITE_API_URL || "https://e-dispy.onrender.com";

const MQTT_CONFIG = {
  brokerUrl: import.meta.env.VITE_MQTT_BROKER_URL,
  username: import.meta.env.VITE_MQTT_USERNAME,
  password: import.meta.env.VITE_MQTT_PASSWORD,
};

const CATEGORY_STYLE = {
  exam:      { bg: "#f0d84a", text: "#3a3200" },
  event:     { bg: "#7fe0e8", text: "#04474d" },
  holiday:   { bg: "#f4b7c2", text: "#6b1425" },
  workshop:  { bg: "#6ee6c8", text: "#04503c" },
  meeting:   { bg: "#e0e0e0", text: "#555555" },
  general:   { bg: "#dfe9f5", text: "#14507a" },
};

function categoryStyle(type) {
  return CATEGORY_STYLE[(type || "general").toLowerCase()] || CATEGORY_STYLE.general;
}

function formatPostedAt(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d)) return "";
  const datePart = d.toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
  const timePart = d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
  return `${datePart} · ${timePart}`;
}

function isRecent(dateStr, hours = 24) {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  if (isNaN(d)) return false;
  return (Date.now() - d.getTime()) < hours * 60 * 60 * 1000;
}

export default function NoticeBoard({ board, notices: initialNotices, token, onBack }) {
  const [notices, setNotices] = useState(initialNotices || []);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [fullScreen, setFullScreen] = useState(null);
  const [now, setNow] = useState(new Date());
  const [locked, setLocked] = useState(false);
  const timerRef = useRef(null);
  const lastNoticesJSON = useRef(JSON.stringify(initialNotices || []));

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // F9 exit — disabled while locked
  useEffect(() => {
    const handler = (e) => { if (e.key === "F9" && !locked && onBack) onBack(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onBack, locked]);

  useEffect(() => {
    if (board?.display_mode !== "carousel" || notices.length <= 1) return;
    const ms = (board.carousel_time || 10) * 60 * 1000;
    timerRef.current = setInterval(() => {
      setCurrentIdx((prev) => (prev + 1) % notices.length);
    }, ms);
    return () => clearInterval(timerRef.current);
  }, [board, notices.length]);

  useEffect(() => {
    if (!board?.id) return;
    if (!MQTT_CONFIG.brokerUrl) {
      console.warn("MQTT: no broker URL configured (check .env)");
      return;
    }

    const client = mqtt.connect(MQTT_CONFIG.brokerUrl, {
      username: MQTT_CONFIG.username,
      password: MQTT_CONFIG.password,
      reconnectPeriod: 3000,
    });

    client.on("connect", () => {
      client.subscribe(`edisplay/noticeboard/${board.id}`);
    });

    client.on("message", (topic, message) => {
      try {
        const payload = JSON.parse(message.toString());
        if (payload.notices) {
          lastNoticesJSON.current = JSON.stringify(payload.notices);
          setNotices(payload.notices);
          setCurrentIdx(0);
        }
      } catch (e) {
        console.error("MQTT parse error", e);
      }
    });

    return () => client.end();
  }, [board?.id]);

  useEffect(() => {
    if (!board?.id) return;

    const pollBoard = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/notice-boards/public/${board.id}`);
        const data = await res.json();
        const fresh = Array.isArray(data.notices) ? data.notices : [];
        const freshJSON = JSON.stringify(fresh);
        if (freshJSON !== lastNoticesJSON.current) {
          lastNoticesJSON.current = freshJSON;
          setNotices(fresh);
          setCurrentIdx(0);
        }
      } catch (e) {
        console.warn("Notice board poll failed", e);
      }
    };

    const interval = setInterval(pollBoard, 20000);
    return () => clearInterval(interval);
  }, [board?.id]);

  const activeNotices = notices.filter((n) => n.is_active !== false);

  const buildImageUrl = (path) => `${API_BASE}/${(path || "").replace(/^\//, "")}`;

  const renderGrid = () => {
    const show = activeNotices;
    const count = show.length;
    const cols = count <= 1 ? 1
      : count <= 4 ? 2
      : count <= 9 ? 3
      : count <= 16 ? 4
      : 5;

    return (
      <div style={{ ...gs.gridWrap, gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
        {show.map((notice) => {
          const cat = categoryStyle(notice.category || notice.announcement_type);
          const postedAt = formatPostedAt(notice.created_at || notice.posted_at);
          return (
            <div key={notice.id} style={gs.noticeCard} onClick={() => setFullScreen(notice)}>
              {isRecent(notice.created_at || notice.posted_at) && (
                <div style={gs.newBadge}>NEW</div>
              )}
              {notice.image_url ? (
                <div style={gs.noticeImgFrame}>
                  <img src={buildImageUrl(notice.image_url)} alt={notice.title} style={gs.noticeImg} />
                </div>
              ) : (
                <div style={{ ...gs.noticeImgFrame, background: cat.bg }} />
              )}
              <div style={gs.noticeBody}>
                <div style={gs.noticeMetaRow}>
                  <span style={{ ...gs.tag, background: cat.bg, color: cat.text }}>
                    {notice.category || notice.announcement_type || "General"}
                  </span>
                  {postedAt && <span style={gs.postedAt}>{postedAt}</span>}
                </div>
                <div style={gs.noticeTitle}>{notice.title}</div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderCarousel = () => {
    if (activeNotices.length === 0) return <div style={gs.empty}>No notices available</div>;
    const notice = activeNotices[currentIdx] || activeNotices[0];
    const postedAt = formatPostedAt(notice.created_at || notice.posted_at);

    return (
      <div style={gs.carouselWrapper} onClick={() => setFullScreen(notice)}>
        {notice.image_url && (
          <img src={buildImageUrl(notice.image_url)} alt={notice.title} style={gs.carouselImg} />
        )}
        <div style={gs.carouselText}>
          <div style={gs.carouselTitle}>{notice.title}</div>
          {postedAt && <div style={gs.carouselPostedAt}>Posted {postedAt}</div>}
        </div>
        {activeNotices.length > 1 && (
          <div style={gs.dots}>
            {activeNotices.map((_, i) => (
              <div
                key={i}
                onClick={(e) => { e.stopPropagation(); setCurrentIdx(i); }}
                style={{
                  ...gs.dot,
                  background: i === currentIdx ? "#e8791a" : "#ccc",
                  transform: i === currentIdx ? "scale(1.3)" : "scale(1)",
                }}
              />
            ))}
          </div>
        )}
        <div style={gs.timerHint}>Auto advances every {board?.carousel_time || 10} min</div>
      </div>
    );
  };

  return (
    <div style={gs.screen}>
      <div style={gs.header}>
        <div style={gs.headerLeft}>
          <img
            src="/logo.jpeg"
            alt="College logo"
            style={gs.logoImg}
            onError={(e) => { e.target.style.display = "none"; e.target.nextSibling.style.display = "flex"; }}
          />
          <div style={{ ...gs.logoPlaceholder, display: "none" }}>🎓</div>
          <div>
            <div style={gs.collegeName}>Sphoorthy Engineering College</div>
            <div style={gs.boardName}>{board?.name}</div>
          </div>
        </div>
        <div style={gs.headerRight}>
          <div style={gs.clock}>{now.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}</div>
          <div style={gs.clockDate}>{now.toLocaleDateString("en-IN", { weekday: "short", day: "2-digit", month: "short" })}</div>
          <div style={{ marginTop: 4 }}>
            <LockControl locked={locked} onLockedChange={setLocked} />
          </div>
        </div>
      </div>

      <div style={gs.statusBar}>
        <span>{activeNotices.length} active notices</span>
        <span>{board?.display_mode === "carousel" ? "Carousel view" : "Grid view"}</span>
      </div>

      {activeNotices.length === 0 ? (
        <div style={gs.empty}>No notices on this board yet.</div>
      ) : board?.display_mode === "grid" ? renderGrid() : renderCarousel()}

      {fullScreen && (
        <div style={gs.overlay} onClick={() => setFullScreen(null)}>
          <button onClick={() => setFullScreen(null)} style={gs.closeBtn}>✕ Close</button>
          <div style={gs.overlayContentWrap} onClick={(e) => e.stopPropagation()}>
            {fullScreen.image_url && (
              <img src={buildImageUrl(fullScreen.image_url)} alt={fullScreen.title} style={gs.overlayImg} />
            )}
            <div style={gs.overlayTextBlock}>
              <div style={gs.overlayTitle}>{fullScreen.title}</div>
              {formatPostedAt(fullScreen.created_at || fullScreen.posted_at) && (
                <div style={gs.overlayPostedAt}>
                  Posted {formatPostedAt(fullScreen.created_at || fullScreen.posted_at)}
                </div>
              )}
              {fullScreen.content && <p style={gs.overlayContent}>{fullScreen.content}</p>}
            </div>
          </div>
        </div>
      )}

      <div style={gs.footer}>
        <span>Notice board</span>
        <span>Academic year 2026–2027</span>
        <span style={{ color: "#e8791a" }}>{locked ? "🔒 Display locked" : "Press F9 to exit"}</span>
      </div>
    </div>
  );
}

const gs = {
  screen: { width: "100vw", height: "100vh", background: "#f4f5f7", display: "flex", flexDirection: "column", fontFamily: "Segoe UI, sans-serif" },

  header: { display: "flex", alignItems: "center", gap: 12, background: "#0d0d0d", color: "#fff", padding: "10px 20px" },
  headerLeft: { display: "flex", alignItems: "center", gap: 12 },
  logoImg: { width: 38, height: 38, borderRadius: "50%", objectFit: "cover", flexShrink: 0 },
  logoPlaceholder: { width: 38, height: 38, borderRadius: "50%", background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.25)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 },
  collegeName: { fontSize: 16, fontWeight: 500 },
  boardName: { fontSize: 11, opacity: 0.7, marginTop: 1 },
  headerRight: { marginLeft: "auto", textAlign: "right" },
  clock: { fontSize: 22, fontWeight: 600 },
  clockDate: { fontSize: 15, opacity: 0.8 },

  statusBar: { background: "#e8791a", color: "#fff", padding: "5px 20px", fontSize: 11, fontWeight: 500, display: "flex", justifyContent: "space-between" },

  gridWrap: { display: "grid", gap: 12, padding: "14px 16px", flex: 1, overflow: "auto" },
  noticeCard: { background: "#fff", border: "1px solid #e0e0e0", borderRadius: 8, overflow: "hidden", cursor: "pointer", display: "flex", flexDirection: "column", position: "relative" },
  newBadge: { position: "absolute", top: 6, left: 6, background: "#e8452a", color: "#fff", fontSize: 9, fontWeight: 500, padding: "2px 6px", borderRadius: 3, zIndex: 1 },
  noticeImgFrame: { width: "100%", aspectRatio: "4 / 3", background: "#f4f5f7", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" },
  noticeImg: { width: "100%", height: "100%", objectFit: "contain" },
  noticeBody: { padding: "6px 10px 8px" },
  noticeMetaRow: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 3 },
  tag: { fontSize: 9, fontWeight: 500, padding: "1px 6px", borderRadius: 3 },
  postedAt: { fontSize: 13, color: "#888" },
  noticeTitle: { fontSize: 11, fontWeight: 500, color: "#222", lineHeight: 1.3, overflow: "hidden", textOverflow: "ellipsis", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" },

  empty: { flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "#999", fontSize: 16 },

  carouselWrapper: { flex: 1, width: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "24px 40px", cursor: "pointer", position: "relative", boxSizing: "border-box" },
  carouselImg: { width: "100%", maxWidth: "100%", flex: 1, minHeight: 0, objectFit: "contain", borderRadius: 10, marginBottom: 14 },
  carouselText: { textAlign: "center", maxWidth: "90%", flexShrink: 0 },
  carouselTitle: { fontSize: 20, fontWeight: 500, color: "#222", margin: "0 0 4px" },
  carouselPostedAt: { fontSize: 16, color: "#888" },
  dots: { display: "flex", gap: 8, marginTop: 16, justifyContent: "center" },
  dot: { width: 8, height: 8, borderRadius: "50%", cursor: "pointer", transition: "all 0.2s" },
  timerHint: { position: "absolute", bottom: 14, right: 20, fontSize: 11, color: "#aaa" },

  overlay: { position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh", background: "#fff", display: "flex", flexDirection: "column", zIndex: 9999, overflow: "auto" },
  closeBtn: { position: "fixed", top: 20, right: 24, zIndex: 10000, padding: "8px 16px", background: "#0d0d0d", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 13, fontWeight: 500 },
  overlayContentWrap: { flex: 1, width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "60px 40px" },
  overlayImg: { maxWidth: "90vw", maxHeight: "65vh", objectFit: "contain", borderRadius: 10, marginBottom: 24 },
  overlayTextBlock: { textAlign: "center", maxWidth: "80vw" },
  overlayTitle: { fontSize: 24, fontWeight: 500, color: "#222", margin: "0 0 6px" },
  overlayPostedAt: { fontSize: 17, color: "#888", marginBottom: 14 },
  overlayContent: { fontSize: 16, color: "#444", lineHeight: 1.7, margin: 0 },

  footer: { background: "#0d0d0d", color: "#fff", display: "flex", justifyContent: "space-between", padding: "8px 20px", fontSize: 11, fontWeight: 500 },
};

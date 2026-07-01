import { useEffect, useState, useRef } from "react";
import mqtt from "mqtt";

const API_BASE = import.meta.env.VITE_API_URL || "https://e-dispy.onrender.com";

const MQTT_CONFIG = {
  brokerUrl: import.meta.env.VITE_MQTT_BROKER_URL,
  username: import.meta.env.VITE_MQTT_USERNAME,
  password: import.meta.env.VITE_MQTT_PASSWORD,
};

export default function NoticeBoard({ board, notices: initialNotices, token, onBack }) {
  const [notices, setNotices] = useState(initialNotices || []);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [fullScreen, setFullScreen] = useState(null);
  const [now, setNow] = useState(new Date());
  const timerRef = useRef(null);
  const lastNoticesJSON = useRef(JSON.stringify(initialNotices || []));

  // Clock
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // Carousel auto rotation
  useEffect(() => {
    if (board?.display_mode !== 'carousel' || notices.length <= 1) return;
    const ms = (board.carousel_time || 10) * 60 * 1000;
    timerRef.current = setInterval(() => {
      setCurrentIdx(prev => (prev + 1) % notices.length);
    }, ms);
    return () => clearInterval(timerRef.current);
  }, [board, notices.length]);

  // MQTT live updates
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
          lastNoticesJSON.current = JSON.stringify(payload.notices); // keep poll fallback in sync
          setNotices(payload.notices);
          setCurrentIdx(0);
        }
      } catch (e) {
        console.error("MQTT parse error", e);
      }
    });

    return () => client.end();
  }, [board?.id]);

  // ── Notice board polling fallback (catches updates MQTT might miss) ──
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

    const interval = setInterval(pollBoard, 20000); // every 20s
    return () => clearInterval(interval);
  }, [board?.id]);

  const activeNotices = notices.filter(n => n.is_active !== false);

  // Helper — builds a clean image URL regardless of leading-slash inconsistency
  const buildImageUrl = (path) => `${API_BASE}/${(path || "").replace(/^\//, '')}`;

  // Grid layout — shows ALL active notices, columns/rows auto-adjust to count
  const renderGrid = () => {
    const show = activeNotices;
    const count = show.length;
    // Pick a column count that keeps cards roughly square-ish as count grows
    const cols = count <= 1 ? 1
      : count <= 4 ? 2
      : count <= 9 ? 3
      : count <= 16 ? 4
      : 5;
    return (
      <div style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${cols}, 1fr)`,
        gridAutoRows: '1fr',
        gap: 16,
        padding: 20,
        flex: 1,
        overflow: 'auto',
      }}>
        {show.map((notice, idx) => (
          <div
            key={notice.id}
            style={gs.noticeCard}
            onClick={() => setFullScreen(notice)}
          >
            {notice.image_url && (
              <img
                src={buildImageUrl(notice.image_url)}
                alt={notice.title}
                style={gs.noticeImg}
              />
            )}
            <h2 style={gs.noticeTitle}>{notice.title}</h2>
            {notice.content && (
              <p style={gs.noticeContent}>{notice.content}</p>
            )}
          </div>
        ))}
      </div>
    );
  };

  // Carousel layout
  const renderCarousel = () => {
    if (activeNotices.length === 0) return (
      <div style={gs.empty}>No notices available</div>
    );
    const notice = activeNotices[currentIdx] || activeNotices[0];
    return (
      <div style={gs.carouselWrapper} onClick={() => setFullScreen(notice)}>
        {notice.image_url && (
          <img
            src={buildImageUrl(notice.image_url)}
            alt={notice.title}
            style={gs.carouselImg}
          />
        )}
        <div style={gs.carouselText}>
          <h1 style={gs.carouselTitle}>{notice.title}</h1>
          {notice.content && (
            <p style={gs.carouselContent}>{notice.content}</p>
          )}
        </div>
        {/* Dots */}
        {activeNotices.length > 1 && (
          <div style={gs.dots}>
            {activeNotices.map((_, i) => (
              <div
                key={i}
                onClick={e => { e.stopPropagation(); setCurrentIdx(i); }}
                style={{
                  ...gs.dot,
                  background: i === currentIdx ? '#fff' : 'rgba(255,255,255,0.4)',
                  transform: i === currentIdx ? 'scale(1.3)' : 'scale(1)',
                }}
              />
            ))}
          </div>
        )}
        {/* Timer hint */}
        <div style={gs.timerHint}>
          Auto advances every {board?.carousel_time || 10} min
        </div>
      </div>
    );
  };

  return (
    <div style={gs.screen}>
      {/* Header */}
      <div style={gs.header}>
        <div style={gs.headerLeft}>
          
          {/* College logo — place logo.jpg in subscriber-frontend/public/ to enable */}
          <img
            src="/logo.jpeg"
            alt="College logo"
            style={gs.logoImg}
            onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
          />
          <div style={{ ...gs.logoPlaceholder, display: 'none' }}>🎓</div>
          <div>
            <div style={gs.collegeName}>SPHOORTHY ENGINEERING COLLEGE</div>
            <div style={gs.boardName}>📋 {board?.name}</div>
          </div>
        </div>
        <div style={gs.headerRight}>
          <div style={gs.clock}>
            {now.toLocaleTimeString('en-IN')} | {now.toLocaleDateString('en-IN', { weekday: 'long', day: '2-digit', month: 'long' })}
          </div>
          <div style={gs.badge}>
            {board?.display_mode === 'carousel' ? '⏱ Carousel' : '⊞ Grid'} · {activeNotices.length} notices
          </div>
        </div>
      </div>

      {/* Content */}
      {activeNotices.length === 0 ? (
        <div style={gs.empty}>No notices on this board yet.</div>
      ) : board?.display_mode === 'grid' ? renderGrid() : renderCarousel()}

      {/* Fullscreen overlay — true edge-to-edge takeover, no boxed modal */}
      {fullScreen && (
        <div style={gs.overlay} onClick={() => setFullScreen(null)}>
          <button onClick={() => setFullScreen(null)} style={gs.closeBtn}>✕ Close</button>
          <div style={gs.overlayContentWrap} onClick={e => e.stopPropagation()}>
            {fullScreen.image_url && (
              <img
                src={buildImageUrl(fullScreen.image_url)}
                alt={fullScreen.title}
                style={gs.overlayImg}
              />
            )}
            <div style={gs.overlayTextBlock}>
              <h1 style={gs.overlayTitle}>{fullScreen.title}</h1>
              {fullScreen.content && (
                <p style={gs.overlayContent}>{fullScreen.content}</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <div style={gs.footer}>
        <span>NOTICE BOARD</span>
        <span>ACADEMIC YEAR 2024–2025</span>
        <span style={{ color: '#ffcc80' }}>Press F9 to exit</span>
      </div>
    </div>
  );
}

const gs = {
  screen: { width: '100vw', height: '100vh', background: '#0b1f4a', display: 'flex', flexDirection: 'column', fontFamily: 'Segoe UI, sans-serif' },
  header: { background: '#0b3d91', color: '#fff', padding: '14px 28px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  headerLeft: { display: 'flex', alignItems: 'center', gap: 16 },
  backBtn: { padding: '6px 14px', background: 'rgba(255,255,255,0.2)', color: '#fff', border: '1px solid rgba(255,255,255,0.3)', borderRadius: 6, cursor: 'pointer', fontSize: 13 },
  logoPlaceholder: {
    width: 44, height: 44, borderRadius: '50%',
    background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.25)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 22, flexShrink: 0,
  },
  logoImg: {
    width: 44, height: 44, borderRadius: '50%', objectFit: 'cover', flexShrink: 0,
  },
  collegeName: { fontSize: 18, fontWeight: 800, letterSpacing: 1 },
  boardName: { fontSize: 13, opacity: 0.8, marginTop: 2 },
  headerRight: { textAlign: 'right' },
  clock: { fontSize: 14, fontWeight: 600 },
  badge: { fontSize: 12, opacity: 0.7, marginTop: 2 },
  empty: { flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.5)', fontSize: 20 },
  // Grid
  noticeCard: { background: 'rgba(255,255,255,0.08)', borderRadius: 12, padding: 20, cursor: 'pointer', border: '1px solid rgba(255,255,255,0.1)', transition: 'all 0.2s', overflow: 'hidden', display: 'flex', flexDirection: 'column', minHeight: 0 },
  noticeImg: { width: '100%', flex: 1, minHeight: 0, objectFit: 'cover', borderRadius: 8, marginBottom: 12 },
  noticeTitle: { fontSize: 20, fontWeight: 700, color: '#fff', margin: '0 0 8px', flexShrink: 0 },
  noticeContent: { fontSize: 14, color: 'rgba(255,255,255,0.7)', lineHeight: 1.6, margin: 0, flexShrink: 0, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical' },
  // Carousel
  carouselWrapper: { flex: 1, width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px 40px', cursor: 'pointer', position: 'relative', boxSizing: 'border-box' },
  carouselImg: { width: '100%', maxWidth: '100%', flex: 1, minHeight: 0, objectFit: 'contain', borderRadius: 12, marginBottom: 24 },
  carouselText: { textAlign: 'center', maxWidth: '90%', flexShrink: 0 },
  carouselTitle: { fontSize: 36, fontWeight: 800, color: '#fff', margin: '0 0 16px' },
  carouselContent: { fontSize: 20, color: 'rgba(255,255,255,0.8)', lineHeight: 1.6, margin: 0 },
  dots: { display: 'flex', gap: 8, marginTop: 32, justifyContent: 'center' },
  dot: { width: 10, height: 10, borderRadius: '50%', cursor: 'pointer', transition: 'all 0.3s' },
  timerHint: { position: 'absolute', bottom: 20, right: 24, fontSize: 12, color: 'rgba(255,255,255,0.4)' },
  // Fullscreen — true edge-to-edge takeover, not a boxed modal
  overlay: {
    position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
    background: '#0b1f4a', display: 'flex', flexDirection: 'column',
    zIndex: 9999, overflow: 'auto',
  },
  closeBtn: {
    position: 'fixed', top: 20, right: 24, zIndex: 10000,
    padding: '10px 20px', background: 'rgba(255,255,255,0.15)', color: '#fff',
    border: '1px solid rgba(255,255,255,0.3)', borderRadius: 8, cursor: 'pointer',
    fontSize: 14, fontWeight: 600,
  },
  overlayContentWrap: {
    flex: 1, width: '100%', height: '100%',
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    padding: '60px 40px',
  },
  overlayImg: {
    maxWidth: '90vw', maxHeight: '65vh', objectFit: 'contain', borderRadius: 12, marginBottom: 32,
  },
  overlayTextBlock: { textAlign: 'center', maxWidth: '80vw' },
  overlayTitle: { fontSize: 42, fontWeight: 800, color: '#fff', margin: '0 0 16px' },
  overlayContent: { fontSize: 22, color: 'rgba(255,255,255,0.85)', lineHeight: 1.7, margin: 0 },
  // Footer
  footer: { background: '#0b3d91', color: '#fff', display: 'flex', justifyContent: 'space-between', padding: '10px 28px', fontSize: 14, fontWeight: 600 },
};
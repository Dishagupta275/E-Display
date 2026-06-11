import { useEffect, useState, useRef } from "react";
import mqtt from "mqtt";
import TimetableView from "./TimetableView";
import "./Display.css";

const API = "http://localhost:5000/api";

const MQTT_CONFIG = {
  brokerUrl: "wss://db89b31f17b343648adedb9f54f0aa40.s1.eu.hivemq.cloud:8884/mqtt",
  username:  "E-display",
  password:  "Sphoorthy1",
};

function timeToMinutes(hhmm) {
  if (!hhmm) return 0;
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

function getCurrentPeriodIdx(now, timings) {
  if (!timings || timings.length === 0) return null;
  const cur = now.getHours() * 60 + now.getMinutes();
  for (let i = 0; i < timings.length; i++) {
    const s = timeToMinutes(timings[i].start_time);
    const e = timeToMinutes(timings[i].end_time);
    if (cur >= s && cur < e) return i;
  }
  return null;
}

function sendHeartbeat(classId) {
  fetch(`${API}/device/heartbeat`, {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify({ class_id: classId }),
  }).catch(() => {});
}

export default function Display({ classObj, token, onExitKiosk }) {
  const [now, setNow]                     = useState(new Date());
  const [timetable, setTimetable]         = useState({});
  const [timings, setTimings]             = useState([]);
  const [connected, setConnected]         = useState(false);
  const [notification, setNotification]   = useState(null);
  const [inchargeName, setInchargeName]   = useState("Not Assigned");
  const [notifTimeLeft, setNotifTimeLeft] = useState(null);

  // ── NEW: Ticker + Events ─────────────────────────────
  const [ticker, setTicker]   = useState(null);   // { message, duration_minutes }
  const [events, setEvents]   = useState([]);      // [{ title, date, description, event_type }]

  const notifTimerRef   = useRef(null);
  const notifCounterRef = useRef(null);
  const tickerTimerRef  = useRef(null);
  const mqttClientRef   = useRef(null);

  // ── Clock ────────────────────────────────────────────
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // ── F9 exit kiosk ────────────────────────────────────
  useEffect(() => {
    const handler = (e) => { if (e.key === "F9") onExitKiosk(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onExitKiosk]);

  // ── Heartbeat every 60s ──────────────────────────────
  useEffect(() => {
    if (!classObj?.id) return;
    sendHeartbeat(classObj.id);
    const hb = setInterval(() => sendHeartbeat(classObj.id), 60_000);
    return () => clearInterval(hb);
  }, [classObj?.id]);

  // ── Load timetable + timings + incharge + events ─────
  useEffect(() => {
    if (!classObj?.id) return;
    const cacheKey = `timetable_${classObj.id}`;

    // Load timetable cache for offline support
    try {
      const cached = localStorage.getItem(cacheKey);
      if (cached) setTimetable(JSON.parse(cached));
    } catch (_) {}

    // Load cached events
    try {
      const cachedEvents = localStorage.getItem("events_cache");
      if (cachedEvents) setEvents(JSON.parse(cachedEvents));
    } catch (_) {}

    // Fetch period timings
    fetch(`${API}/period-timings`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => setTimings(Array.isArray(data) ? data : []))
      .catch(() => {});

    // Fetch timetable
    fetch(`${API}/timetable/${classObj.id}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => {
        const tt = data.timetable || data;
        if (tt && typeof tt === "object") {
          setTimetable(tt);
          localStorage.setItem(cacheKey, JSON.stringify(tt));
        }
      })
      .catch(() => console.warn("Using cached timetable"));

    // Fetch class info for incharge name
    fetch(`${API}/classes/${classObj.id}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.incharge_name) setInchargeName(data.incharge_name);
      })
      .catch(() => {});

    // Fetch upcoming events
    fetch(`${API}/events`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => {
        const evList = Array.isArray(data) ? data : [];
        setEvents(evList);
        localStorage.setItem("events_cache", JSON.stringify(evList));
      })
      .catch(() => console.warn("Using cached events"));

  }, [classObj?.id, token]);

  // ── Show popup notification with countdown ───────────
  const showNotification = (notifData) => {
    setNotification(notifData);
    const minutes = notifData.expires_minutes || 10;
    setNotifTimeLeft(minutes * 60);

    if (notifTimerRef.current)   clearTimeout(notifTimerRef.current);
    if (notifCounterRef.current) clearInterval(notifCounterRef.current);

    notifTimerRef.current = setTimeout(() => {
      setNotification(null);
      setNotifTimeLeft(null);
    }, minutes * 60 * 1000);

    notifCounterRef.current = setInterval(() => {
      setNotifTimeLeft((prev) => {
        if (prev <= 1) { clearInterval(notifCounterRef.current); return null; }
        return prev - 1;
      });
    }, 1000);
  };

  const dismissNotification = () => {
    setNotification(null);
    setNotifTimeLeft(null);
    if (notifTimerRef.current)   clearTimeout(notifTimerRef.current);
    if (notifCounterRef.current) clearInterval(notifCounterRef.current);
  };

  // ── Show ticker ───────────────────────────────────────
  const showTicker = (tickerData) => {
    setTicker(tickerData);
    if (tickerTimerRef.current) clearTimeout(tickerTimerRef.current);
    const ms = (tickerData.duration_minutes || 5) * 60 * 1000;
    tickerTimerRef.current = setTimeout(() => setTicker(null), ms);
  };

  // ── MQTT live updates ─────────────────────────────────
  useEffect(() => {
    if (!classObj?.display_name) return;

    const client = mqtt.connect(MQTT_CONFIG.brokerUrl, {
      username:        MQTT_CONFIG.username,
      password:        MQTT_CONFIG.password,
      reconnectPeriod: 5000,
      keepalive:       60,
      clean:           true,
    });

    mqttClientRef.current = client;

    const subscribe = () => {
      // Timetable
      client.subscribe(`edisplay/timetable/${classObj.display_name}`);

      // Popup notifications
      client.subscribe(`edisplay/notification/${classObj.display_name}`);
      client.subscribe(`edisplay/notification/dept_${classObj.department_id}`);
      client.subscribe(`edisplay/notification/all`);

      // Scrolling ticker
      client.subscribe(`edisplay/ticker/${classObj.display_name}`);
      client.subscribe(`edisplay/ticker/dept_${classObj.department_id}`);
      client.subscribe(`edisplay/ticker/all`);

      // Events section
      client.subscribe(`edisplay/events/${classObj.display_name}`);
      client.subscribe(`edisplay/events/dept_${classObj.department_id}`);
      client.subscribe(`edisplay/events/all`);
    };

    client.on("connect", () => {
      console.log("MQTT connected");
      setConnected(true);
      subscribe();
    });

    client.on("message", (topic, message) => {
      try {
        const payload = JSON.parse(message.toString());

        if (topic.includes("/ticker/")) {
          // Scrolling ticker bar
          const t = payload.ticker || payload;
          showTicker(t);

        } else if (topic.includes("/events/")) {
          // Events section update
          const evList = payload.events || [];
          setEvents(evList);
          localStorage.setItem("events_cache", JSON.stringify(evList));

        } else if (topic.includes("/notification/")) {
          // Popup notification
          showNotification(payload.notification || payload);

        } else if (topic.includes("/timetable/")) {
          // Timetable update
          const newTT = payload.timetable || payload;
          if (newTT && typeof newTT === "object") {
            setTimetable(newTT);
            localStorage.setItem(`timetable_${classObj.id}`, JSON.stringify(newTT));
          }
        }
      } catch (err) {
        console.error("MQTT parse error", err);
      }
    });

    client.on("disconnect", () => { console.warn("MQTT disconnected"); setConnected(false); });
    client.on("reconnect",  () => { console.log("MQTT reconnecting..."); setConnected(false); });
    client.on("error",      (e) => { console.error("MQTT error", e); setConnected(false); });
    client.on("offline",    () => { console.warn("MQTT offline"); setConnected(false); });

    return () => {
      if (notifTimerRef.current)   clearTimeout(notifTimerRef.current);
      if (notifCounterRef.current) clearInterval(notifCounterRef.current);
      if (tickerTimerRef.current)  clearTimeout(tickerTimerRef.current);
      client.end(true);
    };
  }, [classObj]);

  if (!classObj) return (
    <div style={{ color: "white", padding: "2rem", background: "#0d2b6b", height: "100vh" }}>
      Loading...
    </div>
  );

  // ── Derived values ────────────────────────────────────
  const currentDay     = now.toLocaleDateString("en-IN", { weekday: "long" });
  const currentIdx     = getCurrentPeriodIdx(now, timings);
  const todaySlots     = timetable[currentDay] || [];
  const currentSlot    = currentIdx !== null
    ? todaySlots.find((s) => s.period_number === timings[currentIdx]?.period_number)
    : null;
  const currentSubject = currentSlot?.subject_name || null;
  const currentFaculty = currentSlot?.faculty_name || null;
  const currentTiming  = currentIdx !== null ? timings[currentIdx] : null;

  const formatCountdown = (secs) => {
    if (!secs) return "";
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${String(s).padStart(2, "0")}`;
  };

  const tickerDuration = `${(ticker?.duration_minutes || 5) * 5}s`;

  const eventTypeIcon = (type) => {
    switch (type) {
      case "exam":        return "📝";
      case "competition": return "🏆";
      case "holiday":     return "🎉";
      case "meeting":     return "👥";
      default:            return "📅";
    }
  };

  return (
    <div className="kiosk-screen">

      {/* ── HEADER ──────────────────────────────────────── */}
      <div className="kiosk-header">
        <div className="kiosk-header-left">
          <span style={{ fontSize: 11, color: "#a8c4f0", fontWeight: 600, letterSpacing: 1 }}>
            DEPT. OF {classObj.department_name || "ENGINEERING"}
          </span>
        </div>

        <div className="kiosk-header-center">
          <div className="kiosk-college-name">
            SPHOORTHY ENGINEERING COLLEGE
          </div>
          <div className="kiosk-college-sub">
            Autonomous Institution &nbsp;|&nbsp; NAAC Accredited
          </div>
        </div>

        <div className="kiosk-header-right">
          <div className="kiosk-class-badge">{classObj.display_name}</div>
          <div className="kiosk-room-badge">ROOM {classObj.room_number || "N/A"}</div>
        </div>
      </div>

      {/* ── INFO BAR ────────────────────────────────────── */}
      <div className="kiosk-info-bar">
        <div className="kiosk-incharge">
          <span className="kiosk-incharge-label">CLASS INCHARGE</span>
          <span className="kiosk-incharge-name">{inchargeName}</span>
        </div>
        <div className="kiosk-clock-bar">
          <span className="kiosk-time">
            {now.toLocaleTimeString("en-IN", {
              hour:   "2-digit",
              minute: "2-digit",
              second: "2-digit",
            })}
          </span>
          <span className="kiosk-date">
            {now.toLocaleDateString("en-IN", {
              weekday: "long",
              day:     "2-digit",
              month:   "long",
              year:    "numeric",
            })}
          </span>
        </div>
        <div className={`kiosk-conn ${connected ? "online" : "offline"}`}>
          <span className="kiosk-conn-dot" />
          {connected ? "LIVE" : "OFFLINE"}
        </div>
      </div>

      {/* ── CURRENT PERIOD BAR ──────────────────────────── */}
      {currentSubject ? (
        <div className="kiosk-now-bar">
          <div className="kiosk-now-left">
            <span className="kiosk-now-label">NOW</span>
            <div className="kiosk-now-details">
              <span className="kiosk-now-subject">{currentSubject}</span>
              {currentFaculty && (
                <span className="kiosk-now-faculty">— {currentFaculty}</span>
              )}
            </div>
          </div>
          {currentTiming && (
            <div className="kiosk-now-time">
              {currentTiming.start_time} – {currentTiming.end_time}
            </div>
          )}
        </div>
      ) : (
        <div className="kiosk-no-class-bar">
          {currentIdx === null ? "No class scheduled at this time" : "Free Period"}
        </div>
      )}

      {/* ── SCROLLING TICKER ────────────────────────────── */}
      {ticker && (
        <div className="kiosk-ticker" style={{ "--ticker-duration": tickerDuration }}>
          <span className="kiosk-ticker-label">📢 NOTICE</span>
          <div className="kiosk-ticker-track">
            <span className="kiosk-ticker-text">{ticker.message}</span>
          </div>
        </div>
      )}

      {/* ── TIMETABLE ───────────────────────────────────── */}
      <div className="kiosk-timetable-area">
        <TimetableView
          timings={timings}
          timetable={timetable}
          currentDay={currentDay}
          currentIdx={currentIdx}
        />
      </div>

      {/* ── EVENTS SECTION ──────────────────────────────── */}
      <div className="kiosk-events-area">
        <div className="kiosk-events-header">
          <span className="kiosk-events-title">📅 UPCOMING EVENTS</span>
        </div>
        {events.length === 0 ? (
          <div className="kiosk-events-empty">No upcoming events scheduled</div>
        ) : (
          <div className="kiosk-events-list">
            {events.map((ev, i) => (
              <div className="kiosk-event-card" key={i}>
                <div className="kiosk-event-top">
                  <span className="kiosk-event-icon">
                    {eventTypeIcon(ev.announcement_type)}
                  </span>
                  <span className="kiosk-event-date">
                    {ev.event_date
                      ? new Date(ev.event_date).toLocaleDateString("en-IN", {
                          day: "2-digit", month: "short", year: "numeric",
                        })
                      : "TBD"}
                  </span>
                </div>
                <div className="kiosk-event-title">{ev.title}</div>
                {ev.content && (
                  <div className="kiosk-event-desc">{ev.content}</div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── FOOTER ──────────────────────────────────────── */}
      <div className="kiosk-footer">
        <span>ACADEMIC YEAR 2024–2025</span>
        <span>SPHOORTHY ENGINEERING COLLEGE</span>
        <span className="kiosk-exit-hint">Press F9 to exit kiosk</span>
      </div>

      {/* ── POPUP NOTIFICATION OVERLAY ──────────────────── */}
      {notification && (
        <div className="notif-backdrop" onClick={dismissNotification}>
          <div className="notif-box" onClick={(e) => e.stopPropagation()}>

            <div className="notif-top-bar">
              <div className="notif-badge">📢 ANNOUNCEMENT</div>
              {notifTimeLeft && (
                <div className="notif-timer">
                  Auto-closes in {formatCountdown(notifTimeLeft)}
                </div>
              )}
            </div>

            <div className="notif-title">{notification.title || "Notice"}</div>

            {notification.message && (
              <div className="notif-message">{notification.message}</div>
            )}

            {notification.image_url && (
              <img
                src={`http://localhost:5000${notification.image_url}`}
                alt="notification"
                className="notif-image"
              />
            )}

            <button className="notif-dismiss-btn" onClick={dismissNotification}>
              ✕ Dismiss
            </button>

          </div>
        </div>
      )}

    </div>
  );
}
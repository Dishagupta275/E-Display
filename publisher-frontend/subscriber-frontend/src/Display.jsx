import React, { useEffect, useState } from "react";
import mqtt from "mqtt";
import "./styles.css";
import TimetableView from "./TimetableView";

import collegeLogo from "./assets/college_logo.png";
import naacLogo from "./assets/naac_logo.png";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";

// Period time ranges — must match what publisher uses
const PERIOD_TIMES = [
  { start: "09:00", end: "10:00" },
  { start: "10:00", end: "10:50" },
  { start: "10:50", end: "11:00" }, // break
  { start: "11:00", end: "11:50" },
  { start: "11:50", end: "12:40" },
  { start: "12:40", end: "13:30" }, // lunch
  { start: "13:30", end: "14:20" },
  { start: "14:20", end: "15:10" },
  { start: "15:10", end: "16:00" },
];

const PERIOD_LABELS = [
  "9:00am-10:00am",
  "10:00am-10:50am",
  "10:50-11:00",
  "11:00am-11:50am",
  "11:50am-12:40pm",
  "12:40-1:30",
  "1:30pm-2:20pm",
  "2:20pm-3:10pm",
  "3:10pm-4:00pm",
];

// Returns index of current period (0-based), or null if outside hours
function getCurrentPeriodIdx(now) {
  const h = now.getHours();
  const m = now.getMinutes();
  const current = h * 60 + m;

  for (let i = 0; i < PERIOD_TIMES.length; i++) {
    const [sh, sm] = PERIOD_TIMES[i].start.split(":").map(Number);
    const [eh, em] = PERIOD_TIMES[i].end.split(":").map(Number);
    const start = sh * 60 + sm;
    const end = eh * 60 + em;
    if (current >= start && current < end) return i;
  }
  return null;
}

export default function Display({ classNameOverride }) {
  const [now, setNow] = useState(new Date());
  const [week, setWeek] = useState({});
  const [notices, setNotices] = useState([
    "Welcome to Sphoorthy Engineering College",
    "All students must carry their ID cards",
    "Library is open from 9am to 5pm",
  ]);

  const params = new URLSearchParams(window.location.search);
  const className = classNameOverride || params.get("class") || "CSEA";

  /* ===== LIVE CLOCK ===== */
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  /* ===== LOAD TIMETABLE FROM BACKEND (REST) ===== */
  useEffect(() => {
    fetch(`${API_BASE}/api/timetable/${className}`)
      .then((res) => res.json())
      .then((data) => {
        const rawWeek = data.week || data;
        const normalizedWeek = {};
        Object.keys(rawWeek || {}).forEach((day) => {
          normalizedWeek[day] = rawWeek[day].map((slot) =>
            typeof slot === "string" ? { subject: slot, professor: "" } : slot
          );
        });
        setWeek(normalizedWeek);
      })
      .catch((err) => console.error("❌ Failed to load timetable", err));
  }, [className]);

  /* ===== LOAD NOTICES FROM BACKEND ===== */
  useEffect(() => {
    fetch(`${API_BASE}/api/notices`)
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) setNotices(data);
      })
      .catch(() => {}); // silently fail — default notices stay
  }, []);

  /* ===== MQTT — timetable + notice live updates ===== */
  useEffect(() => {
    const client = mqtt.connect(
      "wss://db89b31f17b343648adedb9f54f0aa40.s1.eu.hivemq.cloud:8884/mqtt",
      { username: "E-display", password: "Sphoorthy1", reconnectPeriod: 2000 }
    );

    client.on("connect", () => {
      client.subscribe(`edisplay/timetable/${className}`);
      client.subscribe("edisplay/notices");           // global notices
      client.subscribe(`edisplay/notices/${className}`); // class-specific notices
      console.log("✅ MQTT connected");
    });

    client.on("message", (topic, message) => {
      try {
        const payload = JSON.parse(message.toString());

        if (topic === "edisplay/notices") {
          if (Array.isArray(payload)) setNotices(payload);
          return;
        }

        // Timetable update
        const rawWeek = payload.week;
        if (!rawWeek) return;
        const normalizedWeek = {};
        Object.keys(rawWeek).forEach((day) => {
          normalizedWeek[day] = rawWeek[day].map((slot) =>
            typeof slot === "string" ? { subject: slot, professor: "" } : slot
          );
        });
        setWeek(normalizedWeek);
        console.log("📩 Timetable updated via MQTT");
      } catch (err) {
        console.error("❌ MQTT parse error", err);
      }
    });

    return () => client.end();
  }, [className]);

  const currentDay = now.toLocaleDateString(undefined, { weekday: "long" });
  const currentIdx = getCurrentPeriodIdx(now);

  // Build scrolling notice text from array
  const noticeText = notices.join("   •   ");

  return (
    <div className="screen">
      {/* ===== HEADER ===== */}
      <div className="top-header">
        <img src={collegeLogo} className="logo" alt="college" />
        <div className="college-title">SPHOORTHY ENGINEERING COLLEGE</div>
        <img src={naacLogo} className="logo" alt="naac" />
      </div>

      {/* ===== ACADEMIC BAR ===== */}
      <div className="academic-bar">
        {className} 2ND YEAR B.TECH 1ST SEMESTER ACADEMIC YEAR: 2024–2025
      </div>

      {/* ===== INFO STRIP ===== */}
      <div className="info-strip">
        <div className="info green">
          CLASS INCHARGE : DR. KAJA MASTHAN AND D. MAMATHA REDDY
        </div>
        <div className="info yellow">Lecture Hall : 406</div>
        <div className="info yellow">
          {now.toLocaleTimeString()} |{" "}
          {now.toLocaleDateString(undefined, {
            weekday: "long",
            day: "2-digit",
            month: "long",
            year: "numeric",
          })}
        </div>
      </div>

      {/* ===== SLIDING NOTICE BAR ===== */}
      <div className="notice-bar">
        <span className="notice-label">📢 NOTICE</span>
        <div className="notice-track">
          {/* Two copies for seamless loop */}
          <span className="notice-text">{noticeText}&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;{noticeText}</span>
        </div>
      </div>

      {/* ===== TIMETABLE ===== */}
      <div className="timetable-area">
        <TimetableView
          periods={PERIOD_LABELS}
          week={week}
          currentDay={currentDay}
          currentIdx={currentIdx}
        />
      </div>

      {/* ===== EVENTS + CLOCK ===== */}
      <div className="bottom-panel">
        <div className="events-panel">
          <div className="events-title">📅 Upcoming Events</div>
          <div className="events-buttons">
            <div className="event-btn">Seminar</div>
            <div className="event-btn">Workshop</div>
            <div className="event-btn">Exam</div>
          </div>
        </div>
        <div className="clock-panel">
          <div className="clock">{now.toLocaleTimeString()}</div>
        </div>
      </div>
    </div>
  );
}

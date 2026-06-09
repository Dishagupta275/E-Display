import React, { useEffect, useState } from "react";
import mqtt from "mqtt";
import "./styles.css";
import TimetableView from "./TimetableView";

import collegeLogo from "./assets/college_logo.png";
import naacLogo from "./assets/naac_logo.png";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";

// MQTT credentials from env vars — never hardcode in frontend!
const MQTT_URL      = import.meta.env.VITE_MQTT_URL      || "wss://db89b31f17b343648adedb9f54f0aa40.s1.eu.hivemq.cloud:8884/mqtt";
const MQTT_USERNAME = import.meta.env.VITE_MQTT_USERNAME || "E-display";
const MQTT_PASSWORD = import.meta.env.VITE_MQTT_PASSWORD || "";

const PERIOD_TIMES = [
  { start: "09:00", end: "10:00" }, { start: "10:00", end: "10:50" },
  { start: "10:50", end: "11:00" }, { start: "11:00", end: "11:50" },
  { start: "11:50", end: "12:40" }, { start: "12:40", end: "13:30" },
  { start: "13:30", end: "14:20" }, { start: "14:20", end: "15:10" },
  { start: "15:10", end: "16:00" },
];

const PERIOD_LABELS = [
  "9:00am-10:00am", "10:00am-10:50am", "10:50-11:00",
  "11:00am-11:50am", "11:50am-12:40pm", "12:40-1:30",
  "1:30pm-2:20pm", "2:20pm-3:10pm", "3:10pm-4:00pm",
];

function getCurrentPeriodIdx(now) {
  const current = now.getHours() * 60 + now.getMinutes();
  for (let i = 0; i < PERIOD_TIMES.length; i++) {
    const [sh, sm] = PERIOD_TIMES[i].start.split(":").map(Number);
    const [eh, em] = PERIOD_TIMES[i].end.split(":").map(Number);
    if (current >= sh * 60 + sm && current < eh * 60 + em) return i;
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
  const [settings, setSettings] = useState({
    collegeName: "SPHOORTHY ENGINEERING COLLEGE",
    yearSemester: "2ND YEAR B.TECH 1ST SEMESTER",
    academicYear: "2024-2025",
    classIncharge: "DR. KAJA MASTHAN AND D. MAMATHA REDDY",
    lectureHall: "406",
    events: ["Seminar", "Workshop", "Exam"],
  });

  const params = new URLSearchParams(window.location.search);
  const className = classNameOverride || params.get("class") || "CSEA";

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    fetch(`${API_BASE}/api/settings/${className}`)
      .then((r) => r.json())
      .then((d) => { if (d?.collegeName) setSettings(d); })
      .catch(() => {});
  }, [className]);

  useEffect(() => {
    fetch(`${API_BASE}/api/notices`)
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          const texts = data.map((n) => typeof n === "string" ? n : n.text).filter(Boolean);
          if (texts.length > 0) setNotices(texts);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetch(`${API_BASE}/api/timetable/${className}`)
      .then((r) => r.json())
      .then((data) => {
        const rawWeek = data.week || data;
        const normalized = {};
        Object.keys(rawWeek || {}).forEach((day) => {
          normalized[day] = rawWeek[day].map((s) =>
            typeof s === "string" ? { subject: s, professor: "" } : s
          );
        });
        setWeek(normalized);
      })
      .catch((err) => console.error("❌ Failed to load timetable", err));
  }, [className]);

  useEffect(() => {
    if (!MQTT_PASSWORD) {
      console.warn("⚠️ VITE_MQTT_PASSWORD not set — MQTT disabled");
      return;
    }
    const client = mqtt.connect(MQTT_URL, {
      username: MQTT_USERNAME,
      password: MQTT_PASSWORD,
      reconnectPeriod: 2000,
    });

    client.on("connect", () => {
      client.subscribe(`edisplay/timetable/${className}`);
      client.subscribe("edisplay/notices");
      client.subscribe(`edisplay/notices/${className}`);
      client.subscribe(`edisplay/settings/${className}`);
      console.log("✅ MQTT connected");
    });

    client.on("message", (topic, message) => {
      try {
        const payload = JSON.parse(message.toString());

        if (topic === `edisplay/settings/${className}`) {
          if (payload?.collegeName) setSettings(payload);
          return;
        }

        if (topic === "edisplay/notices" || topic === `edisplay/notices/${className}`) {
          if (Array.isArray(payload)) {
            const texts = payload.map((n) => typeof n === "string" ? n : n.text).filter(Boolean);
            setNotices(texts);
          }
          return;
        }

        const rawWeek = payload.week;
        if (!rawWeek) return;
        const normalized = {};
        Object.keys(rawWeek).forEach((day) => {
          normalized[day] = rawWeek[day].map((s) =>
            typeof s === "string" ? { subject: s, professor: "" } : s
          );
        });
        setWeek(normalized);
      } catch (err) {
        console.error("❌ MQTT parse error", err);
      }
    });

    return () => client.end();
  }, [className]);

  const currentDay = now.toLocaleDateString(undefined, { weekday: "long" });
  const currentIdx = getCurrentPeriodIdx(now);
  const noticeText = notices.join("   •   ");

  return (
    <div className="screen">
      <div className="top-header">
        <img src={collegeLogo} className="logo" alt="college" />
        <div className="college-title">{settings.collegeName}</div>
        <img src={naacLogo} className="logo" alt="naac" />
      </div>

      <div className="academic-bar">
        {className} {settings.yearSemester} ACADEMIC YEAR: {settings.academicYear}
      </div>

      <div className="info-strip">
        <div className="info green">CLASS INCHARGE : {settings.classIncharge}</div>
        <div className="info yellow">Lecture Hall : {settings.lectureHall}</div>
        <div className="info yellow">
          {now.toLocaleTimeString()} |{" "}
          {now.toLocaleDateString(undefined, { weekday: "long", day: "2-digit", month: "long", year: "numeric" })}
        </div>
      </div>

      <div className="notice-bar">
        <span className="notice-label">📢 NOTICE</span>
        <div className="notice-track">
          <span className="notice-text">{noticeText}&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;{noticeText}</span>
        </div>
      </div>

      <div className="timetable-area">
        <TimetableView periods={PERIOD_LABELS} week={week} currentDay={currentDay} currentIdx={currentIdx} />
      </div>

      <div className="bottom-panel">
        <div className="events-panel">
          <div className="events-title">📅 Upcoming Events</div>
          <div className="events-buttons">
            {(settings.events || []).map((ev, i) => (
              <div key={i} className="event-btn">{ev}</div>
            ))}
          </div>
        </div>
        <div className="clock-panel">
          <div className="clock">{now.toLocaleTimeString()}</div>
        </div>
      </div>
    </div>
  );
}

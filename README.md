# E-DISPLAY
### Smart Digital Classroom Information & Communication System

![React](https://img.shields.io/badge/React.js-v19-61DAFB?style=flat-square&logo=react)
![Vite](https://img.shields.io/badge/Vite-Build_Tool-646CFF?style=flat-square&logo=vite)
![MQTT](https://img.shields.io/badge/MQTT-Pub%2FSub-660066?style=flat-square&logo=eclipsemosquitto)
![Render](https://img.shields.io/badge/Deployed_on-Render-46E3B7?style=flat-square&logo=render)
![License](https://img.shields.io/badge/License-MIT-yellow?style=flat-square)

> Replacing paper notice boards and printed circulars with real-time digital classroom displays — one Raspberry Pi at a time.

---

## 📌 What is E-DISPLAY?

Colleges and schools today still rely on paper circulars, printed timetables, and physical notice boards to communicate with students and faculty. Notices get delayed, timetable changes cause confusion, and maintaining all of it wastes time and paper.

**E-DISPLAY** replaces all of that with a centralized digital board system. Each classroom gets a monitor (powered by a Raspberry Pi) that shows the live timetable, current class, faculty details, and instant notifications — all managed from a single admin dashboard.

---

## 🔗 Live Demo

| Role | Link |
|---|---|
| 📤 **Publisher** (Admin / HOD) | [e-display-1.onrender.com](https://e-display-1.onrender.com/) |
| 📺 **Subscriber** (Classroom Display) | [e-display-subscriber.onrender.com](https://e-display-subscriber.onrender.com/) |

> _Open the subscriber link on a classroom monitor and the publisher link on the admin's device to see real-time updates in action._

---

## ✨ Key Features

- 📢 **Instant notifications** — Push announcements to one classroom, a department, or the entire college in seconds
- 🕐 **Live timetable** — Updates reflect instantly on displays; current period highlighted automatically
- 📶 **Offline mode** — Displays keep working from cached timetable when internet drops, auto-sync on reconnect
- 📱 **Faculty mobile app** — View today's schedule, next class, and notifications on the go
- 🖥️ **Device monitoring** — Admin dashboard shows which classroom displays are online or offline in real time
- 🔒 **Kiosk mode** — Displays run locked; no browser access, no desktop, dedicated signage only

---

## 🏗️ System Architecture

```
Publisher App (Admin / HOD)
  https://e-display-1.onrender.com
       │
       │  MQTT publish (topic: classroom/notice)
       ▼
  MQTT Broker
       │
       │  MQTT subscribe
       ▼
Subscriber App (Classroom Display)
  https://e-display-subscriber.onrender.com
  (runs on monitor / Raspberry Pi in each classroom)
```

---

## 👥 User Roles

| Role | Access |
|---|---|
| **Principal** | Super admin — full access across all departments, college-wide notifications, manage HOD accounts |
| **HOD** | Department admin — manage timetables, classrooms, notifications for their department only |
| **Asst. HOD** | Support HOD — manage schedules and send notifications within the department |
| **Faculty** | View-only — timetable, next class, and notifications via mobile app. Cannot modify anything |
| **Students** | View information through classroom display only. No login required |

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Publisher Frontend | React.js (v19), Vite |
| Subscriber Frontend | React.js (v19), Vite |
| Real-time Messaging | MQTT (pub/sub protocol) |
| Build Tool | Vite + ESLint |
| Deployment | Render (both frontend apps) |
| Hardware (planned) | Raspberry Pi + existing LCD/LED monitor |

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- npm or yarn
- An MQTT broker (e.g. [HiveMQ public broker](https://www.hivemq.com/public-mqtt-broker/) or self-hosted Mosquitto)

### 1. Clone the repo

```bash
git clone https://github.com/your-org/e-display.git
cd e-display
```

### 2. Publisher frontend (admin panel)

```bash
cd publisher-frontend
npm install
npm run dev
```

### 3. Subscriber frontend (classroom display)

```bash
cd subscriber-frontend
npm install
npm run dev
```

> Open the subscriber on any browser or a Raspberry Pi monitor in kiosk mode. Messages published from the publisher appear on the subscriber in real time via MQTT.

---

## ⚙️ Environment Variables

Create a `.env` file in each frontend folder as needed:

```env
VITE_MQTT_BROKER_URL=wss://broker.hivemq.com:8884/mqtt
VITE_MQTT_TOPIC=edisplay/classroom
```

---

## 🗺️ Roadmap

### Phase 1 — Core System ✅
- [x] Admin dashboard with role-based access
- [x] Real-time timetable display with current-period highlighting
- [x] Push notifications to classroom / department / college
- [x] Offline mode with auto-sync on Raspberry Pi client
- [x] Device online/offline monitoring

### Phase 2 — Enhancements 🔜
- [ ] Student mobile application
- [ ] Attendance integration & QR-based room access
- [ ] Voice announcements & emergency alert system
- [ ] AI-based timetable optimization
- [ ] Cloud deployment & multi-campus management

---

## 👩‍💻 Contributors

| Name | GitHub |
|---|---|
| Disha Gupta | [@Dishagupta275](https://github.com/Dishagupta275) |
| Sravanthi Yadav | — |

> Built at **Sphoorthy Engineering College**, JNTU Hyderabad 

---

## 🌱 Why E-DISPLAY?

Traditional paper circulars are slow, wasteful, and easy to miss. E-DISPLAY eliminates that entirely — changes made by an admin appear on every relevant classroom display within seconds. No printing, no manual pinning, no outdated notices on the board.

It uses hardware colleges already own (monitors) plus an affordable Raspberry Pi, keeping deployment costs low while making campuses smarter and greener.

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).

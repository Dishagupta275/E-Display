import { useState } from "react";
import Display from "./Display";
import "./App.css";

const API = "http://localhost:5000/api";

// ─── Login Screen ───────────────────────────────
function LoginScreen({ onLoginSuccess }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch(`${API}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Login failed");
      onLoginSuccess({ token: data.access_token, user: data.user });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={loginStyles.container}>
      <div style={loginStyles.card}>
        <div style={loginStyles.logo}>E</div>
        <h1 style={loginStyles.title}>E-DISPLAY</h1>
        <p style={loginStyles.subtitle}>Sphoorthy Engineering College</p>
        <p style={loginStyles.hint}>Display Setup Login</p>

        <form onSubmit={handleLogin} style={loginStyles.form}>
          {error && <div style={loginStyles.error}>{error}</div>}
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            style={loginStyles.input}
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            style={loginStyles.input}
          />
          <button type="submit" disabled={loading} style={loginStyles.btn}>
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>
      </div>
    </div>
  );
}

// ─── Class Select Screen ────────────────────────
function ClassSelectScreen({ token, user, onClassSelected }) {
  const [classes, setClasses] = useState({});
  const [loading, setLoading] = useState(true);

  useState(() => {
    fetch(`${API}/classes`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(data => { setClasses(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  // Flatten classes
  const flatClasses = [];
  Object.entries(classes).forEach(([deptName, years]) => {
    Object.entries(years).forEach(([yearKey, classList]) => {
      classList.forEach(cls => flatClasses.push({ ...cls, deptName }));
    });
  });

  return (
    <div style={selectStyles.container}>
      <div style={selectStyles.header}>
        <div style={selectStyles.headerLeft}>
          <h1 style={selectStyles.title}>E-DISPLAY</h1>
          <p style={selectStyles.subtitle}>Select Classroom Display</p>
        </div>
        <div style={selectStyles.userBadge}>
          {user?.name} · {user?.role}
        </div>
      </div>

      <div style={selectStyles.content}>
        <h2 style={selectStyles.pageTitle}>Select Your Classroom</h2>
        <p style={selectStyles.hint}>This display will show the timetable for the selected classroom</p>

        {loading ? (
          <div style={selectStyles.loading}>Loading classrooms...</div>
        ) : flatClasses.length === 0 ? (
          <div style={selectStyles.empty}>No classrooms found. Please create classes first.</div>
        ) : (
          Object.entries(classes).map(([deptName, years]) => (
            <div key={deptName} style={selectStyles.deptSection}>
              <h3 style={selectStyles.deptTitle}>{deptName}</h3>
              <div style={selectStyles.grid}>
                {Object.entries(years).map(([yearKey, classList]) =>
                  classList.map(cls => (
                    <div
                      key={cls.id}
                      style={selectStyles.card}
                      onClick={() => onClassSelected(cls)}
                    >
                      <div style={selectStyles.className}>{cls.display_name}</div>
                      <div style={selectStyles.classInfo}>Year {cls.year} · Section {cls.section}</div>
                      <div style={selectStyles.classRoom}>📍 {cls.room_number || "Room N/A"}</div>
                      <div style={selectStyles.startBtn}>Start Display →</div>
                    </div>
                  ))
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// ─── Main App ───────────────────────────────────
export default function App() {
  const [screen, setScreen] = useState("login");
  const [authData, setAuthData] = useState(null);
  const [selectedClass, setSelectedClass] = useState(null);

  return (
    <div>
      {screen === "login" && (
        <LoginScreen
          onLoginSuccess={(data) => {
            setAuthData(data);
            setScreen("classSelect");
          }}
        />
      )}
      {screen === "classSelect" && authData && (
        <ClassSelectScreen
          token={authData.token}
          user={authData.user}
          onClassSelected={(cls) => {
            setSelectedClass(cls);
            setScreen("display");
          }}
        />
      )}
      {screen === "display" && selectedClass && (
        <Display
          classObj={selectedClass}
          token={authData.token}
          onExitKiosk={() => {
            setScreen("classSelect");
            setSelectedClass(null);
          }}
        />
      )}
    </div>
  );
}

// ─── Styles ─────────────────────────────────────
const loginStyles = {
  container: { minHeight: "100vh", background: "linear-gradient(135deg, #0b3d91, #1565c0)", display: "flex", alignItems: "center", justifyContent: "center" },
  card: { background: "#fff", borderRadius: 16, padding: "40px", width: 380, textAlign: "center", boxShadow: "0 20px 60px rgba(0,0,0,0.3)" },
  logo: { width: 64, height: 64, borderRadius: "50%", background: "linear-gradient(135deg, #0b3d91, #1565c0)", color: "#fff", fontSize: 28, fontWeight: "bold", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" },
  title: { fontSize: 28, fontWeight: 800, color: "#0b3d91", margin: "0 0 4px", letterSpacing: 2 },
  subtitle: { fontSize: 13, color: "#666", margin: "0 0 4px" },
  hint: { fontSize: 12, color: "#999", marginBottom: 24 },
  form: { display: "flex", flexDirection: "column", gap: 14 },
  error: { background: "#ffebee", color: "#c62828", padding: "10px 14px", borderRadius: 8, fontSize: 13 },
  input: { padding: "12px 16px", borderRadius: 8, border: "1.5px solid #e0e0e0", fontSize: 15, outline: "none" },
  btn: { padding: 14, background: "linear-gradient(135deg, #0b3d91, #1565c0)", color: "#fff", border: "none", borderRadius: 8, fontSize: 16, fontWeight: 600, cursor: "pointer" },
};

const selectStyles = {
  container: { minHeight: "100vh", background: "#f0f4f8", fontFamily: "sans-serif" },
  header: { background: "linear-gradient(135deg, #0b3d91, #1565c0)", color: "#fff", padding: "20px 32px", display: "flex", justifyContent: "space-between", alignItems: "center" },
  headerLeft: {},
  title: { margin: 0, fontSize: 24, fontWeight: 800, letterSpacing: 2 },
  subtitle: { margin: "4px 0 0", fontSize: 13, opacity: 0.8 },
  userBadge: { background: "rgba(255,255,255,0.2)", padding: "8px 16px", borderRadius: 8, fontSize: 13 },
  content: { padding: "32px" },
  pageTitle: { fontSize: 22, fontWeight: 700, color: "#0b3d91", marginBottom: 8 },
  hint: { color: "#666", marginBottom: 32, fontSize: 14 },
  loading: { textAlign: "center", padding: 60, color: "#666" },
  empty: { textAlign: "center", padding: 60, color: "#666", background: "#fff", borderRadius: 10 },
  deptSection: { marginBottom: 32 },
  deptTitle: { fontSize: 18, fontWeight: 700, color: "#0b3d91", marginBottom: 16, padding: "8px 16px", background: "#e3f2fd", borderRadius: 8, display: "inline-block" },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 16 },
  card: { background: "#fff", borderRadius: 12, padding: 20, cursor: "pointer", boxShadow: "0 2px 8px rgba(0,0,0,0.06)", border: "2px solid transparent", transition: "all 0.2s" },
  className: { fontSize: 22, fontWeight: 800, color: "#0b3d91", marginBottom: 6 },
  classInfo: { fontSize: 13, color: "#666", marginBottom: 4 },
  classRoom: { fontSize: 13, color: "#888", marginBottom: 12 },
  startBtn: { color: "#1565c0", fontWeight: 600, fontSize: 14 },
};
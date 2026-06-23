import { useState, useEffect } from "react";
import Display from "./Display";
import "./App.css";

const API = "https://e-display.onrender.com/api";

// ─── Login Screen ───────────────────────────────
function LoginScreen({ onLoginSuccess }) {
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [error, setError]       = useState("");
  const [loading, setLoading]   = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch(`${API.replace('/api', '')}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Login failed");

      if (data.user.role !== "device") {
        throw new Error("This portal is for device accounts only");
      }

      // Fetch assigned class immediately after login
      const classRes = await fetch(`${API}/devices/my-class`, {
        headers: { Authorization: `Bearer ${data.access_token}` },
      });
      const classData = await classRes.json();

      onLoginSuccess({
        token: data.access_token,
        user: data.user,
        assignedClass: classData.assigned_class || null,
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.logo}>E</div>
        <h1 style={styles.title}>E-DISPLAY</h1>
        <p style={styles.subtitle}>Sphoorthy Engineering College</p>
        <p style={styles.hint}>Display Board Login</p>

        <form onSubmit={handleLogin} style={styles.form}>
          {error && <div style={styles.error}>{error}</div>}
          <input
            type="email"
            placeholder="Device Email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            style={styles.input}
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            style={styles.input}
          />
          <button type="submit" disabled={loading} style={styles.btn}>
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>
      </div>
    </div>
  );
}

// ─── No Class Assigned Screen ──────────────────
function WaitingScreen({ deviceName, onRetry }) {
  useEffect(() => {
    // Auto-retry every 30 seconds
    const interval = setInterval(onRetry, 30000);
    return () => clearInterval(interval);
  }, [onRetry]);

  return (
    <div style={{ ...styles.container, flexDirection: "column", gap: 24 }}>
      <div style={styles.logo}>E</div>
      <h1 style={{ ...styles.title, color: "#fff" }}>E-DISPLAY</h1>
      <div style={{ background: "rgba(255,255,255,0.15)", borderRadius: 16, padding: "32px 48px", textAlign: "center", color: "#fff" }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>⏳</div>
        <h2 style={{ margin: "0 0 8px", fontSize: 22 }}>{deviceName}</h2>
        <p style={{ margin: "0 0 16px", opacity: 0.8 }}>Waiting for class assignment from publisher...</p>
        <p style={{ margin: 0, opacity: 0.6, fontSize: 13 }}>Auto-refreshing every 30 seconds</p>
      </div>
      <button onClick={onRetry} style={{ ...styles.btn, width: 200 }}>
        Check Now
      </button>
    </div>
  );
}

// ─── Main App ───────────────────────────────────
export default function App() {
  const [screen, setScreen]           = useState("login");
  const [authData, setAuthData]       = useState(null);
  const [assignedClass, setAssignedClass] = useState(null);

  // Poll for class assignment every 30 seconds once logged in
  useEffect(() => {
    if (!authData) return;
    const poll = async () => {
      try {
        const res  = await fetch(`${API}/devices/my-class`, {
          headers: { Authorization: `Bearer ${authData.token}` },
        });
        const data = await res.json();
        if (data.assigned_class) {
          setAssignedClass(data.assigned_class);
          setScreen("display");
        } else {
          setAssignedClass(null);
          setScreen("waiting");
        }
      } catch (e) {
        console.error("Poll error:", e);
      }
    };

    const interval = setInterval(poll, 30000);
    return () => clearInterval(interval);
  }, [authData]);

  const handleLoginSuccess = ({ token, user, assignedClass: cls }) => {
    setAuthData({ token, user });
    if (cls) {
      setAssignedClass(cls);
      setScreen("display");
    } else {
      setScreen("waiting");
    }
  };

  const handleRetry = async () => {
    if (!authData) return;
    try {
      const res  = await fetch(`${API}/devices/my-class`, {
        headers: { Authorization: `Bearer ${authData.token}` },
      });
      const data = await res.json();
      if (data.assigned_class) {
        setAssignedClass(data.assigned_class);
        setScreen("display");
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div>
      {screen === "login" && (
        <LoginScreen onLoginSuccess={handleLoginSuccess} />
      )}
      {screen === "waiting" && authData && (
        <WaitingScreen
          deviceName={authData.user.name}
          onRetry={handleRetry}
        />
      )}
      {screen === "display" && assignedClass && (
        <Display
          classObj={assignedClass}
          token={authData.token}
          onExitKiosk={() => setScreen("waiting")}
        />
      )}
    </div>
  );
}

const styles = {
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

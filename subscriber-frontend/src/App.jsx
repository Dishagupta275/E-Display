import { useState, useEffect } from "react";
import Display from "./Display";
import NoticeBoard from "./NoticeBoard";
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
      {/* LEFT — Form */}
      <div style={loginStyles.leftPanel}>
        <div style={loginStyles.formBox}>
          <div style={loginStyles.topTag}>DISPLAY SETUP PORTAL</div>
          <h2 style={loginStyles.formTitle}>Sign In</h2>
          <p style={loginStyles.formSubtitle}>Sphoorthy Engineering College</p>

          <form onSubmit={handleLogin} style={loginStyles.form}>
            {error && <div style={loginStyles.error}>⚠ {error}</div>}

            <div style={loginStyles.fieldGroup}>
              <label style={loginStyles.label}>Email Address</label>
              <input
                type="email"
                placeholder="you@sphoorthy.ac.in"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                style={loginStyles.input}
                onFocus={e => e.target.style.borderColor = "#4f46e5"}
                onBlur={e => e.target.style.borderColor = "#d1d5db"}
              />
            </div>

            <div style={loginStyles.fieldGroup}>
              <label style={loginStyles.label}>Password</label>
              <input
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                style={loginStyles.input}
                onFocus={e => e.target.style.borderColor = "#4f46e5"}
                onBlur={e => e.target.style.borderColor = "#d1d5db"}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              style={loginStyles.btn}
              onMouseEnter={e => e.target.style.background = "#4338ca"}
              onMouseLeave={e => e.target.style.background = "#4f46e5"}
            >
              {loading ? "Signing in..." : "Sign In →"}
            </button>
          </form>

          <p style={loginStyles.footer}>© 2025 Sphoorthy Engineering College</p>
        </div>
      </div>

      {/* RIGHT — Branding */}
      <div style={loginStyles.rightPanel}>
        <div style={loginStyles.brandBlock}>
          <div style={loginStyles.logoCircle}>E</div>
          <h1 style={loginStyles.brandTitle}>E-DISPLAY</h1>
          <p style={loginStyles.brandSub}>Smart Classroom Display System</p>
          <div style={loginStyles.divider} />
          <div style={loginStyles.featureList}>
            {[
              { icon: "📅", text: "Real-time Timetable Display" },
              { icon: "📋", text: "Digital Notice Board" },
              { icon: "🏛️", text: "Multi-Department Support" },
              { icon: "🖥️", text: "Kiosk Mode Display" },
            ].map((f, i) => (
              <div key={i} style={loginStyles.featureItem}>
                <span style={loginStyles.featureIcon}>{f.icon}</span>
                <span>{f.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Notice Board Select ────────────────────────
function NoticeBoardSelect({ token, user, onBoardSelected }) {
  const [boards, setBoards] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const deptId = user?.department_id;
    const url = deptId
      ? `${API}/notice-boards/public?department_id=${deptId}`
      : `${API}/notice-boards/public`;

    fetch(url)
      .then(r => r.json())
      .then(data => {
        setBoards(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [user?.department_id]);

  if (loading) return <div style={nbStyles.loading}>Loading notice boards...</div>;
  if (boards.length === 0) return (
    <div style={nbStyles.empty}>No notice boards available</div>
  );

  return (
    <div style={nbStyles.grid}>
      {boards.map(({ board, notices }) => (
        <div
          key={board.id}
          style={nbStyles.card}
          onClick={() => onBoardSelected(board, notices)}
          onMouseEnter={e => e.currentTarget.style.borderColor = "#4f46e5"}
          onMouseLeave={e => e.currentTarget.style.borderColor = "#e5e7eb"}
        >
          <div style={nbStyles.cardIcon}>📋</div>
          <div style={nbStyles.cardName}>{board.name}</div>
          <div style={nbStyles.cardMeta}>
            {board.display_mode === 'carousel' ? `⏱ Carousel · ${board.carousel_time}min` : '⊞ Grid'}
            &nbsp;·&nbsp; {board.notice_count} notices
          </div>
          <div style={nbStyles.cardTarget}>
            {board.target_type === 'all' ? '🌐 College-wide' : '🏢 Department'}
          </div>
          <div style={nbStyles.cardBtn}>View Board →</div>
        </div>
      ))}
    </div>
  );
}

// ─── Class Select Screen ────────────────────────
function ClassSelectScreen({ token, user, onClassSelected, onBoardSelected }) {
  const [classes, setClasses] = useState({});
  const [loading, setLoading] = useState(true);
  const [activeDept, setActiveDept] = useState(null);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("timetable"); // "timetable" | "noticeboard"

  useEffect(() => {
    fetch(`${API}/classes`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(data => {
        setClasses(data);
        const firstDept = Object.keys(data)[0];
        if (firstDept) setActiveDept(firstDept);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [token]);

  const deptNames = Object.keys(classes);
  const deptColors = ["#4f46e5", "#0891b2", "#059669", "#d97706", "#dc2626", "#7c3aed"];
  const getDeptColor = (i) => deptColors[i % deptColors.length];
  const getDeptCount = (deptName) => {
    let count = 0;
    Object.values(classes[deptName] || {}).forEach(list => { count += list.length; });
    return count;
  };

  const getFilteredClasses = () => {
    if (!activeDept || !classes[activeDept]) return {};
    const result = {};
    Object.entries(classes[activeDept]).forEach(([yearKey, list]) => {
      const filtered = list.filter(cls =>
        cls.display_name?.toLowerCase().includes(search.toLowerCase())
      );
      if (filtered.length > 0) result[yearKey] = filtered;
    });
    return result;
  };

  const filtered = getFilteredClasses();
  const activeDeptIndex = deptNames.indexOf(activeDept);
  const activeColor = getDeptColor(activeDeptIndex);

  return (
    <div style={selectStyles.container}>
      {/* Header */}
      <div style={selectStyles.header}>
        <div style={selectStyles.headerLeft}>
          <div style={selectStyles.headerLogo}>E</div>
          <div>
            <h1 style={selectStyles.headerTitle}>E-DISPLAY</h1>
            <p style={selectStyles.headerSub}>Sphoorthy Engineering College</p>
          </div>
        </div>
        <div style={selectStyles.userPill}>
          <span style={selectStyles.onlineDot}>●</span>
          {user?.name} &nbsp;·&nbsp; <span style={{ opacity: 0.7 }}>{user?.role}</span>
        </div>
      </div>

      {/* Tab switcher */}
      <div style={selectStyles.tabBar}>
        <button
          onClick={() => setActiveTab("timetable")}
          style={{
            ...selectStyles.tabBtn,
            background: activeTab === "timetable" ? "#4f46e5" : "transparent",
            color: activeTab === "timetable" ? "#fff" : "#6b7280",
            borderBottom: activeTab === "timetable" ? "none" : "2px solid transparent",
          }}
        >
          🗓 Timetable Display
        </button>
        <button
          onClick={() => setActiveTab("noticeboard")}
          style={{
            ...selectStyles.tabBtn,
            background: activeTab === "noticeboard" ? "#4f46e5" : "transparent",
            color: activeTab === "noticeboard" ? "#fff" : "#6b7280",
            borderBottom: activeTab === "noticeboard" ? "none" : "2px solid transparent",
          }}
        >
          📋 Notice Board
        </button>
      </div>

      {/* Content */}
      {activeTab === "noticeboard" ? (
        <div style={{ flex: 1, overflowY: "auto", padding: "24px 28px" }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: "#1a237e", marginBottom: 20 }}>
            Select a Notice Board to Display
          </h2>
          <NoticeBoardSelect
            token={token}
            user={user}
            onBoardSelected={onBoardSelected}
          />
        </div>
      ) : (
        <div style={selectStyles.body}>
          {/* Sidebar */}
          <aside style={selectStyles.sidebar}>
            <p style={selectStyles.sidebarLabel}>DEPARTMENTS</p>
            {loading ? (
              <div style={selectStyles.sidebarLoading}>Loading...</div>
            ) : (
              deptNames.map((dept, i) => (
                <div
                  key={dept}
                  onClick={() => { setActiveDept(dept); setSearch(""); }}
                  style={{
                    ...selectStyles.sidebarItem,
                    background: activeDept === dept ? `${getDeptColor(i)}12` : "transparent",
                    borderLeft: activeDept === dept
                      ? `3px solid ${getDeptColor(i)}`
                      : "3px solid transparent",
                  }}
                >
                  <span style={{ ...selectStyles.deptDot, background: getDeptColor(i) }} />
                  <span style={{
                    ...selectStyles.deptName,
                    color: activeDept === dept ? getDeptColor(i) : "#374151",
                    fontWeight: activeDept === dept ? 700 : 500,
                  }}>
                    {dept}
                  </span>
                  <span style={{
                    ...selectStyles.deptBadge,
                    background: activeDept === dept ? getDeptColor(i) : "#e5e7eb",
                    color: activeDept === dept ? "#fff" : "#6b7280",
                  }}>
                    {getDeptCount(dept)}
                  </span>
                </div>
              ))
            )}
          </aside>

          {/* Main */}
          <main style={selectStyles.main}>
            <div style={selectStyles.topRow}>
              <div>
                <h2 style={{ ...selectStyles.pageTitle, color: activeColor }}>
                  {activeDept || "Select a Department"}
                </h2>
                <p style={selectStyles.pageHint}>Click any classroom to start the display</p>
              </div>
              <input
                type="text"
                placeholder="🔍  Search class..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={selectStyles.searchInput}
              />
            </div>

            {loading ? (
              <div style={selectStyles.loading}>Loading classrooms...</div>
            ) : !activeDept ? (
              <div style={selectStyles.empty}>Select a department from the sidebar.</div>
            ) : Object.keys(filtered).length === 0 ? (
              <div style={selectStyles.empty}>No classrooms match your search.</div>
            ) : (
              Object.entries(filtered).map(([yearKey, list]) => (
                <div key={yearKey} style={selectStyles.yearSection}>
                  <div style={{ ...selectStyles.yearBadge, background: `${activeColor}18`, color: activeColor }}>
                    {yearKey.replace("year_", "Year ")}
                  </div>
                  <div style={selectStyles.grid}>
                    {list.map(cls => (
                      <ClassCard
                        key={cls.id}
                        cls={cls}
                        color={activeColor}
                        onClick={() => onClassSelected(cls)}
                      />
                    ))}
                  </div>
                </div>
              ))
            )}
          </main>
        </div>
      )}
    </div>
  );
}

// ─── Class Card ─────────────────────────────────
function ClassCard({ cls, color, onClick }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        ...selectStyles.card,
        borderColor: hovered ? color : "#e5e7eb",
        boxShadow: hovered ? `0 6px 20px ${color}28` : "0 1px 4px rgba(0,0,0,0.06)",
        transform: hovered ? "translateY(-3px)" : "translateY(0)",
      }}
    >
      <div style={selectStyles.cardTop}>
        <span style={{ ...selectStyles.cardName, color }}>{cls.display_name}</span>
        <span style={{ ...selectStyles.cardArrow, color, opacity: hovered ? 1 : 0 }}>→</span>
      </div>
      <div style={selectStyles.cardSection}>Section {cls.section}</div>
      {cls.room_number && <div style={selectStyles.cardMeta}>📍 {cls.room_number}</div>}
      <div style={{
        ...selectStyles.cardFooter,
        background: hovered ? color : "#f8fafc",
        color: hovered ? "#fff" : "#94a3b8",
      }}>
        {hovered ? "Start Display →" : "Classroom Display"}
      </div>
    </div>
  );
}

// ─── Main App ───────────────────────────────────
export default function App() {
  const [screen, setScreen] = useState("login");
  const [authData, setAuthData] = useState(null);
  const [selectedClass, setSelectedClass] = useState(null);
  const [selectedBoard, setSelectedBoard] = useState(null);

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
          onBoardSelected={(board, notices) => {
            setSelectedBoard({ board, notices });
            setScreen("noticeboard");
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

      {screen === "noticeboard" && selectedBoard && (
        <NoticeBoard
          board={selectedBoard.board}
          notices={selectedBoard.notices}
          token={authData.token}
          onBack={() => {
            setScreen("classSelect");
            setSelectedBoard(null);
          }}
        />
      )}
    </div>
  );
}

// ─── Login Styles ────────────────────────────────
const loginStyles = {
  container: { minHeight: "100vh", display: "flex", fontFamily: "'Segoe UI', sans-serif" },
  leftPanel: { width: 480, background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", padding: "60px 56px", flexShrink: 0 },
  formBox: { width: "100%" },
  topTag: { fontSize: 11, fontWeight: 700, letterSpacing: 2, color: "#4f46e5", marginBottom: 16 },
  formTitle: { fontSize: 32, fontWeight: 800, color: "#111827", margin: "0 0 6px" },
  formSubtitle: { fontSize: 14, color: "#9ca3af", marginBottom: 36 },
  form: { display: "flex", flexDirection: "column", gap: 20 },
  fieldGroup: { display: "flex", flexDirection: "column", gap: 7 },
  label: { fontSize: 12, fontWeight: 600, color: "#374151", letterSpacing: 0.5 },
  input: { padding: "13px 16px", borderRadius: 10, border: "1.5px solid #d1d5db", fontSize: 14, outline: "none", color: "#111827", background: "#fff", transition: "border-color 0.2s" },
  error: { background: "#fef2f2", color: "#b91c1c", border: "1px solid #fecaca", padding: "10px 14px", borderRadius: 8, fontSize: 13 },
  btn: { padding: "14px", background: "#4f46e5", color: "#fff", border: "none", borderRadius: 10, fontSize: 15, fontWeight: 700, cursor: "pointer", marginTop: 6, transition: "background 0.2s" },
  footer: { textAlign: "center", fontSize: 12, color: "#d1d5db", marginTop: 40 },
  rightPanel: { flex: 1, background: "linear-gradient(135deg, #4f46e5 0%, #0891b2 60%, #06b6d4 100%)", display: "flex", alignItems: "center", justifyContent: "center", padding: 60 },
  brandBlock: { color: "#fff", textAlign: "center" },
  logoCircle: { width: 88, height: 88, borderRadius: "50%", background: "rgba(255,255,255,0.18)", border: "2.5px solid rgba(255,255,255,0.5)", fontSize: 40, fontWeight: 900, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 24px" },
  brandTitle: { fontSize: 48, fontWeight: 900, letterSpacing: 8, margin: "0 0 10px" },
  brandSub: { fontSize: 15, opacity: 0.8, marginBottom: 0 },
  divider: { width: 60, height: 2, background: "rgba(255,255,255,0.3)", margin: "28px auto", borderRadius: 2 },
  featureList: { display: "flex", flexDirection: "column", gap: 16, textAlign: "left" },
  featureItem: { display: "flex", alignItems: "center", gap: 12, fontSize: 14, opacity: 0.9, background: "rgba(255,255,255,0.1)", padding: "12px 18px", borderRadius: 10 },
  featureIcon: { fontSize: 18 },
};

// ─── Notice Board Card Styles ────────────────────
const nbStyles = {
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 16 },
  card: { background: "#fff", borderRadius: 12, padding: 20, cursor: "pointer", border: "1.5px solid #e5e7eb", transition: "all 0.2s", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" },
  cardIcon: { fontSize: 32, marginBottom: 10 },
  cardName: { fontSize: 16, fontWeight: 700, color: "#1a237e", marginBottom: 6 },
  cardMeta: { fontSize: 12, color: "#6b7280", marginBottom: 4 },
  cardTarget: { fontSize: 11, color: "#888", marginBottom: 12 },
  cardBtn: { fontSize: 13, fontWeight: 600, color: "#4f46e5" },
  loading: { textAlign: "center", padding: 40, color: "#9ca3af" },
  empty: { textAlign: "center", padding: 40, color: "#9ca3af", background: "#fff", borderRadius: 12, border: "1.5px solid #e5e7eb" },
};

// ─── Select Styles ───────────────────────────────
const selectStyles = {
  container: { minHeight: "100vh", height: "100vh", background: "#f8fafc", fontFamily: "'Segoe UI', sans-serif", display: "flex", flexDirection: "column", overflow: "hidden" },
  header: { background: "#fff", borderBottom: "1px solid #e5e7eb", padding: "14px 28px", display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 },
  headerLeft: { display: "flex", alignItems: "center", gap: 14 },
  headerLogo: { width: 38, height: 38, borderRadius: 10, background: "linear-gradient(135deg, #4f46e5, #0891b2)", color: "#fff", fontSize: 18, fontWeight: 900, display: "flex", alignItems: "center", justifyContent: "center" },
  headerTitle: { margin: 0, fontSize: 18, fontWeight: 900, letterSpacing: 3, color: "#111827" },
  headerSub: { margin: 0, fontSize: 11, color: "#9ca3af" },
  userPill: { background: "#f1f5f9", border: "1px solid #e2e8f0", padding: "7px 16px", borderRadius: 20, fontSize: 13, color: "#374151", fontWeight: 500 },
  onlineDot: { color: "#22c55e", marginRight: 6, fontSize: 10 },
  tabBar: { display: "flex", gap: 4, padding: "10px 28px", background: "#fff", borderBottom: "1px solid #e5e7eb", flexShrink: 0 },
  tabBtn: { padding: "8px 20px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 14, fontWeight: 600, transition: "all 0.2s" },
  body: { display: "flex", flex: 1, overflow: "hidden" },
  sidebar: { width: 220, background: "#fff", borderRight: "1px solid #e5e7eb", padding: "20px 0", overflowY: "auto", flexShrink: 0 },
  sidebarLabel: { fontSize: 10, fontWeight: 700, letterSpacing: 1.5, color: "#9ca3af", padding: "0 18px 12px", margin: 0 },
  sidebarLoading: { padding: "20px 18px", color: "#aaa", fontSize: 13 },
  sidebarItem: { display: "flex", alignItems: "center", gap: 10, padding: "11px 18px", cursor: "pointer", transition: "all 0.15s" },
  deptDot: { width: 9, height: 9, borderRadius: "50%", flexShrink: 0 },
  deptName: { flex: 1, fontSize: 13 },
  deptBadge: { fontSize: 11, fontWeight: 700, borderRadius: 10, padding: "2px 8px", minWidth: 20, textAlign: "center" },
  main: { flex: 1, overflowY: "auto", padding: "24px 28px" },
  topRow: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24, gap: 20 },
  pageTitle: { fontSize: 20, fontWeight: 800, margin: "0 0 4px" },
  pageHint: { fontSize: 13, color: "#9ca3af", margin: 0 },
  searchInput: { padding: "10px 16px", borderRadius: 10, border: "1.5px solid #e5e7eb", fontSize: 13, outline: "none", background: "#fff", width: 260, color: "#374151", flexShrink: 0 },
  yearSection: { marginBottom: 28 },
  yearBadge: { display: "inline-block", fontSize: 12, fontWeight: 700, letterSpacing: 1, padding: "5px 14px", borderRadius: 6, marginBottom: 14, textTransform: "uppercase" },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(185px, 1fr))", gap: 14 },
  card: { background: "#fff", borderRadius: 12, overflow: "hidden", cursor: "pointer", border: "1.5px solid #e5e7eb", transition: "all 0.2s ease" },
  cardTop: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 16px 4px" },
  cardName: { fontSize: 22, fontWeight: 800 },
  cardArrow: { fontSize: 16, fontWeight: 700, transition: "opacity 0.2s" },
  cardSection: { fontSize: 12, color: "#9ca3af", padding: "0 16px 8px" },
  cardMeta: { fontSize: 12, color: "#6b7280", padding: "0 16px 4px" },
  cardFooter: { fontSize: 12, fontWeight: 600, padding: "10px 16px", marginTop: 8, transition: "all 0.2s", textAlign: "center" },
  loading: { textAlign: "center", padding: 60, color: "#9ca3af", fontSize: 15 },
  empty: { textAlign: "center", padding: 60, color: "#9ca3af", fontSize: 14, background: "#fff", borderRadius: 12, border: "1.5px solid #e5e7eb" },
};
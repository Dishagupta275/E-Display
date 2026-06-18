import React, { useState, useEffect } from "react";
import "./ClassSelect.css";

const API = "http://localhost:5000/api";

const YEAR_LABELS = { 1: "1st Year", 2: "2nd Year", 3: "3rd Year", 4: "4th Year" };

const DEPT_COLORS = {
  default: { bg: "#eff6ff", text: "#1d4ed8", dot: "#3b82f6" },
};

export default function ClassSelect({ token, user, department, onClassSelected }) {
  const [allClasses, setAllClasses] = useState({});
  const [deptList, setDeptList] = useState([]);
  const [activeDept, setActiveDept] = useState(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`${API}/classes`, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    })
      .then((r) => r.json())
      .then((data) => {
        // data: { "CSE": { "1": [...], "2": [...] }, "ECE": { ... } }
        const depts = Object.keys(data);
        const flat = {};
        depts.forEach((dept) => {
          flat[dept] = [];
          Object.keys(data[dept])
            .sort((a, b) => parseInt(a) - parseInt(b))
            .forEach((year) => {
              data[dept][year].forEach((cls) => flat[dept].push(cls));
            });
        });
        setAllClasses(flat);
        setDeptList(depts);
        setActiveDept(department?.name || depts[0] || null);
        setLoading(false);
      })
      .catch(() => {
        setError("Failed to load classes. Check your network.");
        setLoading(false);
      });
  }, [token, department]);

  const currentClasses = activeDept ? (allClasses[activeDept] || []) : [];

  const filtered = currentClasses.filter((cls) => {
    const q = search.toLowerCase();
    return (
      !q ||
      (cls.display_name || "").toLowerCase().includes(q) ||
      (cls.incharge_name || "").toLowerCase().includes(q) ||
      (cls.room_number || "").toLowerCase().includes(q)
    );
  });

  const byYear = filtered.reduce((acc, cls) => {
    const y = cls.year;
    if (!acc[y]) acc[y] = [];
    acc[y].push(cls);
    return acc;
  }, {});

  const userInitials = user?.name
    ? user.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
    : "U";

  return (
    <div className="cs-screen">
      {/* ── Top bar ── */}
      <header className="cs-topbar">
        <div className="cs-topbar-left">
          <div className="cs-logo-icon">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <rect x="2" y="2" width="7" height="7" rx="2" fill="#3b82f6" />
              <rect x="11" y="2" width="7" height="7" rx="2" fill="#93c5fd" />
              <rect x="2" y="11" width="7" height="7" rx="2" fill="#93c5fd" />
              <rect x="11" y="11" width="7" height="7" rx="2" fill="#3b82f6" />
            </svg>
          </div>
          <div>
            <div className="cs-logo">E-Display</div>
            <div className="cs-logo-sub">Classroom display system</div>
          </div>
        </div>
        <div className="cs-topbar-right">
          <div className="cs-user-pill">
            <div className="cs-avatar">{userInitials}</div>
            <span className="cs-user-name">{user?.name || "User"}</span>
            <span className="cs-user-role">· {user?.role || "Staff"}</span>
          </div>
        </div>
      </header>

      {/* ── Main layout ── */}
      <div className="cs-main">
        {/* Sidebar */}
        <aside className="cs-sidebar">
          <div className="cs-sidebar-label">Departments</div>

          {loading && (
            <div className="cs-sidebar-loading">
              <span className="cs-spinner" />
              Loading…
            </div>
          )}

          {!loading && deptList.map((dept) => (
            <button
              key={dept}
              className={`cs-dept-btn${activeDept === dept ? " active" : ""}`}
              onClick={() => { setActiveDept(dept); setSearch(""); }}
            >
              <span className="cs-dept-dot" />
              <span className="cs-dept-name">{dept}</span>
              <span className="cs-dept-count">{(allClasses[dept] || []).length}</span>
            </button>
          ))}
        </aside>

        {/* Content */}
        <main className="cs-content">
          {error && <div className="cs-error">{error}</div>}

          {!loading && !error && activeDept && (
            <>
              {/* Content header */}
              <div className="cs-content-header">
                <div>
                  <h1 className="cs-dept-title">{activeDept}</h1>
                  <p className="cs-dept-sub">{currentClasses.length} classrooms available</p>
                </div>
                <div className="cs-search">
                  <svg className="cs-search-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
                  </svg>
                  <input
                    className="cs-search-input"
                    type="text"
                    placeholder="Search rooms, incharge…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                  {search && (
                    <button className="cs-search-clear" onClick={() => setSearch("")}>✕</button>
                  )}
                </div>
              </div>

              {/* Year groups */}
              {filtered.length === 0 ? (
                <div className="cs-empty">No classrooms match your search.</div>
              ) : (
                Object.keys(byYear)
                  .sort((a, b) => parseInt(a) - parseInt(b))
                  .map((year) => (
                    <section key={year} className="cs-year-section">
                      <div className="cs-year-label">
                        <span className="cs-year-badge">{YEAR_LABELS[year] || `Year ${year}`}</span>
                        <span className="cs-year-count">{byYear[year].length} rooms</span>
                      </div>
                      <div className="cs-cards-grid">
                        {byYear[year].map((cls) => (
                          <button
                            key={cls.id}
                            className="cs-card"
                            onClick={() => onClassSelected(cls)}
                          >
                            <div className="cs-card-top">
                              <div className="cs-card-icon">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                                  <polyline points="9 22 9 12 15 12 15 22" />
                                </svg>
                              </div>
                              <div className="cs-card-arrow">→</div>
                            </div>
                            <div className="cs-card-name">{cls.display_name}</div>
                            {cls.room_number && (
                              <div className="cs-card-room">Room {cls.room_number}</div>
                            )}
                            {cls.incharge_name && (
                              <div className="cs-card-incharge">{cls.incharge_name}</div>
                            )}
                          </button>
                        ))}
                      </div>
                    </section>
                  ))
              )}
            </>
          )}

          {!loading && !error && !activeDept && (
            <div className="cs-empty">Select a department from the sidebar.</div>
          )}
        </main>
      </div>
    </div>
  );
}
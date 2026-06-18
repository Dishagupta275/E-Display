import React, { useState, useEffect } from "react";
import "./ClassSelect.css";

const API = "https://e-display.onrender.com/api";

export default function ClassSelect({ token, user, department, onClassSelected }) {
  const [classes, setClasses] = useState([]); // flat list for this dept
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
        // data is: { "CSE": { "1": [...], "2": [...] }, "ECE": { ... } }
        // We extract only the classes for the logged-in department
        const deptName = department.name;
        const deptData = data[deptName];

        if (!deptData) {
          setError(`No classes found for department: ${deptName}`);
          setLoading(false);
          return;
        }

        // Flatten all years into a single array, sorted by year then section
        const flat = [];
        Object.keys(deptData)
          .sort((a, b) => parseInt(a) - parseInt(b))
          .forEach((year) => {
            deptData[year].forEach((cls) => flat.push(cls));
          });

        setClasses(flat);
        setLoading(false);
      })
      .catch(() => {
        setError("Failed to load classes. Check network.");
        setLoading(false);
      });
  }, [token, department]);

  // Group by year for display
  const byYear = classes.reduce((acc, cls) => {
    const y = cls.year;
    if (!acc[y]) acc[y] = [];
    acc[y].push(cls);
    return acc;
  }, {});

  const yearLabels = { 1: "1st Year", 2: "2nd Year", 3: "3rd Year", 4: "4th Year" };

  return (
    <div className="class-select-screen">
      {/* Top bar */}
      <div className="cs-topbar">
        <div className="cs-dept-badge">{department.name}</div>
        <div className="cs-title">SELECT CLASSROOM</div>
        <div className="cs-user">{user.name}</div>
      </div>

      <div className="cs-body">
        {loading && (
          <div className="cs-loading">
            <div className="cs-spinner" />
            <span>Loading classrooms…</span>
          </div>
        )}

        {error && <div className="cs-error">{error}</div>}

        {!loading && !error && classes.length === 0 && (
          <div className="cs-empty">No classrooms found for {department.name}.</div>
        )}

        {!loading && !error &&
          Object.keys(byYear)
            .sort((a, b) => parseInt(a) - parseInt(b))
            .map((year) => (
              <div key={year} className="cs-year-group">
                <div className="cs-year-label">{yearLabels[year] || `Year ${year}`}</div>
                <div className="cs-grid">
                  {byYear[year].map((cls) => (
                    <button
                      key={cls.id}
                      className="cs-room-card"
                      onClick={() => onClassSelected(cls)}
                    >
                      <div className="cs-room-name">{cls.display_name}</div>
                      {cls.room_number && (
                        <div className="cs-room-number">Room {cls.room_number}</div>
                      )}
                      {cls.incharge_name && (
                        <div className="cs-room-incharge">{cls.incharge_name}</div>
                      )}
                      <div className="cs-room-arrow">→</div>
                    </button>
                  ))}
                </div>
              </div>
            ))}
      </div>
    </div>
  );
}
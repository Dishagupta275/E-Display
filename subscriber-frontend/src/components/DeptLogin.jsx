import React, { useState, useEffect } from "react";
import "./DeptLogin.css";

const API = "http://localhost:5000/api";

export default function DeptLogin({ onLoginSuccess }) {
  const [departments, setDepartments] = useState([]);
  const [selectedDeptId, setSelectedDeptId] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [deptLoading, setDeptLoading] = useState(true);

  // ── Fetch departments without auth (public endpoint used via temp token trick)
  // The /api/departments endpoint requires JWT, so we first login then fetch,
  // OR we show a manual text input fallback if fetch fails.
  // For setup screen, we attempt a pre-login fetch; if it fails, we show a text input.
  const [deptInputMode, setDeptInputMode] = useState(false); // fallback: type dept name

  useEffect(() => {
    // Try to get departments list — will likely fail without token
    // We handle this gracefully with fallback
    fetch(`${API}/departments`, {
      headers: { "Content-Type": "application/json" },
    })
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setDepartments(data);
        } else {
          setDeptInputMode(true);
        }
        setDeptLoading(false);
      })
      .catch(() => {
        setDeptInputMode(true);
        setDeptLoading(false);
      });
  }, []);

  const handleLogin = async () => {
    setError("");

    if (!email || !password) {
      setError("Enter email and password.");
      return;
    }

    if (!deptInputMode && !selectedDeptId) {
      setError("Select a department.");
      return;
    }

    setLoading(true);

    try {
      // Step 1: Login
      const loginRes = await fetch(`${API}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const loginData = await loginRes.json();

      if (!loginRes.ok) {
        setError(loginData.message || "Login failed.");
        setLoading(false);
        return;
      }

      const { access_token, user } = loginData;

      // Step 2: Validate role
      if (!["hod", "asst_hod", "principal"].includes(user.role)) {
        setError("Only HOD, Asst HOD, or Principal can set up a display.");
        setLoading(false);
        return;
      }

      // Step 3: Get departments with the fresh token to resolve name
      let department = null;

      if (deptInputMode) {
        // user typed the dept name manually — we just pass it
        department = { id: user.department_id, name: selectedDeptId };
      } else {
        const dept = departments.find((d) => d.id === parseInt(selectedDeptId));
        department = dept || { id: user.department_id, name: "Department" };
      }

      // Step 4: Verify the user belongs to this department (principal can pick any)
      if (user.role !== "principal" && user.department_id !== department.id) {
        setError("Your account does not belong to this department.");
        setLoading(false);
        return;
      }

      onLoginSuccess({ token: access_token, user, department });
    } catch (err) {
      setError("Network error. Check backend connection.");
    }

    setLoading(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") handleLogin();
  };

  return (
    <div className="dept-login-screen">
      <div className="login-card">
        {/* Header */}
        <div className="login-header">
          <div className="login-icon">🖥️</div>
          <h1 className="login-title">E-DISPLAY</h1>
          <p className="login-subtitle">Classroom Display Setup</p>
        </div>

        {/* Department */}
        <div className="field-group">
          <label className="field-label">DEPARTMENT</label>

          {deptLoading ? (
            <div className="field-loading">Loading departments…</div>
          ) : deptInputMode ? (
            <input
              className="field-input"
              type="text"
              placeholder="e.g. CSE, ECE, MECH"
              value={selectedDeptId}
              onChange={(e) => setSelectedDeptId(e.target.value)}
              onKeyDown={handleKeyDown}
            />
          ) : (
            <select
              className="field-select"
              value={selectedDeptId}
              onChange={(e) => setSelectedDeptId(e.target.value)}
            >
              <option value="">— Select Department —</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Email */}
        <div className="field-group">
          <label className="field-label">HOD / PRINCIPAL EMAIL</label>
          <input
            className="field-input"
            type="email"
            placeholder="hod@college.edu"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={handleKeyDown}
          />
        </div>

        {/* Password */}
        <div className="field-group">
          <label className="field-label">PASSWORD</label>
          <input
            className="field-input"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={handleKeyDown}
          />
        </div>

        {/* Error */}
        {error && <div className="login-error">{error}</div>}

        {/* Submit */}
        <button
          className="login-btn"
          onClick={handleLogin}
          disabled={loading}
        >
          {loading ? "Verifying…" : "CONTINUE →"}
        </button>
      </div>
    </div>
  );
}
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';

import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import ManageClasses from './pages/ManageClasses';
import ClassSelect from './pages/ClassSelect';
import Notifications from './pages/Notifications';
import Subjects from './pages/Subjects';
import ClassSetup from './pages/ClassSetup';
import CreateTimings from './pages/CreateTimings';
import WeekUpdate from './pages/WeekUpdate';
import DayUpdate from './pages/DayUpdate';
import Departments from './pages/Departments';
import DeviceMonitor from './pages/DeviceMonitor';
import DeviceManager from './pages/DeviceManager';
import Users from './pages/Users';

// ────────────────────────────────────────
// PROTECTED ROUTE WRAPPER
// ─────────────────────────────────────────

const ProtectedRoute = ({ children, roles }) => {
  const { isAuthenticated, currentUser } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (roles && !roles.includes(currentUser?.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

// ─────────────────────────────────────────
// ROUTES
// ─────────────────────────────────────────

const AppRoutes = () => {
  const { isAuthenticated } = useAuth();

  return (
    <Routes>

      {/* ── PUBLIC ───────────────────────────── */}
      <Route
        path="/login"
        element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <Login />}
      />
      <Route
  path="/notices"
  element={
    <ProtectedRoute roles={['principal', 'hod', 'asst_hod']}>
      <Notices />
    </ProtectedRoute>
  }
/>
      {/* ── DEFAULT REDIRECT ─────────────────── */}
      <Route
        path="/"
        element={<Navigate to={isAuthenticated ? '/dashboard' : '/login'} replace />}
      />

      {/* ── DASHBOARD (all roles) ────────────── */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />

      {/* ── TIMETABLE (all roles) ────────────── */}
      <Route
        path="/timetable"
        element={
          <ProtectedRoute>
            <ClassSelect />
          </ProtectedRoute>
        }
      />
      <Route
        path="/timetable/:classId/week"
        element={
          <ProtectedRoute>
            <WeekUpdate />
          </ProtectedRoute>
        }
      />
      <Route
        path="/timetable/:classId/day"
        element={
          <ProtectedRoute>
            <DayUpdate />
          </ProtectedRoute>
        }
      />

      {/* ── CLASS SETUP (all roles can view) ─── */}
      <Route
        path="/class-setup/:classId"
        element={
          <ProtectedRoute>
            <ClassSetup />
          </ProtectedRoute>
        }
      />

      {/* ── CLASSES (hod, asst_hod only) ─────── */}
      <Route
        path="/classes"
        element={
          <ProtectedRoute roles={['hod', 'asst_hod']}>
            <ManageClasses />
          </ProtectedRoute>
        }
      />

      {/* ── SUBJECTS (hod, asst_hod only) ────── */}
      <Route
        path="/subjects"
        element={
          <ProtectedRoute roles={['hod', 'asst_hod']}>
            <Subjects />
          </ProtectedRoute>
        }
      />

      {/* ── NOTIFICATIONS (principal, hod, asst_hod) */}
      <Route
        path="/notifications"
        element={
          <ProtectedRoute roles={['principal', 'hod', 'asst_hod']}>
            <Notifications />
          </ProtectedRoute>
        }
      />

      {/* ── PERIOD TIMINGS (principal only) ──── */}
      <Route
        path="/timings"
        element={
          <ProtectedRoute roles={['principal']}>
            <CreateTimings />
          </ProtectedRoute>
        }
      />

      {/* ── DEPARTMENTS (principal only) ─────── */}
      <Route
        path="/departments"
        element={
          <ProtectedRoute roles={['principal']}>
            <Departments />
          </ProtectedRoute>
        }
      />

      {/* ── DEVICE MONITOR (principal, hod) ──── */}
      <Route
        path="/device-monitor"
        element={
          <ProtectedRoute roles={['principal', 'hod']}>
            <DeviceMonitor />
          </ProtectedRoute>
        }
      />

      {/* ── DEVICE MANAGER (principal only) ─── */}
      <Route
        path="/devices"
        element={
          <ProtectedRoute roles={['principal', 'hod', 'asst_hod']}>
            <DeviceManager />
          </ProtectedRoute>
        }
      />

      {/* ── USER MANAGEMENT (principal only) ─── */}
      <Route
        path="/users"
        element={
          <ProtectedRoute roles={['principal']}>
            <Users />
          </ProtectedRoute>
        }
      />

      {/* ── CATCH ALL ────────────────────────── */}
      <Route path="*" element={<Navigate to="/" replace />} />

    </Routes>
  );
};

// ─────────────────────────────────────────
// APP
// ─────────────────────────────────────────

const App = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;
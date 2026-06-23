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
import Notices from './pages/Notices'; // ✅ make sure this file exists & default export

// ────────────────────────────────────────
// PROTECTED ROUTE WRAPPER
// ────────────────────────────────────────
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

      {/* PUBLIC */}
      <Route
        path="/login"
        element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <Login />}
      />

      {/* NOTICES */}
      <Route
        path="/notices"
        element={
          <ProtectedRoute roles={['principal', 'hod', 'asst_hod']}>
            <Notices />
          </ProtectedRoute>
        }
      />

      {/* DEFAULT */}
      <Route
        path="/"
        element={<Navigate to={isAuthenticated ? '/dashboard' : '/login'} replace />}
      />

      {/* DASHBOARD */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />

      {/* TIMETABLE */}
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

      {/* CLASS SETUP */}
      <Route
        path="/class-setup/:classId"
        element={
          <ProtectedRoute>
            <ClassSetup />
          </ProtectedRoute>
        }
      />

      {/* CLASSES */}
      <Route
        path="/classes"
        element={
          <ProtectedRoute roles={['hod', 'asst_hod']}>
            <ManageClasses />
          </ProtectedRoute>
        }
      />

      {/* SUBJECTS */}
      <Route
        path="/subjects"
        element={
          <ProtectedRoute roles={['hod', 'asst_hod']}>
            <Subjects />
          </ProtectedRoute>
        }
      />

      {/* NOTIFICATIONS */}
      <Route
        path="/notifications"
        element={
          <ProtectedRoute roles={['principal', 'hod', 'asst_hod']}>
            <Notifications />
          </ProtectedRoute>
        }
      />

      {/* TIMINGS */}
      <Route
        path="/timings"
        element={
          <ProtectedRoute roles={['principal']}>
            <CreateTimings />
          </ProtectedRoute>
        }
      />

      {/* DEPARTMENTS */}
      <Route
        path="/departments"
        element={
          <ProtectedRoute roles={['principal']}>
            <Departments />
          </ProtectedRoute>
        }
      />

      {/* DEVICE MONITOR */}
      <Route
        path="/device-monitor"
        element={
          <ProtectedRoute roles={['principal', 'hod']}>
            <DeviceMonitor />
          </ProtectedRoute>
        }
      />

      {/* DEVICE MANAGER */}
      <Route
        path="/devices"
        element={
          <ProtectedRoute roles={['principal', 'hod', 'asst_hod']}>
            <DeviceManager />
          </ProtectedRoute>
        }
      />

      {/* USERS */}
      <Route
        path="/users"
        element={
          <ProtectedRoute roles={['principal']}>
            <Users />
          </ProtectedRoute>
        }
      />

      {/* FALLBACK */}
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
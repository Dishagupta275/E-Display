import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import NoticeBoards from './pages/NoticeBoards';
import NoticeEditor from './pages/NoticeEditor';
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
import Users from './pages/Users';

const ProtectedRoute = ({ children, roles }) => {
  const { isAuthenticated, currentUser } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(currentUser?.role)) return <Navigate to="/dashboard" replace />;
  return children;
};

const AppRoutes = () => {
  const { isAuthenticated } = useAuth();
  return (
    <Routes>
      <Route path="/login" element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <Login />} />
      <Route path="/" element={<Navigate to={isAuthenticated ? '/dashboard' : '/login'} replace />} />

      <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/timetable" element={<ProtectedRoute><ClassSelect /></ProtectedRoute>} />
      <Route path="/timetable/:classId/week" element={<ProtectedRoute><WeekUpdate /></ProtectedRoute>} />
      <Route path="/timetable/:classId/day" element={<ProtectedRoute><DayUpdate /></ProtectedRoute>} />
      <Route path="/class-setup/:classId" element={<ProtectedRoute><ClassSetup /></ProtectedRoute>} />

      <Route path="/classes" element={<ProtectedRoute roles={['hod', 'asst_hod']}><ManageClasses /></ProtectedRoute>} />
      <Route path="/subjects" element={<ProtectedRoute roles={['hod', 'asst_hod']}><Subjects /></ProtectedRoute>} />
      <Route path="/notifications" element={<ProtectedRoute roles={['principal', 'hod', 'asst_hod']}><Notifications /></ProtectedRoute>} />
      <Route path="/timings" element={<ProtectedRoute roles={['principal']}><CreateTimings /></ProtectedRoute>} />
      <Route path="/departments" element={<ProtectedRoute roles={['principal']}><Departments /></ProtectedRoute>} />
      <Route path="/devices" element={<ProtectedRoute roles={['principal', 'hod']}><DeviceMonitor /></ProtectedRoute>} />
      <Route path="/users" element={<ProtectedRoute roles={['principal']}><Users /></ProtectedRoute>} />
      
      {/* ── NOTICE BOARDS ─────────────────────── */}
      <Route path="/notice-boards" element={<ProtectedRoute roles={['principal', 'hod', 'asst_hod']}><NoticeBoards /></ProtectedRoute>} />
      <Route path="/notice-boards/:boardId" element={<ProtectedRoute roles={['principal', 'hod', 'asst_hod']}><NoticeEditor /></ProtectedRoute>} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

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
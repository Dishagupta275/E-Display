import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || "https://e-dispy.onrender.com/";

// Create axios instance
const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
});

// Request interceptor - add token automatically
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor - handle 401
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.clear();
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// ─── AUTH ───────────────────────────────
export const authAPI = {
  login:    (email, password) => api.post('/api/auth/login', { email, password }),
  me:       ()                => api.get('/api/auth/me'),
  getUsers: ()                => api.get('/api/auth/users'),
  register: (data)            => api.post('/api/auth/register', data),
};

// ─── DEPARTMENTS ────────────────────────
export const departmentsAPI = {
  getAll: ()    => api.get('/api/departments'),
  create: (data) => api.post('/api/departments', data),
  delete: (id)  => api.delete(`/api/departments/${id}`),
};

// ─── USERS ──────────────────────────────
export const usersAPI = {
  getAll:  ()          => api.get('/api/auth/users'),
  create:  (data)      => api.post('/api/auth/users', data),
  update:  (id, data)  => api.put(`/api/auth/users/${id}`, data), 
  delete:  (id)        => api.delete(`/api/auth/users/${id}`),
  getFaculty: ()         => api.get('/api/auth/faculty'), 
};
// ─── CLASSES ────────────────────────────
export const classesAPI = {
  getAll:     ()         => api.get('/api/classes'),
  create:     (data)     => api.post('/api/classes', data),
  update:     (id, data) => api.put(`/api/classes/${id}`, data),
  delete:     (id)       => api.delete(`/api/classes/${id}`),
  getFaculty: (id)       => api.get(`/api/classes/${id}/faculty`),
};

// ─── SUBJECTS ───────────────────────────
export const subjectsAPI = {
  getByDept: (deptId, year) => api.get(`/api/subjects/${deptId}/${year}`),
  create:    (data)         => api.post('/api/subjects', data),
};

// ─── TIMETABLE ──────────────────────────────────────────
export const timetableAPI = {
  get:              (classId)        => api.get(`/api/timetable/${classId}`),
  save:             (classId, slots) => api.post(`/api/timetable/${classId}`, slots), // ✅ pass array directly
  publish:          (classId)        => api.post(`/api/timetable/${classId}/publish`),
  getCurrentPeriod: (classId)        => api.get(`/api/timetable/${classId}/current-period`),
  getTimings:       ()               => api.get('/api/period-timings'),
};

// ─── NOTIFICATIONS ──────────────────────
export const notificationsAPI = {
  send:      (data)    => api.post('/api/notifications', data),
  getActive: (classId) => api.get(`/api/notifications/active/${classId}`),
  delete:    (id)      => api.delete(`/api/notifications/${id}`),
};

// ─── ANNOUNCEMENTS ──────────────────────
export const announcementsAPI = {
  getAll:    ()      => api.get('/api/announcements'),
  getByDept: (deptId) => api.get(`/api/announcements/${deptId}`),
  create:    (data)  => api.post('/api/announcements', data),
  delete:    (id)    => api.delete(`/api/announcements/${id}`),
};

// ─── NOTICE BOARDS ──────────────────────
export const noticeBoardsAPI = {
  getAll: () => api.get('/api/notice-boards'),
};

// ─── DEVICES ────────────────────────────
export const devicesAPI = {
  getStatus: ()                       => api.get('/api/devices'),
  assign:    (deviceId, data)         => api.put(`/api/devices/${deviceId}/assign`, data),
  unassign:  (deviceId)               => api.put(`/api/devices/${deviceId}/unassign`),
  remove:    (deviceId)               => api.delete(`/api/devices/${deviceId}`),
};

// ─── LEGACY ALIASES ─────────────────────
export const getClasses        = ()            => classesAPI.getAll();
export const getTimetable      = (classId)     => timetableAPI.get(classId);
export const getDepartments    = ()            => departmentsAPI.getAll();
export const deleteDepartment  = (id)          => departmentsAPI.delete(id);
export const getNotifications  = (classId)     => notificationsAPI.getActive(classId);
export const sendNotification  = (data)        => notificationsAPI.send(data);
export const getAnnouncements  = ()            => announcementsAPI.getAll();
export const createClass       = (data)        => classesAPI.create(data);
export const updateClass       = (id, data)    => classesAPI.update(id, data);
export const deleteClass       = (id)          => classesAPI.delete(id);
export const saveTimetable     = (classId, slots) => timetableAPI.save(classId, slots);
export const publishTimetable  = (classId)     => timetableAPI.publish(classId);
export const getSubjects       = (deptId, year) => subjectsAPI.getByDept(deptId, year);
export const getDeviceStatus   = ()            => devicesAPI.getStatus();

export default api;

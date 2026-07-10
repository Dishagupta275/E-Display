import { createContext, useContext, useState, useEffect } from 'react';
import { authAPI } from '../utils/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');
    if (token && user) {
      setCurrentUser(JSON.parse(user));
      setIsAuthenticated(true);
    }
    setLoading(false);
  }, []);

  const login = async (email, password) => {
    try {
      const response = await authAPI.login(email, password);
      const { access_token, user } = response.data;

      localStorage.setItem('token', access_token);
      localStorage.setItem('user', JSON.stringify(user));

      setCurrentUser(user);
      setIsAuthenticated(true);

      return { success: true, user };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || 'Login failed',
      };
    }
  };

  const logout = () => {
    localStorage.clear();
    setCurrentUser(null);
    setIsAuthenticated(false);
    window.location.href = '/login';
  };

  // Kept for anywhere still checking a specific role name directly
  // (e.g. "Faculty", "HOD") — role names are now dynamic, so this compares
  // against whatever string the backend returns in currentUser.role.
  const hasRole = (...roles) => {
    return currentUser && roles.includes(currentUser.role);
  };

  // Primary access-control check going forward. currentUser.permissions
  // is a flat array of permission codes returned by /login and /me,
  // e.g. ["manage_users", "create_class", ...].
  const hasPermission = (code) => {
    if (!currentUser) return false;
    return (currentUser.permissions || []).includes(code);
  };

  // True if the user has ANY of the given permission codes — useful for
  // nav items / sections that should show if the user can do at least one
  // of several related things.
  const hasAnyPermission = (...codes) => {
    if (!currentUser) return false;
    const perms = currentUser.permissions || [];
    return codes.some((c) => perms.includes(c));
  };

  // Refresh currentUser from the backend — call after role/permission
  // changes so the UI reflects them without a full re-login.
  const refreshUser = async () => {
    try {
      const response = await authAPI.me();
      localStorage.setItem('user', JSON.stringify(response.data));
      setCurrentUser(response.data);
      return response.data;
    } catch (error) {
      return null;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        isAuthenticated,
        loading,
        login,
        logout,
        hasRole,
        hasPermission,
        hasAnyPermission,
        refreshUser,
      }}
    >
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};

export default AuthContext;
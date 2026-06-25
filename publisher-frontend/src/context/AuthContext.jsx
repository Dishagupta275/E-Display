import { createContext, useContext, useState, useEffect } from 'react';
import { authAPI } from '../utils/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if token exists on app load
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

      // Save to localStorage
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

  const hasRole = (...roles) => {
    return currentUser && roles.includes(currentUser.role);
  };

  return (
    <AuthContext.Provider
      value={{ currentUser, isAuthenticated, loading, login, logout, hasRole }}
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
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const result = await login(email, password);
    if (result.success) {
      const role = result.user.role;
      if (['principal', 'hod', 'asst_hod'].includes(role)) {
        navigate('/dashboard');
      } else {
        navigate('/faculty');
      }
    } else {
      setError(result.message);
    }
    setLoading(false);
  };

  return (
    <div style={styles.container}>

      {/* ── LEFT PANEL ── */}
      <div style={styles.leftPanel}>
        {/* Logo */}
        <div style={styles.logoRow}>
          <div style={styles.logoBox}>E</div>
          <span style={styles.logoText}>E-Display</span>
        </div>

        <h1 style={styles.heading}>Log in to your Account</h1>
        <p style={styles.subheading}>Welcome back! Enter your credentials to continue.</p>

        {/* Form */}
        <form onSubmit={handleSubmit} style={styles.form}>
          {error && <div style={styles.error}>{error}</div>}

          <div style={styles.inputGroup}>
            <label style={styles.label}>Email</label>
            <div style={styles.inputWrapper}>
              <span style={styles.inputIcon}>✉</span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                required
                style={styles.input}
              />
            </div>
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}>Password</label>
            <div style={styles.inputWrapper}>
              <span style={styles.inputIcon}>🔒</span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
                style={styles.input}
              />
            </div>
          </div>

          <div style={styles.rememberRow}>
            <label style={styles.rememberLabel}>
              <input type="checkbox" style={{ marginRight: 6 }} />
              Remember me
            </label>
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              ...styles.button,
              opacity: loading ? 0.7 : 1,
              cursor: loading ? 'not-allowed' : 'pointer',
            }}
          >
            {loading ? 'Signing in...' : 'Log In'}
          </button>
        </form>

        <p style={styles.footer}>E-Display v1.0 · Sphoorthy Engineering College</p>
      </div>

      {/* ── RIGHT PANEL ── */}
      <div style={styles.rightPanel}>
        
      
        {/* Decorative circles */}
        <div style={styles.bigCircle}>
          <div style={styles.midCircle}>
            <div style={styles.smallCircle}>
              <span style={styles.centerIcon}>E</span>
            </div>
          </div>
        </div>

        {/* Floating feature cards */}
        <div style={{ ...styles.floatCard, top: '18%', right: '12%' }}>
          <span style={styles.floatIcon}>📢</span>
          <span style={styles.floatText}>Live Notifications</span>
        </div>
        <div style={{ ...styles.floatCard, top: '42%', left: '6%' }}>
          <span style={styles.floatIcon}>E</span>
          <span style={styles.floatText}>Timetable Management</span>
        </div>
        <div style={{ ...styles.floatCard, bottom: '28%', right: '10%' }}>
          <span style={styles.floatIcon}>🏫</span>
          <span style={styles.floatText}>Class Monitoring</span>
        </div>
        <div style={{ ...styles.floatCard, bottom: '14%', left: '10%' }}>
          <span style={styles.floatIcon}>📡</span>
          <span style={styles.floatText}>Live Sync</span>
        </div>

        {/* Bottom text */}
        <div style={styles.rightBottom}>
          <h2 style={styles.rightTitle}>Smart Classroom Display</h2>
          <p style={styles.rightSubtitle}>
            Manage timetables, notifications and classroom displays in real time.
          </p>

          {/* Dots */}
          <div style={styles.dots}>
            <div style={{ ...styles.dot, background: '#fff' }} />
            <div style={{ ...styles.dot, background: 'rgba(255,255,255,0.4)' }} />
            <div style={{ ...styles.dot, background: 'rgba(255,255,255,0.4)' }} />
          </div>
        </div>
      </div>

    </div>
  );
};

const styles = {
  container: {
    display: 'flex',
    minHeight: '100vh',
    fontFamily: "'Segoe UI', sans-serif",
  },

  // ── LEFT ──
  leftPanel: {
    width: '45%',
    padding: '48px 56px',
    background: '#ffffff',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
  },
  logoRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    marginBottom: 36,
  },
  logoBox: {
    width: 36,
    height: 36,
    borderRadius: 8,
    background: 'linear-gradient(135deg, #1a237e, #1565c0)',
    color: '#fff',
    fontSize: 18,
    fontWeight: 800,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: {
    fontSize: 18,
    fontWeight: 700,
    color: '#1a237e',
    letterSpacing: 1,
  },
  heading: {
    fontSize: 28,
    fontWeight: 800,
    color: '#111827',
    margin: '0 0 8px',
    lineHeight: 1.3,
  },
  subheading: {
    fontSize: 14,
    color: '#6b7280',
    margin: '0 0 32px',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: 20,
  },
  error: {
    background: '#fef2f2',
    color: '#dc2626',
    padding: '12px 16px',
    borderRadius: 8,
    fontSize: 13,
    border: '1px solid #fecaca',
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: 600,
    color: '#374151',
  },
  inputWrapper: {
    display: 'flex',
    alignItems: 'center',
    border: '1.5px solid #e5e7eb',
    borderRadius: 8,
    padding: '0 14px',
    background: '#f9fafb',
  },
  inputIcon: {
    fontSize: 16,
    marginRight: 10,
    opacity: 0.5,
  },
  input: {
    flex: 1,
    border: 'none',
    background: 'transparent',
    padding: '12px 0',
    fontSize: 14,
    outline: 'none',
    color: '#111827',
  },
  rememberRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rememberLabel: {
    fontSize: 13,
    color: '#6b7280',
    display: 'flex',
    alignItems: 'center',
    cursor: 'pointer',
  },
  button: {
    padding: '13px',
    background: 'linear-gradient(135deg, #1a237e, #1565c0)',
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    fontSize: 15,
    fontWeight: 700,
    letterSpacing: 0.5,
    transition: 'opacity 0.2s',
  },
  footer: {
    textAlign: 'center',
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 32,
  },

  // ── RIGHT ──
  rightPanel: {
    flex: 1,
    background: 'linear-gradient(135deg, #1a237e 0%, #1565c0 60%, #0288d1 100%)',
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  bigCircle: {
    width: 320,
    height: 320,
    borderRadius: '50%',
    background: 'rgba(255,255,255,0.08)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: '1px solid rgba(255,255,255,0.15)',
  },
  midCircle: {
    width: 220,
    height: 220,
    borderRadius: '50%',
    background: 'rgba(255,255,255,0.1)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: '1px solid rgba(255,255,255,0.2)',
  },
  smallCircle: {
    width: 120,
    height: 120,
    borderRadius: '50%',
    background: 'rgba(255,255,255,0.15)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: '1px solid rgba(255,255,255,0.3)',
  },
  centerIcon: {
    fontSize: 48,
  },
  floatCard: {
    position: 'absolute',
    background: 'rgba(255,255,255,0.15)',
    backdropFilter: 'blur(10px)',
    border: '1px solid rgba(255,255,255,0.25)',
    borderRadius: 12,
    padding: '10px 16px',
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    color: '#fff',
    fontSize: 13,
    fontWeight: 600,
    boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
  },
  floatIcon: {
    fontSize: 20,
  },
  floatText: {
    whiteSpace: 'nowrap',
  },
  rightBottom: {
    position: 'absolute',
    bottom: 48,
    left: 0,
    right: 0,
    textAlign: 'center',
    padding: '0 40px',
  },
  rightTitle: {
    color: '#fff',
    fontSize: 22,
    fontWeight: 700,
    margin: '0 0 8px',
  },
  rightSubtitle: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 13,
    lineHeight: 1.6,
    margin: 0,
  },
  dots: {
    display: 'flex',
    justifyContent: 'center',
    gap: 6,
    marginTop: 16,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: '50%',
  },
};

export default Login;
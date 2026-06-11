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
      <div style={styles.card}>
        {/* Logo / Header */}
        <div style={styles.header}>
          <div style={styles.logoCircle}>E</div>
          <h1 style={styles.title}>Sphoorthy Engineering College</h1>
          <p style={styles.subtitle}>Smart Classroom Information System</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={styles.form}>
          {error && <div style={styles.error}>{error}</div>}

          <div style={styles.inputGroup}>
            <label style={styles.label}>Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              required
              style={styles.input}
            />
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
              style={styles.input}
            />
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
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <p style={styles.footer}>
          · E-Display v1.0
        </p>
      </div>
    </div>
  );
};

const styles = {
  container: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #1a237e 0%, #0d47a1 50%, #01579b 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px',
  },
  card: {
    background: '#ffffff',
    borderRadius: '16px',
    padding: '40px',
    width: '100%',
    maxWidth: '420px',
    boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
  },
  header: {
    textAlign: 'center',
    marginBottom: '32px',
  },
  logoCircle: {
    width: '64px',
    height: '64px',
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #1a237e, #0d47a1)',
    color: '#fff',
    fontSize: '28px',
    fontWeight: 'bold',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 16px',
  },
  title: {
    fontSize: '28px',
    fontWeight: '800',
    color: '#1a237e',
    margin: '0 0 8px',
    letterSpacing: '2px',
  },
  subtitle: {
    fontSize: '13px',
    color: '#666',
    margin: 0,
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  error: {
    background: '#ffebee',
    color: '#c62828',
    padding: '12px 16px',
    borderRadius: '8px',
    fontSize: '14px',
    border: '1px solid #ffcdd2',
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  label: {
    fontSize: '13px',
    fontWeight: '600',
    color: '#444',
  },
  input: {
    padding: '12px 16px',
    borderRadius: '8px',
    border: '1.5px solid #e0e0e0',
    fontSize: '15px',
    outline: 'none',
    transition: 'border-color 0.2s',
  },
  button: {
    padding: '14px',
    background: 'linear-gradient(135deg, #1a237e, #0d47a1)',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: '600',
    marginTop: '8px',
    transition: 'opacity 0.2s',
  },
  footer: {
    textAlign: 'center',
    fontSize: '12px',
    color: '#999',
    marginTop: '24px',
    marginBottom: 0,
  },
};

export default Login;
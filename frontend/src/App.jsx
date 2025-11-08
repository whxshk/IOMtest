import React, { useState, useEffect, createContext, useContext } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import './i18n';
import { authAPI } from './services/api';

// Context for authentication
export const AuthContext = createContext(null);

// Auth Provider Component
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is logged in
    const token = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');

    if (token && savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch (e) {
        console.error('Error parsing user data:', e);
      }
    }
    setLoading(false);
  }, []);

  const login = async (email, password) => {
    const response = await authAPI.login(email, password);
    const { user, token, refreshToken } = response.data;

    localStorage.setItem('token', token);
    localStorage.setItem('refreshToken', refreshToken);
    localStorage.setItem('user', JSON.stringify(user));
    setUser(user);

    return user;
  };

  const logout = async () => {
    try {
      await authAPI.logout();
    } catch (error) {
      console.error('Logout error:', error);
    }

    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    setUser(null);
  };

  const register = async (userData) => {
    const response = await authAPI.register(userData);
    const { user, token, refreshToken } = response.data;

    localStorage.setItem('token', token);
    localStorage.setItem('refreshToken', refreshToken);
    localStorage.setItem('user', JSON.stringify(user));
    setUser(user);

    return user;
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, register, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

// Hook to use auth context
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}

// Protected Route Component
function ProtectedRoute({ children, allowedRoles = [] }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/login" />;
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    return <Navigate to="/" />;
  }

  return children;
}

// Simple Login Component
function LoginPage() {
  const { t } = useTranslation();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email, password);
      window.location.href = '/dashboard';
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-container">
        <h1>{t('appTitle')}</h1>
        <form onSubmit={handleSubmit} className="login-form">
          <h2>{t('login')}</h2>

          {error && <div className="error-message">{error}</div>}

          <div className="form-group">
            <label>{t('email')}</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>

          <div className="form-group">
            <label>{t('password')}</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </div>

          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? t('messages.loading') : t('login')}
          </button>

          <p className="register-link">
            Don't have an account? <Link to="/register">{t('register')}</Link>
          </p>
        </form>
      </div>
    </div>
  );
}

// Simple Dashboard Component
function Dashboard() {
  const { t } = useTranslation();
  const { user } = useAuth();

  return (
    <div className="dashboard">
      <h1>{t('dashboard')}</h1>
      <p>{t('welcomeMessage', { name: user?.name })}</p>

      <div className="dashboard-grid">
        {user?.role === 'citizen' && (
          <div className="dashboard-card">
            <h3>{t('submitRequest')}</h3>
            <Link to="/cases/new" className="btn-primary">
              {t('submitRequest')}
            </Link>
          </div>
        )}

        <div className="dashboard-card">
          <h3>{t('myCases')}</h3>
          <Link to="/cases" className="btn-secondary">
            {t('caseStatus')}
          </Link>
        </div>

        {user?.role === 'admin' && (
          <div className="dashboard-card">
            <h3>Admin Panel</h3>
            <Link to="/admin" className="btn-secondary">
              View Metrics
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

// Navigation Component
function Navigation() {
  const { t, i18n } = useTranslation();
  const { user, logout } = useAuth();

  const changeLanguage = (lng) => {
    i18n.changeLanguage(lng);
  };

  if (!user) return null;

  return (
    <nav className="main-nav">
      <div className="nav-brand">
        <Link to="/">{t('appTitle')}</Link>
      </div>

      <div className="nav-links">
        <Link to="/dashboard">{t('dashboard')}</Link>
        <Link to="/cases">{t('myCases')}</Link>

        <div className="language-selector">
          <select
            value={i18n.language}
            onChange={(e) => changeLanguage(e.target.value)}
            aria-label="Select language"
          >
            <option value="en">English</option>
            <option value="fr">Français</option>
            <option value="hi">हिन्दी</option>
            <option value="es">Español</option>
            <option value="ar">العربية</option>
          </select>
        </div>

        <button onClick={logout} className="btn-logout">
          {t('logout')}
        </button>
      </div>
    </nav>
  );
}

// Main App Component
function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="app">
          <Navigation />

          <main className="main-content">
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<div>Register Page (To be implemented)</div>} />

              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <Dashboard />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/cases"
                element={
                  <ProtectedRoute>
                    <div>Cases List (To be implemented)</div>
                  </ProtectedRoute>
                }
              />

              <Route
                path="/cases/new"
                element={
                  <ProtectedRoute allowedRoles={['citizen']}>
                    <div>New Case Form (To be implemented)</div>
                  </ProtectedRoute>
                }
              />

              <Route
                path="/admin"
                element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <div>Admin Panel (To be implemented)</div>
                  </ProtectedRoute>
                }
              />

              <Route path="/" element={<Navigate to="/dashboard" />} />
            </Routes>
          </main>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;

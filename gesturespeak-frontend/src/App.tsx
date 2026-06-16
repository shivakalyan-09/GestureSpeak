import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme, CssBaseline } from '@mui/material';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout';

// Pages
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import Dashboard from './pages/Dashboard';
import SignDetection from './pages/SignDetection';
import TextToSpeech from './pages/TextToSpeech';
import LiveTranslate from './pages/LiveTranslate';
import Learning from './pages/Learning';
import Emergency from './pages/Emergency';
import History from './pages/History';
import Settings from './pages/Settings';
import AdminPanel from './pages/AdminPanel';

function ProtectedRoute({ children, roleRequired }: { children: React.ReactNode; roleRequired?: string }) {
  const { user, loading } = useAuth();

  if (loading) return null; // Wait until Auth listener initializes
  if (!user) return <Navigate to="/login" replace />;

  if (roleRequired && user.role !== roleRequired) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}

function AppContent({ theme, toggleTheme }: { theme: 'light' | 'dark'; toggleTheme: () => void }) {
  const { user, logout } = useAuth();

  return (
    <Layout theme={theme} toggleTheme={toggleTheme} user={user} onLogout={logout}>
      <Routes>
        {/* Auth routes */}
        <Route path="/login" element={!user ? <Login /> : <Navigate to="/dashboard" />} />
        <Route path="/register" element={!user ? <Register /> : <Navigate to="/dashboard" />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />

        {/* Dashboard/Feature routes */}
        <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/sign-detection" element={<ProtectedRoute><SignDetection /></ProtectedRoute>} />
        <Route path="/text-to-speech" element={<ProtectedRoute><TextToSpeech /></ProtectedRoute>} />
        <Route path="/live-translate" element={<ProtectedRoute><LiveTranslate /></ProtectedRoute>} />
        <Route path="/learning" element={<ProtectedRoute><Learning /></ProtectedRoute>} />
        <Route path="/emergency" element={<ProtectedRoute><Emergency /></ProtectedRoute>} />
        <Route path="/history" element={<ProtectedRoute><History /></ProtectedRoute>} />
        
        {/* Settings needs theme parameters to toggle directly */}
        <Route path="/settings" element={
          <ProtectedRoute>
            <Settings theme={theme} toggleTheme={toggleTheme} />
          </ProtectedRoute>
        } />
        
        {/* Admin panel */}
        <Route path="/admin" element={
          <ProtectedRoute roleRequired="ADMIN">
            <AdminPanel />
          </ProtectedRoute>
        } />

        {/* Redirects */}
        <Route path="/" element={<Navigate to={user ? "/dashboard" : "/login"} replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  );
}

export default function App() {
  const [themeMode, setThemeMode] = useState<'light' | 'dark'>(() => {
    return (localStorage.getItem('app_theme') as 'light' | 'dark') || 'dark';
  });

  const toggleTheme = () => {
    setThemeMode((prev) => {
      const next = prev === 'dark' ? 'light' : 'dark';
      localStorage.setItem('app_theme', next);
      return next;
    });
  };

  useEffect(() => {
    // Sync theme with document class list & dataset for index.css tokens
    document.documentElement.setAttribute('data-theme', themeMode);
  }, [themeMode]);

  // Create responsive Material UI theme config
  const muiTheme = createTheme({
    palette: {
      mode: themeMode,
      primary: {
        main: '#4facfe',
      },
      secondary: {
        main: '#ec38bc',
      },
      background: {
        default: themeMode === 'dark' ? '#030712' : '#f1f5f9',
        paper: themeMode === 'dark' ? '#0f172a' : '#ffffff',
      },
      text: {
        primary: themeMode === 'dark' ? '#f8fafc' : '#0f172a',
        secondary: themeMode === 'dark' ? '#94a3b8' : '#475569',
      },
    },
    typography: {
      fontFamily: "'Inter', 'Outfit', system-ui, sans-serif",
      h4: {
        fontFamily: "'Outfit', sans-serif",
      },
      h5: {
        fontFamily: "'Outfit', sans-serif",
      },
      h6: {
        fontFamily: "'Outfit', sans-serif",
      },
    },
    components: {
      MuiCard: {
        styleOverrides: {
          root: {
            borderRadius: '24px',
            border: '1px solid var(--border-glass)',
            backgroundColor: 'var(--bg-card)',
            backgroundImage: 'none',
          },
        },
      },
      MuiButton: {
        styleOverrides: {
          root: {
            borderRadius: '12px',
            textTransform: 'none',
            fontWeight: 700,
          },
        },
      },
    },
  });

  return (
    <ThemeProvider theme={muiTheme}>
      <CssBaseline />
      <Router>
        <AuthProvider>
          <AppContent theme={themeMode} toggleTheme={toggleTheme} />
        </AuthProvider>
      </Router>
    </ThemeProvider>
  );
}

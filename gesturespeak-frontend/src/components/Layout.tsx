import React, { useState } from 'react';
import { Box, IconButton, Toolbar, AppBar, Typography, Button } from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import Sidebar from './Sidebar';
import { useLocation, useNavigate } from 'react-router-dom';
import SmsFailedIcon from '@mui/icons-material/SmsFailed';

interface LayoutProps {
  children: React.ReactNode;
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  user: any;
  onLogout: () => void;
}

export default function Layout({
  children,
  theme,
  toggleTheme,
  user,
  onLogout,
}: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const location = useLocation();
  const navigate = useNavigate();

  const handleToggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const getPageTitle = () => {
    switch (location.pathname) {
      case '/dashboard':
        return 'Control Panel';
      case '/sign-detection':
        return 'Real-time Sign Recognition';
      case '/text-to-speech':
        return 'Speech Synthesis (TTS)';
      case '/live-translate':
        return 'Translation Terminal';
      case '/learning':
        return 'Vocabulary Learning Hub';
      case '/emergency':
        return 'SOS Emergency Control';
      case '/history':
        return 'Prediction Log Archives';
      case '/settings':
        return 'System Preferences';
      case '/admin':
        return 'Administrator Analytics';
      default:
        return 'GestureSpeak';
    }
  };

  // Hide header and sidebar on login, registration, and forgot-password pages
  const isAuthPage = ['/', '/login', '/register', '/forgot-password'].includes(location.pathname);

  if (isAuthPage) {
    return <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>{children}</Box>;
  }

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', backgroundColor: 'var(--bg-app)' }}>
      {/* Sidebar drawer */}
      <Sidebar
        theme={theme}
        toggleTheme={toggleTheme}
        user={user}
        onLogout={onLogout}
        open={sidebarOpen}
        onToggleOpen={handleToggleSidebar}
      />

      {/* Main Content Area */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          display: 'flex',
          flexDirection: 'column',
          minHeight: '100vh',
          width: `calc(100% - ${sidebarOpen ? 260 : 70}px)`,
          transition: 'width 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      >
        {/* Top Header */}
        <AppBar
          position="static"
          elevation={0}
          sx={{
            backgroundColor: 'transparent',
            borderBottom: '1px solid var(--border-glass)',
            backdropFilter: 'blur(8px)',
          }}
        >
          <Toolbar sx={{ justifyContent: 'space-between', px: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <IconButton
                color="inherit"
                aria-label="open drawer"
                edge="start"
                onClick={handleToggleSidebar}
                sx={{ mr: 2, color: 'var(--text-main)' }}
              >
                <MenuIcon />
              </IconButton>
              <Typography
                variant="h5"
                noWrap
                component="div"
                sx={{
                  fontWeight: 900,
                  fontFamily: 'var(--font-title)',
                  color: 'var(--text-main)',
                  letterSpacing: -0.5,
                }}
              >
                {getPageTitle()}
              </Typography>
            </Box>

            {/* Quick SOS Trigger button on AppBar */}
            <Button
              variant="contained"
              color="error"
              startIcon={<SmsFailedIcon />}
              onClick={() => navigate('/emergency')}
              sx={{
                fontWeight: 700,
                borderRadius: '12px',
                px: 2,
                boxShadow: '0 4px 12px 0 rgba(239, 68, 68, 0.25)',
                '&:hover': {
                  backgroundColor: 'error.dark',
                },
              }}
            >
              SOS TRIGGER
            </Button>
          </Toolbar>
        </AppBar>

        {/* Dynamic page content wrapped in transition container */}
        <Box
          sx={{
            flexGrow: 1,
            p: 4,
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {children}
        </Box>
      </Box>
    </Box>
  );
}

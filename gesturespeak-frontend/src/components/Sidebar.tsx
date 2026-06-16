import { useNavigate, useLocation } from 'react-router-dom';
import {
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
  Box,
  Divider,
  Avatar,
  Tooltip,
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  CameraAlt as CameraIcon,
  RecordVoiceOver as TtsIcon,
  Translate as TranslateIcon,
  School as LearningIcon,
  SmsFailed as EmergencyIcon,
  History as HistoryIcon,
  Settings as SettingsIcon,
  SupervisorAccount as AdminIcon,
  ExitToApp as LogoutIcon,
  LightMode as LightIcon,
  DarkMode as DarkIcon,
} from '@mui/icons-material';

interface SidebarProps {
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  user: any;
  onLogout: () => void;
  open: boolean;
  onToggleOpen: () => void;
}

export default function Sidebar({
  theme,
  toggleTheme,
  user,
  onLogout,
  open,
  onToggleOpen,
}: SidebarProps) {
  const navigate = useNavigate();
  const location = useLocation();

  const menuItems = [
    { text: 'Dashboard', icon: <DashboardIcon />, path: '/dashboard' },
    { text: 'Sign to Text', icon: <CameraIcon />, path: '/sign-detection' },
    { text: 'Text to Speech', icon: <TtsIcon />, path: '/text-to-speech' },
    { text: 'Live Translate', icon: <TranslateIcon />, path: '/live-translate' },
    { text: 'Learning', icon: <LearningIcon />, path: '/learning' },
    { text: 'Emergency SOS', icon: <EmergencyIcon />, path: '/emergency' },
    { text: 'History Log', icon: <HistoryIcon />, path: '/history' },
    { text: 'Settings', icon: <SettingsIcon />, path: '/settings' },
  ];

  // Show Admin Panel if user is admin or using mock-admin-token
  const isAdmin = user?.email === 'admin@gesturespeak.com' || user?.role === 'ADMIN';

  if (isAdmin) {
    menuItems.push({ text: 'Admin Panel', icon: <AdminIcon />, path: '/admin' });
  }

  return (
    <Drawer
      variant="permanent"
      sx={{
        width: open ? 260 : 70,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: open ? 260 : 70,
          boxSizing: 'border-box',
          backgroundColor: 'var(--bg-sidebar)',
          borderRight: '1px solid var(--border-glass)',
          transition: 'width 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
          overflowX: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
        },
      }}
    >
      <Box>
        {/* Brand Header */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            p: 2,
            minHeight: 64,
            cursor: 'pointer',
          }}
          onClick={onToggleOpen}
        >
          <Avatar
            src="/logo.png"
            sx={{
              backgroundColor: 'primary.main',
              mr: open ? 2 : 0,
              width: 36,
              height: 36,
              transition: 'margin 0.2s',
            }}
          >
            GS
          </Avatar>
          {open && (
            <Typography variant="h6" sx={{ fontWeight: 900, letterSpacing: 1, color: 'var(--text-main)' }}>
              GestureSpeak
            </Typography>
          )}
        </Box>
        <Divider sx={{ borderColor: 'var(--border-glass)' }} />

        {/* Menu Items */}
        <List sx={{ px: 1 }}>
          {menuItems.map((item) => {
            const isSelected = location.pathname === item.path;
            return (
              <ListItem key={item.text} disablePadding sx={{ display: 'block', mb: 0.5 }}>
                <Tooltip title={!open ? item.text : ''} placement="right">
                  <ListItemButton
                    onClick={() => navigate(item.path)}
                    sx={{
                      minHeight: 48,
                      justifyContent: open ? 'initial' : 'center',
                      px: 2.5,
                      borderRadius: '12px',
                      backgroundColor: isSelected ? 'action.selected' : 'transparent',
                      '&:hover': {
                        backgroundColor: 'action.hover',
                      },
                    }}
                  >
                    <ListItemIcon
                      sx={{
                        minWidth: 0,
                        mr: open ? 3 : 'auto',
                        justifyContent: 'center',
                        color: isSelected ? 'primary.main' : 'var(--text-sub)',
                      }}
                    >
                      {item.icon}
                    </ListItemIcon>
                    {open && (
                      <ListItemText
                        primary={item.text}
                        sx={{
                          color: isSelected ? 'var(--text-main)' : 'var(--text-sub)',
                          '& .MuiTypography-root': {
                            fontWeight: isSelected ? 700 : 500,
                            fontSize: '0.95rem',
                          },
                        }}
                      />
                    )}
                  </ListItemButton>
                </Tooltip>
              </ListItem>
            );
          })}
        </List>
      </Box>

      {/* Footer Profile / Actions */}
      <Box sx={{ p: 1 }}>
        <Divider sx={{ borderColor: 'var(--border-glass)', mb: 1 }} />
        
        {/* Dark/Light mode toggle */}
        <Tooltip title={theme === 'dark' ? 'Light Mode' : 'Dark Mode'} placement="right">
          <ListItemButton
            onClick={toggleTheme}
            sx={{
              minHeight: 48,
              justifyContent: open ? 'initial' : 'center',
              px: 2.5,
              borderRadius: '12px',
              mb: 0.5,
            }}
          >
            <ListItemIcon
              sx={{
                minWidth: 0,
                mr: open ? 3 : 'auto',
                justifyContent: 'center',
                color: 'var(--text-sub)',
              }}
            >
              {theme === 'dark' ? <LightIcon /> : <DarkIcon />}
            </ListItemIcon>
            {open && (
              <ListItemText
                primary={theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
                sx={{ color: 'var(--text-sub)' }}
              />
            )}
          </ListItemButton>
        </Tooltip>

        {/* User Card */}
        {user && (
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              p: open ? 1.5 : 0.5,
              mb: 1,
              borderRadius: '16px',
              backgroundColor: 'action.hover',
              transition: 'padding 0.2s',
            }}
          >
            <Avatar
              sx={{
                width: 32,
                height: 32,
                fontSize: '0.85rem',
                backgroundColor: 'secondary.main',
                mr: open ? 1.5 : 0,
              }}
            >
              {user.username ? user.username.substring(0, 2).toUpperCase() : 'US'}
            </Avatar>
            {open && (
              <Box sx={{ minWidth: 0, flexGrow: 1 }}>
                <Typography variant="body2" noWrap sx={{ fontWeight: 700, color: 'var(--text-main)' }}>
                  {user.username || 'User'}
                </Typography>
                <Typography variant="caption" noWrap sx={{ color: 'var(--text-sub)', display: 'block' }}>
                  {user.email}
                </Typography>
              </Box>
            )}
          </Box>
        )}

        {/* Logout */}
        <Tooltip title={!open ? 'Log Out' : ''} placement="right">
          <ListItemButton
            onClick={onLogout}
            sx={{
              minHeight: 48,
              justifyContent: open ? 'initial' : 'center',
              px: 2.5,
              borderRadius: '12px',
              color: 'error.main',
              '&:hover': {
                backgroundColor: 'error.light',
                color: '#ffffff',
                '& .MuiListItemIcon-root': { color: '#ffffff' },
              },
            }}
          >
            <ListItemIcon
              sx={{
                minWidth: 0,
                mr: open ? 3 : 'auto',
                justifyContent: 'center',
                color: 'error.main',
              }}
            >
              <LogoutIcon />
            </ListItemIcon>
            {open && (
              <ListItemText
                primary="Log Out"
                sx={{
                  '& .MuiTypography-root': { fontWeight: 600 },
                }}
              />
            )}
          </ListItemButton>
        </Tooltip>
      </Box>
    </Drawer>
  );
}

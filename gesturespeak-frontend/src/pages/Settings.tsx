import { useState } from 'react';
import { Box, Card, CardContent, Typography, TextField, Button, Switch, FormControlLabel, Divider, Alert } from '@mui/material';
import { useAuth } from '../context/AuthContext';
import { Save as SaveIcon, AccountCircle as AccountIcon, ColorLens as ThemeIcon, Dns as ServerIcon } from '@mui/icons-material';

interface SettingsProps {
  theme: 'light' | 'dark';
  toggleTheme: () => void;
}

export default function Settings({ theme, toggleTheme }: SettingsProps) {
  const { user, updateUsername } = useAuth();
  
  const [username, setUsername] = useState(user?.username || '');
  const [serverUrl, setServerUrl] = useState(localStorage.getItem('backend_url_override') || 'http://localhost:8080');
  
  const [success, setSuccess] = useState<string | null>(null);

  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccess(null);
    try {
      await updateUsername(username);
      setSuccess("Profile settings saved successfully!");
    } catch (err) {
      console.error(err);
    }
  };

  const handleServerSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSuccess(null);
    localStorage.setItem('backend_url_override', serverUrl);
    setSuccess("API Server connection configured! Please reload the page to apply.");
  };

  return (
    <Box sx={{ maxWidth: 650, mx: 'auto', display: 'flex', flexDirection: 'column', gap: 3 }}>
      {success && <Alert severity="success" sx={{ borderRadius: '16px' }}>{success}</Alert>}

      {/* Profile settings */}
      <Card className="glass-card">
        <CardContent sx={{ p: 4 }}>
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mb: 2 }}>
            <AccountIcon color="primary" fontSize="medium" />
            <Typography variant="h6" sx={{ fontWeight: 900, color: 'var(--text-main)' }}>
              PROFILE ACCOUNT SETTINGS
            </Typography>
          </Box>
          <Divider sx={{ borderColor: 'var(--border-glass)', mb: 3 }} />

          <Box component="form" onSubmit={handleProfileSave}>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 3, mb: 3 }}>
              <TextField
                fullWidth
                size="small"
                label="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: '12px',
                    color: 'var(--text-main)',
                    '& fieldset': { borderColor: 'var(--border-glass)' },
                  },
                }}
              />
              <TextField
                fullWidth
                size="small"
                label="Registered Email"
                disabled
                value={user?.email || ''}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: '12px',
                    color: 'var(--text-main)',
                    '& fieldset': { borderColor: 'var(--border-glass)' },
                  },
                }}
              />
            </Box>

            <Button
              type="submit"
              variant="contained"
              startIcon={<SaveIcon />}
              sx={{ borderRadius: '12px', fontWeight: 700, textTransform: 'none' }}
            >
              Save Profile
            </Button>
          </Box>
        </CardContent>
      </Card>

      {/* Visual styling settings */}
      <Card className="glass-card">
        <CardContent sx={{ p: 4 }}>
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mb: 2 }}>
            <ThemeIcon color="secondary" fontSize="medium" />
            <Typography variant="h6" sx={{ fontWeight: 900, color: 'var(--text-main)' }}>
              APPEARANCE & VISUAL THEMES
            </Typography>
          </Box>
          <Divider sx={{ borderColor: 'var(--border-glass)', mb: 3 }} />

          <FormControlLabel
            control={
              <Switch
                checked={theme === 'dark'}
                onChange={toggleTheme}
                color="secondary"
              />
            }
            label={
              <Typography variant="body1" sx={{ color: 'var(--text-main)', fontWeight: 700 }}>
                Enable Dark Mode theme
              </Typography>
            }
          />
          <Typography variant="caption" sx={{ color: 'var(--text-sub)', display: 'block', mt: 1 }}>
            Toggles between vibrant cyber neon dark backgrounds and sleek professional white canvas schemes.
          </Typography>
        </CardContent>
      </Card>

      {/* Backend connection override config */}
      <Card className="glass-card">
        <CardContent sx={{ p: 4 }}>
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mb: 2 }}>
            <ServerIcon sx={{ color: '#00f2fe' }} fontSize="medium" />
            <Typography variant="h6" sx={{ fontWeight: 900, color: 'var(--text-main)' }}>
              API GATEWAY NODE CONNECTIVITY
            </Typography>
          </Box>
          <Divider sx={{ borderColor: 'var(--border-glass)', mb: 3 }} />

          <Box component="form" onSubmit={handleServerSave}>
            <TextField
              fullWidth
              size="small"
              label="Spring Boot Server Address"
              value={serverUrl}
              onChange={(e) => setServerUrl(e.target.value)}
              sx={{
                mb: 3,
                '& .MuiOutlinedInput-root': {
                  borderRadius: '12px',
                  color: 'var(--text-main)',
                  '& fieldset': { borderColor: 'var(--border-glass)' },
                },
              }}
            />
            <Button
              type="submit"
              variant="contained"
              color="secondary"
              startIcon={<SaveIcon />}
              sx={{ borderRadius: '12px', fontWeight: 700, textTransform: 'none' }}
            >
              Rebind Server Node
            </Button>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}

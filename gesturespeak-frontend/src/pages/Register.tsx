import { useState } from 'react';
import { Box, Button, TextField, Typography, Alert, CircularProgress, Link } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  PersonOutlined as PersonIcon, 
  EmailOutlined as EmailIcon, 
  LockOutlined as LockIcon 
} from '@mui/icons-material';

export default function Register() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [signingUp, setSigningUp] = useState(false);
  
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setSigningUp(true);
    try {
      await register(email, password, username);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Registration failed.');
    } finally {
      setSigningUp(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundImage: 'var(--bg-app === "#030712" ? "linear-gradient(135deg, #0f172a 0%, #030712 100%)" : "linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%)")',
        px: 3,
      }}
    >
      <Box
        className="glass-card"
        sx={{
          width: '100%',
          maxWidth: 420,
          p: 5,
          background: 'var(--bg-card)',
          backdropFilter: 'blur(16px)',
          border: '1.5px solid var(--border-glass)',
          borderRadius: '24px',
        }}
      >
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 3 }}>
          <Box
            sx={{
              width: 56,
              height: 56,
              borderRadius: '16px',
              backgroundColor: 'primary.main',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 14px 0 rgba(1, 134, 218, 0.4)',
              mb: 2,
            }}
          >
            <PersonIcon sx={{ color: '#ffffff', fontSize: 28 }} />
          </Box>
          <Typography variant="h4" sx={{ fontWeight: 900, color: 'var(--text-main)', letterSpacing: -0.5 }}>
            Register Account
          </Typography>
          <Typography variant="body2" sx={{ color: 'var(--text-sub)', mt: 1 }}>
            Join GestureSpeak Translation Platform
          </Typography>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 3, borderRadius: '12px' }}>
            {error}
          </Alert>
        )}

        <Box component="form" onSubmit={handleSubmit}>
          <TextField
            margin="normal"
            required
            fullWidth
            id="username"
            label="Username"
            name="username"
            autoFocus
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            slotProps={{
              input: {
                startAdornment: <PersonIcon sx={{ color: 'action.active', mr: 1 }} />
              }
            }}
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: '14px',
                color: 'var(--text-main)',
                '& fieldset': { borderColor: 'var(--border-glass)' },
              },
              '& .MuiInputLabel-root': { color: 'var(--text-sub)' },
            }}
          />

          <TextField
            margin="normal"
            required
            fullWidth
            id="email"
            label="Email Address"
            name="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            slotProps={{
              input: {
                startAdornment: <EmailIcon sx={{ color: 'action.active', mr: 1 }} />
              }
            }}
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: '14px',
                color: 'var(--text-main)',
                '& fieldset': { borderColor: 'var(--border-glass)' },
              },
              '& .MuiInputLabel-root': { color: 'var(--text-sub)' },
            }}
          />

          <TextField
            margin="normal"
            required
            fullWidth
            name="password"
            label="Password"
            type="password"
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            slotProps={{
              input: {
                startAdornment: <LockIcon sx={{ color: 'action.active', mr: 1 }} />
              }
            }}
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: '14px',
                color: 'var(--text-main)',
                '& fieldset': { borderColor: 'var(--border-glass)' },
              },
              '& .MuiInputLabel-root': { color: 'var(--text-sub)' },
            }}
          />

          <TextField
            margin="normal"
            required
            fullWidth
            name="confirmPassword"
            label="Confirm Password"
            type="password"
            id="confirmPassword"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            slotProps={{
              input: {
                startAdornment: <LockIcon sx={{ color: 'action.active', mr: 1 }} />
              }
            }}
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: '14px',
                color: 'var(--text-main)',
                '& fieldset': { borderColor: 'var(--border-glass)' },
              },
              '& .MuiInputLabel-root': { color: 'var(--text-sub)' },
            }}
          />

          <Button
            type="submit"
            fullWidth
            variant="contained"
            disabled={signingUp}
            className="premium-btn"
            sx={{
              py: 1.5,
              fontSize: '1rem',
              fontWeight: 800,
              textTransform: 'none',
              mt: 2,
              mb: 3,
            }}
          >
            {signingUp ? <CircularProgress size={24} color="inherit" /> : 'Register'}
          </Button>

          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="body2" sx={{ color: 'var(--text-sub)' }}>
              Already have an account?{' '}
              <Link
                href="/login"
                sx={{ fontWeight: 700, color: 'primary.main', textDecoration: 'none' }}
              >
                Log In
              </Link>
            </Typography>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}

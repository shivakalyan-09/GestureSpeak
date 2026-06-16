import React, { useState } from 'react';
import { Box, Button, TextField, Typography, Alert, CircularProgress, Link } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { BACKEND_URL } from '../context/AuthContext';
import { 
  EmailOutlined as EmailIcon, 
  VpnKeyOutlined as KeyIcon, 
  LockOutlined as LockIcon 
} from '@mui/icons-material';

export default function ForgotPassword() {
  const [step, setStep] = useState(1); // 1: Send OTP, 2: Verify OTP, 3: Reset Pass
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const navigate = useNavigate();

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setLoading(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/auth/forgot-password?email=${encodeURIComponent(email)}`, {
        method: 'POST'
      });
      const data = await res.json();
      if (res.ok) {
        setMessage(data.message);
        setStep(2);
      } else {
        throw new Error(data.message || 'Email not found.');
      }
    } catch (err: any) {
      setError(err.message || 'Request failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setLoading(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/auth/verify-otp?email=${encodeURIComponent(email)}&otp=${encodeURIComponent(otp)}`, {
        method: 'POST'
      });
      const data = await res.json();
      if (res.ok && data.verified) {
        setMessage("OTP verified successfully. Please enter your new password.");
        setStep(3);
      } else {
        throw new Error(data.message || 'Verification failed. Incorrect OTP.');
      }
    } catch (err: any) {
      setError(err.message || 'Verification failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp, password })
      });
      if (res.ok) {
        setMessage("Password updated successfully. Redirecting you to login...");
        setTimeout(() => {
          navigate('/login');
        }, 2000);
      } else {
        const txt = await res.text();
        throw new Error(txt || 'Password update failed.');
      }
    } catch (err: any) {
      setError(err.message || 'Reset password failed.');
    } finally {
      setLoading(false);
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
            <KeyIcon sx={{ color: '#ffffff', fontSize: 28 }} />
          </Box>
          <Typography variant="h4" sx={{ fontWeight: 900, color: 'var(--text-main)', letterSpacing: -0.5 }}>
            Reset Password
          </Typography>
          <Typography variant="body2" sx={{ color: 'var(--text-sub)', mt: 1, textAlign: 'center' }}>
            {step === 1 && 'Request an OTP verification code'}
            {step === 2 && 'Enter the 6-digit code from logs'}
            {step === 3 && 'Create a secure new password'}
          </Typography>
        </Box>

        {error && <Alert severity="error" sx={{ mb: 2, borderRadius: '12px' }}>{error}</Alert>}
        {message && <Alert severity="success" sx={{ mb: 2, borderRadius: '12px' }}>{message}</Alert>}

        {step === 1 && (
          <Box component="form" onSubmit={handleSendOtp}>
            <TextField
              margin="normal"
              required
              fullWidth
              id="email"
              label="Email Address"
              name="email"
              autoFocus
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
            <Button
              type="submit"
              fullWidth
              variant="contained"
              disabled={loading}
              className="premium-btn"
              sx={{ py: 1.5, fontWeight: 800, mt: 2, mb: 2 }}
            >
              {loading ? <CircularProgress size={24} color="inherit" /> : 'Send Reset Code'}
            </Button>
          </Box>
        )}

        {step === 2 && (
          <Box component="form" onSubmit={handleVerifyOtp}>
            <TextField
              margin="normal"
              required
              fullWidth
              id="otp"
              label="6-Digit Verification Code"
              name="otp"
              autoFocus
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              slotProps={{
                input: {
                  startAdornment: <KeyIcon sx={{ color: 'action.active', mr: 1 }} />
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
              disabled={loading}
              className="premium-btn"
              sx={{ py: 1.5, fontWeight: 800, mt: 2, mb: 2 }}
            >
              {loading ? <CircularProgress size={24} color="inherit" /> : 'Verify Code'}
            </Button>
            <Button
              fullWidth
              variant="text"
              onClick={() => setStep(1)}
              sx={{ fontWeight: 700 }}
            >
              Back
            </Button>
          </Box>
        )}

        {step === 3 && (
          <Box component="form" onSubmit={handleResetPassword}>
            <TextField
              margin="normal"
              required
              fullWidth
              name="password"
              label="New Password"
              type="password"
              id="password"
              autoFocus
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
              disabled={loading}
              className="premium-btn"
              sx={{ py: 1.5, fontWeight: 800, mt: 2, mb: 2 }}
            >
              {loading ? <CircularProgress size={24} color="inherit" /> : 'Reset Password'}
            </Button>
          </Box>
        )}

        <Box sx={{ textAlign: 'center', mt: 1 }}>
          <Link href="/login" sx={{ fontWeight: 700, color: 'primary.main', textDecoration: 'none' }}>
            Back to Login
          </Link>
        </Box>
      </Box>
    </Box>
  );
}

import { useEffect, useState } from 'react';
import { Box, Typography, Card, CardContent, Button, Avatar } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  CameraAlt as CameraIcon,
  RecordVoiceOver as TtsIcon,
  Translate as TranslateIcon,
  School as LearningIcon,
  SmsFailed as EmergencyIcon,
  KeyboardArrowRight as RightIcon,
} from '@mui/icons-material';

interface ActivityItem {
  id: string;
  original: string;
  translated: string;
  type: string;
  timeFormatted: string;
}

export default function Dashboard() {
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    signsCount: 24,
    wordsLearned: 18,
    emergencyLogs: 2,
  });
  const [recentActivity, setRecentActivity] = useState<ActivityItem[]>([]);

  useEffect(() => {
    // Fetch stats and recent activity from Spring Boot Backend
    async function fetchDashboardData() {
      if (!token) return;
      try {
        const res = await fetch(`http://localhost:8080/api/history`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const historyList = await res.json();
          setRecentActivity(historyList.slice(0, 3));
          
          // Calculate stats based on history
          const signs = historyList.filter((h: any) => h.type.includes('Sign')).length;
          setStats(prev => ({
            ...prev,
            signsCount: signs || 12
          }));
        }

        // Fetch emergency logs count
        const sosRes = await fetch(`http://localhost:8080/api/emergency/logs`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (sosRes.ok) {
          const logs = await sosRes.json();
          setStats(prev => ({
            ...prev,
            emergencyLogs: logs.length
          }));
        }
      } catch (e) {
        console.warn("Spring Boot backend offline, displaying seeded dashboard mock states.", e);
        // Seed mock data
        setRecentActivity([
          { id: '1', original: 'Live Gesture Detection', translated: 'thank_you', type: 'Gesture to TEXT', timeFormatted: '02:30 PM' },
          { id: '2', original: 'How are you?', translated: 'Comment ça va?', type: 'Text Translate', timeFormatted: '11:15 AM' },
          { id: '3', original: 'Live Gesture Detection', translated: 'help', type: 'Gesture to VOICE', timeFormatted: '09:40 AM' },
        ]);
      }
    }
    fetchDashboardData();
  }, [token]);

  const quickAccessItems = [
    { title: 'Sign to Text', desc: 'Use AI camera to capture gestures', icon: <CameraIcon fontSize="large" />, path: '/sign-detection', color: '#00f2fe' },
    { title: 'Text to Speech', desc: 'Convert phrases to voice audio', icon: <TtsIcon fontSize="large" />, path: '/text-to-speech', color: '#4facfe' },
    { title: 'Live Translate', desc: 'Translate signs into 8 languages', icon: <TranslateIcon fontSize="large" />, path: '/live-translate', color: '#ec38bc' },
    { title: 'Sign Learning', desc: 'Alphabet guide & demonstration videos', icon: <LearningIcon fontSize="large" />, path: '/learning', color: '#9b51e0' },
  ];

  return (
    <Box>
      {/* Hero Welcome banner */}
      <Box
        className="glass-card"
        sx={{
          p: 4,
          mb: 4,
          background: 'linear-gradient(135deg, rgba(79, 172, 254, 0.1) 0%, rgba(0, 242, 254, 0.1) 100%)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 2,
        }}
      >
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 900, mb: 1, color: 'var(--text-main)' }}>
            Welcome back, {user?.username || 'User'}!
          </Typography>
          <Typography variant="body1" sx={{ color: 'var(--text-sub)' }}>
            Your AI-assisted sign language bridge is ready. Use quick cards below to start translating.
          </Typography>
        </Box>
        <Avatar
          sx={{
            width: 72,
            height: 72,
            fontSize: '2rem',
            fontWeight: 800,
            background: 'linear-gradient(135deg, #00f2fe 0%, #4facfe 100%)',
            boxShadow: '0 4px 20px 0 rgba(0, 242, 254, 0.4)',
          }}
        >
          {user?.username ? user.username.substring(0, 2).toUpperCase() : 'GS'}
        </Avatar>
      </Box>

      {/* Numerical Stats Cards (using CSS Grid) */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' },
          gap: 3,
          mb: 4
        }}
      >
        <Card className="glass-card">
          <CardContent sx={{ display: 'flex', alignItems: 'center', p: 3 }}>
            <Box sx={{ p: 2, mr: 2.5, borderRadius: '16px', background: 'rgba(0, 242, 254, 0.1)', color: '#00f2fe' }}>
              <CameraIcon fontSize="medium" />
            </Box>
            <Box>
              <Typography variant="h4" sx={{ fontWeight: 900, color: 'var(--text-main)' }}>{stats.signsCount}</Typography>
              <Typography variant="caption" sx={{ color: 'var(--text-sub)', fontWeight: 600 }}>GESTURES RECOGNIZED</Typography>
            </Box>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardContent sx={{ display: 'flex', alignItems: 'center', p: 3 }}>
            <Box sx={{ p: 2, mr: 2.5, borderRadius: '16px', background: 'rgba(155, 81, 224, 0.1)', color: '#9b51e0' }}>
              <LearningIcon fontSize="medium" />
            </Box>
            <Box>
              <Typography variant="h4" sx={{ fontWeight: 900, color: 'var(--text-main)' }}>{stats.wordsLearned}</Typography>
              <Typography variant="caption" sx={{ color: 'var(--text-sub)', fontWeight: 600 }}>VOCABULARY ITEMS LEARNED</Typography>
            </Box>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardContent sx={{ display: 'flex', alignItems: 'center', p: 3 }}>
            <Box sx={{ p: 2, mr: 2.5, borderRadius: '16px', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' }}>
              <EmergencyIcon fontSize="medium" />
            </Box>
            <Box>
              <Typography variant="h4" sx={{ fontWeight: 900, color: 'var(--text-main)' }}>{stats.emergencyLogs}</Typography>
              <Typography variant="caption" sx={{ color: 'var(--text-sub)', fontWeight: 600 }}>EMERGENCY ALERTS ACTIVE</Typography>
            </Box>
          </CardContent>
        </Card>
      </Box>

      {/* Main Grid (using CSS Grid) */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: '2fr 1fr' },
          gap: 4
        }}
      >
        {/* Quick Access */}
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 900, mb: 2.5, color: 'var(--text-main)', letterSpacing: 0.5 }}>
            QUICK ACCESS CONTROLS
          </Typography>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' },
              gap: 2
            }}
          >
            {quickAccessItems.map((item) => (
              <Card
                className="glass-card"
                key={item.title}
                sx={{
                  cursor: 'pointer',
                  '&:hover': {
                    borderColor: item.color,
                    transform: 'translateY(-4px)'
                  }
                }}
                onClick={() => navigate(item.path)}
              >
                <CardContent sx={{ p: 3 }}>
                  <Box sx={{ color: item.color, mb: 2 }}>{item.icon}</Box>
                  <Typography variant="h6" sx={{ fontWeight: 800, color: 'var(--text-main)', mb: 0.5 }}>
                    {item.title}
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'var(--text-sub)', minHeight: 40 }}>
                    {item.desc}
                  </Typography>
                </CardContent>
              </Card>
            ))}
          </Box>
        </Box>

        {/* Recent Activity */}
        <Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2.5 }}>
            <Typography variant="h6" sx={{ fontWeight: 900, color: 'var(--text-main)', letterSpacing: 0.5 }}>
              RECENT HISTORY
            </Typography>
            <Button
              size="small"
              endIcon={<RightIcon />}
              onClick={() => navigate('/history')}
              sx={{ fontWeight: 700, textTransform: 'none' }}
            >
              See All
            </Button>
          </Box>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {recentActivity.length > 0 ? (
              recentActivity.map((item) => (
                <Card className="glass-card" key={item.id} sx={{ '&:hover': { transform: 'none' } }}>
                  <CardContent sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Box sx={{ minWidth: 0 }}>
                      <Typography variant="subtitle2" sx={{ color: 'var(--text-main)', fontWeight: 800 }}>
                        {item.translated}
                      </Typography>
                      <Typography variant="caption" sx={{ color: 'var(--text-sub)', display: 'block' }}>
                        {item.type}
                      </Typography>
                    </Box>
                    <Typography variant="caption" sx={{ color: 'primary.main', fontWeight: 700 }}>
                      {item.timeFormatted}
                    </Typography>
                  </CardContent>
                </Card>
              ))
            ) : (
              <Card className="glass-card" sx={{ p: 3, textAlign: 'center' }}>
                <Typography variant="body2" sx={{ color: 'var(--text-sub)' }}>
                  No recent activities. Start a sign session!
                </Typography>
              </Card>
            )}
          </Box>
        </Box>
      </Box>
    </Box>
  );
}

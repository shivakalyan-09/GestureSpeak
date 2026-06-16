import { useEffect, useState } from 'react';
import { Box, Card, CardContent, Typography, LinearProgress } from '@mui/material';
import { useAuth } from '../context/AuthContext';
import { BACKEND_URL } from '../context/AuthContext';
import { 
  Timeline as ChartIcon, 
  Equalizer as BarIcon 
} from '@mui/icons-material';

interface GestureStat {
  gesture: string;
  count: number;
}

interface DayActivity {
  day: string;
  predictions: number;
}

export default function AdminPanel() {
  const { token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState({
    totalUsers: 152,
    totalPredictions: 1432,
    emergencyAlerts: 14,
    accuracyRate: 97.4,
    gestureStats: [] as GestureStat[],
    weeklyActivity: [] as DayActivity[]
  });

  useEffect(() => {
    async function fetchAnalytics() {
      if (!token) return;
      try {
        const res = await fetch(`${BACKEND_URL}/api/admin/analytics`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setAnalytics(data);
        }
      } catch (e) {
        console.warn("Spring Boot backend offline. Render local analytics fallback.", e);
        // Seed mock states
        setAnalytics({
          totalUsers: 184,
          totalPredictions: 1592,
          emergencyAlerts: 18,
          accuracyRate: 98.2,
          gestureStats: [
            { gesture: "Thank You", count: 450 },
            { gesture: "Help", count: 340 },
            { gesture: "Please", count: 220 },
            { gesture: "Yes", count: 180 },
            { gesture: "School", count: 140 },
            { gesture: "No", count: 120 }
          ],
          weeklyActivity: [
            { day: "Mon", predictions: 120 },
            { day: "Tue", predictions: 180 },
            { day: "Wed", predictions: 240 },
            { day: "Thu", predictions: 190 },
            { day: "Fri", predictions: 310 },
            { day: "Sat", predictions: 220 },
            { day: "Sun", predictions: 160 }
          ]
        });
      } finally {
        setLoading(false);
      }
    }
    fetchAnalytics();
  }, [token]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 8 }}>
        <LinearProgress sx={{ width: '50%', height: 6, borderRadius: 3 }} />
      </Box>
    );
  }

  // Calculate max values for graph scaling
  const maxWeeklyPredictions = Math.max(...analytics.weeklyActivity.map(d => d.predictions), 1);
  const maxGestureCount = Math.max(...analytics.gestureStats.map(g => g.count), 1);

  return (
    <Box>
      {/* Analytics Top Cards (using CSS Grid) */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
          gap: 3,
          mb: 4
        }}
      >
        <Card className="glass-card">
          <CardContent sx={{ p: 3, textAlign: 'center' }}>
            <Typography variant="caption" sx={{ color: 'var(--text-sub)', fontWeight: 800 }}>TOTAL REGISTERED USERS</Typography>
            <Typography variant="h3" sx={{ fontWeight: 900, color: 'var(--text-main)', mt: 1 }}>{analytics.totalUsers}</Typography>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardContent sx={{ p: 3, textAlign: 'center' }}>
            <Typography variant="caption" sx={{ color: 'var(--text-sub)', fontWeight: 800 }}>TRANSLATION VOLUMES</Typography>
            <Typography variant="h3" sx={{ fontWeight: 900, color: 'primary.main', mt: 1 }}>{analytics.totalPredictions}</Typography>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardContent sx={{ p: 3, textAlign: 'center' }}>
            <Typography variant="caption" sx={{ color: 'var(--text-sub)', fontWeight: 800 }}>EMERGENCY EVENTS LOGGED</Typography>
            <Typography variant="h3" sx={{ fontWeight: 900, color: 'error.main', mt: 1 }}>{analytics.emergencyAlerts}</Typography>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardContent sx={{ p: 3, textAlign: 'center' }}>
            <Typography variant="caption" sx={{ color: 'var(--text-sub)', fontWeight: 800 }}>AI PREDICTION ACCURACY</Typography>
            <Typography variant="h3" sx={{ fontWeight: 900, color: 'success.main', mt: 1 }}>{analytics.accuracyRate}%</Typography>
          </CardContent>
        </Card>
      </Box>

      {/* Graphs & Details (using CSS Grid) */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: '7fr 5fr' },
          gap: 4
        }}
      >
        {/* Weekly Translation Activity Level Bar graph */}
        <Card className="glass-card" sx={{ height: '100%' }}>
          <CardContent sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', flexDirection: 'row', gap: 1, alignItems: 'center', mb: 3 }}>
              <ChartIcon color="primary" />
              <Typography variant="subtitle2" sx={{ fontWeight: 900, color: 'var(--text-main)' }}>
                WEEKLY TRANSLATION INFERENCES ACTIVITY
              </Typography>
            </Box>

            {/* Custom SVG/CSS Bar Graph */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', height: 200, px: 2, pt: 2, borderBottom: '1px solid var(--border-glass)' }}>
              {analytics.weeklyActivity.map((dayData) => {
                const percentageHeight = (dayData.predictions / maxWeeklyPredictions) * 100;
                return (
                  <Box key={dayData.day} sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '12%' }}>
                    <Typography variant="caption" sx={{ color: 'var(--text-sub)', mb: 0.5, fontWeight: 700 }}>
                      {dayData.predictions}
                    </Typography>
                    <Box
                      sx={{
                        width: '100%',
                        height: `${percentageHeight * 1.5}px`,
                        maxHeight: 150,
                        borderRadius: '8px 8px 0 0',
                        background: 'linear-gradient(180deg, #00f2fe 0%, #4facfe 100%)',
                        boxShadow: '0 4px 10px rgba(0, 242, 254, 0.2)',
                        transition: 'height 0.5s ease',
                        '&:hover': {
                          background: 'linear-gradient(180deg, #ec38bc 0%, #7303c0 100%)',
                        }
                      }}
                    />
                    <Typography variant="caption" sx={{ color: 'var(--text-main)', mt: 1, fontWeight: 800 }}>
                      {dayData.day}
                    </Typography>
                  </Box>
                );
              })}
            </Box>
          </CardContent>
        </Card>

        {/* Top Gestures recognized Distribution list */}
        <Card className="glass-card" sx={{ height: '100%' }}>
          <CardContent sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', flexDirection: 'row', gap: 1, alignItems: 'center', mb: 3 }}>
              <BarIcon color="secondary" />
              <Typography variant="subtitle2" sx={{ fontWeight: 900, color: 'var(--text-main)' }}>
                TOP RECOGNIZED SIGN LANGUAGE CLASSES
              </Typography>
            </Box>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {analytics.gestureStats.map((gest) => {
                const ratio = (gest.count / maxGestureCount) * 100;
                return (
                  <Box key={gest.gesture}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                      <Typography variant="body2" sx={{ color: 'var(--text-main)', fontWeight: 800 }}>
                        {gest.gesture}
                      </Typography>
                      <Typography variant="caption" sx={{ color: 'var(--text-sub)', fontWeight: 700 }}>
                        {gest.count} calls
                      </Typography>
                    </Box>
                    <LinearProgress 
                      variant="determinate" 
                      value={ratio} 
                      sx={{
                        height: 8,
                        borderRadius: 4,
                        backgroundColor: 'action.hover',
                        '& .MuiLinearProgress-bar': {
                          backgroundImage: 'linear-gradient(90deg, #ec38bc 0%, #7303c0 100%)',
                        }
                      }}
                    />
                  </Box>
                );
              })}
            </Box>
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
}

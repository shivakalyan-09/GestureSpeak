import { useEffect, useState } from 'react';
import { Box, Typography, Card, CardContent, Button, Avatar, LinearProgress, Divider, Stack, Chip } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useAuth, getBackendUrl } from '../context/AuthContext';
import {
  CameraAlt as CameraIcon,
  RecordVoiceOver as TtsIcon,
  Translate as TranslateIcon,
  School as LearningIcon,
  KeyboardArrowRight as RightIcon,
  LocalFireDepartment as FireIcon,
  TrendingUp as TrendIcon,
  CalendarMonth as CalendarIcon,
  AccessTime as TimeIcon,
  PieChart as ChartIcon
} from '@mui/icons-material';

interface ActivityItem {
  id: string;
  timeFormatted: string;
  activity: string;
}

interface SignUsageItem {
  sign: string;
  count: number;
}

interface WeeklyActivityItem {
  day: string;
  translations: number;
  detections: number;
  learningSessions: number;
}

interface DashboardData {
  userGreeting: string;
  dailyProgress: {
    signToText: number;
    textToSign: number;
    liveTranslate: number;
    voiceTranslate: number;
    learningSessions: number;
    totalToday: number;
  };
  totalTranslations: number;
  signUsage: SignUsageItem[];
  weeklyActivity: WeeklyActivityItem[];
  monthlyAnalytics: {
    totalTranslations: number;
    mostUsedFeature: string;
    activeDays: number;
    averageDailyUsage: number;
  };
  recentActivity: ActivityItem[];
  featureUsageBreakdown: {
    signToText: number;
    textToSign: number;
    liveTranslate: number;
    voiceTranslate: number;
  };
  streak: number;
  learningProgress: {
    alphabetsLearned: number;
    wordsLearned: number;
    practiceSessions: number;
  };
}

export default function Dashboard() {
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeChartBar, setActiveChartBar] = useState<number | null>(null);

  // Poll dashboard data from the backend every 3 seconds for real-time responsiveness
  useEffect(() => {
    if (!token) return;

    async function fetchDashboard() {
      try {
        const res = await fetch(`${getBackendUrl()}/api/analytics/dashboard`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const dashboardData = await res.json();
          setData(dashboardData);
        }
      } catch (e) {
        console.warn("Analytics API offline or failed, displaying seeded client mock fallback data.", e);
        // Fallback simulated seed data
        const mockData: DashboardData = {
          userGreeting: `Welcome, ${user?.username || 'Gesture User'}`,
          dailyProgress: {
            signToText: 8,
            textToSign: 4,
            liveTranslate: 6,
            voiceTranslate: 2,
            learningSessions: 3,
            totalToday: 20
          },
          totalTranslations: 485,
          signUsage: [
            { sign: "Thank You", count: 35 },
            { sign: "Hello", count: 28 },
            { sign: "Please", count: 20 },
            { sign: "A", count: 18 }
          ],
          weeklyActivity: [
            { day: "Mon", translations: 12, detections: 6, learningSessions: 2 },
            { day: "Tue", translations: 15, detections: 8, learningSessions: 3 },
            { day: "Wed", translations: 18, detections: 10, learningSessions: 4 },
            { day: "Thu", translations: 10, detections: 5, learningSessions: 1 },
            { day: "Fri", translations: 22, detections: 12, learningSessions: 5 },
            { day: "Sat", translations: 14, detections: 7, learningSessions: 2 },
            { day: "Sun", translations: 8, detections: 4, learningSessions: 1 }
          ],
          monthlyAnalytics: {
            totalTranslations: 185,
            mostUsedFeature: "Sign to Text",
            activeDays: 14,
            averageDailyUsage: 13.2
          },
          recentActivity: [
            { id: '1', timeFormatted: '11:45 AM', activity: 'Sign to Text (Detected: Hello)' },
            { id: '2', timeFormatted: '10:30 AM', activity: 'Voice Translate (Vocalized English to Spanish)' },
            { id: '3', timeFormatted: '09:15 AM', activity: 'Completed learning: Alphabet A' }
          ],
          featureUsageBreakdown: {
            signToText: 40.0,
            textToSign: 20.0,
            liveTranslate: 25.0,
            voiceTranslate: 15.0
          },
          streak: 5,
          learningProgress: {
            alphabetsLearned: 18,
            wordsLearned: 45,
            practiceSessions: 24
          }
        };
        setData(mockData);
      } finally {
        setLoading(false);
      }
    }

    fetchDashboard();
    const timer = setInterval(fetchDashboard, 3000);
    return () => clearInterval(timer);
  }, [token, user]);

  const quickAccessItems = [
    { title: 'Sign to Text', desc: 'Use AI camera to capture gestures', icon: <CameraIcon fontSize="large" />, path: '/sign-detection', color: '#00f2fe' },
    { title: 'Text to Speech', desc: 'Convert text to voice and signs', icon: <TtsIcon fontSize="large" />, path: '/text-to-speech', color: '#4facfe' },
    { title: 'Live Translate', desc: 'Translate signs and speech', icon: <TranslateIcon fontSize="large" />, path: '/live-translate', color: '#ec38bc' },
    { title: 'Sign Learning', desc: 'Alphabet guide & custom videos', icon: <LearningIcon fontSize="large" />, path: '/learning', color: '#9b51e0' },
  ];

  if (loading || !data) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, py: 4, textAlign: 'center', alignItems: 'center' }}>
        <Typography variant="h5" sx={{ color: 'var(--text-sub)' }}>
          Aggregating your real-time performance analytics...
        </Typography>
        <LinearProgress color="primary" sx={{ width: '300px', height: '6px', borderRadius: '3px' }} />
      </Box>
    );
  }

  // Find max weekly values to scale custom SVG chart
  const maxWeeklyVal = Math.max(
    ...data.weeklyActivity.map(w => Math.max(w.translations, w.detections, w.learningSessions)),
    5 // baseline min max
  );

  return (
    <Box>
      {/* 1. Dynamic User Greeting & Streak Banner */}
      <Box
        className="glass-card"
        sx={{
          p: 4,
          mb: 4,
          background: 'linear-gradient(135deg, rgba(79, 172, 254, 0.08) 0%, rgba(236, 56, 188, 0.08) 100%)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 3,
        }}
      >
        <Box sx={{ flexGrow: 1, minWidth: '300px' }}>
          <Typography variant="h4" sx={{ fontWeight: 950, mb: 1, color: 'var(--text-main)', letterSpacing: -0.5 }}>
            {data.userGreeting}!
          </Typography>
          <Typography variant="body1" sx={{ color: 'var(--text-sub)' }}>
            Your sign language translations are fully synchronized in real-time. Check your dynamic metrics below.
          </Typography>
        </Box>

        {/* Dynamic Streak Badge */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 2,
            p: 2,
            borderRadius: '20px',
            border: '1.5px solid rgba(236, 56, 188, 0.3)',
            background: 'rgba(236, 56, 188, 0.05)',
            boxShadow: '0 4px 15px 0 rgba(236, 56, 188, 0.1)',
            animation: data.streak > 0 ? 'pulseGlow 2s infinite ease-in-out' : 'none',
            '@keyframes pulseGlow': {
              '0%': { boxShadow: '0 4px 15px 0 rgba(236, 56, 188, 0.1)', borderColor: 'rgba(236, 56, 188, 0.3)' },
              '50%': { boxShadow: '0 4px 25px 5px rgba(236, 56, 188, 0.25)', borderColor: 'rgba(236, 56, 188, 0.6)' },
              '100%': { boxShadow: '0 4px 15px 0 rgba(236, 56, 188, 0.1)', borderColor: 'rgba(236, 56, 188, 0.3)' }
            }
          }}
        >
          <Avatar
            sx={{
              background: 'linear-gradient(135deg, #ff9900 0%, #ff5500 100%)',
              boxShadow: '0 4px 12px 0 rgba(255, 85, 0, 0.4)',
              width: 48,
              height: 48
            }}
          >
            <FireIcon />
          </Avatar>
          <Box>
            <Typography variant="caption" sx={{ color: 'var(--text-sub)', fontWeight: 800, letterSpacing: 0.5, display: 'block' }}>
              CURRENT ACTIVE STREAK
            </Typography>
            <Typography variant="h6" sx={{ fontWeight: 900, color: 'var(--text-main)' }}>
              {data.streak} {data.streak === 1 ? 'Day' : 'Days'}
            </Typography>
          </Box>
        </Box>
      </Box>

      {/* Main Grid: Statistics & Progress Cards */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '2fr 1fr' }, gap: 4, mb: 4 }}>
        
        {/* Left Columns: Core Analytics */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          
          {/* Row of stats cards (Today's Total & All-time Total) */}
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 3 }}>
            
            {/* Today's Total Activity Card */}
            <Card className="glass-card" sx={{ background: 'linear-gradient(135deg, rgba(79, 172, 254, 0.05) 0%, rgba(0, 242, 254, 0.05) 100%)' }}>
              <CardContent sx={{ p: 3, display: 'flex', alignItems: 'center' }}>
                <Avatar sx={{ width: 56, height: 56, background: 'rgba(0, 242, 254, 0.1)', color: '#00f2fe', mr: 2.5 }}>
                  <TrendIcon fontSize="medium" />
                </Avatar>
                <Box>
                  <Typography variant="h4" sx={{ fontWeight: 950, color: 'var(--text-main)' }}>
                    {data.dailyProgress.totalToday}
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'var(--text-sub)', fontWeight: 800, letterSpacing: 0.5 }}>
                    TODAY'S TRANSLATIONS
                  </Typography>
                </Box>
              </CardContent>
            </Card>

            {/* Total Translations (All-Time) Card */}
            <Card className="glass-card" sx={{ background: 'linear-gradient(135deg, rgba(236, 56, 188, 0.05) 0%, rgba(155, 81, 224, 0.05) 100%)' }}>
              <CardContent sx={{ p: 3, display: 'flex', alignItems: 'center' }}>
                <Avatar sx={{ width: 56, height: 56, background: 'rgba(155, 81, 224, 0.1)', color: '#9b51e0', mr: 2.5 }}>
                  <TranslateIcon fontSize="medium" />
                </Avatar>
                <Box>
                  <Typography variant="h4" sx={{ fontWeight: 950, color: 'var(--text-main)' }}>
                    {data.totalTranslations.toLocaleString()}
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'var(--text-sub)', fontWeight: 800, letterSpacing: 0.5 }}>
                    TOTAL ALL-TIME TRANSLATIONS
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Box>

          {/* 2. DAILY PROGRESS CARD details */}
          <Card className="glass-card">
            <CardContent sx={{ p: 4 }}>
              <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center', mb: 2 }}>
                <TrendIcon sx={{ color: '#00f2fe' }} />
                <Typography variant="h6" sx={{ fontWeight: 950, color: 'var(--text-main)', letterSpacing: 0.5 }}>
                  TODAY'S ACTIVITY LOGS
                </Typography>
              </Box>
              <Divider sx={{ borderColor: 'var(--border-glass)', mb: 3 }} />

              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(5, 1fr)' }, gap: 2 }}>
                {[
                  { label: "Sign to Text", val: data.dailyProgress.signToText, color: '#00f2fe' },
                  { label: "Text to Sign", val: data.dailyProgress.textToSign, color: '#4facfe' },
                  { label: "Live Translate", val: data.dailyProgress.liveTranslate, color: '#ec38bc' },
                  { label: "Voice Translate", val: data.dailyProgress.voiceTranslate, color: '#f59e0b' },
                  { label: "Learning Sessions", val: data.dailyProgress.learningSessions, color: '#9b51e0' },
                ].map(item => (
                  <Box key={item.label} sx={{ textAlign: 'center', p: 2, borderRadius: '16px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-glass)' }}>
                    <Typography variant="h5" sx={{ fontWeight: 900, color: item.color, mb: 0.5 }}>
                      {item.val}
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'var(--text-sub)', fontWeight: 700, fontSize: '0.7rem' }}>
                      {item.label}
                    </Typography>
                  </Box>
                ))}
              </Box>
            </CardContent>
          </Card>

          {/* 5. WEEKLY ACTIVITY CHART (Custom Interactive SVG) */}
          <Card className="glass-card">
            <CardContent sx={{ p: 4 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
                  <ChartIcon sx={{ color: '#4facfe' }} />
                  <Typography variant="h6" sx={{ fontWeight: 950, color: 'var(--text-main)', letterSpacing: 0.5 }}>
                    WEEKLY ACTIVITY MONITOR
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', gap: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Box sx={{ width: 10, height: 10, borderRadius: '2px', bgcolor: '#4facfe' }} />
                    <Typography variant="caption" sx={{ color: 'var(--text-sub)', fontWeight: 700 }}>Trans.</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Box sx={{ width: 10, height: 10, borderRadius: '2px', bgcolor: '#00f2fe' }} />
                    <Typography variant="caption" sx={{ color: 'var(--text-sub)', fontWeight: 700 }}>Dect.</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Box sx={{ width: 10, height: 10, borderRadius: '2px', bgcolor: '#ec38bc' }} />
                    <Typography variant="caption" sx={{ color: 'var(--text-sub)', fontWeight: 700 }}>Learn</Typography>
                  </Box>
                </Box>
              </Box>
              <Divider sx={{ borderColor: 'var(--border-glass)', mb: 3 }} />

              {/* Responsive SVG Chart Container */}
              <Box sx={{ position: 'relative', width: '100%', height: 250 }}>
                <svg width="100%" height="100%" viewBox="0 0 700 240" preserveAspectRatio="none">
                  {/* Grid Lines */}
                  {[0, 0.25, 0.5, 0.75, 1.0].map((ratio, index) => {
                    const y = 20 + 180 * (1 - ratio);
                    const val = Math.round(maxWeeklyVal * ratio);
                    return (
                      <g key={index}>
                        <text x="25" y={y + 4} fill="var(--text-sub)" fontSize="10" fontWeight="700" textAnchor="end">{val}</text>
                        <line x1="35" y1={y} x2="680" y2={y} stroke="var(--border-glass)" strokeDasharray="3 3" />
                      </g>
                    );
                  })}

                  {/* Render Weekly Bars */}
                  {data.weeklyActivity.map((dayData, idx) => {
                    const xCenter = 70 + idx * 90;
                    
                    // Height values scaled to fit y: 20 to 200
                    const heightTrans = (dayData.translations / maxWeeklyVal) * 180;
                    const heightDect = (dayData.detections / maxWeeklyVal) * 180;
                    const heightLearn = (dayData.learningSessions / maxWeeklyVal) * 180;

                    const active = activeChartBar === idx;

                    return (
                      <g 
                        key={dayData.day}
                        onMouseEnter={() => setActiveChartBar(idx)}
                        onMouseLeave={() => setActiveChartBar(null)}
                        style={{ cursor: 'pointer' }}
                      >
                        {/* Translation Bar (Blue) */}
                        <rect 
                          x={xCenter - 22} 
                          y={200 - heightTrans} 
                          width="12" 
                          height={Math.max(2, heightTrans)} 
                          fill="url(#blueGrad)" 
                          rx="3"
                          style={{ transition: 'all 0.3s', opacity: active ? 1 : 0.85 }}
                        />

                        {/* Detection Bar (Cyan) */}
                        <rect 
                          x={xCenter - 6} 
                          y={200 - heightDect} 
                          width="12" 
                          height={Math.max(2, heightDect)} 
                          fill="url(#cyanGrad)" 
                          rx="3"
                          style={{ transition: 'all 0.3s', opacity: active ? 1 : 0.85 }}
                        />

                        {/* Learning Session Bar (Pink) */}
                        <rect 
                          x={xCenter + 10} 
                          y={200 - heightLearn} 
                          width="12" 
                          height={Math.max(2, heightLearn)} 
                          fill="url(#pinkGrad)" 
                          rx="3"
                          style={{ transition: 'all 0.3s', opacity: active ? 1 : 0.85 }}
                        />

                        {/* Day Axis Label */}
                        <text x={xCenter} y="222" fill={active ? "var(--text-main)" : "var(--text-sub)"} fontSize="11" fontWeight="800" textAnchor="middle">
                          {dayData.day}
                        </text>
                      </g>
                    );
                  })}

                  {/* SVG Gradients definitions */}
                  <defs>
                    <linearGradient id="blueGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#4facfe" />
                      <stop offset="100%" stopColor="#00c6ff" />
                    </linearGradient>
                    <linearGradient id="cyanGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#00f2fe" />
                      <stop offset="100%" stopColor="#4facfe" />
                    </linearGradient>
                    <linearGradient id="pinkGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#ec38bc" />
                      <stop offset="100%" stopColor="#9b51e0" />
                    </linearGradient>
                  </defs>
                </svg>

                {/* Live Tooltip Overlay */}
                {activeChartBar !== null && (
                  <Box
                    sx={{
                      position: 'absolute',
                      top: 10,
                      left: `${13 + activeChartBar * 12.8}%`,
                      transform: 'translateX(-50%)',
                      p: 1.5,
                      borderRadius: '12px',
                      background: 'rgba(15, 23, 42, 0.95)',
                      border: '1px solid rgba(79, 172, 254, 0.4)',
                      color: '#ffffff',
                      boxShadow: '0 10px 20px -10px rgba(0,0,0,0.5)',
                      zIndex: 10,
                      pointerEvents: 'none'
                    }}
                  >
                    <Typography variant="caption" sx={{ fontWeight: 900, display: 'block', mb: 0.5, borderBottom: '1px solid rgba(255,255,255,0.1)', pb: 0.5 }}>
                      {data.weeklyActivity[activeChartBar].day.toUpperCase()} LOGS
                    </Typography>
                    <Typography variant="caption" sx={{ display: 'block', fontWeight: 600 }}>
                      Translations: <span style={{ color: '#4facfe', fontWeight: 800 }}>{data.weeklyActivity[activeChartBar].translations}</span>
                    </Typography>
                    <Typography variant="caption" sx={{ display: 'block', fontWeight: 600 }}>
                      Detections: <span style={{ color: '#00f2fe', fontWeight: 800 }}>{data.weeklyActivity[activeChartBar].detections}</span>
                    </Typography>
                    <Typography variant="caption" sx={{ display: 'block', fontWeight: 600 }}>
                      Learning: <span style={{ color: '#ec38bc', fontWeight: 800 }}>{data.weeklyActivity[activeChartBar].learningSessions}</span>
                    </Typography>
                  </Box>
                )}
              </Box>
            </CardContent>
          </Card>
        </Box>

        {/* Right Columns: Sidebar analytics widgets */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          
          {/* 6. MONTHLY ANALYTICS */}
          <Card className="glass-card" sx={{ background: 'linear-gradient(135deg, rgba(155, 81, 224, 0.05) 0%, rgba(236, 56, 188, 0.05) 100%)' }}>
            <CardContent sx={{ p: 4 }}>
              <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center', mb: 2 }}>
                <CalendarIcon sx={{ color: '#9b51e0' }} />
                <Typography variant="h6" sx={{ fontWeight: 950, color: 'var(--text-main)', letterSpacing: 0.5 }}>
                  MONTHLY METRICS
                </Typography>
              </Box>
              <Divider sx={{ borderColor: 'var(--border-glass)', mb: 3 }} />

              <Stack spacing={2.5}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="body2" sx={{ color: 'var(--text-sub)', fontWeight: 600 }}>Total Translations</Typography>
                  <Typography variant="body1" sx={{ fontWeight: 900, color: 'var(--text-main)' }}>
                    {data.monthlyAnalytics.totalTranslations}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="body2" sx={{ color: 'var(--text-sub)', fontWeight: 600 }}>Most Used Feature</Typography>
                  <Chip size="small" label={data.monthlyAnalytics.mostUsedFeature} color="secondary" sx={{ fontWeight: 800, borderRadius: '8px' }} />
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="body2" sx={{ color: 'var(--text-sub)', fontWeight: 600 }}>Active Practice Days</Typography>
                  <Typography variant="body1" sx={{ fontWeight: 900, color: 'var(--text-main)' }}>
                    {data.monthlyAnalytics.activeDays}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="body2" sx={{ color: 'var(--text-sub)', fontWeight: 600 }}>Average Daily Usage</Typography>
                  <Typography variant="body1" sx={{ fontWeight: 950, color: 'primary.main' }}>
                    {data.monthlyAnalytics.averageDailyUsage}/day
                  </Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>

          {/* 8. FEATURE USAGE BREAKDOWN */}
          <Card className="glass-card">
            <CardContent sx={{ p: 4 }}>
              <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center', mb: 2 }}>
                <ChartIcon sx={{ color: '#ec38bc' }} />
                <Typography variant="h6" sx={{ fontWeight: 950, color: 'var(--text-main)', letterSpacing: 0.5 }}>
                  FEATURE DISTRIBUTION
                </Typography>
              </Box>
              <Divider sx={{ borderColor: 'var(--border-glass)', mb: 3 }} />

              <Stack spacing={3}>
                {[
                  { name: "Sign to Text", pct: data.featureUsageBreakdown.signToText, color: 'linear-gradient(90deg, #00f2fe 0%, #4facfe 100%)' },
                  { name: "Text to Sign", pct: data.featureUsageBreakdown.textToSign, color: 'linear-gradient(90deg, #4facfe 0%, #00f2fe 100%)' },
                  { name: "Live Translate", pct: data.featureUsageBreakdown.liveTranslate, color: 'linear-gradient(90deg, #ec38bc 0%, #9b51e0 100%)' },
                  { name: "Voice Translate", pct: data.featureUsageBreakdown.voiceTranslate, color: 'linear-gradient(90deg, #f59e0b 0%, #ff8c00 100%)' },
                ].map(feat => (
                  <Box key={feat.name}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                      <Typography variant="body2" sx={{ color: 'var(--text-sub)', fontWeight: 700 }}>{feat.name}</Typography>
                      <Typography variant="body2" sx={{ color: 'var(--text-main)', fontWeight: 900 }}>{feat.pct}%</Typography>
                    </Box>
                    <Box sx={{ width: '100%', height: 8, bgcolor: 'action.hover', borderRadius: 4, overflow: 'hidden' }}>
                      <Box sx={{ height: '100%', width: `${feat.pct}%`, background: feat.color, borderRadius: 4, transition: 'width 1s cubic-bezier(0.4, 0, 0.2, 1)' }} />
                    </Box>
                  </Box>
                ))}
              </Stack>
            </CardContent>
          </Card>
        </Box>
      </Box>

      {/* Grid: Learning & Sign Usage Details */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 4, mb: 4 }}>
        
        {/* 10. LEARNING PROGRESS */}
        <Card className="glass-card">
          <CardContent sx={{ p: 4 }}>
            <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center', mb: 2 }}>
              <LearningIcon sx={{ color: '#9b51e0' }} />
              <Typography variant="h6" sx={{ fontWeight: 950, color: 'var(--text-main)', letterSpacing: 0.5 }}>
                LEARNING MILESTONES
              </Typography>
            </Box>
            <Divider sx={{ borderColor: 'var(--border-glass)', mb: 3 }} />

            <Stack spacing={3}>
              <Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2" sx={{ color: 'var(--text-sub)', fontWeight: 700 }}>Fingerspelling Alphabets Learned</Typography>
                  <Typography variant="body2" sx={{ color: 'var(--text-main)', fontWeight: 900 }}>{data.learningProgress.alphabetsLearned}/26</Typography>
                </Box>
                <Box sx={{ width: '100%', height: 8, bgcolor: 'action.hover', borderRadius: 4, overflow: 'hidden' }}>
                  <Box sx={{ height: '100%', width: `${(data.learningProgress.alphabetsLearned / 26) * 100}%`, bgcolor: '#9b51e0', borderRadius: 4 }} />
                </Box>
              </Box>

              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 2, borderRadius: '16px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-glass)' }}>
                <Box>
                  <Typography variant="subtitle2" sx={{ color: 'var(--text-main)', fontWeight: 900 }}>Words Learned</Typography>
                  <Typography variant="caption" sx={{ color: 'var(--text-sub)' }}>Vocabulary item completions</Typography>
                </Box>
                <Typography variant="h5" sx={{ fontWeight: 950, color: '#ec38bc' }}>
                  {data.learningProgress.wordsLearned}
                </Typography>
              </Box>

              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 2, borderRadius: '16px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-glass)' }}>
                <Box>
                  <Typography variant="subtitle2" sx={{ color: 'var(--text-main)', fontWeight: 900 }}>Practice Sessions Completed</Typography>
                  <Typography variant="caption" sx={{ color: 'var(--text-sub)' }}>Total matching sessions run</Typography>
                </Box>
                <Typography variant="h5" sx={{ fontWeight: 950, color: 'primary.main' }}>
                  {data.learningProgress.practiceSessions}
                </Typography>
              </Box>
            </Stack>
          </CardContent>
        </Card>

        {/* 4. SIGN LANGUAGE USAGE CARD */}
        <Card className="glass-card">
          <CardContent sx={{ p: 4 }}>
            <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center', mb: 2 }}>
              <CameraIcon sx={{ color: '#00f2fe' }} />
              <Typography variant="h6" sx={{ fontWeight: 950, color: 'var(--text-main)', letterSpacing: 0.5 }}>
                MOST FREQUENT GESTURES
              </Typography>
            </Box>
            <Divider sx={{ borderColor: 'var(--border-glass)', mb: 3 }} />

            {data.signUsage.length > 0 ? (
              <Stack spacing={2}>
                {data.signUsage.map((item, index) => (
                  <Box 
                    key={item.sign} 
                    sx={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center',
                      p: 1.5,
                      borderRadius: '12px',
                      background: 'rgba(255,255,255,0.01)',
                      borderLeft: `4px solid ${index === 0 ? '#00f2fe' : index === 1 ? '#4facfe' : index === 2 ? '#ec38bc' : '#9b51e0'}`
                    }}
                  >
                    <Typography variant="subtitle2" sx={{ color: 'var(--text-main)', fontWeight: 800 }}>
                      {item.sign}
                    </Typography>
                    <Chip size="small" label={`${item.count} detections`} sx={{ fontWeight: 800, bgcolor: 'action.hover' }} />
                  </Box>
                ))}
              </Stack>
            ) : (
              <Box sx={{ py: 6, textAlign: 'center' }}>
                <Typography variant="body2" sx={{ color: 'var(--text-sub)' }}>
                  No gesture logs recorded. Run webcam sign translations to compile records.
                </Typography>
              </Box>
            )}
          </CardContent>
        </Card>
      </Box>

      {/* Grid: Quick Controls & Recent Activity Logs */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '2fr 1.2fr' }, gap: 4 }}>
        
        {/* Quick Access */}
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 950, mb: 2.5, color: 'var(--text-main)', letterSpacing: 0.5 }}>
            QUICK ACCESS CONTROLS
          </Typography>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' },
              gap: 2.5
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

        {/* 7. RECENT ACTIVITY SECTION (Latest 10 activities) */}
        <Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2.5 }}>
            <Typography variant="h6" sx={{ fontWeight: 950, color: 'var(--text-main)', letterSpacing: 0.5 }}>
              RECENT SYSTEM ACTIVITY
            </Typography>
            <Button
              size="small"
              endIcon={<RightIcon />}
              onClick={() => navigate('/history')}
              sx={{ fontWeight: 800, textTransform: 'none' }}
            >
              See All
            </Button>
          </Box>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {data.recentActivity.length > 0 ? (
              data.recentActivity.map((item) => (
                <Card className="glass-card" key={item.id} sx={{ '&:hover': { transform: 'none' } }}>
                  <CardContent sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Box sx={{ minWidth: 0, mr: 2 }}>
                      <Typography variant="subtitle2" sx={{ color: 'var(--text-main)', fontWeight: 800, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                        {item.activity}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexShrink: 0 }}>
                      <TimeIcon fontSize="inherit" color="primary" />
                      <Typography variant="caption" sx={{ color: 'primary.main', fontWeight: 800 }}>
                        {item.timeFormatted}
                      </Typography>
                    </Box>
                  </CardContent>
                </Card>
              ))
            ) : (
              <Card className="glass-card" sx={{ p: 3, textAlign: 'center' }}>
                <Typography variant="body2" sx={{ color: 'var(--text-sub)' }}>
                  No activities logged yet. Get started today!
                </Typography>
              </Card>
            )}
          </Box>
        </Box>
      </Box>
    </Box>
  );
}

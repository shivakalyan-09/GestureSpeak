import { useEffect, useState } from 'react';
import { 
  Box, Typography, Card, CardContent, Button, 
  TextField, ToggleButton, ToggleButtonGroup, Dialog, DialogTitle, 
  DialogContent, DialogActions, LinearProgress, IconButton
} from '@mui/material';
import { useAuth } from '../context/AuthContext';
import { BACKEND_URL } from '../context/AuthContext';
import SearchIcon from '@mui/icons-material/Search';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import confetti from 'canvas-confetti';

interface LearningItem {
  id: string;
  category: string;
  title: string;
  description: string;
  animationUrl: string;
  progress: number;
}

export default function Learning() {
  const { token } = useAuth();
  const [items, setItems] = useState<LearningItem[]>([]);
  const [category, setCategory] = useState<string>('all');
  const [search, setSearch] = useState<string>('');
  
  // Modal State for Hand demonstration
  const [openModal, setOpenModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<LearningItem | null>(null);

  const fetchItems = async () => {
    try {
      const url = `${BACKEND_URL}/api/learning/public/list` + 
        (category !== 'all' ? `?category=${category}` : '');
      const res = await fetch(url);
      if (res.ok) {
        const list = await res.json();
        setItems(list);
      }
    } catch (e) {
      console.warn("Spring Boot backend offline, seeding frontend mock states for learning items.", e);
      // Mock Seed fallback
      const mockList: LearningItem[] = [];
      // A-Z alphabets
      for (let ch = 65; ch <= 90; ch++) {
        const letter = String.fromCharCode(ch);
        mockList.push({
          id: `alpha-${letter}`,
          category: 'alphabet',
          title: letter,
          description: `Fingerspelling gesture for the letter ${letter}.`,
          animationUrl: '',
          progress: 0
        });
      }
      // Word labels
      const words = ["help", "no", "please", "school", "thank_you", "what", "who", "why", "yes", "you"];
      words.forEach(w => {
        const formatted = w.replace("_", " ").substring(0,1).toUpperCase() + w.replace("_", " ").substring(1);
        mockList.push({
          id: `word-${w}`,
          category: 'word',
          title: formatted,
          description: `Learn the sign language gesture for the phrase '${formatted}'.`,
          animationUrl: '',
          progress: 0
        });
      });
      setItems(mockList);
    }
  };

  useEffect(() => {
    fetchItems();
  }, [category]);

  const handleMarkAsLearned = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    // Celebrate!
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 }
    });

    // Update in UI locally first
    setItems(prev => prev.map(item => {
      if (item.id === id) {
        return { ...item, progress: item.progress === 100 ? 0 : 100 };
      }
      return item;
    }));

    // Save progress to server
    try {
      await fetch(`${BACKEND_URL}/api/learning/progress/${id}?progress=100`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
    } catch (err) {
      console.warn("Could not synchronize progress to server:", err);
    }
  };

  const handleOpenDemo = (item: LearningItem) => {
    setSelectedItem(item);
    setOpenModal(true);
  };

  const handleCloseDemo = () => {
    setOpenModal(false);
    setSelectedItem(null);
  };

  // Filter items based on search string
  const filteredItems = items.filter(item => 
    item.title.toLowerCase().includes(search.toLowerCase()) ||
    item.description.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4, flexWrap: 'wrap', gap: 2 }}>
        {/* Toggle Filters */}
        <ToggleButtonGroup
          value={category}
          exclusive
          onChange={(_, val) => val && setCategory(val)}
          sx={{
            background: 'var(--bg-card)',
            backdropFilter: 'blur(8px)',
            borderRadius: '16px',
            p: 0.5,
            border: '1px solid var(--border-glass)',
            '& .MuiToggleButton-root': {
              border: 'none',
              borderRadius: '12px',
              color: 'var(--text-sub)',
              fontWeight: 700,
              textTransform: 'none',
              px: 3,
              '&.Mui-selected': {
                background: 'primary.main',
                color: '#ffffff',
                '&:hover': { background: 'primary.dark' }
              }
            }
          }}
        >
          <ToggleButton value="all">All Items</ToggleButton>
          <ToggleButton value="alphabet">Alphabets</ToggleButton>
          <ToggleButton value="word">Vocabulary Words</ToggleButton>
        </ToggleButtonGroup>

        {/* Search */}
        <TextField
          size="small"
          placeholder="Search vocabulary..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          slotProps={{
            input: {
              startAdornment: <SearchIcon sx={{ color: 'var(--text-sub)', mr: 1 }} />
            }
          }}
          sx={{
            width: { xs: '100%', sm: 260 },
            '& .MuiOutlinedInput-root': {
              borderRadius: '14px',
              color: 'var(--text-main)',
              background: 'var(--bg-card)',
              '& fieldset': { borderColor: 'var(--border-glass)' },
            },
          }}
        />
      </Box>

      {/* CSS Grid of items */}
      <Box 
        sx={{ 
          display: 'grid', 
          gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' }, 
          gap: 3 
        }}
      >
        {filteredItems.map(item => (
          <Card 
            key={item.id}
            className="glass-card" 
            onClick={() => handleOpenDemo(item)}
            sx={{ 
              cursor: 'pointer',
              borderColor: item.progress === 100 ? 'success.light' : 'var(--border-glass)'
            }}
          >
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
                <Typography variant="h4" sx={{ fontWeight: 900, color: 'var(--text-main)' }}>
                  {item.title}
                </Typography>
                <IconButton 
                  size="small"
                  color={item.progress === 100 ? 'success' : 'default'}
                  onClick={(e: React.MouseEvent) => handleMarkAsLearned(item.id, e)}
                  sx={{ color: item.progress === 100 ? 'success.main' : 'var(--text-sub)' }}
                >
                  <CheckCircleIcon />
                </IconButton>
              </Box>

              <Typography variant="body2" sx={{ color: 'var(--text-sub)', minHeight: 44, mb: 2 }}>
                {item.description}
              </Typography>

              <LinearProgress 
                variant="determinate" 
                value={item.progress} 
                color="success"
                sx={{ height: 6, borderRadius: 3, bgcolor: 'action.hover' }}
              />
            </CardContent>
          </Card>
        ))}
      </Box>

      {/* SVG Animated Demo Modal */}
      <Dialog 
        open={openModal} 
        onClose={handleCloseDemo}
        slotProps={{
          paper: {
            sx: {
              borderRadius: '28px',
              width: '100%',
              maxWidth: 480,
              background: 'var(--bg-sidebar)',
              border: '2px solid var(--border-glass)',
              backdropFilter: 'blur(16px)',
            }
          }
        }}
      >
        <DialogTitle sx={{ fontWeight: 950, color: 'var(--text-main)' }}>
          Demonstrating "{selectedItem?.title}"
        </DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 3 }}>
          
          {/* Animated SVG Hand Geometry representing Hand pose */}
          <Box
            sx={{
              width: 200,
              height: 200,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '24px',
              backgroundColor: '#000000',
              border: '2px solid var(--border-glass)',
              mb: 3,
              position: 'relative',
              overflow: 'hidden'
            }}
          >
            {/* Glowing neon lines represent simulated skeletal tracking nodes */}
            <svg width="100%" height="100%" viewBox="0 0 100 100">
              {/* Wrist */}
              <circle cx="50" cy="85" r="4" fill="#00f2fe" className="glow-ring" />
              
              {/* Palm edges */}
              <line x1="50" y1="85" x2="30" y2="60" stroke="#ec38bc" strokeWidth="2.5" />
              <line x1="50" y1="85" x2="70" y2="60" stroke="#ec38bc" strokeWidth="2.5" />
              <line x1="30" y1="60" x2="70" y2="60" stroke="#ec38bc" strokeWidth="2.5" />

              {/* Dynamic Finger skeleton lines based on selection */}
              {selectedItem?.category === 'alphabet' ? (
                <>
                  {/* Closed fist finger skeleton for letters */}
                  <line x1="30" y1="60" x2="35" y2="48" stroke="#00f2fe" strokeWidth="3" />
                  <line x1="40" y1="60" x2="43" y2="50" stroke="#00f2fe" strokeWidth="3" />
                  <line x1="50" y1="60" x2="52" y2="51" stroke="#00f2fe" strokeWidth="3" />
                  <line x1="60" y1="60" x2="62" y2="52" stroke="#00f2fe" strokeWidth="3" />
                  {/* Thumb extended sideways */}
                  <line x1="70" y1="60" x2="82" y2="55" stroke="#00f2fe" strokeWidth="3" />
                  
                  {/* Finger joint dots */}
                  <circle cx="35" cy="48" r="3.5" fill="#ec38bc" />
                  <circle cx="43" cy="50" r="3.5" fill="#ec38bc" />
                  <circle cx="52" cy="51" r="3.5" fill="#ec38bc" />
                  <circle cx="62" cy="52" r="3.5" fill="#ec38bc" />
                  <circle cx="82" cy="55" r="3.5" fill="#ec38bc" />
                </>
              ) : (
                <>
                  {/* Open hand extended fingers for full signs */}
                  <line x1="30" y1="60" x2="20" y2="35" stroke="#00f2fe" strokeWidth="3" />
                  <line x1="40" y1="60" x2="35" y2="28" stroke="#00f2fe" strokeWidth="3" />
                  <line x1="50" y1="60" x2="50" y2="25" stroke="#00f2fe" strokeWidth="3" />
                  <line x1="60" y1="60" x2="65" y2="30" stroke="#00f2fe" strokeWidth="3" />
                  <line x1="70" y1="60" x2="80" y2="35" stroke="#00f2fe" strokeWidth="3" />
                  
                  {/* Finger joint dots */}
                  <circle cx="20" cy="35" r="3.5" fill="#ec38bc" />
                  <circle cx="35" cy="28" r="3.5" fill="#ec38bc" />
                  <circle cx="50" cy="25" r="3.5" fill="#ec38bc" />
                  <circle cx="65" cy="30" r="3.5" fill="#ec38bc" />
                  <circle cx="80" cy="35" r="3.5" fill="#ec38bc" />
                </>
              )}
            </svg>
            <Box className="scanning-line" sx={{ top: 0 }} />
          </Box>

          <Typography variant="body1" sx={{ color: 'var(--text-main)', textAlign: 'center', mb: 2, fontWeight: 600 }}>
            {selectedItem?.description}
          </Typography>
          <Typography variant="caption" sx={{ color: 'var(--text-sub)', display: 'block', textAlign: 'center' }}>
            Interactive AI demonstration guide. Perform this matching hand shape in the Sign-to-Text camera window.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button 
            variant="contained" 
            color="success" 
            startIcon={<CheckCircleIcon />}
            onClick={(e) => {
              if (selectedItem) {
                handleMarkAsLearned(selectedItem.id, e as any);
                handleCloseDemo();
              }
            }}
            sx={{ borderRadius: '12px', fontWeight: 700 }}
          >
            Mark as Learned
          </Button>
          <Button 
            variant="outlined" 
            onClick={handleCloseDemo}
            sx={{ borderRadius: '12px', fontWeight: 700 }}
          >
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

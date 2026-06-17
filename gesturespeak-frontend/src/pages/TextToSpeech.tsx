import { useState, useEffect } from 'react';
import { 
  Box, Card, CardContent, Typography, TextField, Button, Slider, 
  FormControl, InputLabel, Select, MenuItem, Stack, Divider 
} from '@mui/material';
import { VolumeUp as SpeakIcon, Pause as PauseIcon, BackHand as HandIcon } from '@mui/icons-material';
import { useAuth, BACKEND_URL } from '../context/AuthContext';

export default function TextToSpeech() {
  const { token } = useAuth();
  const [text, setText] = useState('');
  const [rate, setRate] = useState(1.0);
  const [pitch, setPitch] = useState(1.0);
  const [volume, setVolume] = useState(1.0);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoice, setSelectedVoice] = useState('');
  const [speaking, setSpeaking] = useState(false);

  // Text to sign state matching
  const [matchedSign, setMatchedSign] = useState<string | null>(null);
  const [signCategory, setSignCategory] = useState<'alphabet' | 'word' | null>(null);

  useEffect(() => {
    const loadVoices = () => {
      const availableVoices = window.speechSynthesis.getVoices();
      setVoices(availableVoices);
      if (availableVoices.length > 0 && !selectedVoice) {
        const defaultVoice = availableVoices.find(v => v.lang.startsWith('en')) || availableVoices[0];
        setSelectedVoice(defaultVoice.name);
      }
    };
    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;

    // Check status regularly
    const interval = setInterval(() => {
      setSpeaking(window.speechSynthesis.speaking);
    }, 100);

    return () => clearInterval(interval);
  }, [selectedVoice]);

  // Analyze text for sign matching
  useEffect(() => {
    if (!text || text.trim() === '') {
      setMatchedSign(null);
      setSignCategory(null);
      return;
    }

    const cleanText = text.toLowerCase()
                          .replace(/[?,!.]/g, '')
                          .trim();

    const vocabularyWords = ["help", "no", "please", "school", "thank_you", "thank you", "what", "who", "why", "yes", "you"];
    const foundWord = vocabularyWords.find(w => cleanText.includes(w));

    if (foundWord) {
      setMatchedSign(foundWord.toUpperCase());
      setSignCategory('word');
    } else if (cleanText.length === 1 && cleanText.match(/[a-z]/i)) {
      setMatchedSign(cleanText.toUpperCase());
      setSignCategory('alphabet');
    } else {
      // If we contain any characters, display the first character as a fingerspell fallback
      const firstLetter = cleanText.substring(0, 1).toUpperCase();
      if (firstLetter.match(/[A-Z]/)) {
        setMatchedSign(firstLetter);
        setSignCategory('alphabet');
      } else {
        setMatchedSign(null);
        setSignCategory(null);
      }
    }
  }, [text]);

  const handleSpeak = () => {
    if (!text || text.trim() === '') return;
    
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = rate;
    utterance.pitch = pitch;
    utterance.volume = volume;

    if (selectedVoice) {
      const voice = voices.find(v => v.name === selectedVoice);
      if (voice) utterance.voice = voice;
    }

    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);
    
    setSpeaking(true);
    window.speechSynthesis.speak(utterance);

    // Save transaction to history as "Text to Sign"
    if (token) {
      fetch(`${BACKEND_URL}/api/history`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          original: text,
          translated: matchedSign ? `Gesture: ${matchedSign}` : "[Speech Vocalization]",
          type: "Text to Sign",
          mode: "speak",
          confidence: 1.0
        })
      }).catch(err => console.warn("Failed to log Text to Sign action:", err));
    }
  };

  const handleStop = () => {
    window.speechSynthesis.cancel();
    setSpeaking(false);
  };

  return (
    <Box sx={{ maxWidth: 1000, mx: 'auto' }}>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: '1.2fr 0.8fr' },
          gap: 4
        }}
      >
        {/* Left Side: Speech Synthesizer Controls */}
        <Card className="glass-card">
          <CardContent sx={{ p: 4 }}>
            <Typography variant="h5" sx={{ fontWeight: 900, mb: 1, color: 'var(--text-main)' }}>
              Text to Speech & Sign
            </Typography>
            <Typography variant="body2" sx={{ color: 'var(--text-sub)', mb: 3 }}>
              Type any phrase to generate vocal audio and translate words into visual skeletal sign indicators.
            </Typography>

            <TextField
              multiline
              rows={4}
              fullWidth
              placeholder="Type your phrase here..."
              value={text}
              onChange={(e) => setText(e.target.value)}
              sx={{
                mb: 3,
                '& .MuiOutlinedInput-root': {
                  borderRadius: '16px',
                  color: 'var(--text-main)',
                  '& fieldset': { borderColor: 'var(--border-glass)' },
                },
              }}
            />

            <Stack spacing={3} sx={{ mb: 4 }}>
              <Box>
                <Typography variant="caption" sx={{ color: 'var(--text-sub)', fontWeight: 700 }}>
                  SPEED RATE ({rate.toFixed(1)}x)
                </Typography>
                <Slider
                  value={rate}
                  min={0.5}
                  max={2.0}
                  step={0.1}
                  onChange={(_, val) => setRate(val as number)}
                />
              </Box>

              <Box>
                <Typography variant="caption" sx={{ color: 'var(--text-sub)', fontWeight: 700 }}>
                  PITCH ({pitch.toFixed(1)})
                </Typography>
                <Slider
                  value={pitch}
                  min={0.5}
                  max={2.0}
                  step={0.1}
                  onChange={(_, val) => setPitch(val as number)}
                />
              </Box>

              <Box>
                <Typography variant="caption" sx={{ color: 'var(--text-sub)', fontWeight: 700 }}>
                  VOLUME ({Math.round(volume * 100)}%)
                </Typography>
                <Slider
                  value={volume}
                  min={0.0}
                  max={1.0}
                  step={0.1}
                  onChange={(_, val) => setVolume(val as number)}
                />
              </Box>

              <FormControl fullWidth size="small">
                <InputLabel id="voice-accent-label" sx={{ color: 'var(--text-sub)' }}>Voice Accent</InputLabel>
                <Select
                  labelId="voice-accent-label"
                  value={selectedVoice}
                  label="Voice Accent"
                  onChange={(e) => setSelectedVoice(e.target.value)}
                  sx={{
                    borderRadius: '12px',
                    color: 'var(--text-main)',
                    '& fieldset': { borderColor: 'var(--border-glass)' },
                  }}
                >
                  {voices.map(voice => (
                    <MenuItem key={voice.name} value={voice.name}>
                      {voice.name} ({voice.lang})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Stack>

            <Stack direction="row" spacing={2}>
              <Button
                variant="contained"
                onClick={handleSpeak}
                disabled={!text}
                className="premium-btn"
                startIcon={<SpeakIcon />}
                sx={{ flexGrow: 1, py: 1.5 }}
              >
                SPEAK & SYNTHESIZE
              </Button>
              {speaking && (
                <Button
                  variant="outlined"
                  color="error"
                  onClick={handleStop}
                  startIcon={<PauseIcon />}
                  sx={{ borderRadius: '12px', px: 3 }}
                >
                  STOP
                </Button>
              )}
            </Stack>
          </CardContent>
        </Card>

        {/* Right Side: Text to Sign Visual Skeletal Tracking Guide */}
        <Card className="glass-card" sx={{ display: 'flex', flexDirection: 'column' }}>
          <CardContent sx={{ p: 4, display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'center' }}>
            <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center', mb: 2 }}>
              <HandIcon sx={{ color: '#ec38bc' }} />
              <Typography variant="h6" sx={{ fontWeight: 900, color: 'var(--text-main)' }}>
                TEXT TO SIGN TRANSLATOR
              </Typography>
            </Box>
            <Divider sx={{ borderColor: 'var(--border-glass)', mb: 3 }} />

            <Box
              sx={{
                flexGrow: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                py: 2
              }}
            >
              {matchedSign ? (
                <>
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

                      {signCategory === 'alphabet' ? (
                        <>
                          {/* Closed fist finger skeleton for letters */}
                          <line x1="30" y1="60" x2="35" y2="48" stroke="#00f2fe" strokeWidth="3" />
                          <line x1="40" y1="60" x2="43" y2="50" stroke="#00f2fe" strokeWidth="3" />
                          <line x1="50" y1="60" x2="52" y2="51" stroke="#00f2fe" strokeWidth="3" />
                          <line x1="60" y1="60" x2="62" y2="52" stroke="#00f2fe" strokeWidth="3" />
                          {/* Thumb extended sideways */}
                          <line x1="70" y1="60" x2="82" y2="55" stroke="#00f2fe" strokeWidth="3" />
                          
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

                  <Typography variant="h6" sx={{ fontWeight: 900, color: 'var(--text-main)', textAlign: 'center', mb: 1 }}>
                    Sign shape: "{matchedSign}"
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'var(--text-sub)', textAlign: 'center', px: 2 }}>
                    {signCategory === 'alphabet' 
                      ? `Fingerspell pose corresponding to letter '${matchedSign}'.` 
                      : `Skeletal hand structure for vocabulary sign '${matchedSign}'.`}
                  </Typography>
                </>
              ) : (
                <Box sx={{ textAlign: 'center', py: 4, px: 2 }}>
                  <Box sx={{ fontSize: '3rem', opacity: 0.15, mb: 2 }}>
                    👋
                  </Box>
                  <Typography variant="body1" sx={{ color: 'var(--text-main)', fontWeight: 700, mb: 1 }}>
                    No gesture cues generated
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'var(--text-sub)' }}>
                    Type letters (A-Z) or vocabulary words (e.g. "please", "help", "thank you") to see dynamic sign skeletal structures.
                  </Typography>
                </Box>
              )}
            </Box>
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
}

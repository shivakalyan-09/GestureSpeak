import { useState, useEffect } from 'react';
import { 
  Box, Card, CardContent, Typography, TextField, Button, Slider, 
  FormControl, InputLabel, Select, MenuItem, Stack 
} from '@mui/material';
import { VolumeUp as SpeakIcon, Pause as PauseIcon } from '@mui/icons-material';

export default function TextToSpeech() {
  const [text, setText] = useState('');
  const [rate, setRate] = useState(1.0);
  const [pitch, setPitch] = useState(1.0);
  const [volume, setVolume] = useState(1.0);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoice, setSelectedVoice] = useState('');
  const [speaking, setSpeaking] = useState(false);

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
  };

  const handleStop = () => {
    window.speechSynthesis.cancel();
    setSpeaking(false);
  };

  return (
    <Box sx={{ maxWidth: 600, mx: 'auto' }}>
      <Card className="glass-card">
        <CardContent sx={{ p: 4 }}>
          <Typography variant="h5" sx={{ fontWeight: 900, mb: 1, color: 'var(--text-main)' }}>
            Text to Speech Playground
          </Typography>
          <Typography variant="body2" sx={{ color: 'var(--text-sub)', mb: 3 }}>
            Type any phrase to convert it into vocal speech with custom adjustments.
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
              SPEAK ALOUD
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
    </Box>
  );
}

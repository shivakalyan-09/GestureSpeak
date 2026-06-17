import { useState, useEffect, useRef } from 'react';
import { 
  Box, Card, CardContent, Typography, TextField, Button, 
  FormControl, InputLabel, Select, MenuItem, Stack, IconButton, Snackbar, Alert, Chip
} from '@mui/material';
import { translateText, LANGUAGES } from '../services/translation';
import { useAuth, BACKEND_URL } from '../context/AuthContext';
import {
  Translate as TranslateIcon,
  ContentCopy as CopyIcon,
  VolumeUp as SpeakIcon,
  Refresh as ClearIcon,
  CompareArrows as SwapIcon,
  Stop as StopIcon,
  Mic as MicIcon,
  MicOff as MicOffIcon
} from '@mui/icons-material';

export default function LiveTranslate() {
  const { token } = useAuth();
  
  const [sourceLang, setSourceLang] = useState('en');
  const [targetLang, setTargetLang] = useState('te');
  const [inputText, setInputText] = useState('');
  const [translatedText, setTranslatedText] = useState('');
  const [loading, setLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [status, setStatus] = useState<string>('Idle'); // 'Idle' | 'Translating' | 'Success' | 'Failed'
  const [speaking, setSpeaking] = useState(false);

  const activeAudioRef = useRef<HTMLAudioElement | null>(null);
  const recognitionRef = useRef<any>(null);

  const [listening, setListening] = useState(false);
  const [isDictated, setIsDictated] = useState(false);

  // Monitor speaking status
  useEffect(() => {
    const interval = setInterval(() => {
      setSpeaking(window.speechSynthesis.speaking || (activeAudioRef.current !== null && !activeAudioRef.current.paused));
    }, 200);

    // Prime the voices
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.getVoices();
      window.speechSynthesis.onvoiceschanged = () => {
        window.speechSynthesis.getVoices();
      };
    }

    // Initialize Web Speech API
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.continuous = false;
      rec.interimResults = false;
      
      rec.onstart = () => {
        setListening(true);
      };
      
      rec.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInputText(prev => (prev ? prev + ' ' : '') + transcript);
        setIsDictated(true);
        setStatus('Idle');
      };
      
      rec.onerror = (event: any) => {
        console.error("Speech recognition error:", event);
        setListening(false);
      };
      
      rec.onend = () => {
        setListening(false);
      };
      
      recognitionRef.current = rec;
    }

    return () => clearInterval(interval);
  }, []);

  const handleToggleListening = () => {
    if (listening) {
      recognitionRef.current?.stop();
    } else {
      if (!recognitionRef.current) {
        // Fallback simulated dictation if browser doesn't support Web Speech API
        const voicePrompts = [
          "hello",
          "how are you",
          "thank you",
          "please help me",
          "where is the school"
        ];
        const randomPrompt = voicePrompts[Math.floor(Math.random() * voicePrompts.length)];
        setInputText(prev => (prev ? prev + ' ' : '') + randomPrompt);
        setIsDictated(true);
        setStatus('Idle');
        setToastMessage("Microphone API simulated: '" + randomPrompt + "'");
        return;
      }
      
      const langObj = LANGUAGES.find(l => l.code === sourceLang);
      recognitionRef.current.lang = langObj ? langObj.locale : 'en-US';
      recognitionRef.current.start();
    }
  };

  const handleTranslate = async () => {
    if (!inputText || inputText.trim() === '') return;
    setLoading(true);
    setStatus('Translating');
    setErrorMsg(null);
    try {
      const res = await translateText(inputText, targetLang, sourceLang);
      setTranslatedText(res);
      setStatus('Success');

      // Save translation to history database
      if (token) {
        await fetch(`${BACKEND_URL}/api/history`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            original: inputText,
            translated: res,
            type: isDictated ? "Voice Translate" : "Live Translate",
            mode: "translate",
            confidence: 1.0
          })
        });
      }
    } catch (e: any) {
      console.error("Translation logic error caught:", e);
      setErrorMsg(e.message || "Translation Failed. Please try again.");
      setTranslatedText('');
      setStatus('Failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSpeak = () => {
    const textToSpeak = translatedText || inputText;
    const langToUse = translatedText ? targetLang : sourceLang;
    
    if (!textToSpeak || textToSpeak.trim() === '') return;
    
    handleStopSpeaking();
    
    const langObj = LANGUAGES.find(l => l.code === langToUse);
    const locale = langObj ? langObj.locale : 'en-US';

    // If it's English, try to use native speechSynthesis first for lower latency
    if (langToUse === 'en') {
      const voices = window.speechSynthesis.getVoices();
      let matchingVoice = voices.find(v => v.lang === locale || v.lang.toLowerCase() === locale.toLowerCase().replace('_', '-'));
      if (!matchingVoice) {
        matchingVoice = voices.find(v => v.lang.startsWith('en-') || v.lang.toLowerCase().startsWith('en'));
      }
      if (matchingVoice) {
        const utterance = new SpeechSynthesisUtterance(textToSpeak);
        utterance.lang = locale;
        utterance.voice = matchingVoice;
        utterance.onstart = () => setSpeaking(true);
        utterance.onend = () => setSpeaking(false);
        utterance.onerror = () => setSpeaking(false);
        window.speechSynthesis.speak(utterance);
        console.log(`TTS: Speaking English natively using voice: ${matchingVoice.name}`);
        return;
      }
    }

    // For all non-English languages (or if English native voice is missing), use Google TTS API proxy first
    console.log(`TTS: Prioritizing Google TTS API via Backend Proxy for language: ${langToUse}`);
    
    const fetchTtsAndPlay = async () => {
      try {
        const response = await fetch(`${BACKEND_URL}/api/tts`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            text: textToSpeak,
            lang: langToUse
          })
        });

        if (!response.ok) {
          throw new Error(`TTS server status ${response.status}`);
        }

        const blob = await response.blob();
        const ttsUrl = URL.createObjectURL(blob);
        const audio = new Audio(ttsUrl);
        activeAudioRef.current = audio;
        
        setSpeaking(true);
        audio.onended = () => {
          setSpeaking(false);
          activeAudioRef.current = null;
          URL.revokeObjectURL(ttsUrl);
        };
        audio.onerror = () => {
          setSpeaking(false);
          activeAudioRef.current = null;
          URL.revokeObjectURL(ttsUrl);
          fallbackToDefaultVoice();
        };
        
        audio.play().catch(err => {
          console.error("Google TTS play catch:", err);
          fallbackToDefaultVoice();
        });
      } catch (err) {
        console.error("Google TTS POST failed:", err);
        fallbackToDefaultVoice();
      }
    };

    const fallbackToDefaultVoice = () => {
      console.warn("Google TTS fallback to browser SpeechSynthesis.");
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(textToSpeak);
      utterance.lang = locale;
      utterance.onstart = () => setSpeaking(true);
      utterance.onend = () => setSpeaking(false);
      utterance.onerror = () => setSpeaking(false);
      window.speechSynthesis.speak(utterance);
    };

    fetchTtsAndPlay();
  };

  const handleStopSpeaking = () => {
    window.speechSynthesis.cancel();
    if (activeAudioRef.current) {
      activeAudioRef.current.pause();
      activeAudioRef.current = null;
    }
    setSpeaking(false);
  };

  const handleSwap = () => {
    const temp = sourceLang;
    setSourceLang(targetLang);
    setTargetLang(temp);
    
    const tempText = inputText;
    setInputText(translatedText);
    setTranslatedText(tempText);
    setErrorMsg(null);
    setStatus('Idle');
  };

  const handleCopy = (text: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setToastMessage("Copied to clipboard!");
  };

  const handleClear = () => {
    setInputText('');
    setTranslatedText('');
    setErrorMsg(null);
    setStatus('Idle');
    setIsDictated(false);
    window.speechSynthesis.cancel();
  };

  return (
    <Box sx={{ maxWidth: '1000px', mx: 'auto', px: 2 }}>
      {errorMsg && (
        <Alert severity="error" sx={{ mb: 3, borderRadius: '12px' }} onClose={() => setErrorMsg(null)}>
          {errorMsg}
        </Alert>
      )}

      {/* Current Configuration & Status Bar */}
      <Card className="glass-card" sx={{ mb: 3 }}>
        <CardContent sx={{ p: 2, display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 2 }}>
          <Box>
            <Typography variant="caption" sx={{ color: 'var(--text-sub)', fontWeight: 800, display: 'block', mb: 0.5, letterSpacing: 0.5 }}>
              TRANSLATION FLOW
            </Typography>
            <Typography variant="body1" sx={{ color: 'var(--text-main)', fontWeight: 800 }}>
              {LANGUAGES.find(l => l.code === sourceLang)?.name} ({LANGUAGES.find(l => l.code === sourceLang)?.locale})
              &nbsp;➔&nbsp;
              {LANGUAGES.find(l => l.code === targetLang)?.name} ({LANGUAGES.find(l => l.code === targetLang)?.locale})
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Typography variant="caption" sx={{ color: 'var(--text-sub)', fontWeight: 800 }}>
              TRANSLATION STATUS:
            </Typography>
            <Chip 
              label={status} 
              color={status === 'Success' ? 'success' : status === 'Failed' ? 'error' : status === 'Translating' ? 'primary' : 'default'} 
              size="small"
              sx={{ fontWeight: 900, borderRadius: '8px', px: 1 }}
            />
          </Box>
        </CardContent>
      </Card>

      {/* Language Selection Selectors */}
      <Box 
        sx={{ 
          display: 'grid', 
          gridTemplateColumns: { xs: '1fr', sm: '2fr auto 2fr' }, 
          gap: 2, 
          alignItems: 'center', 
          mb: 3 
        }}
      >
        <Box>
          <FormControl fullWidth size="small">
            <InputLabel id="source-lang-label" sx={{ color: 'var(--text-sub)' }}>Translate From</InputLabel>
            <Select
              labelId="source-lang-label"
              value={sourceLang}
              label="Translate From"
              onChange={(e) => {
                setSourceLang(e.target.value);
                setStatus('Idle');
              }}
              sx={{
                borderRadius: '12px',
                color: 'var(--text-main)',
                '& fieldset': { borderColor: 'var(--border-glass)' },
              }}
            >
              {LANGUAGES.map(lang => (
                <MenuItem key={lang.code} value={lang.code}>{lang.name}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>

        <Box sx={{ display: 'flex', justifyContent: 'center' }}>
          <IconButton onClick={handleSwap} sx={{ backgroundColor: 'action.hover', color: 'primary.main', p: 1 }}>
            <SwapIcon />
          </IconButton>
        </Box>

        <Box>
          <FormControl fullWidth size="small">
            <InputLabel id="target-lang-label" sx={{ color: 'var(--text-sub)' }}>Translate To</InputLabel>
            <Select
              labelId="target-lang-label"
              value={targetLang}
              label="Translate To"
              onChange={(e) => {
                setTargetLang(e.target.value);
                setStatus('Idle');
              }}
              sx={{
                borderRadius: '12px',
                color: 'var(--text-main)',
                '& fieldset': { borderColor: 'var(--border-glass)' },
              }}
            >
              {LANGUAGES.map(lang => (
                <MenuItem key={lang.code} value={lang.code}>{lang.name}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
      </Box>

      {/* Input / Output Workspace Panels */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3 }}>
        {/* Input Text Box */}
        <Box>
          <Card className="glass-card" sx={{ height: '100%', minHeight: 280 }}>
            <CardContent sx={{ p: 3, display: 'flex', flexDirection: 'column', height: '90%' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="caption" sx={{ fontWeight: 800, color: 'var(--text-main)', letterSpacing: 0.5 }}>
                  INPUT TEXT ({LANGUAGES.find(l => l.code === sourceLang)?.name.toUpperCase()})
                </Typography>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <IconButton 
                    size="small" 
                    onClick={handleToggleListening} 
                    color={listening ? 'error' : 'primary'}
                    sx={{
                      animation: listening ? 'pulse 1.5s infinite' : 'none',
                      '@keyframes pulse': {
                        '0%': { transform: 'scale(1)', opacity: 1 },
                        '50%': { transform: 'scale(1.15)', opacity: 0.7 },
                        '100%': { transform: 'scale(1)', opacity: 1 }
                      }
                    }}
                  >
                    {listening ? <MicOffIcon fontSize="small" /> : <MicIcon fontSize="small" />}
                  </IconButton>
                  {inputText && (
                    <IconButton size="small" onClick={handleClear}>
                      <ClearIcon fontSize="small" />
                    </IconButton>
                  )}
                </Box>
              </Box>

              <TextField
                multiline
                rows={6}
                fullWidth
                placeholder="Enter text here..."
                value={inputText}
                onChange={(e) => {
                  setInputText(e.target.value);
                  setIsDictated(false);
                  setStatus('Idle');
                }}
                sx={{
                  flexGrow: 1,
                  '& .MuiOutlinedInput-root': {
                    borderRadius: '16px',
                    color: 'var(--text-main)',
                    '& fieldset': { borderColor: 'var(--border-glass)' },
                  },
                }}
              />
            </CardContent>
          </Card>
        </Box>

        {/* Translation Output Box */}
        <Box>
          <Card className="glass-card" sx={{ height: '100%', minHeight: 280 }}>
            <CardContent sx={{ p: 3, display: 'flex', flexDirection: 'column', height: '90%' }}>
              <Typography variant="caption" sx={{ fontWeight: 800, color: 'var(--text-main)', mb: 2, letterSpacing: 0.5 }}>
                TRANSLATION OUTPUT ({LANGUAGES.find(l => l.code === targetLang)?.name.toUpperCase()})
              </Typography>

              {translatedText ? (
                <Box sx={{ display: 'flex', flexDirection: 'column', flexGrow: 1 }}>
                  <Typography variant="h5" sx={{ fontWeight: 800, color: 'var(--text-main)', flexGrow: 1, mb: 3, whiteSpace: 'pre-wrap' }}>
                    {translatedText}
                  </Typography>
                </Box>
              ) : (
                <Box sx={{ py: 6, textAlign: 'center', flexGrow: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Typography variant="body2" sx={{ color: 'var(--text-sub)' }}>
                    Translation output will appear here.
                  </Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </Box>
      </Box>

      {/* Control Action Toolbar Card */}
      <Card className="glass-card" sx={{ mt: 3, mb: 4 }}>
        <CardContent sx={{ p: 2 }}>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ justifyContent: 'center', alignItems: 'center' }}>
            <Button
              variant="contained"
              onClick={handleTranslate}
              disabled={loading || !inputText}
              className="premium-btn"
              startIcon={<TranslateIcon />}
              sx={{ px: 3, py: 1.2, borderRadius: '12px', minWidth: 150, textTransform: 'none', fontWeight: 700 }}
            >
              {loading ? 'Translating...' : 'Translate'}
            </Button>
            
            <Button
              variant="outlined"
              color="primary"
              onClick={handleSpeak}
              disabled={!inputText && !translatedText}
              startIcon={<SpeakIcon />}
              sx={{ px: 3, py: 1.2, borderRadius: '12px', borderColor: 'var(--border-glass)', minWidth: 120, textTransform: 'none', fontWeight: 700 }}
            >
              Speak
            </Button>
            
            <Button
              variant="outlined"
              color="error"
              onClick={handleStopSpeaking}
              disabled={!speaking}
              startIcon={<StopIcon />}
              sx={{ px: 3, py: 1.2, borderRadius: '12px', minWidth: 120, textTransform: 'none', fontWeight: 700 }}
            >
              Stop
            </Button>
            
            <Button
              variant="outlined"
              color="secondary"
              onClick={() => handleCopy(translatedText)}
              disabled={!translatedText}
              startIcon={<CopyIcon />}
              sx={{ px: 3, py: 1.2, borderRadius: '12px', minWidth: 170, textTransform: 'none', fontWeight: 700 }}
            >
              Copy Translation
            </Button>
            
            <Button
              variant="outlined"
              color="inherit"
              onClick={handleClear}
              disabled={!inputText && !translatedText}
              startIcon={<ClearIcon />}
              sx={{ px: 3, py: 1.2, borderRadius: '12px', color: 'var(--text-sub)', minWidth: 110, textTransform: 'none', fontWeight: 700 }}
            >
              Clear
            </Button>
          </Stack>
        </CardContent>
      </Card>

      {/* Toast notifications */}
      <Snackbar open={!!toastMessage} autoHideDuration={2000} onClose={() => setToastMessage(null)}>
        <Alert severity="success" onClose={() => setToastMessage(null)} sx={{ borderRadius: '12px' }}>
          {toastMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
}

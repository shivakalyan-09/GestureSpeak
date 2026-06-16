import { useState, useEffect } from 'react';
import { 
  Box, Typography, Card, CardContent, Slider, FormControl, 
  InputLabel, Select, MenuItem, Stack, IconButton, Alert, Snackbar,
  CircularProgress, Button, Divider
} from '@mui/material';
import CameraSignDetection from '../components/CameraSignDetection';
import { predictSign } from '../services/prediction';
import { translateText, LANGUAGES } from '../services/translation';
import { useAuth } from '../context/AuthContext';
import {
  ContentCopy as CopyIcon,
  VolumeUp as SpeakIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';

export default function SignDetection() {
  const { token } = useAuth();
  
  const [isRecording, setIsRecording] = useState(false);
  const [resultText, setResultText] = useState<string>('');
  const [confidence, setConfidence] = useState<number>(0);
  const [predictedWords, setPredictedWords] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Translation State
  const [targetLang, setTargetLang] = useState('en');
  const [translatedText, setTranslatedText] = useState('');
  const [isTranslating, setIsTranslating] = useState(false);

  // Speech settings
  const [speechRate, setSpeechRate] = useState(1.0);
  const [speechVolume, setSpeechVolume] = useState(1.0);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoice, setSelectedVoice] = useState<string>('');

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Load voices for Speech Synthesis
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
  }, [selectedVoice]);

  const handleStartRecording = () => {
    setIsRecording(true);
    setResultText('');
    setConfidence(0);
    setTranslatedText('');
  };

  const handleStopRecording = async (sequences: number[][]) => {
    setIsRecording(false);
    if (sequences.length === 0) {
      setError("No landmarks captured. Please position your hand in the camera frame.");
      return;
    }

    try {
      const pred = await predictSign(sequences);
      setResultText(pred.label);
      setConfidence(pred.confidence);
      
      // Add to session predictions
      setPredictedWords(prev => [pred.label, ...prev].slice(0, 5));

      // Trigger translation if target is not English, and speak result in correct language
      let transLabel = pred.label;
      if (targetLang !== 'en') {
        const trans = await translate(pred.label, targetLang);
        if (trans) {
          transLabel = trans;
          speakText(trans, targetLang);
        } else {
          speakText(pred.label, 'en');
        }
      } else {
        setTranslatedText('');
        speakText(pred.label, 'en');
      }

      // Save to server database
      savePrediction(pred.label, transLabel, pred.confidence);
    } catch (err) {
      console.error(err);
      setError("Model prediction failed. Fallback heuristic was triggered.");
    }
  };

  const translate = async (text: string, langCode: string) => {
    setIsTranslating(true);
    try {
      const trans = await translateText(text, langCode, 'en');
      setTranslatedText(trans);
      return trans;
    } catch (err) {
      console.error(err);
      setTranslatedText("Translation Failed. Please try again.");
      return null;
    } finally {
      setIsTranslating(false);
    }
  };

  const handleLangChange = (event: any) => {
    const code = event.target.value;
    setTargetLang(code);
    if (resultText) {
      translate(resultText, code);
    }
  };

  const speakText = (text: string, langCode: string = 'en') => {
    if (!text || text.trim() === '') return;
    window.speechSynthesis.cancel();
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = speechRate;
    utterance.volume = speechVolume;

    const langObj = LANGUAGES.find(l => l.code === langCode);
    const locale = langObj ? langObj.locale : 'en-US';
    utterance.lang = locale;

    const availableVoices = window.speechSynthesis.getVoices();
    let matchingVoice = availableVoices.find(v => v.lang === locale || v.lang.toLowerCase() === locale.toLowerCase().replace('_', '-'));
    
    if (!matchingVoice) {
      matchingVoice = availableVoices.find(v => v.lang.startsWith(langCode + '-') || v.lang.toLowerCase().startsWith(langCode));
    }

    if (matchingVoice) {
      utterance.voice = matchingVoice;
      console.log(`Speaking prediction "${text}" using voice: ${matchingVoice.name} (${matchingVoice.lang})`);
    } else if (selectedVoice && langCode === 'en') {
      const voice = availableVoices.find(v => v.name === selectedVoice);
      if (voice) utterance.voice = voice;
    }

    window.speechSynthesis.speak(utterance);
  };

  const handleCopy = (textToCopy: string) => {
    navigator.clipboard.writeText(textToCopy);
    setToastMessage("Copied to clipboard!");
  };

  const handleClear = () => {
    setResultText('');
    setConfidence(0);
    setTranslatedText('');
  };

  const savePrediction = async (word: string, translatedWord: string, conf: number) => {
    if (!token) return;
    try {
      await fetch(`http://localhost:8080/api/history`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          original: word,
          translated: translatedWord,
          type: "Sign Language to Text",
          mode: "text",
          confidence: conf / 100
        })
      });
    } catch (e) {
      console.warn("Could not sync history item with Spring Boot backend.", e);
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '7fr 5fr' }, gap: 4 }}>
        {/* Camera block */}
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 900, mb: 2, color: 'var(--text-main)', letterSpacing: 0.5 }}>
            AI GESTURE LIVE WORKSPACE
          </Typography>
          <CameraSignDetection
            isRecording={isRecording}
            onStartRecording={handleStartRecording}
            onStopRecording={handleStopRecording}
          />
        </Box>

        {/* Translation details and TTS block */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <Typography variant="h6" sx={{ fontWeight: 900, color: 'var(--text-main)', letterSpacing: 0.5 }}>
            TRANSLATION & VOICE ENGINE
          </Typography>

          {/* Prediction Result Display */}
          <Card className="glass-card">
            <CardContent sx={{ p: 3 }}>
              <Typography variant="caption" sx={{ fontWeight: 800, color: 'primary.main', display: 'block', mb: 1, letterSpacing: 1 }}>
                DETECTED SIGN LANGUAGE
              </Typography>
              
              {resultText ? (
                <Box>
                  <Typography variant="h3" sx={{ fontWeight: 900, color: 'var(--text-main)', mb: 1, textTransform: 'capitalize' }}>
                    {resultText.replace("_", " ")}
                  </Typography>
                  <Typography variant="body2" sx={{ color: confidence > 70 ? 'success.main' : 'warning.main', fontWeight: 700, mb: 2 }}>
                    Confidence score: {confidence}%
                  </Typography>

                  {/* Dynamic translation inside card */}
                  {isTranslating ? (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 1 }}>
                      <CircularProgress size={20} />
                      <Typography variant="caption" sx={{ color: 'var(--text-sub)' }}>Translating...</Typography>
                    </Box>
                  ) : (
                    translatedText && (
                      <Box sx={{ mt: 2, p: 2, borderRadius: '16px', background: 'action.hover' }}>
                        <Typography variant="caption" sx={{ fontWeight: 800, color: 'secondary.main', display: 'block', mb: 0.5 }}>
                          TRANSLATED ({LANGUAGES.find(l => l.code === targetLang)?.name.toUpperCase()})
                        </Typography>
                        <Typography variant="h5" sx={{ fontWeight: 800, color: 'var(--text-main)' }}>
                          {translatedText}
                        </Typography>
                      </Box>
                    )
                  )}

                  {/* Actions buttons */}
                  <Stack direction="row" spacing={1} sx={{ mt: 3 }}>
                    <IconButton color="primary" onClick={() => speakText(translatedText || resultText, translatedText ? targetLang : 'en')}>
                      <SpeakIcon />
                    </IconButton>
                    <IconButton onClick={() => handleCopy(translatedText || resultText)}>
                      <CopyIcon />
                    </IconButton>
                    <IconButton onClick={handleClear}>
                      <RefreshIcon />
                    </IconButton>
                  </Stack>
                </Box>
              ) : (
                <Box sx={{ py: 4, textAlign: 'center' }}>
                  <Typography variant="body2" sx={{ color: 'var(--text-sub)' }}>
                    Press 'Start Recording' and perform your gesture sign in front of the webcam.
                  </Typography>
                </Box>
              )}
            </CardContent>
          </Card>

          {/* Session predictions history */}
          {predictedWords.length > 0 && (
            <Card className="glass-card">
              <CardContent sx={{ p: 3 }}>
                <Typography variant="caption" sx={{ fontWeight: 800, color: 'var(--text-sub)', display: 'block', mb: 1, letterSpacing: 0.5 }}>
                  SESSION PREDICTION HISTORY
                </Typography>
                <Divider sx={{ mb: 1.5, borderColor: 'var(--border-glass)' }} />
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {predictedWords.map((word, idx) => (
                    <Button 
                      key={idx} 
                      size="small" 
                      variant="outlined" 
                      onClick={() => speakText(word)}
                      sx={{ textTransform: 'capitalize', borderRadius: '8px' }}
                    >
                      {word.replace("_", " ")}
                    </Button>
                  ))}
                </Box>
              </CardContent>
            </Card>
          )}

          {/* Translation Control */}
          <Card className="glass-card">
            <CardContent sx={{ p: 3 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 800, color: 'var(--text-main)', mb: 2 }}>
                TARGET TRANSLATION LANGUAGE
              </Typography>
              <FormControl fullWidth size="small">
                <InputLabel id="target-lang-label" sx={{ color: 'var(--text-sub)' }}>Select Language</InputLabel>
                <Select
                  labelId="target-lang-label"
                  value={targetLang}
                  label="Select Language"
                  onChange={handleLangChange}
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
            </CardContent>
          </Card>

          {/* Text to Speech settings */}
          <Card className="glass-card">
            <CardContent sx={{ p: 3 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 800, color: 'var(--text-main)', mb: 2 }}>
                SPEECH CONTROLLER (TTS)
              </Typography>

              <Stack spacing={2}>
                <Box>
                  <Typography variant="caption" sx={{ color: 'var(--text-sub)', fontWeight: 600 }}>SPEED RATE ({speechRate.toFixed(1)}x)</Typography>
                  <Slider
                    size="small"
                    value={speechRate}
                    min={0.5}
                    max={2.0}
                    step={0.1}
                    onChange={(_, val) => setSpeechRate(val as number)}
                  />
                </Box>

                <Box>
                  <Typography variant="caption" sx={{ color: 'var(--text-sub)', fontWeight: 600 }}>VOLUME ({Math.round(speechVolume * 100)}%)</Typography>
                  <Slider
                    size="small"
                    value={speechVolume}
                    min={0.0}
                    max={1.0}
                    step={0.1}
                    onChange={(_, val) => setSpeechVolume(val as number)}
                  />
                </Box>

                <FormControl fullWidth size="small">
                  <InputLabel id="voice-label" sx={{ color: 'var(--text-sub)' }}>Voice Accent</InputLabel>
                  <Select
                    labelId="voice-label"
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
            </CardContent>
          </Card>
        </Box>
      </Box>

      {/* error snackbar */}
      {error && (
        <Snackbar open={!!error} autoHideDuration={6000} onClose={() => setError(null)}>
          <Alert severity="warning" onClose={() => setError(null)} sx={{ borderRadius: '12px' }}>
            {error}
          </Alert>
        </Snackbar>
      )}

      {/* Copy Toast notifications */}
      <Snackbar open={!!toastMessage} autoHideDuration={2000} onClose={() => setToastMessage(null)}>
        <Alert severity="success" onClose={() => setToastMessage(null)} sx={{ borderRadius: '12px' }}>
          {toastMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
}

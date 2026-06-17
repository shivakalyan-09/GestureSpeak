import { useEffect, useState } from 'react';
import { 
  Box, Card, CardContent, Typography, TextField, Button,
  IconButton, Stack, Alert, Snackbar, Tooltip
} from '@mui/material';
import { useAuth } from '../context/AuthContext';
import { getBackendUrl } from '../context/AuthContext';
import {
  Search as SearchIcon,
  Delete as DeleteIcon,
  FileDownload as ExportIcon,
  ClearAll as ClearIcon,
  CameraAlt as CameraIcon,
  Translate as TranslateIcon,
  ContentCopy as CopyIcon
} from '@mui/icons-material';

interface HistoryItem {
  id: string;
  original: string;
  translated: string;
  type: string;
  mode: string;
  confidence: number;
  timestamp: number;
  timeFormatted: string;
}

export default function History() {
  const { token } = useAuth();
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [search, setSearch] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const fetchHistory = async () => {
    if (!token) return;
    try {
      const res = await fetch(`${getBackendUrl()}/api/history`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setHistory(await res.json());
      }
    } catch (e) {
      console.warn("Spring Boot backend offline, seeding frontend mock states for history logs.", e);
      // Mock Data
      setHistory([
        { id: '1', original: 'Live Gesture Detection', translated: 'thank_you', type: 'Gesture to TEXT', mode: 'text', confidence: 0.98, timestamp: Date.now() - 300000, timeFormatted: '04:15 PM' },
        { id: '2', original: 'How are you?', translated: 'Comment ça va?', type: 'Text Translate', mode: 'translate', confidence: 1.00, timestamp: Date.now() - 10000000, timeFormatted: '11:15 AM' },
        { id: '3', original: 'Live Gesture Detection', translated: 'help', type: 'Gesture to VOICE', mode: 'voice', confidence: 0.88, timestamp: Date.now() - 50000000, timeFormatted: '09:40 AM' },
      ]);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [token]);

  const handleDeleteItem = async (id: string) => {
    try {
      const res = await fetch(`${getBackendUrl()}/api/history/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setToastMessage("History item deleted");
        fetchHistory();
      }
    } catch (e) {
      setHistory(prev => prev.filter(item => item.id !== id));
      setToastMessage("History item deleted (Local)");
    }
  };

  const handleClearAll = async () => {
    try {
      const res = await fetch(`${getBackendUrl()}/api/history`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setToastMessage("History cleared completely");
        fetchHistory();
      }
    } catch (e) {
      setHistory([]);
      setToastMessage("History cleared completely (Local)");
    }
  };

  const handleExportCsv = () => {
    if (!token) return;
    // Redirect or trigger backend download with authentication token in request parameters or download via fetch
    fetch(`${getBackendUrl()}/api/history/export`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(response => response.blob())
      .then(blob => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `gesturespeak_history_${Date.now()}.csv`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setToastMessage("CSV Exported successfully!");
      })
      .catch(err => {
        console.error("Export failed, doing browser-side mock CSV download:", err);
        // Browser side download fallback
        let csvContent = "data:text/csv;charset=utf-8,ID,Original,Translated,Type,Mode,Confidence,TimeFormatted\n";
        history.forEach(item => {
          csvContent += `"${item.id}","${item.original}","${item.translated}","${item.type}","${item.mode}",${item.confidence},"${item.timeFormatted}"\n`;
        });
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `gesturespeak_history_fallback.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setToastMessage("CSV Exported (Fallback)!");
      });
  };

  const filteredHistory = history.filter(item =>
    item.translated.toLowerCase().includes(search.toLowerCase()) ||
    item.type.toLowerCase().includes(search.toLowerCase()) ||
    item.original.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Box>
      <Card className="glass-card">
        <CardContent sx={{ p: 4 }}>
          {/* Header Action Bar */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4, flexWrap: 'wrap', gap: 2 }}>
            <TextField
              size="small"
              placeholder="Search history log..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              slotProps={{
                input: {
                  startAdornment: <SearchIcon sx={{ color: 'var(--text-sub)', mr: 1 }} />
                }
              }}
              sx={{
                width: { xs: '100%', sm: 280 },
                '& .MuiOutlinedInput-root': {
                  borderRadius: '14px',
                  color: 'var(--text-main)',
                  '& fieldset': { borderColor: 'var(--border-glass)' },
                },
              }}
            />

            <Stack direction="row" spacing={2} sx={{ width: { xs: '100%', sm: 'auto' } }}>
              <Button
                variant="outlined"
                startIcon={<ExportIcon />}
                onClick={handleExportCsv}
                disabled={history.length === 0}
                sx={{ borderRadius: '12px', fontWeight: 700, textTransform: 'none' }}
              >
                Export CSV
              </Button>
              <Button
                variant="outlined"
                color="error"
                startIcon={<ClearIcon />}
                onClick={handleClearAll}
                disabled={history.length === 0}
                sx={{ borderRadius: '12px', fontWeight: 700, textTransform: 'none' }}
              >
                Clear All
              </Button>
            </Stack>
          </Box>

          {/* History Data Cards List */}
          {filteredHistory.length > 0 ? (
            <Stack spacing={2.5}>
              {filteredHistory.map((item) => {
                const isSignType = item.type.toLowerCase().includes('sign');
                const confidencePct = Math.round(item.confidence * 100);
                
                return (
                  <Card 
                    key={item.id} 
                    className="glass-card" 
                    sx={{ 
                      borderRadius: '20px',
                      border: '1.5px solid var(--border-glass)',
                      transition: 'all 0.2s ease',
                      backgroundImage: 'none',
                      backgroundColor: 'var(--bg-card)',
                      '&:hover': {
                        transform: 'translateY(-3px)',
                        boxShadow: 'var(--shadow-glass)',
                      }
                    }}
                  >
                    <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 2.5 }}>
                        {/* Left Side: Type Icon, Source and Translation */}
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2.5, flexGrow: 1, minWidth: 0 }}>
                          {/* Module Icon Badge */}
                          <Box 
                            sx={{ 
                              display: 'flex', 
                              alignItems: 'center', 
                              justifyContent: 'center',
                              width: 48, 
                              height: 48, 
                              borderRadius: '14px', 
                              background: isSignType 
                                ? 'rgba(79, 172, 254, 0.1)' 
                                : 'rgba(236, 56, 188, 0.1)',
                              color: isSignType ? 'primary.main' : 'secondary.main',
                              flexShrink: 0
                            }}
                          >
                            {isSignType ? <CameraIcon sx={{ fontSize: '1.3rem' }} /> : <TranslateIcon sx={{ fontSize: '1.3rem' }} />}
                          </Box>

                          {/* Translation Details */}
                          <Box sx={{ minWidth: 0, flexGrow: 1 }}>
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1.5, mb: 0.8 }}>
                              <Typography variant="caption" sx={{ fontWeight: 800, color: 'var(--text-sub)', textTransform: 'uppercase', letterSpacing: 0.8, fontSize: '0.72rem' }}>
                                {item.type}
                              </Typography>
                              <Box 
                                sx={{ 
                                  px: 1.2, 
                                  py: 0.2, 
                                  borderRadius: '20px', 
                                  background: confidencePct > 80 ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                                  color: confidencePct > 80 ? 'success.main' : 'warning.main',
                                  border: confidencePct > 80 ? '1px solid rgba(16, 185, 129, 0.2)' : '1px solid rgba(245, 158, 11, 0.2)',
                                  fontSize: '0.7rem', 
                                  fontWeight: 800 
                                }}
                              >
                                {confidencePct}% Confidence
                              </Box>
                            </Box>

                            <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1 }}>
                              <Typography variant="body2" sx={{ fontStyle: 'italic', color: 'var(--text-sub)', fontSize: '0.92rem' }}>
                                "{item.original}"
                              </Typography>
                              <Typography variant="body1" sx={{ color: 'var(--text-main)', fontWeight: 800 }}>
                                ➔ {item.translated.replace("_", " ")}
                              </Typography>
                            </Box>
                          </Box>
                        </Box>

                        {/* Right Side: Timestamp and Actions */}
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, flexShrink: 0, ml: 'auto' }}>
                          <Typography variant="body2" sx={{ color: 'var(--text-sub)', fontWeight: 700, fontSize: '0.85rem' }}>
                            {item.timeFormatted}
                          </Typography>
                          
                          <Stack direction="row" spacing={1.2}>
                            <Tooltip title="Copy Translation" arrow>
                              <IconButton 
                                size="small" 
                                onClick={() => {
                                  navigator.clipboard.writeText(item.translated);
                                  setToastMessage("Translation copied to clipboard!");
                                }}
                                sx={{ 
                                  border: '1px solid var(--border-glass)',
                                  color: 'var(--text-sub)',
                                  '&:hover': {
                                    color: 'primary.main',
                                    backgroundColor: 'action.hover'
                                  }
                                }}
                              >
                                <CopyIcon sx={{ fontSize: '1.05rem' }} />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Delete Record" arrow>
                              <IconButton 
                                size="small" 
                                color="error" 
                                onClick={() => handleDeleteItem(item.id)}
                                sx={{ 
                                  border: '1px solid var(--border-glass)',
                                  '&:hover': {
                                    backgroundColor: 'error.light',
                                    color: '#ffffff'
                                  }
                                }}
                              >
                                <DeleteIcon sx={{ fontSize: '1.05rem' }} />
                              </IconButton>
                            </Tooltip>
                          </Stack>
                        </Box>
                      </Box>
                    </CardContent>
                  </Card>
                );
              })}
            </Stack>
          ) : (
            <Box sx={{ py: 6, textAlign: 'center' }}>
              <Typography variant="body2" sx={{ color: 'var(--text-sub)' }}>
                No records found. Perform sign detections or text translations to record logs.
              </Typography>
            </Box>
          )}
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

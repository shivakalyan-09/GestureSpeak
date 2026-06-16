import { useEffect, useState } from 'react';
import { 
  Box, Card, CardContent, Typography, TextField, Button, Table, 
  TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, 
  IconButton, Stack, Alert, Snackbar 
} from '@mui/material';
import { useAuth } from '../context/AuthContext';
import { BACKEND_URL } from '../context/AuthContext';
import {
  Search as SearchIcon,
  Delete as DeleteIcon,
  FileDownload as ExportIcon,
  ClearAll as ClearIcon
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
      const res = await fetch(`${BACKEND_URL}/api/history`, {
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
      const res = await fetch(`${BACKEND_URL}/api/history/${id}`, {
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
      const res = await fetch(`${BACKEND_URL}/api/history`, {
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
    fetch(`${BACKEND_URL}/api/history/export`, {
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

          {/* History Data Table */}
          {filteredHistory.length > 0 ? (
            <TableContainer component={Paper} elevation={0} sx={{ background: 'transparent' }}>
              <Table>
                <TableHead>
                  <TableRow sx={{ '& th': { borderBottom: '1px solid var(--border-glass)', color: 'var(--text-sub)', fontWeight: 800 } }}>
                    <TableCell>Date/Time</TableCell>
                    <TableCell>Module Type</TableCell>
                    <TableCell>Source Input</TableCell>
                    <TableCell>Prediction Translation</TableCell>
                    <TableCell>Confidence</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredHistory.map((item) => (
                    <TableRow key={item.id} sx={{ '& td': { borderBottom: '1px solid var(--border-glass)', color: 'var(--text-main)' } }}>
                      <TableCell sx={{ fontWeight: 600 }}>{item.timeFormatted}</TableCell>
                      <TableCell>{item.type}</TableCell>
                      <TableCell sx={{ fontStyle: 'italic', color: 'var(--text-sub)' }}>
                        {item.original.length > 30 ? item.original.substring(0, 30) + '...' : item.original}
                      </TableCell>
                      <TableCell sx={{ fontWeight: 800, textTransform: 'capitalize' }}>
                        {item.translated.replace("_", " ")}
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 700, color: item.confidence > 0.8 ? 'success.main' : 'warning.main' }}>
                          {Math.round(item.confidence * 100)}%
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <IconButton color="error" onClick={() => handleDeleteItem(item.id)}>
                          <DeleteIcon />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
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

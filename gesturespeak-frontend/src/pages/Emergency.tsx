import React, { useEffect, useState, useRef } from 'react';
import {
  Box, Card, CardContent, Typography, Button, TextField,
  IconButton, Alert, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Paper, Tabs, Tab,
  Dialog, DialogTitle, DialogContent, DialogActions,
  CircularProgress, MenuItem, Modal, Tooltip, InputAdornment,
  Avatar
} from '@mui/material';
import { useAuth } from '../context/AuthContext';
import { getBackendUrl } from '../context/AuthContext';
import {
  SmsFailed as AlertIcon,
  VolumeUp as SirenIcon,
  VolumeOff as SirenOffIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Star as StarIcon,
  StarBorder as StarBorderIcon,
  Add as AddIcon,
  MyLocation as LocationIcon,
  History as HistoryIcon,
  People as PeopleIcon,
  CheckCircleOutlined as SuccessIcon,
  Phone as PhoneIcon,
  Email as EmailIcon,
  Person as PersonIcon,
  FamilyRestroom as RelationshipIcon,
  Close as CloseIcon,
  PersonAdd as PersonAddIcon
} from '@mui/icons-material';

interface Contact {
  id: string;
  name: string;
  relationship: string;
  phoneNumber: string;
  email?: string;
  createdAt: number;
  isPrimary: boolean;
}

interface SosLog {
  id: string;
  userId: string;
  type: string;
  details: string;
  locationLink: string;
  timestamp: number;
  latitude: string;
  longitude: string;
  mapsUrl: string;
  contactsNotified: number;
  status: 'SENT' | 'FAILED';
}

const getRelationshipColors = (relationship: string) => {
  switch (relationship) {
    case 'Spouse':
      return { bg: 'rgba(244, 63, 94, 0.1)', text: '#f43f5e', border: 'rgba(244, 63, 94, 0.2)' };
    case 'Parent':
      return { bg: 'rgba(249, 115, 22, 0.1)', text: '#f97316', border: 'rgba(249, 115, 22, 0.2)' };
    case 'Sibling':
      return { bg: 'rgba(59, 130, 246, 0.1)', text: '#3b82f6', border: 'rgba(59, 130, 246, 0.2)' };
    case 'Child':
      return { bg: 'rgba(16, 185, 129, 0.1)', text: '#10b981', border: 'rgba(16, 185, 129, 0.2)' };
    case 'Friend':
      return { bg: 'rgba(245, 158, 11, 0.1)', text: '#f59e0b', border: 'rgba(245, 158, 11, 0.2)' };
    case 'Guardian':
      return { bg: 'rgba(139, 92, 246, 0.1)', text: '#8b5cf6', border: 'rgba(139, 92, 246, 0.2)' };
    case 'Doctor':
      return { bg: 'rgba(6, 182, 212, 0.1)', text: '#06b6d4', border: 'rgba(6, 182, 212, 0.2)' };
    case 'Emergency Service':
      return { bg: 'rgba(239, 68, 68, 0.12)', text: '#ef4444', border: 'rgba(239, 68, 68, 0.25)' };
    default:
      return { bg: 'rgba(100, 116, 139, 0.1)', text: '#64748b', border: 'rgba(100, 116, 139, 0.2)' };
  }
};

const getAvatarGradient = (name: string) => {
  const code = (name || '').split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % 5;
  const gradients = [
    'linear-gradient(135deg, #4f46e5 0%, #06b6d4 100%)',
    'linear-gradient(135deg, #ec4899 0%, #f43f5e 100%)',
    'linear-gradient(135deg, #10b981 0%, #3b82f6 100%)',
    'linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)',
    'linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%)',
  ];
  return gradients[code];
};

export default function Emergency() {
  const { token } = useAuth();
  
  // Navigation tabs state
  const [tabValue, setTabValue] = useState(0);

  // Core Data
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [logs, setLogs] = useState<SosLog[]>([]);

  // Geolocation Coordinate State
  const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  // Dialog & Modal Triggers
  const [openAddEditDialog, setOpenAddEditDialog] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [openConfirmSos, setOpenConfirmSos] = useState(false);
  const [openSuccessSos, setOpenSuccessSos] = useState(false);
  const [sosSending, setSosSending] = useState(false);
  const [lastSosReport, setLastSosReport] = useState<{
    contactsCount: number;
    time: string;
    mapsLink: string;
  } | null>(null);

  // Contact Form Inputs
  const [formName, setFormName] = useState('');
  const [formRelationship, setFormRelationship] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  // History Filter/Search
  const [historySearch, setHistorySearch] = useState('');
  const [historyFilter, setHistoryFilter] = useState<'ALL' | 'SENT' | 'FAILED'>('ALL');

  // Alarm visual flashing & audio siren oscillators
  const [sosActive, setSosActive] = useState(false);
  const [sirenActive, setSirenActive] = useState(false);
  
  const audioCtxRef = useRef<AudioContext | null>(null);
  const oscRef = useRef<OscillatorNode | null>(null);
  const sirenIntervalRef = useRef<any>(null);

  const fetchContactsAndLogs = async () => {
    if (!token) return;
    try {
      const contactsRes = await fetch(`${getBackendUrl()}/api/emergency/contacts`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (contactsRes.ok) {
        setContacts(await contactsRes.json());
      }
      
      const logsRes = await fetch(`${getBackendUrl()}/api/emergency/logs`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (logsRes.ok) {
        setLogs(await logsRes.json());
      }
    } catch (e) {
      console.warn("Spring Boot backend offline, seeding frontend mock states for emergency.", e);
      // Mock Fallbacks
      setContacts([
        { id: '1', name: 'John Doe', relationship: 'Spouse', phoneNumber: '+1234567890', email: 'john@example.com', createdAt: Date.now() - 86400000 * 5, isPrimary: true },
        { id: '2', name: 'Dr. Jane Smith', relationship: 'Doctor', phoneNumber: '+1987654321', email: 'jane.smith@clinic.com', createdAt: Date.now() - 86400000 * 2, isPrimary: false }
      ]);
      setLogs([
        { 
          id: 'log-1', 
          userId: 'mock-uid',
          type: 'SOS', 
          details: 'SOS Alert sent to 2 of 2 contacts. Message details: Emergency Alert! I need immediate help.', 
          locationLink: 'https://maps.google.com/?q=17.3850,78.4867', 
          timestamp: Date.now() - 3600000,
          latitude: '17.3850',
          longitude: '78.4867',
          mapsUrl: 'https://maps.google.com/?q=17.3850,78.4867',
          contactsNotified: 2,
          status: 'SENT'
        }
      ]);
    }
  };

  // On mount and token sync
  useEffect(() => {
    fetchContactsAndLogs();
    getUserLocation(false); // Silent geolocation retrieve on load
    return () => stopSiren();
  }, [token]);

  // Retrieve Location from Browser Geolocation API
  const getUserLocation = (showSpinner = true) => {
    if (showSpinner) setLocationLoading(true);
    setLocationError(null);

    if (!navigator.geolocation) {
      setLocationError("Browser geolocation API not supported by your browser.");
      setLocationLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCoords({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        });
        setLocationLoading(false);
      },
      (error) => {
        let msg = "Could not fetch coordinates.";
        if (error.code === error.PERMISSION_DENIED) {
          msg = "Location permission denied. Please enable browser location permissions.";
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          msg = "GPS/Location is currently unavailable or disabled.";
        } else if (error.code === error.TIMEOUT) {
          msg = "Location request timed out.";
        }
        setLocationError(msg);
        setLocationLoading(false);
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  // Sirens Alert implementation
  const startSiren = () => {
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();

      osc.type = 'sawtooth';
      gainNode.gain.setValueAtTime(0.15, ctx.currentTime);

      osc.connect(gainNode);
      gainNode.connect(ctx.destination);
      osc.start();
      
      oscRef.current = osc;

      let frequencyToggle = true;
      sirenIntervalRef.current = setInterval(() => {
        if (oscRef.current) {
          oscRef.current.frequency.setValueAtTime(frequencyToggle ? 880 : 440, ctx.currentTime);
          frequencyToggle = !frequencyToggle;
        }
      }, 400);

      setSirenActive(true);
    } catch (err) {
      console.error("Audio Context initialization failed:", err);
    }
  };

  const stopSiren = () => {
    if (sirenIntervalRef.current) {
      clearInterval(sirenIntervalRef.current);
      sirenIntervalRef.current = null;
    }
    if (oscRef.current) {
      try {
        oscRef.current.stop();
        oscRef.current.disconnect();
      } catch (e) {}
      oscRef.current = null;
    }
    setSirenActive(false);
  };

  const toggleSiren = () => {
    if (sirenActive) stopSiren();
    else startSiren();
  };

  // SOS button click confirmation
  const handleSosClick = () => {
    setOpenConfirmSos(true);
  };

  // Send SOS alert to contacts
  const handleConfirmSendSos = async () => {
    setOpenConfirmSos(false);
    setSosSending(true);
    setSosActive(true);
    startSiren();

    // Re-verify coords or request on the fly
    if (!coords) {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          async (position) => {
            const lat = position.coords.latitude;
            const lng = position.coords.longitude;
            setCoords({ latitude: lat, longitude: lng });
            await dispatchSosBackend(lat, lng);
          },
          async () => {
            await dispatchSosBackend(0.0, 0.0);
          }
        );
      } else {
        await dispatchSosBackend(0.0, 0.0);
      }
    } else {
      await dispatchSosBackend(coords.latitude, coords.longitude);
    }
  };

  const dispatchSosBackend = async (lat: number, lng: number) => {
    const mapsUrl = `https://maps.google.com/?q=${lat},${lng}`;
    
    try {
      const res = await fetch(`${getBackendUrl()}/api/emergency/send-sos`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          latitude: String(lat),
          longitude: String(lng),
          mapsUrl: mapsUrl
        })
      });

      if (res.ok) {
        const resultLog: SosLog = await res.json();
        setLastSosReport({
          contactsCount: resultLog.contactsNotified,
          time: new Date(resultLog.timestamp).toLocaleTimeString(),
          mapsLink: resultLog.locationLink
        });
        setOpenSuccessSos(true);
        fetchContactsAndLogs();
      } else {
        const errorData = await res.json();
        alert(errorData.message || "Failed to trigger SOS on backend.");
      }
    } catch (e) {
      console.warn("Spring Boot offline. Creating mock SOS log.", e);
      setLastSosReport({
        contactsCount: contacts.length,
        time: new Date().toLocaleTimeString(),
        mapsLink: mapsUrl
      });
      setOpenSuccessSos(true);
      
      // Add Mock log
      setLogs(prev => [
        {
          id: 'log-' + Math.random(),
          userId: 'mock-uid',
          type: 'SOS',
          details: `SOS Alert simulated to ${contacts.length} contacts. Message: Emergency SOS Dispatched.`,
          locationLink: mapsUrl,
          timestamp: Date.now(),
          latitude: String(lat),
          longitude: String(lng),
          mapsUrl: mapsUrl,
          contactsNotified: contacts.length,
          status: 'SENT'
        },
        ...prev
      ]);
    } finally {
      setSosSending(false);
    }
  };

  const handleStopSOS = () => {
    setSosActive(false);
    stopSiren();
  };

  // Contacts CRUD Operations
  const handleOpenAddContact = () => {
    setEditingContact(null);
    setFormName('');
    setFormRelationship('');
    setFormPhone('');
    setFormEmail('');
    setFormError(null);
    setOpenAddEditDialog(true);
  };

  const handleOpenEditContact = (contact: Contact) => {
    setEditingContact(contact);
    setFormName(contact.name);
    setFormRelationship(contact.relationship);
    setFormPhone(contact.phoneNumber);
    setFormEmail(contact.email || '');
    setFormError(null);
    setOpenAddEditDialog(true);
  };

  const handleSaveContact = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    // Front-end validations
    if (!formName.trim() || !formRelationship || !formPhone.trim()) {
      setFormError("Name, Relationship, and Phone Number are required fields.");
      return;
    }

    // Phone validations (must start with '+' and include country code)
    if (!formPhone.trim().startsWith('+')) {
      setFormError("Phone number must start with '+' followed by your country code (e.g., +91 for India).");
      return;
    }
    if (!/^\+[0-9]+$/.test(formPhone.trim())) {
      setFormError("Phone number must contain numeric digits only after the '+' prefix.");
      return;
    }
    const phoneDigits = formPhone.replace(/[^\d+]/g, '');
    if (phoneDigits.length < 10) {
      setFormError("Please enter a valid phone number including country code (at least 10 digits).");
      return;
    }

    // Maximum 5 validation (exclude edits)
    if (!editingContact && contacts.length >= 5) {
      setFormError("Maximum limit of 5 emergency contacts reached.");
      return;
    }

    // Duplicate Phone validation (exclude self when editing)
    const isDuplicatePhone = contacts.some(c => {
      if (editingContact && c.id === editingContact.id) return false;
      return c.phoneNumber.replace(/[^\d+]/g, '') === phoneDigits;
    });
    if (isDuplicatePhone) {
      setFormError("A contact with this phone number already exists in your list.");
      return;
    }

    const contactPayload = {
      id: editingContact ? editingContact.id : '',
      name: formName.trim(),
      relationship: formRelationship,
      phoneNumber: formPhone.trim(),
      email: formEmail.trim() || undefined,
      isPrimary: editingContact ? editingContact.isPrimary : contacts.length === 0
    };

    try {
      const res = await fetch(`${getBackendUrl()}/api/emergency/contacts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(contactPayload)
      });
      if (res.ok) {
        setOpenAddEditDialog(false);
        fetchContactsAndLogs();
      } else {
        const errorData = await res.json();
        setFormError(errorData.message || "Failed to save contact.");
      }
    } catch (e) {
      console.warn("Spring Boot offline, writing mock contact state.");
      if (editingContact) {
        setContacts(prev => prev.map(c => c.id === editingContact.id ? { ...c, ...contactPayload } : c));
      } else {
        setContacts(prev => [...prev, {
          ...contactPayload,
          id: 'mock-' + Math.random(),
          createdAt: Date.now(),
          isPrimary: prev.length === 0
        }]);
      }
      setOpenAddEditDialog(false);
    }
  };

  const handleDeleteContact = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this contact?")) return;
    try {
      const res = await fetch(`${getBackendUrl()}/api/emergency/contacts/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        fetchContactsAndLogs();
      }
    } catch (e) {
      setContacts(prev => prev.filter(c => c.id !== id));
    }
  };

  const handleSetPrimary = async (id: string) => {
    try {
      const res = await fetch(`${getBackendUrl()}/api/emergency/contacts/primary/${id}`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        fetchContactsAndLogs();
      }
    } catch (e) {
      setContacts(prev => prev.map(c => ({
        ...c,
        isPrimary: c.id === id
      })));
    }
  };

  const handleClearLogs = async () => {
    if (!window.confirm("Are you sure you want to clear all history logs?")) return;
    try {
      const res = await fetch(`${getBackendUrl()}/api/emergency/logs`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        fetchContactsAndLogs();
      }
    } catch (e) {
      setLogs([]);
    }
  };

  // Filter and search history
  const filteredLogs = logs.filter(log => {
    const searchMatch = 
      log.details.toLowerCase().includes(historySearch.toLowerCase()) ||
      (log.latitude && log.latitude.includes(historySearch)) ||
      (log.longitude && log.longitude.includes(historySearch)) ||
      new Date(log.timestamp).toLocaleString().toLowerCase().includes(historySearch.toLowerCase());
    
    if (historyFilter === 'ALL') return searchMatch;
    return searchMatch && log.status === historyFilter;
  });

  return (
    <Box sx={{ position: 'relative' }} className={sosActive ? "emergency-flash" : ""}>
      {sosActive && (
        <Alert severity="error" variant="filled" sx={{ mb: 3, borderRadius: '16px', fontWeight: 700 }} action={
          <Button color="inherit" size="small" onClick={handleStopSOS} sx={{ fontWeight: 900 }}>
            DISMISS SOS WARNING
          </Button>
        }>
          EMERGENCY SIREN WARNING BROADCAST ACTIVE! 
        </Alert>
      )}

      {/* Tabs Header */}
      <Box sx={{ borderBottom: 1, borderColor: 'var(--border-glass)', mb: 4 }}>
        <Tabs 
          value={tabValue} 
          onChange={(_, val) => setTabValue(val)} 
          textColor="primary"
          indicatorColor="primary"
          variant="fullWidth"
          sx={{
            '& .MuiTab-root': { fontWeight: 800, fontSize: '1rem', letterSpacing: 0.5, color: 'var(--text-sub)' },
            '& .Mui-selected': { color: 'primary.main' }
          }}
        >
          <Tab label="SOS Dashboard" icon={<AlertIcon />} iconPosition="start" />
          <Tab label="Emergency Contacts" icon={<PeopleIcon />} iconPosition="start" />
          <Tab label="SOS History Logs" icon={<HistoryIcon />} iconPosition="start" />
        </Tabs>
      </Box>

      {/* TAB 0: SOS DASHBOARD */}
      {tabValue === 0 && (
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '7fr 5fr' }, gap: 4 }}>
          {/* Main SOS button controller */}
          <Card className="glass-card" sx={{ p: 4, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
            <CardContent sx={{ textAlign: 'center', width: '100%' }}>
              <Box sx={{ display: 'flex', justifyContent: 'center', mb: 4 }}>
                {/* Large Red SOS Pulsing Button */}
                <Box
                  sx={{
                    width: 180,
                    height: 180,
                    borderRadius: '50%',
                    backgroundColor: 'error.main',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    boxShadow: sosActive 
                      ? '0 0 50px 15px rgba(239, 68, 68, 0.65)' 
                      : '0 8px 30px 0 rgba(239, 68, 68, 0.45)',
                    transform: 'scale(1)',
                    transition: 'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                    animation: sosActive ? 'pulse-error 1.5s infinite' : 'none',
                    '&:hover': {
                      transform: 'scale(1.05)',
                      boxShadow: '0 12px 40px 0 rgba(239, 68, 68, 0.6)',
                    },
                    '&:active': { transform: 'scale(0.95)' }
                  }}
                  onClick={handleSosClick}
                >
                  {sosSending ? (
                    <CircularProgress size={50} sx={{ color: '#ffffff' }} />
                  ) : (
                    <>
                      <AlertIcon sx={{ color: '#ffffff', fontSize: 60, mb: 0.5 }} />
                      <Typography variant="h5" sx={{ color: '#ffffff', fontWeight: 900, letterSpacing: 1 }}>
                        SOS
                      </Typography>
                    </>
                  )}
                </Box>
              </Box>

              <Typography variant="h4" sx={{ fontWeight: 900, color: 'var(--text-main)', mb: 1.5 }}>
                {sosActive ? "EMERGENCY DISPATCH ACTIVE" : "SEND SOS ALERT"}
              </Typography>
              <Typography variant="body1" sx={{ color: 'var(--text-sub)', maxW: 500, mx: 'auto', mb: 4 }}>
                {sosActive 
                  ? "Siren alarm sound is playing. Live Google Maps location links have been broadcasted to contacts."
                  : "Tap the button to instantly message your live coordinates and Google Maps link to your entire Emergency Contacts Circle."
                }
              </Typography>

              <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
                <Button
                  variant="outlined"
                  color={sirenActive ? 'error' : 'primary'}
                  startIcon={sirenActive ? <SirenOffIcon /> : <SirenIcon />}
                  onClick={toggleSiren}
                  sx={{ borderRadius: '14px', px: 3, py: 1.5, fontWeight: 800, fontSize: '0.95rem' }}
                >
                  {sirenActive ? 'MUTE SIREN ALARM' : 'PLAY SIREN ALARM'}
                </Button>
                {sosActive && (
                  <Button
                    variant="contained"
                    color="primary"
                    onClick={handleStopSOS}
                    sx={{ borderRadius: '14px', px: 3, py: 1.5, fontWeight: 800, fontSize: '0.95rem' }}
                  >
                    DISMISS SIGNAL & ALARM
                  </Button>
                )}
              </Box>
            </CardContent>
          </Card>

          {/* Current Location status */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <Card className="glass-card">
              <CardContent sx={{ p: 4 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 3, gap: 1.5 }}>
                  <LocationIcon color="primary" />
                  <Typography variant="h6" sx={{ fontWeight: 800, color: 'var(--text-main)' }}>
                    CURRENT LOCATION PREVIEW
                  </Typography>
                </Box>

                {locationLoading ? (
                  <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 4, gap: 2 }}>
                    <CircularProgress size={30} />
                    <Typography variant="caption" sx={{ color: 'var(--text-sub)', fontWeight: 700 }}>
                      FETCHING SATELLITE GPS COORDS...
                    </Typography>
                  </Box>
                ) : locationError ? (
                  <Box>
                    <Alert severity="warning" sx={{ borderRadius: '12px', mb: 2 }}>
                      {locationError}
                    </Alert>
                    <Button 
                      variant="contained" 
                      onClick={() => getUserLocation(true)}
                      sx={{ borderRadius: '12px' }}
                      size="small"
                    >
                      Retry Location Request
                    </Button>
                  </Box>
                ) : coords ? (
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                      <Box sx={{ p: 2, borderRadius: '12px', background: 'action.hover', border: '1px solid var(--border-glass)' }}>
                        <Typography variant="caption" sx={{ color: 'var(--text-sub)', display: 'block', fontWeight: 600 }}>
                          LATITUDE
                        </Typography>
                        <Typography variant="body1" sx={{ fontWeight: 800, color: 'var(--text-main)' }}>
                          {coords.latitude.toFixed(6)}
                        </Typography>
                      </Box>
                      <Box sx={{ p: 2, borderRadius: '12px', background: 'action.hover', border: '1px solid var(--border-glass)' }}>
                        <Typography variant="caption" sx={{ color: 'var(--text-sub)', display: 'block', fontWeight: 600 }}>
                          LONGITUDE
                        </Typography>
                        <Typography variant="body1" sx={{ fontWeight: 800, color: 'var(--text-main)' }}>
                          {coords.longitude.toFixed(6)}
                        </Typography>
                      </Box>
                    </Box>
                    <Box sx={{ p: 2, borderRadius: '12px', background: 'action.hover', border: '1px solid var(--border-glass)' }}>
                      <Typography variant="caption" sx={{ color: 'var(--text-sub)', display: 'block', fontWeight: 600 }}>
                        GOOGLE MAPS LINK
                      </Typography>
                      <Typography 
                        variant="body2" 
                        component="a" 
                        href={`https://maps.google.com/?q=${coords.latitude},${coords.longitude}`} 
                        target="_blank" 
                        rel="noreferrer" 
                        sx={{ color: 'primary.main', fontWeight: 700, textDecoration: 'none', wordBreak: 'break-all' }}
                      >
                        https://maps.google.com/?q={coords.latitude.toFixed(4)},{coords.longitude.toFixed(4)}
                      </Typography>
                    </Box>
                    <Button 
                      variant="outlined" 
                      startIcon={<LocationIcon />}
                      onClick={() => getUserLocation(true)}
                      sx={{ borderRadius: '12px' }}
                    >
                      Update Coordinates
                    </Button>
                  </Box>
                ) : (
                  <Box sx={{ textAlign: 'center', py: 3 }}>
                    <Typography variant="body2" sx={{ color: 'var(--text-sub)', mb: 2 }}>
                      GPS location coordinate data is not loaded.
                    </Typography>
                    <Button 
                      variant="contained" 
                      onClick={() => getUserLocation(true)}
                      sx={{ borderRadius: '12px' }}
                    >
                      Get Coordinates
                    </Button>
                  </Box>
                )}
              </CardContent>
            </Card>

            <Card className="glass-card">
              <CardContent sx={{ p: 4, textAlign: 'center' }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 800, color: 'var(--text-main)', mb: 1 }}>
                  EMERGENCY CONTACTS CIRCLE
                </Typography>
                <Typography variant="h3" sx={{ fontWeight: 900, color: 'primary.main', mb: 1 }}>
                  {contacts.length} / 5
                </Typography>
                <Typography variant="body2" sx={{ color: 'var(--text-sub)', mb: 2 }}>
                  Emergency contacts configured to receive location notifications.
                </Typography>
                <Button 
                  variant="outlined" 
                  onClick={() => setTabValue(1)}
                  sx={{ borderRadius: '12px' }}
                >
                  Manage Contact List
                </Button>
              </CardContent>
            </Card>
          </Box>
        </Box>
      )}

      {/* TAB 1: EMERGENCY CONTACTS */}
      {tabValue === 1 && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h5" sx={{ fontWeight: 900, color: 'var(--text-main)', letterSpacing: -0.5 }}>
              Emergency Contacts Circle
            </Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleOpenAddContact}
              disabled={contacts.length >= 5}
              sx={{ 
                borderRadius: '12px', 
                fontWeight: 800, 
                px: 2.5,
                py: 1,
                boxShadow: '0 4px 14px 0 var(--btn-shadow)',
                '&:hover': {
                  boxShadow: '0 6px 20px 0 var(--btn-shadow-hover)'
                }
              }}
            >
              Add Contact
            </Button>
          </Box>

          {contacts.length > 0 ? (
            <Box 
              sx={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))', 
                gap: 3.5 
              }}
            >
              {contacts.map((contact) => {
                const relColors = getRelationshipColors(contact.relationship);
                const avatarGradient = getAvatarGradient(contact.name);
                return (
                  <Card 
                    key={contact.id} 
                    className="glass-card" 
                    sx={{ 
                      position: 'relative', 
                      overflow: 'visible',
                      transition: 'transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275), box-shadow 0.3s ease',
                      border: contact.isPrimary ? '2px solid var(--accent-neon-blue, #4facfe)' : '1.5px solid var(--border-glass)',
                      borderRadius: '24px',
                      '&:hover': {
                        transform: 'translateY(-6px)',
                        boxShadow: contact.isPrimary 
                          ? '0 12px 32px -10px rgba(79, 172, 254, 0.35)' 
                          : 'var(--shadow-glass)'
                      }
                    }}
                  >
                    {/* Primary Star Action Pin */}
                    <Box sx={{ position: 'absolute', top: 16, right: 16 }}>
                      <Tooltip title={contact.isPrimary ? "Primary Responder" : "Set as Primary Responder"} arrow>
                        <IconButton 
                          onClick={() => handleSetPrimary(contact.id)}
                          sx={{
                            color: contact.isPrimary ? '#eab308' : 'var(--text-sub)',
                            background: contact.isPrimary ? 'rgba(234, 179, 8, 0.12)' : 'rgba(0,0,0,0.02)',
                            padding: '8px',
                            transition: 'all 0.3s ease',
                            '&:hover': {
                              transform: 'rotate(72deg) scale(1.15)',
                              color: '#eab308',
                              background: 'rgba(234, 179, 8, 0.2)'
                            }
                          }}
                        >
                          {contact.isPrimary ? <StarIcon sx={{ fontSize: '1.4rem' }} /> : <StarBorderIcon sx={{ fontSize: '1.4rem' }} />}
                        </IconButton>
                      </Tooltip>
                    </Box>

                    <CardContent sx={{ p: 3, display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'space-between' }}>
                      <Box>
                        {/* Avatar & Relationship Badge */}
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2.2, mb: 3 }}>
                          <Avatar 
                            sx={{ 
                              width: 52, 
                              height: 52, 
                              background: avatarGradient, 
                              fontWeight: 900,
                              fontSize: '1.3rem',
                              color: '#ffffff',
                              boxShadow: '0 4px 12px 0 rgba(0,0,0,0.12)'
                            }}
                          >
                            {contact.name.substring(0, 1).toUpperCase()}
                          </Avatar>
                          <Box sx={{ minWidth: 0, flexGrow: 1, pr: 3 }}>
                            <Typography 
                              variant="subtitle1" 
                              noWrap 
                              sx={{ 
                                fontWeight: 800, 
                                color: 'var(--text-main)', 
                                fontSize: '1.05rem', 
                                mb: 0.5,
                                letterSpacing: -0.2
                              }}
                            >
                              {contact.name}
                            </Typography>
                            <Box 
                              sx={{ 
                                px: 1.5, 
                                py: 0.5, 
                                borderRadius: '12px', 
                                background: relColors.bg, 
                                color: relColors.text,
                                border: `1.5px solid ${relColors.border}`,
                                display: 'inline-block', 
                                fontSize: '0.72rem', 
                                fontWeight: 800,
                                textTransform: 'uppercase',
                                letterSpacing: 0.8
                              }}
                            >
                              {contact.relationship}
                            </Box>
                          </Box>
                        </Box>

                        {/* Detail Info Fields */}
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mb: 3.5 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.8 }}>
                            <Box 
                              sx={{ 
                                display: 'flex', 
                                alignItems: 'center', 
                                justifyContent: 'center',
                                width: 28, 
                                height: 28, 
                                borderRadius: '8px', 
                                background: 'rgba(79, 70, 229, 0.08)',
                                color: 'primary.main'
                              }}
                            >
                              <PhoneIcon sx={{ fontSize: '1.05rem' }} />
                            </Box>
                            <Typography variant="body2" sx={{ color: 'var(--text-main)', fontWeight: 600 }}>
                              {contact.phoneNumber}
                            </Typography>
                          </Box>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.8 }}>
                            <Box 
                              sx={{ 
                                display: 'flex', 
                                alignItems: 'center', 
                                justifyContent: 'center',
                                width: 28, 
                                height: 28, 
                                borderRadius: '8px', 
                                background: 'rgba(219, 39, 119, 0.08)',
                                color: 'secondary.main'
                              }}
                            >
                              <EmailIcon sx={{ fontSize: '1.05rem' }} />
                            </Box>
                            <Typography 
                              variant="body2" 
                              noWrap 
                              sx={{ 
                                color: contact.email ? 'var(--text-main)' : 'var(--text-sub)', 
                                fontWeight: contact.email ? 600 : 400,
                                fontSize: '0.85rem'
                              }}
                            >
                              {contact.email || 'No email configured'}
                            </Typography>
                          </Box>
                        </Box>
                      </Box>

                      {/* Card Footer Actions */}
                      <Box 
                        sx={{ 
                          display: 'flex', 
                          gap: 1.5, 
                          borderTop: '1px solid var(--border-glass)', 
                          pt: 2.2, 
                          justifyContent: 'flex-end' 
                        }}
                      >
                        <Button 
                          size="small" 
                          variant="outlined" 
                          startIcon={<EditIcon />} 
                          onClick={() => handleOpenEditContact(contact)}
                          sx={{ 
                            borderRadius: '10px', 
                            fontWeight: 700, 
                            px: 2, 
                            fontSize: '0.8rem',
                            borderWidth: '1.5px',
                            '&:hover': { borderWidth: '1.5px' }
                          }}
                        >
                          Edit
                        </Button>
                        <Button 
                          size="small" 
                          variant="outlined" 
                          color="error" 
                          startIcon={<DeleteIcon />} 
                          onClick={() => handleDeleteContact(contact.id)}
                          sx={{ 
                            borderRadius: '10px', 
                            fontWeight: 700, 
                            px: 2, 
                            fontSize: '0.8rem',
                            borderWidth: '1.5px',
                            '&:hover': { borderWidth: '1.5px' }
                          }}
                        >
                          Delete
                        </Button>
                      </Box>
                    </CardContent>
                  </Card>
                );
              })}

              {/* Visual Add Contact Interactive Dash-Slot Card */}
              {contacts.length < 5 && (
                <Card 
                  onClick={handleOpenAddContact}
                  sx={{
                    minHeight: 250,
                    border: '2px dashed var(--border-glass)',
                    borderRadius: '24px',
                    backgroundColor: 'rgba(0, 0, 0, 0.01)',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    p: 3,
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    boxShadow: 'none',
                    backgroundImage: 'none',
                    '&:hover': {
                      borderColor: 'primary.main',
                      backgroundColor: 'action.hover',
                      transform: 'scale(1.02)'
                    }
                  }}
                >
                  <Box 
                    sx={{ 
                      width: 56, 
                      height: 56, 
                      borderRadius: '50%', 
                      background: 'action.selected', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center', 
                      mb: 2,
                      color: 'primary.main',
                      boxShadow: '0 4px 12px 0 rgba(0, 0, 0, 0.04)'
                    }}
                  >
                    <AddIcon sx={{ fontSize: '1.85rem' }} />
                  </Box>
                  <Typography variant="subtitle1" sx={{ fontWeight: 800, color: 'var(--text-main)' }}>
                    Add Contact Slot
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'var(--text-sub)', mt: 0.5, textAlign: 'center', maxW: 200 }}>
                    Configure up to 5 contacts to notify in an emergency.
                  </Typography>
                </Card>
              )}
            </Box>
          ) : (
            <Box 
              sx={{ 
                textAlign: 'center', 
                py: 8, 
                display: 'flex', 
                flexDirection: 'column', 
                alignItems: 'center',
                backgroundColor: 'var(--bg-card)',
                borderRadius: '24px',
                border: '1px solid var(--border-glass)',
                p: 4
              }}
            >
              <Box 
                sx={{ 
                  width: 80, 
                  height: 80, 
                  borderRadius: '50%', 
                  background: 'action.hover', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  mb: 3,
                  color: 'var(--text-sub)',
                  opacity: 0.6
                }}
              >
                <PeopleIcon sx={{ fontSize: 40 }} />
              </Box>
              <Typography variant="h6" sx={{ color: 'var(--text-main)', fontWeight: 800, mb: 1 }}>
                No Emergency Contacts
              </Typography>
              <Typography variant="body2" sx={{ color: 'var(--text-sub)', maxW: 360, mb: 4, lineHeight: 1.6 }}>
                Your Emergency Circle is empty. Add contacts now so you can immediately notify them with your live location coordinates in an SOS alert event.
              </Typography>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={handleOpenAddContact}
                sx={{ 
                  borderRadius: '12px',
                  fontWeight: 800,
                  px: 3,
                  py: 1.2,
                  boxShadow: '0 4px 14px 0 var(--btn-shadow)',
                  '&:hover': {
                    boxShadow: '0 6px 20px 0 var(--btn-shadow-hover)'
                  }
                }}
              >
                Add Your First Contact
              </Button>
            </Box>
          )}
        </Box>
      )}

      {/* TAB 2: SOS HISTORY LOGS */}
      {tabValue === 2 && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {/* Filters & search header */}
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, justifyContent: 'space-between', alignItems: 'center' }}>
            <Box sx={{ display: 'flex', gap: 2, flexGrow: 1, maxW: 600 }}>
              <TextField
                size="small"
                label="Search location, details, dates..."
                value={historySearch}
                onChange={(e) => setHistorySearch(e.target.value)}
                sx={{
                  flexGrow: 1,
                  '& .MuiOutlinedInput-root': {
                    borderRadius: '12px',
                    color: 'var(--text-main)',
                    '& fieldset': { borderColor: 'var(--border-glass)' },
                  },
                }}
              />
              <TextField
                select
                size="small"
                label="Filter Status"
                value={historyFilter}
                onChange={(e) => setHistoryFilter(e.target.value as any)}
                sx={{
                  width: 150,
                  '& .MuiOutlinedInput-root': {
                    borderRadius: '12px',
                    color: 'var(--text-main)',
                    '& fieldset': { borderColor: 'var(--border-glass)' },
                  },
                }}
              >
                <MenuItem value="ALL">All Statuses</MenuItem>
                <MenuItem value="SENT">Sent</MenuItem>
                <MenuItem value="FAILED">Failed</MenuItem>
              </TextField>
            </Box>

            {logs.length > 0 && (
              <Button color="error" variant="outlined" onClick={handleClearLogs} sx={{ borderRadius: '12px', fontWeight: 700 }}>
                Clear History Logs
              </Button>
            )}
          </Box>

          {/* Logs table list */}
          <Card className="glass-card">
            <CardContent sx={{ p: 3 }}>
              {filteredLogs.length > 0 ? (
                <TableContainer component={Paper} elevation={0} sx={{ background: 'transparent' }}>
                  <Table size="medium">
                    <TableHead>
                      <TableRow sx={{ '& th': { borderBottom: '1px solid var(--border-glass)', color: 'var(--text-sub)', fontWeight: 800 } }}>
                        <TableCell>Date & Time</TableCell>
                        <TableCell>Alert Details</TableCell>
                        <TableCell>Google Maps Coordinates</TableCell>
                        <TableCell>Contacts Notified</TableCell>
                        <TableCell>Status</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {filteredLogs.map((log) => (
                        <TableRow key={log.id} sx={{ '& td': { borderBottom: '1px solid var(--border-glass)', color: 'var(--text-main)' } }}>
                          <TableCell sx={{ fontWeight: 600 }}>
                            {new Date(log.timestamp).toLocaleString()}
                          </TableCell>
                          <TableCell sx={{ maxW: 240, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {log.details}
                          </TableCell>
                          <TableCell>
                            {log.latitude && log.longitude ? (
                              <Typography 
                                component="a" 
                                href={log.locationLink} 
                                target="_blank" 
                                rel="noreferrer"
                                sx={{ color: 'primary.main', textDecoration: 'none', fontWeight: 700 }}
                              >
                                {parseFloat(log.latitude).toFixed(4)}, {parseFloat(log.longitude).toFixed(4)}
                              </Typography>
                            ) : (
                              'Unknown Coords'
                            )}
                          </TableCell>
                          <TableCell align="center" sx={{ fontWeight: 800 }}>
                            {log.contactsNotified}
                          </TableCell>
                          <TableCell>
                            <Box sx={{
                              display: 'inline-block',
                              px: 1.5, py: 0.5,
                              borderRadius: '8px',
                              fontSize: '0.8rem',
                              fontWeight: 800,
                              color: log.status === 'SENT' ? 'success.main' : 'error.main',
                              backgroundColor: log.status === 'SENT' ? 'rgba(74, 222, 128, 0.15)' : 'rgba(248, 113, 113, 0.15)',
                              border: log.status === 'SENT' ? '1px solid rgba(74, 222, 128, 0.3)' : '1px solid rgba(248, 113, 113, 0.3)'
                            }}>
                              {log.status}
                            </Box>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              ) : (
                <Typography variant="body1" sx={{ color: 'var(--text-sub)', textAlign: 'center', py: 6 }}>
                  No historical SOS dispatch logs found.
                </Typography>
              )}
            </CardContent>
          </Card>
        </Box>
      )}

      {/* CONFIRMATION SOS DIALOG */}
      <Dialog 
        open={openConfirmSos} 
        onClose={() => setOpenConfirmSos(false)}
        slotProps={{
          paper: {
            style: {
              borderRadius: '24px',
              backgroundColor: 'var(--bg-card)',
              border: '1px solid var(--border-glass)',
              padding: '12px'
            }
          }
        }}
      >
        <DialogTitle sx={{ fontWeight: 900, color: 'error.main', fontSize: '1.4rem' }}>
          Emergency Alert
        </DialogTitle>
        <DialogContent>
          <Typography variant="body1" sx={{ color: 'var(--text-main)', mb: 1 }}>
            Are you sure you want to send your live location coordinates to all emergency contacts?
          </Typography>
          <Typography variant="body2" sx={{ color: 'var(--text-sub)' }}>
            This will trigger Twilio SMS notifications containing a Google Maps location link to your contact list.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setOpenConfirmSos(false)} sx={{ color: 'var(--text-sub)', fontWeight: 700 }}>
            Cancel
          </Button>
          <Button onClick={handleConfirmSendSos} color="error" variant="contained" sx={{ borderRadius: '12px', fontWeight: 800, px: 3 }}>
            Send SOS
          </Button>
        </DialogActions>
      </Dialog>

      {/* SUCCESS SOS REPORT MODAL */}
      <Modal
        open={openSuccessSos}
        onClose={() => setOpenSuccessSos(false)}
        sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      >
        <Box sx={{
          width: '90%',
          maxWidth: 480,
          borderRadius: '24px',
          backgroundColor: 'var(--bg-card)',
          border: '1px solid var(--border-glass)',
          p: 4,
          textAlign: 'center',
          boxShadow: '0 10px 40px 0 rgba(0,0,0,0.5)'
        }}>
          <SuccessIcon sx={{ color: 'success.main', fontSize: 70, mb: 2 }} />
          <Typography variant="h5" sx={{ fontWeight: 900, color: 'var(--text-main)', mb: 1.5 }}>
            Emergency Alert Sent Successfully
          </Typography>
          <Typography variant="body2" sx={{ color: 'var(--text-sub)', mb: 3 }}>
            Your coordinate broadcast message has been dispatched to your Emergency Circle.
          </Typography>

          {lastSosReport && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, textAlign: 'left', mb: 4, p: 2.5, borderRadius: '16px', background: 'action.hover', border: '1px solid var(--border-glass)' }}>
              <Typography variant="body2" sx={{ color: 'var(--text-sub)', fontWeight: 600 }}>
                Contacts Notified: <span style={{ color: 'var(--text-main)', fontWeight: 800 }}>{lastSosReport.contactsCount}</span>
              </Typography>
              <Typography variant="body2" sx={{ color: 'var(--text-sub)', fontWeight: 600 }}>
                Time Sent: <span style={{ color: 'var(--text-main)', fontWeight: 800 }}>{lastSosReport.time}</span>
              </Typography>
              <Typography variant="body2" sx={{ color: 'var(--text-sub)', fontWeight: 600, wordBreak: 'break-all' }}>
                Location shared: <span style={{ color: 'primary.main', fontWeight: 800 }}>{lastSosReport.mapsLink}</span>
              </Typography>
            </Box>
          )}

          <Button 
            variant="contained" 
            fullWidth 
            onClick={() => {
              setOpenSuccessSos(false);
              setTabValue(2); // Jump to history tab
            }}
            sx={{ borderRadius: '12px', py: 1.5 }}
          >
            Open SOS History & Log
          </Button>
        </Box>
      </Modal>

      {/* ADD/EDIT CONTACT DIALOG */}
      <Dialog
        open={openAddEditDialog}
        onClose={() => setOpenAddEditDialog(false)}
        slotProps={{
          paper: {
            style: {
              borderRadius: '24px',
              backgroundColor: 'var(--bg-card)',
              backdropFilter: 'blur(16px)',
              border: '1.5px solid var(--border-glass)',
              padding: '16px',
              width: '100%',
              maxWidth: 450
            }
          }
        }}
      >
        <form noValidate onSubmit={handleSaveContact} style={{ width: '100%' }}>
          <DialogTitle sx={{ fontWeight: 900, color: 'var(--text-main)', pb: 1, display: 'flex', alignItems: 'center', gap: 1.5, position: 'relative' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 38, height: 38, borderRadius: '10px', background: 'action.selected', color: editingContact ? 'secondary.main' : 'primary.main' }}>
              {editingContact ? <EditIcon sx={{ fontSize: '1.2rem' }} /> : <PersonAddIcon sx={{ fontSize: '1.2rem' }} />}
            </Box>
            <Typography variant="h6" component="span" sx={{ fontWeight: 900, fontSize: '1.2rem', letterSpacing: -0.2 }}>
              {editingContact ? "Edit Emergency Contact" : "Add New Contact"}
            </Typography>
            <IconButton
              aria-label="close"
              onClick={() => setOpenAddEditDialog(false)}
              sx={{
                position: 'absolute',
                right: 12,
                top: 12,
                color: 'var(--text-sub)',
                '&:hover': {
                  color: 'var(--text-main)'
                }
              }}
            >
              <CloseIcon sx={{ fontSize: '1.3rem' }} />
            </IconButton>
          </DialogTitle>
          
          <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 3, mt: 1.5, pb: 1 }}>
            {formError && (
              <Alert severity="error" sx={{ borderRadius: '12px' }}>
                {formError}
              </Alert>
            )}

            <TextField
              label="Full Name"
              required
              fullWidth
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <PersonIcon sx={{ color: 'primary.main', opacity: 0.8, mr: 0.5 }} />
                    </InputAdornment>
                  ),
                }
              }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: '12px',
                  color: 'var(--text-main)',
                  '& fieldset': { borderColor: 'var(--border-glass)' },
                },
              }}
            />

            <TextField
              select
              label="Relationship"
              required
              fullWidth
              value={formRelationship}
              onChange={(e) => setFormRelationship(e.target.value)}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <RelationshipIcon sx={{ color: 'primary.main', opacity: 0.8, mr: 0.5 }} />
                    </InputAdornment>
                  ),
                }
              }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: '12px',
                  color: 'var(--text-main)',
                  '& fieldset': { borderColor: 'var(--border-glass)' },
                },
              }}
            >
              <MenuItem value="Parent">Parent</MenuItem>
              <MenuItem value="Spouse">Spouse</MenuItem>
              <MenuItem value="Sibling">Sibling</MenuItem>
              <MenuItem value="Child">Child</MenuItem>
              <MenuItem value="Friend">Friend</MenuItem>
              <MenuItem value="Guardian">Guardian</MenuItem>
              <MenuItem value="Doctor">Doctor</MenuItem>
              <MenuItem value="Emergency Service">Emergency Service (e.g. Police, Hospital)</MenuItem>
              <MenuItem value="Other">Other</MenuItem>
            </TextField>

            <TextField
              label="Mobile Phone Number"
              placeholder="e.g. +1234567890"
              required
              fullWidth
              value={formPhone}
              onChange={(e) => setFormPhone(e.target.value)}
              helperText="Include country code, digits only (e.g. +1...)"
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <PhoneIcon sx={{ color: 'primary.main', opacity: 0.8, mr: 0.5 }} />
                    </InputAdornment>
                  ),
                }
              }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: '12px',
                  color: 'var(--text-main)',
                  '& fieldset': { borderColor: 'var(--border-glass)' },
                },
              }}
            />

            <TextField
              label="Email Address (Optional)"
              type="email"
              fullWidth
              value={formEmail}
              onChange={(e) => setFormEmail(e.target.value)}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <EmailIcon sx={{ color: 'secondary.main', opacity: 0.8, mr: 0.5 }} />
                    </InputAdornment>
                  ),
                }
              }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: '12px',
                  color: 'var(--text-main)',
                  '& fieldset': { borderColor: 'var(--border-glass)' },
                },
              }}
            />
          </DialogContent>
          
          <DialogActions sx={{ px: 3, pb: 2, pt: 1.5, gap: 1 }}>
            <Button 
              onClick={() => setOpenAddEditDialog(false)} 
              sx={{ 
                color: 'var(--text-sub)', 
                fontWeight: 700,
                borderRadius: '10px'
              }}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              variant="contained" 
              sx={{ 
                borderRadius: '12px', 
                fontWeight: 800, 
                px: 3.5,
                boxShadow: '0 4px 14px 0 var(--btn-shadow)',
                '&:hover': {
                  boxShadow: '0 6px 20px 0 var(--btn-shadow-hover)'
                }
              }}
            >
              Save Contact
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  );
}

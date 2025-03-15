import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Container,
  Typography,
  Paper,
  Box,
  Grid,
  Button,
  TextField,
  Switch,
  FormControlLabel,
  Alert,
  CircularProgress,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  Divider,
  Tooltip,
  ToggleButton,
  ToggleButtonGroup,
  IconButton,
  InputAdornment
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import RefreshIcon from '@mui/icons-material/Refresh';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';

function PeerCreate() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialInterfaceId = searchParams.get('interface');
  
  // Key configuration mode
  const [keyMode, setKeyMode] = useState('auto'); // 'auto' or 'manual'
  const [copySuccess, setCopySuccess] = useState({
    publicKey: false,
    privateKey: false
  });
  
  const [formData, setFormData] = useState({
    name: '',
    allowedIPs: '',
    persistentKeepalive: 25,
    wireguardConfigId: initialInterfaceId || '',
    enabled: true,
    comment: '',
    publicKey: '',
    privateKey: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [interfaces, setInterfaces] = useState([]);
  const [interfacesLoading, setInterfacesLoading] = useState(true);
  const [isIPSuggested, setIsIPSuggested] = useState(false);

  // Load interface list
  useEffect(() => {
    const fetchInterfaces = async () => {
      try {
        setInterfacesLoading(true);
        const response = await fetch('/api/wireguard/interfaces');
        
        if (!response.ok) {
          throw new Error(t('errors.fetchInterfacesFailed'));
        }
        
        const data = await response.json();
        setInterfaces(data);
        
        // Only auto-select if an initial interface ID is passed through the URL
        if (initialInterfaceId) {
          const interfaceExists = data.some(inf => inf.id.toString() === initialInterfaceId);
          if (interfaceExists) {
            setFormData(prev => ({
              ...prev,
              wireguardConfigId: initialInterfaceId
            }));
          } else {
            // If the interface ID in the URL does not exist, clear the selection
            setFormData(prev => ({
              ...prev,
              wireguardConfigId: ''
            }));
          }
        }
        // No longer auto-select the first interface
        
      } catch (err) {
        console.error(t('errors.fetchInterfaces'), err);
        setError(t('errors.fetchInterfacesCheckConnection'));
      } finally {
        setInterfacesLoading(false);
      }
    };
    
    fetchInterfaces();
  }, [initialInterfaceId, t]);

  // Automatically get suggested IP address
  useEffect(() => {
    const fetchSuggestedIP = async () => {
      try {
        if (!formData.wireguardConfigId) return;
        
        const response = await fetch(`/api/wireguard/interfaces/${formData.wireguardConfigId}/suggest-ip`);
        
        if (response.ok) {
          const data = await response.json();
          setFormData(prev => ({
            ...prev,
            allowedIPs: data.suggestedIP
          }));
          setIsIPSuggested(true);
        }
      } catch (err) {
        console.error(t('errors.suggestedIPError'), err);
        // Silent failure, does not affect user experience
      }
    };
    
    fetchSuggestedIP();
  }, [formData.wireguardConfigId, t]);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    // Cancel "suggested" status when IP is manually changed
    if (name === 'allowedIPs') {
      setIsIPSuggested(false);
    }
    
    // When selecting a new interface, clear allowedIPs to trigger useEffect to get a new suggested IP
    if (name === 'wireguardConfigId') {
      setFormData(prev => ({
        ...prev,
        [name]: value,
        allowedIPs: ''  // Clear IP address to let useEffect fetch a new one
      }));
      return; // Return directly to avoid executing setFormData again
    }
    
    // Handle changes for other form fields
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value
    });
  };

  const handleKeyModeChange = (event, newMode) => {
    if (newMode !== null) {
      setKeyMode(newMode);
      
      // When switching from manual to auto, clear public key fields
      if (newMode === 'auto') {
        setFormData(prev => ({
          ...prev,
          publicKey: ''
        }));
        
        // Automatically generate new key pair when switching to auto mode
        generateKeyPair();
      }
    }
  };

  const generateKeyPair = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/wireguard/generate-keys', {
        method: 'GET',
      });
      
      if (!response.ok) {
        throw new Error(t('errors.generateKeysFailed'));
      }
      
      const { publicKey, privateKey } = await response.json();
      
      setFormData(prev => ({
        ...prev,
        publicKey,
        privateKey
      }));
      
      setLoading(false);
    } catch (error) {
      console.error(t('errors.generateKeysError'), error);
      setError(t('errors.generateKeysErrorMessage') + error.message);
      setLoading(false);
    }
  };

  const handleCopyKey = (keyType) => {
    const keyValue = keyType === 'publicKey' ? formData.publicKey : formData.privateKey;
    if (!keyValue) return;
    
    navigator.clipboard.writeText(keyValue).then(() => {
      setCopySuccess(prev => ({
        ...prev,
        [keyType]: true
      }));
      
      setTimeout(() => {
        setCopySuccess(prev => ({
          ...prev,
          [keyType]: false
        }));
      }, 2000);
    });
  };

  const validateForm = () => {
    const errors = [];
    
    if (!formData.name.trim()) {
      errors.push(t('peerCreate.validation.nameRequired'));
    }
    
    if (!formData.wireguardConfigId) {
      errors.push(t('peerCreate.validation.interfaceRequired'));
    }
    
    if (!formData.allowedIPs.trim()) {
      errors.push(t('peerCreate.validation.allowedIPsRequired'));
    } else {
      // Simple IP address format check
      const ipPattern = /^(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\/\d{1,2})(,\s*\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\/\d{1,2})*$/;
      if (!ipPattern.test(formData.allowedIPs)) {
        errors.push(t('peerCreate.validation.allowedIPsFormat'));
      }
    }
    
    if (formData.persistentKeepalive !== '' && 
        (isNaN(formData.persistentKeepalive) || 
         parseInt(formData.persistentKeepalive) < 0 || 
         parseInt(formData.persistentKeepalive) > 1000)) {
      errors.push(t('peerCreate.validation.keepaliveRange'));
    }
    
    // Manual mode, verify public key
    if (keyMode === 'manual') {
      if (!formData.publicKey.trim()) {
        errors.push(t('peerCreate.validation.publicKeyRequired'));
      } else if (!/^[A-Za-z0-9+/]{42,44}=$/.test(formData.publicKey)) {
        errors.push(t('peerCreate.validation.publicKeyFormat'));
      }
    }
    
    return errors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const validationErrors = validateForm();
    if (validationErrors.length > 0) {
      setError(validationErrors.join('；'));
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      // Ensure wireguardConfigId is an integer
      const dataToSubmit = {
        ...formData,
        wireguardConfigId: parseInt(formData.wireguardConfigId, 10),
        persistentKeepalive: parseInt(formData.persistentKeepalive, 10),
        generateKeyPair: keyMode === 'auto'  // Only generate key pair in auto mode
      };
      
      const response = await fetch('/api/wireguard/peers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(dataToSubmit)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || t('errors.createPeerFailed'));
      }
      
      const createdPeer = await response.json();
      
      // Peer created, redirect to peer details page
      navigate(`/peers/${createdPeer.peer.id}`);
    } catch (err) {
      console.error(t('errors.createPeerError'), err);
      setError(err.message || t('errors.createPeerTryAgain'));
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    // Get source parameter, if from home page return to home page
    const fromHome = searchParams.get('from') === 'home';
    
    if (fromHome) {
      navigate('/');
    } else if (initialInterfaceId) {
      navigate(`/interfaces/${initialInterfaceId}?tab=peers`);
    } else {
      navigate('/peers');
    }
  };

  // Auto-generate key pair when component mounts
  useEffect(() => {
    if (keyMode === 'auto') {
      generateKeyPair();
    }
  }, [keyMode]);

  if (loading && !interfaces.length) {
    return (
      <Container maxWidth="xl" sx={{ mt: 4, textAlign: 'center' }}>
        <CircularProgress />
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="xl" sx={{ mt: 4 }}>
        <Alert severity="error" sx={{ mt: 4 }}>{error}</Alert>
      </Container>
    );
  }

  if (interfaces.length === 0) {
    return (
      <Container maxWidth="xl" sx={{ mt: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
          <IconButton 
            onClick={() => navigate('/peers')}
            sx={{ mr: 1 }}
          >
            <ArrowBackIcon />
          </IconButton>
          
          <Typography variant="h5" sx={{ mb: 1 }}>
            {t('peerCreate.title')}
          </Typography>
        </Box>
        
        <Alert severity="warning" sx={{ mb: 3 }}>
          {t('peerCreate.noInterfaces')}
        </Alert>
        
        <Button 
          variant="contained" 
          onClick={() => navigate('/interfaces/new')}
        >
          {t('peerCreate.createInterface')}
        </Button>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ mt: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={handleCancel}
          sx={{ mb: 2 }}
        >
          {t('peerCreate.backButton')}
        </Button>
        
        <Typography variant="h5" sx={{ mb: 1 }}>
          {t('peerCreate.title')}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {t('peerCreate.description')}
        </Typography>
      </Box>
      
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}
      
      <Paper sx={{ p: 3 }}>
        <form onSubmit={handleSubmit}>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                {t('peerCreate.form.basicSettings')}
              </Typography>
              <Divider sx={{ mb: 2 }} />
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                required
                label={t('peerCreate.form.peerName')}
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                helperText={t('peerCreate.form.peerNameHelp')}
              />
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth required>
                <InputLabel id="interface-select-label">{t('peerCreate.form.selectInterface')}</InputLabel>
                <Select
                  labelId="interface-select-label"
                  value={formData.wireguardConfigId}
                  onChange={handleInputChange}
                  name="wireguardConfigId"
                  label={t('peerCreate.form.selectInterface')}
                >
                  <MenuItem value="" disabled>
                    <em>{t('peerCreate.form.selectInterfacePlaceholder')}</em>
                  </MenuItem>
                  {interfaces.map((interface_) => (
                    <MenuItem key={interface_.id} value={interface_.id}>
                      {interface_.name}
                      {interface_.listenPort && ` (${t('interfaces.table.listenPort')}: ${interface_.listenPort})`}
                      {interface_.address && ` - ${interface_.address}`}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            
            {/* Key configuration mode selection */}
            <Grid item xs={12}>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                {t('peerCreate.form.keySettings')}
                <Tooltip title={t('peerCreate.form.keySettingsHelp')}>
                  <HelpOutlineIcon color="action" fontSize="small" sx={{ ml: 1, verticalAlign: 'middle' }} />
                </Tooltip>
              </Typography>
              <Divider sx={{ mb: 2 }} />
              
              <ToggleButtonGroup
                value={keyMode}
                exclusive
                onChange={handleKeyModeChange}
                color="primary"
                size="small"
                sx={{ mb: 2 }}
              >
                <ToggleButton value="auto">
                  {t('peerCreate.form.keyModeAuto')}
                </ToggleButton>
                <ToggleButton value="manual">
                  {t('peerCreate.form.keyModeManual')}
                </ToggleButton>
              </ToggleButtonGroup>
              
              {keyMode === 'auto' && (
                <Box sx={{ mb: 2 }}>
                  <Alert severity="info" sx={{ mb: 2 }}>
                    {t('peerCreate.form.autoKeyInfo')}
                  </Alert>
                  
                  {formData.publicKey && (
                    <Grid container spacing={2}>
                      <Grid item xs={12}>
                        <TextField
                          fullWidth
                          label={t('peerCreate.form.generatedPublicKey')}
                          value={formData.publicKey}
                          InputProps={{
                            readOnly: true,
                            endAdornment: (
                              <InputAdornment position="end">
                                <Tooltip title={t('peerCreate.form.copyPublicKey')}>
                                  <IconButton onClick={() => handleCopyKey('publicKey')} edge="end">
                                    {copySuccess.publicKey ? (
                                      <Typography variant="caption" color="success.main">{t('peerCreate.form.copied')}</Typography>
                                    ) : (
                                      <ContentCopyIcon />
                                    )}
                                  </IconButton>
                                </Tooltip>
                              </InputAdornment>
                            )
                          }}
                        />
                      </Grid>
                    </Grid>
                  )}
                  
                  <Button 
                    variant="outlined" 
                    startIcon={<RefreshIcon />}
                    onClick={generateKeyPair}
                    sx={{ mt: 2 }}
                    disabled={loading}
                  >
                    {loading ? t('peerCreate.form.regenerating') : t('peerCreate.form.regenerateKeyPair')}
                  </Button>
                </Box>
              )}
              
              {keyMode === 'manual' && (
                <Box sx={{ mb: 2 }}>
                  <Alert severity="info" sx={{ mb: 2 }}>
                    {t('peerCreate.form.manualKeyInfo')}
                  </Alert>
                  
                  <TextField
                    fullWidth
                    required
                    label={t('peerCreate.form.publicKeyLabel')}
                    name="publicKey"
                    value={formData.publicKey}
                    onChange={handleInputChange}
                    helperText={t('peerCreate.form.publicKeyHelp')}
                    sx={{ mb: 2 }}
                  />
                </Box>
              )}
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                required
                label={t('peerCreate.form.allowedIPs')}
                name="allowedIPs"
                value={formData.allowedIPs}
                onChange={handleInputChange}
                helperText={
                  isIPSuggested ? 
                  t('peerCreate.form.suggestedIP') : 
                  t('peerCreate.form.allowedIPsHelp')
                }
                InputProps={{
                  endAdornment: isIPSuggested && (
                    <Tooltip title={t('peerCreate.form.suggestedIPTooltip')}>
                      <HelpOutlineIcon 
                        color="action" 
                        fontSize="small" 
                        sx={{ position: 'absolute', right: 10 }} 
                      />
                    </Tooltip>
                  )
                }}
              />
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label={t('peerCreate.form.persistentKeepalive')}
                name="persistentKeepalive"
                value={formData.persistentKeepalive}
                onChange={handleInputChange}
                type="number"
                helperText={t('peerCreate.form.persistentKeepaliveHelp')}
              />
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <Box sx={{ height: '100%', display: 'flex', alignItems: 'center' }}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={formData.enabled}
                      onChange={handleInputChange}
                      name="enabled"
                      color="primary"
                    />
                  }
                  label={t('peerCreate.form.enablePeer')}
                />
                <Tooltip title={t('peerCreate.form.enablePeerTooltip')}>
                  <HelpOutlineIcon color="action" fontSize="small" sx={{ ml: 1 }} />
                </Tooltip>
              </Box>
            </Grid>
            
            <Grid item xs={12}>
              <TextField
                fullWidth
                label={t('peerCreate.form.comment')}
                name="comment"
                value={formData.comment}
                onChange={handleInputChange}
                multiline
                rows={2}
                helperText={t('peerCreate.form.commentHelp')}
              />
            </Grid>
            
            <Grid item xs={12}>
              <Typography variant="body2" color="text.secondary" paragraph>
                {t('peerCreate.form.note')}
              </Typography>
            </Grid>
            
            <Grid item xs={12}>
              <Divider sx={{ mb: 2 }} />
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
                <Button 
                  variant="outlined" 
                  onClick={handleCancel}
                  disabled={loading}
                >
                  {t('peerCreate.form.cancel')}
                </Button>
                <Button 
                  type="submit" 
                  variant="contained" 
                  disabled={loading}
                  startIcon={loading ? <CircularProgress size={20} /> : null}
                >
                  {loading ? t('peerCreate.form.creating') : t('peerCreate.form.createPeer')}
                </Button>
              </Box>
            </Grid>
          </Grid>
        </form>
      </Paper>
    </Container>
  );
}

export default PeerCreate; 
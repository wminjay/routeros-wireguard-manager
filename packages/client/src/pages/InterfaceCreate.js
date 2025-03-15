import React, { useState } from 'react';
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
  IconButton,
  Tooltip,
  Divider
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import AutorenewIcon from '@mui/icons-material/Autorenew';

function InterfaceCreate() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [formData, setFormData] = useState({
    name: '',
    interfaceName: '',
    listenPort: '',
    address: '',
    mtu: '1420',
    enabled: true,
    comment: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isGeneratingPort, setIsGeneratingPort] = useState(false);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value
    });
  };

  const handleGeneratePort = () => {
    // 生成随机端口 (10000-60000范围)
    const randomPort = Math.floor(Math.random() * 50000) + 10000;
    setFormData({
      ...formData,
      listenPort: randomPort.toString()
    });
    setIsGeneratingPort(true);
    setTimeout(() => setIsGeneratingPort(false), 500);
  };

  const validateForm = () => {
    const errors = [];
    
    if (!formData.name.trim()) {
      errors.push(t('interfaceCreate.validation.interfaceNameRequired'));
    }
    
    if (!formData.interfaceName.trim()) {
      errors.push(t('interfaceCreate.validation.routerOSInterfaceNameRequired'));
    }
    
    if (!formData.listenPort) {
      errors.push(t('interfaceCreate.validation.listenPortRequired'));
    } else if (isNaN(formData.listenPort) || 
               parseInt(formData.listenPort) < 1024 || 
               parseInt(formData.listenPort) > 65535) {
      errors.push(t('interfaceCreate.validation.listenPortRange'));
    }
    
    if (formData.mtu && (isNaN(formData.mtu) || 
                         parseInt(formData.mtu) < 1280 || 
                         parseInt(formData.mtu) > 1500)) {
      errors.push(t('interfaceCreate.validation.mtuRange'));
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
      
      const response = await fetch('/api/wireguard/interfaces', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || t('interfaceCreate.errors.createFailed'));
      }
      
      const createdInterface = await response.json();
      
      // 创建成功，跳转到接口详情页
      navigate(`/interfaces/${createdInterface.interface.id}`);
    } catch (err) {
      console.error(t('interfaceCreate.errors.createError'), err);
      setError(err.message || t('interfaceCreate.errors.createTryAgain'));
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    // 获取来源参数，如果来自首页则返回首页
    const fromHome = searchParams.get('from') === 'home';
    
    if (fromHome) {
      navigate('/');
    } else {
      navigate('/interfaces');
    }
  };

  // 根据名称自动生成RouterOS接口名称
  const handleNameChange = (e) => {
    const { value } = e.target;
    handleInputChange(e);
    
    // 如果interfaceName为空或与之前的name相关，则自动生成
    if (!formData.interfaceName || formData.interfaceName === formData.name.replace(/[^a-zA-Z0-9_-]/g, '_')) {
      const sanitizedName = value.replace(/[^a-zA-Z0-9_-]/g, '_');
      setFormData(prev => ({
        ...prev,
        interfaceName: sanitizedName
      }));
    }
  };

  return (
    <Container maxWidth="xl" sx={{ mt: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={handleCancel}
          sx={{ mb: 2 }}
        >
          {t('common.back')}
        </Button>
        
        <Typography variant="h5" sx={{ mb: 1 }}>
          {t('interfaceCreate.title')}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {t('interfaceCreate.description')}
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
                {t('interfaceCreate.form.basicSettings')}
              </Typography>
              <Divider sx={{ mb: 2 }} />
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                required
                label={t('interfaceCreate.form.interfaceName')}
                name="name"
                value={formData.name}
                onChange={handleNameChange}
                helperText={t('interfaceCreate.form.interfaceNameHelp')}
              />
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                required
                label={t('interfaceCreate.form.routerOSInterfaceName')}
                name="interfaceName"
                value={formData.interfaceName}
                onChange={handleInputChange}
                helperText={t('interfaceCreate.form.routerOSInterfaceNameHelp')}
              />
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <Box sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'space-between'
              }}>
                <TextField
                  fullWidth
                  required
                  label={t('interfaceCreate.form.listenPort')}
                  name="listenPort"
                  value={formData.listenPort}
                  onChange={handleInputChange}
                  type="number"
                  helperText={t('interfaceCreate.form.listenPortHelp')}
                  InputProps={{
                    endAdornment: (
                      <Tooltip title={t('interfaceCreate.form.generateRandomPort')}>
                        <IconButton 
                          size="small" 
                          onClick={handleGeneratePort}
                          sx={{ mr: -1 }}
                          color={isGeneratingPort ? "primary" : "default"}
                        >
                          <AutorenewIcon 
                            fontSize="small" 
                            sx={{ 
                              animation: isGeneratingPort ? 'spin 0.5s linear' : 'none',
                              '@keyframes spin': {
                                '0%': { transform: 'rotate(0deg)' },
                                '100%': { transform: 'rotate(360deg)' }
                              }
                            }} 
                          />
                        </IconButton>
                      </Tooltip>
                    )
                  }}
                />
              </Box>
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label={t('interfaceCreate.form.address')}
                name="address"
                value={formData.address}
                onChange={handleInputChange}
                helperText={t('interfaceCreate.form.addressHelp')}
              />
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label={t('interfaceCreate.form.mtu')}
                name="mtu"
                value={formData.mtu}
                onChange={handleInputChange}
                type="number"
                helperText={t('interfaceCreate.form.mtuHelp')}
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
                  label={t('interfaceCreate.form.enabled')}
                />
                <Tooltip title={t('interfaceCreate.form.enabledTooltip')}>
                  <HelpOutlineIcon color="action" fontSize="small" sx={{ ml: 1 }} />
                </Tooltip>
              </Box>
            </Grid>
            
            <Grid item xs={12}>
              <TextField
                fullWidth
                label={t('interfaceCreate.form.comment')}
                name="comment"
                value={formData.comment}
                onChange={handleInputChange}
                multiline
                rows={2}
                helperText={t('interfaceCreate.form.commentHelp')}
              />
            </Grid>
            
            <Grid item xs={12}>
              <Typography variant="body2" color="text.secondary" paragraph>
                {t('interfaceCreate.note')}
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
                  {t('interfaceCreate.buttons.cancel')}
                </Button>
                <Button 
                  type="submit" 
                  variant="contained" 
                  disabled={loading}
                  startIcon={loading ? <CircularProgress size={20} /> : null}
                >
                  {loading ? t('interfaceCreate.buttons.creating') : t('interfaceCreate.buttons.create')}
                </Button>
              </Box>
            </Grid>
          </Grid>
        </form>
      </Paper>
    </Container>
  );
}

export default InterfaceCreate; 
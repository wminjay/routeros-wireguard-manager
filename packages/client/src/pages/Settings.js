import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Container,
  Typography,
  Paper,
  Box,
  Grid,
  Button,
  TextField,
  CircularProgress,
  Alert,
  Divider,
  InputAdornment,
  IconButton,
  Card,
  CardContent
} from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import RefreshIcon from '@mui/icons-material/Refresh';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import DnsIcon from '@mui/icons-material/Dns';

function Settings() {
  const { t } = useTranslation();
  const [settings, setSettings] = useState({
    routerAddress: '',
    routerPort: '8728',
    routerUser: 'admin',
    routerPassword: '',
    defaultDNS: '1.1.1.1, 8.8.8.8',
    serverAddress: '',
    serverPort: ''
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saveLoading, setSaveLoading] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [testLoading, setTestLoading] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState(null);

  useEffect(() => {
    // 加载设置
    const fetchSettings = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/settings');
        
        if (!response.ok) {
          throw new Error(t('settings.errors.fetchFailed'));
        }
        
        const data = await response.json();
        
        // 正确处理嵌套结构
        if (data.settings) {
          // 从routerOS和app对象中提取设置
          const routerOSSettings = data.settings.routerOS || {};
          const appSettings = data.settings.app || {};
          
          // 合并为前端使用的扁平结构
          setSettings({
            // RouterOS连接设置
            routerAddress: routerOSSettings.routerAddress || '',
            routerPort: routerOSSettings.routerPort || '8728',
            routerUser: routerOSSettings.routerUser || 'admin',
            routerPassword: routerOSSettings.routerPassword || '',
            
            // 应用设置
            defaultDNS: appSettings.defaultDNS || '1.1.1.1, 8.8.8.8',
            serverAddress: appSettings.serverAddress || '',
            serverPort: appSettings.serverPort || ''
          });
        }
        
        // 处理连接状态
        if (data.status && data.success) {
          setConnectionStatus({
            connected: data.status === 'connected',
            model: data.device || t('settings.routerOS.device'),
            version: ''
          });
        }
        
        setError(null);
      } catch (err) {
        console.error(t('settings.errors.fetchError'), err);
        setError(t('settings.errors.fetchErrorMessage'));
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, [t]);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setSettings({
      ...settings,
      [name]: type === 'checkbox' ? checked : value
    });
  };

  const handleShowPassword = () => {
    setShowPassword(!showPassword);
  };

  const handleTestConnection = async () => {
    try {
      setTestLoading(true);
      setTestResult(null);
      
      const response = await fetch('/api/settings/test-connection', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          routerAddress: settings.routerAddress,
          routerPort: settings.routerPort,
          routerUser: settings.routerUser,
          routerPassword: settings.routerPassword
        })
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setTestResult({
          success: true,
          message: t('settings.test.success', { version: data.version || t('settings.test.unknown'), model: data.model || t('settings.test.unknown') })
        });
      } else {
        setTestResult({
          success: false,
          message: data.message || t('settings.test.failed')
        });
      }
    } catch (err) {
      console.error(t('settings.errors.testError'), err);
      setTestResult({
        success: false,
        message: t('settings.errors.testErrorMessage')
      });
    } finally {
      setTestLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      setSaveLoading(true);
      setSaveError(null);
      setSaveSuccess(false);
      
      // 将扁平结构转换为API需要的嵌套结构
      const apiData = {
        routerOS: {
          routerAddress: settings.routerAddress,
          routerPort: settings.routerPort,
          routerUser: settings.routerUser,
          routerPassword: settings.routerPassword
        },
        app: {
          defaultDNS: settings.defaultDNS,
          serverAddress: settings.serverAddress,
          serverPort: settings.serverPort
        }
      };
      
      // 在顶层也添加属性，确保与原始请求兼容
      const requestData = {
        ...settings,
        ...apiData
      };
      
      const response = await fetch('/api/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestData)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || t('settings.errors.saveFailed'));
      }
      
      // 保存成功
      setSaveSuccess(true);
      
      // 更新连接状态
      const statusResponse = await fetch('/api/settings/connection-status');
      if (statusResponse.ok) {
        const statusData = await statusResponse.json();
        setConnectionStatus({
          connected: statusData.status === 'connected',
          model: statusData.device || t('settings.routerOS.device'),
          version: ''
        });
      }
    } catch (err) {
      console.error(t('settings.errors.saveError'), err);
      setSaveError(err.message || t('settings.errors.saveTryAgain'));
    } finally {
      setSaveLoading(false);
    }
  };

  if (loading) {
    return (
      <Container maxWidth="xl" sx={{ mt: 4, textAlign: 'center' }}>
        <CircularProgress />
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ mt: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h5" gutterBottom>
          {t('settings.title')}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {t('settings.subtitle')}
        </Typography>
      </Box>
      
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}
      
      {saveSuccess && (
        <Alert severity="success" sx={{ mb: 3 }}>
          {t('settings.saveSuccess')}
        </Alert>
      )}
      
      {saveError && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {saveError}
        </Alert>
      )}
      
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Paper sx={{ p: 3, mb: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
              <Typography variant="subtitle1" gutterBottom>
                {t('settings.routerOS.connectionStatus')}
              </Typography>
              <Button 
                startIcon={<RefreshIcon />}
                size="small"
                onClick={handleTestConnection}
                disabled={testLoading}
              >
                {t('settings.test.button')}
              </Button>
            </Box>
            
            {connectionStatus ? (
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                {connectionStatus.connected ? (
                  <CheckCircleIcon color="success" sx={{ mr: 1 }} />
                ) : (
                  <ErrorIcon color="error" sx={{ mr: 1 }} />
                )}
                <Typography variant="body1">
                  {connectionStatus.connected 
                    ? t('settings.status.connected', { model: connectionStatus.model, version: connectionStatus.version })
                    : t('settings.status.disconnected')}
                </Typography>
              </Box>
            ) : (
              <Typography variant="body1" color="text.secondary">
                {t('settings.status.unknown')}
              </Typography>
            )}
            
            {testResult && (
              <Alert 
                severity={testResult.success ? "success" : "error"}
                sx={{ mt: 1 }}
              >
                {testResult.message}
              </Alert>
            )}
          </Paper>
        </Grid>
        
        <Grid item xs={12}>
          <Paper sx={{ p: 3 }}>
            <form onSubmit={handleSubmit}>
              <Grid container spacing={3}>
                <Grid item xs={12}>
                  <Typography variant="subtitle1">
                    {t('settings.routerOS.title')}
                  </Typography>
                  <Divider sx={{ mb: 2 }} />
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    required
                    label={t('settings.routerOS.address')}
                    name="routerAddress"
                    value={settings.routerAddress}
                    onChange={handleInputChange}
                    helperText={t('settings.routerOS.addressHelp')}
                  />
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    required
                    label={t('settings.routerOS.port')}
                    name="routerPort"
                    value={settings.routerPort}
                    onChange={handleInputChange}
                    type="number"
                    helperText={t('settings.routerOS.portHelp')}
                  />
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    required
                    label={t('settings.routerOS.username')}
                    name="routerUser"
                    value={settings.routerUser}
                    onChange={handleInputChange}
                    helperText={t('settings.routerOS.usernameHelp')}
                  />
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    required
                    label={t('settings.routerOS.password')}
                    name="routerPassword"
                    value={settings.routerPassword}
                    onChange={handleInputChange}
                    type={showPassword ? 'text' : 'password'}
                    helperText={t('settings.routerOS.passwordHelp')}
                    InputProps={{
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton
                            aria-label={t('settings.routerOS.togglePassword')}
                            onClick={handleShowPassword}
                            edge="end"
                          >
                            {showPassword ? <VisibilityOff /> : <Visibility />}
                          </IconButton>
                        </InputAdornment>
                      )
                    }}
                  />
                </Grid>
                
                <Grid item xs={12}>
                  <Typography variant="subtitle1" sx={{ mt: 2 }}>
                    {t('settings.wireguard.title')}
                  </Typography>
                  <Divider sx={{ mb: 2 }} />
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label={t('settings.wireguard.defaultDNS')}
                    name="defaultDNS"
                    value={settings.defaultDNS}
                    onChange={handleInputChange}
                    helperText={t('settings.wireguard.defaultDNSHelp')}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <DnsIcon />
                        </InputAdornment>
                      )
                    }}
                  />
                </Grid>
                
                <Grid item xs={12}>
                  <Typography variant="subtitle1" sx={{ mt: 2 }}>
                    {t('settings.client.title')}
                  </Typography>
                  <Divider sx={{ mb: 2 }} />
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label={t('settings.client.serverAddress')}
                    name="serverAddress"
                    value={settings.serverAddress}
                    onChange={handleInputChange}
                    helperText={t('settings.client.serverAddressHelp')}
                  />
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label={t('settings.client.serverPort')}
                    name="serverPort"
                    value={settings.serverPort}
                    onChange={handleInputChange}
                    helperText={t('settings.client.serverPortHelp')}
                  />
                </Grid>
                
                <Grid item xs={12}>
                  <Divider sx={{ mb: 2 }} />
                  <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <Button 
                      type="submit" 
                      variant="contained" 
                      startIcon={<SaveIcon />}
                      disabled={saveLoading}
                    >
                      {saveLoading ? t('settings.saving') : t('settings.saveButton')}
                    </Button>
                  </Box>
                </Grid>
              </Grid>
            </form>
          </Paper>
        </Grid>
        
        <Grid item xs={12}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="subtitle1" gutterBottom>
              {t('settings.system.title')}
            </Typography>
            <Divider sx={{ mb: 2 }} />
            
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                      {t('settings.system.version')}
                    </Typography>
                    <Grid container spacing={1}>
                      <Grid item xs={4}>
                        <Typography variant="body2" color="text.secondary">
                          {t('settings.system.systemVersion')}
                        </Typography>
                      </Grid>
                      <Grid item xs={8}>
                        <Typography variant="body2">
                          v0.0.1
                        </Typography>
                      </Grid>
                      
                      <Grid item xs={4}>
                        <Typography variant="body2" color="text.secondary">
                          {t('settings.system.apiVersion')}
                        </Typography>
                      </Grid>
                      <Grid item xs={8}>
                        <Typography variant="body2">
                          v0.0.1
                        </Typography>
                      </Grid>
                      
                      <Grid item xs={4}>
                        <Typography variant="body2" color="text.secondary">
                          {t('settings.system.license')}
                        </Typography>
                      </Grid>
                      <Grid item xs={8}>
                        <Typography variant="body2">
                          MIT
                        </Typography>
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>
              </Grid>
              
              <Grid item xs={12} md={6}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                      {t('settings.support.title')}
                    </Typography>
                    <Grid container spacing={1}>
                      <Grid item xs={4}>
                        <Typography variant="body2" color="text.secondary">
                          {t('settings.support.documentation')}
                        </Typography>
                      </Grid>
                      <Grid item xs={8}>
                        <Typography variant="body2">
                          <a href="https://github.com/wminjay/routeros-wireguard-manager" target="_blank" rel="noopener noreferrer">
                            {t('settings.support.viewDocs')}
                          </a>
                        </Typography>
                      </Grid>
                      
                      <Grid item xs={4}>
                        <Typography variant="body2" color="text.secondary">
                          {t('settings.support.reportIssue')}
                        </Typography>
                      </Grid>
                      <Grid item xs={8}>
                        <Typography variant="body2">
                          <a href="https://github.com/wminjay/routeros-wireguard-manager/issues" target="_blank" rel="noopener noreferrer">
                            GitHub Issues
                          </a>
                        </Typography>
                      </Grid>
                      
                      <Grid item xs={4}>
                        <Typography variant="body2" color="text.secondary">
                          {t('settings.support.contribute')}
                        </Typography>
                      </Grid>
                      <Grid item xs={8}>
                        <Typography variant="body2">
                          <a href="https://github.com/wminjay/routeros-wireguard-manager" target="_blank" rel="noopener noreferrer">
                            {t('settings.support.repository')}
                          </a>
                        </Typography>
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
}

export default Settings; 
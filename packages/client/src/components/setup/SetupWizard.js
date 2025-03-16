import React, { useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  Step,
  StepLabel,
  Stepper,
  TextField,
  Typography,
  Alert,
  FormControl,
  FormControlLabel,
  Checkbox,
  InputAdornment,
  IconButton,
  CircularProgress,
  Paper
} from '@mui/material';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import { useTranslation } from 'react-i18next';

function SetupWizard({ open, onComplete }) {
  const { t } = useTranslation();
  const [activeStep, setActiveStep] = useState(0);
  const [showPassword, setShowPassword] = useState(false);
  const [testLoading, setTestLoading] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    routerAddress: '',
    routerPort: '8728',
    routerUser: 'admin',
    routerPassword: '',
    defaultDNS: '1.1.1.1, 8.8.8.8',
    serverAddress: window.location.hostname,
    serverPort: window.location.port || (window.location.protocol === 'https:' ? '443' : '80'),
    setupCompleted: false,
    importExistingConfig: true
  });

  const steps = [
    t('setupWizard.steps.welcome'),
    t('setupWizard.steps.routerConnection'),
    t('setupWizard.steps.serverConfig'),
    t('setupWizard.steps.importConfig'),
    t('setupWizard.steps.complete')
  ];

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
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
          routerAddress: formData.routerAddress,
          routerPort: formData.routerPort,
          routerUser: formData.routerUser,
          routerPassword: formData.routerPassword
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

  const handleImportConfigs = async () => {
    try {
      setLoading(true);
      
      const response = await fetch('/api/wireguard/import-all', {
        method: 'POST'
      });
      
      if (!response.ok) {
        throw new Error(t('setupWizard.errors.importFailed'));
      }
      
      // 成功导入
      console.log(t('setupWizard.success.importComplete'));
      
    } catch (error) {
      console.error(t('setupWizard.errors.importError'), error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    try {
      setLoading(true);
      
      // 将扁平结构转换为API需要的嵌套结构
      const apiData = {
        routerOS: {
          routerAddress: formData.routerAddress,
          routerPort: formData.routerPort,
          routerUser: formData.routerUser,
          routerPassword: formData.routerPassword
        },
        app: {
          defaultDNS: formData.defaultDNS,
          serverAddress: formData.serverAddress,
          serverPort: formData.serverPort,
          setupCompleted: true
        }
      };
      
      const response = await fetch('/api/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(apiData)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || t('settings.errors.saveFailed'));
      }
      
      // 保存成功
      console.log(t('settings.saveSuccess'));
      
    } catch (error) {
      console.error(t('settings.errors.saveError'), error);
    } finally {
      setLoading(false);
    }
  };

  // 更新对等点状态信息
  const updatePeersStatus = async () => {
    try {
      const response = await fetch('/api/wireguard/peers/status', {
        method: 'POST'
      });
      
      if (!response.ok) {
        console.error(t('peers.errors.statusUpdateFailed'));
        return;
      }
      
      const result = await response.json();
      console.log(t('peers.statusUpdateSuccess', { updated: result.updated }));
    } catch (err) {
      console.error(t('peers.errors.statusUpdateError'), err);
    }
  };

  const handleNext = async () => {
    if (activeStep === 1) {
      // 测试连接成功后再进行下一步
      if (!testResult || !testResult.success) {
        await handleTestConnection();
        if (!testResult || !testResult.success) return;
      }
    } else if (activeStep === 2) {
      // 保存设置
      await handleSaveSettings();
    } else if (activeStep === 3 && formData.importExistingConfig) {
      // 如果用户选择导入现有配置
      await handleImportConfigs();
    } else if (activeStep === steps.length - 1) {
      // 完成设置，同步对等点握手时间，然后刷新页面
      setLoading(true);
      try {
        // 如果导入了配置，更新对等点状态
        if (formData.importExistingConfig) {
          await updatePeersStatus();
        }
        onComplete();
        // 延迟1秒后刷新页面
        setTimeout(() => {
          window.location.reload();
        }, 1000);
        return;
      } catch (error) {
        console.error("Error during final setup steps:", error);
      } finally {
        setLoading(false);
      }
    }
    
    setActiveStep((prevStep) => prevStep + 1);
  };

  const handleBack = () => {
    setActiveStep((prevStep) => prevStep - 1);
  };

  const renderStepContent = (step) => {
    switch (step) {
      case 0:
        return (
          <Box sx={{ textAlign: 'center', py: 3 }}>
            <Typography variant="h5" gutterBottom>
              {t('setupWizard.welcome.title')}
            </Typography>
            <Typography variant="body1" paragraph>
              {t('setupWizard.welcome.description')}
            </Typography>
            <Typography variant="body2" sx={{ mb: 3 }}>
              {t('setupWizard.welcome.guidance')}
            </Typography>
            <Typography variant="body2" sx={{ fontStyle: 'italic', color: 'text.secondary' }}>
              {t('setupWizard.welcome.note')}
            </Typography>
          </Box>
        );
        
      case 1:
        return (
          <Box sx={{ py: 3 }}>
            <Typography variant="h6" gutterBottom>
              {t('setupWizard.routerConnection.title')}
            </Typography>
            <Typography variant="body2" sx={{ mb: 3 }}>
              {t('setupWizard.routerConnection.description')}
            </Typography>
            
            <Grid container spacing={3}>
              <Grid item xs={12} sm={6}>
                <TextField
                  required
                  fullWidth
                  label={t('settings.routerOS.address')}
                  name="routerAddress"
                  value={formData.routerAddress}
                  onChange={handleInputChange}
                  helperText={t('setupWizard.routerConnection.addressHelper')}
                  margin="normal"
                  variant="outlined"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  required
                  fullWidth
                  label={t('settings.routerOS.port')}
                  name="routerPort"
                  type="number"
                  value={formData.routerPort}
                  onChange={handleInputChange}
                  helperText={t('setupWizard.routerConnection.portHelper')}
                  margin="normal"
                  variant="outlined"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  required
                  fullWidth
                  label={t('settings.routerOS.username')}
                  name="routerUser"
                  value={formData.routerUser}
                  onChange={handleInputChange}
                  helperText={t('setupWizard.routerConnection.usernameHelper')}
                  margin="normal"
                  variant="outlined"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  required
                  fullWidth
                  label={t('settings.routerOS.password')}
                  name="routerPassword"
                  type={showPassword ? 'text' : 'password'}
                  value={formData.routerPassword}
                  onChange={handleInputChange}
                  helperText={t('setupWizard.routerConnection.passwordHelper')}
                  margin="normal"
                  variant="outlined"
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          aria-label={t('settings.showPassword')}
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
                <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
                  <Button
                    variant="contained"
                    color="primary"
                    onClick={handleTestConnection}
                    disabled={testLoading}
                    startIcon={testLoading ? <CircularProgress size={20} /> : null}
                  >
                    {t('setupWizard.routerConnection.testButton')}
                  </Button>
                </Box>
              </Grid>
              
              {testResult && (
                <Grid item xs={12}>
                  <Alert 
                    severity={testResult.success ? 'success' : 'error'}
                    sx={{ mt: 2 }}
                  >
                    {testResult.message}
                  </Alert>
                </Grid>
              )}
            </Grid>
          </Box>
        );
        
      case 2:
        return (
          <Box sx={{ py: 3 }}>
            <Typography variant="h6" gutterBottom>
              {t('setupWizard.serverConfig.title')}
            </Typography>
            <Typography variant="body2" sx={{ mb: 3 }}>
              {t('setupWizard.serverConfig.description')}
            </Typography>
            
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label={t('settings.app.defaultDNS')}
                  name="defaultDNS"
                  value={formData.defaultDNS}
                  onChange={handleInputChange}
                  helperText={t('setupWizard.serverConfig.dnsHelper')}
                  margin="normal"
                  variant="outlined"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label={t('settings.app.serverAddress')}
                  name="serverAddress"
                  value={formData.serverAddress}
                  onChange={handleInputChange}
                  helperText={t('setupWizard.serverConfig.serverAddressHelper')}
                  margin="normal"
                  variant="outlined"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label={t('settings.app.serverPort')}
                  name="serverPort"
                  type="number"
                  value={formData.serverPort}
                  onChange={handleInputChange}
                  helperText={t('setupWizard.serverConfig.serverPortHelper')}
                  margin="normal"
                  variant="outlined"
                />
              </Grid>
            </Grid>
          </Box>
        );
        
      case 3:
        return (
          <Box sx={{ py: 3 }}>
            <Typography variant="h6" gutterBottom>
              {t('setupWizard.importConfig.title')}
            </Typography>
            <Typography variant="body2" sx={{ mb: 3 }}>
              {t('setupWizard.importConfig.description')}
            </Typography>
            
            <Paper variant="outlined" sx={{ p: 3, mb: 3 }}>
              <FormControl component="fieldset">
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={formData.importExistingConfig}
                      onChange={handleInputChange}
                      name="importExistingConfig"
                    />
                  }
                  label={t('setupWizard.importConfig.importCheckbox')}
                />
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  {t('setupWizard.importConfig.importHelper')}
                </Typography>
              </FormControl>
            </Paper>
          </Box>
        );
        
      case 4:
        return (
          <Box sx={{ py: 4, textAlign: 'center' }}>
            <CheckCircleOutlineIcon color="success" sx={{ fontSize: 72, mb: 2 }} />
            <Typography variant="h5" gutterBottom>
              {t('setupWizard.complete.title')}
            </Typography>
            <Typography variant="body1" paragraph>
              {t('setupWizard.complete.description')}
            </Typography>
          </Box>
        );
        
      default:
        return null;
    }
  };

  return (
    <Dialog
      open={open}
      fullWidth
      maxWidth="md"
      disableEscapeKeyDown
    >
      <DialogTitle>
        {t('setupWizard.title')}
      </DialogTitle>
      
      <DialogContent dividers>
        <Box sx={{ mb: 4 }}>
          <Stepper activeStep={activeStep} alternativeLabel>
            {steps.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>
        </Box>
        
        <Card>
          <CardContent>
            {renderStepContent(activeStep)}
          </CardContent>
        </Card>
      </DialogContent>
      
      <DialogActions>
        <Button
          disabled={activeStep === 0 || loading || testLoading}
          onClick={handleBack}
        >
          {t('common.back')}
        </Button>
        <Button
          variant="contained"
          color="primary"
          onClick={handleNext}
          disabled={loading || testLoading || (activeStep === 1 && (!formData.routerAddress || !formData.routerUser || !formData.routerPassword))}
        >
          {activeStep === steps.length - 1 
            ? t('setupWizard.finish')
            : loading || testLoading 
              ? <CircularProgress size={24} />
              : t('common.next')
          }
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default SetupWizard; 
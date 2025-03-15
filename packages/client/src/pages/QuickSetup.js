import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { 
  Box, 
  Button, 
  Card, 
  CardContent, 
  Container, 
  Divider, 
  Grid, 
  Paper, 
  Stepper, 
  Step, 
  StepLabel, 
  TextField, 
  Typography, 
  Alert,
  FormControl,
  FormControlLabel,
  RadioGroup,
  Radio,
  Select,
  MenuItem,
  InputLabel,
  CircularProgress,
  Tooltip,
  IconButton
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';

function QuickSetup() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [activeStep, setActiveStep] = useState(0);
  
  // 国际化的步骤名称
  const steps = [
    t('quickSetup.steps.basicInfo'),
    t('quickSetup.steps.interfaceConfig'),
    t('quickSetup.steps.peerConfig'),
    t('quickSetup.steps.complete')
  ];
  
  const [formData, setFormData] = useState({
    // 接口配置
    interfaceName: 'wg0',
    name: 'WireGuard VPN',
    listenPort: 51820,
    address: '10.0.0.1/24',
    mtu: 1420,
    // 对等点配置
    peerName: t('quickSetup.peer.defaultName', '客户端1'),
    allowedIPs: '10.0.0.2/32',
    persistentKeepalive: 25,
    // 路由器信息
    routerIp: '',
    comment: '',
    // 新增：接口选择选项
    useExistingInterface: 'new',
    selectedInterfaceId: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [config, setConfig] = useState(null);
  
  // 新增：存储可用接口列表
  const [availableInterfaces, setAvailableInterfaces] = useState([]);
  const [loadingInterfaces, setLoadingInterfaces] = useState(false);
  
  // 新增：IP地址建议相关状态
  const [loadingIpSuggestion, setLoadingIpSuggestion] = useState(false);
  
  // 新增：获取接口列表
  useEffect(() => {
    if (activeStep === 1 || formData.useExistingInterface === 'existing') {
      setLoadingInterfaces(true);
      fetch('/api/wireguard/interfaces')
        .then(response => response.json())
        .then(data => {
          setAvailableInterfaces(data);
          setLoadingInterfaces(false);
        })
        .catch(err => {
          console.error(t('errors.fetchInterfacesFailed', '获取接口列表失败:'), err);
          setLoadingInterfaces(false);
        });
    }
  }, [activeStep, formData.useExistingInterface, t]);
  
  // 新增：当选择现有接口时，自动填充接口信息
  useEffect(() => {
    if (formData.useExistingInterface === 'existing' && formData.selectedInterfaceId) {
      const selectedInterface = availableInterfaces.find(
        iface => iface.id === parseInt(formData.selectedInterfaceId)
      );
      
      if (selectedInterface) {
        setFormData(prev => ({
          ...prev,
          interfaceName: selectedInterface.interfaceName,
          name: selectedInterface.name,
          listenPort: selectedInterface.listenPort,
          address: selectedInterface.address || prev.address,
          mtu: selectedInterface.mtu
        }));
        
        // 当选择现有接口时，自动获取建议的IP地址
        getSuggestedIP(selectedInterface.id);
      }
    }
  }, [formData.selectedInterfaceId, formData.useExistingInterface, availableInterfaces]);
  
  // 新增：当进入对等点配置步骤时，如果是新接口，获取建议IP
  useEffect(() => {
    if (activeStep === 2 && formData.useExistingInterface === 'new') {
      // 需要先创建接口才能获取建议IP，这里可以提供一个默认值
      // 如果需要更精确，可以等待用户进入步骤后，在后端临时创建接口并获取建议IP
      if (!formData.allowedIPs || formData.allowedIPs === '10.0.0.2/32') {
        // 从接口地址派生一个合理的客户端IP
        if (formData.address) {
          const parts = formData.address.split('.');
          if (parts.length === 4) {
            const network = parts.slice(0, 3).join('.');
            setFormData(prev => ({
              ...prev,
              allowedIPs: `${network}.2/32`
            }));
          }
        }
      }
    }
  }, [activeStep, formData.useExistingInterface, formData.address]);
  
  // 新增：获取建议IP的函数
  const getSuggestedIP = async (interfaceId) => {
    if (!interfaceId) return;
    
    setLoadingIpSuggestion(true);
    try {
      const response = await fetch(`/api/wireguard/interfaces/${interfaceId}/suggest-ip`);
      if (!response.ok) {
        throw new Error(t('errors.suggestedIPError', '获取建议IP失败'));
      }
      
      const data = await response.json();
      if (data.suggestedIP) {
        setFormData(prev => ({
          ...prev,
          allowedIPs: data.suggestedIP
        }));
      }
    } catch (err) {
      console.error(t('errors.suggestedIPError', '获取建议IP地址失败:'), err);
      // 失败时不修改当前IP
    } finally {
      setLoadingIpSuggestion(false);
    }
  };
  
  // 处理输入变化
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };
  
  // 处理表单提交
  const handleSubmit = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/wireguard/quicksetup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || t('quickSetup.errors.createFailed'));
      }
      
      setSuccess(t('quickSetup.success'));
      setConfig(data.config);
      setActiveStep(3); // 完成步骤
    } catch (err) {
      setError(err.message);
      console.error(t('quickSetup.errors.setupFailed'), err);
    } finally {
      setLoading(false);
    }
  };
  
  // 处理步骤导航
  const handleNext = () => {
    if (activeStep === 2) {
      handleSubmit();
    } else {
      setActiveStep((prevStep) => prevStep + 1);
    }
  };
  
  const handleBack = () => {
    setActiveStep((prevStep) => prevStep - 1);
  };
  
  // 手动刷新IP建议
  const handleRefreshIP = () => {
    if (formData.useExistingInterface === 'existing' && formData.selectedInterfaceId) {
      getSuggestedIP(formData.selectedInterfaceId);
    }
  };
  
  // 获取当前步骤内容
  const getStepContent = (step) => {
    switch (step) {
      case 0:
        return (
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Typography variant="h6">{t('quickSetup.basicInfo.title')}</Typography>
              <Typography variant="body2" color="textSecondary">
                {t('quickSetup.basicInfo.subtitle')}
              </Typography>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                required
                fullWidth
                label={t('quickSetup.basicInfo.routerIpLabel')}
                name="routerIp"
                value={formData.routerIp}
                onChange={handleChange}
                helperText={t('quickSetup.basicInfo.routerIpHelp')}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label={t('quickSetup.basicInfo.commentLabel')}
                name="comment"
                value={formData.comment}
                onChange={handleChange}
                multiline
                rows={2}
                helperText={t('quickSetup.basicInfo.commentHelp')}
              />
            </Grid>
          </Grid>
        );
      case 1:
        return (
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Typography variant="h6">{t('quickSetup.interfaceConfig.title')}</Typography>
              <Typography variant="body2" color="textSecondary">
                {t('quickSetup.interfaceConfig.subtitle')}
              </Typography>
            </Grid>
            
            {/* 新增：接口选择选项 */}
            <Grid item xs={12}>
              <FormControl component="fieldset">
                <RadioGroup
                  name="useExistingInterface"
                  value={formData.useExistingInterface}
                  onChange={handleChange}
                  row
                >
                  <FormControlLabel value="new" control={<Radio />} label={t('quickSetup.interfaceConfig.createNew')} />
                  <FormControlLabel value="existing" control={<Radio />} label={t('quickSetup.interfaceConfig.useExisting')} />
                </RadioGroup>
              </FormControl>
            </Grid>
            
            {/* 新增：现有接口选择下拉框 */}
            {formData.useExistingInterface === 'existing' && (
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel id="interface-select-label">{t('quickSetup.interfaceConfig.selectInterface')}</InputLabel>
                  <Select
                    labelId="interface-select-label"
                    name="selectedInterfaceId"
                    value={formData.selectedInterfaceId}
                    onChange={handleChange}
                    disabled={loadingInterfaces}
                  >
                    {loadingInterfaces ? (
                      <MenuItem disabled>{t('quickSetup.interfaceConfig.loading')}</MenuItem>
                    ) : availableInterfaces.length === 0 ? (
                      <MenuItem disabled>{t('quickSetup.interfaceConfig.noInterfaces')}</MenuItem>
                    ) : (
                      availableInterfaces.map(iface => (
                        <MenuItem key={iface.id} value={iface.id}>
                          {iface.name} ({iface.interfaceName})
                        </MenuItem>
                      ))
                    )}
                  </Select>
                </FormControl>
              </Grid>
            )}
            
            <Grid item xs={12} md={6}>
              <TextField
                required
                fullWidth
                label={t('quickSetup.interfaceConfig.interfaceNameLabel')}
                name="interfaceName"
                value={formData.interfaceName}
                onChange={handleChange}
                helperText={t('quickSetup.interfaceConfig.interfaceNameHelp')}
                disabled={formData.useExistingInterface === 'existing'}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                required
                fullWidth
                label={t('quickSetup.interfaceConfig.displayNameLabel')}
                name="name"
                value={formData.name}
                onChange={handleChange}
                helperText={t('quickSetup.interfaceConfig.displayNameHelp')}
                disabled={formData.useExistingInterface === 'existing'}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                required
                fullWidth
                label={t('quickSetup.interfaceConfig.listenPortLabel')}
                name="listenPort"
                type="number"
                value={formData.listenPort}
                onChange={handleChange}
                helperText={t('quickSetup.interfaceConfig.listenPortHelp')}
                disabled={formData.useExistingInterface === 'existing'}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                required
                fullWidth
                label={t('quickSetup.interfaceConfig.addressLabel')}
                name="address"
                value={formData.address}
                onChange={handleChange}
                helperText={t('quickSetup.interfaceConfig.addressHelp')}
                disabled={formData.useExistingInterface === 'existing'}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label={t('quickSetup.interfaceConfig.mtuLabel')}
                name="mtu"
                type="number"
                value={formData.mtu}
                onChange={handleChange}
                helperText={t('quickSetup.interfaceConfig.mtuHelp')}
                disabled={formData.useExistingInterface === 'existing'}
              />
            </Grid>
          </Grid>
        );
      case 2:
        return (
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Typography variant="h6">{t('quickSetup.peerConfig.title')}</Typography>
              <Typography variant="body2" color="textSecondary">
                {t('quickSetup.peerConfig.subtitle')}
              </Typography>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                required
                fullWidth
                label={t('quickSetup.peerConfig.peerNameLabel')}
                name="peerName"
                value={formData.peerName}
                onChange={handleChange}
                helperText={t('quickSetup.peerConfig.peerNameHelp')}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                required
                fullWidth
                label={t('quickSetup.peerConfig.allowedIPsLabel')}
                name="allowedIPs"
                value={formData.allowedIPs}
                onChange={handleChange}
                helperText={t('quickSetup.peerConfig.allowedIPsHelp')}
                InputProps={{
                  endAdornment: formData.useExistingInterface === 'existing' && formData.selectedInterfaceId ? (
                    <Tooltip title={t('quickSetup.peerConfig.refreshIPTooltip')}>
                      <IconButton 
                        edge="end" 
                        onClick={handleRefreshIP}
                        disabled={loadingIpSuggestion}
                      >
                        {loadingIpSuggestion ? 
                          <CircularProgress size={20} /> : 
                          <RefreshIcon />
                        }
                      </IconButton>
                    </Tooltip>
                  ) : null
                }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label={t('quickSetup.peerConfig.keepaliveLabel')}
                name="persistentKeepalive"
                type="number"
                value={formData.persistentKeepalive}
                onChange={handleChange}
                helperText={t('quickSetup.peerConfig.keepaliveHelp')}
              />
            </Grid>
          </Grid>
        );
      case 3:
        return (
          <Grid container spacing={3}>
            <Grid item xs={12}>
              {error ? (
                <Alert severity="error" sx={{ mb: 2 }}>
                  {error}
                </Alert>
              ) : (
                <Alert severity="success" sx={{ mb: 2 }}>
                  {t('quickSetup.complete.success')}
                </Alert>
              )}
            </Grid>
            {config && (
              <>
                <Grid item xs={12}>
                  <Typography variant="h6">{t('quickSetup.complete.configTitle')}</Typography>
                  <Paper
                    sx={{
                      p: 2,
                      mt: 2,
                      backgroundColor: '#f5f5f5',
                      overflowX: 'auto'
                    }}
                  >
                    <pre>{config.content}</pre>
                  </Paper>
                </Grid>
                <Grid item xs={12}>
                  <Button
                    variant="contained"
                    color="primary"
                    href={`/api/wireguard/download?path=${encodeURIComponent(config.filePath)}`}
                  >
                    {t('quickSetup.complete.downloadConfig')}
                  </Button>
                </Grid>
              </>
            )}
            <Grid item xs={12} sx={{ mt: 3 }}>
              <Button
                variant="contained"
                onClick={() => navigate('/interfaces')}
              >
                {t('quickSetup.complete.viewInterfaces')}
              </Button>
            </Grid>
          </Grid>
        );
      default:
        return t('quickSetup.unknownStep');
    }
  };
  
  return (
    <Container maxWidth="xl">
      <Paper sx={{ p: 3, mb: 4 }}>
        <Typography variant="h4" align="center" gutterBottom>
          {t('quickSetup.pageTitle')}
        </Typography>
        <Typography variant="body1" align="center" color="textSecondary" paragraph>
          {t('quickSetup.pageSubtitle')}
        </Typography>
        
        <Stepper activeStep={activeStep} sx={{ pt: 3, pb: 5 }}>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>
        
        <Box sx={{ mb: 4 }}>
          {getStepContent(activeStep)}
        </Box>
        
        <Divider sx={{ mb: 2 }} />
        
        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
          <Button
            disabled={activeStep === 0 || activeStep === 3}
            onClick={handleBack}
          >
            {t('quickSetup.navigation.back')}
          </Button>
          <Button
            variant="contained"
            color="primary"
            onClick={handleNext}
            disabled={loading || activeStep === 3 || 
                    (formData.useExistingInterface === 'existing' && 
                     !formData.selectedInterfaceId && activeStep === 1)}
          >
            {loading ? <CircularProgress size={24} /> : 
             (activeStep === steps.length - 2 ? t('quickSetup.navigation.create') : t('quickSetup.navigation.next'))}
          </Button>
        </Box>
      </Paper>
    </Container>
  );
}

export default QuickSetup; 
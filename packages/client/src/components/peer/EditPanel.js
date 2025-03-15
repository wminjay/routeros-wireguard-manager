import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  Alert,
  CircularProgress,
  Tooltip,
  ToggleButton,
  ToggleButtonGroup,
  IconButton,
  InputAdornment,
  Typography
} from '@mui/material';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import RefreshIcon from '@mui/icons-material/Refresh';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import SaveIcon from '@mui/icons-material/Save';
import CancelIcon from '@mui/icons-material/Cancel';
import { useTranslation } from 'react-i18next';

function EditPanel({ peerData, onEditComplete, onCancel, disabled = false }) {
  const { t } = useTranslation();
  // 密钥配置模式
  const [keyMode, setKeyMode] = useState('auto'); // 'auto' 或 'manual'
  const [showPrivateKey, setShowPrivateKey] = useState(false);
  const [copySuccess, setCopySuccess] = useState({
    publicKey: false,
    privateKey: false
  });
  
  const [formData, setFormData] = useState({
    name: peerData?.name || '',
    allowedIPs: peerData?.allowedIPs || '',
    persistentKeepalive: peerData?.persistentKeepalive || 25,
    wireguardConfigId: peerData?.wireguardConfigId || '',
    enabled: peerData?.enabled !== undefined ? peerData.enabled : true,
    comment: peerData?.comment || '',
    publicKey: peerData?.publicKey || '',
    privateKey: peerData?.privateKey || '',
    description: peerData?.description || '',
    endpoint: peerData?.endpoint || ''
  });
  
  const [error, setError] = useState(null);
  const [saveLoading, setSaveLoading] = useState(false);
  const [interfaces, setInterfaces] = useState([]);
  const [interfacesLoading, setInterfacesLoading] = useState(true);
  const [isIPSuggested, setIsIPSuggested] = useState(false);

  // 加载接口列表
  useEffect(() => {
    const fetchInterfaces = async () => {
      try {
        setInterfacesLoading(true);
        const response = await fetch('/api/wireguard/interfaces');
        
        if (!response.ok) {
          throw new Error(t('peerEdit.errors.fetchInterfacesFailed'));
        }
        
        const data = await response.json();
        setInterfaces(data);
        setInterfacesLoading(false);
      } catch (error) {
        console.error(t('peerEdit.errors.fetchInterfacesError'), error);
        setError(t('peerEdit.errors.fetchInterfacesError') + error.message);
        setInterfacesLoading(false);
      }
    };
    
    fetchInterfaces();
  }, [t]);

  // 当接口ID变更时，获取建议的IP地址
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
        console.error(t('peerEdit.errors.suggestIPError'), err);
        // 静默失败，不影响用户体验
      }
    };
    
    // 当接口ID变更且需要重新获取IP时触发
    if (formData.allowedIPs === '') {
      fetchSuggestedIP();
    }
  }, [formData.wireguardConfigId, formData.allowedIPs, t]);

  // 初始化表单数据
  useEffect(() => {
    if (peerData) {
      // 根据是否有privateKey判断使用哪种模式
      if (peerData.privateKey && !peerData.privateKey.startsWith('FAKE_')) {
        setKeyMode('auto');
      } else {
        setKeyMode('manual');
      }
      
      setFormData({
        name: peerData.name || '',
        allowedIPs: peerData.allowedIPs || '',
        persistentKeepalive: peerData.persistentKeepalive || 25,
        wireguardConfigId: peerData.wireguardConfigId || '',
        enabled: peerData.enabled !== undefined ? peerData.enabled : true,
        comment: peerData.comment || '',
        publicKey: peerData.publicKey || '',
        privateKey: peerData.privateKey || '',
        description: peerData.description || '',
        endpoint: peerData.endpoint || ''
      });
    }
  }, [peerData]);

  const handleKeyModeChange = (event, newMode) => {
    if (newMode !== null) {
      setKeyMode(newMode);
    }
  };

  const generateKeyPair = async () => {
    try {
      const response = await fetch('/api/wireguard/generate-keys', {
        method: 'GET',
      });
      
      if (!response.ok) {
        throw new Error(t('peerEdit.errors.generateKeysFailed'));
      }
      
      const { publicKey, privateKey } = await response.json();
      
      setFormData({
        ...formData,
        publicKey,
        privateKey
      });
    } catch (error) {
      console.error(t('peerEdit.errors.generateKeysError'), error);
      setError(t('peerEdit.errors.generateKeysError') + error.message);
    }
  };

  const handleCopyKey = (keyType) => {
    const keyValue = keyType === 'publicKey' ? formData.publicKey : formData.privateKey;
    navigator.clipboard.writeText(keyValue).then(() => {
      setCopySuccess({
        ...copySuccess,
        [keyType]: true
      });
      
      setTimeout(() => {
        setCopySuccess({
          ...copySuccess,
          [keyType]: false
        });
      }, 2000);
    });
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    // 当手动修改IP地址时，标记为非建议的
    if (name === 'allowedIPs') {
      setIsIPSuggested(false);
    }
    
    // 当选择新接口时，清空allowedIPs，让useEffect触发获取新的建议IP
    if (name === 'wireguardConfigId') {
      setFormData(prev => ({
        ...prev,
        [name]: value,
        allowedIPs: ''  // 清空IP地址，让useEffect重新获取
      }));
      return; // 直接返回，避免下面的setFormData再次执行
    }
    
    // 处理其他表单字段的变更
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value
    });
  };

  const validateForm = () => {
    const errors = [];
    
    if (!formData.name.trim()) {
      errors.push(t('peerEdit.validation.nameRequired'));
    }
    
    if (!formData.allowedIPs.trim()) {
      errors.push(t('peerEdit.validation.allowedIPsRequired'));
    } else {
      // 验证IP地址格式
      const ipPattern = /^(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\/\d{1,2})(,\s*\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\/\d{1,2})*$/;
      if (!ipPattern.test(formData.allowedIPs)) {
        errors.push(t('peerEdit.validation.allowedIPsFormat'));
      }
    }
    
    if (!formData.wireguardConfigId) {
      errors.push(t('peerEdit.validation.interfaceRequired'));
    }
    
    // 验证公钥
    if (!formData.publicKey.trim()) {
      errors.push(t('peerEdit.validation.publicKeyRequired'));
    } else if (!/^[A-Za-z0-9+/]{42,44}=$/.test(formData.publicKey)) {
      errors.push(t('peerEdit.validation.publicKeyFormat'));
    }
    
    // 只有在自动模式下才验证私钥
    if (keyMode === 'auto' && !formData.privateKey.trim()) {
      errors.push(t('peerEdit.validation.privateKeyRequired'));
    }
    
    return errors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const errors = validateForm();
    if (errors.length > 0) {
      setError(errors.join('; '));
      return;
    }
    
    // 如果是手动模式，清空私钥字段
    const dataToSubmit = {...formData};
    if (keyMode === 'manual') {
      dataToSubmit.privateKey = '';
    }
    
    try {
      setSaveLoading(true);
      setError(null);
      
      const response = await fetch(`/api/wireguard/peers/${peerData.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(dataToSubmit),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || t('peerEdit.errors.updatePeerFailed'));
      }
      
      const updatedPeer = await response.json();
      
      // 成功更新
      if (onEditComplete) {
        onEditComplete(updatedPeer.peer);
      }
    } catch (error) {
      console.error(t('peerEdit.errors.updatePeerError'), error);
      setError(t('peerEdit.errors.updatePeerError') + error.message);
      setSaveLoading(false);
    }
  };

  if (interfacesLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box component="form" onSubmit={handleSubmit} noValidate>
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}
      
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            required
            name="name"
            label={t('peerEdit.fields.name.label')}
            value={formData.name}
            onChange={handleInputChange}
            helperText={t('peerEdit.fields.name.helper')}
          />
        </Grid>
        
        <Grid item xs={12} md={6}>
          <FormControl fullWidth required>
            <InputLabel>{t('peerEdit.fields.interface.label')}</InputLabel>
            <Select
              name="wireguardConfigId"
              value={formData.wireguardConfigId}
              onChange={handleInputChange}
              label={t('peerEdit.fields.interface.label')}
              disabled={interfacesLoading}
            >
              {interfacesLoading ? (
                <MenuItem value="">
                  <CircularProgress size={20} sx={{ mr: 1 }} />
                  Loading...
                </MenuItem>
              ) : (
                interfaces.map(iface => (
                  <MenuItem key={iface.id} value={iface.id}>
                    {iface.name}
                  </MenuItem>
                ))
              )}
            </Select>
          </FormControl>
        </Grid>
        
        <Grid item xs={12}>
          <Tooltip title={t('peerEdit.keyModes.tooltip')}>
            <ToggleButtonGroup
              value={keyMode}
              exclusive
              onChange={handleKeyModeChange}
              aria-label={t('peerEdit.keyModes.title')}
              sx={{ mb: 2 }}
              size="small"
            >
              <ToggleButton value="auto">{t('peerEdit.keyModes.auto')}</ToggleButton>
              <ToggleButton value="manual">{t('peerEdit.keyModes.manual')}</ToggleButton>
            </ToggleButtonGroup>
          </Tooltip>
          
          {keyMode === 'auto' && (
            <Button
              variant="outlined"
              onClick={generateKeyPair}
              startIcon={<RefreshIcon />}
              sx={{ ml: 2 }}
              size="small"
            >
              {t('peerEdit.buttons.generateKeys')}
            </Button>
          )}
        </Grid>
        
        <Grid item xs={12}>
          <TextField
            fullWidth
            required
            name="publicKey"
            label={t('peerEdit.fields.publicKey.label')}
            value={formData.publicKey}
            onChange={handleInputChange}
            disabled={keyMode === 'auto'}
            helperText={keyMode === 'manual' ? t('peerEdit.fields.publicKey.helper.manual') : t('peerEdit.fields.publicKey.helper.auto')}
            InputProps={{
              endAdornment: formData.publicKey && (
                <InputAdornment position="end">
                  <Tooltip title={t('peerEdit.fields.publicKey.copyTooltip')}>
                    <IconButton edge="end" onClick={() => handleCopyKey('publicKey')}>
                      {copySuccess.publicKey ? <Typography variant="caption" color="success.main">{t('common.copied')}</Typography> : <ContentCopyIcon />}
                    </IconButton>
                  </Tooltip>
                </InputAdornment>
              )
            }}
          />
        </Grid>
        
        <Grid item xs={12}>
          <TextField
            fullWidth
            name="privateKey"
            label={t('peerEdit.fields.privateKey.label')}
            type={showPrivateKey ? 'text' : 'password'}
            value={formData.privateKey}
            onChange={handleInputChange}
            disabled={keyMode === 'auto'}
            helperText={t('peerEdit.fields.privateKey.helper')}
            InputProps={{
              endAdornment: formData.privateKey && (
                <InputAdornment position="end">
                  <Tooltip title={showPrivateKey ? t('peerEdit.fields.privateKey.hideTooltip') : t('peerEdit.fields.privateKey.showTooltip')}>
                    <IconButton edge="end" onClick={() => setShowPrivateKey(!showPrivateKey)}>
                      {showPrivateKey ? <VisibilityOffIcon /> : <VisibilityIcon />}
                    </IconButton>
                  </Tooltip>
                  <Tooltip title={t('peerEdit.fields.privateKey.copyTooltip')}>
                    <IconButton edge="end" onClick={() => handleCopyKey('privateKey')}>
                      {copySuccess.privateKey ? <Typography variant="caption" color="success.main">{t('common.copied')}</Typography> : <ContentCopyIcon />}
                    </IconButton>
                  </Tooltip>
                </InputAdornment>
              )
            }}
          />
        </Grid>
        
        <Grid item xs={12}>
          <TextField
            fullWidth
            required
            name="allowedIPs"
            label={t('peerEdit.fields.allowedIPs.label')}
            value={formData.allowedIPs}
            onChange={handleInputChange}
            helperText={isIPSuggested ? t('peerEdit.fields.allowedIPs.helper.suggested') : t('peerEdit.fields.allowedIPs.helper.manual')}
            InputProps={{
              endAdornment: isIPSuggested && (
                <InputAdornment position="end">
                  <Tooltip title={t('peerEdit.fields.allowedIPs.suggestedTooltip')}>
                    <HelpOutlineIcon color="info" />
                  </Tooltip>
                </InputAdornment>
              )
            }}
          />
        </Grid>
        
        <Grid item xs={12} md={6}>
          <Tooltip title={t('peerEdit.fields.persistentKeepalive.tooltip')}>
            <TextField
              fullWidth
              name="persistentKeepalive"
              label={t('peerEdit.fields.persistentKeepalive.label')}
              type="number"
              value={formData.persistentKeepalive}
              onChange={handleInputChange}
              InputProps={{ inputProps: { min: 0, max: 1000 } }}
            />
          </Tooltip>
        </Grid>
        
        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            name="comment"
            label={t('peerEdit.fields.comment.label')}
            value={formData.comment}
            onChange={handleInputChange}
            multiline
            rows={1}
            helperText={t('peerEdit.fields.comment.helper')}
          />
        </Grid>
        
        <Grid item xs={12}>
          <FormControlLabel
            control={
              <Switch
                checked={formData.enabled}
                onChange={handleInputChange}
                name="enabled"
                color="primary"
              />
            }
            label={t('peerEdit.fields.enabled.label')}
          />
        </Grid>
      </Grid>
      
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 3 }}>
        <Button
          variant="outlined"
          onClick={onCancel}
          startIcon={<CancelIcon />}
          sx={{ mr: 2 }}
        >
          {t('peerEdit.buttons.cancel')}
        </Button>
        
        <Button
          type="submit"
          variant="contained"
          color="primary"
          startIcon={saveLoading ? <CircularProgress size={20} /> : <SaveIcon />}
          disabled={saveLoading}
        >
          {t('peerEdit.buttons.save')}
        </Button>
      </Box>
    </Box>
  );
}

export default EditPanel; 
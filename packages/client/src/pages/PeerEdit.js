import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
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
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';

function PeerEdit() {
  const navigate = useNavigate();
  const { id } = useParams();
  
  // 密钥配置模式
  const [keyMode, setKeyMode] = useState('auto'); // 'auto' 或 'manual'
  const [showPrivateKey, setShowPrivateKey] = useState(false);
  const [copySuccess, setCopySuccess] = useState({
    publicKey: false,
    privateKey: false
  });
  
  const [formData, setFormData] = useState({
    name: '',
    allowedIPs: '',
    persistentKeepalive: 25,
    wireguardConfigId: '',
    enabled: true,
    comment: '',
    publicKey: '',
    privateKey: ''
  });
  const [loading, setLoading] = useState(true);
  const [saveLoading, setSaveLoading] = useState(false);
  const [error, setError] = useState(null);
  const [interfaces, setInterfaces] = useState([]);
  const [interfacesLoading, setInterfacesLoading] = useState(true);
  const [originalData, setOriginalData] = useState(null);

  // 加载接口列表
  useEffect(() => {
    const fetchInterfaces = async () => {
      try {
        setInterfacesLoading(true);
        const response = await fetch('/api/wireguard/interfaces');
        
        if (!response.ok) {
          throw new Error('获取接口列表失败');
        }
        
        const data = await response.json();
        setInterfaces(data);
        setInterfacesLoading(false);
      } catch (error) {
        console.error('加载接口列表出错:', error);
        setError('加载接口列表出错: ' + error.message);
        setInterfacesLoading(false);
      }
    };
    
    fetchInterfaces();
  }, []);

  // 加载对等点数据
  useEffect(() => {
    const fetchPeerData = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/wireguard/peers/${id}`);
        
        if (!response.ok) {
          throw new Error('获取对等点数据失败');
        }
        
        const data = await response.json();
        setOriginalData(data);
        
        // 根据是否有privateKey判断使用哪种模式
        if (data.privateKey) {
          setKeyMode('auto');
        } else {
          setKeyMode('manual');
        }
        
        setFormData({
          name: data.name || '',
          allowedIPs: data.allowedIPs || '',
          persistentKeepalive: data.persistentKeepalive || 25,
          wireguardConfigId: data.wireguardConfigId || '',
          enabled: data.enabled !== undefined ? data.enabled : true,
          comment: data.comment || '',
          publicKey: data.publicKey || '',
          privateKey: data.privateKey || ''
        });
        setLoading(false);
      } catch (error) {
        console.error('加载对等点数据出错:', error);
        setError('加载对等点数据出错: ' + error.message);
        setLoading(false);
      }
    };
    
    fetchPeerData();
  }, [id]);

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
        throw new Error('生成密钥对失败');
      }
      
      const { publicKey, privateKey } = await response.json();
      
      setFormData({
        ...formData,
        publicKey,
        privateKey
      });
    } catch (error) {
      console.error('生成密钥对时出错:', error);
      setError('生成密钥对时出错: ' + error.message);
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
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value
    });
  };

  const validateForm = () => {
    const errors = [];
    
    if (!formData.name.trim()) {
      errors.push('名称不能为空');
    }
    
    if (!formData.allowedIPs.trim()) {
      errors.push('允许的IP不能为空');
    } else {
      // 验证IP地址格式
      const ipPattern = /^(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\/\d{1,2})(,\s*\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\/\d{1,2})*$/;
      if (!ipPattern.test(formData.allowedIPs)) {
        errors.push('允许的IP格式不正确，应为CIDR格式（例如：192.168.1.0/24）');
      }
    }
    
    if (!formData.wireguardConfigId) {
      errors.push('必须选择WireGuard接口');
    }
    
    // 验证公钥
    if (!formData.publicKey.trim()) {
      errors.push('公钥不能为空');
    } else if (!/^[A-Za-z0-9+/]{42,44}=$/.test(formData.publicKey)) {
      errors.push('公钥格式不正确');
    }
    
    // 只有在自动模式下才验证私钥
    if (keyMode === 'auto' && !formData.privateKey.trim()) {
      errors.push('私钥不能为空');
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
      
      const response = await fetch(`/api/wireguard/peers/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(dataToSubmit),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || '更新对等点失败');
      }
      
      // 成功更新
      navigate(`/peers/${id}`);
    } catch (error) {
      console.error('更新对等点时出错:', error);
      setError('更新对等点时出错: ' + error.message);
      setSaveLoading(false);
    }
  };

  const handleCancel = () => {
    navigate(`/peers/${id}`);
  };

  if (loading || interfacesLoading) {
    return (
      <Container>
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  return (
    <Container>
      <Paper elevation={3} sx={{ p: 3, mt: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
          <Button 
            startIcon={<ArrowBackIcon />} 
            onClick={() => navigate('/peers')}
            sx={{ mr: 2 }}
          >
            返回
          </Button>
          <Typography variant="h5" component="h1">
            编辑对等点
          </Typography>
        </Box>
        
        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}
        
        <form onSubmit={handleSubmit}>
          <Grid container spacing={3}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="名称"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                required
                helperText="为此对等点设置一个易于识别的名称"
              />
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth required>
                <InputLabel id="interface-select-label">WireGuard接口</InputLabel>
                <Select
                  labelId="interface-select-label"
                  id="wireguardConfigId"
                  name="wireguardConfigId"
                  value={formData.wireguardConfigId}
                  onChange={handleInputChange}
                  label="WireGuard接口"
                >
                  {interfaces.map((iface) => (
                    <MenuItem key={iface.id} value={iface.id}>
                      {iface.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            
            {/* 密钥配置模式选择 */}
            <Grid item xs={12}>
              <Typography variant="subtitle1" gutterBottom>
                密钥配置方式
                <Tooltip title="选择如何配置此对等点的密钥">
                  <HelpOutlineIcon color="action" fontSize="small" sx={{ ml: 1, verticalAlign: 'middle' }} />
                </Tooltip>
              </Typography>
              <ToggleButtonGroup
                value={keyMode}
                exclusive
                onChange={handleKeyModeChange}
                color="primary"
                size="small"
                sx={{ mb: 2 }}
              >
                <ToggleButton value="auto">
                  服务器生成密钥
                </ToggleButton>
                <ToggleButton value="manual">
                  使用已有公钥
                </ToggleButton>
              </ToggleButtonGroup>
              
              {keyMode === 'auto' && (
                <Box sx={{ mb: 2 }}>
                  <Alert severity="info" sx={{ mb: 2 }}>
                    服务器将自动生成公钥和私钥。私钥用于客户端配置，请妥善保管。
                  </Alert>
                  <Button 
                    variant="outlined" 
                    startIcon={<RefreshIcon />}
                    onClick={generateKeyPair}
                    sx={{ mb: 2 }}
                  >
                    重新生成密钥对
                  </Button>
                </Box>
              )}
              
              {keyMode === 'manual' && (
                <Box sx={{ mb: 2 }}>
                  <Alert severity="info" sx={{ mb: 2 }}>
                    使用客户端生成的公钥。私钥应保留在客户端设备上，切勿分享。
                  </Alert>
                </Box>
              )}
            </Grid>
            
            {/* 公钥字段 */}
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="公钥"
                name="publicKey"
                value={formData.publicKey}
                onChange={handleInputChange}
                required
                disabled={keyMode === 'auto'}
                helperText={keyMode === 'manual' ? "输入客户端生成的公钥" : "自动生成的公钥"}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <Tooltip title="复制公钥">
                        <IconButton
                          edge="end"
                          onClick={() => handleCopyKey('publicKey')}
                          size="small"
                        >
                          {copySuccess.publicKey ? <Typography variant="caption" color="success.main">已复制</Typography> : <ContentCopyIcon />}
                        </IconButton>
                      </Tooltip>
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            
            {/* 只在自动模式下显示私钥字段 */}
            {keyMode === 'auto' && (
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="私钥"
                  name="privateKey"
                  value={formData.privateKey}
                  disabled
                  type={showPrivateKey ? 'text' : 'password'}
                  helperText="此私钥用于客户端配置，请妥善保管"
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <Tooltip title={showPrivateKey ? "隐藏私钥" : "显示私钥"}>
                          <IconButton
                            edge="end"
                            onClick={() => setShowPrivateKey(!showPrivateKey)}
                            size="small"
                            sx={{ mr: 1 }}
                          >
                            {showPrivateKey ? <VisibilityOffIcon /> : <VisibilityIcon />}
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="复制私钥">
                          <IconButton
                            edge="end"
                            onClick={() => handleCopyKey('privateKey')}
                            size="small"
                          >
                            {copySuccess.privateKey ? <Typography variant="caption" color="success.main">已复制</Typography> : <ContentCopyIcon />}
                          </IconButton>
                        </Tooltip>
                      </InputAdornment>
                    ),
                  }}
                />
                <Alert severity="warning" sx={{ mt: 1 }}>
                  如果更改密钥，现有客户端连接将断开，需重新配置客户端。
                </Alert>
              </Grid>
            )}
          
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="允许的IP"
                name="allowedIPs"
                value={formData.allowedIPs}
                onChange={handleInputChange}
                required
                helperText="CIDR格式的IP地址列表，如：192.168.1.0/24,10.0.0.0/24"
              />
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Persistent Keepalive"
                name="persistentKeepalive"
                type="number"
                value={formData.persistentKeepalive}
                onChange={handleInputChange}
                InputProps={{
                  endAdornment: 
                    <Tooltip title="保持连接活跃的时间间隔（秒）。建议值为25">
                      <HelpOutlineIcon color="action" fontSize="small" sx={{ ml: 1 }} />
                    </Tooltip>
                }}
              />
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="备注"
                name="comment"
                value={formData.comment}
                onChange={handleInputChange}
                multiline
                rows={1}
                helperText="可选：添加关于此对等点的备注"
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
                label="启用此对等点"
              />
            </Grid>
            
            <Grid item xs={12}>
              <Divider sx={{ mb: 2 }} />
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
                <Button
                  variant="outlined"
                  onClick={handleCancel}
                  startIcon={<ArrowBackIcon />}
                >
                  取消
                </Button>
                <Button
                  type="submit"
                  variant="contained"
                  color="primary"
                  disabled={saveLoading}
                  startIcon={saveLoading ? <CircularProgress size={24} /> : null}
                >
                  保存更改
                </Button>
              </Box>
            </Grid>
          </Grid>
        </form>
      </Paper>
    </Container>
  );
}

export default PeerEdit; 
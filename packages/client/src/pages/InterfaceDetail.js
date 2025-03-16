import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { 
  Container, 
  Typography, 
  Paper, 
  Box,
  Grid,
  Button,
  CircularProgress,
  Alert,
  Tabs,
  Tab,
  Divider,
  TextField,
  IconButton,
  Chip,
  Switch,
  FormControlLabel,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Card,
  CardContent,
  Tooltip
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import FileCopyIcon from '@mui/icons-material/FileCopy';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import SaveIcon from '@mui/icons-material/Save';
import DeleteIcon from '@mui/icons-material/Delete';
import QrCodeIcon from '@mui/icons-material/QrCode';
import RefreshIcon from '@mui/icons-material/Refresh';

function TabPanel(props) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`tabpanel-${index}`}
      aria-labelledby={`tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ pt: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

function InterfaceDetail() {
  const { t } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialTabFromParams = searchParams.get('tab') === 'peers' ? 1 : 0;
  const editMode = searchParams.get('edit') === 'true';
  
  const [tabValue, setTabValue] = useState(initialTabFromParams);
  const [interfaceData, setInterfaceData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isEditing, setIsEditing] = useState(editMode);
  const [showPrivateKey, setShowPrivateKey] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    listenPort: '',
    mtu: '',
    enabled: true,
    comment: ''
  });
  const [saveLoading, setSaveLoading] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [peerLoading, setPeerLoading] = useState(false);
  const [refreshSuccess, setRefreshSuccess] = useState(false);

  useEffect(() => {
    // 加载接口详情
    const fetchInterfaceDetails = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/wireguard/interfaces/${id}`);
        
        if (!response.ok) {
          throw new Error(t('interfaceDetail.errors.fetchFailed'));
        }
        
        const data = await response.json();
        setInterfaceData(data);
        setFormData({
          name: data.name,
          listenPort: data.listenPort,
          mtu: data.mtu,
          enabled: data.enabled,
          comment: data.comment || ''
        });
        setError(null);
      } catch (err) {
        console.error(t('interfaceDetail.errors.fetchError'), err);
        setError(t('interfaceDetail.errors.fetchErrorMessage'));
      } finally {
        setLoading(false);
      }
    };

    fetchInterfaceDetails();
  }, [id, t]);

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  const handleBackClick = () => {
    navigate('/interfaces');
  };

  const handleEditClick = () => {
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    // 重置表单数据
    setFormData({
      name: interfaceData.name,
      listenPort: interfaceData.listenPort,
      mtu: interfaceData.mtu,
      enabled: interfaceData.enabled,
      comment: interfaceData.comment || ''
    });
    setSaveError(null);
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value
    });
  };

  const handleSaveClick = async () => {
    try {
      setSaveLoading(true);
      setSaveError(null);
      setSaveSuccess(false);
      
      const response = await fetch(`/api/wireguard/interfaces/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || t('interfaceDetail.errors.updateFailed'));
      }
      
      const updatedData = await response.json();
      
      // 更新本地状态
      setInterfaceData({
        ...interfaceData,
        ...updatedData.interface
      });
      
      setSaveSuccess(true);
      setIsEditing(false);
    } catch (err) {
      console.error(t('interfaceDetail.errors.updateError'), err);
      setSaveError(err.message || t('interfaceDetail.errors.updateTryAgain'));
    } finally {
      setSaveLoading(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text).then(() => {
      // 可以添加复制成功的通知
      console.log(t('interfaceDetail.copySuccess'));
    }, (err) => {
      console.error(t('interfaceDetail.copyError'), err);
    });
  };

  // 刷新对等点状态
  const handleRefreshPeers = async () => {
    try {
      setPeerLoading(true);
      setRefreshSuccess(false);
      
      const response = await fetch(`/api/wireguard/interfaces/${id}/update-peers-status`, {
        method: 'POST'
      });
      
      if (!response.ok) {
        throw new Error(t('interfaceDetail.errors.refreshPeersFailed'));
      }
      
      // 刷新接口数据，获取最新的对等点状态
      const interfaceResponse = await fetch(`/api/wireguard/interfaces/${id}`);
      
      if (!interfaceResponse.ok) {
        throw new Error(t('interfaceDetail.errors.fetchFailed'));
      }
      
      const data = await interfaceResponse.json();
      setInterfaceData(data);
      setRefreshSuccess(true);
      
      // 3秒后隐藏成功提示
      setTimeout(() => {
        setRefreshSuccess(false);
      }, 3000);
      
    } catch (err) {
      console.error(t('interfaceDetail.errors.refreshPeersError'), err);
      setError(t('interfaceDetail.errors.refreshPeersErrorMessage') + err.message);
    } finally {
      setPeerLoading(false);
    }
  };

  // 检查握手时间是否在3分钟内，表示对等点在线
  function isRecentHandshake(lastHandshake) {
    if (!lastHandshake) return false;
    const handshakeTime = new Date(lastHandshake);
    const threeMinutesAgo = new Date(Date.now() - 3 * 60 * 1000);
    return handshakeTime > threeMinutesAgo;
  }

  // 计算时间差，格式化为可读文本
  function getTimeDifference(lastHandshake) {
    if (!lastHandshake) return t('interfaceDetail.peers.neverConnected');
    
    const handshakeTime = new Date(lastHandshake);
    const now = new Date();
    const diffInSeconds = Math.floor((now - handshakeTime) / 1000);
    
    if (diffInSeconds < 60) {
      return t('interfaceDetail.peers.timeAgo.seconds', { count: diffInSeconds });
    } else if (diffInSeconds < 3600) {
      return t('interfaceDetail.peers.timeAgo.minutes', { count: Math.floor(diffInSeconds / 60) });
    } else if (diffInSeconds < 86400) {
      return t('interfaceDetail.peers.timeAgo.hours', { count: Math.floor(diffInSeconds / 3600) });
    } else {
      return t('interfaceDetail.peers.timeAgo.days', { count: Math.floor(diffInSeconds / 86400) });
    }
  }

  if (loading) {
    return (
      <Container sx={{ mt: 4, textAlign: 'center' }}>
        <CircularProgress />
      </Container>
    );
  }

  if (error) {
    return (
      <Container sx={{ mt: 4 }}>
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={handleBackClick}
        >
          {t('interfaceDetail.backToInterfaces')}
        </Button>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ mt: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={handleBackClick}
          sx={{ mb: 2 }}
        >
          {t('interfaceDetail.backToInterfaces')}
        </Button>
        
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h5">
            {interfaceData.name}
            <Chip 
              label={interfaceData.enabled ? t('interfaces.enabled') : t('interfaces.disabled')} 
              color={interfaceData.enabled ? 'success' : 'default'} 
              size="small"
              sx={{ ml: 2 }}
            />
          </Typography>
          
          {!isEditing ? (
            <Button 
              variant="outlined" 
              startIcon={<EditIcon />}
              onClick={handleEditClick}
            >
              {t('common.edit')}
            </Button>
          ) : (
            <Box>
              <Button 
                variant="outlined" 
                onClick={handleCancelEdit}
                sx={{ mr: 1 }}
              >
                {t('common.cancel')}
              </Button>
              <Button 
                variant="contained" 
                startIcon={<SaveIcon />}
                onClick={handleSaveClick}
                disabled={saveLoading}
              >
                {t('common.save')}
              </Button>
            </Box>
          )}
        </Box>
      </Box>

      {saveError && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {saveError}
        </Alert>
      )}

      {saveSuccess && (
        <Alert severity="success" sx={{ mb: 3 }}>
          {t('interfaceDetail.updateSuccess')}
        </Alert>
      )}

      <Paper sx={{ mb: 4 }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={tabValue} onChange={handleTabChange} aria-label={t('interfaceDetail.tabsAriaLabel')}>
            <Tab label={t('interfaceDetail.tabs.info')} id="tab-0" aria-controls="tabpanel-0" />
            <Tab label={t('interfaceDetail.tabs.peers')} id="tab-1" aria-controls="tabpanel-1" />
          </Tabs>
        </Box>

        <TabPanel value={tabValue} index={0}>
          {isEditing ? (
            <Box sx={{ p: 3 }}>
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label={t('interfaceDetail.form.name')}
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    margin="normal"
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label={t('interfaceDetail.form.listenPort')}
                    name="listenPort"
                    type="number"
                    value={formData.listenPort}
                    onChange={handleInputChange}
                    margin="normal"
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label={t('interfaceDetail.form.mtu')}
                    name="mtu"
                    type="number"
                    value={formData.mtu}
                    onChange={handleInputChange}
                    margin="normal"
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={formData.enabled}
                        onChange={handleInputChange}
                        name="enabled"
                        color="primary"
                      />
                    }
                    label={t('interfaceDetail.form.enabled')}
                    sx={{ mt: 2 }}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label={t('interfaceDetail.form.comment')}
                    name="comment"
                    value={formData.comment}
                    onChange={handleInputChange}
                    margin="normal"
                    multiline
                    rows={2}
                  />
                </Grid>
              </Grid>
            </Box>
          ) : (
            <Box sx={{ p: 3 }}>
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <Card variant="outlined" sx={{ height: '100%' }}>
                    <CardContent>
                      <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                        {t('interfaceDetail.info.title')}
                      </Typography>
                      <Divider sx={{ mb: 2 }} />
                      
                      <Grid container spacing={2}>
                        <Grid item xs={4}>
                          <Typography variant="body2" color="text.secondary">
                            {t('interfaceDetail.info.interfaceName')}
                          </Typography>
                        </Grid>
                        <Grid item xs={8}>
                          <Typography variant="body2">
                            {interfaceData.interfaceName}
                          </Typography>
                        </Grid>
                        
                        <Grid item xs={4}>
                          <Typography variant="body2" color="text.secondary">
                            {t('interfaceDetail.info.displayName')}
                          </Typography>
                        </Grid>
                        <Grid item xs={8}>
                          <Typography variant="body2">
                            {interfaceData.name}
                          </Typography>
                        </Grid>
                        
                        <Grid item xs={4}>
                          <Typography variant="body2" color="text.secondary">
                            {t('interfaceDetail.info.listenPort')}
                          </Typography>
                        </Grid>
                        <Grid item xs={8}>
                          <Typography variant="body2">
                            {interfaceData.listenPort}
                          </Typography>
                        </Grid>
                        
                        <Grid item xs={4}>
                          <Typography variant="body2" color="text.secondary">
                            {t('interfaceDetail.info.mtu')}
                          </Typography>
                        </Grid>
                        <Grid item xs={8}>
                          <Typography variant="body2">
                            {interfaceData.mtu}
                          </Typography>
                        </Grid>
                        
                        <Grid item xs={4}>
                          <Typography variant="body2" color="text.secondary">
                            {t('interfaceDetail.info.status')}
                          </Typography>
                        </Grid>
                        <Grid item xs={8}>
                          <Box component="div">
                            <Chip 
                              label={interfaceData.enabled ? t('interfaces.enabled') : t('interfaces.disabled')} 
                              color={interfaceData.enabled ? 'success' : 'default'} 
                              size="small" 
                            />
                          </Box>
                        </Grid>
                        
                        {interfaceData.comment && (
                          <>
                            <Grid item xs={4}>
                              <Typography variant="body2" color="text.secondary">
                                {t('interfaceDetail.info.comment')}
                              </Typography>
                            </Grid>
                            <Grid item xs={8}>
                              <Typography variant="body2">
                                {interfaceData.comment}
                              </Typography>
                            </Grid>
                          </>
                        )}
                      </Grid>
                    </CardContent>
                  </Card>
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <Card variant="outlined" sx={{ height: '100%' }}>
                    <CardContent>
                      <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                        {t('interfaceDetail.keys.title')}
                      </Typography>
                      <Divider sx={{ mb: 2 }} />
                      
                      <Grid container spacing={2}>
                        <Grid item xs={4}>
                          <Typography variant="body2" color="text.secondary">
                            {t('interfaceDetail.keys.publicKey')}
                          </Typography>
                        </Grid>
                        <Grid item xs={8}>
                          <Box sx={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            wordBreak: 'break-all' 
                          }}>
                            <Typography variant="body2" sx={{ mr: 1 }}>
                              {interfaceData.publicKey}
                            </Typography>
                            <Tooltip title={t('interfaceDetail.keys.copyPublicKey')}>
                              <IconButton 
                                size="small" 
                                onClick={() => copyToClipboard(interfaceData.publicKey)}
                              >
                                <FileCopyIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </Box>
                        </Grid>
                        
                        <Grid item xs={4}>
                          <Typography variant="body2" color="text.secondary">
                            {t('interfaceDetail.keys.privateKey')}
                          </Typography>
                        </Grid>
                        <Grid item xs={8}>
                          <Box sx={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            wordBreak: 'break-all' 
                          }}>
                            <Typography variant="body2" sx={{ mr: 1 }}>
                              {showPrivateKey ? interfaceData.privateKey : '••••••••••••••••••••••••••••••••'}
                            </Typography>
                            <Tooltip title={showPrivateKey ? t('interfaceDetail.keys.hidePrivateKey') : t('interfaceDetail.keys.showPrivateKey')}>
                              <IconButton 
                                size="small" 
                                onClick={() => setShowPrivateKey(!showPrivateKey)}
                              >
                                {showPrivateKey ? <VisibilityOffIcon fontSize="small" /> : <VisibilityIcon fontSize="small" />}
                              </IconButton>
                            </Tooltip>
                            {showPrivateKey && (
                              <Tooltip title={t('interfaceDetail.keys.copyPrivateKey')}>
                                <IconButton 
                                  size="small" 
                                  onClick={() => copyToClipboard(interfaceData.privateKey)}
                                >
                                  <FileCopyIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            )}
                          </Box>
                        </Grid>
                        
                        <Grid item xs={12}>
                          <Typography variant="caption" color="text.secondary">
                            {t('interfaceDetail.keys.privateKeyWarning')}
                          </Typography>
                        </Grid>
                      </Grid>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            </Box>
          )}
        </TabPanel>

        <TabPanel value={tabValue} index={1}>
          <Box sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3, alignItems: 'center' }}>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Typography variant="h6">{t('interfaceDetail.peers.title')}</Typography>
                <Tooltip title={t('interfaceDetail.peers.refreshStatus')}>
                  <IconButton 
                    onClick={handleRefreshPeers} 
                    disabled={peerLoading}
                    size="small"
                    sx={{ ml: 1 }}
                  >
                    {peerLoading ? <CircularProgress size={20} /> : <RefreshIcon />}
                  </IconButton>
                </Tooltip>
                {refreshSuccess && (
                  <Chip 
                    label={t('interfaceDetail.peers.refreshSuccess')} 
                    color="success" 
                    size="small" 
                    sx={{ ml: 1 }}
                  />
                )}
              </Box>
              <Button 
                variant="contained" 
                startIcon={<AddIcon />}
                onClick={() => navigate(`/peers/new?interface=${id}`)}
              >
                {t('interfaceDetail.peers.addPeer')}
              </Button>
            </Box>
            
            {interfaceData.WireguardPeers && interfaceData.WireguardPeers.length > 0 ? (
              <List>
                {interfaceData.WireguardPeers.map((peer) => (
                  <Paper key={peer.id} sx={{ mb: 2 }}>
                    <ListItem 
                      button
                      onClick={() => navigate(`/peers/${peer.id}?from_interface=${id}`)}
                      sx={{ pr: 10 }}
                    >
                      <ListItemText 
                        primary={
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <Typography component="span">
                              {peer.name}
                            </Typography>
                            {peer.isImported && (
                              <Tooltip title={t('peers.importedPeerTooltip')}>
                                <span>
                                  <Chip 
                                    label={t('peers.imported')}
                                    size="small"
                                    color="info"
                                    sx={{ ml: 1 }}
                                  />
                                </span>
                              </Tooltip>
                            )}
                            {peer.lastHandshake && (
                              <Tooltip title={t('interfaceDetail.peers.lastHandshake', { time: new Date(peer.lastHandshake).toLocaleString() })}>
                                <span>
                                  <Chip 
                                    label={
                                      isRecentHandshake(peer.lastHandshake) 
                                        ? t('interfaceDetail.peers.online') 
                                        : getTimeDifference(peer.lastHandshake)
                                    }
                                    color={isRecentHandshake(peer.lastHandshake) ? "success" : "default"}
                                    size="small"
                                    sx={{ ml: 1 }}
                                  />
                                </span>
                              </Tooltip>
                            )}
                          </Box>
                        }
                        secondary={
                          <>
                            <Tooltip title={peer.allowedIPs}>
                              <span>
                                <Typography component="span" variant="body2" color="text.primary" 
                                  sx={{ 
                                    maxWidth: 150, 
                                    display: 'inline-block',
                                    overflow: 'hidden', 
                                    textOverflow: 'ellipsis', 
                                    whiteSpace: 'nowrap',
                                    verticalAlign: 'middle'
                                  }}>
                                  {peer.allowedIPs}
                                </Typography>
                              </span>
                            </Tooltip>
                            {' — '}{peer.comment || t('interfaceDetail.peers.noComment')}
                          </>
                        }
                      />
                      <ListItemSecondaryAction sx={{ display: 'flex', gap: 0.5 }}>
                        <Tooltip title={t('interfaces.actions.viewDetails')}>
                          <span>
                            <IconButton 
                              edge="end" 
                              aria-label={t('interfaces.actions.viewDetails')} 
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/peers/${peer.id}?from_interface=${id}`);
                              }}
                              size="small"
                            >
                              <VisibilityIcon fontSize="small" />
                            </IconButton>
                          </span>
                        </Tooltip>
                        <Tooltip title={t('interfaces.actions.edit')}>
                          <span>
                            <IconButton 
                              edge="end" 
                              aria-label={t('interfaces.actions.edit')} 
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/peers/${peer.id}?tab=edit&from_interface=${id}`);
                              }}
                              size="small"
                            >
                              <EditIcon fontSize="small" />
                            </IconButton>
                          </span>
                        </Tooltip>
                        <Tooltip title={t('interfaceDetail.peers.viewConfig')}>
                          <span>
                            <IconButton 
                              edge="end" 
                              aria-label={t('interfaceDetail.peers.viewConfig')} 
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/peers/${peer.id}?tab=config&from_interface=${id}`);
                              }}
                              size="small"
                              disabled={peer.isImported}
                            >
                              <QrCodeIcon fontSize="small" />
                            </IconButton>
                          </span>
                        </Tooltip>
                        <Tooltip title={t('interfaces.actions.delete')}>
                          <span>
                            <IconButton 
                              edge="end" 
                              aria-label={t('interfaces.actions.delete')} 
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/peers/${peer.id}?delete=true&from_interface=${id}`);
                              }}
                              size="small"
                              color="error"
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </span>
                        </Tooltip>
                      </ListItemSecondaryAction>
                    </ListItem>
                  </Paper>
                ))}
              </List>
            ) : (
              <Paper sx={{ p: 4, textAlign: 'center' }}>
                <Typography variant="body1" sx={{ mb: 2 }}>
                  {t('interfaceDetail.peers.noPeers')}
                </Typography>
                <Button 
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={() => navigate(`/peers/new?interface=${id}`)}
                >
                  {t('interfaceDetail.peers.addFirstPeer')}
                </Button>
              </Paper>
            )}
          </Box>
        </TabPanel>
      </Paper>
    </Container>
  );
}

export default InterfaceDetail; 
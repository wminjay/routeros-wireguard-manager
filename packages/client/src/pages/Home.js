import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Container,
  Typography,
  Box,
  Grid,
  Paper,
  Card,
  CardContent,
  CardActions,
  Button,
  CircularProgress,
  Alert,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  ListItemButton,
  IconButton,
  Chip,
  Tooltip
} from '@mui/material';
import NetworkCheckIcon from '@mui/icons-material/NetworkCheck';
import GroupIcon from '@mui/icons-material/Group';
import SettingsIcon from '@mui/icons-material/Settings';
import AddIcon from '@mui/icons-material/Add';
import RouterIcon from '@mui/icons-material/Router';
import PersonIcon from '@mui/icons-material/Person';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import RefreshIcon from '@mui/icons-material/Refresh';

function Home() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [systemStatus, setSystemStatus] = useState({
    status: 'unknown',
    message: t('dashboard.status.checking', '正在检查系统状态...')
  });
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);

  // 从本地存储加载缓存数据
  const loadCachedData = () => {
    try {
      const cachedStats = localStorage.getItem('dashboard_stats');
      const cachedStatus = localStorage.getItem('system_status');
      const cachedTime = localStorage.getItem('dashboard_last_updated');
      
      if (cachedStats && cachedStatus) {
        const parsedStats = JSON.parse(cachedStats);
        const parsedStatus = JSON.parse(cachedStatus);
        const parsedTime = cachedTime ? new Date(JSON.parse(cachedTime)) : null;
        
        setStats(parsedStats);
        setSystemStatus(parsedStatus);
        setLastUpdated(parsedTime);
        setLoading(false);
        
        console.log('从缓存加载数据成功', parsedStats);
        
        // 如果缓存时间超过5分钟，标记为需要刷新
        if (!parsedTime || new Date() - parsedTime > 5 * 60 * 1000) {
          console.log('缓存数据已过期，将在后台刷新');
          return false; // 数据已过期
        }
        return true; // 数据未过期
      }
      return false; // 没有缓存数据
    } catch (error) {
      console.error('加载缓存数据出错:', error);
      return false;
    }
  };

  // 将数据保存到本地存储
  const saveCacheData = (data, status) => {
    try {
      localStorage.setItem('dashboard_stats', JSON.stringify(data));
      localStorage.setItem('system_status', JSON.stringify(status));
      localStorage.setItem('dashboard_last_updated', JSON.stringify(new Date()));
      setLastUpdated(new Date());
    } catch (error) {
      console.error('保存缓存数据出错:', error);
    }
  };

  // 获取仪表盘数据
  const fetchDashboardData = async (isBackground = false) => {
    if (isBackground) {
      setIsRefreshing(true);
    } else {
      setLoading(true);
    }
    
    try {
      const response = await fetch('/api/dashboard');
      
      if (!response.ok) {
        throw new Error(t('dashboard.errors.fetchFailed'));
      }
      
      const data = await response.json();
      setStats(data);
      
      // 设置系统状态
      const newStatus = {
        status: data.routerStatus && data.routerStatus.connected ? 'online' : 'offline',
        message: data.routerStatus && data.routerStatus.connected 
          ? t('dashboard.status.online')
          : t('dashboard.status.offline')
      };
      
      setSystemStatus(newStatus);
      
      // 保存到缓存
      saveCacheData(data, newStatus);
      
      setError(null);
    } catch (err) {
      console.error('获取仪表盘数据错误:', err);
      if (!isBackground) {
        // 只在非后台刷新时显示错误
        setError(t('dashboard.errors.fetchFailed'));
        setSystemStatus({
          status: 'error',
          message: t('dashboard.status.error')
        });
      }
    } finally {
      if (isBackground) {
        setIsRefreshing(false);
      } else {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    // 首先尝试加载缓存数据
    const isCacheValid = loadCachedData();
    
    if (isCacheValid) {
      // 如果缓存有效，在后台静默刷新
      fetchDashboardData(true);
    } else {
      // 如果缓存无效或过期，直接获取新数据
      fetchDashboardData(false);
    }
    
    // 设置定时器，每60秒在后台刷新一次数据
    const intervalId = setInterval(() => fetchDashboardData(true), 60000);
    
    // 清理函数
    return () => clearInterval(intervalId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getStatusColor = (status) => {
    switch (status) {
      case 'online':
        return 'success.main';
      case 'offline':
        return 'error.main';
      case 'error':
        return 'warning.main';
      default:
        return 'text.secondary';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'online':
        return <CheckCircleIcon color="success" />;
      case 'offline':
        return <ErrorIcon color="error" />;
      case 'error':
        return <ErrorIcon color="warning" />;
      default:
        return <CircularProgress size={20} />;
    }
  };

  const isRecentHandshake = (lastHandshake) => {
    if (!lastHandshake) return false;
    try {
      const now = new Date();
      const lastHandshakeDate = new Date(lastHandshake);
      // 检查日期是否有效
      if (isNaN(lastHandshakeDate.getTime())) return false;
      const diff = Math.floor((now - lastHandshakeDate) / 1000);
      return diff < 180; // 三分钟内视为在线
    } catch (error) {
      console.error("处理握手时间出错:", error);
      return false;
    }
  };

  const formatTimeDiff = (lastHandshake) => {
    if (!lastHandshake) return t('dashboard.recentPeers.status.never');
    
    try {
      const now = new Date();
      const handshakeDate = new Date(lastHandshake);
      
      // 检查日期是否有效
      if (isNaN(handshakeDate.getTime())) return t('dashboard.recentPeers.status.invalidTime');
      
      const diffInSeconds = Math.floor((now - handshakeDate) / 1000);
      
      if (diffInSeconds < 60) {
        return t('dashboard.recentPeers.status.justNow');
      } else if (diffInSeconds < 3600) {
        const minutes = Math.floor(diffInSeconds / 60);
        return `${minutes} ${t('dashboard.recentPeers.status.minutesAgo')}`;
      } else if (diffInSeconds < 86400) {
        const hours = Math.floor(diffInSeconds / 3600);
        return `${hours} ${t('dashboard.recentPeers.status.hoursAgo')}`;
      } else if (diffInSeconds < 2592000) {
        const days = Math.floor(diffInSeconds / 86400);
        return `${days} ${t('dashboard.recentPeers.status.daysAgo')}`;
      } else {
        return handshakeDate.toLocaleDateString();
      }
    } catch (error) {
      console.error("格式化时间差异出错:", error);
      return t('dashboard.recentPeers.status.unknown');
    }
  };

  const formatLastUpdated = (date) => {
    if (!date) return '';
    
    try {
      const now = new Date();
      const diff = Math.floor((now - date) / 1000);
      
      if (diff < 60) {
        return t('dashboard.recentPeers.status.justNow');
      } else if (diff < 3600) {
        const minutes = Math.floor(diff / 60);
        return `${minutes} ${t('dashboard.recentPeers.status.minutesAgo')}`;
      } else if (diff < 86400) {
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      } else {
        return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      }
    } catch (error) {
      console.error("格式化更新时间出错:", error);
      return '';
    }
  };

  const getRecentPeers = useMemo(() => {
    if (!stats || !stats.stats || !stats.stats.recentPeers || !Array.isArray(stats.stats.recentPeers)) {
      return [];
    }
    return stats.stats.recentPeers;
  }, [stats]);

  const hasRecentPeers = useMemo(() => getRecentPeers.length > 0, [getRecentPeers]);

  // 系统状态栏优化
  const StatusBar = useMemo(() => (
    <Paper 
      sx={{ 
        p: 2, 
        mb: 3, 
        display: 'flex',
        alignItems: 'center',
        borderLeft: 3,
        borderColor: getStatusColor(systemStatus.status),
        boxShadow: 'none',
        border: '1px solid rgba(0,0,0,0.08)',
        borderRadius: 1
      }}
    >
      <Box sx={{ mr: 2 }}>
        {getStatusIcon(systemStatus.status)}
      </Box>
      <Box sx={{ flexGrow: 1 }}>
        <Typography variant="subtitle1" fontWeight="500" fontSize="0.95rem">
          {t('dashboard.status.title')}
        </Typography>
        <Typography variant="body2" color="text.secondary" fontSize="0.85rem">
          {systemStatus.message}
        </Typography>
      </Box>
      <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem', display: { xs: 'none', sm: 'block' } }}>
        {lastUpdated && `${t('dashboard.status.updatedAt')} ${formatLastUpdated(lastUpdated)}`}
      </Typography>
    </Paper>
  ), [systemStatus, lastUpdated, t]);

  // 优化导航函数，减少重复代码
  const handleNavigation = useCallback((path) => {
    navigate(path);
  }, [navigate]);

  if (loading) {
    return (
      <Container maxWidth="xl" sx={{ mt: 4, textAlign: 'center' }}>
        <CircularProgress />
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ mt: 4 }}>
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}
      
      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
          <Typography variant="h5" fontWeight="500">
            {t('dashboard.title')}
          </Typography>
          <Tooltip title={t('dashboard.refresh')}>
            <IconButton 
              size="small" 
              onClick={() => fetchDashboardData(false)}
              disabled={loading || isRefreshing}
            >
              <RefreshIcon sx={{ 
                animation: (loading || isRefreshing) ? 'spin 2s linear infinite' : 'none',
                '@keyframes spin': {
                  '0%': { transform: 'rotate(0deg)' },
                  '100%': { transform: 'rotate(360deg)' }
                }
              }} />
            </IconButton>
          </Tooltip>
        </Box>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            {t('dashboard.subtitle')}
          </Typography>
          {lastUpdated && (
            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
              {t('dashboard.lastUpdated')}: {formatLastUpdated(lastUpdated)}
            </Typography>
          )}
        </Box>
      </Box>
      
      {StatusBar}
      
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={4}>
          <Card sx={{ 
            height: '100%', 
            display: 'flex', 
            flexDirection: 'column',
            boxShadow: 'none',
            border: '1px solid rgba(0,0,0,0.08)',
            borderRadius: 1
          }}>
            <CardContent sx={{ flexGrow: 1, pt: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <NetworkCheckIcon sx={{ fontSize: 24, mr: 1, color: 'primary.main' }} />
                <Typography variant="h6" fontSize="1rem">
                  {t('dashboard.cards.interfaces.title')}
                </Typography>
              </Box>
              <Typography variant="h3" align="center" sx={{ my: 2, fontWeight: 500 }}>
                {stats ? stats.interfaceCount : '-'}
              </Typography>
            </CardContent>
            <Divider />
            <CardActions sx={{ justifyContent: 'flex-end', py: 1 }}>
              <Button 
                size="small" 
                endIcon={<ArrowForwardIcon />}
                onClick={() => handleNavigation('/interfaces')}
              >
                {t('dashboard.cards.interfaces.action')}
              </Button>
            </CardActions>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={4}>
          <Card sx={{ 
            height: '100%', 
            display: 'flex', 
            flexDirection: 'column',
            boxShadow: 'none',
            border: '1px solid rgba(0,0,0,0.08)',
            borderRadius: 1
          }}>
            <CardContent sx={{ flexGrow: 1, pt: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <GroupIcon sx={{ fontSize: 24, mr: 1, color: 'primary.main' }} />
                <Typography variant="h6" fontSize="1rem">
                  {t('dashboard.cards.peers.title')}
                </Typography>
              </Box>
              <Typography variant="h3" align="center" sx={{ my: 2, fontWeight: 500 }}>
                {stats ? stats.peerCount : '-'}
              </Typography>
            </CardContent>
            <Divider />
            <CardActions sx={{ justifyContent: 'flex-end', py: 1 }}>
              <Button 
                size="small" 
                endIcon={<ArrowForwardIcon />}
                onClick={() => handleNavigation('/peers')}
              >
                {t('dashboard.cards.peers.action')}
              </Button>
            </CardActions>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={4}>
          <Card sx={{ 
            height: '100%', 
            display: 'flex', 
            flexDirection: 'column',
            boxShadow: 'none',
            border: '1px solid rgba(0,0,0,0.08)',
            borderRadius: 1
          }}>
            <CardContent sx={{ flexGrow: 1, pt: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <RouterIcon sx={{ fontSize: 24, mr: 1, color: 'primary.main' }} />
                <Typography variant="h6" fontSize="1rem">
                  {t('dashboard.cards.router.title')}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', my: 2 }}>
                <Chip 
                  label={stats && stats.routerStatus && stats.routerStatus.connected 
                    ? t('dashboard.cards.router.connected') 
                    : t('dashboard.cards.router.disconnected')} 
                  color={stats && stats.routerStatus && stats.routerStatus.connected ? "success" : "error"}
                  variant="outlined"
                  sx={{ height: 32, px: 1 }}
                />
              </Box>
              <Typography variant="body2" color="text.secondary" fontSize="0.875rem" sx={{ textAlign: 'center' }}>
                {stats && stats.routerStatus ? (
                  stats.routerStatus.connected 
                    ? `${stats.routerStatus.model || 'RouterOS'} ${stats.routerStatus.version || ''}`
                    : t('dashboard.cards.router.checkSettings')
                ) : t('dashboard.cards.router.checking')}
              </Typography>
            </CardContent>
            <Divider />
            <CardActions sx={{ justifyContent: 'flex-end', py: 1 }}>
              <Button 
                size="small" 
                endIcon={<ArrowForwardIcon />}
                onClick={() => handleNavigation('/settings')}
              >
                {t('dashboard.cards.router.action')}
              </Button>
            </CardActions>
          </Card>
        </Grid>
      </Grid>
      
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card sx={{ 
            height: '100%', 
            display: 'flex', 
            flexDirection: 'column',
            boxShadow: 'none',
            border: '1px solid rgba(0,0,0,0.08)',
            borderRadius: 1
          }}>
            <CardContent sx={{ p: 0, "&:last-child": { pb: 0 } }}>
              <Box sx={{ p: 2, pb: 1.5 }}>
                <Typography variant="h6" gutterBottom fontWeight="500" fontSize="1rem">
                  {t('dashboard.quickActions.title')}
                </Typography>
              </Box>
              <Divider />
              <List disablePadding>
                <ListItem disablePadding>
                  <ListItemButton sx={{ py: 1.5 }} onClick={() => handleNavigation('/interfaces/new?from=home')}>
                    <ListItemIcon sx={{ color: 'primary.main' }}>
                      <AddIcon />
                    </ListItemIcon>
                    <ListItemText 
                      primary={<Typography variant="body1" fontSize="0.95rem">{t('dashboard.quickActions.newInterface.title')}</Typography>} 
                      secondary={<Typography variant="body2" fontSize="0.8rem" color="text.secondary">{t('dashboard.quickActions.newInterface.description')}</Typography>} 
                    />
                  </ListItemButton>
                </ListItem>
                <ListItem disablePadding>
                  <ListItemButton sx={{ py: 1.5 }} onClick={() => handleNavigation('/peers/new?from=home')}>
                    <ListItemIcon sx={{ color: 'primary.main' }}>
                      <AddIcon />
                    </ListItemIcon>
                    <ListItemText 
                      primary={<Typography variant="body1" fontSize="0.95rem">{t('dashboard.quickActions.newPeer.title')}</Typography>} 
                      secondary={<Typography variant="body2" fontSize="0.8rem" color="text.secondary">{t('dashboard.quickActions.newPeer.description')}</Typography>} 
                    />
                  </ListItemButton>
                </ListItem>
                <ListItem disablePadding>
                  <ListItemButton sx={{ py: 1.5 }} onClick={() => handleNavigation('/settings')}>
                    <ListItemIcon sx={{ color: 'primary.main' }}>
                      <SettingsIcon />
                    </ListItemIcon>
                    <ListItemText 
                      primary={<Typography variant="body1" fontSize="0.95rem">{t('dashboard.quickActions.settings.title')}</Typography>} 
                      secondary={<Typography variant="body2" fontSize="0.8rem" color="text.secondary">{t('dashboard.quickActions.settings.description')}</Typography>} 
                    />
                  </ListItemButton>
                </ListItem>
              </List>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={6}>
          <Card sx={{ 
            height: '100%', 
            display: 'flex', 
            flexDirection: 'column',
            boxShadow: 'none',
            border: '1px solid rgba(0,0,0,0.08)',
            borderRadius: 1
          }}>
            <CardContent sx={{ p: 0, "&:last-child": { pb: 0 } }}>
              <Box sx={{ p: 2, pb: 1.5 }}>
                <Typography variant="h6" gutterBottom fontWeight="500" fontSize="1rem">
                  {t('dashboard.recentPeers.title')}
                </Typography>
              </Box>
              <Divider />
              {hasRecentPeers ? (
                <List disablePadding sx={{ 
                  '& .MuiListItemButton-root:hover': { bgcolor: 'rgba(0, 0, 0, 0.04)' },
                  maxHeight: '280px',
                  overflowY: 'auto'
                }}>
                  {getRecentPeers.map((peer, index) => (
                    <React.Fragment key={peer.id || Math.random()}>
                      {index > 0 && <Divider variant="inset" component="li" sx={{ ml: 0 }} />}
                      <ListItem 
                        disablePadding
                        secondaryAction={
                          <IconButton 
                            edge="end" 
                            aria-label="查看详情"
                            size="small"
                            onClick={() => handleNavigation(`/peers/${peer.id}?from=home`)}
                          >
                            <ArrowForwardIcon fontSize="small" />
                          </IconButton>
                        }
                      >
                        <ListItemButton sx={{ py: 1 }} onClick={() => handleNavigation(`/peers/${peer.id}?from=home`)}>
                          <ListItemIcon sx={{ minWidth: 40 }}>
                            <PersonIcon 
                              fontSize="small" 
                              color={peer.lastHandshake && isRecentHandshake(peer.lastHandshake) ? "success" : "inherit"} 
                            />
                          </ListItemIcon>
                          <ListItemText 
                            primary={
                              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                <Typography component="span" variant="body2" fontSize="0.95rem" sx={{ fontWeight: peer.lastHandshake && isRecentHandshake(peer.lastHandshake) ? 'medium' : 'normal' }}>
                                  {peer.name || t('dashboard.recentPeers.unnamed')}
                                </Typography>
                                {peer.lastHandshake && (
                                  <Tooltip title={`${t('dashboard.recentPeers.status.lastHandshake')}: ${new Date(peer.lastHandshake).toLocaleString()}`}>
                                    <Chip 
                                      label={isRecentHandshake(peer.lastHandshake) ? t('dashboard.recentPeers.status.online') : formatTimeDiff(peer.lastHandshake)}
                                      color={isRecentHandshake(peer.lastHandshake) ? "success" : "default"}
                                      size="small"
                                      variant="outlined"
                                      sx={{ ml: 1, height: 22, '& .MuiChip-label': { px: 0.8, fontSize: '0.7rem' } }}
                                    />
                                  </Tooltip>
                                )}
                              </Box>
                            }
                            secondary={
                              <Box sx={{ display: 'flex', alignItems: 'center', mt: 0.5 }}>
                                <Typography variant="body2" component="span" color="text.secondary" fontSize="0.8rem" sx={{ mr: 1 }}>
                                  {peer.interfaceName || t('dashboard.recentPeers.unknown')} •{' '}
                                  <Tooltip title={peer.allowedIPs || t('dashboard.recentPeers.notSetIP')}>
                                    <span style={{ 
                                      display: 'inline-block',
                                      maxWidth: '120px', 
                                      overflow: 'hidden', 
                                      textOverflow: 'ellipsis', 
                                      whiteSpace: 'nowrap',
                                      verticalAlign: 'middle'
                                    }}>
                                      {peer.allowedIPs || t('dashboard.recentPeers.notSetIP')}
                                    </span>
                                  </Tooltip>
                                </Typography>
                                <Chip 
                                  size="small" 
                                  label={peer.enabled ? t('dashboard.recentPeers.status.enabled') : t('dashboard.recentPeers.status.disabled')} 
                                  color={peer.enabled ? "success" : "default"}
                                  variant="outlined"
                                  sx={{ ml: 1, height: 20, '& .MuiChip-label': { px: 0.6, fontSize: '0.7rem' } }}
                                />
                              </Box>
                            } 
                          />
                        </ListItemButton>
                      </ListItem>
                    </React.Fragment>
                  ))}
                </List>
              ) : (
                <Box sx={{ p: 3, textAlign: 'center' }}>
                  <Typography variant="body1" color="text.secondary" fontSize="0.95rem" sx={{ mb: 2 }}>
                    {t('dashboard.recentPeers.noPeers')}
                  </Typography>
                  <Button 
                    variant="outlined"
                    startIcon={<AddIcon />}
                    onClick={() => handleNavigation('/peers/new?from=home')}
                    sx={{ textTransform: 'none' }}
                    size="small"
                  >
                    {t('dashboard.recentPeers.createFirst')}
                  </Button>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Container>
  );
}

export default Home; 
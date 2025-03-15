import React from 'react';
import {
  Box,
  Grid,
  Typography,
  Button,
  Chip,
  Card,
  CardContent,
  Alert,
  IconButton,
  Divider
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

// 格式化最后握手时间
const formatLastHandshake = (timestamp, t) => {
  if (!timestamp) return t('peerDetail.connectionStatus.handshakeTime.never');
  
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now - date;
  
  // 转换为适当的时间格式
  if (diffMs < 60000) { // 小于1分钟
    return t('peerDetail.connectionStatus.handshakeTime.justNow');
  } else if (diffMs < 3600000) { // 小于1小时
    const minutes = Math.floor(diffMs / 60000);
    return t('peerDetail.connectionStatus.handshakeTime.minutesAgo', { count: minutes });
  } else if (diffMs < 86400000) { // 小于1天
    const hours = Math.floor(diffMs / 3600000);
    return t('peerDetail.connectionStatus.handshakeTime.hoursAgo', { count: hours });
  } else if (diffMs < 2592000000) { // 小于30天
    const days = Math.floor(diffMs / 86400000);
    return t('peerDetail.connectionStatus.handshakeTime.daysAgo', { count: days });
  } else {
    // 显示完整日期
    return date.toLocaleString();
  }
};

function DetailPanel({ peerData, onStatusRefresh }) {
  const [copyStatus, setCopyStatus] = useState({
    publicKey: false,
    allowedIPs: false
  });
  const { t } = useTranslation();

  const handleCopy = (text, field) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopyStatus(prev => ({ ...prev, [field]: true }));
      
      setTimeout(() => {
        setCopyStatus(prev => ({ ...prev, [field]: false }));
      }, 2000);
    });
  };

  const updateStatus = async () => {
    try {
      const response = await fetch('/api/wireguard/peers/status', {
        method: 'POST'
      });
      
      if (!response.ok) {
        throw new Error(t('peerDetail.errors.updateStatusFailed'));
      }
      
      // 刷新数据
      if (onStatusRefresh) {
        onStatusRefresh();
      }
    } catch (error) {
      console.error(t('peerDetail.errors.updateStatusError'), error);
    }
  };

  return (
    <Box>
      <Grid container spacing={3}>
        {/* 基本信息区域 */}
        <Grid item xs={12} md={6}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="h6" gutterBottom>
                {t('peerDetail.basicInfo.title')}
              </Typography>
              <Divider sx={{ mb: 2 }} />
              
              <Grid container spacing={2}>
                <Grid item xs={4}>
                  <Typography variant="subtitle2" color="text.secondary">{t('peerDetail.basicInfo.name')}</Typography>
                </Grid>
                <Grid item xs={8}>
                  <Typography>{peerData.name}</Typography>
                </Grid>
                
                <Grid item xs={4}>
                  <Typography variant="subtitle2" color="text.secondary">{t('peerDetail.basicInfo.interface')}</Typography>
                </Grid>
                <Grid item xs={8}>
                  <Typography>{peerData.WireguardConfig?.name || t('peerDetail.basicInfo.unknown')}</Typography>
                </Grid>
                
                <Grid item xs={4}>
                  <Typography variant="subtitle2" color="text.secondary">{t('peerDetail.basicInfo.allowedIPs')}</Typography>
                </Grid>
                <Grid item xs={8}>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Typography sx={{ mr: 1 }}>{peerData.allowedIPs}</Typography>
                    <IconButton size="small" onClick={() => handleCopy(peerData.allowedIPs, 'allowedIPs')}>
                      {copyStatus.allowedIPs ? <CheckCircleIcon color="success" fontSize="small" /> : <ContentCopyIcon fontSize="small" />}
                    </IconButton>
                  </Box>
                </Grid>
                
                <Grid item xs={4}>
                  <Typography variant="subtitle2" color="text.secondary">{t('peerDetail.basicInfo.persistentKeepalive')}</Typography>
                </Grid>
                <Grid item xs={8}>
                  <Typography>{peerData.persistentKeepalive} {t('common.units.seconds', { defaultValue: 'sec' })}</Typography>
                </Grid>
                
                <Grid item xs={4}>
                  <Typography variant="subtitle2" color="text.secondary">{t('peerDetail.basicInfo.status')}</Typography>
                </Grid>
                <Grid item xs={8}>
                  <Chip 
                    label={peerData.enabled ? t('peerDetail.basicInfo.enabled') : t('peerDetail.basicInfo.disabled')} 
                    color={peerData.enabled ? 'success' : 'default'}
                    size="small"
                  />
                </Grid>
                
                {peerData.comment && (
                  <>
                    <Grid item xs={4}>
                      <Typography variant="subtitle2" color="text.secondary">{t('peerDetail.basicInfo.comment')}</Typography>
                    </Grid>
                    <Grid item xs={8}>
                      <Typography>{peerData.comment}</Typography>
                    </Grid>
                  </>
                )}
              </Grid>
            </CardContent>
          </Card>
        </Grid>
        
        {/* 技术信息区域 */}
        <Grid item xs={12} md={6}>
          <Card variant="outlined">
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Typography variant="h6">
                  {t('peerDetail.connectionStatus.title')}
                </Typography>
                <Button 
                  startIcon={<RefreshIcon />} 
                  size="small" 
                  onClick={updateStatus}
                >
                  {t('peerDetail.connectionStatus.refreshButton')}
                </Button>
              </Box>
              <Divider sx={{ mb: 2 }} />
              
              <Grid container spacing={2}>
                <Grid item xs={5}>
                  <Typography variant="subtitle2" color="text.secondary">{t('peerDetail.connectionStatus.lastHandshake')}</Typography>
                </Grid>
                <Grid item xs={7}>
                  <Typography>
                    {formatLastHandshake(peerData.lastHandshake, t)}
                  </Typography>
                </Grid>
                
                <Grid item xs={5}>
                  <Typography variant="subtitle2" color="text.secondary">{t('peerDetail.connectionStatus.publicKey')}</Typography>
                </Grid>
                <Grid item xs={7}>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Typography sx={{ mr: 1, wordBreak: 'break-all' }}>{peerData.publicKey}</Typography>
                    <IconButton size="small" onClick={() => handleCopy(peerData.publicKey, 'publicKey')}>
                      {copyStatus.publicKey ? <CheckCircleIcon color="success" fontSize="small" /> : <ContentCopyIcon fontSize="small" />}
                    </IconButton>
                  </Box>
                </Grid>
              </Grid>
              
              {peerData.privateKey && peerData.privateKey.startsWith('FAKE_') && (
                <Alert severity="info" sx={{ mt: 2 }}>
                  {t('peerDetail.connectionStatus.importedPeerInfo')}
                </Alert>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}

export default DetailPanel; 
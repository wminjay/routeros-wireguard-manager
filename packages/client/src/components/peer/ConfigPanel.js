import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  TextField,
  Alert,
  CircularProgress,
  Divider,
  Grid,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import QrCodeIcon from '@mui/icons-material/QrCode';
import DownloadIcon from '@mui/icons-material/Download';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CloseIcon from '@mui/icons-material/Close';
import { QRCodeCanvas } from 'qrcode.react';
import { useTranslation } from 'react-i18next';

function ConfigPanel({ peerData }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [config, setConfig] = useState(null);
  const [qrDialogOpen, setQrDialogOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const { t } = useTranslation();

  // 检查是否可以导出配置
  const canExportConfig = useCallback(() => {
    if (!peerData) return false;
    if (!peerData.privateKey) return false;
    if (peerData.isImported) return false;
    return true;
  }, [peerData]);

  const getConfig = useCallback(async () => {
    if (!canExportConfig()) {
      setError(t('peerConfig.errors.importedPeerNoConfig'));
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/wireguard/peers/${peerData.id}/config`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || t('peerConfig.errors.fetchConfigFailed'));
      }
      
      const data = await response.json();
      setConfig(data.config);
      setLoading(false);
    } catch (error) {
      console.error(t('peerConfig.errors.fetchConfigError'), error);
      setError(t('peerConfig.errors.fetchConfigErrorMessage') + error.message);
      setLoading(false);
    }
  }, [canExportConfig, peerData?.id, t]);

  // 组件挂载时自动加载配置
  useEffect(() => {
    if (canExportConfig()) {
      getConfig();
    }
  }, [canExportConfig, getConfig]);

  const downloadConfig = async () => {
    if (!canExportConfig()) {
      setError(t('peerConfig.errors.importedPeerNoConfig'));
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`/api/wireguard/peers/${peerData.id}/config?format=file`, {
        method: 'GET'
      });
      
      if (!response.ok) {
        throw new Error(`${t('peerConfig.errors.downloadFailed')}${response.status} ${response.statusText}`);
      }
      
      // 获取文件名
      const contentDisposition = response.headers.get('content-disposition');
      let fileName = `${peerData.name}-wireguard.conf`;
      
      if (contentDisposition) {
        const fileNameMatch = contentDisposition.match(/filename="(.+)"/);
        if (fileNameMatch) {
          fileName = fileNameMatch[1];
        }
      }
      
      // 获取blob数据
      const blob = await response.blob();
      
      // 创建下载链接
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = fileName;
      
      // 触发下载
      document.body.appendChild(a);
      a.click();
      
      // 清理
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      setLoading(false);
    } catch (error) {
      console.error(t('peerConfig.errors.downloadConfigError'), error);
      setError(t('peerConfig.errors.downloadConfigError') + ' ' + error.message);
      setLoading(false);
    }
  };

  const copyConfig = () => {
    if (!config) return;
    
    navigator.clipboard.writeText(config).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleOpenQrDialog = () => {
    if (!config && canExportConfig()) {
      getConfig();
    }
    setQrDialogOpen(true);
  };

  const handleCloseQrDialog = () => {
    setQrDialogOpen(false);
  };

  return (
    <Box>
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}
      
      {!canExportConfig() && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          {t('peerConfig.importedPeerWarning')}
        </Alert>
      )}
      
      <Card variant="outlined" sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">
              {t('peerConfig.title')}
            </Typography>
            
            <Box>
              <Button
                variant="outlined"
                startIcon={<QrCodeIcon />}
                onClick={handleOpenQrDialog}
                disabled={!canExportConfig()}
                sx={{ mr: 1 }}
              >
                {t('peerConfig.qrCode')}
              </Button>
              
              <Button
                variant="contained"
                startIcon={<DownloadIcon />}
                onClick={downloadConfig}
                disabled={!canExportConfig()}
              >
                {t('peerConfig.downloadConfig')}
              </Button>
            </Box>
          </Box>
          
          <Divider sx={{ mb: 2 }} />
          
          {loading && (
            <Box sx={{ display: 'flex', justifyContent: 'center', my: 3 }}>
              <CircularProgress />
            </Box>
          )}
          
          {config && !loading && (
            <TextField
              fullWidth
              multiline
              rows={10}
              value={config}
              InputProps={{
                readOnly: true,
                endAdornment: (
                  <IconButton
                    onClick={copyConfig}
                    edge="end"
                    sx={{ position: 'absolute', top: 8, right: 8 }}
                  >
                    {copied ? <CheckCircleIcon color="success" /> : <ContentCopyIcon />}
                  </IconButton>
                ),
              }}
              sx={{ fontFamily: 'monospace', mb: 2 }}
            />
          )}
          
          {!config && !loading && !canExportConfig() && (
            <Box sx={{ my: 2, textAlign: 'center' }}>
              <Typography color="text.secondary">
                {t('peerConfig.noConfigAvailable')}
              </Typography>
            </Box>
          )}
        </CardContent>
      </Card>
      
      {/* QR码对话框 */}
      <Dialog 
        open={qrDialogOpen} 
        onClose={handleCloseQrDialog}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">{t('peerConfig.qrCodeDialog.title')}</Typography>
            <IconButton size="small" onClick={handleCloseQrDialog}>
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          {config ? (
            <Box sx={{ textAlign: 'center', my: 2 }}>
              <QRCodeCanvas 
                value={config} 
                size={280}
                level="M"
                includeMargin={true}
              />
              <Typography variant="caption" sx={{ display: 'block', mt: 2, textAlign: 'center' }}>
                {t('peerConfig.qrCodeDialog.scanInstructions')}
              </Typography>
            </Box>
          ) : (
            <Box sx={{ display: 'flex', justifyContent: 'center', my: 3 }}>
              <CircularProgress />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseQrDialog}>{t('peerConfig.qrCodeDialog.closeButton')}</Button>
        </DialogActions>
      </Dialog>
      
      <Grid container spacing={2}>
        <Grid item xs={12}>
          <Alert severity="info">
            <Typography variant="subtitle2" gutterBottom>{t('peerConfig.usageInstructions.title')}</Typography>
            <Typography variant="body2">
              1. {t('peerConfig.usageInstructions.steps.0')}<br />
              2. {t('peerConfig.usageInstructions.steps.1')}<br />
              3. {t('peerConfig.usageInstructions.steps.2')}
            </Typography>
          </Alert>
        </Grid>
      </Grid>
    </Box>
  );
}

export default ConfigPanel; 
import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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
  IconButton,
  Tabs,
  Tab,
  Divider,
  Card,
  CardContent,
  Tooltip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import DownloadIcon from '@mui/icons-material/Download';
import QrCodeIcon from '@mui/icons-material/QrCode';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import QRCode from 'qrcode';

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
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

function PeerConfig() {
  const { t } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();
  const [peerData, setPeerData] = useState(null);
  const [configData, setConfigData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tabValue, setTabValue] = useState(0);
  const [copied, setCopied] = useState(false);
  const [qrDialogOpen, setQrDialogOpen] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [qrLoading, setQrLoading] = useState(false);
  const textAreaRef = useRef(null);

  useEffect(() => {
    // 加载对等点详情和配置
    const fetchPeerConfig = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/wireguard/peers/${id}/config`);
        
        if (!response.ok) {
          const errorData = await response.json();
          // 特殊处理从RouterOS导入对等点的错误
          if (errorData && errorData.code === 'IMPORTED_PEER_NO_CONFIG') {
            throw new Error(t('peerConfig.errors.importedPeerNoConfig'));
          } else {
            throw new Error(errorData.message || t('peerConfig.errors.fetchConfigFailed'));
          }
        }
        
        const data = await response.json();
        
        // 处理API响应，提取配置信息
        if (data.config) {
          setConfigData({
            config: data.config,
            // 尝试从配置中解析一些信息
            serverEndpoint: extractEndpoint(data.config),
            serverPort: extractPort(data.config),
            dns: extractDNS(data.config)
          });
          
          // 如果API没有返回peer信息，创建一个简化的peerData对象
          if (!data.peer) {
            const extractedData = {
              id: id,
              name: extractName(data.filePath) || `${t('peers.unnamed', '未命名对等点')}${id}`,
              allowedIPs: extractAllowedIPs(data.config),
              persistentKeepalive: extractPersistentKeepalive(data.config),
              enabled: true
            };
            setPeerData(extractedData);
          } else {
            setPeerData(data.peer);
          }
          
          setError(null);
        } else {
          throw new Error(t('peerConfigPage.errors.invalidConfigFormat', '返回的配置数据格式不正确'));
        }
      } catch (err) {
        console.error(t('peerConfigPage.errors.fetchConfigError', '获取配置信息错误:'), err);
        setError(err.message || t('peerConfigPage.errors.fetchConfigFailed', '获取配置信息失败，请检查网络连接或服务器状态'));
      } finally {
        setLoading(false);
      }
    };

    fetchPeerConfig();
  }, [id, t]);

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  const handleBackClick = () => {
    navigate(`/peers/${id}`);
  };

  const handleCopyClick = () => {
    if (textAreaRef.current) {
      textAreaRef.current.select();
      document.execCommand('copy');
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownloadClick = () => {
    if (!configData || !configData.config || !peerData) return;
    
    const fileName = `${peerData.name ? peerData.name.replace(/\s+/g, '_') : 'wireguard'}.conf`;
    const fileContent = configData.config;
    
    const blob = new Blob([fileContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleShowQrCode = async () => {
    if (!configData || !configData.config) return;
    
    setQrLoading(true);
    setQrDialogOpen(true);
    
    try {
      // 使用qrcode库在前端生成二维码
      const dataUrl = await QRCode.toDataURL(configData.config, {
        errorCorrectionLevel: 'H',
        margin: 2,
        scale: 8,
        color: {
          dark: '#000000',
          light: '#ffffff'
        }
      });
      
      setQrDataUrl(dataUrl);
      setQrLoading(false);
    } catch (err) {
      console.error(t('peerConfigPage.errors.generateQRError', '生成二维码错误:'), err);
      setError(t('peerConfigPage.errors.generateQRFailed', '生成二维码失败，请尝试下载配置文件'));
      setQrLoading(false);
    }
  };

  const handleCloseQrDialog = () => {
    setQrDialogOpen(false);
  };

  // 从配置文件路径中提取名称
  const extractName = (filePath) => {
    if (!filePath) return null;
    
    try {
      // 从路径中获取文件名
      const fileName = filePath.split('/').pop();
      // 提取基本名称（移除扩展名）
      return fileName.replace(/-wireguard\.conf$/, '').replace(/\.conf$/, '');
    } catch (e) {
      return null;
    }
  };
  
  // 从配置文本中提取各种信息的辅助函数
  const extractEndpoint = (configText) => {
    const match = configText.match(/Endpoint\s*=\s*([^:]+)/);
    return match ? match[1] : t('peerConfigPage.fields.notSet', '未设置');
  };
  
  const extractPort = (configText) => {
    const match = configText.match(/Endpoint\s*=[^:]+:(\d+)/);
    return match ? match[1] : t('peerConfigPage.fields.notSet', '未设置');
  };
  
  const extractDNS = (configText) => {
    const match = configText.match(/DNS\s*=\s*(.*)/);
    return match ? match[1] : t('peerConfigPage.fields.notSet', '未设置');
  };
  
  const extractAllowedIPs = (configText) => {
    const match = configText.match(/AllowedIPs\s*=\s*(.*)/);
    return match ? match[1] : t('peerConfigPage.fields.notSet', '未设置');
  };
  
  const extractPersistentKeepalive = (configText) => {
    const match = configText.match(/PersistentKeepalive\s*=\s*(\d+)/);
    return match ? parseInt(match[1], 10) : 0;
  };

  if (loading) {
    return (
      <Container maxWidth="xl" sx={{ mt: 4, textAlign: 'center' }}>
        <CircularProgress />
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="xl" sx={{ mt: 4 }}>
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={handleBackClick}
        >
          {t('peerDetails.backButton', '返回')}
        </Button>
      </Container>
    );
  }
  
  if (!peerData || !configData) {
    return (
      <Container maxWidth="xl" sx={{ mt: 4 }}>
        <Alert severity="warning" sx={{ mb: 3 }}>
          {t('peerConfigPage.errors.unableToLoadConfig', '无法加载对等点配置数据，请返回重试。')}
        </Alert>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={handleBackClick}
        >
          {t('peerDetails.backButton', '返回')}
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
          {t('peerDetails.backButton', '返回')}
        </Button>
        
        <Typography variant="h5" sx={{ mb: 1 }}>
          {t('peerConfigPage.title', { name: peerData?.name || t('peers.unnamed', '未命名对等点') })}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {t('peerConfigPage.subtitle', '将此配置导入到客户端设备的WireGuard应用中即可连接VPN。')}
        </Typography>
      </Box>
      
      <Paper sx={{ mb: 4 }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={tabValue} onChange={handleTabChange} aria-label={t('peerConfigPage.tabs.ariaLabel', '配置标签页')}>
            <Tab label={t('peerConfigPage.tabs.configInfo', '配置信息')} id="tab-0" aria-controls="tabpanel-0" />
            <Tab label={t('peerConfigPage.tabs.connectionGuide', '连接指南')} id="tab-1" aria-controls="tabpanel-1" />
          </Tabs>
        </Box>

        <TabPanel value={tabValue} index={0}>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="subtitle1">
                  {t('peerConfigPage.configContent', '配置文件内容')}
                </Typography>
                <Box>
                  <Tooltip title={t('peerConfigPage.actions.copyConfig', '复制配置')}>
                    <span>
                      <IconButton onClick={handleCopyClick} color={copied ? "success" : "default"}>
                        {copied ? <CheckCircleIcon /> : <ContentCopyIcon />}
                      </IconButton>
                    </span>
                  </Tooltip>
                  <Tooltip title={t('peerConfigPage.actions.downloadConfig', '下载配置文件')}>
                    <span>
                      <IconButton onClick={handleDownloadClick}>
                        <DownloadIcon />
                      </IconButton>
                    </span>
                  </Tooltip>
                  <Tooltip title={t('peerConfigPage.actions.showQRCode', '显示二维码')}>
                    <span>
                      <IconButton onClick={handleShowQrCode}>
                        <QrCodeIcon />
                      </IconButton>
                    </span>
                  </Tooltip>
                </Box>
              </Box>
              <TextField
                fullWidth
                multiline
                rows={15}
                value={configData ? configData.config : ''}
                inputRef={textAreaRef}
                InputProps={{
                  readOnly: true,
                  sx: { 
                    fontFamily: 'monospace',
                    fontSize: '0.9rem',
                    letterSpacing: '0.5px'
                  }
                }}
              />
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                {t('peerConfigPage.securityNote', '注意：配置文件包含私钥，请妥善保管，不要分享给他人。')}
              </Typography>
            </Grid>
            
            <Grid item xs={12}>
              <Divider sx={{ my: 2 }} />
              <Typography variant="subtitle1" gutterBottom>
                {t('peerConfigPage.clientInfo.title', '客户端信息')}
              </Typography>
              
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                        {t('peerConfigPage.clientInfo.connectionInfo', '连接信息')}
                      </Typography>
                      <Grid container spacing={1}>
                        <Grid item xs={4}>
                          <Typography variant="body2" color="text.secondary">
                            {t('peerConfigPage.fields.serverEndpoint', '服务器地址')}
                          </Typography>
                        </Grid>
                        <Grid item xs={8}>
                          <Typography variant="body2">
                            {configData ? configData.serverEndpoint || t('peerConfigPage.fields.notSet', '未设置') : ''}
                          </Typography>
                        </Grid>
                        
                        <Grid item xs={4}>
                          <Typography variant="body2" color="text.secondary">
                            {t('peerConfigPage.fields.serverPort', '服务器端口')}
                          </Typography>
                        </Grid>
                        <Grid item xs={8}>
                          <Typography variant="body2">
                            {configData ? configData.serverPort || t('peerConfigPage.fields.notSet', '未设置') : ''}
                          </Typography>
                        </Grid>
                        
                        <Grid item xs={4}>
                          <Typography variant="body2" color="text.secondary">
                            {t('peerConfigPage.fields.allowedIPs', '允许的IP')}
                          </Typography>
                        </Grid>
                        <Grid item xs={8}>
                          <Typography variant="body2">
                            {peerData ? peerData.allowedIPs || t('peerConfigPage.fields.notSet', '未设置') : ''}
                          </Typography>
                        </Grid>
                      </Grid>
                    </CardContent>
                  </Card>
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                        {t('peerConfigPage.clientInfo.clientSettings', '客户端设置')}
                      </Typography>
                      <Grid container spacing={1}>
                        <Grid item xs={4}>
                          <Typography variant="body2" color="text.secondary">
                            {t('peerConfigPage.fields.dns', 'DNS')}
                          </Typography>
                        </Grid>
                        <Grid item xs={8}>
                          <Typography variant="body2">
                            {configData ? configData.dns || t('peerConfigPage.fields.notSet', '未设置') : ''}
                          </Typography>
                        </Grid>
                        
                        <Grid item xs={4}>
                          <Typography variant="body2" color="text.secondary">
                            {t('peerConfigPage.fields.persistentKeepalive', '保持连接')}
                          </Typography>
                        </Grid>
                        <Grid item xs={8}>
                          <Typography variant="body2">
                            {peerData ? (peerData.persistentKeepalive > 0 ? 
                              t('peerConfigPage.fields.seconds', {value: peerData.persistentKeepalive}) : 
                              t('peerConfigPage.fields.disabled2', '未启用')) : ''}
                          </Typography>
                        </Grid>
                        
                        <Grid item xs={4}>
                          <Typography variant="body2" color="text.secondary">
                            {t('peerConfigPage.fields.status', '状态')}
                          </Typography>
                        </Grid>
                        <Grid item xs={8}>
                          <Typography variant="body2" color={peerData && peerData.enabled ? "success.main" : "error.main"}>
                            {peerData ? (peerData.enabled ? 
                              t('peerConfigPage.fields.enabled', '已启用') : 
                              t('peerConfigPage.fields.disabled', '已禁用')) : ''}
                          </Typography>
                        </Grid>
                      </Grid>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            </Grid>
          </Grid>
        </TabPanel>

        <TabPanel value={tabValue} index={1}>
          <Typography variant="h6" gutterBottom>
            {t('peerConfigPage.instructions.title', 'WireGuard 客户端连接指南')}
          </Typography>
          
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle1" gutterBottom>
              {t('peerConfigPage.instructions.mobile.title', 'Android / iOS')}
            </Typography>
            <ol>
              <li>
                <Typography variant="body2" paragraph>
                  {t('peerConfigPage.instructions.mobile.step1', '在应用商店下载并安装 WireGuard 应用')}
                </Typography>
              </li>
              <li>
                <Typography variant="body2" paragraph>
                  {t('peerConfigPage.instructions.mobile.step2', '打开 WireGuard 应用，点击"添加隧道"')}
                </Typography>
              </li>
              <li>
                <Typography variant="body2" paragraph>
                  {t('peerConfigPage.instructions.mobile.step3', '选择"扫描二维码"或"从文件导入"')}
                </Typography>
              </li>
              <li>
                <Typography variant="body2" paragraph>
                  {t('peerConfigPage.instructions.mobile.step4', '对于二维码：点击上方的"显示二维码"按钮，然后使用应用扫描')}
                </Typography>
              </li>
              <li>
                <Typography variant="body2" paragraph>
                  {t('peerConfigPage.instructions.mobile.step5', '对于文件导入：点击上方的"下载配置文件"按钮，将文件发送到您的设备，然后在应用中导入')}
                </Typography>
              </li>
              <li>
                <Typography variant="body2" paragraph>
                  {t('peerConfigPage.instructions.mobile.step6', '添加后，点击通道上的开关即可连接')}
                </Typography>
              </li>
            </ol>
          </Box>
          
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle1" gutterBottom>
              {t('peerConfigPage.instructions.desktop.title', 'Windows / macOS')}
            </Typography>
            <ol>
              <li>
                <Typography variant="body2" paragraph>
                  {t('peerConfigPage.instructions.desktop.step1', '从 [WireGuard 官网](https://www.wireguard.com/install/) 下载并安装 WireGuard 应用')}
                </Typography>
              </li>
              <li>
                <Typography variant="body2" paragraph>
                  {t('peerConfigPage.instructions.desktop.step2', '点击上方的"下载配置文件"按钮')}
                </Typography>
              </li>
              <li>
                <Typography variant="body2" paragraph>
                  {t('peerConfigPage.instructions.desktop.step3', '打开 WireGuard 应用，点击"导入隧道"，选择下载的配置文件')}
                </Typography>
              </li>
              <li>
                <Typography variant="body2" paragraph>
                  {t('peerConfigPage.instructions.desktop.step4', '点击"激活"按钮即可连接')}
                </Typography>
              </li>
            </ol>
          </Box>
          
          <Box>
            <Typography variant="subtitle1" gutterBottom>
              {t('peerConfigPage.instructions.linux.title', 'Linux')}
            </Typography>
            <ol>
              <li>
                <Typography variant="body2" paragraph>
                  {t('peerConfigPage.instructions.linux.step1', '安装 WireGuard：`sudo apt install wireguard`（Ubuntu/Debian）或 `sudo dnf install wireguard-tools`（Fedora）')}
                </Typography>
              </li>
              <li>
                <Typography variant="body2" paragraph>
                  {t('peerConfigPage.instructions.linux.step2', '点击上方的"下载配置文件"按钮')}
                </Typography>
              </li>
              <li>
                <Typography variant="body2" paragraph>
                  {t('peerConfigPage.instructions.linux.step3', '将配置文件保存到 `/etc/wireguard/` 目录，例如：`sudo cp ~/Downloads/{(peerData?.name ? peerData.name.replace(/\\s+/g, "_") : "wireguard")}.conf /etc/wireguard/wg0.conf`')}
                </Typography>
              </li>
              <li>
                <Typography variant="body2" paragraph>
                  {t('peerConfigPage.instructions.linux.step4', '启动连接：`sudo wg-quick up wg0`')}
                </Typography>
              </li>
              <li>
                <Typography variant="body2" paragraph>
                  {t('peerConfigPage.instructions.linux.step5', '停止连接：`sudo wg-quick down wg0`')}
                </Typography>
              </li>
            </ol>
          </Box>
        </TabPanel>
      </Paper>

      {/* 二维码对话框 */}
      <Dialog
        open={qrDialogOpen}
        onClose={handleCloseQrDialog}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {t('peerConfigPage.qrCode.title', '扫描二维码连接')}
        </DialogTitle>
        <DialogContent>
          {qrLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
              <CircularProgress />
            </Box>
          ) : qrDataUrl ? (
            <Box sx={{ textAlign: 'center', p: 2 }}>
              <img 
                src={qrDataUrl} 
                alt={t('peerConfigPage.qrCode.altText', 'WireGuard 配置二维码')} 
                style={{ maxWidth: '100%', maxHeight: '400px' }}
              />
              <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                {t('peerConfigPage.qrCode.scanInstructions', '使用 WireGuard 移动端应用扫描此二维码来导入配置')}
              </Typography>
            </Box>
          ) : (
            <Box sx={{ p: 2 }}>
              <Alert severity="error">
                {t('peerConfigPage.errors.generateQRFailed', '生成二维码失败，请尝试下载配置文件')}
              </Alert>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button 
            variant="outlined" 
            onClick={handleDownloadClick} 
            startIcon={<DownloadIcon />}
            sx={{ mr: 'auto' }}
          >
            {t('peerConfigPage.qrCode.downloadInstead', '下载配置文件')}
          </Button>
          <Button onClick={handleCloseQrDialog}>
            {t('peerConfigPage.qrCode.close', '关闭')}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}

export default PeerConfig; 
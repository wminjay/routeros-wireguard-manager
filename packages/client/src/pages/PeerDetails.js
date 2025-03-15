import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Container,
  Typography,
  Paper,
  Box,
  Tabs,
  Tab,
  Button,
  CircularProgress,
  Alert,
  Divider,
  IconButton,
  Breadcrumbs,
  Link,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Tooltip,
  Chip
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import RefreshIcon from '@mui/icons-material/Refresh';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import QrCodeIcon from '@mui/icons-material/QrCode';
import DetailPanel from '../components/peer/DetailPanel';
import EditPanel from '../components/peer/EditPanel';
import ConfigPanel from '../components/peer/ConfigPanel';

// 选项卡Panel组件
function TabPanel(props) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`peer-tabpanel-${index}`}
      aria-labelledby={`peer-tab-${index}`}
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

function a11yProps(index) {
  return {
    id: `peer-tab-${index}`,
    'aria-controls': `peer-tabpanel-${index}`,
  };
}

function PeerDetails() {
  const { t } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  
  // 获取来源相关参数
  const getNavigationParams = () => {
    const searchParams = new URLSearchParams(location.search);
    return {
      sourceInterface: searchParams.get('from_interface'),
      fromHome: searchParams.get('from') === 'home'
    };
  };
  
  const { sourceInterface: sourceInterfaceId, fromHome } = getNavigationParams();
  
  // 检查URL中是否有删除参数
  const checkDeleteParam = () => {
    const searchParams = new URLSearchParams(location.search);
    return searchParams.get('delete') === 'true';
  };
  
  // 根据URL参数决定初始选项卡
  const getInitialTab = () => {
    const searchParams = new URLSearchParams(location.search);
    const tab = searchParams.get('tab');
    
    if (tab === 'edit') return 1;
    if (tab === 'config') return 2;
    return 0; // 默认详情
  };
  
  const [tabValue, setTabValue] = useState(getInitialTab);
  const [peerData, setPeerData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0); // 用于触发重新加载
  const [deleteModalOpen, setDeleteModalOpen] = useState(checkDeleteParam());
  const [deleteLoading, setDeleteLoading] = useState(false);

  // 加载对等点数据
  useEffect(() => {
    const fetchPeerData = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/wireguard/peers/${id}`);
        
        if (!response.ok) {
          throw new Error(t('peerDetails.messages.fetchFailed'));
        }
        
        const data = await response.json();
        setPeerData(data);
        setLoading(false);
      } catch (error) {
        console.error(t('peerDetails.messages.fetchError'), error);
        setError(t('peerDetails.messages.fetchErrorMessage') + error.message);
        setLoading(false);
      }
    };
    
    fetchPeerData();
  }, [id, refreshKey, t]);

  // 处理选项卡变化
  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
    
    // 更新URL但不触发导航
    const searchParams = new URLSearchParams(location.search);
    if (newValue === 0) searchParams.delete('tab');
    else if (newValue === 1) searchParams.set('tab', 'edit');
    else if (newValue === 2) searchParams.set('tab', 'config');
    
    // 保留from_interface参数
    if (sourceInterfaceId) {
      searchParams.set('from_interface', sourceInterfaceId);
    }
    
    const newSearch = searchParams.toString();
    const newPath = `${location.pathname}${newSearch ? `?${newSearch}` : ''}`;
    navigate(newPath, { replace: true });
  };

  // 刷新对等点数据
  const handleRefresh = () => {
    setRefreshKey(prevKey => prevKey + 1);
  };

  // 处理编辑完成事件
  const handleEditComplete = (updatedPeer) => {
    setPeerData(updatedPeer);
    setTabValue(0); // 切换回详情选项卡
    
    // 更新URL
    const searchParams = new URLSearchParams(location.search);
    searchParams.delete('tab');
    // 保留from_interface参数
    if (sourceInterfaceId) {
      searchParams.set('from_interface', sourceInterfaceId);
    }
    const newSearch = searchParams.toString();
    const newPath = `${location.pathname}${newSearch ? `?${newSearch}` : ''}`;
    navigate(newPath, { replace: true });
  };

  // 打开删除确认对话框
  const handleOpenDeleteModal = () => {
    setDeleteModalOpen(true);
    
    // 更新URL，但保留来源接口参数
    const searchParams = new URLSearchParams(location.search);
    searchParams.set('delete', 'true');
    const newSearch = searchParams.toString();
    const newPath = `${location.pathname}?${newSearch}`;
    navigate(newPath, { replace: true });
  };

  // 关闭删除确认对话框
  const handleCloseDeleteModal = () => {
    setDeleteModalOpen(false);
    
    // 移除URL中的delete参数，但保留其他参数
    const searchParams = new URLSearchParams(location.search);
    searchParams.delete('delete');
    
    // 保留from_interface和tab参数
    if (tabValue !== 0) {
      searchParams.set('tab', tabValue === 1 ? 'edit' : 'config');
    }
    
    const newSearch = searchParams.toString();
    const newPath = `${location.pathname}${newSearch ? `?${newSearch}` : ''}`;
    navigate(newPath, { replace: true });
  };

  // 处理删除对等点
  const handleDeleteConfirm = async () => {
    try {
      setDeleteLoading(true);
      const response = await fetch(`/api/wireguard/peers/${id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || t('peerDetails.errors.deleteFailed'));
      }
      
      // 删除成功，返回到对等点列表或接口详情
      const interfaceId = peerData.wireguardConfigId;
      navigate(interfaceId ? `/interfaces/${interfaceId}` : '/peers');
      
    } catch (err) {
      console.error(t('peerDetails.errors.deleteError'), err);
      setError(err.message || t('peerDetails.errors.deleteTryAgain'));
      setDeleteLoading(false);
      setDeleteModalOpen(false);
    }
  };

  if (loading) {
    return (
      <Container maxWidth="xl">
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="xl">
        <Alert severity="error" sx={{ mt: 4 }}>
          {error}
        </Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl">
      <Paper elevation={3} sx={{ p: 3, mt: 3 }}>
        {/* 标题和导航 */}
        <Box sx={{ mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
            <Button
              startIcon={<ArrowBackIcon />}
              onClick={() => {
                if (fromHome) {
                  navigate('/');
                } else if (sourceInterfaceId) {
                  navigate(`/interfaces/${sourceInterfaceId}?tab=peers`);
                } else {
                  navigate('/peers');
                }
              }}
              sx={{ mr: 2 }}
            >
              {t('peerDetails.backButton')}
            </Button>
            <Typography variant="h5" component="h1">
              {peerData?.name || t('peerDetails.title')}
            </Typography>
            <IconButton 
              size="small" 
              color="primary" 
              sx={{ ml: 2 }} 
              onClick={handleRefresh}
              title={t('peerDetails.refreshTooltip')}
            >
              <RefreshIcon />
            </IconButton>
            <IconButton 
              size="small" 
              color="error" 
              sx={{ ml: 1 }} 
              onClick={handleOpenDeleteModal}
              title={t('peerDetails.deleteTooltip')}
            >
              <DeleteIcon />
            </IconButton>
          </Box>
          <Breadcrumbs aria-label="breadcrumb">
            <Link 
              component="button" 
              underline="hover" 
              color="inherit"
              onClick={() => navigate('/')}
            >
              {t('peerDetails.breadcrumbs.home')}
            </Link>
            {sourceInterfaceId ? (
              <>
                <Link
                  component="button"
                  underline="hover"
                  color="inherit"
                  onClick={() => navigate('/interfaces')}
                >
                  {t('peerDetails.breadcrumbs.interfacesList')}
                </Link>
                <Link
                  component="button"
                  underline="hover"
                  color="inherit"
                  onClick={() => navigate(`/interfaces/${sourceInterfaceId}?tab=peers`)}
                >
                  {t('peerDetails.breadcrumbs.interfacePeers')}
                </Link>
              </>
            ) : (
              <Link
                component="button"
                underline="hover"
                color="inherit"
                onClick={() => navigate('/peers')}
              >
                {t('peerDetails.breadcrumbs.peersList')}
              </Link>
            )}
            <Typography color="text.primary">{peerData?.name || t('peerDetails.title')}</Typography>
          </Breadcrumbs>
        </Box>
        
        <Divider sx={{ mb: 2 }} />
        
        {/* 选项卡导航 */}
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs 
            value={tabValue} 
            onChange={handleTabChange} 
            aria-label="peer detail tabs"
          >
            <Tab label={t('peerDetails.tabs.basicInfo')} {...a11yProps(0)} />
            <Tab label={t('peerDetails.tabs.editSettings')} {...a11yProps(1)} />
            <Tab label={t('peerDetails.tabs.clientConfig')} {...a11yProps(2)} />
          </Tabs>
        </Box>
        
        {/* 选项卡内容 */}
        <TabPanel value={tabValue} index={0}>
          <DetailPanel 
            peerData={peerData} 
            onStatusRefresh={handleRefresh}
          />
        </TabPanel>
        
        <TabPanel value={tabValue} index={1}>
          <EditPanel 
            peerData={peerData} 
            onEditComplete={handleEditComplete}
            onCancel={() => setTabValue(0)}
          />
        </TabPanel>
        
        <TabPanel value={tabValue} index={2}>
          <ConfigPanel 
            peerData={peerData} 
          />
        </TabPanel>
      </Paper>
      
      {/* 删除确认对话框 */}
      <Dialog
        open={deleteModalOpen}
        onClose={handleCloseDeleteModal}
      >
        <DialogTitle>{t('peerDetails.deleteModal.title')}</DialogTitle>
        <DialogContent>
          <DialogContentText>
            {t('peerDetails.deleteModal.confirmText', { name: peerData?.name })}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDeleteModal} disabled={deleteLoading}>
            {t('common.cancel')}
          </Button>
          <Button 
            onClick={handleDeleteConfirm} 
            color="error" 
            disabled={deleteLoading}
            startIcon={deleteLoading ? <CircularProgress size={20} /> : <DeleteIcon />}
          >
            {deleteLoading ? t('peerDetails.deleteModal.deleting') : t('common.delete')}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}

export default PeerDetails; 
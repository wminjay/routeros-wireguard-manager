import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Container,
  Typography,
  Box,
  Paper,
  Button,
  CircularProgress,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Tooltip,
  Fab,
  TextField,
  InputAdornment,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  Snackbar
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import VisibilityIcon from '@mui/icons-material/Visibility';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import QrCodeIcon from '@mui/icons-material/QrCode';
import KeyIcon from '@mui/icons-material/Key';
import SearchIcon from '@mui/icons-material/Search';
import FilterListIcon from '@mui/icons-material/FilterList';
import SyncIcon from '@mui/icons-material/Sync';
import RefreshIcon from '@mui/icons-material/Refresh';

function Peers() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [peers, setPeers] = useState([]);
  const [filteredPeers, setFilteredPeers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [peerToDelete, setPeerToDelete] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [interfaceFilter, setInterfaceFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [interfaces, setInterfaces] = useState([]);
  const [syncLoading, setSyncLoading] = useState(false);
  const [syncSuccess, setSyncSuccess] = useState(false);
  const [syncMessage, setSyncMessage] = useState('');
  const [statusLoading, setStatusLoading] = useState(false);

  useEffect(() => {
    // 加载对等点列表
    fetchPeers();
    fetchInterfaces();
  }, []);

  // 加载对等点列表
  const fetchPeers = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/wireguard/peers');
      
      if (!response.ok) {
        throw new Error(t('peers.errors.fetchFailed'));
      }
      
      const data = await response.json();
      setPeers(data);
      setFilteredPeers(data);
      setError(null);
    } catch (err) {
      console.error(t('peers.errors.fetchError'), err);
      setError(t('peers.errors.fetchErrorMessage'));
    } finally {
      setLoading(false);
    }
  };

  // 加载接口列表（用于过滤）
  const fetchInterfaces = async () => {
    try {
      const response = await fetch('/api/wireguard/interfaces');
      
      if (!response.ok) {
        throw new Error(t('interfaces.errors.fetchFailed'));
      }
      
      const data = await response.json();
      setInterfaces(data);
    } catch (err) {
      console.error(t('interfaces.errors.fetchError'), err);
    }
  };

  // 同步RouterOS中的对等点
  const handleSync = async () => {
    try {
      setSyncLoading(true);
      
      const response = await fetch('/api/wireguard/peers/sync', {
        method: 'POST'
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || t('peers.errors.syncFailed'));
      }
      
      const result = await response.json();
      
      // 重新加载对等点列表
      await fetchPeers();
      
      // 显示成功消息
      setSyncSuccess(true);
      setSyncMessage(t('peers.syncSuccess', { imported: result.imported, total: result.total }));
    } catch (err) {
      console.error(t('peers.errors.syncError'), err);
      setError(err.message || t('peers.errors.syncTryAgain'));
    } finally {
      setSyncLoading(false);
    }
  };

  const handleCloseSyncMessage = () => {
    setSyncSuccess(false);
  };

  // 更新对等点状态信息
  const updatePeersStatus = async () => {
    try {
      setStatusLoading(true);
      
      const response = await fetch('/api/wireguard/peers/status', {
        method: 'POST'
      });
      
      if (!response.ok) {
        throw new Error(t('peers.errors.statusUpdateFailed'));
      }
      
      const result = await response.json();
      
      // 更新本地数据中的lastHandshake信息
      if (result.peers && result.peers.length > 0) {
        setPeers(prevPeers => {
          const newPeers = [...prevPeers];
          result.peers.forEach(updatedPeer => {
            const peerIndex = newPeers.findIndex(p => p.id === updatedPeer.id);
            if (peerIndex !== -1) {
              newPeers[peerIndex] = { ...newPeers[peerIndex], lastHandshake: updatedPeer.lastHandshake };
            }
          });
          return newPeers;
        });
        
        // 同时更新过滤后的列表
        setFilteredPeers(prevPeers => {
          const newPeers = [...prevPeers];
          result.peers.forEach(updatedPeer => {
            const peerIndex = newPeers.findIndex(p => p.id === updatedPeer.id);
            if (peerIndex !== -1) {
              newPeers[peerIndex] = { ...newPeers[peerIndex], lastHandshake: updatedPeer.lastHandshake };
            }
          });
          return newPeers;
        });
      }
      
      // 显示成功消息
      setSyncSuccess(true);
      setSyncMessage(t('peers.statusUpdateSuccess', { updated: result.updated }));
    } catch (err) {
      console.error(t('peers.errors.statusUpdateError'), err);
      setError(err.message || t('peers.errors.statusUpdateTryAgain'));
    } finally {
      setStatusLoading(false);
    }
  };

  // 过滤对等点
  useEffect(() => {
    let result = [...peers];
    
    // 按名称或备注搜索
    if (searchQuery) {
      const lowercaseQuery = searchQuery.toLowerCase();
      result = result.filter(peer => 
        (peer.name && peer.name.toLowerCase().includes(lowercaseQuery)) || 
        (peer.allowedIPs && peer.allowedIPs.toLowerCase().includes(lowercaseQuery)) ||
        (peer.comment && peer.comment.toLowerCase().includes(lowercaseQuery))
      );
    }
    
    // 按接口过滤
    if (interfaceFilter) {
      result = result.filter(peer => peer.wireguardInterfaceId === interfaceFilter);
    }
    
    // 按状态过滤
    if (statusFilter) {
      const isEnabled = statusFilter === 'enabled';
      result = result.filter(peer => peer.enabled === isEnabled);
    }
    
    setFilteredPeers(result);
  }, [peers, searchQuery, interfaceFilter, statusFilter]);

  const handleOpenDeleteModal = (peer) => {
    setPeerToDelete(peer);
    setDeleteModalOpen(true);
  };

  const handleCloseDeleteModal = () => {
    setDeleteModalOpen(false);
    setDeleteError(null);
  };

  const handleDeleteConfirm = async () => {
    if (!peerToDelete) return;
    
    try {
      setDeleteLoading(true);
      setDeleteError(null);
      
      const response = await fetch(`/api/wireguard/peers/${peerToDelete.id}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || t('peers.errors.deleteFailed'));
      }
      
      // 更新本地状态
      setPeers(peers.filter(peer => peer.id !== peerToDelete.id));
      setDeleteModalOpen(false);
    } catch (err) {
      console.error(t('peers.errors.deleteError'), err);
      setDeleteError(err.message || t('peers.errors.deleteTryAgain'));
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleSearchChange = (event) => {
    setSearchQuery(event.target.value);
  };

  const handleInterfaceFilterChange = (event) => {
    setInterfaceFilter(event.target.value);
  };

  const handleStatusFilterChange = (event) => {
    setStatusFilter(event.target.value);
  };

  const resetFilters = () => {
    setSearchQuery('');
    setInterfaceFilter('');
    setStatusFilter('');
  };

  // 格式化最后握手时间
  const formatLastHandshake = (date) => {
    if (!date) return t('peers.lastHandshake.never');
    
    const now = new Date();
    const handshakeDate = new Date(date);
    const diffInSeconds = Math.floor((now - handshakeDate) / 1000);
    
    if (diffInSeconds < 60) {
      return t('peers.lastHandshake.justNow');
    } else if (diffInSeconds < 3600) {
      const minutes = Math.floor(diffInSeconds / 60);
      return t('peers.lastHandshake.minutesAgo', { count: minutes });
    } else if (diffInSeconds < 86400) {
      const hours = Math.floor(diffInSeconds / 3600);
      return t('peers.lastHandshake.hoursAgo', { count: hours });
    } else if (diffInSeconds < 2592000) {
      const days = Math.floor(diffInSeconds / 86400);
      return t('peers.lastHandshake.daysAgo', { count: days });
    } else {
      return handshakeDate.toLocaleDateString();
    }
  };

  if (loading) {
    return (
      <Container sx={{ mt: 4, textAlign: 'center' }}>
        <CircularProgress />
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ mt: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Typography variant="h5">
          {t('peers.title')}
        </Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="outlined"
            startIcon={<SyncIcon />}
            onClick={handleSync}
            disabled={syncLoading}
          >
            {syncLoading ? t('peers.syncing') : t('peers.syncFromRouterOS')}
          </Button>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={updatePeersStatus}
            disabled={statusLoading}
            color="info"
          >
            {statusLoading ? t('peers.updating') : t('peers.refreshStatus')}
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => navigate('/peers/new')}
          >
            {t('peers.createPeer')}
          </Button>
        </Box>
      </Box>
      
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}
      
      {/* 同步成功提示 */}
      <Snackbar
        open={syncSuccess}
        autoHideDuration={6000}
        onClose={handleCloseSyncMessage}
        message={syncMessage}
      />
      
      {/* 过滤器 */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'center' }}>
          <TextField
            label={t('peers.filters.search')}
            variant="outlined"
            size="small"
            value={searchQuery}
            onChange={handleSearchChange}
            sx={{ flexGrow: 1, minWidth: '200px' }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
          />
          
          <FormControl size="small" sx={{ minWidth: '200px' }}>
            <InputLabel id="interface-filter-label">{t('peers.filters.interface')}</InputLabel>
            <Select
              labelId="interface-filter-label"
              value={interfaceFilter}
              onChange={handleInterfaceFilterChange}
              label={t('peers.filters.interface')}
            >
              <MenuItem value="">{t('peers.filters.all')}</MenuItem>
              {interfaces.map(iface => (
                <MenuItem key={iface.id} value={iface.id}>{iface.name}</MenuItem>
              ))}
            </Select>
          </FormControl>
          
          <FormControl size="small" sx={{ minWidth: '150px' }}>
            <InputLabel id="status-filter-label">{t('peers.filters.status')}</InputLabel>
            <Select
              labelId="status-filter-label"
              value={statusFilter}
              onChange={handleStatusFilterChange}
              label={t('peers.filters.status')}
            >
              <MenuItem value="">{t('peers.filters.all')}</MenuItem>
              <MenuItem value="enabled">{t('interfaces.enabled')}</MenuItem>
              <MenuItem value="disabled">{t('interfaces.disabled')}</MenuItem>
            </Select>
          </FormControl>
          
          <Button 
            variant="outlined" 
            startIcon={<FilterListIcon />}
            onClick={resetFilters}
            size="small"
          >
            {t('peers.filters.reset')}
          </Button>
        </Box>
      </Paper>
      
      {/* 对等点列表 */}
      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>{t('peers.table.name')}</TableCell>
              <TableCell>{t('peers.table.interface')}</TableCell>
              <TableCell sx={{ maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {t('peers.table.allowedIPs')}
              </TableCell>
              <TableCell>{t('peers.table.status')}</TableCell>
              <TableCell>{t('peers.table.lastHandshake')}</TableCell>
              <TableCell align="right">{t('peers.table.actions')}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredPeers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  {t('peers.noPeers')}
                </TableCell>
              </TableRow>
            ) : (
              filteredPeers.map(peer => {
                const interfaceName = peer.WireguardConfig?.name || t('peers.unknownInterface');
                
                return (
                  <TableRow key={peer.id}>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Typography variant="body2">
                          {peer.name || t('peers.unnamed')}
                        </Typography>
                        {peer.isImported && (
                          <Tooltip title={t('peers.importedPeerTooltip')}>
                            <Chip
                              label={t('peers.imported')}
                              size="small"
                              variant="outlined"
                              color="default"
                              sx={{ ml: 1, height: 20, fontSize: '0.65rem', opacity: 0.7 }}
                            />
                          </Tooltip>
                        )}
                        {peer.comment && (
                          <Tooltip title={peer.comment}>
                            <Typography 
                              variant="caption" 
                              color="text.secondary"
                              sx={{ ml: 1, display: 'inline', cursor: 'help' }}
                            >
                              {t('peers.hasComment')}
                            </Typography>
                          </Tooltip>
                        )}
                      </Box>
                    </TableCell>
                    <TableCell>{interfaceName}</TableCell>
                    <TableCell sx={{ maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      <Tooltip title={peer.allowedIPs}>
                        <span>{peer.allowedIPs}</span>
                      </Tooltip>
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={peer.enabled ? t('interfaces.enabled') : t('interfaces.disabled')} 
                        color={peer.enabled ? 'success' : 'default'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      {formatLastHandshake(peer.lastHandshake)}
                    </TableCell>
                    <TableCell align="right">
                      <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 0.5 }}>
                        <Tooltip title={t('peers.actions.viewDetails')}>
                          <IconButton 
                            size="small" 
                            onClick={() => navigate(`/peers/${peer.id}`)}
                          >
                            <VisibilityIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title={t('peers.actions.edit')}>
                          <IconButton 
                            size="small"
                            onClick={() => navigate(`/peers/${peer.id}?tab=edit`)}
                          >
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title={t('peers.actions.viewConfig')}>
                          <IconButton 
                            size="small"
                            onClick={() => navigate(`/peers/${peer.id}?tab=config`)}
                          >
                            <QrCodeIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title={t('peers.actions.delete')}>
                          <IconButton 
                            size="small"
                            onClick={() => handleOpenDeleteModal(peer)}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </TableContainer>
      
      {/* 删除确认对话框 */}
      <Dialog
        open={deleteModalOpen}
        onClose={handleCloseDeleteModal}
      >
        <DialogTitle>{t('peers.deleteModal.title')}</DialogTitle>
        <DialogContent>
          <DialogContentText>
            {t('peers.deleteModal.confirmText', { name: peerToDelete?.name || t('peers.unnamed') })}
          </DialogContentText>
          {deleteError && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {deleteError}
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDeleteModal} disabled={deleteLoading}>
            {t('common.cancel')}
          </Button>
          <Button 
            onClick={handleDeleteConfirm} 
            color="error" 
            disabled={deleteLoading}
            startIcon={deleteLoading ? <CircularProgress size={20} /> : null}
          >
            {deleteLoading ? t('peers.deleteModal.deleting') : t('common.delete')}
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* 添加按钮 */}
      <Fab
        color="primary"
        aria-label={t('peers.createPeer')}
        sx={{ position: 'fixed', bottom: 16, right: 16 }}
        onClick={() => navigate('/peers/new')}
      >
        <AddIcon />
      </Fab>
    </Container>
  );
}

export default Peers; 
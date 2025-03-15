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
  Snackbar
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import VisibilityIcon from '@mui/icons-material/Visibility';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import GroupIcon from '@mui/icons-material/Group';
import SyncIcon from '@mui/icons-material/Sync';

function Interfaces() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [interfaces, setInterfaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [interfaceToDelete, setInterfaceToDelete] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState(null);
  const [syncLoading, setSyncLoading] = useState(false);
  const [syncSuccess, setSyncSuccess] = useState(false);
  const [syncMessage, setSyncMessage] = useState('');

  useEffect(() => {
    // 加载接口列表
    fetchInterfaces();
  }, []);

  // 加载接口列表
  const fetchInterfaces = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/wireguard/interfaces');
      
      if (!response.ok) {
        throw new Error(t('interfaces.errors.fetchFailed'));
      }
      
      const data = await response.json();
      setInterfaces(data);
      setError(null);
    } catch (err) {
      console.error(t('interfaces.errors.fetchError'), err);
      setError(t('interfaces.errors.fetchErrorMessage'));
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDeleteModal = (interfaceData) => {
    setInterfaceToDelete(interfaceData);
    setDeleteModalOpen(true);
  };

  const handleCloseDeleteModal = () => {
    setDeleteModalOpen(false);
    setDeleteError(null);
  };

  const handleDeleteConfirm = async () => {
    if (!interfaceToDelete) return;
    
    try {
      setDeleteLoading(true);
      setDeleteError(null);
      
      const response = await fetch(`/api/wireguard/interfaces/${interfaceToDelete.id}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || t('interfaces.errors.deleteFailed'));
      }
      
      // 更新本地状态
      setInterfaces(interfaces.filter(item => item.id !== interfaceToDelete.id));
      setDeleteModalOpen(false);
    } catch (err) {
      console.error(t('interfaces.errors.deleteError'), err);
      setDeleteError(err.message || t('interfaces.errors.deleteTryAgain'));
    } finally {
      setDeleteLoading(false);
    }
  };

  // 同步RouterOS中的接口
  const handleSync = async () => {
    try {
      setSyncLoading(true);
      
      const response = await fetch('/api/wireguard/sync', {
        method: 'POST'
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || t('interfaces.errors.syncFailed'));
      }
      
      const result = await response.json();
      
      // 重新加载接口列表
      await fetchInterfaces();
      
      // 显示成功消息
      setSyncSuccess(true);
      setSyncMessage(t('interfaces.syncSuccess', { imported: result.imported, total: result.total }));
    } catch (err) {
      console.error(t('interfaces.errors.syncError'), err);
      setError(err.message || t('interfaces.errors.syncTryAgain'));
    } finally {
      setSyncLoading(false);
    }
  };

  const handleCloseSyncMessage = () => {
    setSyncSuccess(false);
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
          {t('interfaces.title')}
        </Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="outlined"
            startIcon={<SyncIcon />}
            onClick={handleSync}
            disabled={syncLoading}
          >
            {syncLoading ? t('interfaces.syncing') : t('interfaces.syncFromRouterOS')}
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => navigate('/interfaces/new')}
          >
            {t('interfaces.createInterface')}
          </Button>
        </Box>
      </Box>
      
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}
      
      {interfaces.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="h6" sx={{ mb: 2 }}>
            {t('interfaces.noInterfaces')}
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
            {t('interfaces.noInterfacesDescription')}
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => navigate('/interfaces/new')}
          >
            {t('interfaces.createInterface')}
          </Button>
        </Paper>
      ) : (
        <TableContainer component={Paper}>
          <Table sx={{ minWidth: 650 }} size="small">
            <TableHead>
              <TableRow>
                <TableCell>{t('interfaces.table.name')}</TableCell>
                <TableCell>{t('interfaces.table.listenPort')}</TableCell>
                <TableCell>{t('interfaces.table.peerCount')}</TableCell>
                <TableCell>{t('interfaces.table.mtu')}</TableCell>
                <TableCell>{t('interfaces.table.status')}</TableCell>
                <TableCell align="right">{t('interfaces.table.actions')}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {interfaces.map((interfaceData) => (
                <TableRow 
                  key={interfaceData.id}
                  sx={{ '&:hover': { backgroundColor: 'action.hover' } }}
                >
                  <TableCell 
                    component="th" 
                    scope="row"
                    sx={{ 
                      cursor: 'pointer',
                      '&:hover': { color: 'primary.main' }
                    }}
                    onClick={() => navigate(`/interfaces/${interfaceData.id}`)}
                  >
                    <Typography variant="body1" fontWeight="medium">
                      {interfaceData.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {interfaceData.interfaceName}
                    </Typography>
                  </TableCell>
                  <TableCell>{interfaceData.listenPort}</TableCell>
                  <TableCell>
                    {interfaceData.peerCount || 0}
                  </TableCell>
                  <TableCell>{interfaceData.mtu}</TableCell>
                  <TableCell>
                    <Chip 
                      label={interfaceData.enabled ? t('interfaces.enabled') : t('interfaces.disabled')} 
                      color={interfaceData.enabled ? "success" : "default"}
                      size="small"
                    />
                  </TableCell>
                  <TableCell align="right">
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 0.5 }}>
                      <Tooltip title={t('interfaces.actions.viewDetails')}>
                        <IconButton 
                          onClick={() => navigate(`/interfaces/${interfaceData.id}`)}
                          size="small"
                        >
                          <VisibilityIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title={t('interfaces.actions.viewPeers')}>
                        <IconButton 
                          onClick={() => navigate(`/interfaces/${interfaceData.id}?tab=peers`)}
                          size="small"
                        >
                          <GroupIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title={t('interfaces.actions.edit')}>
                        <IconButton 
                          onClick={() => navigate(`/interfaces/${interfaceData.id}?edit=true`)}
                          size="small"
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title={t('interfaces.actions.delete')}>
                        <IconButton 
                          onClick={() => handleOpenDeleteModal(interfaceData)}
                          size="small"
                          color="error"
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <Box sx={{ position: 'fixed', bottom: 20, right: 20 }}>
        <Fab
          color="primary"
          aria-label={t('interfaces.createInterface')}
          onClick={() => navigate('/interfaces/new')}
        >
          <AddIcon />
        </Fab>
      </Box>

      {/* 同步成功提示 */}
      <Snackbar
        open={syncSuccess}
        autoHideDuration={6000}
        onClose={handleCloseSyncMessage}
        message={syncMessage}
      />

      {/* 删除确认对话框 */}
      <Dialog
        open={deleteModalOpen}
        onClose={handleCloseDeleteModal}
        aria-labelledby="alert-dialog-title"
        aria-describedby="alert-dialog-description"
      >
        <DialogTitle id="alert-dialog-title">
          {t('interfaces.deleteModal.title')}
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="alert-dialog-description">
            {t('interfaces.deleteModal.confirmText', { name: interfaceToDelete?.name })}
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
            autoFocus
            disabled={deleteLoading}
            startIcon={deleteLoading ? <CircularProgress size={20} /> : <DeleteIcon />}
          >
            {deleteLoading ? t('interfaces.deleteModal.deleting') : t('interfaces.deleteModal.confirmDelete')}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}

export default Interfaces; 
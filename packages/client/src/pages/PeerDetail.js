/**
 * @deprecated 此文件即将被废除，请使用 PeerDetails.js 组件
 * 
 * 说明：
 * 1. 当前系统路由中使用的是 PeerDetails.js 组件 (/peers/:id)
 * 2. 该文件保留仅用于参考或迁移目的
 * 3. 此组件未来将被移除，请不要在新代码中使用
 */

import React, { useState, useEffect } from 'react';
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
  AlertTitle,
  IconButton,
  Divider,
  Card,
  CardContent,
  Tooltip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Chip,
  Switch,
  FormControlLabel
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import SaveIcon from '@mui/icons-material/Save';
import CancelIcon from '@mui/icons-material/Cancel';
import KeyIcon from '@mui/icons-material/Key';
import QrCodeIcon from '@mui/icons-material/QrCode';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

/**
 * @deprecated 此组件即将被废除，请使用 PeerDetails 组件
 */
function PeerDetail() {
  const { t } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();
  
  // Show deprecation warning in development
  useEffect(() => {
    console.warn(t('deprecation.peerDetailComponent', 'Warning: PeerDetail component is deprecated, use PeerDetails component instead. This component will be removed in a future version.'));
  }, [t]);
  
  const [peerData, setPeerData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editFormData, setEditFormData] = useState(null);
  const [saveLoading, setSaveLoading] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [copyStatus, setCopyStatus] = useState({
    publicKey: false,
    allowedIPs: false
  });

  useEffect(() => {
    // 加载对等点详情
    const fetchPeerDetails = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/wireguard/peers/${id}`);
        
        if (!response.ok) {
          throw new Error(t('peerDetail.errors.fetchFailed'));
        }
        
        const data = await response.json();
        setPeerData(data);
        setEditFormData(data);
        setError(null);
      } catch (err) {
        console.error(t('peerDetail.errors.fetchError'), err);
        setError(t('peerDetail.errors.fetchErrorMessage'));
      } finally {
        setLoading(false);
      }
    };

    fetchPeerDetails();
  }, [id, t]);

  const handleBackClick = () => {
    navigate('/peers');
  };

  const handleEditClick = () => {
    setIsEditing(true);
    setEditFormData({...peerData});
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditFormData(peerData);
    setSaveError(null);
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setEditFormData({
      ...editFormData,
      [name]: type === 'checkbox' ? checked : value
    });
  };

  const validateForm = () => {
    const errors = [];
    
    if (!editFormData.name.trim()) {
      errors.push(t('peerDetail.validationErrors.nameRequired'));
    }
    
    if (!editFormData.allowedIPs.trim()) {
      errors.push(t('peerDetail.validationErrors.allowedIPsRequired'));
    } else {
      // 简单校验IP地址格式
      const ipPattern = /^(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\/\d{1,2})(,\s*\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\/\d{1,2})*$/;
      if (!ipPattern.test(editFormData.allowedIPs)) {
        errors.push(t('peerDetail.validationErrors.allowedIPsFormat'));
      }
    }
    
    if (editFormData.persistentKeepalive !== '' && 
        (isNaN(editFormData.persistentKeepalive) || 
         parseInt(editFormData.persistentKeepalive) < 0 || 
         parseInt(editFormData.persistentKeepalive) > 1000)) {
      errors.push(t('peerDetail.validationErrors.keepaliveRange'));
    }
    
    return errors;
  };

  const handleSaveClick = async () => {
    try {
      const validationErrors = validateForm();
      if (validationErrors.length > 0) {
        setSaveError(validationErrors.join('；'));
        return;
      }
      
      setSaveLoading(true);
      setSaveError(null);
      
      const response = await fetch(`/api/wireguard/peers/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(editFormData)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || t('peerDetail.errors.updateFailed'));
      }
      
      const updatedData = await response.json();
      setPeerData(updatedData);
      setEditFormData(updatedData);
      setIsEditing(false);
    } catch (err) {
      console.error(t('peerDetail.errors.updateError'), err);
      setSaveError(err.message || t('peerDetail.errors.updateTryAgain'));
    } finally {
      setSaveLoading(false);
    }
  };

  const handleOpenDeleteModal = () => {
    setDeleteModalOpen(true);
  };

  const handleCloseDeleteModal = () => {
    setDeleteModalOpen(false);
  };

  const handleDeleteConfirm = async () => {
    try {
      setDeleteLoading(true);
      
      const response = await fetch(`/api/wireguard/peers/${id}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || t('peerDetail.errors.deleteFailed'));
      }
      
      // 删除成功，返回到对等点列表
      navigate('/peers');
    } catch (err) {
      console.error(t('peerDetail.errors.deleteError'), err);
      setError(err.message || t('peerDetail.errors.deleteTryAgain'));
    } finally {
      setDeleteLoading(false);
      setDeleteModalOpen(false);
    }
  };

  const handleConfigClick = () => {
    navigate(`/peers/${id}/config`);
  };

  const copyToClipboard = (text, field) => {
    navigator.clipboard.writeText(text).then(
      () => {
        setCopyStatus({
          ...copyStatus,
          [field]: true
        });
        setTimeout(() => {
          setCopyStatus({
            ...copyStatus,
            [field]: false
          });
        }, 2000);
      },
      (err) => {
        console.error(t('interfaceDetail.copyError'), err);
      }
    );
  };

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
          {t('peerDetail.backButton')}
        </Button>
      </Container>
    );
  }

  return (
    <Container maxWidth="md" sx={{ mt: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={handleBackClick}
          sx={{ mb: 2 }}
        >
          {t('peerDetail.backButton')}
        </Button>
        
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h5">
            {t('peerDetail.detailsTitle', { name: peerData.name })}
          </Typography>
          <Box>
            {!isEditing ? (
              <>
                <Button
                  variant="outlined"
                  startIcon={<KeyIcon />}
                  onClick={handleConfigClick}
                  sx={{ mr: 1 }}
                >
                  {t('peerDetail.actions.viewConfig')}
                </Button>
                <Button
                  variant="outlined"
                  color="primary"
                  startIcon={<EditIcon />}
                  onClick={handleEditClick}
                  sx={{ mr: 1 }}
                >
                  {t('peerDetail.actions.edit')}
                </Button>
                <Button
                  variant="outlined"
                  color="error"
                  startIcon={<DeleteIcon />}
                  onClick={handleOpenDeleteModal}
                >
                  {t('peerDetail.actions.delete')}
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="outlined"
                  color="primary"
                  startIcon={<SaveIcon />}
                  onClick={handleSaveClick}
                  disabled={saveLoading}
                  sx={{ mr: 1 }}
                >
                  {saveLoading ? t('peerDetail.actions.saving') : t('peerDetail.actions.save')}
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<CancelIcon />}
                  onClick={handleCancelEdit}
                  disabled={saveLoading}
                >
                  {t('peerDetail.actions.cancel')}
                </Button>
              </>
            )}
          </Box>
        </Box>
        
        <Divider />
      </Box>

      {saveError && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {saveError}
        </Alert>
      )}
      
      <Paper sx={{ p: 3, mb: 4 }}>
        <Grid container spacing={3}>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label={t('peerDetail.labels.peerName')}
              name="name"
              value={isEditing ? editFormData.name : peerData.name}
              onChange={handleInputChange}
              disabled={!isEditing}
              sx={{ mb: 2 }}
            />
            
            <TextField
              fullWidth
              label={t('peerDetail.labels.allowedIPs')}
              name="allowedIPs"
              value={isEditing ? editFormData.allowedIPs : peerData.allowedIPs}
              onChange={handleInputChange}
              disabled={!isEditing}
              helperText={t('peerDetail.labels.allowedIPsHelp')}
              sx={{ mb: 2 }}
              InputProps={{
                endAdornment: !isEditing && (
                  <Tooltip title={t('peerDetail.copyTooltip')}>
                    <IconButton 
                      edge="end" 
                      onClick={() => copyToClipboard(peerData.allowedIPs, 'allowedIPs')}
                    >
                      {copyStatus.allowedIPs ? <CheckCircleIcon color="success" /> : <ContentCopyIcon />}
                    </IconButton>
                  </Tooltip>
                ),
              }}
            />
            
            <TextField
              fullWidth
              label={t('peerDetail.labels.persistentKeepalive')}
              name="persistentKeepalive"
              type="number"
              value={isEditing ? editFormData.persistentKeepalive : peerData.persistentKeepalive}
              onChange={handleInputChange}
              disabled={!isEditing}
              helperText={t('peerDetail.labels.persistentKeepaliveHelp')}
              sx={{ mb: 2 }}
            />
          </Grid>
          
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label={t('peerDetail.labels.publicKey')}
              value={peerData.publicKey || ''}
              disabled
              sx={{ mb: 2 }}
              InputProps={{
                endAdornment: (
                  <Tooltip title={t('peerDetail.copyTooltip')}>
                    <IconButton 
                      edge="end" 
                      onClick={() => copyToClipboard(peerData.publicKey, 'publicKey')}
                    >
                      {copyStatus.publicKey ? <CheckCircleIcon color="success" /> : <ContentCopyIcon />}
                    </IconButton>
                  </Tooltip>
                ),
              }}
            />
            
            {/* 显示从RouterOS导入的对等点标记 */}
            {peerData.isImported && (
              <Box sx={{ mb: 2, mt: -1 }}>
                <Alert severity="info" sx={{ mb: 2 }}>
                  <AlertTitle>{t('peerDetail.importedPeer.title')}</AlertTitle>
                  {t('peerDetail.importedPeer.description')}
                </Alert>
              </Box>
            )}
            
            <TextField
              fullWidth
              label={t('peerDetail.labels.createdAt')}
              value={new Date(peerData.createdAt).toLocaleString()}
              disabled
              sx={{ mb: 2 }}
            />
            
            {isEditing ? (
              <FormControlLabel
                control={
                  <Switch
                    checked={editFormData.enabled}
                    onChange={handleInputChange}
                    name="enabled"
                  />
                }
                label={t('peerDetail.labels.enablePeer')}
              />
            ) : (
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  {t('peerDetail.labels.status')}
                </Typography>
                <Chip 
                  label={peerData.enabled ? t('peerDetail.labels.enabled') : t('peerDetail.labels.disabled')} 
                  color={peerData.enabled ? "success" : "default"}
                />
              </Box>
            )}
            
            {isEditing && (
              <TextField
                fullWidth
                label={t('peerDetail.labels.comment')}
                name="comment"
                value={editFormData.comment || ''}
                onChange={handleInputChange}
                disabled={!isEditing}
                multiline
                rows={3}
                sx={{ mt: 2 }}
              />
            )}
          </Grid>
          
          {!isEditing && peerData.comment && (
            <Grid item xs={12}>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                {t('peerDetail.labels.comment')}
              </Typography>
              <Typography variant="body1">
                {peerData.comment}
              </Typography>
            </Grid>
          )}
        </Grid>
      </Paper>
      
      <Dialog
        open={deleteModalOpen}
        onClose={handleCloseDeleteModal}
      >
        <DialogTitle>{t('peerDetail.deleteModal.title')}</DialogTitle>
        <DialogContent>
          <DialogContentText>
            {t('peerDetail.deleteModal.confirmText', { name: peerData.name })}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDeleteModal}>
            {t('common.cancel')}
          </Button>
          <Button 
            color="error" 
            onClick={handleDeleteConfirm}
            disabled={deleteLoading}
          >
            {deleteLoading ? t('peerDetail.deleteModal.deleting') : t('peerDetail.deleteModal.delete')}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}

export default PeerDetail; 
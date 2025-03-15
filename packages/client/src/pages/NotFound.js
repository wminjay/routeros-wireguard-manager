import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Typography,
  Paper,
  Box,
  Button,
  Grid
} from '@mui/material';
import HomeIcon from '@mui/icons-material/Home';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';

function NotFound() {
  const navigate = useNavigate();

  const handleGoHome = () => {
    navigate('/');
  };

  const handleGoBack = () => {
    navigate(-1);
  };

  return (
    <Container maxWidth="xl" sx={{ mt: 8 }}>
      <Paper sx={{ p: 4, textAlign: 'center' }}>
        <Box sx={{ mb: 4, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <ErrorOutlineIcon sx={{ fontSize: 80, color: 'error.main', mb: 2 }} />
          
          <Typography variant="h4" gutterBottom>
            页面未找到
          </Typography>
          
          <Typography variant="body1" color="text.secondary" paragraph>
            抱歉，您请求的页面不存在或已被移除。
          </Typography>
        </Box>
        
        <Grid container spacing={2} justifyContent="center">
          <Grid item>
            <Button
              variant="contained"
              startIcon={<HomeIcon />}
              onClick={handleGoHome}
            >
              返回首页
            </Button>
          </Grid>
          <Grid item>
            <Button
              variant="outlined"
              startIcon={<ArrowBackIcon />}
              onClick={handleGoBack}
            >
              返回上一页
            </Button>
          </Grid>
        </Grid>
      </Paper>
    </Container>
  );
}

export default NotFound; 
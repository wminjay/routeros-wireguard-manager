import React, { useState, useEffect, Suspense, lazy, useMemo } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Container, CssBaseline, CircularProgress, Box } from '@mui/material';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import { zhCN, enUS } from '@mui/material/locale';
import { useTranslation } from 'react-i18next';

// 组件导入
import Header from './components/layout/Header';
import Footer from './components/layout/Footer';
import Home from './pages/Home';
import TitleManager from './components/TitleManager';
import SetupWizard from './components/setup/SetupWizard';

// 延迟加载其他页面组件
const Interfaces = lazy(() => import('./pages/Interfaces'));
const InterfaceDetail = lazy(() => import('./pages/InterfaceDetail'));
const InterfaceCreate = lazy(() => import('./pages/InterfaceCreate'));
const Peers = lazy(() => import('./pages/Peers'));
const PeerCreate = lazy(() => import('./pages/PeerCreate'));
const PeerDetails = lazy(() => import('./pages/PeerDetails'));
const QuickSetup = lazy(() => import('./pages/QuickSetup'));
const Settings = lazy(() => import('./pages/Settings'));
const NotFound = lazy(() => import('./pages/NotFound'));

// 添加React Router Future配置
const routerOptions = {
  future: {
    v7_startTransition: true,
    v7_relativeSplatPath: true
  }
};

function App() {
  const { i18n, t } = useTranslation();
  const [routerOSStatus, setRouterOSStatus] = useState(null);
  const [showSetupWizard, setShowSetupWizard] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const currentLanguage = i18n.language || 'en'; 
  const currentLocale = currentLanguage.startsWith('zh') ? zhCN : enUS;

  // 创建主题
  const theme = useMemo(() => createTheme({
    palette: {
      primary: {
        main: '#2196f3',
        light: '#64b5f6',
        dark: '#1976d2',
        contrastText: '#fff',
      },
      secondary: {
        main: '#f50057',
        light: '#ff4081',
        dark: '#c51162',
        contrastText: '#fff',
      },
      background: {
        default: '#f5f5f5',
      },
    },
    typography: {
      fontFamily: [
        '-apple-system',
        'BlinkMacSystemFont',
        '"Segoe UI"',
        'Roboto',
        '"Helvetica Neue"',
        'Arial',
        'sans-serif',
        '"Apple Color Emoji"',
        '"Segoe UI Emoji"',
        '"Segoe UI Symbol"',
      ].join(','),
    },
    components: {
      MuiCard: {
        styleOverrides: {
          root: {
            borderRadius: 8,
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          }
        }
      },
      MuiCardContent: {
        styleOverrides: {
          root: {
            padding: 16,
            '&:last-child': {
              paddingBottom: 16,
            }
          }
        }
      },
      MuiButton: {
        styleOverrides: {
          root: {
            textTransform: 'none',
            borderRadius: 6,
          }
        }
      },
      // 分隔线样式
      MuiDivider: {
        styleOverrides: {
          root: {
            borderColor: 'rgba(0, 0, 0, 0.08)'
          }
        }
      }
    }
  }, currentLocale), [currentLocale]);

  // 检查是否首次启动
  useEffect(() => {
    const checkSetupStatus = async () => {
      try {
        const response = await fetch('/api/settings/setup-status');
        const data = await response.json();
        
        if (response.ok && data) {
          setShowSetupWizard(!data.setupCompleted);
        } else {
          // 如果无法获取设置状态，默认显示设置向导
          setShowSetupWizard(true);
        }
      } catch (error) {
        console.error(t('errors.setupStatusCheck'), error);
        // 如果请求失败，默认显示设置向导
        setShowSetupWizard(true);
      } finally {
        setIsInitializing(false);
      }
    };
    
    checkSetupStatus();
  }, [t]);

  useEffect(() => {
    // 检查RouterOS连接状态
    const checkStatus = async () => {
      try {
        const response = await fetch('/api/routeros/status');
        const data = await response.json();
        setRouterOSStatus(data);
      } catch (error) {
        console.error(t('errors.routerStatus'), error);
        setRouterOSStatus({ status: 'error', message: t('errors.connectionError') });
      }
    };
    
    checkStatus();
    
    // 每60秒检查一次
    const intervalId = setInterval(checkStatus, 60000);
    
    // 清理函数
    return () => clearInterval(intervalId);
  }, [t]);

  const handleSetupComplete = () => {
    setShowSetupWizard(false);
  };

  if (isInitializing) {
    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Box 
          sx={{ 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center', 
            height: '100vh' 
          }}
        >
          <CircularProgress />
        </Box>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <TitleManager />
      
      <Router {...routerOptions}>
        {/* 设置向导对话框 - 现在放在Router内部 */}
        <SetupWizard 
          open={showSetupWizard} 
          onComplete={handleSetupComplete} 
        />
        
        <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
          <Header routerOSStatus={routerOSStatus} />
          <Container component="main" sx={{ 
            flexGrow: 1,
            py: 2,
            display: 'flex',
            flexDirection: 'column'
          }}>
            <Suspense fallback={
              <Box sx={{ display: 'flex', justifyContent: 'center', mt: 10 }}>
                <CircularProgress />
              </Box>
            }>
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/interfaces" element={<Interfaces />} />
                <Route path="/interfaces/new" element={<InterfaceCreate />} />
                <Route path="/interfaces/:id" element={<InterfaceDetail />} />
                <Route path="/peers" element={<Peers />} />
                <Route path="/peers/new" element={<PeerCreate />} />
                
                {/* 新的统一详情页面 */}
                <Route path="/peers/:id" element={<PeerDetails />} />
                
                {/* 保留旧路由的重定向以确保兼容性 */}
                <Route path="/peers/:id/edit" element={<Navigate to={params => `/peers/${params.id}?tab=edit`} replace />} />
                <Route path="/peers/:id/config" element={<Navigate to={params => `/peers/${params.id}?tab=config`} replace />} />
                
                <Route path="/quicksetup" element={<QuickSetup />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </Container>
          <Footer />
        </Box>
      </Router>
    </ThemeProvider>
  );
}

export default App; 
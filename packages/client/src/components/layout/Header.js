import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { 
  AppBar, 
  Box, 
  Toolbar, 
  Typography, 
  Button, 
  IconButton, 
  Drawer, 
  List, 
  ListItem, 
  ListItemIcon, 
  ListItemText,
  Chip,
  useMediaQuery,
  useTheme,
  Divider
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import HomeIcon from '@mui/icons-material/Home';
import SettingsIcon from '@mui/icons-material/Settings';
import RouterIcon from '@mui/icons-material/Router';
import DevicesIcon from '@mui/icons-material/Devices';
import AddIcon from '@mui/icons-material/Add';
import WifiIcon from '@mui/icons-material/Wifi';
import LanguageIcon from '@mui/icons-material/Language';
import LanguageSwitcher from '../LanguageSwitcher';

function Header({ routerOSStatus }) {
  const { t } = useTranslation();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const toggleDrawer = (open) => (event) => {
    if (
      event.type === 'keydown' &&
      (event.key === 'Tab' || event.key === 'Shift')
    ) {
      return;
    }
    setDrawerOpen(open);
  };

  const handleNavigation = (path) => {
    navigate(path);
    setDrawerOpen(false);
  };

  const menuItems = [
    { text: t('menu.home', '首页'), icon: <HomeIcon />, path: '/' },
    { text: t('menu.interfaces', 'WireGuard接口'), icon: <RouterIcon />, path: '/interfaces' },
    { text: t('menu.peers', '对等点'), icon: <DevicesIcon />, path: '/peers' },
    { text: t('menu.quickSetup', '快速创建'), icon: <AddIcon />, path: '/quicksetup' },
    { text: t('menu.settings', '设置'), icon: <SettingsIcon />, path: '/settings' },
  ];

  const drawer = (
    <Box
      sx={{ width: 250 }}
      role="presentation"
      onClick={toggleDrawer(false)}
      onKeyDown={toggleDrawer(false)}
    >
      <Box sx={{ 
        p: 2, 
        display: 'flex', 
        flexDirection: 'column',
        alignItems: 'center',
        backgroundColor: theme.palette.primary.main,
        color: 'white'
      }}>
        <WifiIcon sx={{ fontSize: 40, mb: 1 }} />
        <Typography variant="h6" sx={{ mb: 1 }}>
          {t('app.title', 'WireGuard配置器')}
        </Typography>
        <Chip 
          label={routerOSStatus?.status === 'connected' 
            ? t('status.connected', '已连接') 
            : t('status.disconnected', '未连接')} 
          color={routerOSStatus?.status === 'connected' ? 'success' : 'error'}
          size="small"
        />
      </Box>
      <List>
        {menuItems.map((item) => (
          <ListItem 
            button 
            key={item.text} 
            onClick={() => handleNavigation(item.path)}
          >
            <ListItemIcon>{item.icon}</ListItemIcon>
            <ListItemText primary={item.text} />
          </ListItem>
        ))}
        <Divider sx={{ my: 1 }} />
        <ListItem button>
          <ListItemIcon><LanguageIcon /></ListItemIcon>
          <ListItemText primary={t('menu.language', '语言')} />
          <Box sx={{ mr: 1 }}>
            <LanguageSwitcher />
          </Box>
        </ListItem>
      </List>
    </Box>
  );

  return (
    <Box sx={{ flexGrow: 1 }}>
      <AppBar position="static">
        <Toolbar>
          {isMobile && (
            <IconButton
              size="large"
              edge="start"
              color="inherit"
              aria-label="menu"
              sx={{ mr: 2 }}
              onClick={toggleDrawer(true)}
            >
              <MenuIcon />
            </IconButton>
          )}

          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            <Link to="/" style={{ color: 'white', textDecoration: 'none' }}>
              {t('app.fullTitle', 'RouterOS WireGuard配置管理器')}
            </Link>
          </Typography>

          {routerOSStatus && (
            <Chip 
              label={routerOSStatus.status === 'connected' 
                ? t('status.connected', '已连接') 
                : t('status.disconnected', '未连接')} 
              color={routerOSStatus.status === 'connected' ? 'success' : 'error'}
              size="small"
              sx={{ mr: 2 }}
            />
          )}

          <LanguageSwitcher />

          {!isMobile && menuItems.map((item, index) => (
            (index < menuItems.length - 1) && (
              <Button 
                key={item.text} 
                color="inherit" 
                startIcon={item.icon}
                onClick={() => handleNavigation(item.path)}
                sx={{ ml: 1 }}
              >
                {item.text}
              </Button>
            )
          ))}
          
          {!isMobile && (
            <Button 
              color="inherit" 
              startIcon={<SettingsIcon />}
              onClick={() => handleNavigation('/settings')}
              sx={{ ml: 1 }}
            >
              {t('menu.settings', '设置')}
            </Button>
          )}
        </Toolbar>
      </AppBar>
      <Drawer
        anchor="left"
        open={drawerOpen}
        onClose={toggleDrawer(false)}
      >
        {drawer}
      </Drawer>
    </Box>
  );
}

export default Header; 
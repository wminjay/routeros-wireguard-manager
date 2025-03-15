import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  IconButton,
  Menu,
  MenuItem,
  ListItemText,
  ListItemIcon,
  Tooltip,
  Typography
} from '@mui/material';
import LanguageIcon from '@mui/icons-material/Language';
import CheckIcon from '@mui/icons-material/Check';

// 支持的语言列表
const languages = [
  { code: 'en', label: 'English', nativeLabel: 'English' },
  { code: 'zh', label: 'Chinese', nativeLabel: '中文' }
];

function LanguageSwitcher() {
  const { i18n, t } = useTranslation();
  const [anchorEl, setAnchorEl] = useState(null);
  const [currentLang, setCurrentLang] = useState(i18n.language.substring(0, 2));
  const open = Boolean(anchorEl);
  
  // 监听语言变化
  useEffect(() => {
    const handleLanguageChanged = () => {
      setCurrentLang(i18n.language.substring(0, 2));
      // 强制刷新页面组件以确保所有文本更新
      // window.location.reload(); // 这种方法太极端，会导致整页刷新
    };

    // 订阅语言变化事件
    i18n.on('languageChanged', handleLanguageChanged);
    
    // 清理函数
    return () => {
      i18n.off('languageChanged', handleLanguageChanged);
    };
  }, [i18n]);
  
  const handleClick = (event) => {
    setAnchorEl(event.currentTarget);
  };
  
  const handleClose = () => {
    setAnchorEl(null);
  };
  
  const handleLanguageChange = (languageCode) => {
    console.log(`Changing language to: ${languageCode}, current: ${i18n.language}`);
    
    // 如果已经是当前语言，不做任何操作
    if (languageCode === i18n.language.substring(0, 2)) {
      handleClose();
      return;
    }
    
    // 切换语言
    i18n.changeLanguage(languageCode).then(() => {
      console.log(`Language changed to: ${i18n.language}`);
      
      // 保存用户语言选择到本地存储
      localStorage.setItem('i18n_language', languageCode);
      
      // 关闭菜单
      handleClose();
    }).catch(err => {
      console.error('Failed to change language:', err);
    });
  };
  
  // 使用固定字符串而不是翻译，因为这需要在两种语言下都能看懂
  const switchLabel = t('language.switchLabelBilingual');
  
  return (
    <>
      <Tooltip title={switchLabel}>
        <IconButton
          color="inherit"
          aria-label={t('language.switchLabel')}
          onClick={handleClick}
          size="small"
          sx={{ 
            display: 'flex',
            alignItems: 'center',
            gap: '4px'
          }}
        >
          <LanguageIcon fontSize="small" />
          <Typography
            variant="caption"
            sx={{
              fontSize: '0.75rem',
              fontWeight: 'medium',
              opacity: 0.7,
              textTransform: 'uppercase',
              color: 'inherit'
            }}
          >
            {currentLang}
          </Typography>
        </IconButton>
      </Tooltip>
      
      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        PaperProps={{
          elevation: 1,
          sx: { minWidth: 150 }
        }}
      >
        {languages.map((language) => (
          <MenuItem 
            key={language.code}
            onClick={() => handleLanguageChange(language.code)}
            selected={currentLang === language.code}
          >
            <ListItemText primary={language.nativeLabel} />
            {currentLang === language.code && (
              <ListItemIcon sx={{ justifyContent: 'flex-end' }}>
                <CheckIcon fontSize="small" />
              </ListItemIcon>
            )}
          </MenuItem>
        ))}
      </Menu>
    </>
  );
}

export default LanguageSwitcher; 
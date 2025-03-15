import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';

/**
 * 页面标题管理组件
 * 根据当前语言动态设置页面标题
 */
function TitleManager() {
  const { t, i18n } = useTranslation();
  
  useEffect(() => {
    // 设置页面标题
    document.title = t('app.fullTitle', 'RouterOS WireGuard Configuration Manager');
    
    // 监听语言变化
    const handleLanguageChanged = () => {
      document.title = t('app.fullTitle', 'RouterOS WireGuard Configuration Manager');
    };
    
    i18n.on('languageChanged', handleLanguageChanged);
    
    // 清理函数
    return () => {
      i18n.off('languageChanged', handleLanguageChanged);
    };
  }, [t, i18n]);
  
  // 这是一个无UI组件，不返回任何可见元素
  return null;
}

export default TitleManager; 
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// 导入语言文件
import enTranslation from './locales/en.json';
import zhTranslation from './locales/zh.json';

// 清除任何可能存在的i18next缓存
if (typeof window !== 'undefined') {
  // 只在浏览器环境下执行
  const clearI18nCache = () => {
    try {
      const oldLang = localStorage.getItem('i18n_language');
      // 清除所有与i18n相关的localStorage项
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.includes('i18next')) {
          localStorage.removeItem(key);
        }
      }
      // 恢复语言设置
      if (oldLang) {
        localStorage.setItem('i18n_language', oldLang);
      }
    } catch (e) {
      console.warn('Failed to clear i18n cache:', e);
    }
  };
  
  // 执行清除
  clearI18nCache();
}

// 确保资源正确格式化
const resources = {
  en: {
    translation: enTranslation
  },
  zh: {
    translation: zhTranslation
  }
};

// 初始化i18next
i18n
  // 使用语言检测器
  .use(LanguageDetector)
  // 将i18n实例传递给react-i18next
  .use(initReactI18next)
  // 初始化i18next
  .init({
    resources,
    fallbackLng: 'en', // 默认语言
    debug: process.env.NODE_ENV === 'development', // 开发环境开启调试

    interpolation: {
      escapeValue: false, // 不需要为React转义
    },

    // 语言检测选项
    detection: {
      order: ['localStorage', 'navigator', 'querystring', 'cookie', 'htmlTag'], // 检测顺序 - 优先使用本地存储
      lookupQuerystring: 'lang', // 支持URL查询参数切换语言，例如：?lang=en
      lookupCookie: 'i18n_language',
      lookupLocalStorage: 'i18n_language',
      caches: ['localStorage', 'cookie'], // 缓存用户选择的语言
    },
    
    // 确保组件在语言变化时重新渲染
    react: {
      useSuspense: true,
      bindI18n: 'languageChanged loaded',
      bindI18nStore: 'added removed',
      transEmptyNodeValue: '',
    }
  });

// 处理语言启动和变化时的回调
i18n.on('initialized', () => {
  console.log('i18n initialized with language:', i18n.language);
});

i18n.on('languageChanged', (lng) => {
  console.log('Language changed to:', lng);
  document.documentElement.lang = lng; // 更新HTML标签的lang属性
});

// 导出语言切换功能
export const changeLanguage = (lng) => {
  console.log('Changing language to:', lng);
  return i18n.changeLanguage(lng);
};

export default i18n; 
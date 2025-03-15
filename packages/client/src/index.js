import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';

// 导入i18n，这会触发初始化
import './i18n';

// 为React Router v7的迁移设置环境变量
// 详情: https://reactrouter.com/en/main/upgrading/v6#v7-flags
// 注意：React Router的future标志需要在router实例创建时配置，而不是通过全局导入
// 这些警告不会影响功能，可以忽略或在应用中对router实例进行配置

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals(); 
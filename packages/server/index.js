const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
require('dotenv').config();

// 导入路由
const wireguardRoutes = require('./routes/wireguard');
const routerOSRoutes = require('./routes/routeros');
const settingsRoutes = require('./routes/settings');
const dashboardRoutes = require('./routes/dashboard');

// 导入数据库配置和模型
const db = require('./config/database');
const WireguardConfig = require('./models/WireguardConfig');
const WireguardPeer = require('./models/WireguardPeer');

// 测试数据库连接
db.authenticate()
  .then(() => console.log('数据库连接成功'))
  .catch(err => console.error('数据库连接失败:', err));

// 同步数据库模型，但不修改现有表结构
db.sync()  // 移除 alter: true 参数，避免修改现有表结构
  .then(() => console.log('数据库表同步完成'))
  .catch(err => console.error('数据库表同步失败:', err));

// 初始化应用
const app = express();
const PORT = process.env.PORT || 5001;

// 中间件
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// API路由
app.use('/api/wireguard', wireguardRoutes);
app.use('/api/routeros', routerOSRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/dashboard', dashboardRoutes);

// 如果在生产环境，提供静态文件
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../../packages/client/build')));
  
  app.get('*', (req, res) => {
    res.sendFile(path.resolve(__dirname, '../../packages/client', 'build', 'index.html'));
  });
}

// 错误处理中间件
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: '服务器错误', error: process.env.NODE_ENV === 'development' ? err.message : {} });
});

// 启动服务器
app.listen(PORT, () => {
  console.log(`服务器运行在端口: ${PORT}`);
}); 
const sequelize = require('./config/database');
const WireguardPeer = require('./models/WireguardPeer');
const WireguardConfig = require('./models/WireguardConfig');

(async () => {
  try {
    console.log('正在更新数据库模型...');
    
    // 警告：这将删除现有的所有数据，仅用于开发环境
    // 在生产环境中，应该使用迁移脚本而不是强制同步
    await sequelize.sync({ force: true });
    
    console.log('数据库更新成功！');
    process.exit(0);
  } catch (error) {
    console.error('更新数据库时出错:', error);
    process.exit(1);
  }
})(); 
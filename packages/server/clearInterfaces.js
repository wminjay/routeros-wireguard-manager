const WireguardConfig = require('./models/WireguardConfig');
const WireguardPeer = require('./models/WireguardPeer');

async function clearInterfaces() {
  try {
    console.log('开始清空关联的WireguardPeer表...');
    
    // 先删除所有对等点，因为它们与接口有外键关系
    await WireguardPeer.destroy({ 
      where: {},
      truncate: true
    });
    
    console.log('成功清空了WireguardPeer表');
    
    console.log('开始清空WireguardConfig表...');
    
    // 删除所有接口
    await WireguardConfig.destroy({ 
      where: {},
      truncate: true
    });
    
    console.log('成功清空了WireguardConfig表');
    
    process.exit(0);
  } catch (error) {
    console.error('清空表失败:', error);
    process.exit(1);
  }
}

clearInterfaces(); 
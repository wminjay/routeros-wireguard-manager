const WireguardPeer = require('./models/WireguardPeer');

async function clearPeers() {
  try {
    console.log('开始清空WireguardPeer表...');
    
    // 删除所有对等点
    const count = await WireguardPeer.destroy({ 
      where: {},
      truncate: true
    });
    
    console.log(`成功清空了WireguardPeer表，删除了所有记录。`);
    
    process.exit(0);
  } catch (error) {
    console.error('清空WireguardPeer表失败:', error);
    process.exit(1);
  }
}

clearPeers(); 
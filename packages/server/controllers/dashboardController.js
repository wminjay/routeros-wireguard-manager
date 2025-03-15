const routerOSController = require('./routerOSController');
const WireguardConfig = require('../models/WireguardConfig');
const WireguardPeer = require('../models/WireguardPeer');
const { Sequelize } = require('sequelize');

/**
 * 获取仪表盘数据
 * @route GET /api/dashboard
 */
exports.getDashboardData = async (req, res) => {
  try {
    // 同时获取RouterOS的状态、资源和接口信息
    const [routerStatus, resources, interfaces, wgConfigs, wgPeers] = await Promise.all([
      routerOSController.getStatusData(), // 调用现有的获取状态方法
      routerOSController.getResourcesData(), // 调用现有的获取资源方法
      routerOSController.getInterfacesData(), // 调用现有的获取接口方法
      WireguardConfig.findAll(), // 获取所有WireGuard配置
      WireguardPeer.findAll({
        include: [{ model: WireguardConfig }], // 包含接口信息
        order: [['lastHandshake', 'DESC']] // 按最后握手时间降序排序
      }) // 获取所有WireGuard对等点
    ]);

    // 处理最近的对等点数据 (取前5个最近有活动的对等点)
    const recentPeers = wgPeers
      .filter(peer => peer.lastHandshake !== null) // 只取有过握手的对等点
      .slice(0, 5) // 取前5个
      .map(peer => ({
        id: peer.id,
        name: peer.name || '未命名对等点',
        allowedIPs: peer.allowedIPs,
        enabled: peer.enabled,
        lastHandshake: peer.lastHandshake,
        interfaceName: peer.WireguardConfig ? peer.WireguardConfig.name : '未知接口',
        wireguardInterfaceId: peer.wireguardConfigId
      }));
    
    // 如果最近活跃的对等点不足5个，补充几个最新创建的对等点
    if (recentPeers.length < 5) {
      const otherPeers = wgPeers
        .filter(peer => !recentPeers.some(rp => rp.id === peer.id)) // 排除已添加的对等点
        .slice(0, 5 - recentPeers.length) // 只取需要的数量
        .map(peer => ({
          id: peer.id,
          name: peer.name || '未命名对等点',
          allowedIPs: peer.allowedIPs,
          enabled: peer.enabled,
          lastHandshake: peer.lastHandshake,
          interfaceName: peer.WireguardConfig ? peer.WireguardConfig.name : '未知接口',
          wireguardInterfaceId: peer.wireguardConfigId
        }));
      
      // 合并两个数组
      recentPeers.push(...otherPeers);
    }

    // 构建仪表盘响应数据
    const dashboardData = {
      routerStatus: {
        connected: routerStatus.success,
        ...routerStatus
      },
      resources: resources.success ? resources.resources : null,
      interfaces: interfaces.success ? interfaces.interfaces : [],
      interfaceCount: wgConfigs.length, // WireGuard接口总数
      peerCount: wgPeers.length, // WireGuard对等点总数
      stats: {
        totalInterfaces: interfaces.success ? interfaces.interfaces.length : 0,
        activeInterfaces: interfaces.success 
          ? interfaces.interfaces.filter(intf => intf.disabled === 'false').length 
          : 0,
        wireguardInterfaces: wgConfigs.length, 
        wireguardPeers: wgPeers.length,
        recentPeers: recentPeers // 添加最近的对等点数据
      },
      // 添加配置和对等点的详细信息，供前端显示
      wireguardConfigs: wgConfigs,
      wireguardPeers: wgPeers
    };

    // 返回仪表盘数据
    res.json(dashboardData);
  } catch (error) {
    console.error('获取仪表盘数据失败:', error);
    res.status(500).json({
      success: false,
      message: '获取仪表盘数据失败',
      error: error.message
    });
  }
}; 
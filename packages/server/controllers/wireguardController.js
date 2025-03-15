/**
 * WireGuard控制器
 * 处理WireGuard配置管理的核心功能
 */
const { validationResult } = require('express-validator');
const WireguardConfig = require('../models/WireguardConfig');
const WireguardPeer = require('../models/WireguardPeer');
const wireguardTools = require('../utils/wireguardTools');
const routerOSTools = require('../utils/routerOSTools');
const fs = require('fs');
const path = require('path');
const os = require('os');
const Setting = require('../models/Setting');
const sequelize = require('../config/database');
const { Sequelize } = require('sequelize');

// 获取设置函数，同时支持文件和数据库两种方式
const getAppSettings = async () => {
  try {
    // 首先尝试从数据库读取设置
    const settings = await Setting.findAll();
    
    if (settings && settings.length > 0) {
      // 转换为对象格式
      const settingsObj = {};
      settings.forEach(setting => {
        try {
          // 尝试解析JSON值
          settingsObj[setting.key] = JSON.parse(setting.value);
        } catch (e) {
          // 如果不是JSON，则直接使用原始值
          settingsObj[setting.key] = setting.value;
        }
      });
      
      return settingsObj;
    } else {
      // 如果数据库没有设置，则从文件中读取（兼容旧版本）
      const APP_SETTINGS_PATH = path.resolve(process.cwd(), 'app-settings.json');
      if (fs.existsSync(APP_SETTINGS_PATH)) {
        const data = fs.readFileSync(APP_SETTINGS_PATH, 'utf8');
        return JSON.parse(data);
      }
    }
    
    return {};
  } catch (error) {
    console.error('读取应用设置失败:', error);
    // 出错时尝试从文件读取
    try {
      const APP_SETTINGS_PATH = path.resolve(process.cwd(), 'app-settings.json');
      if (fs.existsSync(APP_SETTINGS_PATH)) {
        const data = fs.readFileSync(APP_SETTINGS_PATH, 'utf8');
        return JSON.parse(data);
      }
    } catch (e) {
      console.error('从文件读取设置也失败:', e);
    }
    return {};
  }
};

/**
 * 获取所有WireGuard接口
 * @route GET /api/wireguard/interfaces
 */
exports.getAllInterfaces = async (req, res) => {
  try {
    // 从数据库获取所有WireGuard接口配置
    const interfaces = await WireguardConfig.findAll();
    
    // 获取每个接口的对等点数量
    const result = await Promise.all(interfaces.map(async (iface) => {
      const peerCount = await WireguardPeer.count({
        where: { wireguardConfigId: iface.id }
      });
      
      // 转换为普通对象以便添加新属性
      const interfaceObj = iface.toJSON();
      interfaceObj.peerCount = peerCount;
      
      return interfaceObj;
    }));
    
    res.json(result);
  } catch (error) {
    console.error('获取WireGuard接口失败:', error);
    res.status(500).json({ message: '获取WireGuard接口失败', error: error.message });
  }
};

/**
 * 获取单个WireGuard接口
 * @route GET /api/wireguard/interfaces/:id
 */
exports.getInterfaceById = async (req, res) => {
  // 验证请求参数
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  
  try {
    const { id } = req.params;
    
    // 从数据库获取接口配置
    const interfaceConfig = await WireguardConfig.findByPk(id, {
      include: [{ model: WireguardPeer }]
    });
    
    if (!interfaceConfig) {
      return res.status(404).json({ message: '未找到WireGuard接口' });
    }
    
    // 如果接口没有地址，尝试从RouterOS获取
    if (!interfaceConfig.address) {
      try {
        // 从RouterOS获取接口
        const routerOSInterfaces = await routerOSTools.getWireguardInterfaces();
        const routerOSInterface = routerOSInterfaces.find(iface => iface.name === interfaceConfig.interfaceName);
        
        if (routerOSInterface && routerOSInterface.address) {
          // 更新数据库中的地址
          await interfaceConfig.update({ address: routerOSInterface.address });
          interfaceConfig.address = routerOSInterface.address;
        }
      } catch (error) {
        console.warn('从RouterOS获取接口地址失败:', error);
      }
    }
    
    res.json(interfaceConfig);
  } catch (error) {
    console.error('获取WireGuard接口失败:', error);
    res.status(500).json({ message: '获取WireGuard接口失败', error: error.message });
  }
};

/**
 * 创建WireGuard接口
 * @route POST /api/wireguard/interfaces
 */
exports.createInterface = async (req, res) => {
  // 验证请求参数
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  
  try {
    const { name, interfaceName, listenPort, address, mtu, comment, enabled } = req.body;
    
    // 如果interfaceName未提供，使用name作为替代
    // 并移除任何可能导致RouterOS命名冲突的特殊字符
    const actualInterfaceName = interfaceName || name.replace(/[^a-zA-Z0-9_-]/g, '_');
    
    console.log('创建WireGuard接口:', { 
      name, 
      actualInterfaceName, 
      listenPort, 
      address, 
      mtu, 
      enabled, 
      comment 
    });
    
    // 生成WireGuard密钥对
    const { privateKey, publicKey } = wireguardTools.generateKeyPair();
    
    // 创建接口配置对象
    const configData = {
      name,
      interfaceName: actualInterfaceName,
      privateKey,
      publicKey,
      listenPort,
      mtu: mtu || 1420,
      comment: comment || '',
      enabled: enabled !== undefined ? enabled : true,
      address
    };
    
    // 在RouterOS中创建WireGuard接口
    await routerOSTools.createWireguardInterface({
      ...configData,
      address
    });
    
    // 在数据库中保存接口配置
    const interfaceConfig = await WireguardConfig.create(configData);
    
    res.status(201).json({
      message: 'WireGuard接口创建成功',
      interface: interfaceConfig
    });
  } catch (error) {
    console.error('创建WireGuard接口失败:', error);
    res.status(500).json({ message: '创建WireGuard接口失败', error: error.message });
  }
};

/**
 * 更新WireGuard接口
 * @route PUT /api/wireguard/interfaces/:id
 */
exports.updateInterface = async (req, res) => {
  // 验证请求参数
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  
  try {
    const { id } = req.params;
    const { name, listenPort, mtu, enabled, comment, address } = req.body;
    
    // 从数据库获取接口配置
    const interfaceConfig = await WireguardConfig.findByPk(id);
    
    if (!interfaceConfig) {
      return res.status(404).json({ message: '未找到WireGuard接口' });
    }
    
    // 在RouterOS中更新WireGuard接口
    await routerOSTools.getWireguardInterfaces()
      .then(interfaces => {
        const routerOSInterface = interfaces.find(
          iface => iface.name === interfaceConfig.interfaceName
        );
        
        if (routerOSInterface) {
          return routerOSTools.updateWireguardInterface(routerOSInterface['.id'], {
            listenPort: listenPort,
            mtu: mtu,
            enabled: enabled,
            comment: comment,
            address: address,
            interfaceName: interfaceConfig.interfaceName
          });
        } else {
          throw new Error('在RouterOS中未找到对应的WireGuard接口');
        }
      });
    
    // 更新数据库中的接口配置
    await interfaceConfig.update({
      name: name || interfaceConfig.name,
      listenPort: listenPort || interfaceConfig.listenPort,
      mtu: mtu || interfaceConfig.mtu,
      enabled: enabled !== undefined ? enabled : interfaceConfig.enabled,
      comment: comment || interfaceConfig.comment,
      address: address || interfaceConfig.address
    });
    
    res.json({
      message: 'WireGuard接口更新成功',
      interface: interfaceConfig
    });
  } catch (error) {
    console.error('更新WireGuard接口失败:', error);
    res.status(500).json({ message: '更新WireGuard接口失败', error: error.message });
  }
};

/**
 * 删除WireGuard接口
 * @route DELETE /api/wireguard/interfaces/:id
 */
exports.deleteInterface = async (req, res) => {
  // 验证请求参数
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  
  try {
    const { id } = req.params;
    
    // 从数据库获取接口配置
    const interfaceConfig = await WireguardConfig.findByPk(id);
    
    if (!interfaceConfig) {
      return res.status(404).json({ message: '未找到WireGuard接口' });
    }
    
    // 在RouterOS中删除WireGuard接口
    await routerOSTools.getWireguardInterfaces()
      .then(interfaces => {
        const routerOSInterface = interfaces.find(
          iface => iface.name === interfaceConfig.interfaceName
        );
        
        if (routerOSInterface) {
          return routerOSTools.deleteWireguardInterface(routerOSInterface['.id']);
        } else {
          console.warn('在RouterOS中未找到对应的WireGuard接口，可能已被手动删除');
        }
      });
    
    // 删除数据库中的关联对等点
    await WireguardPeer.destroy({
      where: { wireguardConfigId: id }
    });
    
    // 删除数据库中的接口配置
    await interfaceConfig.destroy();
    
    res.json({
      message: 'WireGuard接口删除成功'
    });
  } catch (error) {
    console.error('删除WireGuard接口失败:', error);
    res.status(500).json({ message: '删除WireGuard接口失败', error: error.message });
  }
};

/**
 * 获取所有WireGuard对等点
 * @route GET /api/wireguard/peers
 */
exports.getAllPeers = async (req, res) => {
  try {
    // 从数据库获取所有WireGuard对等点
    const peers = await WireguardPeer.findAll({
      include: [{ model: WireguardConfig, attributes: ['name', 'interfaceName'] }]
    });
    
    res.json(peers);
  } catch (error) {
    console.error('获取WireGuard对等点失败:', error);
    res.status(500).json({ message: '获取WireGuard对等点失败', error: error.message });
  }
};

/**
 * 获取单个WireGuard对等点
 * @route GET /api/wireguard/peers/:id
 */
exports.getPeerById = async (req, res) => {
  try {
    const { id } = req.params;
    const peer = await WireguardPeer.findByPk(id, {
      include: {
        model: WireguardConfig,
        attributes: ['name', 'id']
      }
    });
    
    if (!peer) {
      return res.status(404).json({ 
        message: '找不到指定的对等点',
        code: 'PEER_NOT_FOUND'
      });
    }
    
    res.json(peer);
  } catch (err) {
    console.error('获取对等点详情错误:', err);
    res.status(500).json({ 
      message: '获取对等点详情失败',
      code: 'SERVER_ERROR',
      error: err.message
    });
  }
};

/**
 * 创建WireGuard对等点
 * @route POST /api/wireguard/peers
 */
exports.createPeer = async (req, res) => {
  // 验证请求参数
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  
  try {
    const {
      name,
      wireguardConfigId,
      publicKey,
      allowedIPs,
      endpoint,
      persistentKeepalive,
      generateKeyPair: shouldGenerateKeyPair,
      generatePresharedKey: shouldGeneratePresharedKey,
      comment
    } = req.body;
    
    // 从数据库获取关联的接口配置
    const interfaceConfig = await WireguardConfig.findByPk(wireguardConfigId);
    
    if (!interfaceConfig) {
      return res.status(404).json({ message: '未找到关联的WireGuard接口' });
    }
    
    let peerData = {
      name,
      wireguardConfigId,
      allowedIPs,
      endpoint: endpoint || '',
      persistentKeepalive: persistentKeepalive || 25,
      comment: comment || '',
      enabled: true
    };
    
    // 如果需要生成密钥对
    if (shouldGenerateKeyPair) {
      const keyPair = wireguardTools.generateKeyPair();
      peerData.privateKey = keyPair.privateKey;
      peerData.publicKey = keyPair.publicKey;
    } else if (publicKey) {
      peerData.publicKey = publicKey;
    } else {
      return res.status(400).json({ message: '必须提供公钥或生成新的密钥对' });
    }
    
    // 如果需要生成预共享密钥
    if (shouldGeneratePresharedKey) {
      peerData.presharedKey = wireguardTools.generatePresharedKey();
    }
    
    // 在RouterOS中创建WireGuard对等点
    await routerOSTools.createWireguardPeer({
      interface: interfaceConfig.interfaceName,
      publicKey: peerData.publicKey,
      allowedIPs: peerData.allowedIPs,
      endpoint: peerData.endpoint,
      persistentKeepalive: peerData.persistentKeepalive,
      presharedKey: peerData.presharedKey,
      disabled: !peerData.enabled,
      comment: peerData.comment
    });
    
    // 在数据库中保存对等点
    const peer = await WireguardPeer.create(peerData);
    
    res.status(201).json({
      message: 'WireGuard对等点创建成功',
      peer
    });
  } catch (error) {
    console.error('创建WireGuard对等点失败:', error);
    res.status(500).json({ message: '创建WireGuard对等点失败', error: error.message });
  }
};

/**
 * 更新WireGuard对等点
 * @route PUT /api/wireguard/peers/:id
 */
exports.updatePeer = async (req, res) => {
  // 验证请求参数
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  
  try {
    const { id } = req.params;
    const {
      name,
      allowedIPs,
      endpoint,
      persistentKeepalive,
      enabled,
      comment,
      publicKey,
      privateKey,
      wireguardConfigId
    } = req.body;
    
    // 从数据库获取对等点
    const peer = await WireguardPeer.findByPk(id, {
      include: [{ model: WireguardConfig }]
    });
    
    if (!peer) {
      return res.status(404).json({ message: '未找到WireGuard对等点' });
    }
    
    // 检查是否更改了公钥
    const isPublicKeyChanged = publicKey && publicKey !== peer.publicKey;
    // 检查是否更改了接口
    const isInterfaceChanged = wireguardConfigId && wireguardConfigId !== peer.wireguardConfigId;
    
    // 获取接口信息(现有或新的)
    const interfaceConfig = isInterfaceChanged
      ? await WireguardConfig.findByPk(wireguardConfigId)
      : peer.WireguardConfig;
      
    if (isInterfaceChanged && !interfaceConfig) {
      return res.status(404).json({ message: '未找到选择的WireGuard接口' });
    }
    
    // 检查RouterOS中是否存在该对等点
    const routerOSPeers = await routerOSTools.getWireguardPeers();
    const routerOSPeer = routerOSPeers.find(p => p['public-key'] === peer.publicKey);
    
    // 如果公钥或接口发生变化，需要在RouterOS中删除旧对等点并创建新对等点
    if (isPublicKeyChanged || isInterfaceChanged) {
      console.log('检测到公钥或接口变更，需要重新创建对等点');
      
      // 1. 如果找到旧的对等点，先删除
      if (routerOSPeer) {
        await routerOSTools.deleteWireguardPeer(routerOSPeer['.id']);
        console.log('已删除RouterOS中的旧对等点');
      }
      
      // 2. 创建新的对等点
      await routerOSTools.createWireguardPeer({
        interface: interfaceConfig.interfaceName,
        publicKey: publicKey,
        allowedIPs: allowedIPs || peer.allowedIPs,
        endpoint: endpoint !== undefined ? endpoint : peer.endpoint,
        persistentKeepalive: persistentKeepalive || peer.persistentKeepalive,
        disabled: enabled !== undefined ? !enabled : !peer.enabled,
        comment: comment !== undefined ? comment : peer.comment
      });
      console.log('已在RouterOS中创建新对等点');
    } 
    // 如果只是更新对等点的其他属性
    else if (routerOSPeer) {
      await routerOSTools.updateWireguardPeer(routerOSPeer['.id'], {
        allowedIPs: allowedIPs !== undefined ? allowedIPs : undefined,
        endpoint: endpoint !== undefined ? endpoint : undefined,
        persistentKeepalive: persistentKeepalive !== undefined ? persistentKeepalive : undefined,
        disabled: enabled !== undefined ? !enabled : undefined,
        comment: comment !== undefined ? comment : undefined
      });
      console.log('已在RouterOS中更新对等点属性');
    } else {
      console.warn('在RouterOS中未找到对应的WireGuard对等点，可能已被手动删除');
    }
    
    // 更新数据库中的对等点(正确处理可能为空的字段)
    const updateData = {
      name: name !== undefined ? name : peer.name,
      allowedIPs: allowedIPs !== undefined ? allowedIPs : peer.allowedIPs,
      endpoint: endpoint !== undefined ? endpoint : peer.endpoint,
      persistentKeepalive: persistentKeepalive !== undefined ? persistentKeepalive : peer.persistentKeepalive,
      enabled: enabled !== undefined ? enabled : peer.enabled,
      comment: comment !== undefined ? comment : peer.comment
    };
    
    // 仅当提供了这些字段时才更新
    if (publicKey) updateData.publicKey = publicKey;
    if (privateKey !== undefined) updateData.privateKey = privateKey;
    if (wireguardConfigId) updateData.wireguardConfigId = wireguardConfigId;
    
    console.log('更新数据库中的对等点:', updateData);
    
    await peer.update(updateData);
    
    // 重新加载对等点以获取包含关系的完整数据
    const updatedPeer = await WireguardPeer.findByPk(id, {
      include: [{ model: WireguardConfig }]
    });
    
    res.json({
      message: 'WireGuard对等点更新成功',
      peer: updatedPeer
    });
  } catch (error) {
    console.error('更新WireGuard对等点失败:', error);
    res.status(500).json({ message: '更新WireGuard对等点失败', error: error.message });
  }
};

/**
 * 删除WireGuard对等点
 * @route DELETE /api/wireguard/peers/:id
 */
exports.deletePeer = async (req, res) => {
  // 验证请求参数
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  
  try {
    const { id } = req.params;
    
    // 从数据库获取对等点
    const peer = await WireguardPeer.findByPk(id);
    
    if (!peer) {
      return res.status(404).json({ message: '未找到WireGuard对等点' });
    }
    
    // 在RouterOS中删除WireGuard对等点
    await routerOSTools.getWireguardPeers()
      .then(peers => {
        const routerOSPeer = peers.find(
          p => p['public-key'] === peer.publicKey
        );
        
        if (routerOSPeer) {
          return routerOSTools.deleteWireguardPeer(routerOSPeer['.id']);
        } else {
          console.warn('在RouterOS中未找到对应的WireGuard对等点，可能已被手动删除');
        }
      });
    
    // 删除数据库中的对等点
    await peer.destroy();
    
    res.json({
      message: 'WireGuard对等点删除成功'
    });
  } catch (error) {
    console.error('删除WireGuard对等点失败:', error);
    res.status(500).json({ message: '删除WireGuard对等点失败', error: error.message });
  }
};

/**
 * 导出WireGuard对等点配置
 * @route GET /api/wireguard/peers/:id/config
 */
exports.exportPeerConfig = async (req, res) => {
  // 验证请求参数
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  
  try {
    const { id } = req.params;
    
    // 从数据库获取对等点
    const peer = await WireguardPeer.findByPk(id, {
      include: [{ model: WireguardConfig }]
    });
    
    if (!peer) {
      return res.status(404).json({ message: '未找到WireGuard对等点' });
    }
    
    // 检查是否有私钥
    if (!peer.privateKey) {
      return res.status(400).json({ 
        message: '该对等点没有保存私钥，无法导出完整配置',
        code: 'PEER_NO_PRIVATE_KEY' 
      });
    }
    
    // 检查是否是导入的对等点
    if (peer.isImported) {
      return res.status(400).json({ 
        message: '该对等点是从RouterOS导入的，无法导出有效配置', 
        code: 'IMPORTED_PEER_NO_CONFIG'
      });
    }
    
    // 获取全局设置 - 注意这里改为了await
    const appSettings = await getAppSettings();
    
    // 生成配置文件内容
    const configContent = wireguardTools.generateClientConfig(
      {
        publicKey: peer.WireguardConfig.publicKey,
        listenPort: peer.WireguardConfig.listenPort,
        endpoint: req.query.endpoint || peer.endpoint
      },
      peer,
      {
        // 传递DNS设置和服务器地址设置
        dns: appSettings.defaultDNS || '8.8.8.8, 8.8.4.4',
        serverAddress: appSettings.serverAddress,
        serverPort: appSettings.serverPort
      }
    );
    
    // 保存配置文件（可选）
    const filePath = wireguardTools.saveClientConfig(configContent, `${peer.name}-wireguard`);
    
    // 返回配置内容
    if (req.query.format === 'file') {
      // 提供下载文件
      res.setHeader('Content-Type', 'application/octet-stream');
      res.setHeader('Content-Disposition', `attachment; filename="${peer.name}-wireguard.conf"`);
      return res.download(filePath, `${peer.name}-wireguard.conf`);
    } else {
      // 返回配置内容
      res.json({
        message: 'WireGuard配置导出成功',
        config: configContent,
        filePath
      });
    }
  } catch (error) {
    console.error('导出WireGuard配置失败:', error);
    res.status(500).json({ message: '导出WireGuard配置失败', error: error.message });
  }
};

/**
 * 更新所有WireGuard对等点的状态信息
 * @route POST /api/wireguard/peers/status
 */
exports.updatePeersStatus = async (req, res) => {
  try {
    // 从RouterOS获取对等点状态
    const peerStatus = await routerOSTools.getWireguardPeerStatus();
    console.log('从RouterOS获取到的对等点状态:', peerStatus);
    
    // 从数据库获取所有对等点
    const dbPeers = await WireguardPeer.findAll({
      include: [{ model: WireguardConfig }]
    });
    
    // 创建一个公钥到对等点的映射
    const peerMap = {};
    dbPeers.forEach(peer => {
      peerMap[peer.publicKey] = peer;
    });
    
    // 更新数据库中的对等点状态
    const updatedPeers = [];
    for (const status of peerStatus) {
      const publicKey = status['public-key'];
      const peer = peerMap[publicKey];
      
      if (peer && status['last-handshake']) {
        // 使用parseRouterOSTime函数解析RouterOS格式的时间
        const lastHandshake = routerOSTools.parseRouterOSTime(status['last-handshake']);
        
        if (lastHandshake) {
          // 更新对等点的最后握手时间
          await peer.update({
            lastHandshake: lastHandshake
          });
          
          updatedPeers.push({
            id: peer.id,
            name: peer.name,
            publicKey: peer.publicKey,
            lastHandshake: lastHandshake,
            rx: status.rx,
            tx: status.tx
          });
        }
      }
    }
    
    // 返回更新结果
    res.json({
      message: '对等点状态更新成功',
      total: peerStatus.length,
      updated: updatedPeers.length,
      peers: updatedPeers
    });
  } catch (error) {
    console.error('更新对等点状态失败:', error);
    res.status(500).json({ message: '更新对等点状态失败', error: error.message });
  }
};

/**
 * 更新特定接口的WireGuard对等点状态信息
 * @route POST /api/wireguard/interfaces/:id/update-peers-status
 */
exports.updateInterfacePeersStatus = async (req, res) => {
  try {
    const { id } = req.params;
    
    // 验证接口存在
    const wireguardInterface = await WireguardConfig.findByPk(id);
    if (!wireguardInterface) {
      return res.status(404).json({ message: '找不到指定的WireGuard接口' });
    }
    
    // 从RouterOS获取对等点状态
    const peerStatus = await routerOSTools.getWireguardPeerStatus();
    console.log('从RouterOS获取到的对等点状态:', peerStatus);
    
    // 从数据库获取指定接口的所有对等点
    const dbPeers = await WireguardPeer.findAll({
      where: { wireguardConfigId: id }
    });
    
    // 创建一个公钥到对等点的映射
    const peerMap = {};
    dbPeers.forEach(peer => {
      peerMap[peer.publicKey] = peer;
    });
    
    // 更新数据库中的对等点状态
    const updatedPeers = [];
    for (const status of peerStatus) {
      const publicKey = status['public-key'];
      const peer = peerMap[publicKey];
      
      if (peer && status['last-handshake']) {
        // 使用parseRouterOSTime函数解析RouterOS格式的时间
        const lastHandshake = routerOSTools.parseRouterOSTime(status['last-handshake']);
        
        if (lastHandshake) {
          // 更新对等点的最后握手时间
          await peer.update({
            lastHandshake: lastHandshake
          });
          
          updatedPeers.push({
            id: peer.id,
            name: peer.name,
            publicKey: peer.publicKey,
            lastHandshake: lastHandshake,
            rx: status.rx,
            tx: status.tx
          });
        }
      }
    }
    
    // 返回更新结果
    res.json({
      message: '接口对等点状态更新成功',
      interfaceId: id,
      updated: updatedPeers.length,
      peers: updatedPeers
    });
  } catch (error) {
    console.error('更新接口对等点状态失败:', error);
    res.status(500).json({ message: '更新接口对等点状态失败', error: error.message });
  }
};

/**
 * 生成WireGuard密钥对
 * @route GET /api/wireguard/generate-keys
 */
exports.generateKeys = async (req, res) => {
  try {
    const keyPair = wireguardTools.generateKeyPair();
    res.json(keyPair);
  } catch (error) {
    console.error('生成WireGuard密钥对失败:', error);
    res.status(500).json({ message: '生成WireGuard密钥对失败', error: error.message });
  }
};

/**
 * 快速设置WireGuard（创建接口和对等点）
 * @route POST /api/wireguard/quicksetup
 */
exports.quickSetup = async (req, res) => {
  // 验证请求参数
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  
  try {
    const {
      interfaceName,
      name: interfaceName_display,
      listenPort,
      address,
      mtu,
      peerName,
      allowedIPs,
      persistentKeepalive,
      endpoint,
      comment,
      useExistingInterface,
      selectedInterfaceId
    } = req.body;
    
    let interfaceConfig;
    let interfaceKeys;
    
    // 根据是否使用现有接口进行不同处理
    if (useExistingInterface === 'existing' && selectedInterfaceId) {
      // 1. 使用现有接口
      console.log('使用现有接口，ID:', selectedInterfaceId);
      
      // 从数据库获取现有接口信息
      interfaceConfig = await WireguardConfig.findByPk(selectedInterfaceId);
      
      if (!interfaceConfig) {
        return res.status(404).json({ message: '未找到指定的WireGuard接口' });
      }
      
      // 获取公钥和私钥信息
      interfaceKeys = {
        publicKey: interfaceConfig.publicKey,
        privateKey: interfaceConfig.privateKey
      };
      
      console.log('成功获取现有接口:', interfaceConfig.name);
      
    } else {
      // 2. 创建新接口
      console.log('创建新接口');
      
      // 生成接口密钥对
      interfaceKeys = wireguardTools.generateKeyPair();
      
      // 创建接口配置对象
      const interfaceData = {
        name: interfaceName_display || `WireGuard ${interfaceName}`,
        interfaceName,
        privateKey: interfaceKeys.privateKey,
        publicKey: interfaceKeys.publicKey,
        listenPort,
        mtu: mtu || 1420,
        address,
        comment: comment || '',
        enabled: true
      };
      
      // 在RouterOS中创建WireGuard接口
      await routerOSTools.createWireguardInterface(interfaceData);
      
      // 在数据库中保存接口配置
      interfaceConfig = await WireguardConfig.create(interfaceData);
      console.log('新接口创建成功');
    }
    
    // 后续步骤：创建对等点
    
    // 1. 生成对等点密钥对
    const peerKeys = wireguardTools.generateKeyPair();
    
    // 2. 生成预共享密钥
    const presharedKey = wireguardTools.generatePresharedKey();
    
    // 3. 创建对等点配置对象
    const peerData = {
      name: peerName,
      wireguardConfigId: interfaceConfig.id,
      publicKey: peerKeys.publicKey,
      privateKey: peerKeys.privateKey,
      presharedKey,
      allowedIPs,
      endpoint: endpoint || '',
      persistentKeepalive: persistentKeepalive || 25,
      comment: comment || '',
      enabled: true
    };
    
    // 4. 在RouterOS中创建WireGuard对等点
    await routerOSTools.createWireguardPeer({
      interface: interfaceConfig.interfaceName,
      publicKey: peerData.publicKey,
      allowedIPs: peerData.allowedIPs,
      endpoint: peerData.endpoint,
      persistentKeepalive: peerData.persistentKeepalive,
      presharedKey: peerData.presharedKey,
      disabled: !peerData.enabled,
      comment: peerData.comment
    });
    
    // 5. 在数据库中保存对等点
    const peer = await WireguardPeer.create(peerData);
    
    // 6. 生成客户端配置
    const configContent = wireguardTools.generateClientConfig(
      {
        publicKey: interfaceKeys.publicKey,
        listenPort: interfaceConfig.listenPort,
        endpoint: req.body.routerIp
      },
      {
        privateKey: peerKeys.privateKey,
        presharedKey,
        allowedIPs,
        persistentKeepalive: persistentKeepalive || 25
      }
    );
    
    // 7. 保存配置文件
    const filePath = wireguardTools.saveClientConfig(configContent, `${peerName}-wireguard`);
    
    res.status(201).json({
      message: 'WireGuard快速设置成功',
      interface: interfaceConfig,
      peer,
      config: {
        content: configContent,
        filePath
      }
    });
  } catch (error) {
    console.error('WireGuard快速设置失败:', error);
    res.status(500).json({ message: 'WireGuard快速设置失败', error: error.message });
  }
};

/**
 * 同步RouterOS中的WireGuard接口到本地数据库
 * @route POST /api/wireguard/sync
 */
exports.syncInterfaces = async (req, res) => {
  try {
    // 从RouterOS获取所有WireGuard接口
    const routerOSInterfaces = await routerOSTools.getWireguardInterfaces();
    console.log('从RouterOS获取到的接口:', routerOSInterfaces);
    
    // 从数据库获取所有已知的WireGuard接口
    const dbInterfaces = await WireguardConfig.findAll();
    const dbInterfaceNames = dbInterfaces.map(i => i.interfaceName);
    
    // 找出RouterOS中存在但数据库中不存在的接口
    const newInterfaces = routerOSInterfaces.filter(
      iface => !dbInterfaceNames.includes(iface.name)
    );
    
    console.log('需要导入的接口数量:', newInterfaces.length);
    
    // 导入新接口到数据库
    const importedInterfaces = [];
    for (const iface of newInterfaces) {
      // 为导入的接口生成一个临时私钥（RouterOS不会返回私钥）
      // 注意：这个私钥仅用于数据库存储，无法用于加密通信
      const { privateKey, publicKey } = wireguardTools.generateKeyPair();
      
      const importedInterface = await WireguardConfig.create({
        name: iface.name,
        interfaceName: iface.name,
        privateKey: privateKey, // 临时私钥
        publicKey: iface['public-key'] || publicKey, // 使用RouterOS返回的公钥或临时生成的
        listenPort: parseInt(iface['listen-port'] || '51820'),
        mtu: parseInt(iface.mtu || '1420'),
        enabled: iface.disabled !== 'true',
        comment: iface.comment || '', // 不再添加任何时间信息
        isImported: true // 标记为导入的接口
      });
      
      importedInterfaces.push(importedInterface);
    }
    
    // 返回同步结果
    res.json({
      message: '同步完成',
      total: routerOSInterfaces.length,
      existing: dbInterfaceNames.length,
      imported: importedInterfaces.length,
      interfaces: importedInterfaces
    });
  } catch (error) {
    console.error('同步WireGuard接口失败:', error);
    res.status(500).json({ message: '同步WireGuard接口失败', error: error.message });
  }
};

/**
 * 同步RouterOS中的WireGuard对等点到本地数据库
 * @route POST /api/wireguard/peers/sync
 */
exports.syncPeers = async (req, res) => {
  try {
    // 从RouterOS获取所有WireGuard对等点
    const routerOSPeers = await routerOSTools.getWireguardPeers();
    console.log('从RouterOS获取到的对等点:', routerOSPeers);
    
    // 从数据库获取所有已知的WireGuard接口
    const interfaces = await WireguardConfig.findAll();
    
    // 创建接口名称到ID的映射
    const interfaceMap = {};
    interfaces.forEach(iface => {
      interfaceMap[iface.interfaceName] = iface.id;
    });
    
    console.log('接口映射:', interfaceMap);
    
    // 从数据库获取所有已知的WireGuard对等点
    const dbPeers = await WireguardPeer.findAll();
    
    // 创建公钥+接口ID的组合键到对等点的映射，用于检查特定接口上的对等点是否存在
    const peerCombinedKeyMap = {};
    dbPeers.forEach(peer => {
      const combinedKey = `${peer.publicKey}:${peer.wireguardConfigId}`;
      peerCombinedKeyMap[combinedKey] = peer;
    });
    
    // 找出RouterOS中存在但数据库中不存在的对等点，或需要更新的对等点
    const newPeers = [];
    const updatedPeers = [];
    
    for (const peer of routerOSPeers) {
      // 找到对应的接口ID
      const interfaceName = peer.interface;
      const wireguardConfigId = interfaceMap[interfaceName];
      
      if (!wireguardConfigId) {
        console.warn(`找不到接口 "${interfaceName}" 的ID，跳过对等点`);
        continue;
      }
      
      // 创建组合键
      const combinedKey = `${peer['public-key']}:${wireguardConfigId}`;
      
      if (!peerCombinedKeyMap[combinedKey]) {
        // 如果数据库中不存在此公钥+接口组合的对等点，则标记为新对等点
        newPeers.push({...peer, wireguardConfigId});
      } else {
        // 如果数据库中已经存在此组合的对等点，则可能需要更新
        updatedPeers.push({...peer, wireguardConfigId, existingPeer: peerCombinedKeyMap[combinedKey]});
      }
    }
    
    console.log('需要导入的对等点数量:', newPeers.length);
    console.log('需要更新的对等点数量:', updatedPeers.length);
    
    // 导入新对等点到数据库
    const importedPeers = [];
    for (const peer of newPeers) {
      // 为导入的对等点设置空私钥
      const privateKey = null; // 不再使用FAKE_前缀
      
      try {
        // 打印将要插入的数据，帮助诊断
        const peerData = {
          name: peer.comment ? peer.comment : `Peer ${peer['public-key'].slice(0, 8)}...`,
          wireguardConfigId: peer.wireguardConfigId,
          publicKey: peer['public-key'],
          privateKey: privateKey, // 使用null作为私钥值
          allowedIPs: peer['allowed-address'] || '0.0.0.0/0',
          endpoint: peer.endpoint || '',
          persistentKeepalive: peer['persistent-keepalive'] ? parseInt(peer['persistent-keepalive']) : 25,
          enabled: peer.disabled !== 'true',
          comment: peer.comment || '',
          isImported: true // 标记为导入的对等点
        };
        
        // 如果有last-handshake字段，使用parseRouterOSTime函数解析
        if (peer['last-handshake']) {
          peerData.lastHandshake = routerOSTools.parseRouterOSTime(peer['last-handshake']);
        }
        
        console.log(`尝试导入对等点: ${peer['public-key']} 到接口 ${peer.interface} (ID: ${peer.wireguardConfigId})`);
        
        const importedPeer = await WireguardPeer.create(peerData);
        
        importedPeers.push(importedPeer);
      } catch (err) {
        // 详细记录错误信息
        console.error(`导入对等点 ${peer['public-key']} 失败:`, err.message);
        if (err.name === 'SequelizeValidationError') {
          err.errors.forEach(validationError => {
            console.error(`- 验证错误: ${validationError.path} - ${validationError.message}`);
          });
        } else if (err.name === 'SequelizeForeignKeyConstraintError') {
          console.error(`- 外键约束错误: 接口ID ${peer.wireguardConfigId} 不存在`);
        } else if (err.name === 'SequelizeUniqueConstraintError') {
          console.error(`- 唯一约束错误: ${err.fields ? err.fields.join(', ') : JSON.stringify(err)}`);
        }
      }
    }
    
    // 如果需要，还可以更新已有的对等点信息
    const updatedPeerRecords = [];
    for (const peer of updatedPeers) {
      try {
        // 更新对等点的一些信息
        const updateData = {
          allowedIPs: peer['allowed-address'] || peer.existingPeer.allowedIPs,
          endpoint: peer.endpoint || peer.existingPeer.endpoint,
          persistentKeepalive: peer['persistent-keepalive'] ? parseInt(peer['persistent-keepalive']) : peer.existingPeer.persistentKeepalive,
          enabled: peer.disabled !== 'true',
          // 如果RouterOS中有评论但本地没有，则更新本地评论
          comment: peer.comment || peer.existingPeer.comment
        };
        
        // 如果有last-handshake字段，使用parseRouterOSTime函数解析
        if (peer['last-handshake']) {
          updateData.lastHandshake = routerOSTools.parseRouterOSTime(peer['last-handshake']);
        }
        
        await peer.existingPeer.update(updateData);
        
        updatedPeerRecords.push(peer.existingPeer);
      } catch (err) {
        console.error(`更新对等点 ${peer['public-key']} 失败:`, err.message);
        if (err.name === 'SequelizeValidationError') {
          err.errors.forEach(validationError => {
            console.error(`- 验证错误: ${validationError.path} - ${validationError.message}`);
          });
        }
      }
    }
    
    // 返回同步结果
    res.json({
      message: '同步完成',
      total: routerOSPeers.length,
      existing: dbPeers.length,
      imported: importedPeers.length,
      updated: updatedPeerRecords.length,
      peers: importedPeers
    });
  } catch (error) {
    console.error('同步WireGuard对等点失败:', error);
    res.status(500).json({ message: '同步WireGuard对等点失败', error: error.message });
  }
};

/**
 * 为特定接口提供建议的IP地址
 * @route GET /api/wireguard/interfaces/:id/suggest-ip
 */
exports.suggestIP = async (req, res) => {
  // 验证请求参数
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  
  try {
    const { id } = req.params;
    
    // 获取接口信息
    const interfaceConfig = await WireguardConfig.findByPk(id);
    
    if (!interfaceConfig) {
      return res.status(404).json({ message: '未找到WireGuard接口' });
    }
    
    console.log('接口配置:', JSON.stringify(interfaceConfig, null, 2));
    
    // 获取接口的地址信息
    let interfaceAddress = interfaceConfig.address;
    console.log('数据库中的接口地址:', interfaceAddress);
    
    // 从RouterOS获取接口信息，因为可能数据库中没有保存地址
    try {
      console.log('RouterOS连接成功');
      const routerOSInterfaces = await routerOSTools.getWireguardInterfaces();
      const routerOSInterface = routerOSInterfaces.find(
        iface => iface.name === interfaceConfig.interfaceName
      );
      console.log('RouterOS中的接口信息:', routerOSInterface);
      
      // 如果RouterOS中有地址信息但数据库中没有，使用RouterOS中的地址
      if (!interfaceAddress && routerOSInterface && routerOSInterface.address) {
        interfaceAddress = routerOSInterface.address;
        console.log('使用RouterOS中的地址:', interfaceAddress);
        
        // 同时更新数据库中的接口地址
        await interfaceConfig.update({ address: interfaceAddress });
      }
    } catch (routerOSError) {
      console.error('获取RouterOS接口信息失败:', routerOSError);
    }
    
    if (!interfaceAddress) {
      // 尝试从routerOSTools.getInterfaceAddress直接获取地址
      try {
        const address = await routerOSTools.getInterfaceAddress(interfaceConfig.interfaceName);
        if (address) {
          interfaceAddress = address;
          console.log('从IP地址表获取的接口地址:', interfaceAddress);
          
          // 更新数据库中的地址
          await interfaceConfig.update({ address: interfaceAddress });
        }
      } catch (error) {
        console.error('获取接口IP地址失败:', error);
      }
    }
    
    if (!interfaceAddress) {
      // 如果接口没有设置地址，使用默认地址
      console.log('接口没有设置地址，使用默认地址');
      const suggestedIP = "10.0.0.2/32";
      return res.json({ suggestedIP });
    }
    
    // 解析接口地址和网络掩码
    const addressParts = interfaceAddress.split('/');
    if (addressParts.length !== 2) {
      // 地址格式不正确，使用默认地址
      console.log('地址格式不正确:', interfaceAddress);
      const suggestedIP = "10.0.0.2/32";
      return res.json({ suggestedIP });
    }
    
    const ipAddress = addressParts[0];
    const cidr = parseInt(addressParts[1], 10);
    
    // 检查IP格式是否正确
    const ipParts = ipAddress.split('.');
    if (ipParts.length !== 4) {
      // 地址格式不正确，使用默认地址
      console.log('IP格式不正确:', ipAddress);
      const suggestedIP = "10.0.0.2/32";
      return res.json({ suggestedIP });
    }
    
    // 使用前三段作为网络部分
    const network = ipParts.slice(0, 3).join('.');
    
    // 获取该接口下已有的对等点
    const peers = await WireguardPeer.findAll({
      where: { wireguardConfigId: id }
    });
    
    // 提取所有已使用的IP地址
    const usedIPs = new Set();
    peers.forEach(peer => {
      const peerIPs = peer.allowedIPs.split(',').map(ip => ip.trim());
      peerIPs.forEach(ip => {
        const singleIP = ip.split('/')[0]; // 去掉CIDR部分
        usedIPs.add(singleIP);
      });
    });
    
    // 从2开始查找可用的IP（1通常保留给接口自身）
    let hostPart = 2;
    while (usedIPs.has(`${network}.${hostPart}`)) {
      hostPart++;
      
      // 防止无限循环和超出有效范围
      if (hostPart > 254) {
        // 如果整个子网都满了，可以考虑使用其他网段或者返回一个警告
        hostPart = Math.floor(Math.random() * 253) + 2; // 随机生成一个2-254之间的数字
        break;
      }
    }
    
    const suggestedIP = `${network}.${hostPart}/32`;
    console.log('基于网络计算建议的IP:', suggestedIP);
    
    res.json({ suggestedIP });
  } catch (error) {
    console.error('获取建议IP地址失败:', error);
    res.status(500).json({ message: '获取建议IP地址失败', error: error.message });
  }
};

/**
 * 获取对等点的客户端配置
 * @route GET /api/wireguard/peers/:id/config
 */
exports.getPeerConfig = async (req, res) => {
  try {
    const { id } = req.params;
    
    // 查找对等点
    const peer = await WireguardPeer.findByPk(id, {
      include: [{
        model: WireguardConfig,
        as: 'wireguardConfig'
      }]
    });
    
    if (!peer) {
      return res.status(404).json({ message: 'Peer not found' });
    }
    
    // 检查是否是从RouterOS导入的对等点
    if (peer.isImported) {
      return res.status(400).json({ 
        message: 'Cannot generate configuration for imported peer',
        code: 'IMPORTED_PEER_NO_CONFIG',
        peer: peer
      });
    }
    
    // 如果没有私钥，也无法生成配置
    if (!peer.privateKey) {
      return res.status(400).json({ 
        message: 'Cannot generate configuration for peer without private key',
        code: 'PEER_NO_PRIVATE_KEY'
      });
    }
    
    // 获取全局设置
    const defaultDNSSetting = await Setting.findByPk('defaultDNS');
    const serverAddressSetting = await Setting.findByPk('serverAddress');
    const serverPortSetting = await Setting.findByPk('serverPort');
    
    // 提取设置
    const defaultDNS = defaultDNSSetting ? defaultDNSSetting.value : '';
    const serverAddress = serverAddressSetting ? serverAddressSetting.value : '';
    const serverPort = serverPortSetting ? serverPortSetting.value : '';
    
    // 生成WireGuard客户端配置
    const config = wireguardTools.generateClientConfig({
      clientPrivateKey: peer.privateKey,
      serverPublicKey: peer.wireguardConfig.publicKey,
      serverEndpoint: serverAddress || req.hostname,
      serverPort: serverPort || peer.wireguardConfig.listenPort,
      allowedIPs: peer.allowedIPs,
      persistentKeepalive: peer.persistentKeepalive,
      dns: defaultDNS
    });
    
    // 配置文件名称
    const fileName = `${peer.name.replace(/[^a-zA-Z0-9]/g, '_')}_wg_config.conf`;
    const filePath = path.join(os.tmpdir(), fileName);
    
    // 将配置写入临时文件
    fs.writeFileSync(filePath, config);
    
    // 返回配置内容和文件路径
    res.json({
      message: 'Configuration generated successfully',
      config,
      filePath,
      peer
    });
  } catch (error) {
    console.error('Error generating peer configuration:', error);
    res.status(500).json({ message: 'Failed to generate configuration', error: error.message });
  }
}; 
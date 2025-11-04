/**
 * RouterOS API 工具函数
 * 用于与RouterOS通信，管理WireGuard配置
 */
const { executeCommand } = require('../config/routeros');

/**
 * 获取接口的IP地址
 * @param {string} interfaceName 接口名称
 * @returns {Promise<string|null>} 接口的IP地址，例如：192.168.1.1/24，如果没有找到则返回null
 */
const getInterfaceAddress = async (interfaceName) => {
  try {
    const addresses = await executeCommand('/ip/address/print', {
      '?interface': interfaceName
    });
    
    if (addresses && addresses.length > 0) {
      return addresses[0].address;
    }
    
    return null;
  } catch (error) {
    console.error(`获取接口${interfaceName}的IP地址失败:`, error);
    return null;
  }
};

/**
 * 获取所有WireGuard接口
 * @returns {Promise<Array>} WireGuard接口数组
 */
const getWireguardInterfaces = async () => {
  try {
    console.log('正在尝试获取WireGuard接口列表...');
    const interfaces = await executeCommand('/interface/wireguard/print');
    console.log(`成功获取到${interfaces.length}个WireGuard接口`);
    
    // 为每个接口获取IP地址信息
    for (const iface of interfaces) {
      try {
        iface.address = await getInterfaceAddress(iface.name);
      } catch (addressError) {
        console.warn(`获取接口${iface.name}的IP地址时发生错误:`, addressError);
        iface.address = null;
      }
    }
    
    return interfaces;
  } catch (error) {
    console.error('获取WireGuard接口失败，详细错误信息:', error);
    
    // 提供更具体的错误信息
    let errorMessage = '获取WireGuard接口失败';
    if (error.message) {
      if (error.message.includes('timeout') || error.message.includes('Timeout')) {
        errorMessage += ' - 连接超时，请检查RouterOS设备连接';
      } else if (error.message.includes('login') || error.message.includes('auth')) {
        errorMessage += ' - 认证失败，请检查用户名和密码';
      } else if (error.message.includes('no such path') || error.message.includes('unknown command')) {
        errorMessage += ' - WireGuard模块不可用，请检查RouterOS版本和WireGuard包安装';
      } else if (error.message.includes('permission') || error.message.includes('access')) {
        errorMessage += ' - 权限不足，请确认用户具有interface权限';
      } else {
        errorMessage += ` - ${error.message}`;
      }
    }
    
    throw new Error(errorMessage);
  }
};

/**
 * 创建WireGuard接口
 * @param {Object} config WireGuard接口配置
 * @returns {Promise<Object>} 创建的接口信息
 */
const createWireguardInterface = async (config) => {
  try {
    console.log('使用以下参数创建WireGuard接口:', config);
    
    // 在RouterOS中创建WireGuard接口（不包含密钥参数，先创建接口）
    const params = {
      'name': config.interfaceName,
      'listen-port': config.listenPort.toString(),
      'mtu': (config.mtu || 1420).toString(),
      'disabled': config.enabled ? 'no' : 'yes',
      'comment': config.comment || ''
    };
    
    // 先创建接口
    const response = await executeCommand('/interface/wireguard/add', params);
    console.log('WireGuard接口创建成功，响应:', response);
    
    // 然后尝试设置密钥（单独的API调用）
    try {
      await executeCommand('/interface/wireguard/set', {
        'numbers': config.interfaceName,
        'private-key': config.privateKey
      });
      console.log('成功设置WireGuard私钥');
    } catch (keyError) {
      console.error('设置WireGuard私钥失败，尝试不同的格式:', keyError);
      
      // 尝试使用替代参数格式
      try {
        await executeCommand('/interface/wireguard/set', {
          '.id': config.interfaceName,
          'private-key': config.privateKey
        });
        console.log('使用.id参数成功设置WireGuard私钥');
      } catch (alternativeError) {
        console.error('无法设置WireGuard私钥:', alternativeError);
      }
    }
    
    // 设置IP地址（如果提供）
    if (config.address) {
      try {
        await executeCommand('/ip/address/add', {
          'address': config.address,
          'interface': config.interfaceName
        });
        console.log(`成功为接口${config.interfaceName}设置IP地址${config.address}`);
      } catch (addressError) {
        console.error('设置WireGuard接口IP地址失败:', addressError);
      }
    }
    
    return response;
  } catch (error) {
    console.error('创建WireGuard接口失败:', error);
    throw new Error('创建WireGuard接口失败: ' + error.message);
  }
};

/**
 * 更新WireGuard接口
 * @param {String} id RouterOS接口ID
 * @param {Object} config 更新的配置
 * @returns {Promise<Object>} 更新后的接口信息
 */
const updateWireguardInterface = async (id, config) => {
  try {
    // 构建更新参数对象
    const params = {
      '.id': id
    };
    
    // 只添加要更新的字段
    if (config.listenPort) params['listen-port'] = config.listenPort.toString();
    if (config.mtu) params['mtu'] = config.mtu.toString();
    if (config.publicKey) params['public-key'] = config.publicKey;
    if (config.privateKey) params['private-key'] = config.privateKey;
    if (config.hasOwnProperty('enabled')) params['disabled'] = config.enabled ? 'no' : 'yes';
    if (config.comment) params['comment'] = config.comment;
    
    // 执行更新
    const response = await executeCommand('/interface/wireguard/set', params);
    
    // 如果提供了新地址，则更新地址
    if (config.address && config.interfaceName) {
      // 先检查是否有现有地址
      const addresses = await executeCommand('/ip/address/print', {
        '?interface': config.interfaceName
      });
      
      if (addresses.length > 0) {
        // 更新现有地址
        await executeCommand('/ip/address/set', {
          '.id': addresses[0]['.id'],
          'address': config.address
        });
      } else {
        // 添加新地址
        await executeCommand('/ip/address/add', {
          'address': config.address,
          'interface': config.interfaceName
        });
      }
    }
    
    return response;
  } catch (error) {
    console.error('更新WireGuard接口失败:', error);
    throw new Error('更新WireGuard接口失败: ' + error.message);
  }
};

/**
 * 删除WireGuard接口
 * @param {String} id RouterOS接口ID
 * @returns {Promise<void>}
 */
const deleteWireguardInterface = async (id) => {
  try {
    // 获取接口详情以查找名称
    const interfaces = await executeCommand('/interface/wireguard/print', {
      '?.id': id
    });
    
    if (interfaces.length > 0) {
      const interfaceName = interfaces[0].name;
      
      // 删除关联的IP地址
      const addresses = await executeCommand('/ip/address/print', {
        '?interface': interfaceName
      });
      
      // 删除所有关联的IP地址
      for (const address of addresses) {
        await executeCommand('/ip/address/remove', {
          '.id': address['.id']
        });
      }
      
      // 删除接口
      await executeCommand('/interface/wireguard/remove', {
        '.id': id
      });
    } else {
      throw new Error('未找到指定的WireGuard接口');
    }
  } catch (error) {
    console.error('删除WireGuard接口失败:', error);
    throw new Error('删除WireGuard接口失败: ' + error.message);
  }
};

/**
 * 获取所有WireGuard对等点
 * @returns {Promise<Array>} WireGuard对等点数组
 */
const getWireguardPeers = async () => {
  try {
    // 请求更多字段，包括last-handshake
    const peers = await executeCommand('/interface/wireguard/peers/print', { 
      '.proplist': 'interface,public-key,allowed-address,endpoint,persistent-keepalive,disabled,comment,last-handshake' 
    });
    return peers;
  } catch (error) {
    console.error('获取WireGuard对等点失败:', error);
    throw new Error('获取WireGuard对等点失败: ' + error.message);
  }
};

/**
 * 获取WireGuard对等点状态
 * @returns {Promise<Array>} WireGuard对等点状态数组，包含last-handshake等信息
 */
const getWireguardPeerStatus = async () => {
  try {
    // 从/interface/wireguard/peers print获取详细状态
    const peersStatus = await executeCommand('/interface/wireguard/peers/print', { '.proplist': 'public-key,interface,rx,tx,last-handshake' });
    return peersStatus;
  } catch (error) {
    console.error('获取WireGuard对等点状态失败:', error);
    throw new Error('获取WireGuard对等点状态失败: ' + error.message);
  }
};

/**
 * 创建WireGuard对等点
 * @param {Object} peer 对等点配置
 * @returns {Promise<Object>} 创建的对等点信息
 */
const createWireguardPeer = async (peer) => {
  try {
    // 构建参数对象
    const params = {
      'interface': peer.interface,
      'public-key': peer.publicKey,
      'allowed-address': peer.allowedIPs,
      'comment': peer.comment || ''
    };
    
    // 添加可选参数
    if (peer.endpoint) params['endpoint'] = peer.endpoint;
    if (peer.persistentKeepalive) params['persistent-keepalive'] = peer.persistentKeepalive.toString();
    if (peer.presharedKey) params['preshared-key'] = peer.presharedKey;
    if (peer.hasOwnProperty('disabled')) params['disabled'] = peer.disabled ? 'yes' : 'no';
    
    // 执行命令
    const response = await executeCommand('/interface/wireguard/peers/add', params);
    return response;
  } catch (error) {
    console.error('创建WireGuard对等点失败:', error);
    throw new Error('创建WireGuard对等点失败: ' + error.message);
  }
};

/**
 * 更新WireGuard对等点
 * @param {String} id RouterOS对等点ID
 * @param {Object} peer 更新的配置
 * @returns {Promise<Object>} 更新后的对等点信息
 */
const updateWireguardPeer = async (id, peer) => {
  try {
    // 构建更新参数对象
    const params = {
      '.id': id
    };
    
    // 只添加要更新的字段
    if (peer.publicKey) params['public-key'] = peer.publicKey;
    if (peer.allowedIPs) params['allowed-address'] = peer.allowedIPs;
    if (peer.endpoint) params['endpoint'] = peer.endpoint;
    if (peer.persistentKeepalive) params['persistent-keepalive'] = peer.persistentKeepalive.toString();
    if (peer.presharedKey) params['preshared-key'] = peer.presharedKey;
    if (peer.hasOwnProperty('disabled')) params['disabled'] = peer.disabled ? 'yes' : 'no';
    if (peer.comment) params['comment'] = peer.comment;
    
    // 执行更新
    const response = await executeCommand('/interface/wireguard/peers/set', params);
    return response;
  } catch (error) {
    console.error('更新WireGuard对等点失败:', error);
    throw new Error('更新WireGuard对等点失败: ' + error.message);
  }
};

/**
 * 删除WireGuard对等点
 * @param {String} id RouterOS对等点ID
 * @returns {Promise<void>}
 */
const deleteWireguardPeer = async (id) => {
  try {
    await executeCommand('/interface/wireguard/peers/remove', {
      '.id': id
    });
  } catch (error) {
    console.error('删除WireGuard对等点失败:', error);
    throw new Error('删除WireGuard对等点失败: ' + error.message);
  }
};

/**
 * 将RouterOS的时间格式转换为JavaScript Date对象
 * @param {String} timeString RouterOS格式的时间字符串，如"1m43s"
 * @returns {Date|null} 转换后的JavaScript Date对象，如果转换失败则返回null
 */
const parseRouterOSTime = (timeString) => {
  if (!timeString || timeString === '') return null;
  
  try {
    // 匹配不同的时间单位
    const weeks = timeString.match(/(\d+)w/);
    const days = timeString.match(/(\d+)d/);
    const hours = timeString.match(/(\d+)h/);
    const minutes = timeString.match(/(\d+)m/);
    const seconds = timeString.match(/(\d+)s/);
    
    // 计算总秒数
    let totalSeconds = 0;
    if (weeks) totalSeconds += parseInt(weeks[1]) * 7 * 24 * 60 * 60;
    if (days) totalSeconds += parseInt(days[1]) * 24 * 60 * 60;
    if (hours) totalSeconds += parseInt(hours[1]) * 60 * 60;
    if (minutes) totalSeconds += parseInt(minutes[1]) * 60;
    if (seconds) totalSeconds += parseInt(seconds[1]);
    
    // 从当前时间减去总秒数
    const date = new Date();
    date.setSeconds(date.getSeconds() - totalSeconds);
    return date;
  } catch (error) {
    console.error('解析RouterOS时间格式失败:', error, timeString);
    return null;
  }
};

module.exports = {
  getWireguardInterfaces,
  createWireguardInterface,
  updateWireguardInterface,
  deleteWireguardInterface,
  getWireguardPeers,
  getWireguardPeerStatus,
  createWireguardPeer,
  updateWireguardPeer,
  deleteWireguardPeer,
  parseRouterOSTime,
  getInterfaceAddress
}; 
/**
 * RouterOS 连接工具函数
 * 提供获取 RouterOS 连接的方法
 */
const MikroNode = require('mikrotik-node').MikroNode;
const Setting = require('../models/Setting');
require('dotenv').config();

/**
 * 获取RouterOS连接
 * 先从数据库中获取连接信息，如果没有则使用环境变量
 * @returns {Promise} 返回连接对象的Promise
 */
const getRouterOSConnection = async () => {
  try {
    // 尝试从数据库中读取连接信息
    let host, port, user, password;
    
    try {
      // 获取RouterOS设置
      const routerAddressSetting = await Setting.findOne({ 
        where: { key: 'routerAddress', category: 'routerOS' }
      });
      const routerPortSetting = await Setting.findOne({ 
        where: { key: 'routerPort', category: 'routerOS' }
      });
      const routerUserSetting = await Setting.findOne({ 
        where: { key: 'routerUser', category: 'routerOS' }
      });
      const routerPasswordSetting = await Setting.findOne({ 
        where: { key: 'routerPassword', category: 'routerOS' }
      });
      
      // 提取设置值
      host = routerAddressSetting ? routerAddressSetting.value : null;
      port = routerPortSetting ? routerPortSetting.value : 8728;
      user = routerUserSetting ? routerUserSetting.value : null;
      password = routerPasswordSetting ? routerPasswordSetting.value : null;
    } catch (error) {
      console.warn('从数据库读取RouterOS连接信息失败，将使用环境变量:', error);
    }
    
    // 如果没有从数据库中获取到连接信息，则使用环境变量
    if (!host || !user) {
      host = process.env.ROUTEROS_HOST || '192.168.88.1';
      port = process.env.ROUTEROS_PORT || 8728;
      user = process.env.ROUTEROS_USER || 'admin';
      password = process.env.ROUTEROS_PASSWORD || '';
    }
    
    // 创建连接
    return new Promise((resolve, reject) => {
      try {
        const device = new MikroNode(host, parseInt(port));
        device.connect()
          .then(([login]) => login(user, password))
          .then((conn) => {
            console.log('RouterOS连接成功');
            resolve(conn);
          })
          .catch((error) => {
            console.error('RouterOS连接失败:', error);
            reject(error);
          });
      } catch (error) {
        console.error('创建RouterOS连接失败:', error);
        reject(error);
      }
    });
  } catch (error) {
    console.error('获取RouterOS连接错误:', error);
    throw error;
  }
};

/**
 * 执行RouterOS命令
 * @param {Object} conn RouterOS连接对象
 * @param {string} command RouterOS命令路径
 * @param {Object} params 命令参数
 * @returns {Promise} 返回命令结果promise
 */
const executeCommand = async (conn, command, params = {}) => {
  return new Promise((resolve, reject) => {
    const chan = conn.openChannel();
    
    chan.write(command, params);
    
    chan.on('done', (data) => {
      // 处理完毕，关闭通道
      chan.close();
      
      if (data && data.data) {
        // 将结果转换为更易读的对象格式
        const results = data.data.map(item => MikroNode.resultsToObj(item));
        resolve(results);
      } else {
        resolve([]);
      }
    });
    
    chan.on('trap', (error) => {
      // 处理错误
      chan.close();
      reject(error);
    });
  });
};

module.exports = {
  getRouterOSConnection,
  executeCommand
}; 
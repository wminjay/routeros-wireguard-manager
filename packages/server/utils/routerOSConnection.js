/**
 * RouterOS 连接工具函数
 * 提供获取 RouterOS 连接的方法
 */
const MikroNode = require('mikrotik-node').MikroNode;
const Setting = require('../models/Setting');
const path = require('path');

// 确保从项目根目录加载.env文件
require('dotenv').config({ path: path.resolve(__dirname, '../../../.env') });

// 连接配置
const CONNECTION_TIMEOUT = 10000; // 10秒连接超时
const COMMAND_TIMEOUT = 15000; // 15秒命令超时

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
        // 设置连接超时
        const connectTimeout = setTimeout(() => {
          reject(new Error(`连接超时: 无法在${CONNECTION_TIMEOUT}ms内连接到RouterOS设备 ${host}:${port}`));
        }, CONNECTION_TIMEOUT);

        const device = new MikroNode(host, parseInt(port));
        device.connect()
          .then(([login]) => {
            clearTimeout(connectTimeout);
            return login(user, password);
          })
          .then((conn) => {
            console.log('RouterOS连接成功');
            resolve(conn);
          })
          .catch((error) => {
            clearTimeout(connectTimeout);
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
    // 设置命令超时
    const commandTimeout = setTimeout(() => {
      try {
        conn.close();
      } catch (e) {
        console.warn('关闭连接时出错:', e);
      }
      reject(new Error(`命令执行超时: ${command} 在${COMMAND_TIMEOUT}ms内未完成`));
    }, COMMAND_TIMEOUT);

    const chan = conn.openChannel();
    
    chan.write(command, params);
    
    chan.on('done', (data) => {
      clearTimeout(commandTimeout);
      // 处理完毕，关闭通道
      try {
        chan.close();
      } catch (e) {
        console.warn('关闭通道时出错:', e);
      }
      
      if (data && data.data) {
        // 将结果转换为更易读的对象格式
        const results = data.data.map(item => MikroNode.resultsToObj(item));
        resolve(results);
      } else {
        resolve([]);
      }
    });
    
    chan.on('trap', (error) => {
      clearTimeout(commandTimeout);
      // 处理错误
      try {
        chan.close();
      } catch (e) {
        console.warn('关闭通道时出错:', e);
      }
      reject(error);
    });

    chan.on('error', (error) => {
      clearTimeout(commandTimeout);
      console.error('Channel错误:', error);
      try {
        chan.close();
      } catch (e) {
        console.warn('关闭通道时出错:', e);
      }
      reject(error);
    });
  });
};

module.exports = {
  getRouterOSConnection,
  executeCommand,
  CONNECTION_TIMEOUT,
  COMMAND_TIMEOUT
}; 
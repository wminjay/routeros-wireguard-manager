/**
 * RouterOS 连接工具函数
 * 提供获取 RouterOS 连接的方法
 */
const RouterOSAPI = require('node-routeros').RouterOSAPI;
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
 * @returns {Promise<RouterOSAPI>} 返回连接对象的Promise
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
    const api = new RouterOSAPI({
      host: host,
      port: parseInt(port),
      user: user,
      password: password,
      timeout: CONNECTION_TIMEOUT
    });

    await api.connect();
    console.log('RouterOS连接成功');
    return api;
  } catch (error) {
    console.error('获取RouterOS连接错误:', error);
    throw error;
  }
};

/**
 * 执行RouterOS命令
 * @param {RouterOSAPI} api RouterOS连接对象
 * @param {string} command RouterOS命令路径
 * @param {Object} params 命令参数
 * @returns {Promise} 返回命令结果promise
 */
const executeCommand = async (api, command, params = {}) => {
  try {
    // 构建命令参数数组
    const cmdParams = [];
    for (const [key, value] of Object.entries(params)) {
      if (key.startsWith('?')) {
        // 查询参数
        cmdParams.push(`${key}=${value}`);
      } else if (key.startsWith('.')) {
        // 特殊参数 (.id, .proplist等)
        cmdParams.push(`=${key}=${value}`);
      } else {
        // 普通参数
        cmdParams.push(`=${key}=${value}`);
      }
    }

    // 执行命令
    const response = await api.write(command, cmdParams);

    // 转换响应格式以保持兼容性
    const results = response.map(item => {
      const obj = {};
      for (const [key, value] of Object.entries(item)) {
        // 移除前缀的"="(如果有)
        const cleanKey = key.startsWith('=') ? key.substring(1) : key;
        obj[cleanKey] = value;
      }
      return obj;
    });

    return results;
  } catch (error) {
    console.error('执行RouterOS命令失败:', error);
    throw error;
  }
};

module.exports = {
  getRouterOSConnection,
  executeCommand,
  CONNECTION_TIMEOUT,
  COMMAND_TIMEOUT
};
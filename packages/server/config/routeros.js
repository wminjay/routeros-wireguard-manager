/**
 * RouterOS API连接配置
 * 使用node-routeros库与RouterOS进行通信
 */
const RouterOSAPI = require('node-routeros').RouterOSAPI;
const path = require('path');

// 确保从项目根目录加载.env文件
require('dotenv').config({ path: path.resolve(__dirname, '../../../.env') });

// 从环境变量获取默认RouterOS连接信息
const DEFAULT_ROUTEROS_HOST = process.env.ROUTEROS_HOST || '192.168.88.1';
const DEFAULT_ROUTEROS_PORT = process.env.ROUTEROS_PORT || 8728;
const DEFAULT_ROUTEROS_USER = process.env.ROUTEROS_USER || 'admin';
const DEFAULT_ROUTEROS_PASSWORD = process.env.ROUTEROS_PASSWORD || '';

// 导出的变量（向后兼容）
let ROUTEROS_HOST = DEFAULT_ROUTEROS_HOST;
let ROUTEROS_PORT = DEFAULT_ROUTEROS_PORT;
let ROUTEROS_USER = DEFAULT_ROUTEROS_USER;
let ROUTEROS_PASSWORD = DEFAULT_ROUTEROS_PASSWORD;

// 连接配置
const CONNECTION_TIMEOUT = 10000; // 10秒连接超时
const COMMAND_TIMEOUT = 15000; // 15秒命令超时

/**
 * 从数据库获取RouterOS连接凭据
 * @returns {Promise<Object>} 返回凭据对象
 */
const getCredentialsFromDB = async () => {
  try {
    // 动态引入以避免循环依赖
    const Setting = require('../models/Setting');

    // 检查是否已完成初始化
    const setupCompleted = await Setting.findOne({ where: { key: 'setupCompleted' } });

    if (setupCompleted && setupCompleted.value === 'true') {
      // 从数据库读取凭据
      const [hostSetting, portSetting, userSetting, passwordSetting] = await Promise.all([
        Setting.findOne({ where: { key: 'routerAddress' } }),
        Setting.findOne({ where: { key: 'routerPort' } }),
        Setting.findOne({ where: { key: 'routerUser' } }),
        Setting.findOne({ where: { key: 'routerPassword' } })
      ]);

      return {
        host: hostSetting?.value || DEFAULT_ROUTEROS_HOST,
        port: parseInt(portSetting?.value || DEFAULT_ROUTEROS_PORT),
        user: userSetting?.value || DEFAULT_ROUTEROS_USER,
        password: passwordSetting?.value || DEFAULT_ROUTEROS_PASSWORD
      };
    }
  } catch (error) {
    console.warn('从数据库读取凭据失败，使用环境变量:', error.message);
  }

  // 回退到环境变量
  return {
    host: DEFAULT_ROUTEROS_HOST,
    port: parseInt(DEFAULT_ROUTEROS_PORT),
    user: DEFAULT_ROUTEROS_USER,
    password: DEFAULT_ROUTEROS_PASSWORD
  };
};

/**
 * 创建RouterOS API连接
 * @returns {Promise<RouterOSAPI>} 返回连接对象promise
 */
const connectToRouterOS = async () => {
  // 从数据库获取凭据
  const credentials = await getCredentialsFromDB();

  // 更新导出的变量（向后兼容）
  ROUTEROS_HOST = credentials.host;
  ROUTEROS_PORT = credentials.port;
  ROUTEROS_USER = credentials.user;
  ROUTEROS_PASSWORD = credentials.password;

  const api = new RouterOSAPI({
    host: credentials.host,
    port: credentials.port,
    user: credentials.user,
    password: credentials.password,
    timeout: CONNECTION_TIMEOUT
  });

  try {
    await api.connect();
    console.log('RouterOS连接成功');
    return api;
  } catch (error) {
    console.error('RouterOS连接失败:', error);
    throw error;
  }
};

/**
 * 将命令路径转换为node-routeros格式
 * 例如: '/interface/wireguard/print' -> '/interface/wireguard/print'
 * @param {string} command 原始命令
 * @returns {string} 转换后的命令
 */
const formatCommand = (command) => {
  // node-routeros使用相同的命令格式
  return command;
};

/**
 * 将参数转换为node-routeros格式
 * @param {Object} params 原始参数
 * @returns {Object} 转换后的参数
 */
const formatParams = (params) => {
  const formatted = {};
  for (const [key, value] of Object.entries(params)) {
    // node-routeros期望参数以=开头
    if (key.startsWith('.') || key.startsWith('?')) {
      formatted[key] = value;
    } else {
      formatted[key] = value;
    }
  }
  return formatted;
};

/**
 * 执行RouterOS命令
 * @param {string} command RouterOS命令路径
 * @param {Object} params 命令参数
 * @returns {Promise} 返回命令结果promise
 */
const executeCommand = async (command, params = {}) => {
  let api = null;
  try {
    api = await connectToRouterOS();

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

    // 关闭连接
    await api.close();

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
    if (api) {
      try {
        await api.close();
      } catch (e) {
        console.warn('关闭连接时出错:', e);
      }
    }
    throw error;
  }
};

/**
 * 获取当前RouterOS连接信息（异步）
 * @returns {Promise<Object>} 返回连接信息
 */
const getConnectionInfo = async () => {
  const credentials = await getCredentialsFromDB();
  return {
    host: credentials.host,
    port: credentials.port,
    user: credentials.user
  };
};

module.exports = {
  connectToRouterOS,
  executeCommand,
  getConnectionInfo,
  getCredentialsFromDB,
  // 保留这些导出以向后兼容，但值可能是过时的
  // 推荐使用 getConnectionInfo() 或 getCredentialsFromDB()
  get ROUTEROS_HOST() { return ROUTEROS_HOST; },
  get ROUTEROS_PORT() { return ROUTEROS_PORT; },
  get ROUTEROS_USER() { return ROUTEROS_USER; },
  get ROUTEROS_PASSWORD() { return ROUTEROS_PASSWORD; },
  CONNECTION_TIMEOUT,
  COMMAND_TIMEOUT
};
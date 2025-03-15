/**
 * RouterOS控制器
 * 处理与RouterOS的基本交互
 */
const { connectToRouterOS, executeCommand, ROUTEROS_HOST, ROUTEROS_PORT, ROUTEROS_USER } = require('../config/routeros');
const { validationResult } = require('express-validator');
const MikroNode = require('mikrotik-node').MikroNode;

/**
 * 获取RouterOS连接状态
 * @route GET /api/routeros/status
 */
exports.getStatus = async (req, res) => {
  try {
    const statusData = await this.getStatusData();
    res.json(statusData);
  } catch (error) {
    console.error('RouterOS连接状态检查失败:', error);
    res.status(500).json({
      status: 'disconnected',
      error: error.message
    });
  }
};

/**
 * 获取RouterOS状态数据（供内部使用）
 */
exports.getStatusData = async () => {
  try {
    // 尝试使用executeCommand获取身份信息
    const identity = await executeCommand('/system/identity/print');
    
    // 如果连接成功，返回连接信息
    return {
      success: true,
      status: 'connected',
      connection: {
        host: ROUTEROS_HOST,
        port: ROUTEROS_PORT,
        user: ROUTEROS_USER
      },
      device: identity.length > 0 ? identity[0].name : '未知设备'
    };
  } catch (error) {
    console.error('RouterOS连接状态检查失败:', error);
    return {
      success: false,
      status: 'disconnected',
      error: error.message
    };
  }
};

/**
 * 连接到RouterOS
 * @route POST /api/routeros/connect
 */
exports.connect = async (req, res) => {
  // 验证请求参数
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  
  try {
    // 这里可以实现保存新的连接信息到环境变量或配置文件
    // 但在本示例中我们只是尝试连接
    
    // 尝试连接RouterOS
    await connectToRouterOS();
    
    res.json({
      status: 'connected',
      message: '成功连接到RouterOS'
    });
  } catch (error) {
    console.error('RouterOS连接失败:', error);
    res.status(500).json({
      status: 'error',
      message: '连接到RouterOS失败',
      error: error.message
    });
  }
};

/**
 * 获取RouterOS所有接口
 * @route GET /api/routeros/interfaces
 */
exports.getInterfaces = async (req, res) => {
  try {
    const interfacesData = await this.getInterfacesData();
    res.json(interfacesData);
  } catch (error) {
    console.error('获取RouterOS接口失败:', error);
    res.status(500).json({
      success: false,
      message: '获取RouterOS接口失败',
      error: error.message
    });
  }
};

/**
 * 获取RouterOS接口数据（供内部使用）
 */
exports.getInterfacesData = async () => {
  try {
    // 使用新的executeCommand方法获取接口
    const interfaces = await executeCommand('/interface/print');
    
    return {
      success: true,
      interfaces: interfaces
    };
  } catch (error) {
    console.error('获取RouterOS接口失败:', error);
    return {
      success: false,
      message: '获取RouterOS接口失败',
      error: error.message
    };
  }
};

/**
 * 获取RouterOS身份信息
 * @route GET /api/routeros/identity
 */
exports.getIdentity = async (req, res) => {
  try {
    // 使用新的executeCommand方法获取身份信息
    const identity = await executeCommand('/system/identity/print');
    
    res.json({
      success: true,
      identity: identity.length > 0 ? identity[0] : {}
    });
  } catch (error) {
    console.error('获取RouterOS身份信息失败:', error);
    res.status(500).json({ 
      success: false,
      message: '获取RouterOS身份信息失败', 
      error: error.message 
    });
  }
};

/**
 * 获取RouterOS资源使用情况
 * @route GET /api/routeros/resources
 */
exports.getResources = async (req, res) => {
  try {
    const resourcesData = await this.getResourcesData();
    res.json(resourcesData);
  } catch (error) {
    console.error('获取RouterOS资源使用情况失败:', error);
    res.status(500).json({ 
      success: false,
      message: '获取RouterOS资源使用情况失败', 
      error: error.message 
    });
  }
};

/**
 * 获取RouterOS资源数据（供内部使用）
 */
exports.getResourcesData = async () => {
  try {
    // 使用新的executeCommand方法获取资源使用情况
    const resources = await executeCommand('/system/resource/print');
    
    return {
      success: true,
      resources: resources.length > 0 ? resources[0] : {}
    };
  } catch (error) {
    console.error('获取RouterOS资源使用情况失败:', error);
    return { 
      success: false,
      message: '获取RouterOS资源使用情况失败', 
      error: error.message 
    };
  }
}; 
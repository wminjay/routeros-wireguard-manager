/**
 * 设置路由
 * 处理应用设置相关的路由
 */
const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const settingsController = require('../controllers/settingsController');
const Setting = require('../models/Setting');

/**
 * 获取所有设置
 * @route GET /api/settings
 */
router.get('/', settingsController.getSettings);

/**
 * 更新所有设置
 * @route PUT /api/settings
 */
router.put('/', settingsController.updateSettings);

/**
 * 测试RouterOS连接
 * @route POST /api/settings/test-connection
 */
router.post('/test-connection', [
  body('routerAddress').notEmpty().withMessage('RouterOS地址不能为空'),
  body('routerPort').notEmpty().withMessage('RouterOS端口不能为空'),
  body('routerUser').notEmpty().withMessage('RouterOS用户名不能为空'),
  body('routerPassword').notEmpty().withMessage('RouterOS密码不能为空')
], settingsController.testConnection);

/**
 * 获取RouterOS连接状态
 * @route GET /api/settings/connection-status
 */
router.get('/connection-status', settingsController.getConnectionStatus);

/**
 * 更新应用设置
 * @route PUT /api/settings/app
 */
router.put('/app', settingsController.updateAppSettings);

// 检查设置状态
router.get('/setup-status', async (req, res) => {
  try {
    // 从数据库中读取设置
    const setupCompletedSetting = await Setting.findOne({
      where: { key: 'setupCompleted', category: 'app' }
    });
    
    // 检查setupCompleted字段
    const setupCompleted = setupCompletedSetting && setupCompletedSetting.value === 'true';
    
    // 返回设置状态
    return res.json({ 
      setupCompleted: !!setupCompleted 
    });
  } catch (error) {
    console.error('获取设置状态失败:', error);
    return res.status(500).json({ 
      message: '获取设置状态失败',
      error: error.message 
    });
  }
});

module.exports = router; 
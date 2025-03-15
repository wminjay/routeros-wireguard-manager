/**
 * 设置路由
 * 处理应用设置相关的路由
 */
const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const settingsController = require('../controllers/settingsController');

/**
 * 测试连接路由
 * POST /api/settings/test-connection
 */
router.post('/test-connection', settingsController.testConnection);

/**
 * 获取连接状态
 * GET /api/settings/connection-status
 */
router.get('/connection-status', settingsController.getConnectionStatus);

/**
 * 获取所有设置
 * GET /api/settings
 */
router.get('/', settingsController.getAllSettings);

/**
 * 更新设置 - 同时支持PUT和POST方法
 */
router.post('/', settingsController.updateSettings);
router.put('/', settingsController.updateSettings);

/**
 * 更新RouterOS连接设置
 * PUT /api/settings/router
 */
router.put('/router', settingsController.updateRouterSettings);

/**
 * 更新应用设置
 * PUT /api/settings/app
 */
router.put('/app', settingsController.updateAppSettings);

module.exports = router; 
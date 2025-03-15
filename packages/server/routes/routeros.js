const express = require('express');
const router = express.Router();
const { body, param, validationResult } = require('express-validator');

// 导入控制器（尚未创建）
const routerOSController = require('../controllers/routerOSController');

/**
 * @route   GET /api/routeros/status
 * @desc    获取RouterOS连接状态
 * @access  Public
 */
router.get('/status', routerOSController.getStatus);

/**
 * @route   POST /api/routeros/connect
 * @desc    连接到RouterOS
 * @access  Public
 */
router.post('/connect',
  [
    body('host').notEmpty().withMessage('主机地址不能为空'),
    body('port').isInt({ min: 1, max: 65535 }).withMessage('端口必须是有效的端口号'),
    body('user').notEmpty().withMessage('用户名不能为空'),
    body('password').notEmpty().withMessage('密码不能为空')
  ],
  routerOSController.connect
);

/**
 * @route   GET /api/routeros/interfaces
 * @desc    获取RouterOS所有接口
 * @access  Public
 */
router.get('/interfaces', routerOSController.getInterfaces);

/**
 * @route   GET /api/routeros/identity
 * @desc    获取RouterOS身份信息
 * @access  Public
 */
router.get('/identity', routerOSController.getIdentity);

/**
 * @route   GET /api/routeros/resources
 * @desc    获取RouterOS资源使用情况
 * @access  Public
 */
router.get('/resources', routerOSController.getResources);

module.exports = router; 
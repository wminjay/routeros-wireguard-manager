const express = require('express');
const router = express.Router();

// 导入控制器
const dashboardController = require('../controllers/dashboardController');

/**
 * @route   GET /api/dashboard
 * @desc    获取仪表盘数据
 * @access  Public
 */
router.get('/', dashboardController.getDashboardData);

module.exports = router; 
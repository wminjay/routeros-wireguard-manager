const express = require('express');
const router = express.Router();
const { body, param, validationResult } = require('express-validator');

// 导入控制器（尚未创建）
const wireguardController = require('../controllers/wireguardController');

/**
 * @route   GET /api/wireguard/interfaces
 * @desc    获取所有WireGuard接口
 * @access  Public
 */
router.get('/interfaces', wireguardController.getAllInterfaces);

/**
 * @route   GET /api/wireguard/interfaces/:id
 * @desc    获取单个WireGuard接口
 * @access  Public
 */
router.get('/interfaces/:id', 
  param('id').isInt().withMessage('接口ID必须是整数'),
  wireguardController.getInterfaceById
);

/**
 * @route   GET /api/wireguard/interfaces/:id/suggest-ip
 * @desc    为特定接口提供建议的IP地址
 * @access  Public
 */
router.get('/interfaces/:id/suggest-ip',
  param('id').isInt().withMessage('接口ID必须是整数'),
  wireguardController.suggestIP
);

/**
 * @route   POST /api/wireguard/interfaces
 * @desc    创建WireGuard接口
 * @access  Public
 */
router.post('/interfaces',
  [
    body('name').notEmpty().withMessage('接口名称不能为空'),
    body('interfaceName').optional().isString().withMessage('RouterOS接口名称必须是字符串'),
    body('listenPort').isInt({ min: 1024, max: 65535 }).withMessage('监听端口必须是有效的端口号'),
    body('address').optional().isString().withMessage('地址必须是有效的IP地址'),
    body('mtu').optional().isInt({ min: 1, max: 9000 }).withMessage('MTU必须是有效值'),
    body('enabled').optional().isBoolean().withMessage('启用状态必须是布尔值'),
    body('comment').optional().isString().withMessage('备注必须是字符串')
  ],
  (req, res, next) => {
    console.log('请求体内容:', req.body);
    
    // 验证请求参数
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('验证错误:', errors.array());
      return res.status(400).json({ errors: errors.array() });
    }
    
    next();
  },
  wireguardController.createInterface
);

/**
 * @route   PUT /api/wireguard/interfaces/:id
 * @desc    更新WireGuard接口
 * @access  Public
 */
router.put('/interfaces/:id',
  [
    param('id').isInt().withMessage('接口ID必须是整数'),
    body('name').optional().notEmpty().withMessage('接口名称不能为空'),
    body('listenPort').optional().isInt({ min: 1024, max: 65535 }).withMessage('监听端口必须是有效的端口号'),
    body('mtu').optional().isInt({ min: 1, max: 9000 }).withMessage('MTU必须是有效值'),
    body('enabled').optional().isBoolean().withMessage('启用状态必须是布尔值')
  ],
  wireguardController.updateInterface
);

/**
 * @route   DELETE /api/wireguard/interfaces/:id
 * @desc    删除WireGuard接口
 * @access  Public
 */
router.delete('/interfaces/:id',
  param('id').isInt().withMessage('接口ID必须是整数'),
  wireguardController.deleteInterface
);

/**
 * @route   GET /api/wireguard/peers
 * @desc    获取所有WireGuard对等点
 * @access  Public
 */
router.get('/peers', wireguardController.getAllPeers);

/**
 * @route   GET /api/wireguard/peers/:id
 * @desc    获取单个WireGuard对等点
 * @access  Public
 */
router.get('/peers/:id',
  param('id').isInt().withMessage('对等点ID必须是整数'),
  wireguardController.getPeerById
);

/**
 * @route   POST /api/wireguard/peers
 * @desc    创建WireGuard对等点
 * @access  Public
 */
router.post('/peers',
  [
    body('name').notEmpty().withMessage('对等点名称不能为空'),
    body('wireguardConfigId').isInt().withMessage('关联的接口ID必须是整数'),
    body('allowedIPs').notEmpty().withMessage('允许的IP地址不能为空')
  ],
  wireguardController.createPeer
);

/**
 * @route   PUT /api/wireguard/peers/:id
 * @desc    更新WireGuard对等点
 * @access  Public
 */
router.put('/peers/:id',
  [
    param('id').isInt().withMessage('对等点ID必须是整数'),
    body('name').optional().notEmpty().withMessage('对等点名称不能为空'),
    body('allowedIPs').optional().notEmpty().withMessage('允许的IP地址不能为空'),
    body('endpoint').optional().isString().withMessage('端点地址必须是字符串'),
    body('persistentKeepalive').optional().isInt({ min: 0 }).withMessage('持久保持连接间隔必须是非负整数'),
    body('enabled').optional().isBoolean().withMessage('启用状态必须是布尔值')
  ],
  wireguardController.updatePeer
);

/**
 * @route   DELETE /api/wireguard/peers/:id
 * @desc    删除WireGuard对等点
 * @access  Public
 */
router.delete('/peers/:id',
  param('id').isInt().withMessage('对等点ID必须是整数'),
  wireguardController.deletePeer
);

/**
 * @route   GET /api/wireguard/peers/:id/config
 * @desc    导出WireGuard对等点配置
 * @access  Public
 */
router.get('/peers/:id/config',
  param('id').isInt().withMessage('对等点ID必须是整数'),
  wireguardController.exportPeerConfig
);

/**
 * @route   POST /api/wireguard/quicksetup
 * @desc    快速设置WireGuard（创建接口和对等点）
 * @access  Public
 */
router.post('/quicksetup',
  [
    body('useExistingInterface').isIn(['new', 'existing']).withMessage('接口选择类型无效'),
    body('interfaceName').custom((value, { req }) => {
      // 仅当创建新接口时才验证接口名称
      if (req.body.useExistingInterface === 'new') {
        if (!value) {
          throw new Error('RouterOS接口名称不能为空');
        }
      }
      return true;
    }),
    body('listenPort').custom((value, { req }) => {
      // 仅当创建新接口时才验证端口
      if (req.body.useExistingInterface === 'new') {
        if (!Number.isInteger(Number(value)) || Number(value) < 1024 || Number(value) > 65535) {
          throw new Error('监听端口必须是有效的端口号');
        }
      }
      return true;
    }),
    body('selectedInterfaceId').custom((value, { req }) => {
      // 仅当使用现有接口时才验证接口ID
      if (req.body.useExistingInterface === 'existing') {
        if (!value) {
          throw new Error('必须选择一个现有接口');
        }
      }
      return true;
    }),
    body('address').optional().isString().withMessage('地址必须是有效的IP地址'),
    body('peerName').notEmpty().withMessage('对等点名称不能为空'),
    body('allowedIPs').notEmpty().withMessage('允许的IP地址不能为空')
  ],
  wireguardController.quickSetup
);

/**
 * @route   POST /api/wireguard/sync
 * @desc    同步RouterOS中的WireGuard接口到本地数据库
 * @access  Public
 */
router.post('/sync', wireguardController.syncInterfaces);

/**
 * @route   POST /api/wireguard/peers/sync
 * @desc    同步RouterOS中的WireGuard对等点到本地数据库
 * @access  Public
 */
router.post('/peers/sync', wireguardController.syncPeers);

/**
 * @route   POST /api/wireguard/peers/status
 * @desc    更新所有WireGuard对等点的状态信息（最后握手时间等）
 * @access  Public
 */
router.post('/peers/status', wireguardController.updatePeersStatus);

/**
 * @route   POST /api/wireguard/interfaces/:id/update-peers-status
 * @desc    更新特定接口的WireGuard对等点状态信息
 * @access  Public
 */
router.post('/interfaces/:id/update-peers-status',
  param('id').isInt().withMessage('接口ID必须是整数'),
  wireguardController.updateInterfacePeersStatus
);

/**
 * @route   GET /api/wireguard/generate-keys
 * @desc    生成WireGuard密钥对
 * @access  Public
 */
router.get('/generate-keys', wireguardController.generateKeys);

module.exports = router; 
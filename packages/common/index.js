/**
 * 共享常量和函数
 */

// API端点
const API_ENDPOINTS = {
  WIREGUARD: '/api/wireguard',
  ROUTEROS: '/api/routeros',
  SETTINGS: '/api/settings',
};

// WireGuard配置状态
const WG_CONFIG_STATUS = {
  ACTIVE: 'active',
  DISABLED: 'disabled',
  PENDING: 'pending',
};

// 导出所有常量
module.exports = {
  API_ENDPOINTS,
  WG_CONFIG_STATUS,
}; 
const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const WireguardConfig = require('./WireguardConfig');

/**
 * WireGuard对等点配置模型
 * 存储本地维护的WireGuard对等点信息
 */
const WireguardPeer = sequelize.define('WireguardPeer', {
  // 对等点ID，主键
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  // 对等点名称
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  // 对等点公钥
  publicKey: {
    type: DataTypes.STRING,
    allowNull: false
  },
  // 对等点私钥（如果在本地生成的对等点配置，则保存私钥）
  privateKey: {
    type: DataTypes.STRING
  },
  // 预共享密钥（可选）
  presharedKey: {
    type: DataTypes.STRING
  },
  // 对等点允许的IP地址
  allowedIPs: {
    type: DataTypes.STRING,
    allowNull: false
  },
  // 对等点端点地址
  endpoint: {
    type: DataTypes.STRING
  },
  // 持久保持连接间隔（秒）
  persistentKeepalive: {
    type: DataTypes.INTEGER,
    defaultValue: 25
  },
  // 对等点状态
  enabled: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  // 备注
  comment: {
    type: DataTypes.TEXT
  },
  // 最后握手时间
  lastHandshake: {
    type: DataTypes.DATE,
    allowNull: true
  },
  // 是否为导入的对等点
  isImported: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  // 关联的WireGuard接口ID
  wireguardConfigId: {
    type: DataTypes.INTEGER,
    references: {
      model: WireguardConfig,
      key: 'id'
    },
    allowNull: false
  }
}, {
  timestamps: true,
  indexes: [
    // 添加公钥和接口ID的组合唯一约束
    {
      unique: true,
      fields: ['publicKey', 'wireguardConfigId'],
      name: 'unique_peer_per_interface'
    }
  ]
});

// 建立与WireguardConfig的关联
WireguardConfig.hasMany(WireguardPeer, { foreignKey: 'wireguardConfigId' });
WireguardPeer.belongsTo(WireguardConfig, { foreignKey: 'wireguardConfigId' });

module.exports = WireguardPeer; 
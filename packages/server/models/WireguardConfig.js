const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

/**
 * WireGuard配置模型
 * 存储本地维护的WireGuard配置信息
 */
const WireguardConfig = sequelize.define('WireguardConfig', {
  // 配置ID，主键
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  // 配置名称
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  // RouterOS中接口名称（如wg0, wg1等）
  interfaceName: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  // 接口私钥（本地存储，不上传到RouterOS）
  privateKey: {
    type: DataTypes.STRING,
    allowNull: false
  },
  // 接口公钥
  publicKey: {
    type: DataTypes.STRING,
    allowNull: false
  },
  // 监听端口
  listenPort: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  // 接口IP地址
  address: {
    type: DataTypes.STRING,
    allowNull: true
  },
  // 接口MTU
  mtu: {
    type: DataTypes.INTEGER,
    defaultValue: 1420
  },
  // 接口状态
  enabled: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  // 是否为导入的接口
  isImported: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  // 接口创建日期
  createdAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  // 接口最后更新日期
  updatedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  // 备注
  comment: {
    type: DataTypes.TEXT
  }
}, {
  timestamps: true
});

module.exports = WireguardConfig; 
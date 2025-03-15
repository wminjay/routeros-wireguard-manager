/**
 * Setting模型
 * 用于存储应用全局设置
 */
const { DataTypes } = require('sequelize');
const db = require('../config/database');

const Setting = db.define('Setting', {
  key: {
    type: DataTypes.STRING,
    primaryKey: true,
    allowNull: false
  },
  value: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  category: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'general'
  }
}, {
  timestamps: true
});

module.exports = Setting; 
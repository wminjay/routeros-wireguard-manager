const { Sequelize } = require('sequelize');
const path = require('path');

// 创建数据库连接
// 使用SQLite作为开发环境的数据库
const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: path.join(__dirname, '../database.sqlite'),
  logging: process.env.NODE_ENV === 'development' ? console.log : false,
});

module.exports = sequelize; 
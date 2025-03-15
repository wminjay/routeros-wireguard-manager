'use strict';

const Sequelize = require('sequelize');
const sequelize = require('./config/database');

// 创建lastHandshake列的迁移函数
const addLastHandshakeColumn = async () => {
  const queryInterface = sequelize.getQueryInterface();
  
  try {
    console.log('开始添加lastHandshake列...');
    await queryInterface.addColumn('WireguardPeers', 'lastHandshake', {
      type: Sequelize.DATE,
      allowNull: true
    });
    console.log('lastHandshake列添加成功!');
  } catch (error) {
    console.error('添加lastHandshake列失败:', error);
    throw error;
  }
};

// 运行迁移
(async () => {
  try {
    await addLastHandshakeColumn();
    console.log('迁移完成！');
    process.exit(0);
  } catch (err) {
    console.error('迁移失败:', err);
    process.exit(1);
  }
})(); 
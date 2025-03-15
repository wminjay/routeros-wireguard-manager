/**
 * 添加isImported字段到WireguardConfig表
 * 该字段用于标识接口是从RouterOS导入的还是在应用中创建的
 */
const { DataTypes } = require('sequelize');

/**
 * 升级数据库 - 添加isImported字段
 */
exports.up = async (queryInterface, Sequelize) => {
  try {
    console.log('添加isImported字段到WireguardConfig表...');
    
    // 添加新字段
    await queryInterface.addColumn('WireguardConfigs', 'isImported', {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: false
    });
    
    console.log('isImported字段添加成功');
    
    return Promise.resolve();
  } catch (error) {
    console.error('迁移失败:', error);
    return Promise.reject(error);
  }
};

/**
 * 回滚数据库 - 移除isImported字段
 */
exports.down = async (queryInterface, Sequelize) => {
  try {
    console.log('移除WireguardConfig表的isImported字段...');
    
    // 移除字段
    await queryInterface.removeColumn('WireguardConfigs', 'isImported');
    
    console.log('isImported字段移除成功');
    
    return Promise.resolve();
  } catch (error) {
    console.error('回滚失败:', error);
    return Promise.reject(error);
  }
}; 
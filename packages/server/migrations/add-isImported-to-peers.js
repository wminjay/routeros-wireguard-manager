/**
 * 添加isImported字段到WireguardPeer表
 * 用于标识对等点是否是从RouterOS导入的
 */

const { DataTypes } = require('sequelize');

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('WireguardPeers', 'isImported', {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: false
    });

    // 更新现有的带有FAKE_前缀私钥的记录为导入的对等点
    await queryInterface.sequelize.query(`
      UPDATE WireguardPeers
      SET isImported = true
      WHERE privateKey LIKE 'FAKE_%'
    `);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('WireguardPeers', 'isImported');
  }
}; 
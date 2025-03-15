const fs = require('fs');
const path = require('path');
const { Sequelize } = require('sequelize');

// 获取数据库文件路径
const dbFile = path.join(__dirname, 'database.sqlite');

(async () => {
  try {
    console.log('开始重置数据库...');
    
    // 1. 删除现有的数据库文件
    if (fs.existsSync(dbFile)) {
      console.log(`删除数据库文件: ${dbFile}`);
      fs.unlinkSync(dbFile);
      console.log('数据库文件已删除');
    } else {
      console.log('数据库文件不存在，将创建新的数据库');
    }
    
    // 2. 创建Sequelize实例
    console.log('创建新的数据库连接...');
    const sequelize = new Sequelize({
      dialect: 'sqlite',
      storage: dbFile,
      logging: console.log
    });
    
    // 3. 定义模型
    console.log('定义模型...');
    
    // WireGuard接口模型
    const WireguardConfig = sequelize.define('WireguardConfig', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      name: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true
      },
      interfaceName: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true
      },
      privateKey: {
        type: Sequelize.STRING,
        allowNull: false
      },
      publicKey: {
        type: Sequelize.STRING,
        allowNull: false
      },
      listenPort: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      mtu: {
        type: Sequelize.INTEGER,
        defaultValue: 1420
      },
      enabled: {
        type: Sequelize.BOOLEAN,
        defaultValue: true
      },
      comment: {
        type: Sequelize.TEXT
      }
    });
    
    // WireGuard对等点模型
    const WireguardPeer = sequelize.define('WireguardPeer', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      name: {
        type: Sequelize.STRING,
        allowNull: false
      },
      publicKey: {
        type: Sequelize.STRING,
        allowNull: false
      },
      privateKey: {
        type: Sequelize.STRING
      },
      presharedKey: {
        type: Sequelize.STRING
      },
      allowedIPs: {
        type: Sequelize.STRING,
        allowNull: false
      },
      endpoint: {
        type: Sequelize.STRING
      },
      persistentKeepalive: {
        type: Sequelize.INTEGER,
        defaultValue: 25
      },
      enabled: {
        type: Sequelize.BOOLEAN,
        defaultValue: true
      },
      comment: {
        type: Sequelize.TEXT
      },
      wireguardConfigId: {
        type: Sequelize.INTEGER,
        references: {
          model: WireguardConfig,
          key: 'id'
        },
        allowNull: false
      }
    }, {
      indexes: [
        // 添加公钥和接口ID的组合唯一约束
        {
          unique: true,
          fields: ['publicKey', 'wireguardConfigId'],
          name: 'unique_peer_per_interface'
        }
      ]
    });
    
    // 4. 建立模型之间的关联
    WireguardConfig.hasMany(WireguardPeer, { foreignKey: 'wireguardConfigId' });
    WireguardPeer.belongsTo(WireguardConfig, { foreignKey: 'wireguardConfigId' });
    
    // 5. 同步数据库
    console.log('创建数据库表...');
    await sequelize.sync({ force: true });
    
    console.log('数据库重置成功！');
    
    // 6. 关闭连接
    await sequelize.close();
    process.exit(0);
  } catch (error) {
    console.error('重置数据库时出错:', error);
    process.exit(1);
  }
})(); 
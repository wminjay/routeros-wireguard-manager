/**
 * RouterOS API连接配置
 * 使用mikrotik-node库与RouterOS进行通信
 */
const MikroNode = require('mikrotik-node').MikroNode;
require('dotenv').config();

// 从环境变量获取RouterOS连接信息
const ROUTEROS_HOST = process.env.ROUTEROS_HOST || '192.168.88.1';
const ROUTEROS_PORT = process.env.ROUTEROS_PORT || 8728;
const ROUTEROS_USER = process.env.ROUTEROS_USER || 'admin';
const ROUTEROS_PASSWORD = process.env.ROUTEROS_PASSWORD || '';

/**
 * 创建RouterOS API连接
 * @returns {Promise} 返回连接对象promise
 */
const connectToRouterOS = () => {
  return new Promise((resolve, reject) => {
    try {
      const device = new MikroNode(ROUTEROS_HOST, ROUTEROS_PORT);
      device.connect()
        .then(([login]) => login(ROUTEROS_USER, ROUTEROS_PASSWORD))
        .then((conn) => {
          console.log('RouterOS连接成功');
          resolve(conn);
        })
        .catch((error) => {
          console.error('RouterOS连接失败:', error);
          reject(error);
        });
    } catch (error) {
      console.error('创建RouterOS连接失败:', error);
      reject(error);
    }
  });
};

/**
 * 执行RouterOS命令
 * @param {string} command RouterOS命令路径
 * @param {Object} params 命令参数
 * @returns {Promise} 返回命令结果promise
 */
const executeCommand = async (command, params = {}) => {
  try {
    const conn = await connectToRouterOS();
    return new Promise((resolve, reject) => {
      const chan = conn.openChannel();
      
      chan.write(command, params);
      
      chan.on('done', (data) => {
        // 处理完毕，关闭通道和连接
        chan.close();
        conn.close();
        
        if (data && data.data) {
          // 将结果转换为更易读的对象格式
          const results = data.data.map(item => MikroNode.resultsToObj(item));
          resolve(results);
        } else {
          resolve([]);
        }
      });
      
      chan.on('trap', (error) => {
        // 处理错误
        chan.close();
        conn.close();
        reject(error);
      });
    });
  } catch (error) {
    console.error('执行RouterOS命令失败:', error);
    throw error;
  }
};

module.exports = {
  connectToRouterOS,
  executeCommand,
  ROUTEROS_HOST,
  ROUTEROS_PORT,
  ROUTEROS_USER
}; 
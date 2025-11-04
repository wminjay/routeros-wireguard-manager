/**
 * RouterOS API连接配置
 * 使用mikrotik-node库与RouterOS进行通信
 */
const MikroNode = require('mikrotik-node').MikroNode;
const path = require('path');

// 确保从项目根目录加载.env文件
require('dotenv').config({ path: path.resolve(__dirname, '../../../.env') });

// 从环境变量获取RouterOS连接信息
const ROUTEROS_HOST = process.env.ROUTEROS_HOST || '192.168.88.1';
const ROUTEROS_PORT = process.env.ROUTEROS_PORT || 8728;
const ROUTEROS_USER = process.env.ROUTEROS_USER || 'admin';
const ROUTEROS_PASSWORD = process.env.ROUTEROS_PASSWORD || '';

// 连接配置
const CONNECTION_TIMEOUT = 10000; // 10秒连接超时
const COMMAND_TIMEOUT = 15000; // 15秒命令超时

/**
 * 创建RouterOS API连接
 * @returns {Promise} 返回连接对象promise
 */
const connectToRouterOS = () => {
  return new Promise((resolve, reject) => {
    try {
      // 设置连接超时
      const connectTimeout = setTimeout(() => {
        reject(new Error(`连接超时: 无法在${CONNECTION_TIMEOUT}ms内连接到RouterOS设备 ${ROUTEROS_HOST}:${ROUTEROS_PORT}`));
      }, CONNECTION_TIMEOUT);

      const device = new MikroNode(ROUTEROS_HOST, ROUTEROS_PORT);
      
      device.connect()
        .then(([login]) => {
          clearTimeout(connectTimeout);
          return login(ROUTEROS_USER, ROUTEROS_PASSWORD);
        })
        .then((conn) => {
          console.log('RouterOS连接成功');
          resolve(conn);
        })
        .catch((error) => {
          clearTimeout(connectTimeout);
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
  let conn = null;
  try {
    conn = await connectToRouterOS();
    
    return new Promise((resolve, reject) => {
      // 设置命令超时
      const commandTimeout = setTimeout(() => {
        if (conn) {
          try {
            conn.close();
          } catch (e) {
            console.warn('关闭连接时出错:', e);
          }
        }
        reject(new Error(`命令执行超时: ${command} 在${COMMAND_TIMEOUT}ms内未完成`));
      }, COMMAND_TIMEOUT);

      const chan = conn.openChannel();
      
      chan.write(command, params);
      
      chan.on('done', (data) => {
        clearTimeout(commandTimeout);
        // 处理完毕，关闭通道和连接
        try {
          chan.close();
          conn.close();
        } catch (e) {
          console.warn('关闭连接时出错:', e);
        }
        
        if (data && data.data) {
          // 将结果转换为更易读的对象格式
          const results = data.data.map(item => MikroNode.resultsToObj(item));
          resolve(results);
        } else {
          resolve([]);
        }
      });
      
      chan.on('trap', (error) => {
        clearTimeout(commandTimeout);
        // 处理错误
        try {
          chan.close();
          conn.close();
        } catch (e) {
          console.warn('关闭连接时出错:', e);
        }
        reject(error);
      });

      chan.on('error', (error) => {
        clearTimeout(commandTimeout);
        console.error('Channel错误:', error);
        try {
          chan.close();
          conn.close();
        } catch (e) {
          console.warn('关闭连接时出错:', e);
        }
        reject(error);
      });
    });
  } catch (error) {
    console.error('执行RouterOS命令失败:', error);
    if (conn) {
      try {
        conn.close();
      } catch (e) {
        console.warn('关闭连接时出错:', e);
      }
    }
    throw error;
  }
};

module.exports = {
  connectToRouterOS,
  executeCommand,
  ROUTEROS_HOST,
  ROUTEROS_PORT,
  ROUTEROS_USER,
  CONNECTION_TIMEOUT,
  COMMAND_TIMEOUT
}; 
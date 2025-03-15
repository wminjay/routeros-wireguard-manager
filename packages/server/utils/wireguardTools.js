/**
 * WireGuard 工具函数
 * 用于生成密钥、创建配置文件等
 */
const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const nacl = require('tweetnacl');
const util = require('tweetnacl-util');

/**
 * 生成WireGuard密钥对
 * 使用Curve25519算法生成真正的WireGuard兼容密钥对
 * 
 * 此实现使用tweetnacl库生成真正的Curve25519密钥对，
 * 公钥是从私钥正确派生出来的，完全兼容WireGuard协议。
 * 
 * @returns {Object} 包含私钥和公钥的对象
 */
const generateKeyPair = () => {
  try {
    // 使用nacl.box.keyPair()生成Curve25519密钥对
    const keyPair = nacl.box.keyPair();
    
    // 将Uint8Array转换为Base64字符串
    const privateKey = util.encodeBase64(keyPair.secretKey);
    const publicKey = util.encodeBase64(keyPair.publicKey);
    
    return { privateKey, publicKey };
  } catch (error) {
    console.error('生成WireGuard密钥对失败:', error);
    throw new Error('生成WireGuard密钥对失败: ' + error.message);
  }
};

/**
 * 生成预共享密钥
 * @returns {String} 预共享密钥
 */
const generatePresharedKey = () => {
  try {
    // 使用nacl生成随机数据
    const keyData = nacl.randomBytes(32);
    return util.encodeBase64(keyData);
  } catch (error) {
    console.error('生成WireGuard预共享密钥失败:', error);
    throw new Error('生成WireGuard预共享密钥失败: ' + error.message);
  }
};

/**
 * 生成WireGuard客户端配置文件
 * @param {Object} config 接口配置
 * @param {Object} peer 对等点配置
 * @param {Object} options 额外选项（DNS等）
 * @returns {String} 生成的配置文件内容
 */
const generateClientConfig = (config, peer, options = {}) => {
  try {
    const dns = options.dns || '8.8.8.8, 8.8.4.4'; // 使用传入的DNS设置或默认值
    const endpoint = options.serverAddress ? 
                    `${options.serverAddress}:${options.serverPort || config.listenPort}` : 
                    (config.endpoint || `${config.routerIp}:${config.listenPort}`);
    
    // 检查私钥是否有FAKE_前缀，如果有则抛出错误
    if (peer.privateKey && peer.privateKey.startsWith('FAKE_')) {
      throw new Error('无法使用临时生成的假私钥生成配置文件。这个对等点是从RouterOS导入的，不包含有效的私钥。');
    }
    
    // 生成配置文件内容
    const configContent = `[Interface]
PrivateKey = ${peer.privateKey}
Address = ${peer.allowedIPs}
DNS = ${dns}

[Peer]
PublicKey = ${config.publicKey}
${peer.presharedKey ? `PresharedKey = ${peer.presharedKey}` : ''}
AllowedIPs = 0.0.0.0/0
Endpoint = ${endpoint}
PersistentKeepalive = ${peer.persistentKeepalive || 25}
`;
    
    return configContent;
  } catch (error) {
    console.error('生成WireGuard客户端配置失败:', error);
    throw new Error('生成WireGuard客户端配置失败');
  }
};

/**
 * 保存WireGuard客户端配置文件
 * @param {String} configContent 配置文件内容
 * @param {String} fileName 文件名
 * @returns {String} 保存的文件路径
 */
const saveClientConfig = (configContent, fileName) => {
  try {
    // 创建临时目录
    const tempDir = path.join(os.tmpdir(), 'wireguard-configs');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    
    // 保存配置文件
    const filePath = path.join(tempDir, `${fileName}.conf`);
    fs.writeFileSync(filePath, configContent);
    
    // 确保返回绝对路径
    return path.resolve(filePath);
  } catch (error) {
    console.error('保存WireGuard客户端配置失败:', error);
    throw new Error('保存WireGuard客户端配置失败');
  }
};

module.exports = {
  generateKeyPair,
  generatePresharedKey,
  generateClientConfig,
  saveClientConfig
}; 
const fs = require('fs');
const path = require('path');

// 数据库配置文件路径
const dbConfigFile = path.join(__dirname, 'config', 'database.js');

// 读取当前配置内容
const currentConfig = fs.readFileSync(dbConfigFile, 'utf8');

// 替换数据库路径配置
const newConfig = currentConfig.replace(
  /storage: path\.join\(__dirname, ['"](.+)['"]\)/,
  "storage: path.join(__dirname, '../database.sqlite')"
);

// 写入新的配置
fs.writeFileSync(dbConfigFile, newConfig);

console.log('数据库路径已更新'); 
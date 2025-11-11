/**
 * 简化的数据库初始化脚本
 */

const fs = require('fs');
const path = require('path');

console.log('📁 创建必要的目录...');

// 创建目录
const dirs = [
    './database',
    './uploads',
    './uploads/thumbnails',
    './uploads/medium',
    './uploads/original'
];

dirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        console.log(`✅ 创建目录: ${dir}`);
    } else {
        console.log(`📁 目录已存在: ${dir}`);
    }
});

console.log('\n🎯 手动初始化完成！');
console.log('📝 下一步：');
console.log('1. 启动服务器: npm start');
console.log('2. 数据库将在第一次API调用时自动创建');
console.log('3. 尝试上传一张照片来初始化数据库');
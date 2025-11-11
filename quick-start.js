/**
 * 快速启动脚本 - 避免SQLite编译问题
 */
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 快速启动照片星球...');

// 检查必要的目录
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
    }
});

// 创建简化的package.json（如果不存在）
const packageJson = {
    "name": "photo-sphere",
    "version": "2.0.0",
    "description": "3D照片星球",
    "main": "server/app.js",
    "scripts": {
        "start": "node server/app.js",
        "dev": "node server/app.js"
    },
    "dependencies": {
        "express": "^4.18.2",
        "multer": "^1.4.5-lts.1",
        "cors": "^2.8.5",
        "helmet": "^7.0.0",
        "compression": "^1.7.4",
        "express-rate-limit": "^6.7.0",
        "express-validator": "^7.0.1",
        "dotenv": "^16.1.4",
        "uuid": "^9.0.0",
        "jsonwebtoken": "^9.0.0",
        "bcryptjs": "^2.4.3"
    }
};

if (!fs.existsSync('./package.json')) {
    fs.writeFileSync('./package.json', JSON.stringify(packageJson, null, 2));
    console.log('📦 创建package.json');
}

// 安装基本依赖（不包括sharp和sqlite3）
console.log('📦 安装基本依赖...');
const npmInstall = spawn('npm', ['install', '--no-optional'], {
    stdio: 'inherit',
    shell: true
});

npmInstall.on('close', (code) => {
    if (code === 0) {
        console.log('✅ 依赖安装完成');
    } else {
        console.log('⚠️  依赖安装可能有问题，但继续启动');
    }
    
    // 启动服务器
    startServer();
});

function startServer() {
    console.log('🌟 启动服务器...');
    
    const server = spawn('node', ['server/app.js'], {
        stdio: 'inherit',
        shell: true,
        env: {
            ...process.env,
            PORT: 3000,
            NODE_ENV: 'development'
        }
    });
    
    server.on('close', (code) => {
        console.log(`服务器停止 (退出码: ${code})`);
    });
    
    // 显示信息
    setTimeout(() => {
        console.log('\n🎯 服务器信息:');
        console.log('📍 主页: http://localhost:3000');
        console.log('📸 上传: http://localhost:3000/upload.html');
        console.log('💡 安全问题答案: 一月、宝宝、宇宙');
        console.log('🔄 按 Ctrl+C 停止服务器\n');
    }, 2000);
}
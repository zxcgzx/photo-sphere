/**
 * 启动服务器脚本
 * 如果依赖包未安装，会先尝试安装
 */

const { spawn } = require('child_process');
const fs = require('fs');

console.log('🚀 启动照片星球服务器...');

// 检查node_modules是否存在
if (!fs.existsSync('./node_modules')) {
    console.log('📦 正在安装依赖包...');
    console.log('⚠️  注意：sqlite3可能需要编译工具，如果失败请手动安装');
    
    const npmInstall = spawn('npm', ['install'], {
        stdio: 'inherit',
        shell: true
    });
    
    npmInstall.on('close', (code) => {
        if (code === 0) {
            console.log('✅ 依赖安装完成，启动服务器...');
            startServer();
        } else {
            console.log('❌ 依赖安装失败，尝试启动服务器...');
            startServer();
        }
    });
} else {
    startServer();
}

function startServer() {
    console.log('🌟 启动服务器...');
    
    const server = spawn('node', ['server/app.js'], {
        stdio: 'inherit',
        shell: true,
        env: {
            ...process.env,
            PORT: process.env.PORT || 3000,
            NODE_ENV: process.env.NODE_ENV || 'development'
        }
    });
    
    server.on('close', (code) => {
        console.log(`\n服务器已停止 (退出码: ${code})`);
    });
    
    // 显示启动信息
    setTimeout(() => {
        console.log('\n🎯 服务器信息:');
        console.log(`📍 主页: http://localhost:3000`);
        console.log(`📸 上传: http://localhost:3000/upload.html`);
        console.log(`🔧 测试认证: http://localhost:3000/test-auth.html`);
        console.log('\n💡 安全问题答案: 一月、宝宝、宇宙');
        console.log('🔄 按 Ctrl+C 停止服务器\n');
    }, 2000);
}
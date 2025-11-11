#!/usr/bin/env node

/**
 * 生成 PWA 所需资源的脚本
 * 生成各种尺寸的图标和截图
 */

const { createCanvas, loadImage } = require('canvas');
const fs = require('fs');
const path = require('path');

// 确保目录存在
const iconsDir = path.join(__dirname, '../public/icons');
const screenshotsDir = path.join(__dirname, '../public/screenshots');

[iconsDir, screenshotsDir].forEach(dir => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
});

// 生成纯色背景图标
function generateIcon(size, color = '#667eea') {
    const canvas = createCanvas(size, size);
    const ctx = canvas.getContext('2d');
    
    // 背景渐变
    const gradient = ctx.createRadialGradient(size/2, size/2, 0, size/2, size/2, size/2);
    gradient.addColorStop(0, '#667eea');
    gradient.addColorStop(1, '#764ba2');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);
    
    // 添加心形图案
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    drawHeart(ctx, size/2, size/2, size * 0.3);
    
    // 添加星星装饰
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    for (let i = 0; i < 5; i++) {
        const angle = (i * 72) * Math.PI / 180;
        const x = size/2 + Math.cos(angle) * size * 0.4;
        const y = size/2 + Math.sin(angle) * size * 0.4;
        drawStar(ctx, x, y, size * 0.05);
    }
    
    const buffer = canvas.toBuffer('image/png');
    fs.writeFileSync(path.join(iconsDir, `icon-${size}x${size}.png`), buffer);
    console.log(`✓ 生成图标: icon-${size}x${size}.png`);
}

// 绘制心形
function drawHeart(ctx, x, y, size) {
    ctx.beginPath();
    ctx.moveTo(x, y + size/4);
    ctx.bezierCurveTo(x - size/2, y - size/2, x - size, y + size/3, x, y + size);
    ctx.bezierCurveTo(x + size, y + size/3, x + size/2, y - size/2, x, y + size/4);
    ctx.fill();
}

// 绘制星星
function drawStar(ctx, x, y, size) {
    ctx.beginPath();
    for (let i = 0; i < 5; i++) {
        const angle = (i * 144 - 90) * Math.PI / 180;
        const px = x + Math.cos(angle) * size;
        const py = y + Math.sin(angle) * size;
        if (i === 0) {
            ctx.moveTo(px, py);
        } else {
            ctx.lineTo(px, py);
        }
    }
    ctx.closePath();
    ctx.fill();
}

// 生成截图
function generateScreenshot(width, height, name) {
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');
    
    // 背景渐变
    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, '#0a0a2a');
    gradient.addColorStop(0.5, '#1a1a3a');
    gradient.addColorStop(1, '#2a1a4a');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
    
    // 添加星星
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    for (let i = 0; i < 50; i++) {
        const x = Math.random() * width;
        const y = Math.random() * height;
        const radius = Math.random() * 2;
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fill();
    }
    
    // 添加标题
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.font = `bold ${Math.min(width, height) * 0.05}px Arial`;
    ctx.textAlign = 'center';
    ctx.fillText('我们的小宇宙', width/2, height/2);
    
    ctx.font = `${Math.min(width, height) * 0.03}px Arial`;
    ctx.fillText('3D照片星球展示系统', width/2, height/2 + 40);
    
    const buffer = canvas.toBuffer('image/png');
    fs.writeFileSync(path.join(screenshotsDir, `${name}.png`), buffer);
    console.log(`✓ 生成截图: ${name}.png`);
}

// 生成所有图标
console.log('🎨 开始生成 PWA 资源...\n');

const iconSizes = [72, 96, 128, 144, 152, 192, 384, 512];
iconSizes.forEach(size => generateIcon(size));

// 生成特殊用途图标
generateIcon(96, '#4f46e5'); // 上传图标
generateIcon(96, '#10b981'); // 统计图标
generateIcon(24, '#ef4444'); // 关闭图标
generateIcon(24, '#3b82f6'); // 查看图标

// 生成截图
generateScreenshot(1280, 720, 'desktop-1');
generateScreenshot(390, 844, 'mobile-1');

console.log('\n✅ PWA 资源生成完成！');
console.log(`📁 图标保存在: ${iconsDir}`);
console.log(`📁 截图保存在: ${screenshotsDir}`);
/**
 * 极简测试服务器 - 仅使用Node.js内置模块
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const JsonDatabase = require('./server/database/json-db');

const PORT = 3000;

// MIME类型映射
const mimeTypes = {
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'application/javascript',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.webp': 'image/webp'
};

// 创建必要目录
function ensureDirectories() {
    const dirs = ['./uploads', './database'];
    dirs.forEach(dir => {
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
            console.log(`✅ 创建目录: ${dir}`);
        }
    });
}

// 处理静态文件
function serveStaticFile(res, filePath) {
    const fullPath = path.join(__dirname, filePath);
    
    fs.readFile(fullPath, (err, data) => {
        if (err) {
            res.writeHead(404, { 'Content-Type': 'text/plain' });
            res.end('File not found');
            return;
        }
        
        const ext = path.extname(filePath);
        const contentType = mimeTypes[ext] || 'application/octet-stream';
        
        res.writeHead(200, { 'Content-Type': contentType });
        res.end(data);
    });
}

// 处理API请求
async function handleAPI(req, res, pathname) {
    res.setHeader('Content-Type', 'application/json');
    
    try {
        if (pathname === '/api/health') {
            res.writeHead(200);
            res.end(JSON.stringify({
                status: 'ok',
                timestamp: new Date().toISOString(),
                version: '2.0.0-minimal'
            }));
            return;
        }
        
        if (pathname === '/api/photos') {
            const db = new JsonDatabase();
            const photos = await db.getAllPhotos();
            
            const response = {
                success: true,
                data: {
                    photos: photos.map(photo => ({
                        id: photo.id,
                        filename: photo.filename,
                        originalFilename: photo.originalFilename,
                        title: photo.title,
                        description: photo.description,
                        paths: {
                            original: photo.filePath,
                            thumbnail: photo.thumbnailPath || photo.filePath,
                            medium: photo.mediumPath || photo.filePath
                        },
                        dimensions: {
                            width: photo.width || 800,
                            height: photo.height || 600
                        },
                        fileSize: photo.fileSize,
                        mimeType: photo.mimeType,
                        position: {
                            x: photo.positionX,
                            y: photo.positionY,
                            z: photo.positionZ
                        },
                        rotation: { x: 0, y: 0, z: 0 },
                        scaleFactor: 1.0,
                        sortOrder: 0,
                        takenAt: photo.takenAt,
                        uploadedBy: photo.uploadedBy,
                        uploaderName: null,
                        createdAt: photo.uploaded_at,
                        updatedAt: photo.uploaded_at
                    })),
                    pagination: {
                        limit: 100,
                        offset: 0,
                        total: photos.length
                    },
                    stats: {
                        totalPhotos: photos.length,
                        totalSize: 0,
                        totalSizeMB: 0
                    }
                }
            };
            
            res.writeHead(200);
            res.end(JSON.stringify(response));
            return;
        }
        
        // 404 for other API routes
        res.writeHead(404);
        res.end(JSON.stringify({
            success: false,
            message: 'API接口未找到'
        }));
        
    } catch (error) {
        console.error('API错误:', error);
        res.writeHead(500);
        res.end(JSON.stringify({
            success: false,
            message: '服务器内部错误'
        }));
    }
}

// 创建服务器
const server = http.createServer(async (req, res) => {
    const parsedUrl = url.parse(req.url, true);
    const pathname = parsedUrl.pathname;
    
    // API路由
    if (pathname.startsWith('/api/')) {
        await handleAPI(req, res, pathname);
        return;
    }
    
    // 静态文件路由
    if (pathname === '/') {
        serveStaticFile(res, 'index.html');
    } else if (pathname === '/upload.html') {
        serveStaticFile(res, 'upload.html');
    } else if (pathname.startsWith('/uploads/')) {
        serveStaticFile(res, pathname);
    } else {
        // 尝试作为静态文件
        serveStaticFile(res, pathname);
    }
});

// 启动服务器
server.listen(PORT, () => {
    console.log('\n🌌 "我们的小宇宙"极简服务器启动成功！');
    console.log(`🚀 服务器运行在 http://localhost:${PORT}`);
    console.log(`📸 上传页面: http://localhost:${PORT}/upload.html`);
    console.log(`📊 API接口: http://localhost:${PORT}/api`);
    console.log('\n💡 提示：');
    console.log('- 这是极简版本，仅支持查看功能');
    console.log('- 上传功能需要完整版服务器');
    console.log('- 数据使用JSON文件存储\n');
    
    ensureDirectories();
});

// 优雅关闭
process.on('SIGTERM', () => {
    console.log('🛑 收到终止信号，正在关闭服务器...');
    server.close(() => {
        console.log('服务器已关闭');
        process.exit(0);
    });
});

process.on('SIGINT', () => {
    console.log('\n🛑 收到中断信号，正在关闭服务器...');
    server.close(() => {
        console.log('服务器已关闭');
        process.exit(0);
    });
});
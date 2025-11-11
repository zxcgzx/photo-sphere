/**
 * 简化的服务器 - 避免依赖问题
 */
const express = require('express');
const path = require('path');
const fs = require('fs');

const JsonDatabase = require('./server/database/json-db');

const app = express();
const PORT = 3000;

// 中间件
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 静态文件服务
app.use(express.static(path.join(__dirname, '.')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// 简化的上传路由
try {
    const uploadRoutes = require('./server/routes/upload-simple');
    app.use('/api/upload', uploadRoutes);
} catch (error) {
    console.log('⚠️  上传路由加载失败，使用基本上传功能');
}

// 照片API
app.get('/api/photos', async (req, res) => {
    try {
        const db = new JsonDatabase();
        const photos = await db.getAllPhotos();
        
        res.json({
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
        });
    } catch (error) {
        console.error('获取照片失败:', error);
        res.status(500).json({
            success: false,
            message: '获取照片失败'
        });
    }
});

// 主页
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// 健康检查
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        version: '2.0.0-simple'
    });
});

// 404处理
app.use((req, res) => {
    res.status(404).json({
        error: '页面未找到',
        message: '请检查URL是否正确'
    });
});

// 启动服务器
app.listen(PORT, () => {
    console.log('\n🌌 "我们的小宇宙"简化服务器启动成功！');
    console.log(`🚀 服务器运行在 http://localhost:${PORT}`);
    console.log(`📸 上传页面: http://localhost:${PORT}/upload.html`);
    console.log(`📊 API接口: http://localhost:${PORT}/api`);
    console.log('\n💡 提示：');
    console.log('- 如需完整功能，请安装所有依赖包');
    console.log('- 当前版本不包含图片压缩功能');
    console.log('- 数据使用JSON文件存储\n');
    
    // 确保必要目录存在
    const dirs = ['./uploads', './database'];
    dirs.forEach(dir => {
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
            console.log(`✅ 创建目录: ${dir}`);
        }
    });
});

module.exports = app;
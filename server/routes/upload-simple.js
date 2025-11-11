/**
 * 简化的上传路由 - 不依赖Sharp
 */
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const { v4: uuidv4 } = require('uuid');

const JsonDatabase = require('../database/json-db');

const router = express.Router();

// 配置multer存储到磁盘
const storage = multer.diskStorage({
    destination: async (req, file, cb) => {
        const uploadsDir = path.join(__dirname, '../../uploads');
        try {
            await fs.mkdir(uploadsDir, { recursive: true });
            cb(null, uploadsDir);
        } catch (error) {
            cb(error);
        }
    },
    filename: (req, file, cb) => {
        const uniqueName = `${uuidv4()}${path.extname(file.originalname)}`;
        cb(null, uniqueName);
    }
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB
        files: 10
    },
    fileFilter: (req, file, cb) => {
        const allowedMimes = [
            'image/jpeg',
            'image/jpg', 
            'image/png',
            'image/webp',
            'image/gif'
        ];
        
        if (allowedMimes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error(`不支持的文件类型: ${file.mimetype}`), false);
        }
    }
});

// 计算球面位置
function calculateSpherePosition(index) {
    const phi = Math.acos(-1 + (2 * index) / 100);
    const theta = Math.sqrt(100 * Math.PI) * phi;
    const radius = 50;
    
    return {
        x: radius * Math.cos(theta) * Math.sin(phi),
        y: radius * Math.cos(phi),
        z: radius * Math.sin(theta) * Math.sin(phi)
    };
}

/**
 * 简化的照片上传 - 不进行压缩
 */
router.post('/photos', upload.array('photos', 10), async (req, res) => {
    try {
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({
                success: false,
                message: '没有检测到上传的文件'
            });
        }
        
        const uploadedPhotos = [];
        const db = new JsonDatabase();
        
        for (let i = 0; i < req.files.length; i++) {
            const file = req.files[i];
            
            // 计算球面位置
            const spherePosition = calculateSpherePosition(i);
            
            // 构建文件路径
            const filePath = `/uploads/${file.filename}`;
            
            // 保存到数据库
            const photoData = {
                filename: file.filename,
                originalFilename: file.originalname,
                filePath: filePath,
                thumbnailPath: filePath, // 暂时使用原图
                mediumPath: filePath, // 暂时使用原图
                fileSize: file.size,
                mimeType: file.mimetype,
                width: 800, // 默认值
                height: 600, // 默认值
                title: req.body.title || file.originalname,
                description: req.body.description || '',
                takenAt: new Date().toISOString(),
                uploadedBy: req.body.uploadedBy || null,
                uploadIp: req.ip,
                positionX: spherePosition.x,
                positionY: spherePosition.y,
                positionZ: spherePosition.z
            };
            
            const photoResult = await db.addPhoto(photoData);
            
            uploadedPhotos.push({
                id: photoResult.id,
                filename: file.filename,
                originalName: file.originalname,
                size: file.size,
                paths: {
                    original: filePath,
                    thumbnail: filePath,
                    medium: filePath
                },
                position: spherePosition
            });
        }
        
        res.json({
            success: true,
            message: `成功上传 ${uploadedPhotos.length} 张照片`,
            data: {
                uploadedCount: uploadedPhotos.length,
                totalRequested: req.files.length,
                photos: uploadedPhotos
            }
        });
        
    } catch (error) {
        console.error('照片上传错误:', error);
        res.status(500).json({
            success: false,
            message: '照片上传失败',
            error: error.message
        });
    }
});

module.exports = router;
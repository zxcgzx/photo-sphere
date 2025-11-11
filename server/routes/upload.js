const express = require('express');
const multer = require('multer');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs').promises;
const { v4: uuidv4 } = require('uuid');
const { body, validationResult } = require('express-validator');

const JsonDatabase = require('../database/json-db');
const { extractExifData, calculateSpherePosition } = require('../utils/imageUtils');
const AuthMiddleware = require('../middleware/auth');

const router = express.Router();

// 初始化认证中间件
const authMiddleware = new AuthMiddleware();

// 配置multer存储
const storage = multer.memoryStorage(); // 使用内存存储，便于Sharp处理

const upload = multer({
  storage: storage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024, // 10MB
    files: 10 // 最多同时上传10个文件
  },
  fileFilter: (req, file, cb) => {
    // 检查文件类型
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

/**
 * 上传单个或多个照片
 * POST /api/upload/photos
 * 需要上传权限
 */
router.post('/photos', 
  authMiddleware.createUploadRateLimit(),
  authMiddleware.optionalToken, // 可选认证，兼容现有系统
  // 暂时移除严格的权限检查，以便兼容现有系统
  // authMiddleware.requirePermission('upload'),
  upload.array('photos', 10),
  [
    body('title').optional().isLength({ max: 200 }).withMessage('标题不能超过200个字符'),
    body('description').optional().isLength({ max: 1000 }).withMessage('描述不能超过1000个字符'),
    body('uploadedBy').optional().isInt().withMessage('上传者ID必须是整数')
  ],
  async (req, res) => {
    try {
      // 验证输入
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: '请求参数验证失败',
          errors: errors.array()
        });
      }
      
      // 检查是否有文件上传
      if (!req.files || req.files.length === 0) {
        return res.status(400).json({
          success: false,
          message: '没有检测到上传的文件'
        });
      }
      
      const uploadedPhotos = [];
      const db = new JsonDatabase();
      
      // 确保上传目录存在
      const uploadsDir = path.join(__dirname, '../../uploads');
      const thumbnailsDir = path.join(uploadsDir, 'thumbnails');
      const mediumDir = path.join(uploadsDir, 'medium');
      
      await fs.mkdir(uploadsDir, { recursive: true });
      await fs.mkdir(thumbnailsDir, { recursive: true });
      await fs.mkdir(mediumDir, { recursive: true });
      
      // 处理每个上传的文件
      for (const file of req.files) {
        try {
          // 生成唯一文件名
          const fileExtension = path.extname(file.originalname);
          const uniqueFilename = `${uuidv4()}${fileExtension}`;
          const webpFilename = `${uuidv4()}.webp`;
          
          // 文件路径
          const originalPath = path.join(uploadsDir, uniqueFilename);
          const thumbnailPath = path.join(thumbnailsDir, `thumb_${webpFilename}`);
          const mediumPath = path.join(mediumDir, `medium_${webpFilename}`);
          
          // 获取图片元数据
          const metadata = await sharp(file.buffer).metadata();
          
          // 提取EXIF数据
          const exifData = await extractExifData(file.buffer, metadata);
          
          // 保存原始文件
          await fs.writeFile(originalPath, file.buffer);
          
          // 生成缩略图 (300px)
          await sharp(file.buffer)
            .resize(300, 300, { 
              fit: 'inside',
              withoutEnlargement: true 
            })
            .webp({ 
              quality: 80,
              effort: 4 
            })
            .toFile(thumbnailPath);
          
          // 生成中等尺寸图片 (800px)
          await sharp(file.buffer)
            .resize(800, 800, { 
              fit: 'inside',
              withoutEnlargement: true 
            })
            .webp({ 
              quality: 85,
              effort: 4 
            })
            .toFile(mediumPath);
          
          // 计算3D球面位置
          const spherePosition = calculateSpherePosition(uploadedPhotos.length);
          
          // 保存到数据库
          const photoData = {
            filename: uniqueFilename,
            originalFilename: file.originalname,
            filePath: `/uploads/${uniqueFilename}`,
            thumbnailPath: `/uploads/thumbnails/thumb_${webpFilename}`,
            mediumPath: `/uploads/medium/medium_${webpFilename}`,
            fileSize: file.size,
            mimeType: file.mimetype,
            width: metadata.width,
            height: metadata.height,
            title: req.body.title || file.originalname,
            description: req.body.description || '',
            takenAt: exifData.dateTime || new Date().toISOString(),
            uploadedBy: req.body.uploadedBy || null,
            uploadIp: req.ip,
            positionX: spherePosition.x,
            positionY: spherePosition.y,
            positionZ: spherePosition.z
          };
          
          // 合并EXIF数据到照片数据
          const photoWithExif = {
            ...photoData,
            exif: exifData
          };
          
          const photoResult = await db.addPhoto(photoWithExif);
          
          uploadedPhotos.push({
            id: photoResult.id,
            filename: uniqueFilename,
            originalName: file.originalname,
            size: file.size,
            dimensions: {
              width: metadata.width,
              height: metadata.height
            },
            paths: {
              original: photoData.filePath,
              thumbnail: photoData.thumbnailPath,
              medium: photoData.mediumPath
            },
            position: spherePosition,
            exif: exifData
          });
          
        } catch (fileError) {
          console.error(`处理文件 ${file.originalname} 时发生错误:`, fileError);
          // 继续处理其他文件，不中断整个上传过程
        }
      }
      
      // JSON数据库不需要关闭连接
      
      if (uploadedPhotos.length === 0) {
        return res.status(500).json({
          success: false,
          message: '所有文件处理失败，请重试'
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
        error: process.env.NODE_ENV === 'development' ? error.message : '服务器内部错误'
      });
    }
  }
);

/**
 * 获取上传进度（WebSocket或Server-Sent Events可以用于实时进度）
 * GET /api/upload/progress/:sessionId
 */
router.get('/progress/:sessionId', (req, res) => {
  // 这里可以实现实时上传进度跟踪
  // 目前返回基本信息
  res.json({
    success: true,
    sessionId: req.params.sessionId,
    progress: 100, // 实际实现中应该是真实进度
    status: 'completed'
  });
});

/**
 * 批量删除上传的照片
 * DELETE /api/upload/photos
 */
router.delete('/photos', 
  [
    body('photoIds').isArray().withMessage('photoIds必须是数组'),
    body('photoIds.*').isInt().withMessage('每个照片ID必须是整数')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: '请求参数验证失败',
          errors: errors.array()
        });
      }
      
      const { photoIds } = req.body;
      const db = new JsonDatabase();
      
      let deletedCount = 0;
      for (const photoId of photoIds) {
        try {
          const result = await db.deletePhoto(photoId);
          if (result) {
            deletedCount++;
          }
        } catch (error) {
          console.error(`删除照片 ${photoId} 失败:`, error);
        }
      }
      
      res.json({
        success: true,
        message: `成功删除 ${deletedCount} 张照片`,
        data: {
          deletedCount,
          requestedCount: photoIds.length
        }
      });
      
    } catch (error) {
      console.error('批量删除照片错误:', error);
      res.status(500).json({
        success: false,
        message: '删除照片失败',
        error: process.env.NODE_ENV === 'development' ? error.message : '服务器内部错误'
      });
    }
  }
);

/**
 * 获取上传统计信息
 * GET /api/upload/stats
 */
router.get('/stats', async (req, res) => {
  try {
    const db = new JsonDatabase();
    const stats = await db.getStats();
    
    res.json({
      success: true,
      data: {
        totalPhotos: stats.totalPhotos || 0,
        totalSize: 0, // 可以后续计算
        totalSizeMB: 0,
        averageSize: 0,
        averageSizeMB: 0,
        firstUpload: null,
        lastUpload: stats.lastUpload
      }
    });
    
  } catch (error) {
    console.error('获取上传统计失败:', error);
    res.status(500).json({
      success: false,
      message: '获取统计信息失败'
    });
  }
});

// 错误处理中间件
router.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    let message = '文件上传错误';
    
    switch (error.code) {
      case 'LIMIT_FILE_SIZE':
        message = `文件大小超过限制（最大 ${Math.round(parseInt(process.env.MAX_FILE_SIZE) / 1024 / 1024)}MB）`;
        break;
      case 'LIMIT_FILE_COUNT':
        message = '文件数量超过限制（最多10个文件）';
        break;
      case 'LIMIT_UNEXPECTED_FILE':
        message = '意外的文件字段';
        break;
    }
    
    return res.status(400).json({
      success: false,
      message,
      error: error.code
    });
  }
  
  // 其他错误
  console.error('上传路由错误:', error);
  res.status(500).json({
    success: false,
    message: '服务器内部错误',
    error: process.env.NODE_ENV === 'development' ? error.message : undefined
  });
});

module.exports = router;
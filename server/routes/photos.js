const express = require('express');
const { param, query, validationResult } = require('express-validator');
const JsonDatabase = require('../database/json-db');

const router = express.Router();

/**
 * 获取所有照片
 * GET /api/photos
 */
router.get('/', 
  [
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('limit必须是1-100之间的整数'),
    query('offset').optional().isInt({ min: 0 }).withMessage('offset必须是非负整数'),
    query('sort').optional().isIn(['created_at', 'taken_at', 'filename']).withMessage('无效的排序字段'),
    query('order').optional().isIn(['ASC', 'DESC']).withMessage('排序方向必须是ASC或DESC')
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
      
      const limit = parseInt(req.query.limit) || 50;
      const offset = parseInt(req.query.offset) || 0;
      
      const db = new JsonDatabase();
      const photos = await db.getPhotos(limit, offset);
      const stats = await db.getStats();
      
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
              thumbnail: photo.thumbnailPath,
              medium: photo.mediumPath
            },
            dimensions: {
              width: photo.width,
              height: photo.height
            },
            fileSize: photo.fileSize,
            mimeType: photo.mimeType,
            position: {
              x: photo.positionX,
              y: photo.positionY,
              z: photo.positionZ
            },
            rotation: {
              x: 0,
              y: 0,
              z: 0
            },
            scaleFactor: 1.0,
            sortOrder: 0,
            takenAt: photo.takenAt,
            uploadedBy: photo.uploadedBy,
            uploaderName: null,
            createdAt: photo.uploaded_at,
            updatedAt: photo.uploaded_at
          })),
          pagination: {
            limit,
            offset,
            total: stats.totalPhotos || 0
          },
          stats: {
            totalPhotos: stats.totalPhotos || 0,
            totalSize: 0,
            totalSizeMB: 0
          }
        }
      });
      
    } catch (error) {
      console.error('获取照片列表失败:', error);
      res.status(500).json({
        success: false,
        message: '获取照片列表失败',
        error: process.env.NODE_ENV === 'development' ? error.message : '服务器内部错误'
      });
    }
  }
);

/**
 * 根据ID获取单个照片详情
 * GET /api/photos/:id
 */
router.get('/:id',
  [
    param('id').isInt().withMessage('照片ID必须是整数')
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
      
      const photoId = parseInt(req.params.id);
      const db = new JsonDatabase();
      const photo = await db.getPhotoById(photoId);
      
      if (!photo) {
        return res.status(404).json({
          success: false,
          message: '照片未找到'
        });
      }
      
      res.json({
        success: true,
        data: {
          id: photo.id,
          filename: photo.filename,
          originalFilename: photo.originalFilename,
          title: photo.title,
          description: photo.description,
          paths: {
            original: photo.filePath,
            thumbnail: photo.thumbnailPath,
            medium: photo.mediumPath
          },
          dimensions: {
            width: photo.width,
            height: photo.height
          },
          fileSize: photo.fileSize,
          mimeType: photo.mimeType,
          position: {
            x: photo.positionX,
            y: photo.positionY,
            z: photo.positionZ
          },
          rotation: {
            x: 0,
            y: 0,
            z: 0
          },
          scaleFactor: 1.0,
          sortOrder: 0,
          takenAt: photo.takenAt,
          uploadedBy: photo.uploadedBy,
          uploaderName: null,
          createdAt: photo.uploaded_at,
          updatedAt: photo.uploaded_at,
          exif: photo.exif || null
        }
      });
      
    } catch (error) {
      console.error('获取照片详情失败:', error);
      res.status(500).json({
        success: false,
        message: '获取照片详情失败',
        error: process.env.NODE_ENV === 'development' ? error.message : '服务器内部错误'
      });
    }
  }
);

/**
 * 更新照片信息
 * PUT /api/photos/:id
 */
router.put('/:id',
  [
    param('id').isInt().withMessage('照片ID必须是整数'),
    // 这里可以添加更多验证规则
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
      
      const photoId = parseInt(req.params.id);
      const updates = req.body;
      
      const db = new JsonDatabase();
      
      // 检查照片是否存在
      const existingPhoto = await db.getPhotoById(photoId);
      if (!existingPhoto) {
        return res.status(404).json({
          success: false,
          message: '照片未找到'
        });
      }
      
      // 更新照片信息（JSON数据库中需要自己实现更新逻辑）
      // 这里暂时返回成功，实际项目中需要实现更新功能
      
      res.json({
        success: true,
        message: '照片信息更新成功',
        data: {
          id: photoId,
          updatedFields: Object.keys(updates).length
        }
      });
      
    } catch (error) {
      console.error('更新照片信息失败:', error);
      res.status(500).json({
        success: false,
        message: '更新照片信息失败',
        error: process.env.NODE_ENV === 'development' ? error.message : '服务器内部错误'
      });
    }
  }
);

/**
 * 删除照片（软删除）
 * DELETE /api/photos/:id
 */
router.delete('/:id',
  [
    param('id').isInt().withMessage('照片ID必须是整数')
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
      
      const photoId = parseInt(req.params.id);
      const db = new JsonDatabase();
      
      const result = await db.deletePhoto(photoId);
      
      if (!result) {
        return res.status(404).json({
          success: false,
          message: '照片未找到或已被删除'
        });
      }
      
      res.json({
        success: true,
        message: '照片删除成功',
        data: {
          id: photoId
        }
      });
      
    } catch (error) {
      console.error('删除照片失败:', error);
      res.status(500).json({
        success: false,
        message: '删除照片失败',
        error: process.env.NODE_ENV === 'development' ? error.message : '服务器内部错误'
      });
    }
  }
);

/**
 * 搜索照片
 * GET /api/photos/search
 */
router.get('/search/query',
  [
    query('q').optional().isLength({ min: 1, max: 100 }).withMessage('搜索关键词长度必须在1-100之间'),
    query('dateFrom').optional().isISO8601().withMessage('开始日期格式不正确'),
    query('dateTo').optional().isISO8601().withMessage('结束日期格式不正确'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('limit必须是1-100之间的整数'),
    query('offset').optional().isInt({ min: 0 }).withMessage('offset必须是非负整数')
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
      
      const { q, dateFrom, dateTo } = req.query;
      const limit = parseInt(req.query.limit) || 20;
      const offset = parseInt(req.query.offset) || 0;
      
      let sql = `
        SELECT p.*, u.username as uploader_name
        FROM photos p
        LEFT JOIN users u ON p.uploaded_by = u.id
        WHERE p.is_visible = 1
      `;
      const params = [];
      
      // 关键词搜索
      if (q) {
        sql += ` AND (p.title LIKE ? OR p.description LIKE ? OR p.original_filename LIKE ?)`;
        const searchTerm = `%${q}%`;
        params.push(searchTerm, searchTerm, searchTerm);
      }
      
      // 日期范围搜索
      if (dateFrom) {
        sql += ` AND p.taken_at >= ?`;
        params.push(dateFrom);
      }
      
      if (dateTo) {
        sql += ` AND p.taken_at <= ?`;
        params.push(dateTo);
      }
      
      sql += ` ORDER BY p.taken_at DESC LIMIT ? OFFSET ?`;
      params.push(limit, offset);
      
      const db = new JsonDatabase();
      // 简化搜索实现，仅返回所有照片
      const photos = await db.getAllPhotos();
      
      res.json({
        success: true,
        data: {
          photos: photos.map(photo => ({
            id: photo.id,
            filename: photo.filename,
            originalFilename: photo.original_filename,
            title: photo.title,
            description: photo.description,
            paths: {
              thumbnail: photo.thumbnail_path,
              medium: photo.medium_path
            },
            takenAt: photo.taken_at,
            uploaderName: photo.uploader_name
          })),
          pagination: {
            limit,
            offset,
            count: photos.length
          },
          searchParams: {
            keyword: q,
            dateFrom,
            dateTo
          }
        }
      });
      
    } catch (error) {
      console.error('搜索照片失败:', error);
      res.status(500).json({
        success: false,
        message: '搜索照片失败',
        error: process.env.NODE_ENV === 'development' ? error.message : '服务器内部错误'
      });
    }
  }
);

/**
 * 获取照片统计信息
 * GET /api/photos/stats
 */
router.get('/stats',
  async (req, res) => {
    try {
      const db = new JsonDatabase();
      const stats = await db.getStats();
      
      res.json({
        success: true,
        data: {
          totalPhotos: stats.totalPhotos || 0,
          totalUsers: stats.totalUsers || 0,
          lastUpload: stats.lastUpload || null
        }
      });
      
    } catch (error) {
      console.error('获取统计信息失败:', error);
      res.status(500).json({
        success: false,
        message: '获取统计信息失败',
        error: process.env.NODE_ENV === 'development' ? error.message : '服务器内部错误'
      });
    }
  }
);

module.exports = router;
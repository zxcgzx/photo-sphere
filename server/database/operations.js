const { getDatabase } = require('./init');

/**
 * 数据库操作基类
 */
class DatabaseOperations {
  constructor() {
    this.db = null;
  }
  
  /**
   * 获取数据库连接
   */
  getConnection() {
    if (!this.db) {
      this.db = getDatabase();
    }
    return this.db;
  }
  
  /**
   * 执行查询
   */
  query(sql, params = []) {
    return new Promise((resolve, reject) => {
      const db = this.getConnection();
      db.all(sql, params, (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }
  
  /**
   * 执行单行查询
   */
  queryOne(sql, params = []) {
    return new Promise((resolve, reject) => {
      const db = this.getConnection();
      db.get(sql, params, (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row);
        }
      });
    });
  }
  
  /**
   * 执行插入/更新/删除操作
   */
  run(sql, params = []) {
    return new Promise((resolve, reject) => {
      const db = this.getConnection();
      db.run(sql, params, function(err) {
        if (err) {
          reject(err);
        } else {
          resolve({
            id: this.lastID,
            changes: this.changes
          });
        }
      });
    });
  }
  
  /**
   * 执行事务
   */
  transaction(operations) {
    return new Promise((resolve, reject) => {
      const db = this.getConnection();
      
      db.serialize(() => {
        db.run('BEGIN TRANSACTION');
        
        try {
          const results = [];
          operations.forEach(({ sql, params }) => {
            db.run(sql, params, function(err) {
              if (err) {
                db.run('ROLLBACK');
                reject(err);
                return;
              }
              results.push({
                id: this.lastID,
                changes: this.changes
              });
            });
          });
          
          db.run('COMMIT', (err) => {
            if (err) {
              reject(err);
            } else {
              resolve(results);
            }
          });
          
        } catch (error) {
          db.run('ROLLBACK');
          reject(error);
        }
      });
    });
  }
  
  /**
   * 关闭数据库连接
   */
  close() {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }
}

/**
 * 照片数据库操作类
 */
class PhotoOperations extends DatabaseOperations {
  
  /**
   * 创建新照片记录
   */
  async createPhoto(photoData) {
    const {
      filename,
      originalFilename,
      filePath,
      thumbnailPath,
      mediumPath,
      fileSize,
      mimeType,
      width,
      height,
      title,
      description,
      takenAt,
      uploadedBy,
      uploadIp,
      positionX,
      positionY,
      positionZ
    } = photoData;
    
    const sql = `
      INSERT INTO photos (
        filename, original_filename, file_path, thumbnail_path, medium_path,
        file_size, mime_type, width, height, title, description, taken_at,
        uploaded_by, upload_ip, position_x, position_y, position_z
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    const params = [
      filename, originalFilename, filePath, thumbnailPath, mediumPath,
      fileSize, mimeType, width, height, title, description, takenAt,
      uploadedBy, uploadIp, positionX, positionY, positionZ
    ];
    
    return this.run(sql, params);
  }
  
  /**
   * 获取所有照片
   */
  async getAllPhotos(limit = 100, offset = 0) {
    const sql = `
      SELECT p.*, u.username as uploader_name
      FROM photos p
      LEFT JOIN users u ON p.uploaded_by = u.id
      WHERE p.is_visible = 1
      ORDER BY p.created_at DESC
      LIMIT ? OFFSET ?
    `;
    
    return this.query(sql, [limit, offset]);
  }
  
  /**
   * 根据ID获取照片
   */
  async getPhotoById(id) {
    const sql = `
      SELECT p.*, u.username as uploader_name
      FROM photos p
      LEFT JOIN users u ON p.uploaded_by = u.id
      WHERE p.id = ? AND p.is_visible = 1
    `;
    
    return this.queryOne(sql, [id]);
  }
  
  /**
   * 更新照片信息
   */
  async updatePhoto(id, updates) {
    const allowedFields = [
      'title', 'description', 'position_x', 'position_y', 'position_z',
      'rotation_x', 'rotation_y', 'rotation_z', 'scale_factor', 'sort_order'
    ];
    
    const fields = [];
    const values = [];
    
    Object.keys(updates).forEach(key => {
      if (allowedFields.includes(key)) {
        fields.push(`${key} = ?`);
        values.push(updates[key]);
      }
    });
    
    if (fields.length === 0) {
      throw new Error('没有有效的更新字段');
    }
    
    fields.push('updated_at = CURRENT_TIMESTAMP');
    values.push(id);
    
    const sql = `UPDATE photos SET ${fields.join(', ')} WHERE id = ?`;
    
    return this.run(sql, values);
  }
  
  /**
   * 删除照片（软删除）
   */
  async deletePhoto(id) {
    const sql = `
      UPDATE photos 
      SET is_visible = 0, updated_at = CURRENT_TIMESTAMP 
      WHERE id = ?
    `;
    
    return this.run(sql, [id]);
  }
  
  /**
   * 获取照片统计信息
   */
  async getPhotoStats() {
    const sql = `
      SELECT 
        COUNT(*) as total_photos,
        SUM(file_size) as total_size,
        MIN(created_at) as first_upload,
        MAX(created_at) as last_upload,
        AVG(file_size) as avg_size
      FROM photos 
      WHERE is_visible = 1
    `;
    
    return this.queryOne(sql);
  }
}

/**
 * EXIF数据操作类
 */
class ExifOperations extends DatabaseOperations {
  
  /**
   * 保存EXIF数据
   */
  async saveExifData(photoId, exifData) {
    const {
      cameraMake,
      cameraModel,
      lensModel,
      focalLength,
      aperture,
      shutterSpeed,
      iso,
      flashUsed,
      gpsLatitude,
      gpsLongitude,
      gpsAltitude,
      orientation,
      colorSpace,
      whiteBalance,
      exposureMode,
      meteringMode,
      rawExif
    } = exifData;
    
    const sql = `
      INSERT INTO photo_exif (
        photo_id, camera_make, camera_model, lens_model, focal_length,
        aperture, shutter_speed, iso, flash_used, gps_latitude,
        gps_longitude, gps_altitude, orientation, color_space,
        white_balance, exposure_mode, metering_mode, raw_exif
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    const params = [
      photoId, cameraMake, cameraModel, lensModel, focalLength,
      aperture, shutterSpeed, iso, flashUsed, gpsLatitude,
      gpsLongitude, gpsAltitude, orientation, colorSpace,
      whiteBalance, exposureMode, meteringMode, JSON.stringify(rawExif)
    ];
    
    return this.run(sql, params);
  }
  
  /**
   * 获取照片的EXIF数据
   */
  async getPhotoExif(photoId) {
    const sql = `
      SELECT * FROM photo_exif WHERE photo_id = ?
    `;
    
    const result = await this.queryOne(sql, [photoId]);
    if (result && result.raw_exif) {
      try {
        result.raw_exif = JSON.parse(result.raw_exif);
      } catch (e) {
        console.error('解析EXIF数据失败:', e);
      }
    }
    
    return result;
  }
}

/**
 * 用户操作类
 */
class UserOperations extends DatabaseOperations {
  
  /**
   * 创建用户
   */
  async createUser(userData) {
    const { username, email, passwordHash, role = 'user' } = userData;
    
    const sql = `
      INSERT INTO users (username, email, password_hash, role)
      VALUES (?, ?, ?, ?)
    `;
    
    return this.run(sql, [username, email, passwordHash, role]);
  }
  
  /**
   * 根据用户名获取用户
   */
  async getUserByUsername(username) {
    const sql = `
      SELECT * FROM users WHERE username = ?
    `;
    
    return this.queryOne(sql, [username]);
  }
  
  /**
   * 更新用户登录信息
   */
  async updateUserLogin(userId, ipAddress) {
    const sql = `
      UPDATE users 
      SET last_login = CURRENT_TIMESTAMP, login_attempts = 0
      WHERE id = ?
    `;
    
    return this.run(sql, [userId]);
  }
}

/**
 * 系统配置操作类
 */
class ConfigOperations extends DatabaseOperations {
  
  /**
   * 获取配置值
   */
  async getConfig(key) {
    const sql = `SELECT value FROM system_config WHERE key = ?`;
    const result = await this.queryOne(sql, [key]);
    return result ? result.value : null;
  }
  
  /**
   * 设置配置值
   */
  async setConfig(key, value, description = '') {
    const sql = `
      INSERT OR REPLACE INTO system_config (key, value, description, updated_at)
      VALUES (?, ?, ?, CURRENT_TIMESTAMP)
    `;
    
    return this.run(sql, [key, value, description]);
  }
  
  /**
   * 获取所有配置
   */
  async getAllConfigs() {
    const sql = `SELECT * FROM system_config ORDER BY key`;
    return this.query(sql);
  }
}

module.exports = {
  DatabaseOperations,
  PhotoOperations,
  ExifOperations,
  UserOperations,
  ConfigOperations
};
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs').promises;

const DB_PATH = process.env.DATABASE_PATH || './database/photos.db';

/**
 * 初始化数据库和创建表结构
 */
async function initDatabase() {
  try {
    // 确保数据库目录存在
    const dbDir = path.dirname(DB_PATH);
    await fs.mkdir(dbDir, { recursive: true });
    
    const db = new sqlite3.Database(DB_PATH);
    
    return new Promise((resolve, reject) => {
      // 启用外键约束
      db.run('PRAGMA foreign_keys = ON');
      
      // 创建用户表
      db.run(`
        CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          username TEXT UNIQUE NOT NULL,
          email TEXT UNIQUE,
          password_hash TEXT NOT NULL,
          role TEXT DEFAULT 'user' CHECK(role IN ('admin', 'user')),
          avatar_url TEXT,
          preferences TEXT, -- JSON格式存储用户偏好设置
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          last_login DATETIME,
          login_attempts INTEGER DEFAULT 0,
          locked_until DATETIME
        )
      `, (err) => {
        if (err) return reject(err);
      });
      
      // 创建照片表
      db.run(`
        CREATE TABLE IF NOT EXISTS photos (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          filename TEXT NOT NULL,
          original_filename TEXT NOT NULL,
          file_path TEXT NOT NULL,
          thumbnail_path TEXT,
          medium_path TEXT,
          file_size INTEGER NOT NULL,
          mime_type TEXT NOT NULL,
          width INTEGER,
          height INTEGER,
          title TEXT,
          description TEXT,
          taken_at DATETIME,
          uploaded_by INTEGER,
          upload_ip TEXT,
          position_x REAL, -- 3D球面位置
          position_y REAL,
          position_z REAL,
          rotation_x REAL DEFAULT 0,
          rotation_y REAL DEFAULT 0,
          rotation_z REAL DEFAULT 0,
          scale_factor REAL DEFAULT 1.0,
          is_visible BOOLEAN DEFAULT 1,
          sort_order INTEGER DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (uploaded_by) REFERENCES users (id) ON DELETE SET NULL
        )
      `, (err) => {
        if (err) return reject(err);
      });
      
      // 创建EXIF数据表
      db.run(`
        CREATE TABLE IF NOT EXISTS photo_exif (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          photo_id INTEGER NOT NULL,
          camera_make TEXT,
          camera_model TEXT,
          lens_model TEXT,
          focal_length REAL,
          aperture REAL,
          shutter_speed TEXT,
          iso INTEGER,
          flash_used BOOLEAN,
          gps_latitude REAL,
          gps_longitude REAL,
          gps_altitude REAL,
          orientation INTEGER,
          color_space TEXT,
          white_balance TEXT,
          exposure_mode TEXT,
          metering_mode TEXT,
          raw_exif TEXT, -- 完整的EXIF数据JSON格式
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (photo_id) REFERENCES photos (id) ON DELETE CASCADE
        )
      `, (err) => {
        if (err) return reject(err);
      });
      
      // 创建标签表
      db.run(`
        CREATE TABLE IF NOT EXISTS tags (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT UNIQUE NOT NULL,
          color TEXT DEFAULT '#667eea',
          description TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `, (err) => {
        if (err) return reject(err);
      });
      
      // 创建照片标签关联表
      db.run(`
        CREATE TABLE IF NOT EXISTS photo_tags (
          photo_id INTEGER,
          tag_id INTEGER,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (photo_id, tag_id),
          FOREIGN KEY (photo_id) REFERENCES photos (id) ON DELETE CASCADE,
          FOREIGN KEY (tag_id) REFERENCES tags (id) ON DELETE CASCADE
        )
      `, (err) => {
        if (err) return reject(err);
      });
      
      // 创建相册表
      db.run(`
        CREATE TABLE IF NOT EXISTS albums (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          description TEXT,
          cover_photo_id INTEGER,
          created_by INTEGER,
          is_public BOOLEAN DEFAULT 0,
          password_protected BOOLEAN DEFAULT 0,
          password_hash TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (cover_photo_id) REFERENCES photos (id) ON DELETE SET NULL,
          FOREIGN KEY (created_by) REFERENCES users (id) ON DELETE SET NULL
        )
      `, (err) => {
        if (err) return reject(err);
      });
      
      // 创建相册照片关联表
      db.run(`
        CREATE TABLE IF NOT EXISTS album_photos (
          album_id INTEGER,
          photo_id INTEGER,
          sort_order INTEGER DEFAULT 0,
          added_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (album_id, photo_id),
          FOREIGN KEY (album_id) REFERENCES albums (id) ON DELETE CASCADE,
          FOREIGN KEY (photo_id) REFERENCES photos (id) ON DELETE CASCADE
        )
      `, (err) => {
        if (err) return reject(err);
      });
      
      // 创建用户活动日志表
      db.run(`
        CREATE TABLE IF NOT EXISTS activity_logs (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER,
          action TEXT NOT NULL,
          resource_type TEXT,
          resource_id INTEGER,
          ip_address TEXT,
          user_agent TEXT,
          details TEXT, -- JSON格式存储详细信息
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE SET NULL
        )
      `, (err) => {
        if (err) return reject(err);
      });
      
      // 创建系统配置表
      db.run(`
        CREATE TABLE IF NOT EXISTS system_config (
          key TEXT PRIMARY KEY,
          value TEXT,
          description TEXT,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `, (err) => {
        if (err) return reject(err);
      });
      
      // 创建索引以提高查询性能
      const indexes = [
        'CREATE INDEX IF NOT EXISTS idx_photos_uploaded_by ON photos (uploaded_by)',
        'CREATE INDEX IF NOT EXISTS idx_photos_taken_at ON photos (taken_at)',
        'CREATE INDEX IF NOT EXISTS idx_photos_filename ON photos (filename)',
        'CREATE INDEX IF NOT EXISTS idx_photo_exif_photo_id ON photo_exif (photo_id)',
        'CREATE INDEX IF NOT EXISTS idx_photo_exif_gps ON photo_exif (gps_latitude, gps_longitude)',
        'CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id ON activity_logs (user_id)',
        'CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON activity_logs (created_at)',
        'CREATE INDEX IF NOT EXISTS idx_users_username ON users (username)',
        'CREATE INDEX IF NOT EXISTS idx_users_email ON users (email)'
      ];
      
      let indexCount = 0;
      indexes.forEach(indexSQL => {
        db.run(indexSQL, (err) => {
          if (err) return reject(err);
          indexCount++;
          if (indexCount === indexes.length) {
            // 插入默认配置
            insertDefaultConfig(db, () => {
              db.close((err) => {
                if (err) return reject(err);
                resolve();
              });
            });
          }
        });
      });
    });
    
  } catch (error) {
    throw new Error(`数据库初始化失败: ${error.message}`);
  }
}

/**
 * 插入默认系统配置
 */
function insertDefaultConfig(db, callback) {
  const defaultConfigs = [
    {
      key: 'app_version',
      value: '2.0.0',
      description: '应用版本号'
    },
    {
      key: 'start_date',
      value: process.env.DEFAULT_START_DATE || '2024-01-01',
      description: '纪念开始日期'
    },
    {
      key: 'correct_month',
      value: process.env.CORRECT_MONTH || '1',
      description: '密码验证-正确月份'
    },
    {
      key: 'correct_nickname',
      value: process.env.CORRECT_NICKNAME || '宝贝',
      description: '密码验证-正确昵称'
    },
    {
      key: 'correct_word',
      value: process.env.CORRECT_WORD || '宇宙',
      description: '密码验证-正确关键词'
    },
    {
      key: 'max_photos',
      value: '1000',
      description: '最大照片数量'
    },
    {
      key: 'sphere_radius',
      value: '250',
      description: '3D球面半径'
    },
    {
      key: 'auto_rotate_speed',
      value: '0.2',
      description: '自动旋转速度'
    }
  ];
  
  const stmt = db.prepare(`
    INSERT OR IGNORE INTO system_config (key, value, description) 
    VALUES (?, ?, ?)
  `);
  
  let configCount = 0;
  defaultConfigs.forEach(config => {
    stmt.run([config.key, config.value, config.description], (err) => {
      if (err) console.error('插入默认配置失败:', err);
      configCount++;
      if (configCount === defaultConfigs.length) {
        stmt.finalize();
        callback();
      }
    });
  });
}

/**
 * 获取数据库连接
 */
function getDatabase() {
  return new sqlite3.Database(DB_PATH);
}

/**
 * 执行数据库迁移
 */
async function runMigrations() {
  // 这里可以添加数据库版本升级逻辑
  console.log('检查数据库迁移...');
  // 未来可以在这里添加表结构更新逻辑
}

module.exports = {
  initDatabase,
  getDatabase,
  runMigrations
};
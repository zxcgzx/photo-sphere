const sharp = require('sharp');
const ExifReader = require('exif-reader');

/**
 * 提取图片EXIF数据
 * @param {Buffer} imageBuffer - 图片缓冲区
 * @param {Object} metadata - Sharp元数据
 * @returns {Object} 提取的EXIF数据
 */
async function extractExifData(imageBuffer, metadata) {
  try {
    const exifData = {};
    
    // 从metadata中提取基本信息
    if (metadata.exif) {
      const exif = ExifReader(metadata.exif);
      
      // 相机信息
      if (exif.Image) {
        exifData.cameraMake = exif.Image.Make;
        exifData.cameraModel = exif.Image.Model;
        exifData.orientation = exif.Image.Orientation;
        exifData.dateTime = exif.Image.DateTime;
      }
      
      // 拍摄参数
      if (exif.Photo) {
        exifData.focalLength = exif.Photo.FocalLength;
        exifData.aperture = exif.Photo.FNumber;
        exifData.shutterSpeed = exif.Photo.ExposureTime;
        exifData.iso = exif.Photo.ISOSpeedRatings;
        exifData.flashUsed = exif.Photo.Flash !== undefined ? exif.Photo.Flash !== 0 : null;
        exifData.colorSpace = exif.Photo.ColorSpace;
        exifData.whiteBalance = exif.Photo.WhiteBalance;
        exifData.exposureMode = exif.Photo.ExposureMode;
        exifData.meteringMode = exif.Photo.MeteringMode;
        exifData.lensModel = exif.Photo.LensModel;
      }
      
      // GPS信息
      if (exif.GPS) {
        exifData.gpsLatitude = convertGPSCoordinate(exif.GPS.GPSLatitude, exif.GPS.GPSLatitudeRef);
        exifData.gpsLongitude = convertGPSCoordinate(exif.GPS.GPSLongitude, exif.GPS.GPSLongitudeRef);
        exifData.gpsAltitude = exif.GPS.GPSAltitude;
      }
      
      // 保存完整的EXIF数据
      exifData.rawExif = exif;
    }
    
    // 如果没有拍摄时间，使用文件创建时间
    if (!exifData.dateTime) {
      exifData.dateTime = new Date().toISOString();
    }
    
    return exifData;
    
  } catch (error) {
    console.warn('EXIF数据提取失败:', error.message);
    return {
      dateTime: new Date().toISOString(),
      rawExif: {}
    };
  }
}

/**
 * 转换GPS坐标
 * @param {Array} coordinate - GPS坐标数组 [度, 分, 秒]
 * @param {String} ref - 方向参考 (N/S/E/W)
 * @returns {Number} 十进制坐标
 */
function convertGPSCoordinate(coordinate, ref) {
  if (!coordinate || !Array.isArray(coordinate) || coordinate.length < 3) {
    return null;
  }
  
  const degrees = coordinate[0];
  const minutes = coordinate[1];
  const seconds = coordinate[2];
  
  let decimal = degrees + (minutes / 60) + (seconds / 3600);
  
  // 南纬和西经为负值
  if (ref === 'S' || ref === 'W') {
    decimal = -decimal;
  }
  
  return decimal;
}

/**
 * 计算3D球面位置（使用Fibonacci球面分布算法）
 * @param {Number} index - 照片索引
 * @param {Number} total - 总照片数（可选，用于预计算）
 * @param {Number} radius - 球面半径
 * @returns {Object} {x, y, z} 坐标
 */
function calculateSpherePosition(index, total = null, radius = 250) {
  // 使用黄金比例进行Fibonacci球面分布
  const goldenRatio = (1 + Math.sqrt(5)) / 2;
  
  // 如果没有总数，使用一个大的估计值
  const estimatedTotal = total || 1000;
  
  // Fibonacci球面分布算法
  const y = 1 - (index / (estimatedTotal - 1)) * 2; // y范围: [-1, 1]
  const radiusAtY = Math.sqrt(1 - y * y);
  
  const theta = 2 * Math.PI * index / goldenRatio;
  
  const x = Math.cos(theta) * radiusAtY;
  const z = Math.sin(theta) * radiusAtY;
  
  // 添加轻微的随机偏移，让分布更自然
  const randomOffset = 0.05;
  const offsetX = (Math.random() - 0.5) * randomOffset;
  const offsetY = (Math.random() - 0.5) * randomOffset;
  const offsetZ = (Math.random() - 0.5) * randomOffset;
  
  return {
    x: (x + offsetX) * radius,
    y: (y + offsetY) * radius, 
    z: (z + offsetZ) * radius
  };
}

/**
 * 重新计算所有照片的球面位置
 * @param {Array} photos - 照片数组
 * @param {Number} radius - 球面半径
 * @returns {Array} 更新位置后的照片数组
 */
function recalculateAllPositions(photos, radius = 250) {
  return photos.map((photo, index) => {
    const position = calculateSpherePosition(index, photos.length, radius);
    return {
      ...photo,
      position_x: position.x,
      position_y: position.y,
      position_z: position.z
    };
  });
}

/**
 * 优化图片（自动压缩和格式转换）
 * @param {Buffer} imageBuffer - 原始图片缓冲区
 * @param {Object} options - 优化选项
 * @returns {Object} 处理后的图片信息
 */
async function optimizeImage(imageBuffer, options = {}) {
  const {
    quality = 85,
    width = null,
    height = null,
    format = 'webp',
    progressive = true
  } = options;
  
  try {
    let sharpInstance = sharp(imageBuffer);
    
    // 调整尺寸
    if (width || height) {
      sharpInstance = sharpInstance.resize(width, height, {
        fit: 'inside',
        withoutEnlargement: true
      });
    }
    
    // 格式转换和压缩
    switch (format.toLowerCase()) {
      case 'webp':
        sharpInstance = sharpInstance.webp({
          quality,
          effort: 4,
          progressive
        });
        break;
      case 'jpeg':
      case 'jpg':
        sharpInstance = sharpInstance.jpeg({
          quality,
          progressive,
          mozjpeg: true
        });
        break;
      case 'png':
        sharpInstance = sharpInstance.png({
          quality,
          progressive,
          compressionLevel: 8
        });
        break;
      default:
        throw new Error(`不支持的格式: ${format}`);
    }
    
    const optimizedBuffer = await sharpInstance.toBuffer();
    const metadata = await sharp(optimizedBuffer).metadata();
    
    return {
      buffer: optimizedBuffer,
      metadata,
      originalSize: imageBuffer.length,
      optimizedSize: optimizedBuffer.length,
      compressionRatio: Math.round((1 - optimizedBuffer.length / imageBuffer.length) * 100)
    };
    
  } catch (error) {
    throw new Error(`图片优化失败: ${error.message}`);
  }
}

/**
 * 生成多尺寸图片
 * @param {Buffer} imageBuffer - 原始图片缓冲区
 * @param {Array} sizes - 尺寸配置数组
 * @returns {Object} 各尺寸图片信息
 */
async function generateMultiSizeImages(imageBuffer, sizes = []) {
  const defaultSizes = [
    { name: 'thumbnail', width: 300, quality: 80 },
    { name: 'medium', width: 800, quality: 85 },
    { name: 'large', width: 1920, quality: 90 }
  ];
  
  const sizeConfigs = sizes.length > 0 ? sizes : defaultSizes;
  const results = {};
  
  for (const config of sizeConfigs) {
    try {
      const optimized = await optimizeImage(imageBuffer, {
        width: config.width,
        height: config.height,
        quality: config.quality || 85,
        format: config.format || 'webp'
      });
      
      results[config.name] = {
        buffer: optimized.buffer,
        metadata: optimized.metadata,
        size: optimized.optimizedSize,
        compressionRatio: optimized.compressionRatio
      };
      
    } catch (error) {
      console.error(`生成 ${config.name} 尺寸图片失败:`, error);
    }
  }
  
  return results;
}

/**
 * 检测图片主色调
 * @param {Buffer} imageBuffer - 图片缓冲区
 * @returns {Object} 主色调信息
 */
async function detectDominantColor(imageBuffer) {
  try {
    const { dominant } = await sharp(imageBuffer)
      .resize(50, 50) // 缩小图片以提高处理速度
      .raw()
      .toBuffer({ resolveWithObject: true });
    
    // 这里可以实现更复杂的颜色分析算法
    // 目前返回一个简化的结果
    return {
      r: 128,
      g: 128, 
      b: 128,
      hex: '#808080'
    };
    
  } catch (error) {
    console.warn('检测主色调失败:', error.message);
    return {
      r: 128,
      g: 128,
      b: 128,
      hex: '#808080'
    };
  }
}

/**
 * 验证图片文件
 * @param {Buffer} imageBuffer - 图片缓冲区
 * @param {Object} options - 验证选项
 * @returns {Object} 验证结果
 */
async function validateImage(imageBuffer, options = {}) {
  const {
    maxWidth = 10000,
    maxHeight = 10000,
    minWidth = 100,
    minHeight = 100,
    maxFileSize = 10 * 1024 * 1024, // 10MB
    allowedFormats = ['jpeg', 'jpg', 'png', 'webp', 'gif']
  } = options;
  
  try {
    const metadata = await sharp(imageBuffer).metadata();
    const errors = [];
    
    // 检查文件大小
    if (imageBuffer.length > maxFileSize) {
      errors.push(`文件大小超过限制 (${Math.round(maxFileSize / 1024 / 1024)}MB)`);
    }
    
    // 检查图片格式
    if (!allowedFormats.includes(metadata.format)) {
      errors.push(`不支持的图片格式: ${metadata.format}`);
    }
    
    // 检查图片尺寸
    if (metadata.width > maxWidth || metadata.height > maxHeight) {
      errors.push(`图片尺寸超过限制 (${maxWidth}x${maxHeight})`);
    }
    
    if (metadata.width < minWidth || metadata.height < minHeight) {
      errors.push(`图片尺寸过小 (最小${minWidth}x${minHeight})`);
    }
    
    return {
      valid: errors.length === 0,
      errors,
      metadata
    };
    
  } catch (error) {
    return {
      valid: false,
      errors: [`图片文件损坏或无效: ${error.message}`],
      metadata: null
    };
  }
}

module.exports = {
  extractExifData,
  calculateSpherePosition,
  recalculateAllPositions,
  optimizeImage,
  generateMultiSizeImages,
  detectDominantColor,
  validateImage,
  convertGPSCoordinate
};
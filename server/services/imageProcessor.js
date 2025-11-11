const sharp = require('sharp');
const path = require('path');
const fs = require('fs').promises;
const { v4: uuidv4 } = require('uuid');

/**
 * 高级图片处理服务
 * 提供全面的图片压缩、格式转换和优化功能
 */
class ImageProcessor {
  constructor(options = {}) {
    this.config = {
      // 输出目录配置
      uploadDir: options.uploadDir || './uploads',
      thumbnailDir: options.thumbnailDir || './uploads/thumbnails',
      mediumDir: options.mediumDir || './uploads/medium',
      optimizedDir: options.optimizedDir || './uploads/optimized',
      
      // 图片质量配置
      thumbnailSize: options.thumbnailSize || 300,
      mediumSize: options.mediumSize || 800,
      largeSize: options.largeSize || 1920,
      
      // 压缩质量配置
      jpegQuality: options.jpegQuality || 85,
      webpQuality: options.webpQuality || 85,
      pngQuality: options.pngQuality || 90,
      avifQuality: options.avifQuality || 75,
      
      // 格式偏好（按优先级排序）
      preferredFormats: options.preferredFormats || ['webp', 'jpeg', 'png'],
      
      // 处理选项
      preserveMetadata: options.preserveMetadata !== false,
      progressive: options.progressive !== false,
      stripMetadata: options.stripMetadata === true
    };
    
    this.supportedInputFormats = ['jpeg', 'jpg', 'png', 'webp', 'gif', 'tiff', 'bmp'];
    this.supportedOutputFormats = ['jpeg', 'webp', 'png', 'avif'];
  }
  
  /**
   * 初始化处理器，创建必要的目录
   */
  async initialize() {
    const dirs = [
      this.config.uploadDir,
      this.config.thumbnailDir,
      this.config.mediumDir,
      this.config.optimizedDir
    ];
    
    for (const dir of dirs) {
      await fs.mkdir(dir, { recursive: true });
    }
  }
  
  /**
   * 处理单个图片文件
   * @param {Buffer} imageBuffer - 图片缓冲区
   * @param {String} originalFilename - 原始文件名
   * @param {Object} options - 处理选项
   * @returns {Object} 处理结果
   */
  async processImage(imageBuffer, originalFilename, options = {}) {
    try {
      await this.initialize();
      
      // 验证输入
      const validation = await this.validateImage(imageBuffer);
      if (!validation.valid) {
        throw new Error(`图片验证失败: ${validation.errors.join(', ')}`);
      }
      
      const metadata = validation.metadata;
      const fileId = uuidv4();
      const originalExt = path.extname(originalFilename);
      
      // 处理配置
      const processConfig = {
        preserveOriginal: options.preserveOriginal !== false,
        generateThumbnail: options.generateThumbnail !== false,
        generateMedium: options.generateMedium !== false,
        generateOptimized: options.generateOptimized !== false,
        targetFormats: options.targetFormats || ['webp', 'jpeg'],
        ...options
      };
      
      const results = {
        fileId,
        originalFilename,
        metadata: {
          width: metadata.width,
          height: metadata.height,
          format: metadata.format,
          size: imageBuffer.length,
          hasAlpha: metadata.hasAlpha,
          channels: metadata.channels,
          density: metadata.density
        },
        files: []
      };
      
      // 保存原始文件
      if (processConfig.preserveOriginal) {
        const originalPath = path.join(this.config.uploadDir, `${fileId}_original${originalExt}`);
        await fs.writeFile(originalPath, imageBuffer);
        results.files.push({
          type: 'original',
          path: originalPath,
          relativePath: `/uploads/${fileId}_original${originalExt}`,
          format: metadata.format,
          size: imageBuffer.length
        });
      }
      
      // 生成缩略图
      if (processConfig.generateThumbnail) {
        const thumbnails = await this.generateThumbnails(imageBuffer, fileId, processConfig.targetFormats);
        results.files.push(...thumbnails);
      }
      
      // 生成中等尺寸图片
      if (processConfig.generateMedium) {
        const mediumImages = await this.generateMediumImages(imageBuffer, fileId, processConfig.targetFormats);
        results.files.push(...mediumImages);
      }
      
      // 生成优化图片
      if (processConfig.generateOptimized) {
        const optimizedImages = await this.generateOptimizedImages(imageBuffer, fileId, processConfig.targetFormats);
        results.files.push(...optimizedImages);
      }
      
      return results;
      
    } catch (error) {
      throw new Error(`图片处理失败: ${error.message}`);
    }
  }
  
  /**
   * 生成缩略图
   */
  async generateThumbnails(imageBuffer, fileId, formats) {
    const thumbnails = [];
    
    for (const format of formats) {
      try {
        const filename = `${fileId}_thumb.${format}`;
        const filepath = path.join(this.config.thumbnailDir, filename);
        
        const processed = await this.resizeAndCompress(imageBuffer, {
          width: this.config.thumbnailSize,
          height: this.config.thumbnailSize,
          format,
          quality: this.getQualityForFormat(format, 'thumbnail')
        });
        
        await fs.writeFile(filepath, processed.buffer);
        
        thumbnails.push({
          type: 'thumbnail',
          path: filepath,
          relativePath: `/uploads/thumbnails/${filename}`,
          format,
          size: processed.buffer.length,
          width: processed.info.width,
          height: processed.info.height,
          compressionRatio: Math.round((1 - processed.buffer.length / imageBuffer.length) * 100)
        });
        
      } catch (error) {
        console.warn(`生成${format}缩略图失败:`, error.message);
      }
    }
    
    return thumbnails;
  }
  
  /**
   * 生成中等尺寸图片
   */
  async generateMediumImages(imageBuffer, fileId, formats) {
    const mediumImages = [];
    
    for (const format of formats) {
      try {
        const filename = `${fileId}_medium.${format}`;
        const filepath = path.join(this.config.mediumDir, filename);
        
        const processed = await this.resizeAndCompress(imageBuffer, {
          width: this.config.mediumSize,
          height: this.config.mediumSize,
          format,
          quality: this.getQualityForFormat(format, 'medium')
        });
        
        await fs.writeFile(filepath, processed.buffer);
        
        mediumImages.push({
          type: 'medium',
          path: filepath,
          relativePath: `/uploads/medium/${filename}`,
          format,
          size: processed.buffer.length,
          width: processed.info.width,
          height: processed.info.height,
          compressionRatio: Math.round((1 - processed.buffer.length / imageBuffer.length) * 100)
        });
        
      } catch (error) {
        console.warn(`生成${format}中等尺寸图片失败:`, error.message);
      }
    }
    
    return mediumImages;
  }
  
  /**
   * 生成优化图片（不改变尺寸，只优化压缩）
   */
  async generateOptimizedImages(imageBuffer, fileId, formats) {
    const optimizedImages = [];
    
    for (const format of formats) {
      try {
        const filename = `${fileId}_optimized.${format}`;
        const filepath = path.join(this.config.optimizedDir, filename);
        
        const processed = await this.resizeAndCompress(imageBuffer, {
          format,
          quality: this.getQualityForFormat(format, 'optimized'),
          preserveSize: true
        });
        
        await fs.writeFile(filepath, processed.buffer);
        
        optimizedImages.push({
          type: 'optimized',
          path: filepath,
          relativePath: `/uploads/optimized/${filename}`,
          format,
          size: processed.buffer.length,
          width: processed.info.width,
          height: processed.info.height,
          compressionRatio: Math.round((1 - processed.buffer.length / imageBuffer.length) * 100)
        });
        
      } catch (error) {
        console.warn(`生成${format}优化图片失败:`, error.message);
      }
    }
    
    return optimizedImages;
  }
  
  /**
   * 调整尺寸和压缩
   */
  async resizeAndCompress(imageBuffer, options) {
    const {
      width,
      height,
      format,
      quality,
      preserveSize = false
    } = options;
    
    let processor = sharp(imageBuffer);
    
    // 调整尺寸
    if (!preserveSize && (width || height)) {
      processor = processor.resize(width, height, {
        fit: 'inside',
        withoutEnlargement: true,
        background: { r: 255, g: 255, b: 255, alpha: 0 }
      });
    }
    
    // 去除元数据（除非配置保留）
    if (this.config.stripMetadata) {
      processor = processor.withMetadata(false);
    }
    
    // 格式转换和压缩
    switch (format.toLowerCase()) {
      case 'webp':
        processor = processor.webp({
          quality,
          effort: 4,
          lossless: quality >= 95,
          nearLossless: quality >= 90 && quality < 95,
          smartSubsample: true,
          reductionEffort: 4
        });
        break;
        
      case 'jpeg':
      case 'jpg':
        processor = processor.jpeg({
          quality,
          progressive: this.config.progressive,
          mozjpeg: true,
          trellisQuantisation: true,
          overshootDeringing: true,
          optimiseScans: true
        });
        break;
        
      case 'png':
        processor = processor.png({
          quality,
          progressive: this.config.progressive,
          compressionLevel: 8,
          adaptiveFiltering: true,
          force: false
        });
        break;
        
      case 'avif':
        processor = processor.avif({
          quality,
          effort: 4,
          lossless: quality >= 95,
          chromaSubsampling: '4:2:0'
        });
        break;
        
      default:
        throw new Error(`不支持的输出格式: ${format}`);
    }
    
    const result = await processor.toBuffer({ resolveWithObject: true });
    
    return {
      buffer: result.data,
      info: result.info
    };
  }
  
  /**
   * 根据格式和类型获取合适的质量参数
   */
  getQualityForFormat(format, type) {
    const qualityMap = {
      thumbnail: {
        webp: 75,
        jpeg: 80,
        png: 85,
        avif: 70
      },
      medium: {
        webp: 85,
        jpeg: 85,
        png: 90,
        avif: 75
      },
      optimized: {
        webp: 90,
        jpeg: 90,
        png: 95,
        avif: 80
      }
    };
    
    return qualityMap[type]?.[format] || this.config[`${format}Quality`] || 85;
  }
  
  /**
   * 验证图片
   */
  async validateImage(imageBuffer) {
    try {
      const metadata = await sharp(imageBuffer).metadata();
      const errors = [];
      
      // 检查格式
      if (!this.supportedInputFormats.includes(metadata.format)) {
        errors.push(`不支持的图片格式: ${metadata.format}`);
      }
      
      // 检查尺寸
      const maxDimension = 10000;
      const minDimension = 10;
      
      if (metadata.width > maxDimension || metadata.height > maxDimension) {
        errors.push(`图片尺寸过大 (最大${maxDimension}x${maxDimension})`);
      }
      
      if (metadata.width < minDimension || metadata.height < minDimension) {
        errors.push(`图片尺寸过小 (最小${minDimension}x${minDimension})`);
      }
      
      // 检查文件大小
      const maxSize = 50 * 1024 * 1024; // 50MB
      if (imageBuffer.length > maxSize) {
        errors.push(`文件大小超过限制 (最大${Math.round(maxSize / 1024 / 1024)}MB)`);
      }
      
      return {
        valid: errors.length === 0,
        errors,
        metadata
      };
      
    } catch (error) {
      return {
        valid: false,
        errors: [`图片文件损坏: ${error.message}`],
        metadata: null
      };
    }
  }
  
  /**
   * 批量处理图片
   */
  async processBatch(images, options = {}) {
    const results = [];
    const concurrency = options.concurrency || 3; // 限制并发数量
    
    for (let i = 0; i < images.length; i += concurrency) {
      const batch = images.slice(i, i + concurrency);
      const batchPromises = batch.map(async ({ buffer, filename, processOptions }) => {
        try {
          return await this.processImage(buffer, filename, { ...options, ...processOptions });
        } catch (error) {
          return {
            error: error.message,
            filename
          };
        }
      });
      
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
    }
    
    return results;
  }
  
  /**
   * 清理临时文件
   */
  async cleanup(filePaths) {
    for (const filePath of filePaths) {
      try {
        await fs.unlink(filePath);
      } catch (error) {
        console.warn(`清理文件失败 ${filePath}:`, error.message);
      }
    }
  }
  
  /**
   * 获取处理统计信息
   */
  getProcessingStats(results) {
    const stats = {
      total: results.length,
      successful: 0,
      failed: 0,
      totalOriginalSize: 0,
      totalOptimizedSize: 0,
      averageCompressionRatio: 0,
      formatDistribution: {}
    };
    
    results.forEach(result => {
      if (result.error) {
        stats.failed++;
      } else {
        stats.successful++;
        stats.totalOriginalSize += result.metadata.size;
        
        result.files.forEach(file => {
          if (file.type === 'optimized') {
            stats.totalOptimizedSize += file.size;
          }
          
          stats.formatDistribution[file.format] = 
            (stats.formatDistribution[file.format] || 0) + 1;
        });
      }
    });
    
    if (stats.totalOriginalSize > 0) {
      stats.averageCompressionRatio = Math.round(
        (1 - stats.totalOptimizedSize / stats.totalOriginalSize) * 100
      );
    }
    
    return stats;
  }
}

module.exports = ImageProcessor;
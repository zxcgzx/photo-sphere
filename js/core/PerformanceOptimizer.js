/**
 * 性能优化器
 * 自动优化渲染性能
 */

import eventBus from './EventBus.js';

class PerformanceOptimizer {
    constructor() {
        this.config = {
            targetFps: 60,
            minFps: 30,
            maxFps: 60,
            enableDynamicQuality: true,
            enableLOD: true,
            enableFrustumCulling: true,
            enableOcclusionCulling: false,
            maxParticles: 2000,
            maxPhotos: 100,
            textureSizeLimit: 2048
        };
        
        this.metrics = {
            fps: 60,
            frameTime: 16.67,
            memoryUsage: 0,
            drawCalls: 0,
            triangleCount: 0,
            textureMemory: 0
        };
        
        this.qualityLevel = 'high'; // low, medium, high, ultra
        this.isThrottling = false;
        this.throttleLevel = 0;
        
        this.frameHistory = [];
        this.maxHistoryFrames = 60;
        
        this.init();
    }
    
    init() {
        this.startMonitoring();
        this.bindEvents();
        console.log('[PerformanceOptimizer] 初始化完成');
    }
    
    bindEvents() {
        // 监听性能变化
        eventBus.on('performance.drop', (data) => {
            this.handlePerformanceDrop(data);
        });
        
        // 监听照片数量变化
        eventBus.on('photos.countChanged', (count) => {
            this.adjustForPhotoCount(count);
        });
        
        // 监听特效触发
        eventBus.on('effect.triggered', (effect) => {
            this.optimizeForEffect(effect);
        });
    }
    
    /**
     * 开始性能监控
     */
    startMonitoring() {
        this.monitorId = setInterval(() => {
            this.collectMetrics();
            this.analyzePerformance();
            this.applyOptimizations();
        }, 1000);
    }
    
    /**
     * 收集性能指标
     */
    collectMetrics() {
        // FPS
        if (performance.now() - this.lastFrameTime >= 1000) {
            this.metrics.fps = this.frameCount;
            this.frameCount = 0;
            this.lastFrameTime = performance.now();
        }
        this.frameCount++;
        
        // 内存使用
        if (performance.memory) {
            this.metrics.memoryUsage = performance.memory.usedJSHeapSize / 1048576;
        }
        
        // 记录历史
        this.frameHistory.push({
            fps: this.metrics.fps,
            memory: this.metrics.memoryUsage,
            timestamp: Date.now()
        });
        
        if (this.frameHistory.length > this.maxHistoryFrames) {
            this.frameHistory.shift();
        }
    }
    
    /**
     * 分析性能
     */
    analyzePerformance() {
        const avgFps = this.frameHistory.reduce((sum, f) => sum + f.fps, 0) / this.frameHistory.length;
        const avgMemory = this.frameHistory.reduce((sum, f) => sum + f.memory, 0) / this.frameHistory.length;
        
        // 检测性能下降
        if (avgFps < this.config.minFps && !this.isThrottling) {
            eventBus.emit('performance.drop', {
                fps: avgFps,
                memory: avgMemory,
                severity: 'high'
            });
        }
        
        // 动态调整质量级别
        if (this.config.enableDynamicQuality) {
            this.adjustQuality(avgFps);
        }
    }
    
    /**
     * 应用优化
     */
    applyOptimizations() {
        // 视锥剔除
        if (this.config.enableFrustumCulling) {
            this.performFrustumCulling();
        }
        
        // 纹理压缩
        if (this.metrics.memoryUsage > 500) {
            this.compressTextures();
        }
    }
    
    /**
     * 处理性能下降
     */
    handlePerformanceDrop(data) {
        console.warn('[PerformanceOptimizer] 性能下降:', data);
        
        // 增加节流级别
        this.throttleLevel = Math.min(this.throttleLevel + 1, 3);
        this.isThrottling = true;
        
        // 应用节流
        this.applyThrottling();
        
        // 通知用户
        eventBus.emit('performance.warning', {
            message: `性能下降，自动调整为${this.qualityLevel}质量`,
            level: this.throttleLevel
        });
    }
    
    /**
     * 应用节流
     */
    applyThrottling() {
        const throttleConfig = {
            0: { quality: 'ultra', maxParticles: 2000, maxPhotos: 200 },
            1: { quality: 'high', maxParticles: 1000, maxPhotos: 100 },
            2: { quality: 'medium', maxParticles: 500, maxPhotos: 50 },
            3: { quality: 'low', maxParticles: 200, maxPhotos: 20 }
        };
        
        const config = throttleConfig[this.throttleLevel];
        this.qualityLevel = config.quality;
        
        // 应用配置
        eventBus.emit('performance.configChanged', config);
    }
    
    /**
     * 根据照片数量调整
     */
    adjustForPhotoCount(count) {
        if (count > this.config.maxPhotos) {
            // 切换到虚拟滚动模式
            eventBus.emit('photos.switchToVirtualScroll', { count });
        }
    }
    
    /**
     * 优化特效
     */
    optimizeForEffect(effect) {
        const effectConfig = {
            'meteorShower': { particleMultiplier: 0.5 },
            'explosion': { particleMultiplier: 0.7 },
            'bloom': { particleMultiplier: 0.8 }
        };
        
        const config = effectConfig[effect.type] || { particleMultiplier: 1.0 };
        
        // 根据节流级别调整
        config.particleMultiplier *= (1 - this.throttleLevel * 0.3);
        
        eventBus.emit('effect.adjusted', config);
    }
    
    /**
     * 执行视锥剔除
     */
    performFrustumCulling() {
        eventBus.emit('culling.frustum', {
            enabled: true,
            frustum: this.calculateFrustum()
        });
    }
    
    /**
     * 压缩纹理
     */
    compressTextures() {
        eventBus.emit('textures.compress', {
            maxSize: this.config.textureSizeLimit,
            format: 'webp'
        });
    }
    
    /**
     * 调整质量
     */
    adjustQuality(fps) {
        const qualityLevels = [
            { fps: 55, quality: 'ultra' },
            { fps: 45, quality: 'high' },
            { fps: 35, quality: 'medium' },
            { fps: 0, quality: 'low' }
        ];
        
        for (const level of qualityLevels) {
            if (fps >= level.fps) {
                if (this.qualityLevel !== level.quality) {
                    this.qualityLevel = level.quality;
                    eventBus.emit('quality.changed', level.quality);
                }
                break;
            }
        }
    }
    
    /**
     * 计算视锥
     */
    calculateFrustum() {
        // 简化的视锥计算
        return {
            near: 100,
            far: 1000,
            fov: 60
        };
    }
    
    /**
     * 获取性能报告
     */
    getPerformanceReport() {
        const avgFps = this.frameHistory.reduce((sum, f) => sum + f.fps, 0) / this.frameHistory.length;
        const avgMemory = this.frameHistory.reduce((sum, f) => sum + f.memory, 0) / this.frameHistory.length;
        
        return {
            current: this.metrics,
            average: {
                fps: avgFps,
                memory: avgMemory
            },
            qualityLevel: this.qualityLevel,
            throttleLevel: this.throttleLevel,
            recommendations: this.generateRecommendations(avgFps, avgMemory)
        };
    }
    
    /**
     * 生成优化建议
     */
    generateRecommendations(fps, memory) {
        const recommendations = [];
        
        if (fps < 30) {
            recommendations.push({
                priority: 'high',
                message: 'FPS过低，建议降低质量或照片数量',
                action: 'reduceQuality'
            });
        }
        
        if (memory > 1000) {
            recommendations.push({
                priority: 'high',
                message: '内存使用过高，建议压缩纹理',
                action: 'compressTextures'
            });
        }
        
        if (this.metrics.drawCalls > 1000) {
            recommendations.push({
                priority: 'medium',
                message: '渲染调用过多，建议启用批量渲染',
                action: 'batchRendering'
            });
        }
        
        return recommendations;
    }
    
    /**
     * 销毁
     */
    destroy() {
        if (this.monitorId) {
            clearInterval(this.monitorId);
        }
        
        console.log('[PerformanceOptimizer] 已销毁');
    }
}

export default PerformanceOptimizer;
/**
 * 性能优化管理器
 * 智能管理GPU资源、内存使用和渲染性能
 */

import { CONFIG } from './config.js';

class PerformanceManager {
    constructor(config, sceneManager) {
        this.config = config || CONFIG;
        this.sceneManager = sceneManager;
        
        // 性能监控
        this.stats = {
            fps: 0,
            frameTime: 0,
            memoryUsage: 0,
            drawCalls: 0,
            triangles: 0,
            geometries: 0,
            textures: 0,
            renderTargets: 0
        };
        
        // 性能阈值
        this.thresholds = {
            targetFPS: 60,
            minFPS: 30,
            maxMemoryMB: 500,
            maxDrawCalls: 1000,
            maxTriangles: 100000
        };
        
        // 优化状态
        this.optimizationLevel = 0; // 0-低, 1-中, 2-高
        this.isOptimizing = false;
        this.lastOptimization = 0;
        
        // LOD系统
        this.lodSystem = {
            enabled: true,
            distances: [50, 100, 200], // 距离阈值
            levels: ['high', 'medium', 'low'],
            updateInterval: 500 // ms
        };
        
        // 纹理池
        this.texturePool = {
            available: [],
            inUse: new Set(),
            maxSize: 20
        };
        
        // 几何体池
        this.geometryPool = {
            available: new Map(),
            inUse: new Set(),
            maxSize: 50
        };
        
        // 性能历史记录
        this.performanceHistory = [];
        this.maxHistorySize = 100;
        
        // 渲染器信息
        this.renderer = null;
        this.gl = null;
        
        // 定时器
        this.performanceTimer = null;
        this.optimizationTimer = null;
        
        // 绑定方法
        this.updatePerformanceStats = this.updatePerformanceStats.bind(this);
        this.optimizePerformance = this.optimizePerformance.bind(this);
    }
    
    /**
     * 初始化性能管理器
     */
    async initialize() {
        this.config.log('初始化性能管理器...');
        
        // 获取渲染器信息
        this.renderer = this.sceneManager.renderer;
        this.gl = this.renderer.getContext();
        
        // 启动性能监控
        this.startPerformanceMonitoring();
        
        // 初始化资源池
        this.initializeResourcePools();
        
        // 设置自动优化
        this.setupAutoOptimization();
        
        // 检测设备性能
        await this.detectDevicePerformance();
        
        // 设置页面可见性监听
        this.setupVisibilityListener();
        
        this.config.log('性能管理器初始化完成');
    }
    
    /**
     * 启动性能监控
     */
    startPerformanceMonitoring() {
        let lastTime = performance.now();
        let frameCount = 0;
        let fpsSum = 0;
        
        const updateStats = () => {
            const currentTime = performance.now();
            const deltaTime = currentTime - lastTime;
            
            // 计算FPS
            frameCount++;
            const currentFPS = 1000 / deltaTime;
            fpsSum += currentFPS;
            
            if (frameCount >= 60) { // 每60帧更新一次
                this.stats.fps = Math.round(fpsSum / frameCount);
                this.stats.frameTime = Math.round(deltaTime * 100) / 100;
                
                // 更新其他统计信息
                this.updateRenderingStats();
                this.updateMemoryStats();
                
                // 记录性能历史
                this.recordPerformanceHistory();
                
                // 检查是否需要优化
                this.checkOptimizationNeeded();
                
                // 重置计数器
                frameCount = 0;
                fpsSum = 0;
            }
            
            lastTime = currentTime;
        };
        
        // 绑定到渲染循环 - 使用 requestAnimationFrame 替代 setInterval
        const loop = () => {
            if (this.performanceTimer) {
                updateStats();
                requestAnimationFrame(loop);
            }
        };
        
        this.performanceTimer = true; // 使用标志位控制循环
        requestAnimationFrame(loop);
    }
    
    /**
     * 更新渲染统计
     */
    updateRenderingStats() {
        const info = this.renderer.info;
        
        this.stats.drawCalls = info.render.calls;
        this.stats.triangles = info.render.triangles;
        this.stats.geometries = info.memory.geometries;
        this.stats.textures = info.memory.textures;
        this.stats.renderTargets = info.memory.renderTargets;
    }
    
    /**
     * 更新内存统计（兼容不同浏览器）
     */
    updateMemoryStats() {
        // Chrome 专有 API（需要特殊 flag）
        if (performance.memory) {
            this.stats.memoryUsage = Math.round(performance.memory.usedJSHeapSize / (1024 * 1024));
        } else {
            // Safari/Firefox 兼容：估算内存使用
            this.stats.memoryUsage = 'N/A';
        }
        
        // GPU内存估算
        let gpuMemory = 0;
        if (this.gl) {
            try {
                const extension = this.gl.getExtension('WEBGL_debug_renderer_info');
                if (extension) {
                    const renderer = this.gl.getParameter(extension.UNMASKED_RENDERER_WEBGL);
                    this.stats.gpuRenderer = renderer;
                }
            } catch (e) {
                // 忽略错误
            }
        }
    }
    
    /**
     * 记录性能历史
     */
    recordPerformanceHistory() {
        const record = {
            timestamp: Date.now(),
            fps: this.stats.fps,
            frameTime: this.stats.frameTime,
            memoryUsage: this.stats.memoryUsage,
            optimizationLevel: this.optimizationLevel
        };
        
        this.performanceHistory.push(record);
        
        // 保持历史记录大小
        if (this.performanceHistory.length > this.maxHistorySize) {
            this.performanceHistory.shift();
        }
    }
    
    /**
     * 检查是否需要优化
     */
    checkOptimizationNeeded() {
        const now = Date.now();
        
        // 避免频繁优化
        if (now - this.lastOptimization < 2000) return;
        
        let needOptimization = false;
        
        // FPS过低
        if (this.stats.fps < this.thresholds.minFPS) {
            needOptimization = true;
        }
        
        // 内存使用过高
        if (this.stats.memoryUsage > this.thresholds.maxMemoryMB) {
            needOptimization = true;
        }
        
        // 绘制调用过多
        if (this.stats.drawCalls > this.thresholds.maxDrawCalls) {
            needOptimization = true;
        }
        
        if (needOptimization && !this.isOptimizing) {
            this.optimizePerformance();
        }
    }
    
    /**
     * 执行性能优化
     */
    async optimizePerformance() {
        if (this.isOptimizing) return;
        
        this.isOptimizing = true;
        this.lastOptimization = Date.now();
        
        this.config.log('开始性能优化...');
        
        try {
            // 根据当前性能决定优化级别
            if (this.stats.fps < 20) {
                await this.applyAggressiveOptimization();
            } else if (this.stats.fps < 40) {
                await this.applyModerateOptimization();
            } else {
                await this.applyLightOptimization();
            }
            
            this.config.log(`性能优化完成，优化级别: ${this.optimizationLevel}`);
            
        } catch (error) {
            this.config.error('性能优化失败:', error);
        } finally {
            this.isOptimizing = false;
        }
    }
    
    /**
     * 应用激进优化
     */
    async applyAggressiveOptimization() {
        this.optimizationLevel = 2;
        
        // 降低渲染质量
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio * 0.5, 1));
        this.renderer.shadowMap.enabled = false;
        this.renderer.antialias = false;
        
        // 减少照片数量
        this.cullingRadius = 50;
        await this.updatePhotoCulling();
        
        // 使用最低LOD
        this.updateLOD('low');
        
        // 清理不必要的资源
        this.cleanupUnusedResources();
        
        // 暂停非关键动画
        this.pauseNonCriticalAnimations();
    }
    
    /**
     * 应用适中优化
     */
    async applyModerateOptimization() {
        this.optimizationLevel = 1;
        
        // 适度降低渲染质量
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio * 0.75, 1));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFShadowMap;
        
        // 适度减少照片数量
        this.cullingRadius = 100;
        await this.updatePhotoCulling();
        
        // 使用中等LOD
        this.updateLOD('medium');
        
        // 清理部分资源
        this.cleanupOldResources();
    }
    
    /**
     * 应用轻度优化
     */
    async applyLightOptimization() {
        this.optimizationLevel = 0;
        
        // 保持较高质量
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        
        // 轻度剔除
        this.cullingRadius = 150;
        await this.updatePhotoCulling();
        
        // 使用高质量LOD
        this.updateLOD('high');
        
        // 清理过期资源
        this.cleanupExpiredResources();
    }
    
    /**
     * 更新照片剔除
     */
    async updatePhotoCulling() {
        if (!this.sceneManager.photoGroup) return;
        
        const camera = this.sceneManager.camera;
        const cameraPosition = camera.position;
        
        this.sceneManager.photoGroup.children.forEach(mesh => {
            if (!mesh.userData.isPhoto) return;
            
            const distance = cameraPosition.distanceTo(mesh.position);
            const shouldShow = distance <= this.cullingRadius;
            
            if (mesh.visible !== shouldShow) {
                mesh.visible = shouldShow;
            }
        });
    }
    
    /**
     * 更新LOD级别
     */
    updateLOD(level) {
        if (!this.sceneManager.photoGroup) return;
        
        const geometryMap = {
            'high': 'photo_high',
            'medium': 'photo_medium',
            'low': 'photo_low'
        };
        
        const targetGeometry = geometryMap[level];
        if (!targetGeometry) return;
        
        this.sceneManager.photoGroup.children.forEach(mesh => {
            if (!mesh.userData.isPhoto || mesh.userData.isPlaceholder) return;
            
            // 更新几何体
            if (mesh.geometry && mesh.geometry.userData.lodLevel !== level) {
                mesh.geometry.dispose();
                mesh.geometry = this.getGeometryFromPool(targetGeometry);
                mesh.geometry.userData.lodLevel = level;
            }
        });
    }
    
    /**
     * 清理未使用的资源
     */
    cleanupUnusedResources() {
        // 清理纹理缓存
        this.cleanupTextureCache();
        
        // 清理几何体缓存
        this.cleanupGeometryCache();
        
        // 强制垃圾回收
        if (window.gc) {
            window.gc();
        }
    }
    
    /**
     * 清理旧资源
     */
    cleanupOldResources() {
        const now = Date.now();
        const maxAge = 300000; // 5分钟
        
        // 清理旧的纹理
        this.texturePool.available.forEach((texture, index) => {
            if (now - texture.lastUsed > maxAge) {
                texture.dispose();
                this.texturePool.available.splice(index, 1);
            }
        });
    }
    
    /**
     * 清理过期资源
     */
    cleanupExpiredResources() {
        const now = Date.now();
        const maxAge = 600000; // 10分钟
        
        // 清理过期的纹理
        this.texturePool.available.forEach((texture, index) => {
            if (now - texture.lastUsed > maxAge) {
                texture.dispose();
                this.texturePool.available.splice(index, 1);
            }
        });
    }
    
    /**
     * 暂停非关键动画
     */
    pauseNonCriticalAnimations() {
        // 暂停粒子系统
        if (this.sceneManager.particles) {
            this.sceneManager.particles.visible = false;
        }
        
        // 暂停背景动画
        if (this.sceneManager.starField) {
            this.sceneManager.starField.visible = false;
        }
        
        // 暂停Tween动画
        if (window.TWEEN) {
            TWEEN.removeAll();
        }
    }
    
    /**
     * 恢复动画
     */
    resumeAnimations() {
        // 恢复粒子系统
        if (this.sceneManager.particles) {
            this.sceneManager.particles.visible = true;
        }
        
        // 恢复背景动画
        if (this.sceneManager.starField) {
            this.sceneManager.starField.visible = true;
        }
    }
    
    /**
     * 初始化资源池
     */
    initializeResourcePools() {
        // 创建纹理池
        for (let i = 0; i < this.texturePool.maxSize; i++) {
            const canvas = document.createElement('canvas');
            canvas.width = 256;
            canvas.height = 256;
            
            const texture = new THREE.CanvasTexture(canvas);
            texture.minFilter = THREE.LinearFilter;
            texture.magFilter = THREE.LinearFilter;
            texture.generateMipmaps = false;
            texture.lastUsed = Date.now();
            
            this.texturePool.available.push(texture);
        }
        
        // 创建几何体池
        const geometryTypes = ['photo_high', 'photo_medium', 'photo_low'];
        geometryTypes.forEach(type => {
            this.geometryPool.available.set(type, []);
            
            for (let i = 0; i < 10; i++) {
                const geometry = this.createGeometry(type);
                this.geometryPool.available.get(type).push(geometry);
            }
        });
    }
    
    /**
     * 创建几何体
     */
    createGeometry(type) {
        const settings = {
            'photo_high': { size: 1, segments: 32 },
            'photo_medium': { size: 1, segments: 16 },
            'photo_low': { size: 1, segments: 8 }
        };
        
        const config = settings[type] || settings['photo_medium'];
        return new THREE.PlaneGeometry(config.size, config.size, config.segments, config.segments);
    }
    
    /**
     * 从池中获取几何体
     */
    getGeometryFromPool(type) {
        const pool = this.geometryPool.available.get(type);
        if (pool && pool.length > 0) {
            const geometry = pool.pop();
            this.geometryPool.inUse.add(geometry);
            return geometry;
        }
        
        // 池为空，创建新的
        const geometry = this.createGeometry(type);
        this.geometryPool.inUse.add(geometry);
        return geometry;
    }
    
    /**
     * 归还几何体到池
     */
    returnGeometryToPool(geometry, type) {
        if (this.geometryPool.inUse.has(geometry)) {
            this.geometryPool.inUse.delete(geometry);
            
            const pool = this.geometryPool.available.get(type);
            if (pool && pool.length < 10) {
                pool.push(geometry);
            } else {
                geometry.dispose();
            }
        }
    }
    
    /**
     * 从池中获取纹理
     */
    getTextureFromPool() {
        if (this.texturePool.available.length > 0) {
            const texture = this.texturePool.available.pop();
            this.texturePool.inUse.add(texture);
            texture.lastUsed = Date.now();
            return texture;
        }
        
        return null;
    }
    
    /**
     * 归还纹理到池
     */
    returnTextureToPool(texture) {
        if (this.texturePool.inUse.has(texture)) {
            this.texturePool.inUse.delete(texture);
            
            if (this.texturePool.available.length < this.texturePool.maxSize) {
                texture.lastUsed = Date.now();
                this.texturePool.available.push(texture);
            } else {
                texture.dispose();
            }
        }
    }
    
    /**
     * 清理纹理缓存
     */
    cleanupTextureCache() {
        this.texturePool.available.forEach(texture => {
            texture.dispose();
        });
        this.texturePool.available = [];
        
        this.texturePool.inUse.forEach(texture => {
            texture.dispose();
        });
        this.texturePool.inUse.clear();
    }
    
    /**
     * 清理几何体缓存
     */
    cleanupGeometryCache() {
        this.geometryPool.available.forEach(pool => {
            pool.forEach(geometry => geometry.dispose());
            pool.length = 0;
        });
        
        this.geometryPool.inUse.forEach(geometry => {
            geometry.dispose();
        });
        this.geometryPool.inUse.clear();
    }
    
    /**
     * 检测设备性能
     */
    async detectDevicePerformance() {
        this.config.log('检测设备性能...');
        
        const canvas = document.createElement('canvas');
        canvas.width = 100;
        canvas.height = 100;
        
        const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
        if (!gl) {
            this.config.warn('WebGL不支持，使用低性能模式');
            this.optimizationLevel = 2;
            return;
        }
        
        // 检测GPU信息
        const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
        if (debugInfo) {
            const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
            this.config.log('GPU:', renderer);
            
            // 根据GPU性能调整设置
            if (renderer.includes('Intel') || renderer.includes('Integrated')) {
                this.optimizationLevel = 1;
                this.config.log('检测到集成显卡，使用中等性能模式');
            }
        }
        
        // 检测内存
        if (navigator.deviceMemory) {
            this.config.log('设备内存:', navigator.deviceMemory, 'GB');
            if (navigator.deviceMemory < 4) {
                this.optimizationLevel = Math.max(this.optimizationLevel, 1);
                this.config.log('内存较少，提高优化级别');
            }
        }
        
        // 检测CPU核心数
        if (navigator.hardwareConcurrency) {
            this.config.log('CPU核心数:', navigator.hardwareConcurrency);
            if (navigator.hardwareConcurrency < 4) {
                this.optimizationLevel = Math.max(this.optimizationLevel, 1);
                this.config.log('CPU核心较少，提高优化级别');
            }
        }
    }
    
    /**
     * 设置自动优化
     */
    setupAutoOptimization() {
        // 每5秒检查一次性能
        this.optimizationTimer = setInterval(() => {
            this.checkOptimizationNeeded();
        }, 5000);
    }
    
    /**
     * 获取性能统计
     */
    getStats() {
        return {
            ...this.stats,
            optimizationLevel: this.optimizationLevel,
            isOptimizing: this.isOptimizing,
            poolStats: {
                texturePool: {
                    available: this.texturePool.available.length,
                    inUse: this.texturePool.inUse.size
                },
                geometryPool: {
                    available: Array.from(this.geometryPool.available.values()).reduce((sum, pool) => sum + pool.length, 0),
                    inUse: this.geometryPool.inUse.size
                }
            }
        };
    }
    
    /**
     * 获取性能历史
     */
    getPerformanceHistory() {
        return this.performanceHistory.slice();
    }
    
    /**
     * 手动设置优化级别
     */
    setOptimizationLevel(level) {
        this.optimizationLevel = Math.max(0, Math.min(2, level));
        this.optimizePerformance();
    }
    
    /**
     * 暂停性能监控
     */
    pauseMonitoring() {
        this.performanceTimer = false;
        
        if (this.optimizationTimer) {
            clearInterval(this.optimizationTimer);
            this.optimizationTimer = null;
        }
    }
    
    /**
     * 恢复性能监控
     */
    resumeMonitoring() {
        if (!this.performanceTimer) {
            this.startPerformanceMonitoring();
        }
        
        if (!this.optimizationTimer) {
            this.setupAutoOptimization();
        }
    }
    
    /**
     * 设置页面可见性监听
     */
    setupVisibilityListener() {
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.config.log('页面进入后台，暂停性能监控');
                this.pauseMonitoring();
            } else {
                this.config.log('页面返回前台，恢复性能监控');
                this.resumeMonitoring();
            }
        });
    }
    
    /**
     * 销毁性能管理器
     */
    dispose() {
        this.pauseMonitoring();
        this.cleanupUnusedResources();
        
        this.performanceHistory = [];
        
        this.config.log('性能管理器已销毁');
    }
}

// 导出性能管理器
window.PerformanceManager = PerformanceManager;
export default PerformanceManager;
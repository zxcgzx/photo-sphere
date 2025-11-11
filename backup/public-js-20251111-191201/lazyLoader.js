/**
 * 智能懒加载管理器
 * 基于视口距离和用户行为的高级照片加载系统
 */

class LazyLoader {
    constructor(config, sceneManager) {
        this.config = config;
        this.sceneManager = sceneManager;
        
        // 加载状态
        this.loadQueue = [];
        this.loadingSet = new Set();
        this.loadedSet = new Set();
        this.priorityQueue = [];
        
        // 性能统计
        this.stats = {
            totalRequests: 0,
            successfulLoads: 0,
            failedLoads: 0,
            averageLoadTime: 0,
            cacheHits: 0,
            memoryUsage: 0
        };
        
        // 缓存系统
        this.textureCache = new Map();
        this.geometryCache = new Map();
        this.materialCache = new Map();
        
        // 内存管理
        this.maxCacheSize = this.config.performance.maxCacheSize || 50;
        this.cacheUsageOrder = [];
        
        // 视口检测
        this.frustum = new THREE.Frustum();
        this.cameraMatrix = new THREE.Matrix4();
        
        // 距离计算
        this.tempVector = new THREE.Vector3();
        this.cameraPosition = new THREE.Vector3();
        
        // 加载控制
        this.isLoading = false;
        this.concurrentLoads = 0;
        this.maxConcurrentLoads = this.config.performance.maxConcurrentLoads || 3;
        
        // 预加载缓冲区
        this.preloadBuffer = this.config.performance.preloadBuffer || 200;
        
        // 绑定方法
        this.processQueue = this.processQueue.bind(this);
        this.updateViewport = this.updateViewport.bind(this);
        
        // 启动处理循环
        this.startProcessingLoop();
    }
    
    /**
     * 初始化懒加载器
     */
    async initialize() {
        this.config.log('初始化智能懒加载器...');
        
        // 创建基础几何体
        this.createBaseGeometries();
        
        // 预加载常用材质
        this.preloadMaterials();
        
        // 设置视口更新
        this.setupViewportUpdates();
        
        this.config.log('智能懒加载器初始化完成');
    }
    
    /**
     * 创建基础几何体
     */
    createBaseGeometries() {
        // LOD几何体（多层次细节）
        const lodSizes = [
            { size: 0.5, segments: 8, name: 'low' },
            { size: 1.0, segments: 16, name: 'medium' },
            { size: 1.5, segments: 32, name: 'high' }
        ];
        
        lodSizes.forEach(lod => {
            this.geometryCache.set(`photo_${lod.name}`, 
                new THREE.PlaneGeometry(lod.size, lod.size, lod.segments, lod.segments)
            );
        });
        
        // 圆形几何体
        this.geometryCache.set('circle_low', new THREE.CircleGeometry(0.4, 16));
        this.geometryCache.set('circle_medium', new THREE.CircleGeometry(0.5, 24));
        this.geometryCache.set('circle_high', new THREE.CircleGeometry(0.6, 32));
    }
    
    /**
     * 预加载材质
     */
    preloadMaterials() {
        // 占位符材质 - 渐变彩色
        const placeholderMaterials = [];
        for (let i = 0; i < 10; i++) {
            const canvas = this.createPlaceholderCanvas(i);
            const texture = new THREE.CanvasTexture(canvas);
            const material = new THREE.MeshBasicMaterial({
                map: texture,
                side: THREE.DoubleSide,
                transparent: true,
                opacity: 0.8
            });
            placeholderMaterials.push(material);
        }
        this.materialCache.set('placeholders', placeholderMaterials);
        
        // 加载中材质
        const loadingCanvas = this.createLoadingCanvas();
        const loadingTexture = new THREE.CanvasTexture(loadingCanvas);
        this.materialCache.set('loading', new THREE.MeshBasicMaterial({
            map: loadingTexture,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.6
        }));
    }
    
    /**
     * 创建占位符画布
     */
    createPlaceholderCanvas(index) {
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 256;
        const ctx = canvas.getContext('2d');
        
        // 星空背景
        const gradient = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
        const hue = (index * 36) % 360;
        gradient.addColorStop(0, `hsl(${hue}, 80%, 60%)`);
        gradient.addColorStop(0.5, `hsl(${(hue + 30) % 360}, 70%, 50%)`);
        gradient.addColorStop(1, `hsl(${(hue + 60) % 360}, 60%, 40%)`);
        
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 256, 256);
        
        // 添加星点
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        for (let i = 0; i < 30; i++) {
            const x = Math.random() * 256;
            const y = Math.random() * 256;
            const radius = Math.random() * 2 + 0.5;
            ctx.beginPath();
            ctx.arc(x, y, radius, 0, Math.PI * 2);
            ctx.fill();
        }
        
        // 添加中心图标
        ctx.font = '48px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = 'white';
        ctx.shadowColor = 'rgba(255, 255, 255, 0.5)';
        ctx.shadowBlur = 10;
        const emojis = ['🌟', '✨', '💫', '🌠', '⭐', '💎', '🔮', '🌈', '🎨', '🦄'];
        ctx.fillText(emojis[index % emojis.length], 128, 128);
        
        return canvas;
    }
    
    /**
     * 创建加载中画布
     */
    createLoadingCanvas() {
        const canvas = document.createElement('canvas');
        canvas.width = 128;
        canvas.height = 128;
        const ctx = canvas.getContext('2d');
        
        // 动态加载效果
        const centerX = 64;
        const centerY = 64;
        const radius = 40;
        
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.lineWidth = 4;
        ctx.lineCap = 'round';
        
        for (let i = 0; i < 8; i++) {
            const angle = (i / 8) * Math.PI * 2;
            const x1 = centerX + Math.cos(angle) * radius * 0.7;
            const y1 = centerY + Math.sin(angle) * radius * 0.7;
            const x2 = centerX + Math.cos(angle) * radius;
            const y2 = centerY + Math.sin(angle) * radius;
            
            ctx.globalAlpha = 0.3 + (i / 8) * 0.7;
            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.stroke();
        }
        
        return canvas;
    }
    
    /**
     * 设置视口更新
     */
    setupViewportUpdates() {
        let lastUpdate = 0;
        const updateInterval = 100; // 100ms
        
        this.updateViewport = () => {
            const now = Date.now();
            if (now - lastUpdate < updateInterval) return;
            
            lastUpdate = now;
            this.updateCameraMatrix();
            this.updateVisibilityQueue();
        };
        
        // 绑定到相机移动事件
        if (this.sceneManager.controls) {
            this.sceneManager.controls.addEventListener('change', this.updateViewport);
        }
    }
    
    /**
     * 更新相机矩阵
     */
    updateCameraMatrix() {
        const camera = this.sceneManager.camera;
        this.cameraMatrix.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
        this.frustum.setFromProjectionMatrix(this.cameraMatrix);
        this.cameraPosition.copy(camera.position);
    }
    
    /**
     * 更新可见性队列
     */
    updateVisibilityQueue() {
        if (!this.sceneManager.photoGroup) return;
        
        const visiblePhotos = [];
        const nearbyPhotos = [];
        
        this.sceneManager.photoGroup.children.forEach(photoMesh => {
            if (!photoMesh.userData.isPhoto) return;
            
            const position = photoMesh.position;
            const distance = this.cameraPosition.distanceTo(position);
            
            // 检查是否在视锥体内
            const isVisible = this.frustum.containsPoint(position);
            
            if (isVisible) {
                visiblePhotos.push({ mesh: photoMesh, distance, priority: 'high' });
            } else if (distance < this.preloadBuffer) {
                nearbyPhotos.push({ mesh: photoMesh, distance, priority: 'medium' });
            }
        });
        
        // 按距离排序
        visiblePhotos.sort((a, b) => a.distance - b.distance);
        nearbyPhotos.sort((a, b) => a.distance - b.distance);
        
        // 更新优先级队列
        this.priorityQueue = [...visiblePhotos, ...nearbyPhotos];
        
        // 触发加载处理
        this.processQueue();
    }
    
    /**
     * 开始处理循环
     */
    startProcessingLoop() {
        const processInterval = setInterval(() => {
            if (this.loadQueue.length > 0 || this.priorityQueue.length > 0) {
                this.processQueue();
            }
        }, 50); // 50ms间隔
        
        // 清理函数
        this.stopProcessing = () => clearInterval(processInterval);
    }
    
    /**
     * 处理加载队列
     */
    async processQueue() {
        if (this.isLoading || this.concurrentLoads >= this.maxConcurrentLoads) {
            return;
        }
        
        // 优先处理可见照片
        const nextItem = this.priorityQueue.shift() || this.loadQueue.shift();
        if (!nextItem) return;
        
        const { mesh, priority } = nextItem;
        const photoData = mesh.userData.photoData;
        
        // 检查是否已加载
        if (this.loadedSet.has(photoData.id) || this.loadingSet.has(photoData.id)) {
            return;
        }
        
        // 开始加载
        this.concurrentLoads++;
        this.loadingSet.add(photoData.id);
        
        try {
            await this.loadPhoto(mesh, photoData, priority);
            this.loadedSet.add(photoData.id);
            this.stats.successfulLoads++;
        } catch (error) {
            this.config.warn(`懒加载照片失败 ${photoData.filename}:`, error);
            this.stats.failedLoads++;
        } finally {
            this.concurrentLoads--;
            this.loadingSet.delete(photoData.id);
            this.isLoading = false;
        }
    }
    
    /**
     * 加载单张照片
     */
    async loadPhoto(mesh, photoData, priority = 'medium') {
        const startTime = Date.now();
        this.stats.totalRequests++;
        
        // 检查缓存
        const cacheKey = this.getCacheKey(photoData);
        if (this.textureCache.has(cacheKey)) {
            this.applyTextureToMesh(mesh, this.textureCache.get(cacheKey));
            this.stats.cacheHits++;
            this.updateCacheUsage(cacheKey);
            return;
        }
        
        // 显示加载状态
        this.showLoadingState(mesh);
        
        // 选择合适的图片路径
        const imagePath = this.selectImagePath(photoData, priority);
        
        // 加载纹理
        const texture = await this.loadTexture(imagePath);
        
        if (texture) {
            // 应用纹理到网格
            this.applyTextureToMesh(mesh, texture);
            
            // 缓存纹理
            this.cacheTexture(cacheKey, texture);
            
            // 记录性能统计
            const loadTime = Date.now() - startTime;
            this.updateLoadTimeStats(loadTime);
            
            // 入场动画
            this.animatePhotoEntry(mesh);
        }
    }
    
    /**
     * 选择合适的图片路径
     */
    selectImagePath(photoData, priority) {
        const paths = photoData.paths || {};
        
        switch (priority) {
            case 'high':
                return paths.original || paths.medium || paths.thumbnail;
            case 'medium':
                return paths.medium || paths.thumbnail || paths.original;
            case 'low':
                return paths.thumbnail || paths.medium || paths.original;
            default:
                return paths.medium || paths.original || paths.thumbnail;
        }
    }
    
    /**
     * 加载纹理
     */
    loadTexture(url) {
        return new Promise((resolve, reject) => {
            const loader = new THREE.TextureLoader();
            
            loader.load(
                url,
                (texture) => {
                    // 优化纹理设置
                    texture.minFilter = THREE.LinearFilter;
                    texture.magFilter = THREE.LinearFilter;
                    texture.generateMipmaps = false;
                    texture.flipY = false;
                    
                    resolve(texture);
                },
                undefined,
                (error) => {
                    this.config.warn(`纹理加载失败 ${url}:`, error);
                    resolve(null);
                }
            );
        });
    }
    
    /**
     * 应用纹理到网格
     */
    applyTextureToMesh(mesh, texture) {
        if (!mesh || !texture) return;
        
        // 计算图片比例
        const imageRatio = texture.image.width / texture.image.height;
        const scale = this.config.scene.imageSize || 1;
        
        // 更新几何体
        if (mesh.geometry) {
            mesh.geometry.dispose();
        }
        
        mesh.geometry = new THREE.PlaneGeometry(
            scale * imageRatio,
            scale,
            8,
            8
        );
        
        // 更新材质
        if (mesh.material) {
            if (mesh.material.map) {
                mesh.material.map.dispose();
            }
            mesh.material.dispose();
        }
        
        mesh.material = new THREE.MeshBasicMaterial({
            map: texture,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 1
        });
        
        // 添加边框效果
        this.addPhotoFrame(mesh);
        
        // 更新状态
        mesh.userData.isLoaded = true;
        mesh.userData.isPlaceholder = false;
    }
    
    /**
     * 显示加载状态
     */
    showLoadingState(mesh) {
        const loadingMaterial = this.materialCache.get('loading').clone();
        
        if (mesh.material) {
            mesh.material.dispose();
        }
        
        mesh.material = loadingMaterial;
        mesh.userData.isLoading = true;
    }
    
    /**
     * 添加照片边框
     */
    addPhotoFrame(mesh) {
        // 移除旧边框
        const oldFrame = mesh.getObjectByName('photoFrame');
        if (oldFrame) {
            mesh.remove(oldFrame);
            oldFrame.geometry.dispose();
            oldFrame.material.dispose();
        }
        
        // 创建新边框
        const frameGeometry = new THREE.EdgesGeometry(mesh.geometry);
        const frameMaterial = new THREE.LineBasicMaterial({
            color: 0x6495ed,
            transparent: true,
            opacity: 0.6,
            linewidth: 2
        });
        
        const frame = new THREE.LineSegments(frameGeometry, frameMaterial);
        frame.name = 'photoFrame';
        mesh.add(frame);
    }
    
    /**
     * 照片入场动画
     */
    animatePhotoEntry(mesh) {
        if (!mesh || !window.TWEEN) return;
        
        // 从小到大的缩放动画
        mesh.scale.set(0.1, 0.1, 1);
        
        new TWEEN.Tween(mesh.scale)
            .to({ x: 1, y: 1, z: 1 }, 600)
            .easing(TWEEN.Easing.Back.Out)
            .start();
        
        // 透明度动画
        if (mesh.material) {
            mesh.material.opacity = 0;
            new TWEEN.Tween(mesh.material)
                .to({ opacity: 1 }, 400)
                .easing(TWEEN.Easing.Quadratic.Out)
                .start();
        }
    }
    
    /**
     * 缓存纹理
     */
    cacheTexture(key, texture) {
        // 检查缓存大小
        if (this.textureCache.size >= this.maxCacheSize) {
            this.evictOldestCache();
        }
        
        this.textureCache.set(key, texture);
        this.updateCacheUsage(key);
        
        // 更新内存使用统计
        this.updateMemoryStats();
    }
    
    /**
     * 淘汰最旧的缓存
     */
    evictOldestCache() {
        const oldestKey = this.cacheUsageOrder.shift();
        if (oldestKey && this.textureCache.has(oldestKey)) {
            const texture = this.textureCache.get(oldestKey);
            texture.dispose();
            this.textureCache.delete(oldestKey);
        }
    }
    
    /**
     * 更新缓存使用顺序
     */
    updateCacheUsage(key) {
        const index = this.cacheUsageOrder.indexOf(key);
        if (index > -1) {
            this.cacheUsageOrder.splice(index, 1);
        }
        this.cacheUsageOrder.push(key);
    }
    
    /**
     * 获取缓存键
     */
    getCacheKey(photoData) {
        return `${photoData.id}_${photoData.filename}`;
    }
    
    /**
     * 更新加载时间统计
     */
    updateLoadTimeStats(loadTime) {
        const totalTime = this.stats.averageLoadTime * (this.stats.successfulLoads - 1) + loadTime;
        this.stats.averageLoadTime = totalTime / this.stats.successfulLoads;
    }
    
    /**
     * 更新内存使用统计
     */
    updateMemoryStats() {
        let memoryUsage = 0;
        this.textureCache.forEach(texture => {
            if (texture.image) {
                memoryUsage += texture.image.width * texture.image.height * 4; // RGBA
            }
        });
        this.stats.memoryUsage = memoryUsage;
    }
    
    /**
     * 添加到加载队列
     */
    addToQueue(mesh, photoData, priority = 'medium') {
        const item = { mesh, photoData, priority };
        
        if (priority === 'high') {
            this.priorityQueue.unshift(item);
        } else {
            this.loadQueue.push(item);
        }
    }
    
    /**
     * 预加载附近照片
     */
    preloadNearbyPhotos(centerPosition, radius = 100) {
        if (!this.sceneManager.photoGroup) return;
        
        const nearbyPhotos = [];
        
        this.sceneManager.photoGroup.children.forEach(mesh => {
            if (!mesh.userData.isPhoto || mesh.userData.isLoaded) return;
            
            const distance = centerPosition.distanceTo(mesh.position);
            if (distance <= radius) {
                nearbyPhotos.push({ mesh, distance });
            }
        });
        
        // 按距离排序并添加到队列
        nearbyPhotos
            .sort((a, b) => a.distance - b.distance)
            .forEach(({ mesh }) => {
                this.addToQueue(mesh, mesh.userData.photoData, 'low');
            });
    }
    
    /**
     * 获取加载统计
     */
    getStats() {
        return {
            ...this.stats,
            cacheSize: this.textureCache.size,
            queueSize: this.loadQueue.length + this.priorityQueue.length,
            loadingCount: this.loadingSet.size,
            loadedCount: this.loadedSet.size,
            memoryUsageMB: Math.round(this.stats.memoryUsage / (1024 * 1024))
        };
    }
    
    /**
     * 清理资源
     */
    dispose() {
        // 停止处理循环
        if (this.stopProcessing) {
            this.stopProcessing();
        }
        
        // 清理纹理缓存
        this.textureCache.forEach(texture => texture.dispose());
        this.textureCache.clear();
        
        // 清理几何体缓存
        this.geometryCache.forEach(geometry => geometry.dispose());
        this.geometryCache.clear();
        
        // 清理材质缓存
        this.materialCache.forEach(material => {
            if (Array.isArray(material)) {
                material.forEach(mat => mat.dispose());
            } else {
                material.dispose();
            }
        });
        this.materialCache.clear();
        
        // 清理队列
        this.loadQueue = [];
        this.priorityQueue = [];
        this.loadingSet.clear();
        this.loadedSet.clear();
        
        this.config.log('懒加载器已清理');
    }
}

// 导出懒加载器
window.LazyLoader = LazyLoader;
export default LazyLoader;
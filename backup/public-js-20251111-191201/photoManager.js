/**
 * 照片管理器
 * 负责照片的加载、显示、管理和3D定位
 */

import { CONFIG } from './config.js';

class PhotoManager {
    constructor(config, sceneManager) {
        this.config = config || CONFIG;
        this.sceneManager = sceneManager;
        
        // 照片数据
        this.photos = [];
        this.photoMeshes = [];
        this.loadedCount = 0;
        
        // 加载状态
        this.isLoading = false;
        this.loadingPromise = null;
        
        // 缓存系统
        this.textureCache = new Map();
        this.loadQueue = [];
        
        // 事件回调
        this.onLoadProgress = null;
        this.onLoadComplete = null;
        this.onPhotoClick = null;
        
        // 几何体和材质缓存
        this.geometryCache = new Map();
        this.materialCache = new Map();
        
        // 懒加载器和性能管理器
        this.lazyLoader = null;
        this.performanceManager = null;
    }
    
    /**
     * 初始化照片管理器
     */
    async initialize() {
        try {
            this.config.log('初始化照片管理器...');
            
            // 创建基础几何体
            this.createBaseGeometries();
            
            // 预加载一些基础材质
            this.preloadMaterials();
            
            // 初始化懒加载器
            this.lazyLoader = new LazyLoader(this.config, this.sceneManager);
            await this.lazyLoader.initialize();
            
            // 初始化性能管理器
            this.performanceManager = new PerformanceManager(this.config, this.sceneManager);
            await this.performanceManager.initialize();
            
            this.config.log('照片管理器初始化完成');
            
        } catch (error) {
            this.config.error('照片管理器初始化失败:', error);
            throw error;
        }
    }
    
    /**
     * 创建基础几何体
     */
    createBaseGeometries() {
        // 标准照片几何体
        this.geometryCache.set('photo', new THREE.PlaneGeometry(1, 1));
        this.geometryCache.set('frame', new THREE.PlaneGeometry(1.1, 1.1));
        
        // 圆形照片几何体
        this.geometryCache.set('circle', new THREE.CircleGeometry(0.5, 32));
    }
    
    /**
     * 预加载材质
     */
    preloadMaterials() {
        // 占位符材质
        const placeholderCanvas = this.createPlaceholderTexture();
        const placeholderTexture = new THREE.CanvasTexture(placeholderCanvas);
        this.materialCache.set('placeholder', new THREE.MeshBasicMaterial({
            map: placeholderTexture,
            side: THREE.DoubleSide,
            transparent: true
        }));
        
        // 边框材质
        this.materialCache.set('frame', new THREE.LineBasicMaterial({
            color: 0x6495ed,
            transparent: true,
            opacity: 0.8,
            linewidth: 2
        }));
    }
    
    /**
     * 创建占位符纹理
     */
    createPlaceholderTexture(index = 0) {
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 256;
        const ctx = canvas.getContext('2d');
        
        // 渐变背景
        const gradient = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
        const hue = (index / this.config.photos.photoCount) * 360;
        gradient.addColorStop(0, `hsl(${(hue + 200) % 360}, 60%, 50%)`);
        gradient.addColorStop(0.5, `hsl(${(hue + 240) % 360}, 70%, 40%)`);
        gradient.addColorStop(1, `hsl(${(hue + 280) % 360}, 80%, 30%)`);
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 256, 256);
        
        // 添加星点
        for (let i = 0; i < 20; i++) {
            ctx.beginPath();
            ctx.arc(Math.random() * 256, Math.random() * 256, Math.random() * 2, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255, 255, 255, ${Math.random() * 0.8 + 0.2})`;
            ctx.fill();
        }
        
        // 添加图标
        ctx.font = '80px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = 'white';
        ctx.shadowColor = 'rgba(255, 255, 255, 0.8)';
        ctx.shadowBlur = 20;
        const emoji = this.config.getRandomEmoji();
        ctx.fillText(emoji, 128, 128);
        
        return canvas;
    }
    
    /**
     * 从服务器加载照片数据
     */
    async loadPhotosFromServer() {
        try {
            const response = await fetch(this.config.api.baseUrl + this.config.api.endpoints.photos);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            if (data.success) {
                this.photos = data.data.photos;
                this.config.log(`从服务器加载了 ${this.photos.length} 张照片`);
                return this.photos;
            } else {
                throw new Error(data.message || '加载照片失败');
            }
            
        } catch (error) {
            this.config.warn('从服务器加载照片失败，使用默认照片:', error);
            return this.loadDefaultPhotos();
        }
    }
    
    /**
     * 加载默认照片（向后兼容）
     */
    loadDefaultPhotos() {
        const photos = [];
        for (let i = 1; i <= this.config.photos.photoCount; i++) {
            photos.push({
                id: i,
                filename: `photo${i}.jpg`,
                originalFilename: `photo${i}.jpg`,
                title: this.config.captions[i - 1] || `照片 ${i}`,
                description: '',
                paths: {
                    original: `photos/photo${i}.jpg`,
                    thumbnail: `photos/photo${i}.jpg`,
                    medium: `photos/photo${i}.jpg`
                },
                position: this.calculateSpherePosition(i - 1, this.config.photos.photoCount),
                createdAt: new Date().toISOString()
            });
        }
        this.photos = photos;
        return photos;
    }
    
    /**
     * 加载并显示所有照片
     */
    async loadAndDisplayPhotos() {
        if (this.isLoading) {
            return this.loadingPromise;
        }
        
        this.isLoading = true;
        this.loadingPromise = this._performPhotoLoading();
        
        try {
            await this.loadingPromise;
        } finally {
            this.isLoading = false;
            this.loadingPromise = null;
        }
    }
    
    /**
     * 智能加载照片（使用懒加载）
     */
    async smartLoadPhotos() {
        if (this.isLoading) {
            return this.loadingPromise;
        }
        
        this.isLoading = true;
        this.loadingPromise = this._performSmartLoading();
        
        try {
            await this.loadingPromise;
        } finally {
            this.isLoading = false;
            this.loadingPromise = null;
        }
    }
    
    /**
     * 执行智能加载
     */
    async _performSmartLoading() {
        try {
            // 先加载照片数据
            await this.loadPhotosFromServer();
            
            // 创建占位符网格
            this.createPlaceholderMeshes();
            
            // 使用懒加载器管理实际图片加载
            if (this.lazyLoader) {
                this.photos.forEach((photo, index) => {
                    const mesh = this.photoMeshes[index];
                    if (mesh) {
                        this.lazyLoader.addToQueue(mesh, photo, 'medium');
                    }
                });
            }
            
            // 更新统计信息
            if (this.onLoadProgress) {
                this.onLoadProgress(100, this.photos.length, this.photos.length);
            }
            
            if (this.onLoadComplete) {
                this.onLoadComplete(this.photos.length, this.photos.length);
            }
            
            this.config.log(`智能加载完成，创建了 ${this.photos.length} 个占位符，等待懒加载`);
            
        } catch (error) {
            this.config.error('智能加载失败:', error);
            throw error;
        }
    }
    
    /**
     * 创建占位符网格
     */
    createPlaceholderMeshes() {
        this.photos.forEach((photo, index) => {
            const position = this.getPhotoPosition(photo, index);
            const mesh = this.createPlaceholderMesh(photo, index, position);
            this.photoMeshes.push(mesh);
        });
    }
    
    /**
     * 创建占位符网格（增强版）
     */
    createPlaceholderMesh(photoData, index, position) {
        const placeholderTexture = new THREE.CanvasTexture(
            this.createPlaceholderTexture(index)
        );
        
        const geometry = this.geometryCache.get('photo');
        const material = new THREE.MeshBasicMaterial({
            map: placeholderTexture,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.8
        });
        
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.copy(position);
        
        // 计算朝向
        const normal = position.clone().normalize();
        const lookAtPosition = position.clone().add(normal);
        mesh.lookAt(lookAtPosition);
        mesh.rotateZ(Math.random() * Math.PI * 0.1);
        
        // 设置用户数据
        mesh.userData = {
            photoData,
            index,
            originalPosition: position.clone(),
            normal: normal.clone(),
            isPhoto: true,
            isPlaceholder: true,
            isLoaded: false
        };
        
        // 添加到场景
        this.sceneManager.photoGroup.add(mesh);
        
        // 入场动画
        this.animatePhotoEntry(mesh, index);
        
        return mesh;
    }
    
    /**
     * 执行照片加载
     */
    async _performPhotoLoading() {
        try {
            // 先加载照片数据
            await this.loadPhotosFromServer();
            
            // 分批加载照片纹理
            const batchSize = this.config.photos.batchLoadSize;
            const totalBatches = Math.ceil(this.photos.length / batchSize);
            
            for (let batch = 0; batch < totalBatches; batch++) {
                const startIndex = batch * batchSize;
                const endIndex = Math.min(startIndex + batchSize, this.photos.length);
                const batchPhotos = this.photos.slice(startIndex, endIndex);
                
                // 并行加载批次中的照片
                const batchPromises = batchPhotos.map((photo, index) => 
                    this.loadSinglePhoto(photo, startIndex + index)
                );
                
                await Promise.allSettled(batchPromises);
                
                // 更新进度
                const progress = Math.round((endIndex / this.photos.length) * 100);
                if (this.onLoadProgress) {
                    this.onLoadProgress(progress, endIndex, this.photos.length);
                }
                
                // 批次之间的延迟
                if (batch < totalBatches - 1) {
                    await new Promise(resolve => setTimeout(resolve, this.config.photos.loadDelay));
                }
            }
            
            this.config.log(`所有照片加载完成，成功加载 ${this.loadedCount} / ${this.photos.length} 张`);
            
            if (this.onLoadComplete) {
                this.onLoadComplete(this.loadedCount, this.photos.length);
            }
            
        } catch (error) {
            this.config.error('照片加载过程失败:', error);
            throw error;
        }
    }
    
    /**
     * 加载单张照片
     */
    async loadSinglePhoto(photoData, index) {
        try {
            // 检查缓存
            const cacheKey = photoData.paths.medium || photoData.paths.original;
            if (this.textureCache.has(cacheKey)) {
                this.createPhotoMesh(this.textureCache.get(cacheKey), photoData, index);
                return;
            }
            
            // 创建占位符
            const position = this.getPhotoPosition(photoData, index);
            const placeholderMesh = this.createPlaceholderMesh(photoData, index, position);
            
            // 加载纹理
            const texture = await this.loadTexture(cacheKey);
            
            // 替换占位符
            if (texture) {
                this.textureCache.set(cacheKey, texture);
                this.replacePlaceholder(placeholderMesh, texture, photoData, index);
                this.loadedCount++;
            }
            
        } catch (error) {
            this.config.warn(`加载照片 ${photoData.filename} 失败:`, error);
            // 保留占位符
        }
    }
    
    /**
     * 加载纹理（优化版，使用缓存的 TextureLoader）
     */
    loadTexture(url) {
        return new Promise((resolve, reject) => {
            // 使用缓存的 TextureLoader 实例
            if (!this.textureLoader) {
                this.textureLoader = new THREE.TextureLoader();
            }
            
            this.textureLoader.load(
                url,
                (texture) => {
                    // 优化纹理设置
                    texture.minFilter = THREE.LinearFilter;
                    texture.magFilter = THREE.LinearFilter;
                    texture.generateMipmaps = this.config.performance.enableMipmaps;
                    
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
     * 替换占位符
     */
    replacePlaceholder(placeholderMesh, texture, photoData, index) {
        if (!placeholderMesh.parent) return;
        
        // 计算图片比例
        const imageRatio = texture.image.width / texture.image.height;
        const photoWidth = this.config.scene.imageSize * imageRatio;
        const photoHeight = this.config.scene.imageSize;
        
        // 创建新几何体和材质
        const geometry = new THREE.PlaneGeometry(photoWidth, photoHeight);
        const material = new THREE.MeshBasicMaterial({
            map: texture,
            side: THREE.DoubleSide,
            transparent: true
        });
        
        // 创建新网格
        const newMesh = new THREE.Mesh(geometry, material);
        
        // 复制位置和旋转
        newMesh.position.copy(placeholderMesh.position);
        newMesh.rotation.copy(placeholderMesh.rotation);
        newMesh.scale.copy(placeholderMesh.scale);
        
        // 设置用户数据
        newMesh.userData = { ...placeholderMesh.userData };
        newMesh.userData.isPlaceholder = false;
        
        // 添加边框和发光效果
        this.addPhotoEffects(newMesh, geometry);
        
        // 替换网格
        const parent = placeholderMesh.parent;
        parent.remove(placeholderMesh);
        parent.add(newMesh);
        
        // 更新引用
        const meshIndex = this.photoMeshes.indexOf(placeholderMesh);
        if (meshIndex !== -1) {
            this.photoMeshes[meshIndex] = newMesh;
        }
        
        // 清理占位符资源
        this.disposeMesh(placeholderMesh);
        
        // 入场动画
        this.animatePhotoEntry(newMesh, index);
    }
    
    /**
     * 创建照片网格
     */
    createPhotoMesh(texture, photoData, index) {
        const position = this.getPhotoPosition(photoData, index);
        
        // 计算图片比例
        const imageRatio = texture.image.width / texture.image.height;
        const photoWidth = this.config.scene.imageSize * imageRatio;
        const photoHeight = this.config.scene.imageSize;
        
        const geometry = new THREE.PlaneGeometry(photoWidth, photoHeight);
        const material = new THREE.MeshBasicMaterial({
            map: texture,
            side: THREE.DoubleSide,
            transparent: true
        });
        
        const mesh = this.createPhotoMeshWithGeometry(geometry, material, position, photoData, index);
        this.animatePhotoEntry(mesh, index);
        
        return mesh;
    }
    
    /**
     * 创建带几何体的照片网格
     */
    createPhotoMeshWithGeometry(geometry, material, position, photoData, index) {
        const mesh = new THREE.Mesh(geometry, material);
        
        // 设置位置
        mesh.position.copy(position);
        
        // 计算朝向
        const normal = position.clone().normalize();
        const lookAtPosition = position.clone().add(normal);
        mesh.lookAt(lookAtPosition);
        mesh.rotateZ(Math.random() * Math.PI * 0.1);
        
        // 设置用户数据
        mesh.userData = {
            photoData,
            index,
            originalPosition: position.clone(),
            normal: normal.clone(),
            isPhoto: true
        };
        
        // 添加效果
        this.addPhotoEffects(mesh, geometry);
        
        // 添加到场景和数组
        this.sceneManager.photoGroup.add(mesh);
        this.photoMeshes.push(mesh);
        
        return mesh;
    }
    
    /**
     * 添加照片效果
     */
    addPhotoEffects(mesh, geometry) {
        // 添加边框
        const edgeGeometry = new THREE.EdgesGeometry(geometry);
        const edgeMaterial = this.materialCache.get('frame').clone();
        const edges = new THREE.LineSegments(edgeGeometry, edgeMaterial);
        mesh.add(edges);
        
        // 添加发光效果
        const glowMaterial = new THREE.MeshBasicMaterial({
            color: 0x4169e1,
            transparent: true,
            opacity: 0.3,
            side: THREE.BackSide
        });
        const glowMesh = new THREE.Mesh(geometry.clone(), glowMaterial);
        glowMesh.scale.set(1.1, 1.1, 1.1);
        mesh.add(glowMesh);
    }
    
    /**
     * 获取照片位置
     */
    getPhotoPosition(photoData, index) {
        // 如果照片数据中有位置信息，使用它
        if (photoData.position) {
            return new THREE.Vector3(
                photoData.position.x || photoData.position_x,
                photoData.position.y || photoData.position_y,
                photoData.position.z || photoData.position_z
            );
        }
        
        // 否则计算球面位置
        return this.calculateSpherePosition(index, this.photos.length);
    }
    
    /**
     * 计算球面位置（Fibonacci分布）
     */
    calculateSpherePosition(index, total) {
        const goldenRatio = (1 + Math.sqrt(5)) / 2;
        
        const y = 1 - (index / (total - 1)) * 2;
        const radiusAtY = Math.sqrt(1 - y * y);
        const theta = 2 * Math.PI * index / goldenRatio;
        
        const x = Math.cos(theta) * radiusAtY;
        const z = Math.sin(theta) * radiusAtY;
        
        // 添加轻微随机偏移
        const randomOffset = 0.05;
        const offsetX = (Math.random() - 0.5) * randomOffset;
        const offsetY = (Math.random() - 0.5) * randomOffset;
        const offsetZ = (Math.random() - 0.5) * randomOffset;
        
        return new THREE.Vector3(
            (x + offsetX) * this.config.scene.radius,
            (y + offsetY) * this.config.scene.radius,
            (z + offsetZ) * this.config.scene.radius
        );
    }
    
    /**
     * 照片入场动画
     */
    animatePhotoEntry(mesh, index) {
        mesh.scale.set(0, 0, 1);
        
        if (window.TWEEN) {
            new TWEEN.Tween(mesh.scale)
                .to({ x: 1, y: 1 }, this.config.animations.photoScaleDuration)
                .delay(index * this.config.animations.photoEntryDelay)
                .easing(TWEEN.Easing.Back.Out)
                .start();
        } else {
            // 回退到CSS动画或立即显示
            mesh.scale.set(1, 1, 1);
        }
    }
    
    /**
     * 处理照片点击
     */
    handlePhotoClick(event) {
        const intersects = this.sceneManager.raycast(
            { x: event.clientX, y: event.clientY },
            this.photoMeshes.filter(mesh => mesh.userData.isPhoto && !mesh.userData.isPlaceholder)
        );
        
        if (intersects.length > 0) {
            const selectedMesh = intersects[0].object;
            if (this.onPhotoClick) {
                this.onPhotoClick(selectedMesh.userData.photoData, selectedMesh);
            }
        }
    }
    
    /**
     * 高亮照片
     */
    highlightPhoto(mesh) {
        if (!mesh || !mesh.userData.isPhoto) return;
        
        if (window.TWEEN) {
            new TWEEN.Tween(mesh.scale)
                .to({ x: 1.2, y: 1.2, z: 1 }, this.config.animations.pulseScaleDuration)
                .easing(TWEEN.Easing.Back.Out)
                .onComplete(() => {
                    new TWEEN.Tween(mesh.scale)
                        .to({ x: 1, y: 1, z: 1 }, this.config.animations.pulseScaleDuration)
                        .start();
                })
                .start();
        }
    }
    
    /**
     * 随机选择照片
     */
    getRandomPhoto() {
        const validMeshes = this.photoMeshes.filter(mesh => 
            mesh.userData.isPhoto && !mesh.userData.isPlaceholder
        );
        
        if (validMeshes.length === 0) return null;
        
        return validMeshes[Math.floor(Math.random() * validMeshes.length)];
    }
    
    /**
     * 重新分布照片位置
     */
    redistributePhotos() {
        this.photoMeshes.forEach((mesh, index) => {
            if (mesh.userData.isPhoto) {
                const newPosition = this.calculateSpherePosition(index, this.photoMeshes.length);
                
                if (window.TWEEN) {
                    new TWEEN.Tween(mesh.position)
                        .to(newPosition, 1000)
                        .easing(TWEEN.Easing.Quadratic.InOut)
                        .start();
                } else {
                    mesh.position.copy(newPosition);
                }
                
                mesh.userData.originalPosition = newPosition.clone();
            }
        });
    }
    
    /**
     * 清理单个网格资源
     */
    disposeMesh(mesh) {
        if (mesh.geometry) {
            mesh.geometry.dispose();
        }
        
        if (mesh.material) {
            if (Array.isArray(mesh.material)) {
                mesh.material.forEach(material => {
                    if (material.map) material.map.dispose();
                    material.dispose();
                });
            } else {
                if (mesh.material.map) mesh.material.map.dispose();
                mesh.material.dispose();
            }
        }
        
        // 清理子对象
        mesh.children.forEach(child => {
            this.disposeMesh(child);
        });
    }
    
    /**
     * 获取加载统计
     */
    getLoadingStats() {
        return {
            total: this.photos.length,
            loaded: this.loadedCount,
            progress: this.photos.length > 0 ? (this.loadedCount / this.photos.length) * 100 : 0,
            isLoading: this.isLoading
        };
    }
    
    /**
     * 刷新照片（重新从服务器加载）
     */
    async refreshPhotos() {
        this.config.log('刷新照片...');
        
        // 清理现有照片
        this.clear();
        
        // 重新加载
        await this.loadAndDisplayPhotos();
    }
    
    /**
     * 清理所有资源
     */
    clear() {
        // 清理网格
        this.photoMeshes.forEach(mesh => {
            if (mesh.parent) {
                mesh.parent.remove(mesh);
            }
            this.disposeMesh(mesh);
        });
        
        this.photoMeshes = [];
        this.photos = [];
        this.loadedCount = 0;
        
        // 清理缓存
        this.textureCache.forEach(texture => texture.dispose());
        this.textureCache.clear();
        
        this.config.log('照片管理器已清理');
    }
    
    /**
     * 销毁照片管理器
     */
    dispose() {
        this.clear();
        
        // 清理懒加载器
        if (this.lazyLoader) {
            this.lazyLoader.dispose();
            this.lazyLoader = null;
        }
        
        // 清理性能管理器
        if (this.performanceManager) {
            this.performanceManager.dispose();
            this.performanceManager = null;
        }
        
        // 清理几何体缓存
        this.geometryCache.forEach(geometry => geometry.dispose());
        this.geometryCache.clear();
        
        // 清理材质缓存
        this.materialCache.forEach(material => material.dispose());
        this.materialCache.clear();
        
        this.config.log('照片管理器已销毁');
    }
    
    /**
     * 获取性能统计信息
     */
    getPerformanceStats() {
        const stats = {
            photos: this.photos.length,
            loaded: this.loadedCount,
            meshes: this.photoMeshes.length,
            cacheSize: this.textureCache.size
        };
        
        if (this.lazyLoader) {
            Object.assign(stats, {
                lazyLoader: this.lazyLoader.getStats()
            });
        }
        
        if (this.performanceManager) {
            Object.assign(stats, {
                performance: this.performanceManager.getStats()
            });
        }
        
        return stats;
    }
    
    /**
     * 切换到智能加载模式
     */
    enableSmartLoading() {
        this.config.log('启用智能加载模式');
        this.config.photos.useSmartLoading = true;
    }
    
    /**
     * 预加载指定区域的照片
     */
    preloadArea(centerPosition, radius = 100) {
        if (this.lazyLoader) {
            this.lazyLoader.preloadNearbyPhotos(centerPosition, radius);
        }
    }
    
    /**
     * 强制加载可见照片
     */
    forceLoadVisible() {
        if (this.lazyLoader) {
            this.lazyLoader.updateVisibilityQueue();
        }
    }
}

// 导出照片管理器
window.PhotoManager = PhotoManager;
export default PhotoManager;
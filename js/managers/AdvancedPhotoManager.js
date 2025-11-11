/**
 * 高级照片管理器
 * 支持分类、搜索、标签、智能加载
 */

import { THREE_LIB as THREE } from '../core/DependencyManager.js';
import eventBus from '../core/EventBus.js';
import ResourceManager from '../core/ResourceManager.js';

class AdvancedPhotoManager {
    constructor(scene, config = {}) {
        this.scene = scene;
        this.config = {
            radius: 320,
            photoSize: 64,
            maxPhotos: 1000,
            enableLOD: true,
            enableVirtualScroll: true,
            categories: ['默认', '旅行', '生日', '节日', '日常'],
            ...config
        };
        
        this.resourceManager = new ResourceManager();
        
        // 照片数据
        this.photos = new Map();
        this.photoArray = [];
        this.categories = new Map();
        this.tags = new Map();
        
        // 搜索和过滤
        this.searchQuery = '';
        this.activeFilters = new Set();
        this.filteredPhotos = [];
        
        // LOD系统
        this.lodLevels = [
            { distance: 0, quality: 1.0, size: 1.0 },
            { distance: 300, quality: 0.7, size: 0.8 },
            { distance: 500, quality: 0.4, size: 0.6 },
            { distance: 700, quality: 0.2, size: 0.4 }
        ];
        
        // 虚拟滚动
        this.visibleRange = { start: 0, end: 50 };
        this.pageSize = 50;
        
        // 加载队列
        this.loadQueue = [];
        this.isLoading = false;
        this.loadedCount = 0;
        
        this.init();
    }
    
    init() {
        this.createPhotoGroup();
        this.bindEvents();
        console.log('[AdvancedPhotoManager] 初始化完成');
    }
    
    createPhotoGroup() {
        this.photoGroup = new THREE.Group();
        this.photoGroup.name = 'PhotoGroup';
        this.scene.add(this.photoGroup);
    }
    
    bindEvents() {
        // 监听相机位置变化，更新LOD
        eventBus.on('camera.moved', (position) => {
            this.updateLOD(position);
        });
        
        // 监听搜索
        eventBus.on('search', (query) => {
            this.search(query);
        });
        
        // 监听过滤
        eventBus.on('filter', (filters) => {
            this.applyFilters(filters);
        });
    }
    
    /**
     * 智能加载照片（分页 + 虚拟滚动）
     */
    async loadPhotosSmart(photoDataList, startIndex = 0) {
        console.log(`[AdvancedPhotoManager] 智能加载 ${photoDataList.length} 张照片`);
        
        // 分批加载，避免阻塞
        const batches = this.createBatches(photoDataList, this.pageSize);
        
        for (let i = 0; i < batches.length; i++) {
            const batch = batches[i];
            
            // 检查是否需要加载（在可视范围内）
            const batchEndIndex = startIndex + (i + 1) * this.pageSize;
            if (batchEndIndex < this.visibleRange.start || batch.startIndex > this.visibleRange.end) {
                console.log(`[AdvancedPhotoManager] 跳过不可见批次: ${batch.startIndex}-${batch.endIndex}`);
                continue;
            }
            
            await this.loadBatch(batch, startIndex + batch.startIndex);
            
            // 触发加载进度事件
            eventBus.emit('photos.loading', {
                loaded: this.loadedCount,
                total: photoDataList.length,
                percentage: Math.round((this.loadedCount / photoDataList.length) * 100)
            });
        }
        
        // 创建初始轨道
        this.createPhotoOrbit();
        
        console.log('[AdvancedPhotoManager] 智能加载完成');
    }
    
    /**
     * 创建加载批次
     */
    createBatches(array, batchSize) {
        const batches = [];
        for (let i = 0; i < array.length; i += batchSize) {
            batches.push({
                items: array.slice(i, i + batchSize),
                startIndex: i,
                endIndex: Math.min(i + batchSize, array.length)
            });
        }
        return batches;
    }
    
    /**
     * 加载批次
     */
    async loadBatch(batch, globalStartIndex) {
        const loadPromises = batch.items.map((photoData, localIndex) => {
            const globalIndex = globalStartIndex + localIndex;
            return this.loadPhoto(photoData, globalIndex);
        });
        
        const results = await Promise.allSettled(loadPromises);
        
        results.forEach((result, index) => {
            if (result.status === 'fulfilled' && result.value) {
                const photo = result.value;
                this.photos.set(photo.id, photo);
                this.photoArray.push(photo);
                this.loadedCount++;
                
                // 添加到分类
                this.addToCategory(photo);
                
                // 添加到标签
                if (photo.tags) {
                    photo.tags.forEach(tag => this.addToTag(tag, photo));
                }
            }
        });
    }
    
    /**
     * 加载单张照片（带LOD）
     */
    async loadPhoto(photoData, index) {
        try {
            const photo = {
                id: photoData.id || `photo_${index}`,
                url: photoData.paths?.original || photoData.url,
                thumbnail: photoData.paths?.thumbnail || photoData.url,
                index,
                mesh: null,
                loaded: false,
                category: photoData.category || '默认',
                tags: photoData.tags || [],
                metadata: {
                    title: photoData.title || `照片 ${index + 1}`,
                    description: photoData.description || '',
                    createdAt: photoData.createdAt || new Date().toISOString(),
                    fileSize: photoData.fileSize || 0,
                    width: photoData.width || 512,
                    height: photoData.height || 512
                },
                lod: {
                    currentLevel: 0,
                    targetQuality: 1.0,
                    currentQuality: 1.0
                }
            };
            
            // 加载纹理（根据LOD级别）
            const texture = await this.loadTextureWithLOD(photo);
            photo.texture = texture;
            photo.loaded = true;
            
            // 创建LOD网格
            photo.mesh = this.createLODMesh(photo);
            photo.mesh.userData.photo = photo;
            
            console.log(`[AdvancedPhotoManager] 照片加载完成: ${photo.id}`);
            
            return photo;
            
        } catch (error) {
            console.error(`[AdvancedPhotoManager] 照片加载失败:`, error);
            return null;
        }
    }
    
    /**
     * 带LOD的纹理加载
     */
    async loadTextureWithLOD(photo) {
        // 根据距离决定加载质量
        const distance = this.calculateDistance(photo);
        const lodLevel = this.getLODLevel(distance);
        
        // 优先加载缩略图
        const url = lodLevel > 1 ? photo.thumbnail : photo.url;
        
        return new Promise((resolve, reject) => {
            const loader = new THREE.TextureLoader();
            loader.load(
                url,
                (texture) => {
                    texture.minFilter = THREE.LinearFilter;
                    texture.magFilter = THREE.LinearFilter;
                    texture.generateMipmaps = false;
                    
                    // 根据LOD调整纹理质量
                    if (lodLevel > 1) {
                        texture.anisotropy = 1;
                    }
                    
                    resolve(texture);
                },
                undefined,
                reject
            );
        });
    }
    
    /**
     * 创建LOD网格
     */
    createLODMesh(photo) {
        // 创建基础几何体
        const geometry = this.resourceManager.acquireFromPool('photoGeometry', () => {
            return new THREE.PlaneGeometry(this.config.photoSize, this.config.photoSize);
        });
        
        // 创建材质
        const material = new THREE.MeshStandardMaterial({
            map: photo.texture,
            transparent: true,
            opacity: 0.9,
            roughness: 0.3,
            metalness: 0.1,
            side: THREE.DoubleSide
        });
        
        // 创建网格
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.copy(this.calculateSpherePosition(photo.index, this.photoArray.length));
        mesh.lookAt(0, 0, 0);
        
        // 存储照片数据
        mesh.userData.photoId = photo.id;
        mesh.userData.isPhoto = true;
        mesh.userData.lodLevel = 0;
        
        return mesh;
    }
    
    /**
     * 更新LOD（基于相机距离）
     */
    updateLOD(cameraPosition) {
        if (!this.config.enableLOD) return;
        
        this.photoArray.forEach(photo => {
            if (!photo.mesh || !photo.loaded) return;
            
            const distance = cameraPosition.distanceTo(photo.mesh.position);
            const lodLevel = this.getLODLevel(distance);
            
            if (lodLevel !== photo.lod.currentLevel) {
                this.applyLOD(photo, lodLevel);
            }
        });
    }
    
    /**
     * 获取LOD级别
     */
    getLODLevel(distance) {
        for (let i = this.lodLevels.length - 1; i >= 0; i--) {
            if (distance >= this.lodLevels[i].distance) {
                return i;
            }
        }
        return 0;
    }
    
    /**
     * 应用LOD
     */
    applyLOD(photo, lodLevel) {
        const lodConfig = this.lodLevels[lodLevel];
        
        // 更新质量
        photo.lod.currentLevel = lodLevel;
        photo.lod.targetQuality = lodConfig.quality;
        
        // 更新材质
        if (photo.mesh.material) {
            photo.mesh.material.opacity = 0.9 * lodConfig.quality;
        }
        
        // 更新大小
        const scale = lodConfig.size;
        photo.mesh.scale.set(scale, scale, scale);
        
        console.log(`[AdvancedPhotoManager] 应用LOD: ${photo.id} → 级别${lodLevel}`);
    }
    
    /**
     * 搜索照片
     */
    search(query) {
        this.searchQuery = query.toLowerCase().trim();
        this.applyFilters();
        
        console.log(`[AdvancedPhotoManager] 搜索: "${query}"，找到 ${this.filteredPhotos.length} 张`);
        
        eventBus.emit('search.results', {
            query,
            results: this.filteredPhotos,
            count: this.filteredPhotos.length
        });
    }
    
    /**
     * 应用过滤器
     */
    applyFilters(filters = []) {
        this.activeFilters = new Set(filters);
        
        if (this.searchQuery || this.activeFilters.size > 0) {
            this.filteredPhotos = this.photoArray.filter(photo => {
                // 搜索匹配
                const matchesSearch = !this.searchQuery || 
                    photo.metadata.title.toLowerCase().includes(this.searchQuery) ||
                    photo.metadata.description.toLowerCase().includes(this.searchQuery) ||
                    photo.tags.some(tag => tag.toLowerCase().includes(this.searchQuery));
                
                // 分类匹配
                const matchesCategory = this.activeFilters.size === 0 || 
                    this.activeFilters.has(photo.category);
                
                return matchesSearch && matchesCategory;
            });
        } else {
            this.filteredPhotos = [...this.photoArray];
        }
        
        // 重新创建轨道（只显示过滤后的照片）
        this.updateVisiblePhotos();
        
        eventBus.emit('photos.filtered', {
            filters: Array.from(this.activeFilters),
            results: this.filteredPhotos,
            count: this.filteredPhotos.length
        });
    }
    
    /**
     * 更新可见照片
     */
    updateVisiblePhotos() {
        // 隐藏所有照片
        this.photoArray.forEach(photo => {
            if (photo.mesh) {
                photo.mesh.visible = false;
            }
        });
        
        // 只显示过滤后的照片
        this.filteredPhotos.forEach((photo, index) => {
            if (photo.mesh) {
                photo.mesh.visible = true;
                // 重新计算位置
                const position = this.calculateSpherePosition(index, this.filteredPhotos.length);
                photo.mesh.position.copy(position);
                photo.mesh.lookAt(0, 0, 0);
            }
        });
    }
    
    /**
     * 添加到分类
     */
    addToCategory(photo) {
        if (!this.categories.has(photo.category)) {
            this.categories.set(photo.category, []);
        }
        this.categories.get(photo.category).push(photo);
    }
    
    /**
     * 添加到标签
     */
    addToTag(tag, photo) {
        if (!this.tags.has(tag)) {
            this.tags.set(tag, []);
        }
        this.tags.get(tag).push(photo);
    }
    
    /**
     * 获取分类统计
     */
    getCategoryStats() {
        const stats = {};
        for (const [category, photos] of this.categories) {
            stats[category] = photos.length;
        }
        return stats;
    }
    
    /**
     * 获取标签统计
     */
    getTagStats() {
        const stats = {};
        for (const [tag, photos] of this.tags) {
            stats[tag] = photos.length;
        }
        return stats;
    }
    
    /**
     * 获取随机照片（从过滤后的列表）
     */
    getRandomPhoto() {
        if (this.filteredPhotos.length === 0) return null;
        
        const randomIndex = Math.floor(Math.random() * this.filteredPhotos.length);
        return this.filteredPhotos[randomIndex];
    }
    
    /**
     * 计算球面位置
     */
    calculateSpherePosition(index, total) {
        const angle = (index / total) * Math.PI * 2;
        const inclination = (index % 2 === 0 ? 0.3 : -0.3);
        
        return new THREE.Vector3(
            Math.cos(angle) * this.config.radius,
            Math.sin(inclination) * this.config.radius * 0.3,
            Math.sin(angle) * this.config.radius
        );
    }
    
    /**
     * 计算距离
     */
    calculateDistance(photo) {
        // 实际计算相机到照片的距离
        return this.config.radius;
    }
    
    /**
     * 创建照片轨道
     */
    createPhotoOrbit() {
        // 清空现有轨道
        while (this.photoGroup.children.length > 0) {
            const child = this.photoGroup.children[0];
            this.photoGroup.remove(child);
        }
        
        // 添加过滤后的照片
        this.filteredPhotos.forEach(photo => {
            if (photo.mesh) {
                this.photoGroup.add(photo.mesh);
            }
        });
        
        console.log(`[AdvancedPhotoManager] 创建轨道: ${this.filteredPhotos.length} 张照片`);
    }
    
    /**
     * 清理资源
     */
    destroy() {
        console.log('[AdvancedPhotoManager] 清理资源...');
        
        // 释放所有照片资源
        this.photoArray.forEach(photo => {
            if (photo.texture) {
                this.resourceManager.releaseToPool('texture', photo.texture);
            }
            if (photo.mesh) {
                this.resourceManager.releaseToPool('photoGeometry', photo.mesh.geometry);
                this.resourceManager.disposeObject(photo.mesh);
            }
        });
        
        // 清空数据
        this.photos.clear();
        this.photoArray = [];
        this.categories.clear();
        this.tags.clear();
        this.filteredPhotos = [];
        
        console.log('[AdvancedPhotoManager] 资源清理完成');
    }
}

export default AdvancedPhotoManager;
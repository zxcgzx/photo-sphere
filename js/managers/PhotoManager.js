/**
 * 照片系统管理器
 * 负责照片加载、3D转换、轨道动画和用户交互
 * @version 4.1.0
 */

import { THREE_LIB as THREE } from '../core/DependencyManager.js';

export class PhotoManager {
    constructor(scene, config = {}, performanceManager) {
        this.scene = scene;
        this.config = {
            radius: 320,
            photoCount: 12,
            photoSize: 64,
            photoQuality: 0.9,
            autoRotate: true,
            rotationSpeed: 0.002,
            heartbeatMode: false,
            heartbeatIntensity: 1.0,
            ...config
        };
        
        this.performanceManager = performanceManager;
        
        // 照片管理
        this.photos = new Map();
        this.photoArray = [];
        this.currentIndex = 0;
        this.loadedCount = 0;
        
        // 轨道参数
        this.orbit = {
            radius: this.config.radius,
            angle: 0,
            inclination: 0,
            speed: this.config.rotationSpeed
        };
        
        // 状态
        this.isRotating = this.config.autoRotate;
        this.isHeartbeatMode = this.config.heartbeatMode;
        this.state = {
            isLoading: false,
            isLoaded: false,
            currentPhoto: null
        };
        
        // 交互
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();
        
        console.log('[PhotoManager] 照片系统管理器初始化完成');
    }
    
    /**
     * 初始化照片系统
     */
    async init() {
        try {
            this.performanceManager?.mark('photo_init_start');
            
            // 加载预设照片
            await this.loadDefaultPhotos();
            
            // 创建照片轨道
            this.createPhotoOrbit();
            
            // 设置交互
            this.setupInteraction();
            
            this.performanceManager?.mark('photo_init_complete');
            this.performanceManager?.measure('photo_init', 'photo_init_start', 'photo_init_complete');
            
            this.state.isLoaded = true;
            console.log('[PhotoManager] 照片系统初始化完成');
            
        } catch (error) {
            throw new Error(`照片系统初始化失败: ${error.message}`);
        }
    }
    
    /**
     * 从API加载照片
     */
    async loadPhotosFromAPI() {
        try {
            console.log('[PhotoManager] 尝试从API加载照片...');
            
            const response = await fetch('/api/photos');
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            if (data.success && data.data && data.data.photos && data.data.photos.length > 0) {
                const photos = data.data.photos;
                console.log(`[PhotoManager] 从API加载了 ${photos.length} 张照片`);
                
                this.state.isLoading = true;
                
                const loadPromises = photos.map((photoData, index) => 
                    this.loadPhotoFromAPI(photoData, index)
                );
                
                await Promise.all(loadPromises);
                
                this.state.isLoading = false;
                
                // 显示成功提示
                this.showLoadSuccess(`从服务器加载了 ${photos.length} 张照片`);
                
                return true;
            } else {
                console.warn('[PhotoManager] API返回空数据或无照片');
                this.showLoadWarning('服务器暂无照片，将加载默认照片');
                return false;
            }
            
        } catch (error) {
            console.error('[PhotoManager] 从API加载照片失败:', error);
            this.showLoadError('无法从服务器加载照片，将使用默认照片');
            return false;
        }
    }
    
    /**
     * 从API数据加载单张照片
     */
    async loadPhotoFromAPI(photoData, index) {
        try {
            const photo = {
                id: photoData.id || `photo_${index}`,
                url: photoData.paths?.original || photoData.url,
                index,
                texture: null,
                material: null,
                mesh: null,
                loaded: false,
                metadata: {
                    width: photoData.width || 512,
                    height: photoData.height || 512,
                    aspectRatio: (photoData.width || 512) / (photoData.height || 512),
                    title: photoData.title || `照片 ${index + 1}`,
                    description: photoData.description || '',
                    createdAt: photoData.createdAt || new Date().toISOString()
                }
            };
            
            // 加载纹理
            const texture = await this.loadTexture(photo.url);
            photo.texture = texture;
            photo.loaded = true;
            
            // 创建材质
            const material = new THREE.MeshStandardMaterial({
                map: texture,
                transparent: true,
                opacity: 0.9,
                roughness: 0.3,
                metalness: 0.1,
                side: THREE.DoubleSide
            });
            
            photo.material = material;
            
            // 添加到管理器
            this.photos.set(photo.id, photo);
            this.photoArray.push(photo);
            this.loadedCount++;
            
            console.log(`[PhotoManager] API照片已加载: ${photo.id}`);
            
            return photo;
            
        } catch (error) {
            console.error(`[PhotoManager] API照片加载失败: ${photoData.id}`, error);
            return null;
        }
    }
    
    /**
     * 加载默认照片（回退方案）
     */
    async loadDefaultPhotos() {
        console.log('[PhotoManager] 加载默认照片...');
        
        // 尝试加载本地照片
        const localPhotos = [];
        for (let i = 1; i <= 12; i++) {
            localPhotos.push(`photos/photo${i}.jpg`);
        }
        
        this.state.isLoading = true;
        
        const loadPromises = localPhotos.map((url, index) => 
            this.loadPhoto(url, index)
        );
        
        const results = await Promise.allSettled(loadPromises);
        const successfulLoads = results.filter(r => r.status === 'fulfilled' && r.value !== null).length;
        
        this.state.isLoading = false;
        
        if (successfulLoads === 0) {
            // 如果本地照片也加载失败，使用picsum随机图片
            console.warn('[PhotoManager] 本地照片加载失败，使用随机图片');
            await this.loadRandomPhotos();
        } else {
            console.log(`[PhotoManager] 已加载 ${successfulLoads} 张本地照片`);
        }
    }
    
    /**
     * 加载随机照片（最终回退方案）
     */
    async loadRandomPhotos() {
        const randomPhotos = [];
        for (let i = 1; i <= 12; i++) {
            randomPhotos.push(`https://picsum.photos/512/512?random=${i}`);
        }
        
        this.state.isLoading = true;
        
        const loadPromises = randomPhotos.map((url, index) => 
            this.loadPhoto(url, index)
        );
        
        await Promise.all(loadPromises);
        
        this.state.isLoading = false;
        console.log(`[PhotoManager] 已加载 ${this.loadedCount} 张随机照片`);
    }
    
    /**
     * 加载单张照片
     */
    async loadPhoto(url, index) {
        try {
            const photo = {
                id: `photo_${index}`,
                url,
                index,
                texture: null,
                material: null,
                mesh: null,
                loaded: false,
                metadata: {
                    width: 512,
                    height: 512,
                    aspectRatio: 1
                }
            };
            
            // 加载纹理
            const texture = await this.loadTexture(url);
            photo.texture = texture;
            photo.loaded = true;
            
            // 创建材质
            const material = new THREE.MeshStandardMaterial({
                map: texture,
                transparent: true,
                opacity: 0.9,
                roughness: 0.3,
                metalness: 0.1,
                side: THREE.DoubleSide
            });
            
            photo.material = material;
            
            // 添加到管理器
            this.photos.set(photo.id, photo);
            this.photoArray.push(photo);
            this.loadedCount++;
            
            console.log(`[PhotoManager] 照片已加载: ${photo.id}`);
            
            return photo;
            
        } catch (error) {
            console.error(`[PhotoManager] 照片加载失败: ${url}`, error);
            return null;
        }
    }
    
    /**
     * 加载纹理
     */
    loadTexture(url) {
        return new Promise((resolve, reject) => {
            const loader = new THREE.TextureLoader();
            loader.setCrossOrigin('anonymous');
            
            loader.load(
                url,
                (texture) => {
                    texture.minFilter = THREE.LinearFilter;
                    texture.magFilter = THREE.LinearFilter;
                    texture.generateMipmaps = false;
                    resolve(texture);
                },
                undefined,
                (error) => reject(error)
            );
        });
    }
    
    /**
     * 创建照片轨道
     */
    createPhotoOrbit() {
        const photoGroup = new THREE.Group();
        photoGroup.name = 'PhotoGroup';
        this.scene.add(photoGroup);
        
        // 创建照片
        this.photoArray.forEach((photo, index) => {
            if (!photo.loaded) return;
            
            const angle = (index / this.photoArray.length) * Math.PI * 2;
            const inclination = (index % 2 === 0 ? 0.3 : -0.3);
            
            // 创建照片几何体
            const geometry = new THREE.PlaneGeometry(
                this.config.photoSize,
                this.config.photoSize
            );
            
            const mesh = new THREE.Mesh(geometry, photo.material);
            mesh.position.set(
                Math.cos(angle) * this.orbit.radius,
                Math.sin(inclination) * this.orbit.radius * 0.3,
                Math.sin(angle) * this.orbit.radius
            );
            mesh.lookAt(0, 0, 0);
            mesh.userData = {
                photoId: photo.id,
                index: index,
                angle: angle,
                inclination: inclination,
                originalScale: new THREE.Vector3(1, 1, 1),
                isHovered: false,
                isSelected: false
            };
            
            mesh.castShadow = true;
            mesh.receiveShadow = true;
            
            photo.mesh = mesh;
            photoGroup.add(mesh);
            
            console.log(`[PhotoManager] 照片已添加到轨道: ${photo.id}`);
        });
        
        console.log('[PhotoManager] 照片轨道已创建');
    }
    
    /**
     * 设置交互
     */
    setupInteraction() {
        const canvas = this.scene.userData.renderer.domElement;
        
        // 鼠标移动
        canvas.addEventListener('mousemove', (event) => {
            this.updateMousePosition(event);
            this.handleMouseHover();
        });
        
        // 鼠标点击
        canvas.addEventListener('click', (event) => {
            this.updateMousePosition(event);
            this.handleMouseClick();
        });
        
        // 键盘控制
        document.addEventListener('keydown', (event) => {
            this.handleKeydown(event);
        });
    }
    
    /**
     * 更新鼠标位置
     */
    updateMousePosition(event) {
        const rect = event.target.getBoundingClientRect();
        this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    }
    
    /**
     * 处理鼠标悬停
     */
    handleMouseHover() {
        this.raycaster.setFromCamera(this.mouse, this.scene.userData.camera);
        
        const photoGroup = this.scene.getObjectByName('PhotoGroup');
        if (!photoGroup) return;
        
        const intersects = this.raycaster.intersectObjects(photoGroup.children);
        
        // 重置所有照片状态
        photoGroup.children.forEach(mesh => {
            if (mesh.userData.isHovered) {
                mesh.userData.isHovered = false;
                this.animatePhotoHover(mesh, false);
            }
        });
        
        // 处理悬停
        if (intersects.length > 0) {
            const hoveredMesh = intersects[0].object;
            hoveredMesh.userData.isHovered = true;
            this.animatePhotoHover(hoveredMesh, true);
            
            document.body.style.cursor = 'pointer';
        } else {
            document.body.style.cursor = 'default';
        }
    }
    
    /**
     * 处理鼠标点击
     */
    handleMouseClick() {
        this.raycaster.setFromCamera(this.mouse, this.scene.userData.camera);
        
        const photoGroup = this.scene.getObjectByName('PhotoGroup');
        if (!photoGroup) return;
        
        const intersects = this.raycaster.intersectObjects(photoGroup.children);
        
        if (intersects.length > 0) {
            const clickedMesh = intersects[0].object;
            const photoId = clickedMesh.userData.photoId;
            
            this.selectPhoto(photoId);
        }
    }
    
    /**
     * 处理键盘输入
     */
    handleKeydown(event) {
        switch (event.code) {
            case 'Space':
                event.preventDefault();
                this.toggleRotation();
                break;
            case 'KeyH':
                this.toggleHeartbeatMode();
                break;
            case 'ArrowLeft':
                this.previousPhoto();
                break;
            case 'ArrowRight':
                this.nextPhoto();
                break;
        }
    }
    
    /**
     * 动画照片悬停
     */
    animatePhotoHover(mesh, isHovered) {
        const targetScale = isHovered ? 1.3 : 1.0;
        const targetOpacity = isHovered ? 1.0 : 0.9;
        
        // 缩放动画
        const startScale = mesh.scale.x;
        const scaleDuration = 300;
        const scaleStartTime = Date.now();
        
        const animateScale = () => {
            const elapsed = Date.now() - scaleStartTime;
            const progress = Math.min(elapsed / scaleDuration, 1);
            const easeProgress = this.easeInOutCubic(progress);
            
            const currentScale = startScale + (targetScale - startScale) * easeProgress;
            mesh.scale.set(currentScale, currentScale, currentScale);
            
            if (progress < 1) {
                requestAnimationFrame(animateScale);
            }
        };
        
        // 透明度动画
        const startOpacity = mesh.material.opacity;
        const opacityDuration = 300;
        const opacityStartTime = Date.now();
        
        const animateOpacity = () => {
            const elapsed = Date.now() - opacityStartTime;
            const progress = Math.min(elapsed / opacityDuration, 1);
            const easeProgress = this.easeInOutCubic(progress);
            
            mesh.material.opacity = startOpacity + (targetOpacity - startOpacity) * easeProgress;
            
            if (progress < 1) {
                requestAnimationFrame(animateOpacity);
            }
        };
        
        animateScale();
        animateOpacity();
    }
    
    /**
     * 选择照片
     */
    selectPhoto(photoId) {
        const photo = this.photos.get(photoId);
        if (!photo || !photo.mesh) return;
        
        // 重置之前选中的照片
        this.photoArray.forEach(p => {
            if (p.mesh && p.mesh.userData.isSelected) {
                p.mesh.userData.isSelected = false;
                this.animatePhotoSelection(p.mesh, false);
            }
        });
        
        // 选中当前照片
        photo.mesh.userData.isSelected = true;
        this.animatePhotoSelection(photo.mesh, true);
        
        this.state.currentPhoto = photo;
        this.currentIndex = photo.index;
        
        console.log(`[PhotoManager] 照片已选中: ${photoId}`);
    }
    
    /**
     * 动画照片选择
     */
    animatePhotoSelection(mesh, isSelected) {
        const targetScale = isSelected ? 1.5 : 1.0;
        const targetEmissive = isSelected ? 0x444444 : 0x000000;
        
        // 缩放动画
        const startScale = mesh.scale.x;
        const duration = 500;
        const startTime = Date.now();
        
        const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const easeProgress = this.easeInOutCubic(progress);
            
            const currentScale = startScale + (targetScale - startScale) * easeProgress;
            mesh.scale.set(currentScale, currentScale, currentScale);
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        };
        
        animate();
        
        // 发光效果
        if (isSelected) {
            mesh.material.emissive.setHex(targetEmissive);
            mesh.material.emissiveIntensity = 0.3;
        } else {
            mesh.material.emissive.setHex(targetEmissive);
            mesh.material.emissiveIntensity = 0;
        }
    }
    
    /**
     * 切换旋转
     */
    toggleRotation() {
        this.isRotating = !this.isRotating;
        console.log(`[PhotoManager] 自动旋转: ${this.isRotating ? '开启' : '关闭'}`);
    }
    
    /**
     * 切换心跳模式
     */
    toggleHeartbeatMode() {
        this.isHeartbeatMode = !this.isHeartbeatMode;
        console.log(`[PhotoManager] 心跳模式: ${this.isHeartbeatMode ? '开启' : '关闭'}`);
    }
    
    /**
     * 上一张照片
     */
    previousPhoto() {
        if (this.photoArray.length === 0) return;
        
        this.currentIndex = (this.currentIndex - 1 + this.photoArray.length) % this.photoArray.length;
        const photo = this.photoArray[this.currentIndex];
        this.selectPhoto(photo.id);
    }
    
    /**
     * 下一张照片
     */
    nextPhoto() {
        if (this.photoArray.length === 0) return;
        
        this.currentIndex = (this.currentIndex + 1) % this.photoArray.length;
        const photo = this.photoArray[this.currentIndex];
        this.selectPhoto(photo.id);
    }
    
    /**
     * 更新照片系统
     */
    update(deltaTime, currentTime, state) {
        const time = currentTime * 0.001;
        
        // 更新轨道角度
        if (this.isRotating) {
            this.orbit.angle += this.orbit.speed * deltaTime * 0.001;
            this.orbit.inclination += this.orbit.speed * 0.3 * deltaTime * 0.001;
        }
        
        // 更新照片位置
        const photoGroup = this.scene.getObjectByName('PhotoGroup');
        if (photoGroup) {
            photoGroup.children.forEach((mesh, index) => {
                const angle = (index / this.photoArray.length) * Math.PI * 2 + this.orbit.angle;
                const inclination = (index % 2 === 0 ? 0.3 : -0.3) + Math.sin(this.orbit.inclination) * 0.1;
                
                mesh.position.x = Math.cos(angle) * this.orbit.radius;
                mesh.position.y = Math.sin(inclination) * this.orbit.radius * 0.3;
                mesh.position.z = Math.sin(angle) * this.orbit.radius;
                
                // 心跳模式
                if (this.isHeartbeatMode) {
                    const heartbeat = Math.sin(time * 8) * 0.5 + 0.5;
                    const scale = 1 + heartbeat * 0.1;
                    mesh.scale.set(scale, scale, scale);
                    
                    // 发光效果
                    const intensity = heartbeat * 0.2;
                    mesh.material.emissive.setRGB(intensity, intensity * 0.5, intensity);
                }
                
                // 始终面向中心
                mesh.lookAt(0, 0, 0);
            });
        }
    }
    
    /**
     * 缓动函数
     */
    easeInOutCubic(t) {
        return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    }
    
    /**
     * 添加自定义照片
     */
    async addPhoto(url, metadata = {}) {
        const index = this.photoArray.length;
        const photo = await this.loadPhoto(url, index);
        
        if (photo) {
            // 重新创建轨道
            this.createPhotoOrbit();
            console.log(`[PhotoManager] 自定义照片已添加: ${photo.id}`);
        }
        
        return photo;
    }
    
    /**
     * 移除照片
     */
    removePhoto(photoId) {
        const photo = this.photos.get(photoId);
        if (!photo) return;
        
        // 从场景中移除
        if (photo.mesh) {
            this.scene.remove(photo.mesh);
        }
        
        // 从数组中移除
        this.photos.delete(photoId);
        this.photoArray = this.photoArray.filter(p => p.id !== photoId);
        
        // 重新创建轨道
        this.createPhotoOrbit();
        
        console.log(`[PhotoManager] 照片已移除: ${photoId}`);
    }
    
    /**
     * 刷新照片（重新从API加载）
     */
    async refreshPhotos() {
        console.log('[PhotoManager] 刷新照片...');
        
        // 显示加载提示
        this.showLoadInfo('正在刷新照片...');
        
        // 清空现有照片
        this.clearAllPhotos();
        
        // 重新加载
        const photosLoaded = await this.loadPhotosFromAPI();
        
        if (!photosLoaded) {
            await this.loadDefaultPhotos();
        }
        
        // 重新创建轨道
        this.createPhotoOrbit();
        
        this.showLoadSuccess('照片刷新完成！');
        
        return photosLoaded;
    }
    
    /**
     * 清空所有照片
     */
    clearAllPhotos() {
        // 从场景中移除所有照片
        const photoGroup = this.scene.getObjectByName('PhotoGroup');
        if (photoGroup) {
            this.scene.remove(photoGroup);
        }
        
        // 清空管理器数据
        this.photos.clear();
        this.photoArray = [];
        this.loadedCount = 0;
        this.currentIndex = 0;
        
        console.log('[PhotoManager] 所有照片已清空');
    }
    
    /**
     * 显示加载成功提示
     */
    showLoadSuccess(message) {
        this.showToast(message, '#00ff88', '#000');
    }
    
    /**
     * 显示加载警告提示
     */
    showLoadWarning(message) {
        this.showToast(message, '#ffc107', '#000');
    }
    
    /**
     * 显示加载错误提示
     */
    showLoadError(message) {
        this.showToast(message, '#ff6b6b', '#fff');
    }
    
    /**
     * 显示加载信息提示
     */
    showLoadInfo(message) {
        this.showToast(message, '#9bb5ff', '#000');
    }
    
    /**
     * 显示Toast提示
     */
    showToast(message, bgColor, textColor) {
        const toast = document.createElement('div');
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${bgColor};
            color: ${textColor};
            padding: 15px 20px;
            border-radius: 8px;
            z-index: 10000;
            font-family: 'Noto Sans SC', sans-serif;
            animation: slideIn 0.3s ease-out;
            max-width: 300px;
            font-size: 14px;
        `;
        toast.textContent = message;
        
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.style.animation = 'slideIn 0.3s ease-out reverse';
            setTimeout(() => toast.remove(), 300);
        }, 4000);
    }
        if (photo.mesh) {
            const photoGroup = this.scene.getObjectByName('PhotoGroup');
            if (photoGroup) {
                photoGroup.remove(photo.mesh);
            }
        }
        
        // 清理资源
        if (photo.texture) {
            photo.texture.dispose();
        }
        
        // 从管理器中移除
        this.photos.delete(photoId);
        this.photoArray = this.photoArray.filter(p => p.id !== photoId);
        
        this.loadedCount--;
        console.log(`[PhotoManager] 照片已移除: ${photoId}`);
    }
    
    /**
     * 获取照片统计
     */
    getStats() {
        return {
            totalPhotos: this.photoArray.length,
            loadedPhotos: this.loadedCount,
            currentPhoto: this.state.currentPhoto?.id || null,
            currentIndex: this.currentIndex,
            isRotating: this.isRotating,
            isHeartbeatMode: this.isHeartbeatMode
        };
    }
    
    /**
     * 获取随机照片
     */
    getRandomPhoto() {
        if (this.photoArray.length === 0) return null;
        
        const randomIndex = Math.floor(Math.random() * this.photoArray.length);
        return this.photoArray[randomIndex];
    }
    
    /**
     * 清理照片系统
     */
    destroy() {
        // 清理照片资源
        this.photos.forEach(photo => {
            if (photo.texture) {
                photo.texture.dispose();
            }
            if (photo.material) {
                photo.material.dispose();
            }
        });
        
        // 清理场景
        const photoGroup = this.scene.getObjectByName('PhotoGroup');
        if (photoGroup) {
            this.scene.remove(photoGroup);
        }
        
        this.photos.clear();
        this.photoArray = [];
        this.loadedCount = 0;
        
        console.log('[PhotoManager] 照片系统已销毁');
    }
}

// 导出照片管理器
export default PhotoManager;

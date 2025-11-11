/**
 * 场景管理器
 * 负责3D场景构建、资源管理和场景优化
 * @version 4.1.0
 */

import { THREE_LIB as THREE } from '../core/DependencyManager.js';

export class SceneManager {
    constructor(scene, config = {}, performanceManager) {
        this.scene = scene;
        this.config = {
            radius: 320,
            starsCount: 5000,
            galaxyColors: ['#9bb5ff', '#9d9dff', '#ffcc99', '#ff9999', '#ffb3d9', '#d6b3ff', '#c0c0c0'],
            ...config
        };
        
        this.performanceManager = performanceManager;
        
        // 场景组
        this.groups = {
            photoGroup: null,
            particleGroup: null,
            auraGroup: null,
            orbitGroup: null,
            heartGroup: null,
            atmosphereGroup: null
        };
        
        // 资源
        this.resources = new Map();
        
        // 初始化
        this.init();
        
        console.log('[SceneManager] 场景管理器初始化完成');
    }
    
    /**
     * 初始化场景
     */
    init() {
        try {
            this.performanceManager?.mark('scene_init_start');
            
            // 创建场景组
            this.createGroups();
            
            // 创建星空背景
            this.createStarfield();
            
            // 创建大气层
            this.createAtmosphere();
            
            // 创建轨道环
            this.createOrbitRings();
            
            // 创建永恒之心
            this.createEternalHeart();
            
            this.performanceManager?.mark('scene_init_complete');
            this.performanceManager?.measure('scene_init', 'scene_init_start', 'scene_init_complete');
            
        } catch (error) {
            throw new Error(`场景初始化失败: ${error.message}`);
        }
    }
    
    /**
     * 创建场景组
     */
    createGroups() {
        // 照片组
        this.groups.photoGroup = new THREE.Group();
        this.groups.photoGroup.name = 'PhotoGroup';
        this.scene.add(this.groups.photoGroup);
        
        // 粒子组
        this.groups.particleGroup = new THREE.Group();
        this.groups.particleGroup.name = 'ParticleGroup';
        this.scene.add(this.groups.particleGroup);
        
        // 光环组
        this.groups.auraGroup = new THREE.Group();
        this.groups.auraGroup.name = 'AuraGroup';
        this.scene.add(this.groups.auraGroup);
        
        // 轨道组
        this.groups.orbitGroup = new THREE.Group();
        this.groups.orbitGroup.name = 'OrbitGroup';
        this.scene.add(this.groups.orbitGroup);
        
        // 心脏组
        this.groups.heartGroup = new THREE.Group();
        this.groups.heartGroup.name = 'HeartGroup';
        this.scene.add(this.groups.heartGroup);
        
        // 大气组
        this.groups.atmosphereGroup = new THREE.Group();
        this.groups.atmosphereGroup.name = 'AtmosphereGroup';
        this.scene.add(this.groups.atmosphereGroup);
        
        console.log('[SceneManager] 场景组已创建');
    }
    
    /**
     * 创建星空背景（修复：复用现有canvas，修复pixelRatio）
     */
    createStarfield() {
        try {
            this.performanceManager?.mark('starfield_create_start');
            
            // 检查是否已存在星空画布
            let starCanvas = document.getElementById('stars-canvas');
            
            if (!starCanvas) {
                // 如果不存在，创建新的
                starCanvas = document.createElement('canvas');
                starCanvas.id = 'stars-canvas';
                starCanvas.style.position = 'fixed';
                starCanvas.style.top = '0';
                starCanvas.style.left = '0';
                starCanvas.style.width = '100%';
                starCanvas.style.height = '100%';
                starCanvas.style.zIndex = '-3';
                
                document.body.appendChild(starCanvas);
            }
            
            // 绘制星空
            this.drawStars(starCanvas);
            
            this.performanceManager?.mark('starfield_create_complete');
            this.performanceManager?.measure('starfield_create', 'starfield_create_start', 'starfield_create_complete');
            
        } catch (error) {
            console.error('[SceneManager] 星空创建失败:', error);
        }
    }
    
    /**
     * 绘制星星（修复pixelRatio）
     */
    drawStars(canvas) {
        const ctx = canvas.getContext('2d');
        const width = window.innerWidth;
        const height = window.innerHeight;
        
        // 修复pixelRatio：使用设备像素比或默认值
        const pixelRatio = window.devicePixelRatio || 1;
        canvas.width = width * pixelRatio;
        canvas.height = height * pixelRatio;
        
        if (pixelRatio > 1) {
            ctx.scale(pixelRatio, pixelRatio);
        }
        
        // 创建深邃背景
        const gradient = ctx.createRadialGradient(
            width / 2, height / 2, 0,
            width / 2, height / 2, Math.max(width, height)
        );
        gradient.addColorStop(0, '#0a0a2a');
        gradient.addColorStop(0.3, '#000814');
        gradient.addColorStop(0.7, '#000000');
        gradient.addColorStop(1, '#000000');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);
        
        // 创建星星
        for (let i = 0; i < this.config.starsCount; i++) {
            const x = Math.random() * width;
            const y = Math.random() * height;
            const radius = Math.random() * 2.5;
            const opacity = Math.random() * 0.8 + 0.2;
            const twinkleSpeed = Math.random() * 0.05 + 0.01;
            
            // 星星闪烁
            const twinkle = Math.sin(Date.now() * twinkleSpeed + i) * 0.5 + 0.5;
            
            ctx.beginPath();
            ctx.arc(x, y, radius, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255, 255, 255, ${opacity * twinkle})`;
            ctx.fill();
            
            // 添加星光效果
            if (Math.random() > 0.98) {
                const glow = ctx.createRadialGradient(x, y, 0, x, y, radius * 8);
                glow.addColorStop(0, `rgba(155, 181, 255, ${opacity})`);
                glow.addColorStop(0.5, `rgba(155, 181, 255, ${opacity * 0.5})`);
                glow.addColorStop(1, 'transparent');
                ctx.fillStyle = glow;
                ctx.fillRect(x - radius * 8, y - radius * 8, radius * 16, radius * 16);
            }
            
            // 十字星芒（极亮星）
            if (Math.random() > 0.997) {
                ctx.strokeStyle = `rgba(255, 255, 255, ${opacity * 0.8})`;
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(x - radius * 12, y);
                ctx.lineTo(x + radius * 12, y);
                ctx.moveTo(x, y - radius * 12);
                ctx.lineTo(x, y + radius * 12);
                ctx.stroke();
            }
        }
        
        // 添加星云
        for (let i = 0; i < 6; i++) {
            const x = Math.random() * width;
            const y = Math.random() * height;
            const radius = Math.random() * 400 + 200;
            const color = this.config.galaxyColors[Math.floor(Math.random() * this.config.galaxyColors.length)];
            
            const nebula = ctx.createRadialGradient(x, y, 0, x, y, radius);
            nebula.addColorStop(0, color + '25');
            nebula.addColorStop(0.5, color + '15');
            nebula.addColorStop(1, 'transparent');
            ctx.fillStyle = nebula;
            ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
        }
        
        console.log('[SceneManager] 星空已创建');
    }
    
    /**
     * 创建大气层
     */
    createAtmosphere() {
        const atmosphereLayer = document.createElement('div');
        atmosphereLayer.id = 'atmosphere-layer';
        atmosphereLayer.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            z-index: -2;
            pointer-events: none;
            background: radial-gradient(ellipse at center, transparent 0%, rgba(10, 10, 42, 0.4) 50%, rgba(0, 0, 0, 0.9) 100%);
            backdrop-filter: blur(2px);
        `;
        
        document.body.appendChild(atmosphereLayer);
        
        console.log('[SceneManager] 大气层已创建');
    }
    
    /**
     * 创建轨道环
     */
    createOrbitRings() {
        for (let i = 0; i < 5; i++) {
            const geometry = new THREE.RingGeometry(
                this.config.radius + i * 40 - 20,
                this.config.radius + i * 40 + 20,
                128
            );
            
            const material = new THREE.MeshBasicMaterial({
                color: new THREE.Color().setHSL(i * 0.2, 0.7, 0.6),
                transparent: true,
                opacity: 0.08,
                side: THREE.DoubleSide
            });
            
            const ring = new THREE.Mesh(geometry, material);
            ring.rotation.x = Math.random() * Math.PI;
            ring.rotation.y = Math.random() * Math.PI;
            ring.rotation.z = Math.random() * Math.PI;
            ring.name = `OrbitRing_${i}`;
            
            this.groups.orbitGroup.add(ring);
        }
        
        console.log('[SceneManager] 轨道环已创建');
    }
    
    /**
     * 创建永恒之心
     */
    createEternalHeart() {
        const heartShape = new THREE.Shape();
        const x = 0, y = 0;
        const size = 30;
        
        heartShape.moveTo(x, y + size / 4);
        heartShape.bezierCurveTo(x, y - size / 4, x - size / 2, y - size / 4, x - size / 2, y);
        heartShape.bezierCurveTo(x - size / 2, y + size / 4, x, y + size / 2, x, y + size);
        heartShape.bezierCurveTo(x, y + size / 2, x + size / 2, y + size / 4, x + size / 2, y);
        heartShape.bezierCurveTo(x + size / 2, y - size / 4, x, y - size / 4, x, y + size / 4);
        
        const geometry = new THREE.ExtrudeGeometry(heartShape, {
            depth: 10,
            bevelEnabled: true,
            bevelSegments: 8,
            steps: 2,
            bevelSize: 3,
            bevelThickness: 3
        });
        
        const material = new THREE.MeshStandardMaterial({
            color: 0xff69b4,
            emissive: 0xff1493,
            emissiveIntensity: 0.3,
            roughness: 0.2,
            metalness: 0.8,
            transparent: true,
            opacity: 0.9
        });
        
        const heart = new THREE.Mesh(geometry, material);
        heart.position.set(0, 0, 0);
        heart.scale.set(2, 2, 2);
        heart.castShadow = true;
        heart.receiveShadow = true;
        heart.name = 'EternalHeart';
        
        this.groups.heartGroup.add(heart);
        
        // 心脏光环
        const ringGeometry = new THREE.TorusGeometry(80, 5, 16, 100);
        const ringMaterial = new THREE.MeshBasicMaterial({
            color: 0xff1493,
            transparent: true,
            opacity: 0.3
        });
        
        const heartRing = new THREE.Mesh(ringGeometry, ringMaterial);
        heartRing.rotation.x = Math.PI / 2;
        heartRing.name = 'HeartAuraRing';
        this.groups.heartGroup.add(heartRing);
        
        console.log('[SceneManager] 永恒之心已创建');
    }
    
    /**
     * 更新场景
     */
    update(deltaTime, currentTime, state) {
        const time = currentTime * 0.001;
        
        // 更新轨道环
        if (this.groups.orbitGroup) {
            this.groups.orbitGroup.rotation.y += 0.002;
            this.groups.orbitGroup.rotation.x += 0.001;
            this.groups.orbitGroup.rotation.z += 0.0005;
        }
        
        // 更新心脏
        if (this.groups.heartGroup) {
            const heart = this.groups.heartGroup.getObjectByName('EternalHeart');
            const ring = this.groups.heartGroup.getObjectByName('HeartAuraRing');
            
            if (heart) {
                heart.rotation.y = time * 0.5;
                heart.position.y = Math.sin(time * 2) * 10;
            }
            
            if (ring) {
                ring.rotation.z = time * 0.3;
                ring.scale.setScalar(1 + Math.sin(time * 3) * 0.1);
            }
        }
        
        // 更新大气层
        if (state.isHeartbeatMode) {
            const atmosphere = document.getElementById('atmosphere-layer');
            if (atmosphere) {
                const heartbeat = Math.sin(time * 8) * 0.5 + 0.5;
                atmosphere.style.opacity = 0.3 + heartbeat * 0.2;
            }
        }
    }
    
    /**
     * 获取场景组
     */
    getGroup(name) {
        return this.groups[name] || null;
    }
    
    /**
     * 获取场景统计
     */
    getStats() {
        const stats = {
            groups: Object.keys(this.groups).length,
            objects: 0,
            triangles: 0,
            drawCalls: 0
        };
        
        // 统计场景中的对象
        this.scene.traverse((object) => {
            if (object.isMesh) {
                stats.objects++;
                
                if (object.geometry) {
                    const index = object.geometry.index;
                    const position = object.geometry.attributes.position;
                    
                    if (index) {
                        stats.triangles += index.count / 3;
                    } else if (position) {
                        stats.triangles += position.count / 3;
                    }
                }
            }
        });
        
        return stats;
    }
    
    /**
     * 清理场景资源
     */
    destroy() {
        // 清理场景组
        Object.values(this.groups).forEach(group => {
            if (group) {
                this.scene.remove(group);
                
                // 清理组内对象
                group.traverse((object) => {
                    if (object.geometry) object.geometry.dispose();
                    if (object.material) {
                        if (Array.isArray(object.material)) {
                            object.material.forEach(material => material.dispose());
                        } else {
                            object.material.dispose();
                        }
                    }
                });
            }
        });
        
        // 清理资源
        this.resources.forEach(resource => {
            if (resource.dispose) resource.dispose();
        });
        this.resources.clear();
        
        // 清理DOM元素
        const starCanvas = document.getElementById('stars-canvas');
        if (starCanvas && starCanvas.parentNode) {
            starCanvas.parentNode.removeChild(starCanvas);
        }
        
        const atmosphereLayer = document.getElementById('atmosphere-layer');
        if (atmosphereLayer && atmosphereLayer.parentNode) {
            atmosphereLayer.parentNode.removeChild(atmosphereLayer);
        }
        
        console.log('[SceneManager] 场景管理器已销毁');
    }
}

// 导出场景管理器
export default SceneManager;

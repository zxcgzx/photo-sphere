/**
 * 3D场景管理器
 * 负责Three.js场景的创建、管理和渲染
 */

import { CONFIG } from './config.js';

class SceneManager {
    constructor(config) {
        this.config = config || CONFIG;
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.raycaster = null;
        this.mouse = new THREE.Vector2();
        
        // 组对象
        this.photoGroup = null;
        this.particleGroup = null;
        this.orbitGroup = null;
        
        // 光源数组
        this.lights = [];
        
        // 粒子系统
        this.particles = [];
        
        // 渲染状态
        this.isRendering = false;
        this.frameId = null;
        
        // 性能监控
        this.stats = null;
        this.frameCount = 0;
        this.lastFpsCheck = Date.now();
        this.currentFps = 60;
        
        // 事件监听器
        this.eventListeners = new Map();
    }
    
    /**
     * 初始化3D场景
     */
    async initialize(container) {
        try {
            this.config.log('初始化3D场景...');
            
            // 创建场景
            this.createScene();
            
            // 创建相机
            this.createCamera();
            
            // 创建渲染器
            this.createRenderer(container);
            
            // 创建射线投射器
            this.createRaycaster();
            
            // 设置灯光
            this.setupLights();
            
            // 创建组对象
            this.createGroups();
            
            // 添加装饰元素
            this.addDecorations();
            
            // 设置性能监控
            if (this.config.debug.enableStats) {
                this.setupStats();
            }
            
            // 开始渲染循环
            this.startRenderLoop();
            
            this.config.log('3D场景初始化完成');
            
        } catch (error) {
            this.config.error('3D场景初始化失败:', error);
            throw error;
        }
    }
    
    /**
     * 创建场景
     */
    createScene() {
        this.scene = new THREE.Scene();
        this.scene.fog = new THREE.Fog(0x000000, this.config.scene.fogNear, this.config.scene.fogFar);
    }
    
    /**
     * 创建相机
     */
    createCamera() {
        this.camera = new THREE.PerspectiveCamera(
            60,
            window.innerWidth / window.innerHeight,
            0.1,
            5000
        );
        this.camera.position.z = this.config.scene.radius * this.config.scene.cameraDistance;
    }
    
    /**
     * 创建渲染器
     */
    createRenderer(container) {
        const rendererOptions = {
            antialias: this.config.performance.antialias,
            alpha: true,
            powerPreference: 'high-performance'
        };
        
        this.renderer = new THREE.WebGLRenderer(rendererOptions);
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        
        // 启用阴影（如果配置允许）
        if (this.config.performance.shadowMapEnabled) {
            this.renderer.shadowMap.enabled = true;
            this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        }
        
        container.appendChild(this.renderer.domElement);
    }
    
    /**
     * 创建射线投射器
     */
    createRaycaster() {
        this.raycaster = new THREE.Raycaster();
    }
    
    /**
     * 设置灯光
     */
    setupLights() {
        // 环境光
        const ambientLight = new THREE.AmbientLight(0x404080, 0.4);
        this.scene.add(ambientLight);
        
        // 主光源
        const sunLight = new THREE.DirectionalLight(0xffffff, 0.8);
        sunLight.position.set(500, 300, 500);
        if (this.config.performance.shadowMapEnabled) {
            sunLight.castShadow = true;
            sunLight.shadow.mapSize.width = 1024;
            sunLight.shadow.mapSize.height = 1024;
        }
        this.scene.add(sunLight);
        this.lights.push(sunLight);
        
        // 边缘光
        const rimLight = new THREE.DirectionalLight(0x6495ed, 0.6);
        rimLight.position.set(-300, -200, -500);
        this.scene.add(rimLight);
        this.lights.push(rimLight);
        
        // 点光源
        const starLight = new THREE.PointLight(0x9bb5ff, 1.5, 2000);
        starLight.position.set(0, 0, 400);
        this.scene.add(starLight);
        this.lights.push(starLight);
        
        // 光晕效果
        const haloLight = new THREE.PointLight(0x667eea, 0.5, 1000);
        haloLight.position.set(0, 0, -300);
        this.scene.add(haloLight);
        this.lights.push(haloLight);
    }
    
    /**
     * 创建组对象
     */
    createGroups() {
        this.photoGroup = new THREE.Group();
        this.scene.add(this.photoGroup);
        
        this.particleGroup = new THREE.Group();
        this.scene.add(this.particleGroup);
        
        this.orbitGroup = new THREE.Group();
        this.scene.add(this.orbitGroup);
    }
    
    /**
     * 添加装饰元素
     */
    addDecorations() {
        // 创建大气层效果
        this.createAtmosphere();
        
        // 创建星尘粒子系统
        this.createStarDustSystem();
        
        // 添加行星环
        this.createPlanetaryRings();
        
        // 添加小行星
        this.createAsteroids();
    }
    
    /**
     * 创建大气层效果
     */
    createAtmosphere() {
        const atmosphereGeometry = new THREE.SphereGeometry(this.config.scene.radius * 1.15, 64, 64);
        const atmosphereMaterial = new THREE.ShaderMaterial({
            vertexShader: `
                varying vec3 vNormal;
                varying vec3 vPosition;
                void main() {
                    vNormal = normalize(normalMatrix * normal);
                    vPosition = position;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                varying vec3 vNormal;
                uniform vec3 glowColor;
                void main() {
                    float intensity = pow(0.7 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 2.0);
                    gl_FragColor = vec4(glowColor, intensity * 0.5);
                }
            `,
            uniforms: {
                glowColor: { value: new THREE.Color(0x4169e1) }
            },
            side: THREE.BackSide,
            blending: THREE.AdditiveBlending,
            transparent: true
        });
        
        const atmosphere = new THREE.Mesh(atmosphereGeometry, atmosphereMaterial);
        this.scene.add(atmosphere);
        
        // 内部发光球体
        const glowGeometry = new THREE.SphereGeometry(this.config.scene.radius * 0.98, 32, 32);
        const glowMaterial = new THREE.MeshBasicMaterial({
            color: 0x1e3a8a,
            transparent: true,
            opacity: 0.1,
            side: THREE.BackSide
        });
        const glowSphere = new THREE.Mesh(glowGeometry, glowMaterial);
        this.scene.add(glowSphere);
    }
    
    /**
     * 创建星尘粒子系统
     */
    createStarDustSystem() {
        const starDustMaterial = new THREE.PointsMaterial({
            color: 0xaaaaff,
            size: 2,
            transparent: true,
            opacity: 0.8,
            sizeAttenuation: true,
            blending: THREE.AdditiveBlending,
            map: this.createStarTexture()
        });
        
        const starDustGeometry = new THREE.BufferGeometry();
        const positions = [];
        
        for (let i = 0; i < this.config.scene.particleCount; i++) {
            const radius = this.config.scene.radius * (1.5 + Math.random() * 2);
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.random() * Math.PI;
            
            const x = radius * Math.sin(phi) * Math.cos(theta);
            const y = radius * Math.sin(phi) * Math.sin(theta);
            const z = radius * Math.cos(phi);
            
            positions.push(x, y, z);
        }
        
        starDustGeometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        const starDustSystem = new THREE.Points(starDustGeometry, starDustMaterial);
        this.particleGroup.add(starDustSystem);
        this.particles.push(starDustSystem);
    }
    
    /**
     * 创建星星纹理
     */
    createStarTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 32;
        canvas.height = 32;
        const ctx = canvas.getContext('2d');
        
        const gradient = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
        gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
        gradient.addColorStop(0.2, 'rgba(200, 200, 255, 1)');
        gradient.addColorStop(0.4, 'rgba(150, 150, 255, 0.5)');
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
        
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 32, 32);
        
        return new THREE.CanvasTexture(canvas);
    }
    
    /**
     * 创建行星环
     */
    createPlanetaryRings() {
        const ringCount = 2;
        for (let i = 0; i < ringCount; i++) {
            const ringRadius = this.config.scene.radius * (1.3 + i * 0.2);
            const ringGeometry = new THREE.TorusGeometry(ringRadius, 2, 8, 100);
            const ringMaterial = new THREE.MeshBasicMaterial({
                color: 0x6495ed,
                transparent: true,
                opacity: 0.3 - i * 0.1,
                side: THREE.DoubleSide
            });
            const ring = new THREE.Mesh(ringGeometry, ringMaterial);
            
            ring.rotation.x = Math.PI / 2 + (Math.random() - 0.5) * 0.5;
            ring.rotation.z = Math.random() * Math.PI;
            
            this.orbitGroup.add(ring);
        }
    }
    
    /**
     * 创建小行星
     */
    createAsteroids() {
        for (let i = 0; i < 10; i++) {
            const asteroidGeometry = new THREE.SphereGeometry(5 + Math.random() * 10, 8, 8);
            const asteroidMaterial = new THREE.MeshPhongMaterial({
                color: 0x8b8680,
                emissive: 0x222222,
                shininess: 10
            });
            const asteroid = new THREE.Mesh(asteroidGeometry, asteroidMaterial);
            
            const distance = this.config.scene.radius * (2 + Math.random() * 2);
            const angle = Math.random() * Math.PI * 2;
            asteroid.position.x = distance * Math.cos(angle);
            asteroid.position.z = distance * Math.sin(angle);
            asteroid.position.y = (Math.random() - 0.5) * 200;
            
            asteroid.userData = {
                orbitRadius: distance,
                orbitSpeed: 0.001 + Math.random() * 0.002,
                orbitAngle: angle
            };
            
            this.orbitGroup.add(asteroid);
        }
    }
    
    /**
     * 设置性能监控
     */
    setupStats() {
        if (window.Stats) {
            this.stats = new Stats();
            this.stats.showPanel(0);
            document.body.appendChild(this.stats.dom);
            this.stats.dom.style.position = 'fixed';
            this.stats.dom.style.top = '10px';
            this.stats.dom.style.right = '10px';
            this.stats.dom.style.zIndex = '1000';
        }
    }
    
    /**
     * 开始渲染循环
     */
    startRenderLoop() {
        if (this.isRendering) return;
        
        this.isRendering = true;
        this.animate();
    }
    
    /**
     * 停止渲染循环
     */
    stopRenderLoop() {
        this.isRendering = false;
        if (this.frameId) {
            cancelAnimationFrame(this.frameId);
            this.frameId = null;
        }
    }
    
    /**
     * 渲染循环
     */
    animate() {
        if (!this.isRendering) return;
        
        this.frameId = requestAnimationFrame(() => this.animate());
        
        if (this.stats) this.stats.begin();
        
        // 更新动画
        this.updateAnimations();
        
        // 更新粒子系统
        this.updateParticles();
        
        // 更新小行星轨道
        this.updateAsteroids();
        
        // 更新光源位置
        this.updateLights();
        
        // 渲染场景
        this.renderer.render(this.scene, this.camera);
        
        // 性能监控
        this.updatePerformanceStats();
        
        if (this.stats) this.stats.end();
    }
    
    /**
     * 更新动画
     */
    updateAnimations() {
        // 更新TWEEN动画
        if (window.TWEEN) {
            TWEEN.update();
        }
    }
    
    /**
     * 更新粒子系统
     */
    updateParticles() {
        if (this.particles.length > 0) {
            const positions = this.particles[0].geometry.attributes.position.array;
            for (let i = 0; i < positions.length; i += 3) {
                if (Math.random() < 0.002) {
                    const radius = this.config.scene.radius * (2 + Math.random() * 0.5);
                    const theta = Math.random() * Math.PI * 2;
                    const phi = Math.random() * Math.PI;
                    
                    positions[i] = radius * Math.sin(phi) * Math.cos(theta);
                    positions[i + 1] = radius * Math.sin(phi) * Math.sin(theta);
                    positions[i + 2] = radius * Math.cos(phi);
                }
            }
            this.particles[0].geometry.attributes.position.needsUpdate = true;
        }
    }
    
    /**
     * 更新小行星轨道
     */
    updateAsteroids() {
        this.orbitGroup.children.forEach((asteroid) => {
            if (asteroid.userData.orbitRadius) {
                asteroid.userData.orbitAngle += asteroid.userData.orbitSpeed;
                asteroid.position.x = asteroid.userData.orbitRadius * Math.cos(asteroid.userData.orbitAngle);
                asteroid.position.z = asteroid.userData.orbitRadius * Math.sin(asteroid.userData.orbitAngle);
                asteroid.rotation.x += 0.01;
                asteroid.rotation.y += 0.01;
            }
        });
    }
    
    /**
     * 更新光源位置
     */
    updateLights() {
        if (this.lights[2]) {
            const time = Date.now() * 0.0005;
            this.lights[2].position.x = Math.sin(time * 1.1) * this.config.scene.radius * 2;
            this.lights[2].position.y = Math.cos(time * 1.3) * this.config.scene.radius * 1.5;
            this.lights[2].position.z = Math.sin(time * 1.5) * this.config.scene.radius + this.config.scene.radius * 1.5;
        }
    }
    
    /**
     * 更新性能统计
     */
    updatePerformanceStats() {
        this.frameCount++;
        const now = Date.now();
        
        if (now - this.lastFpsCheck >= 1000) {
            this.currentFps = this.frameCount;
            this.frameCount = 0;
            this.lastFpsCheck = now;
            
            // 如果FPS过低，降低渲染质量
            if (this.currentFps < this.config.performance.lowPerformanceThreshold) {
                this.optimizePerformance();
            }
        }
    }
    
    /**
     * 性能优化
     */
    optimizePerformance() {
        // 降低粒子数量
        if (this.particles.length > 0) {
            const geometry = this.particles[0].geometry;
            const currentCount = geometry.attributes.position.count;
            if (currentCount > 100) {
                const newCount = Math.floor(currentCount * 0.7);
                const newPositions = geometry.attributes.position.array.slice(0, newCount * 3);
                geometry.setAttribute('position', new THREE.Float32BufferAttribute(newPositions, 3));
                this.config.warn('性能优化：减少粒子数量至', newCount);
            }
        }
        
        // 降低渲染器像素比
        if (this.renderer.getPixelRatio() > 1) {
            this.renderer.setPixelRatio(1);
            this.config.warn('性能优化：降低像素比至 1');
        }
    }
    
    /**
     * 窗口大小调整
     */
    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }
    
    /**
     * 射线检测
     */
    raycast(mousePosition, objects) {
        this.mouse.x = (mousePosition.x / window.innerWidth) * 2 - 1;
        this.mouse.y = -(mousePosition.y / window.innerHeight) * 2 + 1;
        
        this.raycaster.setFromCamera(this.mouse, this.camera);
        return this.raycaster.intersectObjects(objects);
    }
    
    /**
     * 切换灯光模式
     */
    switchLightMode(mode) {
        const lightColors = this.config.themes.lightModes[mode]?.colors || [0xffffff, 0x6495ed, 0x9bb5ff];
        
        this.lights.forEach((light, index) => {
            if (lightColors[index]) {
                light.color.setHex(lightColors[index]);
            }
        });
    }
    
    /**
     * 添加事件监听器
     */
    addEventListener(event, callback) {
        if (!this.eventListeners.has(event)) {
            this.eventListeners.set(event, []);
        }
        this.eventListeners.get(event).push(callback);
    }
    
    /**
     * 移除事件监听器
     */
    removeEventListener(event, callback) {
        if (this.eventListeners.has(event)) {
            const listeners = this.eventListeners.get(event);
            const index = listeners.indexOf(callback);
            if (index > -1) {
                listeners.splice(index, 1);
            }
        }
    }
    
    /**
     * 触发事件
     */
    emit(event, data) {
        if (this.eventListeners.has(event)) {
            this.eventListeners.get(event).forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    this.config.error('事件处理器错误:', error);
                }
            });
        }
    }
    
    /**
     * 获取当前性能状态
     */
    getPerformanceStatus() {
        return {
            fps: this.currentFps,
            memoryUsage: this.renderer.info.memory,
            renderCalls: this.renderer.info.render.calls,
            triangles: this.renderer.info.render.triangles,
            points: this.renderer.info.render.points
        };
    }
    
    /**
     * 清理资源
     */
    dispose() {
        this.stopRenderLoop();
        
        // 清理渲染器
        if (this.renderer) {
            this.renderer.dispose();
        }
        
        // 清理几何体和材质
        this.scene.traverse((object) => {
            if (object.geometry) {
                object.geometry.dispose();
            }
            if (object.material) {
                if (Array.isArray(object.material)) {
                    object.material.forEach(material => material.dispose());
                } else {
                    object.material.dispose();
                }
            }
        });
        
        // 清理事件监听器
        this.eventListeners.clear();
        
        // 移除性能监控
        if (this.stats && this.stats.dom && this.stats.dom.parentNode) {
            this.stats.dom.parentNode.removeChild(this.stats.dom);
        }
        
        this.config.log('场景管理器已清理');
    }
}

// 导出场景管理器
window.SceneManager = SceneManager;
export default SceneManager;
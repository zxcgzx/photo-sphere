/**
 * EternalHeart Photo Sphere
 * 企业级3D照片展示系统
 * @version 4.1.0
 */

import { THREE_LIB as THREE } from './core/DependencyManager.js';
import { RenderManager } from './managers/RenderManager.js';
import { SceneManager } from './managers/SceneManager.js';
import { PhotoManager } from './managers/PhotoManager.js';
import { ParticleManager } from './managers/ParticleManager.js';
import { PerformanceMonitor } from './utils/PerformanceMonitor.js';
import EffectsManager from './effects/EffectsManager.js';

class EternalHeartApp {
    constructor(containerId = 'canvas-container') {
        this.containerId = containerId;
        this.container = document.getElementById(containerId);
        
        if (!this.container) {
            throw new Error(`容器元素不存在: ${containerId}`);
        }
        
        // 应用状态
        this.state = {
            isInitialized: false,
            isRunning: false,
            isPaused: false,
            currentMode: 'normal',
            performance: {
                fps: 0,
                frameTime: 0,
                memoryUsage: 0
            }
        };
        
        // 管理器
        this.managers = {};
        
        // 性能监控
        this.performanceMonitor = new PerformanceMonitor();
        
        // 初始化
        this.init();
        
        console.log('[EternalHeartApp] 应用程序初始化完成');
    }
    
    /**
     * 初始化应用程序
     */
    async init() {
        try {
            console.log('[EternalHeartApp] 开始初始化...');
            
            this.performanceMonitor.mark('app_init_start');
            
            // 初始化渲染管理器
            await this.initRenderManager();
            
            // 初始化场景管理器
            await this.initSceneManager();
            
            // 初始化照片管理器
            await this.initPhotoManager();
            
            // 初始化粒子管理器
            await this.initParticleManager();
            
            // 初始化特效管理器
            await this.initEffectsManager();
            
            // 设置UI
            this.setupUI();
            
            // 设置全局事件
            this.setupGlobalEvents();
            
            this.performanceMonitor.mark('app_init_complete');
            this.performanceMonitor.measure('app_init', 'app_init_start', 'app_init_complete');
            
            this.state.isInitialized = true;
            console.log('[EternalHeartApp] 应用程序初始化成功');
            
            // 启动渲染循环
            this.start();
            
        } catch (error) {
            console.error('[EternalHeartApp] 初始化失败:', error);
            this.handleInitError(error);
        }
    }
    
    /**
     * 初始化渲染管理器
     */
    async initRenderManager() {
        try {
            console.log('[EternalHeartApp] 初始化渲染管理器...');
            
            const renderConfig = {
                pixelRatio: Math.min(window.devicePixelRatio, 2),
                antialias: true,
                shadowMap: true,
                shadowMapType: 'PCFSoftShadowMap',
                outputEncoding: 'sRGBEncoding',
                toneMapping: 'ACESFilmicToneMapping',
                toneMappingExposure: 1.2,
                maxFPS: 60
            };
            
            this.managers.render = new RenderManager(
                this.containerId,
                renderConfig,
                this.performanceMonitor
            );
            
            // 暴露渲染器给场景
            const scene = this.managers.render.getScene();
            scene.userData.renderer = this.managers.render.getRenderer();
            scene.userData.camera = this.managers.render.getCamera();
            
            console.log('[EternalHeartApp] 渲染管理器初始化完成');
            
        } catch (error) {
            throw new Error(`渲染管理器初始化失败: ${error.message}`);
        }
    }
    
    /**
     * 初始化场景管理器
     */
    async initSceneManager() {
        try {
            console.log('[EternalHeartApp] 初始化场景管理器...');
            
            const sceneConfig = {
                radius: 320,
                starsCount: 5000,
                galaxyColors: ['#9bb5ff', '#9d9dff', '#ffcc99', '#ff9999', '#ffb3d9', '#d6b3ff', '#c0c0c0'],
                pixelRatio: Math.min(window.devicePixelRatio, 2)
            };
            
            const scene = this.managers.render.getScene();
            this.managers.scene = new SceneManager(
                scene,
                sceneConfig,
                this.performanceMonitor
            );
            
            console.log('[EternalHeartApp] 场景管理器初始化完成');
            
        } catch (error) {
            throw new Error(`场景管理器初始化失败: ${error.message}`);
        }
    }
    
    /**
     * 初始化照片管理器
     */
    async initPhotoManager() {
        try {
            console.log('[EternalHeartApp] 初始化照片管理器...');
            
            const photoConfig = {
                radius: 320,
                photoCount: 12,
                photoSize: 64,
                photoQuality: 0.9,
                autoRotate: true,
                rotationSpeed: 0.002,
                heartbeatMode: false,
                heartbeatIntensity: 1.0
            };
            
            const scene = this.managers.render.getScene();
            this.managers.photo = new PhotoManager(
                scene,
                photoConfig,
                this.performanceMonitor
            );
            
            await this.managers.photo.init();
            
            console.log('[EternalHeartApp] 照片管理器初始化完成');
            
        } catch (error) {
            throw new Error(`照片管理器初始化失败: ${error.message}`);
        }
    }
    
    /**
     * 初始化粒子管理器
     */
    async initParticleManager() {
        try {
            console.log('[EternalHeartApp] 初始化粒子管理器...');
            
            const particleConfig = {
                maxParticles: 1500,
                physicsEnabled: true,
                collisionDetection: true,
                gpuAcceleration: true,
                particleSize: 2.0,
                particleColor: 0x9bb5ff,
                emissionRate: 10,
                lifeTime: 5000
            };
            
            const scene = this.managers.render.getScene();
            this.managers.particle = new ParticleManager(
                scene,
                particleConfig,
                this.performanceMonitor
            );
            
            // 创建默认发射器
            const emitter = this.managers.particle.createEmitter('main_emitter', {
                position: new THREE.Vector3(0, 0, 0),
                velocity: new THREE.Vector3(0, 0.01, 0),
                emissionRate: 20,
                particleCount: 5,
                lifeTime: 3000
            });
            
            this.managers.particle.startEmitter('main_emitter');
            
            console.log('[EternalHeartApp] 粒子管理器初始化完成');
            
        } catch (error) {
            throw new Error(`粒子管理器初始化失败: ${error.message}`);
        }
    }
    
    /**
     * 初始化特效管理器
     */
    async initEffectsManager() {
        try {
            console.log('[EternalHeartApp] 初始化特效管理器...');
            
            const scene = this.managers.render.getScene();
            const sceneManager = this.managers.scene;
            
            this.managers.effects = new EffectsManager(sceneManager);
            
            console.log('[EternalHeartApp] 特效管理器初始化完成');
            
        } catch (error) {
            throw new Error(`特效管理器初始化失败: ${error.message}`);
        }
    }
    
    /**
     * 设置UI
     */
    setupUI() {
        // 创建加载界面
        this.createLoadingScreen();
        
        // 创建控制面板
        this.createControlPanel();
        
        // 创建性能监控面板
        this.createPerformancePanel();
        
        console.log('[EternalHeartApp] UI设置完成');
    }
    
    /**
     * 创建加载界面
     */
    createLoadingScreen() {
        const loadingScreen = document.createElement('div');
        loadingScreen.id = 'loading-screen';
        loadingScreen.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: linear-gradient(135deg, #0a0a2a 0%, #000814 50%, #000000 100%);
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            z-index: 10000;
            transition: opacity 1s ease-out;
        `;
        
        loadingScreen.innerHTML = `
            <div style="text-align: center; color: #9bb5ff;">
                <h1 style="font-size: 3rem; margin-bottom: 2rem; text-shadow: 0 0 20px rgba(155, 181, 255, 0.5);">
                    EternalHeart
                </h1>
                <div style="font-size: 1.2rem; margin-bottom: 1rem;">初始化中...</div>
                <div style="width: 300px; height: 4px; background: rgba(155, 181, 255, 0.2); border-radius: 2px; overflow: hidden;">
                    <div id="loading-progress" style="height: 100%; width: 0%; background: linear-gradient(90deg, #9bb5ff, #ff69b4); transition: width 0.3s ease;"></div>
                </div>
                <div id="loading-status" style="margin-top: 1rem; font-size: 0.9rem; opacity: 0.8;"></div>
            </div>
        `;
        
        document.body.appendChild(loadingScreen);
        
        // 更新加载进度
        this.updateLoadingProgress();
    }
    
    /**
     * 更新加载进度
     */
    updateLoadingProgress() {
        const progressBar = document.getElementById('loading-progress');
        const statusText = document.getElementById('loading-status');
        
        if (!progressBar || !statusText) return;
        
        let progress = 0;
        const interval = setInterval(() => {
            progress += Math.random() * 15;
            if (progress > 90) progress = 90;
            
            progressBar.style.width = `${progress}%`;
            
            const statuses = [
                '加载渲染引擎...',
                '构建3D场景...',
                '处理照片资源...',
                '初始化粒子系统...',
                '准备就绪...'
            ];
            
            const statusIndex = Math.floor(progress / 20);
            if (statusIndex < statuses.length) {
                statusText.textContent = statuses[statusIndex];
            }
            
            if (this.state.isInitialized) {
                progress = 100;
                progressBar.style.width = '100%';
                statusText.textContent = '启动中...';
                
                setTimeout(() => {
                    this.hideLoadingScreen();
                    clearInterval(interval);
                }, 500);
            }
        }, 200);
    }
    
    /**
     * 隐藏加载界面
     */
    hideLoadingScreen() {
        const loadingScreen = document.getElementById('loading-screen');
        if (loadingScreen) {
            loadingScreen.style.opacity = '0';
            setTimeout(() => {
                if (loadingScreen.parentNode) {
                    loadingScreen.parentNode.removeChild(loadingScreen);
                }
            }, 1000);
        }
    }
    
    /**
     * 创建控制面板
     */
    createControlPanel() {
        const controlPanel = document.createElement('div');
        controlPanel.id = 'control-panel';
        controlPanel.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: rgba(10, 10, 42, 0.9);
            border: 1px solid rgba(155, 181, 255, 0.3);
            border-radius: 12px;
            padding: 20px;
            color: #9bb5ff;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            font-size: 14px;
            z-index: 1000;
            backdrop-filter: blur(10px);
            max-width: 280px;
        `;
        
        controlPanel.innerHTML = `
            <h3 style="margin: 0 0 15px 0; color: #ff69b4; font-size: 16px; text-align: center; text-shadow: 0 0 10px rgba(255, 105, 180, 0.5);">
                EternalHeart 控制面板
            </h3>
            
            <div style="margin-bottom: 15px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                    <span>自动旋转</span>
                    <button id="toggle-rotation" style="background: #9bb5ff; color: #000; border: none; padding: 5px 10px; border-radius: 4px; cursor: pointer; font-size: 12px;">
                        开启
                    </button>
                </div>
                
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                    <span>心跳模式</span>
                    <button id="toggle-heartbeat" style="background: #ff69b4; color: #fff; border: none; padding: 5px 10px; border-radius: 4px; cursor: pointer; font-size: 12px;">
                        关闭
                    </button>
                </div>
                
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                    <span>渲染质量</span>
                    <select id="quality-select" style="background: #1a1a4a; color: #9bb5ff; border: 1px solid rgba(155, 181, 255, 0.3); padding: 5px; border-radius: 4px; font-size: 12px;">
                        <option value="low">低</option>
                        <option value="medium">中</option>
                        <option value="high" selected>高</option>
                        <option value="ultra">超高</option>
                    </select>
                </div>
            </div>
            
            <div style="border-top: 1px solid rgba(155, 181, 255, 0.2); padding-top: 15px; margin-bottom: 15px;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                    <span>照片总数:</span>
                    <span id="photo-count">0</span>
                </div>
                <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                    <span>当前照片:</span>
                    <span id="current-photo">-</span>
                </div>
                <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                    <span>粒子数量:</span>
                    <span id="particle-count">0</span>
                </div>
            </div>
            
            <div style="border-top: 1px solid rgba(155, 181, 255, 0.2); padding-top: 15px;">
                <div style="font-size: 12px; color: rgba(155, 181, 255, 0.7); line-height: 1.4;">
                    <div>🎮 控制说明:</div>
                    <div>• 鼠标悬停: 放大照片</div>
                    <div>• 鼠标点击: 选择照片</div>
                    <div>• 空格键: 切换旋转</div>
                    <div>• H键: 切换心跳模式</div>
                    <div>• 左右箭头: 切换照片</div>
                </div>
            </div>
        `;
        
        document.body.appendChild(controlPanel);
        
        // 绑定控制事件
        this.bindControlEvents();
    }
    
    /**
     * 绑定控制事件
     */
    bindControlEvents() {
        // 切换旋转
        document.getElementById('toggle-rotation').addEventListener('click', () => {
            this.managers.photo.toggleRotation();
            this.updateControlPanel();
        });
        
        // 切换心跳模式
        document.getElementById('toggle-heartbeat').addEventListener('click', () => {
            this.managers.photo.toggleHeartbeatMode();
            this.updateControlPanel();
        });
        
        // 质量选择
        document.getElementById('quality-select').addEventListener('change', (e) => {
            this.managers.render.setQuality(e.target.value);
        });
    }
    
    /**
     * 更新控制面板
     */
    updateControlPanel() {
        const rotationBtn = document.getElementById('toggle-rotation');
        const heartbeatBtn = document.getElementById('toggle-heartbeat');
        
        if (rotationBtn) {
            const isRotating = this.managers.photo.isRotating;
            rotationBtn.textContent = isRotating ? '关闭' : '开启';
            rotationBtn.style.background = isRotating ? '#ff69b4' : '#9bb5ff';
            rotationBtn.style.color = isRotating ? '#fff' : '#000';
        }
        
        if (heartbeatBtn) {
            const isHeartbeat = this.managers.photo.isHeartbeatMode;
            heartbeatBtn.textContent = isHeartbeat ? '开启' : '关闭';
            heartbeatBtn.style.background = isHeartbeat ? '#ff69b4' : '#9bb5ff';
            heartbeatBtn.style.color = isHeartbeat ? '#fff' : '#000';
        }
        
        // 更新统计信息
        this.updateStats();
    }
    
    /**
     * 创建性能监控面板
     */
    createPerformancePanel() {
        const perfPanel = document.createElement('div');
        perfPanel.id = 'performance-panel';
        perfPanel.style.cssText = `
            position: fixed;
            bottom: 20px;
            left: 20px;
            background: rgba(10, 10, 42, 0.9);
            border: 1px solid rgba(155, 181, 255, 0.3);
            border-radius: 8px;
            padding: 15px;
            color: #9bb5ff;
            font-family: 'Courier New', monospace;
            font-size: 12px;
            z-index: 1000;
            backdrop-filter: blur(10px);
            min-width: 200px;
        `;
        
        perfPanel.innerHTML = `
            <div style="margin-bottom: 10px; font-weight: bold; color: #ff69b4;">
                性能监控
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                <span>FPS:</span>
                <span id="fps-counter">0</span>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                <span>帧时间:</span>
                <span id="frame-time">0ms</span>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                <span>内存:</span>
                <span id="memory-usage">0MB</span>
            </div>
            <div style="display: flex; justify-content: space-between;">
                <span>渲染调用:</span>
                <span id="draw-calls">0</span>
            </div>
        `;
        
        document.body.appendChild(perfPanel);
    }
    
    /**
     * 更新统计信息
     */
    updateStats() {
        // 照片统计
        const photoStats = this.managers.photo.getStats();
        const photoCountEl = document.getElementById('photo-count');
        const currentPhotoEl = document.getElementById('current-photo');
        
        if (photoCountEl) photoCountEl.textContent = photoStats.totalPhotos;
        if (currentPhotoEl) currentPhotoEl.textContent = photoStats.currentIndex + 1;
        
        // 粒子统计
        const particleStats = this.managers.particle.getStats();
        const particleCountEl = document.getElementById('particle-count');
        if (particleCountEl) particleCountEl.textContent = particleStats.activeParticles;
    }
    
    /**
     * 设置全局事件
     */
    setupGlobalEvents() {
        // 窗口大小变化
        window.addEventListener('resize', () => {
            this.managers.render.handleResize();
        });
        
        // 页面可见性变化
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.pause();
            } else {
                this.resume();
            }
        });
        
        // 错误处理
        window.addEventListener('error', (event) => {
            console.error('[EternalHeartApp] 全局错误:', event.error);
        });
        
        // 性能警告
        window.addEventListener('beforeunload', () => {
            this.destroy();
        });
    }
    
    /**
     * 处理初始化错误
     */
    handleInitError(error) {
        const loadingScreen = document.getElementById('loading-screen');
        if (loadingScreen) {
            loadingScreen.innerHTML = `
                <div style="text-align: center; color: #ff6666;">
                    <h1 style="font-size: 2.5rem; margin-bottom: 2rem;">初始化失败</h1>
                    <div style="font-size: 1.2rem; margin-bottom: 1rem;">${error.message}</div>
                    <div style="font-size: 0.9rem; opacity: 0.8; margin-bottom: 2rem;">
                        请刷新页面重试，或检查浏览器兼容性
                    </div>
                    <button onclick="location.reload()" style="background: #ff69b4; color: #fff; border: none; padding: 10px 20px; border-radius: 6px; cursor: pointer; font-size: 14px;">
                        重新加载
                    </button>
                </div>
            `;
        }
    }
    
    /**
     * 启动应用程序
     */
    start() {
        if (this.state.isRunning) return;
        
        console.log('[EternalHeartApp] 启动应用程序...');
        
        this.managers.render.startRenderLoop((deltaTime, currentTime) => {
            this.update(deltaTime, currentTime);
        });
        
        this.state.isRunning = true;
        console.log('[EternalHeartApp] 应用程序已启动');
    }
    
    /**
     * 更新应用程序
     */
    update(deltaTime, currentTime) {
        // 更新管理器
        if (this.managers.scene) {
            this.managers.scene.update(deltaTime, currentTime, this.state);
        }
        
        if (this.managers.photo) {
            this.managers.photo.update(deltaTime, currentTime, this.state);
        }
        
        if (this.managers.particle) {
            this.managers.particle.update(deltaTime, currentTime);
        }
        
        if (this.managers.effects) {
            this.managers.effects.update(deltaTime);
        }
        
        // 更新性能监控
        this.updatePerformanceMetrics();
        
        // 更新UI
        this.updateControlPanel();
    }
    
    /**
     * 更新性能指标
     */
    updatePerformanceMetrics() {
        const rendererInfo = this.managers.render.getRendererInfo();
        
        // FPS计算
        const currentTime = performance.now();
        if (!this.lastFpsTime) {
            this.lastFpsTime = currentTime;
            this.frameCount = 0;
        }
        
        this.frameCount++;
        
        if (currentTime - this.lastFpsTime >= 1000) {
            this.state.performance.fps = this.frameCount;
            this.frameCount = 0;
            this.lastFpsTime = currentTime;
            
            // 更新FPS显示
            const fpsEl = document.getElementById('fps-counter');
            if (fpsEl) fpsEl.textContent = this.state.performance.fps;
        }
        
        // 内存使用
        if (performance.memory) {
            this.state.performance.memoryUsage = Math.round(performance.memory.usedJSHeapSize / 1048576);
            const memoryEl = document.getElementById('memory-usage');
            if (memoryEl) memoryEl.textContent = `${this.state.performance.memoryUsage}MB`;
        }
        
        // 渲染调用
        const drawCallsEl = document.getElementById('draw-calls');
        if (drawCallsEl) drawCallsEl.textContent = rendererInfo.renderCalls;
    }
    
    /**
     * 暂停应用程序
     */
    pause() {
        if (!this.state.isRunning || this.state.isPaused) return;
        
        this.managers.render.pauseRenderLoop();
        this.state.isPaused = true;
        
        console.log('[EternalHeartApp] 应用程序已暂停');
    }
    
    /**
     * 恢复应用程序
     */
    resume() {
        if (!this.state.isRunning || !this.state.isPaused) return;
        
        this.managers.render.resumeRenderLoop();
        this.state.isPaused = false;
        
        console.log('[EternalHeartApp] 应用程序已恢复');
    }
    
    /**
     * 销毁应用程序
     */
    destroy() {
        console.log('[EternalHeartApp] 销毁应用程序...');
        
        // 停止渲染循环
        if (this.managers.render) {
            this.managers.render.stopRenderLoop();
        }
        
        // 销毁管理器
        Object.values(this.managers).forEach(manager => {
            if (manager && typeof manager.destroy === 'function') {
                manager.destroy();
            }
        });
        
        // 清理UI
        const uiElements = [
            'control-panel',
            'performance-panel',
            'loading-screen'
        ];
        
        uiElements.forEach(id => {
            const element = document.getElementById(id);
            if (element && element.parentNode) {
                element.parentNode.removeChild(element);
            }
        });
        
        this.state.isRunning = false;
        this.state.isInitialized = false;
        
        console.log('[EternalHeartApp] 应用程序已销毁');
    }
    
    /**
     * 获取应用程序状态
     */
    getState() {
        return {
            ...this.state,
            managers: {
                render: this.managers.render?.getRendererInfo(),
                scene: this.managers.scene?.getStats(),
                photo: this.managers.photo?.getStats(),
                particle: this.managers.particle?.getStats()
            }
        };
    }
}

// 导出应用程序
export default EternalHeartApp;

// 全局实例
window.EternalHeartApp = EternalHeartApp;

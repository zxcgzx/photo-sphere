/**
 * 渲染管理器
 * 负责WebGL/WebGPU渲染、资源管理和渲染优化
 * @version 4.1.0
 */

import { THREE_LIB as THREE } from '../core/DependencyManager.js';

export class RenderManager {
    constructor(containerId, config = {}, performanceManager) {
        this.config = {
            pixelRatio: Math.min(window.devicePixelRatio, 2),
            antialias: true,
            alpha: true,
            powerPreference: 'high-performance',
            shadowMap: true,
            shadowMapType: 'PCFSoftShadowMap',
            outputEncoding: 'sRGBEncoding',
            toneMapping: 'ACESFilmicToneMapping',
            toneMappingExposure: 1.2,
            ...config
        };
        
        this.performanceManager = performanceManager;
        this.container = document.getElementById(containerId);
        
        if (!this.container) {
            throw new Error(`容器元素不存在: ${containerId}`);
        }
        
        // 渲染状态
        this.isRunning = false;
        this.isPaused = false;
        this.renderLoopId = null;
        this.lastRenderTime = 0;
        this.frameInterval = 1000 / (this.config.maxFPS || 60);
        
        // 资源管理
        this.resources = new Map();
        this.resourceLoader = new Map();
        
        // 初始化
        this.init();
        
        console.log('[RenderManager] 渲染管理器初始化完成');
    }
    
    /**
     * 初始化渲染器
     */
    init() {
        try {
            this.performanceManager?.mark('render_init_start');
            
            // 创建场景
            this.scene = new THREE.Scene();
            this.scene.fog = new THREE.FogExp2(0x000000, 0.0005);
            
            // 创建相机
            this.camera = new THREE.PerspectiveCamera(
                75,
                this.container.clientWidth / this.container.clientHeight,
                0.1,
                3000
            );
            this.camera.position.z = 800;
            
            // 创建WebGL渲染器
            this.renderer = new THREE.WebGLRenderer({
                antialias: this.config.antialias,
                alpha: this.config.alpha,
                powerPreference: this.config.powerPreference
            });
            
            // 配置渲染器
            this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
            this.renderer.setPixelRatio(this.config.pixelRatio);
            this.renderer.setClearColor(0x000000, 0);
            
            // 配置阴影
            if (this.config.shadowMap) {
                this.renderer.shadowMap.enabled = true;
                this.renderer.shadowMap.type = this.getShadowMapType(this.config.shadowMapType);
            }
            
            // 配置色彩管理
            this.renderer.outputEncoding = this.getOutputEncoding(this.config.outputEncoding);
            this.renderer.toneMapping = this.getToneMapping(this.config.toneMapping);
            this.renderer.toneMappingExposure = this.config.toneMappingExposure;
            
            // 添加到DOM
            this.container.appendChild(this.renderer.domElement);
            
            // 监听窗口大小变化
            this.setupResizeHandler();
            
            this.performanceManager?.mark('render_init_complete');
            this.performanceManager?.measure('render_init', 'render_init_start', 'render_init_complete');
            
        } catch (error) {
            throw new Error(`渲染器初始化失败: ${error.message}`);
        }
    }
    
    /**
     * 设置窗口大小调整处理器
     */
    setupResizeHandler() {
        let resizeTimeout;
        
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => {
                this.handleResize();
            }, 250);
        });
    }
    
    /**
     * 处理窗口大小调整
     */
    handleResize() {
        const width = this.container.clientWidth;
        const height = this.container.clientHeight;
        
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        
        this.renderer.setSize(width, height);
        this.renderer.setPixelRatio(this.config.pixelRatio);
        
        console.log(`[RenderManager] 渲染尺寸更新: ${width}x${height}`);
    }
    
    /**
     * 获取阴影映射类型
     */
    getShadowMapType(type) {
        const shadowMapTypes = {
            'BasicShadowMap': THREE.BasicShadowMap,
            'PCFShadowMap': THREE.PCFShadowMap,
            'PCFSoftShadowMap': THREE.PCFSoftShadowMap,
            'VSMShadowMap': THREE.VSMShadowMap
        };
        
        return shadowMapTypes[type] || THREE.PCFSoftShadowMap;
    }
    
    /**
     * 获取输出编码
     */
    getOutputEncoding(encoding) {
        const encodings = {
            'LinearEncoding': THREE.LinearEncoding,
            'sRGBEncoding': THREE.sRGBEncoding,
            'GammaEncoding': THREE.GammaEncoding
        };
        
        return encodings[encoding] || THREE.sRGBEncoding;
    }
    
    /**
     * 获取色调映射
     */
    getToneMapping(toneMapping) {
        const toneMappings = {
            'NoToneMapping': THREE.NoToneMapping,
            'LinearToneMapping': THREE.LinearToneMapping,
            'ReinhardToneMapping': THREE.ReinhardToneMapping,
            'CineonToneMapping': THREE.CineonToneMapping,
            'ACESFilmicToneMapping': THREE.ACESFilmicToneMapping,
            'CustomToneMapping': THREE.CustomToneMapping
        };
        
        return toneMappings[toneMapping] || THREE.ACESFilmicToneMapping;
    }
    
    /**
     * 开始渲染循环
     */
    startRenderLoop(updateCallback) {
        if (this.isRunning) {
            console.warn('[RenderManager] 渲染循环已在运行');
            return;
        }
        
        this.isRunning = true;
        this.lastRenderTime = performance.now();
        
        const render = (currentTime) => {
            if (!this.isRunning) return;
            
            // 帧率控制
            if (this.shouldRender(currentTime)) {
                const deltaTime = currentTime - this.lastRenderTime;
                
                // 更新回调
                if (updateCallback && !this.isPaused) {
                    updateCallback(deltaTime, currentTime);
                }
                
                // 渲染场景
                this.render();
                
                this.lastRenderTime = currentTime;
            }
            
            this.renderLoopId = requestAnimationFrame(render);
        };
        
        this.renderLoopId = requestAnimationFrame(render);
        
        console.log('[RenderManager] 渲染循环已启动');
    }
    
    /**
     * 是否应该渲染（帧率控制）
     */
    shouldRender(currentTime) {
        const frameInterval = 1000 / (this.config.maxFPS || 60);
        return currentTime - this.lastRenderTime >= frameInterval;
    }
    
    /**
     * 暂停渲染循环
     */
    pauseRenderLoop() {
        this.isPaused = true;
        console.log('[RenderManager] 渲染循环已暂停');
    }
    
    /**
     * 恢复渲染循环
     */
    resumeRenderLoop() {
        this.isPaused = false;
        this.lastRenderTime = performance.now();
        console.log('[RenderManager] 渲染循环已恢复');
    }
    
    /**
     * 停止渲染循环
     */
    stopRenderLoop() {
        this.isRunning = false;
        
        if (this.renderLoopId) {
            cancelAnimationFrame(this.renderLoopId);
            this.renderLoopId = null;
        }
        
        console.log('[RenderManager] 渲染循环已停止');
    }
    
    /**
     * 渲染场景
     */
    render() {
        try {
            this.renderer.render(this.scene, this.camera);
        } catch (error) {
            console.error('[RenderManager] 渲染失败:', error);
            this.stopRenderLoop();
        }
    }
    
    /**
     * 创建渲染目标
     */
    createRenderTarget(width, height, options = {}) {
        return new THREE.WebGLRenderTarget(width, height, {
            minFilter: THREE.LinearFilter,
            magFilter: THREE.LinearFilter,
            format: THREE.RGBAFormat,
            type: THREE.UnsignedByteType,
            ...options
        });
    }
    
    /**
     * 截图功能
     */
    captureScreenshot(format = 'image/png', quality = 1.0) {
        this.render();
        return this.renderer.domElement.toDataURL(format, quality);
    }
    
    /**
     * 录制视频（实验性）
     */
    startRecording(fps = 30, duration = 5000) {
        const canvas = this.renderer.domElement;
        const stream = canvas.captureStream(fps);
        const recorder = new MediaRecorder(stream, {
            mimeType: 'video/webm'
        });
        
        const chunks = [];
        recorder.ondataavailable = (e) => chunks.push(e.data);
        recorder.onstop = () => {
            const blob = new Blob(chunks, { type: 'video/webm' });
            const url = URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.href = url;
            a.download = `recording-${Date.now()}.webm`;
            a.click();
            
            URL.revokeObjectURL(url);
        };
        
        recorder.start();
        
        setTimeout(() => {
            recorder.stop();
        }, duration);
        
        return recorder;
    }
    
    /**
     * 设置渲染质量
     */
    setQuality(quality) {
        const qualities = {
            low: {
                pixelRatio: 1,
                shadowMap: false,
                toneMappingExposure: 1.0
            },
            medium: {
                pixelRatio: Math.min(window.devicePixelRatio, 1.5),
                shadowMap: true,
                shadowMapType: 'PCFShadowMap',
                toneMappingExposure: 1.1
            },
            high: {
                pixelRatio: Math.min(window.devicePixelRatio, 2),
                shadowMap: true,
                shadowMapType: 'PCFSoftShadowMap',
                toneMappingExposure: 1.2
            },
            ultra: {
                pixelRatio: window.devicePixelRatio,
                shadowMap: true,
                shadowMapType: 'VSMShadowMap',
                toneMappingExposure: 1.3
            }
        };
        
        const qualityConfig = qualities[quality] || qualities.high;
        this.updateConfig(qualityConfig);
        
        console.log(`[RenderManager] 渲染质量已设置为: ${quality}`);
    }
    
    /**
     * 更新渲染配置
     */
    updateConfig(newConfig) {
        this.config = { ...this.config, ...newConfig };
        
        // 应用新配置
        if (newConfig.pixelRatio !== undefined) {
            this.renderer.setPixelRatio(newConfig.pixelRatio);
        }
        
        if (newConfig.shadowMap !== undefined) {
            this.renderer.shadowMap.enabled = newConfig.shadowMap;
        }
        
        if (newConfig.toneMappingExposure !== undefined) {
            this.renderer.toneMappingExposure = newConfig.toneMappingExposure;
        }
        
        console.log('[RenderManager] 渲染配置已更新');
    }
    
    /**
     * 获取渲染器信息
     */
    getRendererInfo() {
        const info = this.renderer.info;
        
        return {
            renderer: 'WebGLRenderer',
            version: 'r128',
            webgl: this.renderer.capabilities.isWebGL2 ? 'WebGL 2.0' : 'WebGL 1.0',
            maxTextures: this.renderer.capabilities.maxTextures,
            maxTextureSize: this.renderer.capabilities.maxTextureSize,
            maxCubemapSize: this.renderer.capabilities.maxCubemapSize,
            maxAttributes: this.renderer.capabilities.maxAttributes,
            maxVertexUniforms: this.renderer.capabilities.maxVertexUniforms,
            maxFragmentUniforms: this.renderer.capabilities.maxFragmentUniforms,
            renderCalls: info.render.calls,
            renderTriangles: info.render.triangles,
            renderPoints: info.render.points,
            renderLines: info.render.lines,
            geometries: info.memory.geometries,
            textures: info.memory.textures
        };
    }
    
    /**
     * 销毁渲染管理器
     */
    destroy() {
        this.stopRenderLoop();
        
        // 清理资源
        this.resources.forEach(resource => {
            if (resource.dispose) resource.dispose();
        });
        this.resources.clear();
        
        // 移除DOM元素
        if (this.renderer.domElement.parentNode) {
            this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
        }
        
        // 销毁渲染器
        this.renderer.dispose();
        
        console.log('[RenderManager] 渲染管理器已销毁');
    }
    
    /**
     * 获取渲染器
     */
    getRenderer() {
        return this.renderer;
    }
    
    /**
     * 获取相机
     */
    getCamera() {
        return this.camera;
    }
    
    /**
     * 获取场景
     */
    getScene() {
        return this.scene;
    }
}

// 导出渲染管理器
export default RenderManager;

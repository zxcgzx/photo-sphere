/**
 * 永恒之心企业级渲染引擎
 * Enterprise-level 3D Photo Sphere Engine
 * @version 4.1.0
 * @author Boning
 * @license Enterprise
 */

import { SceneManager } from '../managers/SceneManager.js';
import { RenderManager } from '../managers/RenderManager.js';
import { PhotoManager } from '../managers/PhotoManager.js';
import { ParticleManager } from '../managers/ParticleManager.js';
import { LightingManager } from '../managers/LightingManager.js';
import { UIManager } from '../managers/UIManager.js';
import { PerformanceManager } from '../managers/PerformanceManager.js';
import { ErrorManager } from '../managers/ErrorManager.js';
import { ConfigManager } from '../managers/ConfigManager.js';

export class EternalHeartEngine {
    constructor(containerId, config = {}) {
        // 初始化错误管理器（最先初始化）
        this.errorManager = new ErrorManager();
        
        try {
            // 初始化配置管理器
            this.configManager = new ConfigManager(config);
            this.config = this.configManager.getConfig();
            
            // 初始化性能管理器
            this.performanceManager = new PerformanceManager(this.config.performance);
            
            // 初始化渲染管理器
            this.renderManager = new RenderManager(
                containerId, 
                this.config.rendering,
                this.performanceManager
            );
            this.renderer = this.renderManager.getRenderer();
            this.camera = this.renderManager.getCamera();
            this.scene = this.renderManager.getScene();
            
            // 初始化场景管理器
            this.sceneManager = new SceneManager(
                this.scene,
                this.config.scene,
                this.performanceManager
            );
            
            // 初始化光照管理器
            this.lightingManager = new LightingManager(
                this.scene,
                this.config.lighting,
                this.performanceManager
            );
            this.lights = this.lightingManager.getLights();
            
            // 初始化照片管理器
            this.photoManager = new PhotoManager(
                this.scene,
                this.config.scene,
                this.lightingManager,
                this.performanceManager
            );
            this.photos = this.photoManager.getPhotos();
            
            // 初始化粒子管理器
            this.particleManager = new ParticleManager(
                this.scene,
                this.config.scene,
                this.performanceManager
            );
            this.particles = this.particleManager.getParticles();
            
            // 初始化UI管理器
            this.uiManager = new UIManager(
                this.config.ui,
                this.performanceManager
            );
            
            // 状态管理
            this.state = {
                isRunning: false,
                isPaused: false,
                currentMood: 0,
                isHeartbeatMode: false,
                mouseX: 0,
                mouseY: 0,
                targetRotationX: 0,
                targetRotationY: 0
            };
            
            // 初始化完成
            this.performanceManager.mark('engine_init_complete');
            
            console.log('[EternalHeartEngine] 企业级渲染引擎初始化完成');
            
        } catch (error) {
            this.errorManager.handleCritical(error, 'ENGINE_INIT_FAILED');
            throw error;
        }
    }
    
    /**
     * 启动渲染引擎
     */
    start() {
        try {
            this.state.isRunning = true;
            this.renderManager.startRenderLoop(this.update.bind(this));
            this.uiManager.showGestureHint();
            
            console.log('[EternalHeartEngine] 渲染引擎已启动');
        } catch (error) {
            this.errorManager.handleError(error, 'ENGINE_START_FAILED');
        }
    }
    
    /**
     * 暂停渲染
     */
    pause() {
        this.state.isPaused = true;
        this.renderManager.pauseRenderLoop();
    }
    
    /**
     * 恢复渲染
     */
    resume() {
        this.state.isPaused = false;
        this.renderManager.resumeRenderLoop();
    }
    
    /**
     * 销毁引擎（清理资源）
     */
    destroy() {
        try {
            this.state.isRunning = false;
            
            // 按顺序清理资源
            this.particleManager.destroy();
            this.photoManager.destroy();
            this.lightingManager.destroy();
            this.sceneManager.destroy();
            this.renderManager.destroy();
            this.uiManager.destroy();
            this.performanceManager.destroy();
            
            // 清理引用
            Object.keys(this).forEach(key => {
                if (key !== 'errorManager') {
                    this[key] = null;
                }
            });
            
            console.log('[EternalHeartEngine] 渲染引擎已销毁');
        } catch (error) {
            this.errorManager.handleError(error, 'ENGINE_DESTROY_FAILED');
        }
    }
    
    /**
     * 主更新循环
     */
    update(deltaTime, currentTime) {
        if (!this.state.isRunning || this.state.isPaused) return;
        
        try {
            // 性能监控开始
            this.performanceManager.beginFrame();
            
            // 更新场景
            this.sceneManager.update(deltaTime, currentTime, this.state);
            
            // 更新照片
            this.photoManager.update(deltaTime, currentTime, this.state);
            
            // 更新粒子
            this.particleManager.update(deltaTime, currentTime, this.state);
            
            // 更新光照
            this.lightingManager.update(deltaTime, currentTime, this.state);
            
            // 更新UI
            this.uiManager.update(deltaTime, currentTime, this.state);
            
            // 性能监控结束
            this.performanceManager.endFrame();
            
        } catch (error) {
            this.errorManager.handleError(error, 'UPDATE_LOOP_FAILED');
        }
    }
    
    /**
     * 获取引擎状态
     */
    getState() {
        return {
            ...this.state,
            performance: this.performanceManager.getMetrics(),
            memory: this.performanceManager.getMemoryUsage()
        };
    }
    
    /**
     * 动态更新配置
     */
    updateConfig(newConfig) {
        try {
            this.configManager.mergeConfig(newConfig);
            this.config = this.configManager.getConfig();
            
            // 通知各管理器更新配置
            this.renderManager.updateConfig(this.config.rendering);
            this.sceneManager.updateConfig(this.config.scene);
            this.lightingManager.updateConfig(this.config.lighting);
            this.particleManager.updateConfig(this.config.scene);
            
            console.log('[EternalHeartEngine] 配置已更新');
        } catch (error) {
            this.errorManager.handleError(error, 'CONFIG_UPDATE_FAILED');
        }
    }
}

// 导出引擎类
export default EternalHeartEngine;

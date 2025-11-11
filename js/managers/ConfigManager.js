/**
 * 配置管理器
 * 负责所有配置的加载、验证和合并
 * @version 4.1.0
 */

export class ConfigManager {
    constructor(userConfig = {}) {
        // 默认企业级配置
        this.defaultConfig = {
            // 渲染配置
            rendering: {
                pixelRatio: Math.min(window.devicePixelRatio, 2),
                antialias: true,
                alpha: true,
                powerPreference: 'high-performance',
                shadowMap: true,
                shadowMapType: 'PCFSoftShadowMap', // 枚举值，实际使用时转换为THREE常量
                outputEncoding: 'sRGBEncoding',
                toneMapping: 'ACESFilmicToneMapping',
                toneMappingExposure: 1.2,
                maxFPS: 60
            },
            
            // 场景配置
            scene: {
                radius: 320,
                particleCount: 1500,
                imageSize: 70,
                autoRotateSpeed: 0.1,
                startDate: new Date('2024-01-01'),
                photoCount: 99,
                starsCount: 5000,
                galaxyColors: ['#9bb5ff', '#9d9dff', '#ffcc99', '#ff9999', '#ffb3d9', '#d6b3ff', '#c0c0c0'],
                emojis: ['💫', '⭐', '✨', '🌟', '🌠', '🌌', '🌙', '☄️', '🚀', '🛸', '🌍', '🪐', '💖', '💕', '💝', '💘', '🌸', '🌺', '🌷', '🌹', '🦋', '🌈', '✨'],
                captions: [
                    "初见时，星辰初绽，万物失色 ✨",
                    "你的眼眸，是宇宙最亮的星，照亮我的世界 👀",
                    "第一次牵手，触电般的感觉，心跳漏了一拍 ⚡",
                    // ... 更多文案
                ]
            },
            
            // 光照配置
            lighting: {
                ambientIntensity: 0.3,
                pointLightIntensity: 1.5,
                pointLightDistance: 2000,
                auxiliaryLights: 4,
                auxiliaryIntensity: 0.8,
                auxiliaryDistance: 1500,
                heartbeatFrequency: 8 // Hz
            },
            
            // 材质配置
            materials: {
                roughness: 0.3,
                metalness: 0.1,
                emissiveIntensity: 0.1,
                opacity: 0.95,
                transparent: true
            },
            
            // 性能配置
            performance: {
                maxFPS: 60,
                particleUpdateRate: 0.02,
                auraRotationSpeed: 0.03,
                orbitRotationSpeed: 0.002,
                enableMetrics: true,
                metricsUpdateInterval: 1000
            },
            
            // UI配置
            ui: {
                enableGestureHint: true,
                gestureHintDuration: 6000,
                enablePerformancePanel: true,
                toastDuration: 3500
            }
        };
        
        // 合并用户配置
        this.config = this.mergeConfig(this.defaultConfig, userConfig);
        
        // 验证配置
        this.validateConfig(this.config);
        
        console.log('[ConfigManager] 配置初始化完成');
    }
    
    /**
     * 深度合并配置对象
     */
    mergeConfig(target, source) {
        const result = { ...target };
        
        for (const key in source) {
            if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
                result[key] = this.mergeConfig(result[key] || {}, source[key]);
            } else {
                result[key] = source[key];
            }
        }
        
        return result;
    }
    
    /**
     * 验证配置的有效性
     */
    validateConfig(config) {
        const errors = [];
        
        // 验证渲染配置
        if (config.rendering.pixelRatio < 1 || config.rendering.pixelRatio > 4) {
            errors.push('pixelRatio必须在1-4之间');
        }
        
        if (config.rendering.toneMappingExposure < 0 || config.rendering.toneMappingExposure > 10) {
            errors.push('toneMappingExposure必须在0-10之间');
        }
        
        // 验证场景配置
        if (config.scene.particleCount > 5000) {
            console.warn('[ConfigManager] 警告：粒子数超过5000可能影响性能');
        }
        
        if (config.scene.photoCount > 200) {
            console.warn('[ConfigManager] 警告：照片数超过200可能影响性能');
        }
        
        // 验证光照配置
        if (config.lighting.auxiliaryLights > 8) {
            errors.push('辅助光源数量不能超过8个');
        }
        
        // 验证性能配置
        if (config.performance.maxFPS > 144) {
            console.warn('[ConfigManager] 警告：FPS超过144可能无意义');
        }
        
        if (errors.length > 0) {
            throw new Error(`配置验证失败：${errors.join(', ')}`);
        }
        
        console.log('[ConfigManager] 配置验证通过');
    }
    
    /**
     * 获取当前配置
     */
    getConfig() {
        return { ...this.config };
    }
    
    /**
     * 动态更新配置
     */
    mergeConfig(newConfig) {
        this.config = this.mergeConfig(this.config, newConfig);
        this.validateConfig(this.config);
        
        console.log('[ConfigManager] 配置已更新');
        return this.getConfig();
    }
    
    /**
     * 获取特定路径的配置值
     */
    get(path) {
        const keys = path.split('.');
        let value = this.config;
        
        for (const key of keys) {
            if (value && typeof value === 'object' && key in value) {
                value = value[key];
            } else {
                return undefined;
            }
        }
        
        return value;
    }
    
    /**
     * 设置特定路径的配置值
     */
    set(path, value) {
        const keys = path.split('.');
        const lastKey = keys.pop();
        let target = this.config;
        
        for (const key of keys) {
            if (!(key in target) || typeof target[key] !== 'object') {
                target[key] = {};
            }
            target = target[key];
        }
        
        target[lastKey] = value;
        this.validateConfig(this.config);
        
        return this.getConfig();
    }
    
    /**
     * 导出配置（用于调试）
     */
    exportConfig() {
        return JSON.stringify(this.config, null, 2);
    }
    
    /**
     * 从JSON导入配置
     */
    importConfig(jsonString) {
        try {
            const config = JSON.parse(jsonString);
            this.config = this.mergeConfig(this.defaultConfig, config);
            this.validateConfig(this.config);
            
            console.log('[ConfigManager] 配置已导入');
            return this.getConfig();
        } catch (error) {
            throw new Error(`配置导入失败：${error.message}`);
        }
    }
}

// 导出配置管理器
export default ConfigManager;

/**
 * 配置模块 - 我们的小宇宙
 * 统一管理应用配置参数
 * @typedef {Object} Config
 */

class Config {
    constructor() {
        // 3D场景配置
        /** @type {object} */
        this.scene = {
            radius: 250,
            particleCount: 400,
            imageSize: 50,
            autoRotateSpeed: 0.2,
            starsCount: 2000,
            cameraDistance: 2.5,
            fogNear: 100,
            fogFar: 2000
        };
        
        // 照片配置
        /** @type {object} */
        this.photos = {
            photoCount: 53,
            batchLoadSize: 8,
            loadDelay: 100,
            maxRetries: 3,
            supportedFormats: ['jpg', 'jpeg', 'png', 'webp', 'gif'],
            maxFileSize: 10 * 1024 * 1024, // 10MB
            useSmartLoading: true
        };
        
        // 性能配置（合并所有性能相关配置）
        /** @type {object} */
        this.performance = {
            targetFPS: 60,
            maxCacheSize: 50,
            maxConcurrentLoads: 3,
            preloadBuffer: 200,
            enableMipmaps: true,
            autoOptimization: true,
            lodDistances: [50, 100, 200],
            enableLOD: true,
            maxTextureSize: 1024,
            antialias: true,
            shadowMapEnabled: false,
            maxFrameRate: 60,
            lowPerformanceThreshold: 30
        };
        
        // 调试配置
        this.debug = {
            enabled: false, // 在开发环境设为true
            showStats: true,
            logLevel: 'info', // 'error', 'warn', 'info', 'debug'
            performanceMonitoring: true
        };
        
        // 动画配置
        this.animations = {
            photoEntryDelay: 30,
            photoScaleDuration: 800,
            cameraMoveDuration: 1500,
            pulseScaleDuration: 500,
            rotationDuration: 1000,
            meteorsCount: 20,
            meteorCreateDelay: 200
        };
        
        // UI配置
        this.ui = {
            loadingTimeout: 30000,
            gestureHintDuration: 3000,
            toastDuration: 2000,
            floatingEmojiInterval: 3000,
            floatingEmojiProbability: 0.3
        };
        
        // 颜色主题
        this.themes = {
            moods: [
                { name: '深空蓝', colors: ['#000428', '#004e92'] },
                { name: '星云紫', colors: ['#1a1a2e', '#16213e', '#0f3460', '#533483'] },
                { name: '极光绿', colors: ['#0f0c29', '#302b63', '#24243e', '#0f9b0f'] },
                { name: '宇宙红', colors: ['#200122', '#6f0000', '#dc004e'] }
            ],
            galaxyColors: ['#9bb5ff', '#9d9dff', '#ffcc99', '#ff9999'],
            lightModes: [
                { name: '地球日光', colors: [0xffffff, 0x6495ed, 0x9bb5ff] },
                { name: '极光模式', colors: [0x00ff88, 0x00ffff, 0xff00ff] },
                { name: '深空模式', colors: [0x4444ff, 0x8844ff, 0xff44ff] }
            ]
        };
        
        // 表情符号
        this.emojis = {
            decorative: ['💫', '⭐', '✨', '🌟', '🌠', '🌌', '🌙', '☄️', '🚀', '🛸', '🌍', '🪐'],
            hearts: ['💖', '💕', '💝', '❤️', '🧡', '💛', '💚', '💙', '💜', '🤍', '🖤', '🤎'],
            celebration: ['🎉', '🎊', '✨', '🌟', '💫', '🎆', '🎇', '🌈']
        };
        
        // 照片描述
        this.captions = [
            "第一次见面，宇宙开始 ✨",
            "一起看的第一场电影 🎬",
            "周末的午后阳光 🌞",
            "你做的第一顿饭 🍳",
            "雨天的拥抱 ☔",
            "深夜的电话粥 📱",
            "一起追的剧 📺",
            "第一次旅行，探索新世界 🚀",
            "生日惊喜 🎂",
            "情人节的星光 🌟",
            "公园散步 🌳",
            "海边日落 🌅",
            "一起做饭 👨‍🍳",
            "游乐园的一天 🎡",
            "看展览 🎨",
            "爬山看银河 🌌",
            "一起学习 📚",
            "宅在家的周末 🏠",
            "深夜看星星 ⭐",
            "早安的拥抱 🌤️",
            "一起运动 🏃",
            "逛超市 🛒",
            "等你下班 🚶",
            "一起看演唱会 🎤",
            "喝奶茶的午后 🧋",
            "拍照的你 📷",
            "牵手走过的街 🤝",
            "一起等日出 🌄",
            "雪天的温暖 ❄️",
            "最美的笑容 😊",
            "樱花树下 🌸",
            "图书馆学习 📖",
            "第一次做蛋糕 🍰",
            "看烟花，像流星 🎆",
            "坐摩天轮，触碰天空 🎠",
            "吃火锅 🍲",
            "唱K的夜晚 🎤",
            "看日出 🌅",
            "逛夜市 🏮",
            "一起画画 🎨",
            "做手工 ✂️",
            "看相册回忆 📷",
            "一起种花 🌱",
            "看月亮 🌙",
            "吃冰淇淋 🍦",
            "放风筝 🪁",
            "骑单车 🚴",
            "看展览 🖼️",
            "写情书 💌",
            "一起做瑜伽 🧘",
            "看流星许愿 💫",
            "许下永恒的愿望 🙏",
            "我们的宇宙，永远闪耀 💑"
        ];
        
        // 密码验证配置（从环境变量或服务器获取）
        this.auth = {
            passwordConfig: {
                correctMonth: "1",
                correctNickname: "宝贝",
                correctWord: "宇宙"
            },
            maxLoginAttempts: 3,
            lockoutDuration: 15 * 60 * 1000 // 15分钟
        };
        
        // 纪念日配置
        this.memorial = {
            startDate: new Date('2024-01-01'),
            milestones: [
                { days: 100, message: "相识100天纪念 💕" },
                { days: 365, message: "一周年快乐！🎉" },
                { days: 500, message: "500天的美好时光 ✨" },
                { days: 1000, message: "千日之约，永远在一起 💑" }
            ]
        };
        
        // API配置
        this.api = {
            baseUrl: '/api',
            endpoints: {
                photos: '/photos',
                upload: '/upload/photos',
                auth: '/auth/verify-access',
                stats: '/upload/stats'
            },
            timeout: 30000,
            retryAttempts: 3,
            retryDelay: 1000
        };
        

        
        // 调试配置
        this.debug = {
            enableStats: window.location.hash.includes('debug'),
            enableConsoleLog: (typeof process !== 'undefined' && process.env && process.env.NODE_ENV === 'development') || window.location.hash.includes('debug'),
            showBoundingBoxes: window.location.hash.includes('bbox'),
            showGrid: window.location.hash.includes('grid')
        };
        
        // 加载自定义配置
        this.loadCustomConfig();
    }
    
    /**
     * 从服务器加载自定义配置
     */
    async loadCustomConfig() {
        try {
            const response = await fetch('/api/config');
            if (response.ok) {
                const customConfig = await response.json();
                this.mergeConfig(customConfig);
            }
        } catch (error) {
            console.warn('无法加载自定义配置，使用默认配置:', error);
        }
    }
    
    /**
     * 合并配置对象（带白名单验证）
     * @param {object} customConfig - 自定义配置
     * @param {string[]} whitelist - 允许合并的键列表
     */
    mergeConfig(customConfig, whitelist = null) {
        const allowedKeys = whitelist || [
            'scene', 'photos', 'performance', 'ui', 'captions', 'emojis', 
            'themes', 'auth', 'memorial', 'api', 'debug'
        ];
        
        for (const key in customConfig) {
            if (!allowedKeys.includes(key)) {
                this.warn(`配置键 "${key}" 不在白名单中，已忽略`);
                continue;
            }
            
            if (typeof customConfig[key] === 'object' && !Array.isArray(customConfig[key])) {
                this[key] = { ...this[key], ...customConfig[key] };
            } else {
                this[key] = customConfig[key];
            }
        }
    }
    
    /**
     * 获取配置值
     */
    get(path, defaultValue = null) {
        const keys = path.split('.');
        let value = this;
        
        for (const key of keys) {
            if (value && typeof value === 'object' && key in value) {
                value = value[key];
            } else {
                return defaultValue;
            }
        }
        
        return value;
    }
    
    /**
     * 设置配置值
     */
    set(path, value) {
        const keys = path.split('.');
        const lastKey = keys.pop();
        let target = this;
        
        for (const key of keys) {
            if (!target[key] || typeof target[key] !== 'object') {
                target[key] = {};
            }
            target = target[key];
        }
        
        target[lastKey] = value;
    }
    
    /**
     * 获取随机照片描述
     */
    getRandomCaption() {
        return this.captions[Math.floor(Math.random() * this.captions.length)];
    }
    
    /**
     * 获取随机表情符号
     */
    getRandomEmoji(category = 'decorative') {
        const emojis = this.emojis[category] || this.emojis.decorative;
        return emojis[Math.floor(Math.random() * emojis.length)];
    }
    
    /**
     * 获取纪念日信息
     */
    getMemorialInfo() {
        const now = new Date();
        const diffTime = now - this.memorial.startDate;
        const days = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        
        // 检查是否有特殊里程碑
        const milestone = this.memorial.milestones.find(m => m.days === days);
        
        return {
            days,
            milestone,
            years: Math.floor(days / 365),
            months: Math.floor((days % 365) / 30)
        };
    }
    
    /**
     * 验证配置完整性
     */
    validate() {
        const required = [
            'scene.radius',
            'photos.photoCount', 
            'api.baseUrl',
            'memorial.startDate'
        ];
        
        const missing = required.filter(path => this.get(path) === null);
        
        if (missing.length > 0) {
            console.warn('缺少必要配置:', missing);
            return false;
        }
        
        return true;
    }
    
    /**
     * 获取当前主题
     */
    getCurrentTheme() {
        const savedTheme = localStorage.getItem('photoSphere.theme');
        if (savedTheme && this.themes.moods.some(m => m.name === savedTheme)) {
            return this.themes.moods.find(m => m.name === savedTheme);
        }
        return this.themes.moods[0]; // 默认主题
    }
    
    /**
     * 保存主题设置
     */
    saveTheme(themeName) {
        localStorage.setItem('photoSphere.theme', themeName);
    }
    
    /**
     * 日志输出
     */
    log(...args) {
        if (this.debug.enableConsoleLog) {
            console.log('[PhotoSphere]', ...args);
        }
    }
    
    /**
     * 错误日志
     */
    error(...args) {
        console.error('[PhotoSphere]', ...args);
    }
    
    /**
     * 警告日志
     */
    warn(...args) {
        if (this.debug.enableConsoleLog) {
            console.warn('[PhotoSphere]', ...args);
        }
    }
}

// 创建全局配置实例
const CONFIG = new Config();
window.CONFIG = CONFIG;

// 导出配置实例和类
export { CONFIG, Config };
export default Config;
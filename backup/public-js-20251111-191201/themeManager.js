/**
 * 主题管理器
 * 负责加载和应用主题配置，消除HTML重复代码
 */

import { CONFIG } from './config.js';

class ThemeManager {
    constructor(config) {
        this.config = config || CONFIG;
        this.currentTheme = 'default';
        this.themes = {};
        this.themeConfigPath = '/themes/theme-config.json';
    }
    
    /**
     * 初始化主题管理器
     */
    async initialize() {
        try {
            console.log('[ThemeManager] 初始化主题管理器...');
            
            // 加载主题配置
            await this.loadThemes();
            
            // 应用默认主题
            this.applyTheme(this.currentTheme);
            
            console.log('[ThemeManager] 主题管理器初始化完成');
        } catch (error) {
            console.error('[ThemeManager] 初始化失败:', error);
            throw error;
        }
    }
    
    /**
     * 加载主题配置文件
     */
    async loadThemes() {
        try {
            const response = await fetch(this.themeConfigPath);
            if (!response.ok) {
                throw new Error(`加载主题配置失败: ${response.status}`);
            }
            
            this.themes = await response.json();
            console.log('[ThemeManager] 加载了', Object.keys(this.themes).length, '个主题');
            
            // 显示成功提示
            this.showThemeLoadSuccess(Object.keys(this.themes).length);
            
        } catch (error) {
            console.error('[ThemeManager] 无法加载主题配置:', error);
            this.themes = this.getBuiltInThemes();
            
            // 显示失败提示
            this.showThemeLoadError(error.message);
        }
    }
    
    /**
     * 显示主题加载成功提示
     */
    showThemeLoadSuccess(themeCount) {
        const toast = document.createElement('div');
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #00ff88;
            color: #000;
            padding: 15px 20px;
            border-radius: 8px;
            z-index: 10000;
            font-family: 'Noto Sans SC', sans-serif;
            animation: slideIn 0.3s ease-out;
        `;
        toast.textContent = `✅ 主题加载成功！共 ${themeCount} 个主题可用`;
        
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.style.animation = 'slideIn 0.3s ease-out reverse';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }
    
    /**
     * 显示主题加载错误提示
     */
    showThemeLoadError(errorMessage) {
        const toast = document.createElement('div');
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #ff6b6b;
            color: white;
            padding: 15px 20px;
            border-radius: 8px;
            z-index: 10000;
            font-family: 'Noto Sans SC', sans-serif;
            max-width: 400px;
            animation: slideIn 0.3s ease-out;
        `;
        
        toast.innerHTML = `
            <div style="font-weight: bold; margin-bottom: 5px;">⚠️ 主题加载失败</div>
            <div style="font-size: 0.9rem; opacity: 0.9;">${errorMessage}</div>
            <div style="font-size: 0.8rem; margin-top: 8px; opacity: 0.8;">
                已回退到默认主题，请检查网络连接或联系管理员。
            </div>
        `;
        
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.style.animation = 'slideIn 0.3s ease-out reverse';
            setTimeout(() => toast.remove(), 300);
        }, 5000);
    }
    
    /**
     * 获取内置默认主题（容错）
     */
    getBuiltInThemes() {
        return {
            default: {
                title: "我们的小宇宙 - 3D照片星球",
                passwordScreen: {
                    title: "我们的小宇宙",
                    subtitle: "请输入密码，进入我们的专属空间"
                },
                colors: {
                    primary: "#9bb5ff",
                    secondary: "#ff69b4",
                    background: "linear-gradient(135deg, #0a0a2a 0%, #000814 50%, #000000 100%)"
                }
            }
        };
    }
    
    /**
     * 应用主题
     */
    applyTheme(themeName) {
        const theme = this.themes[themeName];
        if (!theme) {
            console.warn('[ThemeManager] 主题不存在:', themeName);
            return;
        }
        
        this.currentTheme = themeName;
        
        // 更新页面标题
        document.title = theme.title;
        
        // 更新密码界面文案
        this.updatePasswordScreen(theme.passwordScreen);
        
        // 更新控制按钮文案
        this.updateControlButtons(theme.controlButtons);
        
        // 应用颜色主题
        this.applyColors(theme.colors);
        
        // 更新功能开关
        this.updateFeatures(theme.features);
        
        console.log('[ThemeManager] 应用主题:', themeName);
    }
    
    /**
     * 更新密码界面
     */
    updatePasswordScreen(passwordConfig) {
        if (!passwordConfig) return;
        
        const elements = {
            title: document.getElementById('password-title'),
            subtitle: document.getElementById('password-subtitle'),
            monthLabel: document.getElementById('month-label'),
            nicknameLabel: document.getElementById('nickname-label'),
            wordLabel: document.getElementById('word-label'),
            enterBtn: document.getElementById('enter-btn')
        };
        
        Object.entries(elements).forEach(([key, element]) => {
            if (element && passwordConfig[key]) {
                if (key === 'enterBtn') {
                    element.textContent = passwordConfig[key];
                } else {
                    element.textContent = passwordConfig[key];
                }
            }
        });
    }
    
    /**
     * 更新控制按钮
     */
    updateControlButtons(buttonsConfig) {
        if (!buttonsConfig) return;
        
        Object.entries(buttonsConfig).forEach(([btnId, config]) => {
            const button = document.getElementById(`btn-${btnId}`);
            if (button && config) {
                const iconSpan = button.querySelector('span:first-child');
                const textSpan = button.querySelector('span:last-child');
                
                if (iconSpan && config.icon) iconSpan.textContent = config.icon;
                if (textSpan && config.text) textSpan.textContent = config.text;
            }
        });
    }
    
    /**
     * 应用颜色主题
     */
    applyColors(colors) {
        if (!colors) return;
        
        // 更新背景渐变
        if (colors.background) {
            document.body.style.background = colors.background;
        }
        
        // 更新主色调CSS变量
        if (colors.primary) {
            document.documentElement.style.setProperty('--primary-color', colors.primary);
        }
        
        if (colors.secondary) {
            document.documentElement.style.setProperty('--secondary-color', colors.secondary);
        }
        
        if (colors.panelBg) {
            document.documentElement.style.setProperty('--panel-bg', colors.panelBg);
        }
    }
    
    /**
     * 更新功能开关
     */
    updateFeatures(features) {
        if (!features) return;
        
        // 显示/隐藏心跳按钮
        const heartbeatBtn = document.getElementById('btn-heartbeat');
        if (heartbeatBtn) {
            heartbeatBtn.style.display = features.heartbeat ? 'flex' : 'none';
        }
    }
    
    /**
     * 切换主题
     */
    switchTheme(themeName) {
        if (!this.themes[themeName]) {
            console.warn('[ThemeManager] 主题不存在:', themeName);
            return false;
        }
        
        this.applyTheme(themeName);
        
        // 触发主题切换事件
        window.dispatchEvent(new CustomEvent('themeChanged', {
            detail: { theme: themeName, config: this.themes[themeName] }
        }));
        
        return true;
    }
    
    /**
     * 获取可用主题列表
     */
    getAvailableThemes() {
        return Object.keys(this.themes);
    }
    
    /**
     * 获取当前主题配置
     */
    getCurrentTheme() {
        return {
            name: this.currentTheme,
            config: this.themes[this.currentTheme]
        };
    }
    
    /**
     * 获取主题配置
     */
    getTheme(themeName) {
        return this.themes[themeName];
    }
}

export default ThemeManager;

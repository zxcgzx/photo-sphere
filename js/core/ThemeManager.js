/**
 * 主题管理器
 * 负责加载和应用主题配置，驱动CSS变量实现真正的主题切换
 */

import { CONFIG } from '../config.js';

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
     * 应用主题
     */
    applyTheme(themeName) {
        const theme = this.themes[themeName];
        if (!theme) {
            console.warn(`[ThemeManager] 主题不存在: ${themeName}`);
            return;
        }
        
        this.currentTheme = themeName;
        
        // 更新页面标题
        document.title = theme.title;
        const pageTitleEl = document.getElementById('page-title');
        if (pageTitleEl) {
            pageTitleEl.textContent = theme.title;
        }
        
        // 更新CSS变量（真正的主题切换）
        this.applyThemeColors(theme.colors);
        
        // 更新按钮文案和图标
        this.updateControlButtons(theme.controlButtons);
        
        // 更新密码屏幕文案
        this.updatePasswordScreen(theme.passwordScreen);
        
        // 触发主题切换事件
        this.dispatchThemeChangeEvent(themeName, theme);
        
        console.log('[ThemeManager] 应用主题:', themeName);
    }
    
    /**
     * 应用主题颜色到CSS变量
     */
    applyThemeColors(colors) {
        if (!colors) return;
        
        const root = document.documentElement;
        
        // 主要颜色
        if (colors.primary) {
            root.style.setProperty('--primary-color', colors.primary);
        }
        
        if (colors.secondary) {
            root.style.setProperty('--secondary-color', colors.secondary);
        }
        
        // 背景渐变
        if (colors.background) {
            // 应用到body背景
            document.body.style.background = colors.background;
            document.body.style.backgroundSize = '400% 400%';
            document.body.style.animation = 'gradientShift 15s ease infinite';
        }
        
        // 面板背景
        if (colors.panelBg) {
            root.style.setProperty('--panel-bg', colors.panelBg);
        }
        
        // 文本颜色（可选）
        if (colors.text) {
            root.style.setProperty('--text-color', colors.text);
        }
        
        if (colors.textSecondary) {
            root.style.setProperty('--text-secondary', colors.textSecondary);
        }
        
        // 边框颜色（可选）
        if (colors.border) {
            root.style.setProperty('--border-color', colors.border);
        }
        
        // 阴影颜色（可选）
        if (colors.shadow) {
            root.style.setProperty('--shadow-color', colors.shadow);
        }
        
        // 发光颜色（可选）
        if (colors.glow) {
            root.style.setProperty('--glow-color', colors.glow);
        }
    }
    
    /**
     * 更新控制按钮
     */
    updateControlButtons(buttons) {
        if (!buttons) return;
        
        Object.entries(buttons).forEach(([key, btnConfig]) => {
            const btnEl = document.getElementById(`btn-${key}`);
            if (btnEl && btnConfig) {
                // 更新图标
                const iconEl = btnEl.querySelector('.btn-icon');
                if (iconEl && btnConfig.icon) {
                    iconEl.textContent = btnConfig.icon;
                }
                
                // 更新文本
                const textEl = btnEl.querySelector('.btn-text');
                if (textEl && btnConfig.text) {
                    textEl.textContent = btnConfig.text;
                }
            }
            
            // 更新折叠菜单中的按钮
            const collapseBtnEl = document.getElementById(`btn-${key}-collapse`);
            if (collapseBtnEl && btnConfig) {
                collapseBtnEl.innerHTML = `${btnConfig.icon} ${btnConfig.text}`;
            }
        });
    }
    
    /**
     * 更新密码屏幕文案
     */
    updatePasswordScreen(passwordScreen) {
        if (!passwordScreen) return;
        
        // 更新标题
        const titleEl = document.getElementById('auth-title');
        if (titleEl && passwordScreen.title) {
            titleEl.textContent = passwordScreen.title;
        }
        
        // 更新副标题
        const subtitleEl = document.getElementById('auth-subtitle');
        if (subtitleEl && passwordScreen.subtitle) {
            subtitleEl.textContent = passwordScreen.subtitle;
        }
        
        // 更新标签
        const monthLabelEl = document.querySelector('label[for="month"]');
        if (monthLabelEl && passwordScreen.monthLabel) {
            monthLabelEl.textContent = passwordScreen.monthLabel;
        }
        
        const nicknameLabelEl = document.querySelector('label[for="nickname"]');
        if (nicknameLabelEl && passwordScreen.nicknameLabel) {
            nicknameLabelEl.textContent = passwordScreen.nicknameLabel;
        }
        
        const wordLabelEl = document.querySelector('label[for="word"]');
        if (wordLabelEl && passwordScreen.wordLabel) {
            wordLabelEl.textContent = passwordScreen.wordLabel;
        }
        
        // 更新按钮
        const enterBtnEl = document.getElementById('enter-btn');
        if (enterBtnEl && passwordScreen.enterButton) {
            enterBtnEl.textContent = passwordScreen.enterButton;
        }
        
        // 更新错误消息
        this.config.passwordErrorMessage = passwordScreen.errorMessage || this.config.passwordErrorMessage;
    }
    
    /**
     * 切换主题
     */
    switchTheme(themeName) {
        if (!this.themes[themeName]) {
            console.warn(`[ThemeManager] 主题不存在: ${themeName}`);
            return false;
        }
        
        this.applyTheme(themeName);
        return true;
    }
    
    /**
     * 获取所有可用主题
     */
    getAvailableThemes() {
        return Object.keys(this.themes);
    }
    
    /**
     * 获取当前主题
     */
    getCurrentTheme() {
        return this.currentTheme;
    }
    
    /**
     * 获取当前主题配置
     */
    getCurrentThemeConfig() {
        return this.themes[this.currentTheme];
    }
    
    /**
     * 获取内置默认主题（回退方案）
     */
    getBuiltInThemes() {
        return {
            default: {
                title: "我们的小宇宙 - 3D照片星球",
                passwordScreen: {
                    title: "我们的小宇宙",
                    subtitle: "请输入密码，进入我们的专属空间",
                    monthLabel: "第一次见面的月份",
                    nicknameLabel: "昵称",
                    wordLabel: "选择心动词",
                    enterButton: "进入宇宙",
                    errorMessage: "答案不对哦，再想想~"
                },
                controlButtons: {
                    rotate: { icon: "🔄", text: "自动旋转" },
                    stats: { icon: "📊", text: "统计" },
                    random: { icon: "🎲", text: "随机看看" },
                    mood: { icon: "🎨", text: "换个心情" },
                    light: { icon: "💡", text: "切换光效" },
                    surprise: { icon: "🎉", text: "小惊喜" },
                    upload: { icon: "📸", text: "上传照片" }
                },
                colors: {
                    primary: "#9bb5ff",
                    secondary: "#ff69b4",
                    background: "linear-gradient(135deg, #0a0a2a 0%, #000814 50%, #000000 100%)",
                    panelBg: "rgba(10, 10, 42, 0.9)"
                },
                features: {
                    heartbeat: false
                }
            }
        };
    }
    
    /**
     * 触发主题切换事件
     */
    dispatchThemeChangeEvent(themeName, themeConfig) {
        const event = new CustomEvent('themechange', {
            detail: {
                themeName,
                themeConfig
            }
        });
        document.dispatchEvent(event);
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
            animation: slideIn 0.3s ease-out;
            max-width: 300px;
        `;
        toast.innerHTML = `
            ⚠️ 主题加载失败<br>
            <small>${errorMessage}</small><br>
            <small>已使用默认主题</small>
        `;
        
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.style.animation = 'slideIn 0.3s ease-out reverse';
            setTimeout(() => toast.remove(), 300);
        }, 5000);
    }
}

export default ThemeManager;
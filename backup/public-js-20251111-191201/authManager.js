/**
 * 身份认证管理器
 * 处理前端登录状态、令牌管理和权限检查
 */

import { CONFIG } from './config.js';

class AuthManager {
    constructor(config) {
        this.config = config || CONFIG;
        
        // 状态管理
        this.isAuthenticated = false;
        this.user = null;
        this.tokens = null;
        
        // 存储键名
        this.storageKeys = {
            accessToken: 'photo_sphere_access_token',
            refreshToken: 'photo_sphere_refresh_token',
            user: 'photo_sphere_user',
            sessionId: 'photo_sphere_session_id'
        };
        
        // 事件监听器
        this.listeners = {
            login: [],
            logout: [],
            tokenRefresh: [],
            authError: []
        };
        
        // 令牌刷新定时器
        this.refreshTimer = null;
        
        // 绑定方法
        this.checkAuthStatus = this.checkAuthStatus.bind(this);
        this.refreshToken = this.refreshToken.bind(this);
        
        // 初始化
        this.initialize();
    }
    
    /**
     * 初始化认证管理器
     */
    async initialize() {
        this.config.log('初始化身份认证管理器...');
        
        // 从本地存储恢复状态
        this.restoreAuthState();
        
        // 检查认证状态
        if (this.tokens?.accessToken) {
            await this.validateSession();
        }
        
        // 设置令牌自动刷新
        this.setupTokenRefresh();
        
        this.config.log('身份认证管理器初始化完成');
    }
    
    /**
     * 验证安全问题登录
     */
    async verifySecurityQuestions(answers) {
        try {
            this.config.log('验证安全问题...');
            
            const response = await fetch('/api/auth/verify-security', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(answers)
            });
            
            const result = await response.json();
            
            if (result.success) {
                // 保存认证信息
                await this.handleLoginSuccess(result.data);
                return { success: true, data: result.data };
            } else {
                this.config.warn('安全问题验证失败:', result.message);
                return { success: false, message: result.message, code: result.code };
            }
            
        } catch (error) {
            this.config.error('验证安全问题出错:', error);
            return { success: false, message: '网络错误，请重试' };
        }
    }
    
    /**
     * 处理登录成功
     */
    async handleLoginSuccess(authData) {
        try {
            // 保存令牌信息
            this.tokens = {
                accessToken: authData.accessToken,
                refreshToken: authData.refreshToken,
                tokenType: authData.tokenType,
                expiresIn: authData.expiresIn
            };
            
            // 保存用户信息
            this.user = authData.user;
            this.isAuthenticated = true;
            
            // 保存到本地存储
            this.saveAuthState();
            
            // 设置令牌刷新
            this.setupTokenRefresh();
            
            // 触发登录事件
            this.emit('login', { user: this.user, tokens: this.tokens });
            
            this.config.log('登录成功:', this.user.displayName);
            
        } catch (error) {
            this.config.error('处理登录成功状态失败:', error);
            throw error;
        }
    }
    
    /**
     * 登出
     */
    async logout() {
        try {
            // 如果有有效令牌，通知服务器
            if (this.tokens?.accessToken) {
                try {
                    await fetch('/api/auth/logout', {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${this.tokens.accessToken}`,
                            'Content-Type': 'application/json'
                        }
                    });
                } catch (error) {
                    // 忽略服务器错误，继续本地登出
                    this.config.warn('服务器登出请求失败:', error);
                }
            }
            
            // 清理本地状态
            this.clearAuthState();
            
            // 触发登出事件
            this.emit('logout');
            
            this.config.log('已登出');
            
        } catch (error) {
            this.config.error('登出失败:', error);
            // 即使出错也要清理本地状态
            this.clearAuthState();
        }
    }
    
    /**
     * 刷新访问令牌
     */
    async refreshToken() {
        try {
            if (!this.tokens?.refreshToken) {
                throw new Error('没有可用的刷新令牌');
            }
            
            const response = await fetch('/api/auth/refresh', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    refreshToken: this.tokens.refreshToken
                })
            });
            
            const result = await response.json();
            
            if (result.success) {
                // 更新令牌
                this.tokens = {
                    ...this.tokens,
                    accessToken: result.data.accessToken,
                    expiresIn: result.data.expiresIn
                };
                
                // 如果有新的刷新令牌，也更新
                if (result.data.refreshToken) {
                    this.tokens.refreshToken = result.data.refreshToken;
                }
                
                // 保存到本地存储
                this.saveAuthState();
                
                // 重新设置刷新定时器
                this.setupTokenRefresh();
                
                // 触发刷新事件
                this.emit('tokenRefresh', this.tokens);
                
                this.config.log('令牌刷新成功');
                return true;
                
            } else {
                throw new Error(result.message || '令牌刷新失败');
            }
            
        } catch (error) {
            this.config.error('令牌刷新失败:', error);
            
            // 刷新失败，可能需要重新登录
            this.emit('authError', { type: 'refresh_failed', error });
            
            // 清理认证状态
            this.clearAuthState();
            
            return false;
        }
    }
    
    /**
     * 验证当前会话
     */
    async validateSession() {
        try {
            if (!this.tokens?.accessToken) {
                return false;
            }
            
            const response = await fetch('/api/auth/session', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${this.tokens.accessToken}`,
                    'Content-Type': 'application/json'
                }
            });
            
            if (response.ok) {
                const result = await response.json();
                if (result.success) {
                    this.user = result.data.user;
                    this.isAuthenticated = true;
                    return true;
                }
            }
            
            // 会话无效，尝试刷新令牌
            if (this.tokens.refreshToken) {
                return await this.refreshToken();
            }
            
            return false;
            
        } catch (error) {
            this.config.error('会话验证失败:', error);
            return false;
        }
    }
    
    /**
     * 获取用户资料
     */
    async getUserProfile() {
        try {
            if (!this.isAuthenticated) {
                throw new Error('用户未登录');
            }
            
            const response = await fetch('/api/auth/profile', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${this.tokens.accessToken}`,
                    'Content-Type': 'application/json'
                }
            });
            
            const result = await response.json();
            
            if (result.success) {
                return result.data;
            } else {
                throw new Error(result.message || '获取用户资料失败');
            }
            
        } catch (error) {
            this.config.error('获取用户资料失败:', error);
            throw error;
        }
    }
    
    /**
     * 检查用户权限
     */
    async checkPermission(permission) {
        try {
            if (!this.isAuthenticated) {
                return false;
            }
            
            const response = await fetch('/api/auth/permissions', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${this.tokens.accessToken}`,
                    'Content-Type': 'application/json'
                }
            });
            
            const result = await response.json();
            
            if (result.success) {
                return result.data.permissions.includes(permission);
            }
            
            return false;
            
        } catch (error) {
            this.config.error('权限检查失败:', error);
            return false;
        }
    }
    
    /**
     * 获取认证头部
     */
    getAuthHeaders() {
        if (!this.tokens?.accessToken) {
            return {};
        }
        
        return {
            'Authorization': `Bearer ${this.tokens.accessToken}`
        };
    }
    
    /**
     * 创建认证的fetch请求
     */
    async authenticatedFetch(url, options = {}) {
        const authHeaders = this.getAuthHeaders();
        
        const response = await fetch(url, {
            ...options,
            headers: {
                ...authHeaders,
                ...options.headers
            }
        });
        
        // 如果返回401，尝试刷新令牌后重试
        if (response.status === 401 && this.tokens?.refreshToken) {
            const refreshSuccess = await this.refreshToken();
            
            if (refreshSuccess) {
                // 重新发送请求
                const newAuthHeaders = this.getAuthHeaders();
                return fetch(url, {
                    ...options,
                    headers: {
                        ...newAuthHeaders,
                        ...options.headers
                    }
                });
            }
        }
        
        return response;
    }
    
    /**
     * 设置令牌自动刷新
     */
    setupTokenRefresh() {
        // 清除现有定时器
        if (this.refreshTimer) {
            clearTimeout(this.refreshTimer);
        }
        
        if (!this.tokens?.accessToken || !this.tokens?.expiresIn) {
            return;
        }
        
        // 解析过期时间
        let expiresInMs;
        const expiresIn = this.tokens.expiresIn;
        
        if (typeof expiresIn === 'string') {
            if (expiresIn.endsWith('d')) {
                expiresInMs = parseInt(expiresIn) * 24 * 60 * 60 * 1000;
            } else if (expiresIn.endsWith('h')) {
                expiresInMs = parseInt(expiresIn) * 60 * 60 * 1000;
            } else if (expiresIn.endsWith('m')) {
                expiresInMs = parseInt(expiresIn) * 60 * 1000;
            } else {
                expiresInMs = parseInt(expiresIn) * 1000;
            }
        } else {
            expiresInMs = expiresIn * 1000;
        }
        
        // 在过期前5分钟刷新令牌
        const refreshTime = Math.max(expiresInMs - 5 * 60 * 1000, 60 * 1000);
        
        this.refreshTimer = setTimeout(async () => {
            await this.refreshToken();
        }, refreshTime);
        
        this.config.log(`令牌将在 ${Math.round(refreshTime / 1000 / 60)} 分钟后自动刷新`);
    }
    
    /**
     * 保存认证状态到本地存储
     */
    saveAuthState() {
        try {
            if (this.tokens?.accessToken) {
                localStorage.setItem(this.storageKeys.accessToken, this.tokens.accessToken);
            }
            
            if (this.tokens?.refreshToken) {
                localStorage.setItem(this.storageKeys.refreshToken, this.tokens.refreshToken);
            }
            
            if (this.user) {
                localStorage.setItem(this.storageKeys.user, JSON.stringify(this.user));
            }
            
        } catch (error) {
            this.config.warn('保存认证状态失败:', error);
        }
    }
    
    /**
     * 从本地存储恢复认证状态
     */
    restoreAuthState() {
        try {
            const accessToken = localStorage.getItem(this.storageKeys.accessToken);
            const refreshToken = localStorage.getItem(this.storageKeys.refreshToken);
            const userJson = localStorage.getItem(this.storageKeys.user);
            
            if (accessToken && refreshToken) {
                this.tokens = {
                    accessToken,
                    refreshToken,
                    tokenType: 'Bearer'
                };
            }
            
            if (userJson) {
                this.user = JSON.parse(userJson);
            }
            
            this.isAuthenticated = !!(this.tokens && this.user);
            
        } catch (error) {
            this.config.warn('恢复认证状态失败:', error);
            this.clearAuthState();
        }
    }
    
    /**
     * 清理认证状态
     */
    clearAuthState() {
        // 清理内存状态
        this.isAuthenticated = false;
        this.user = null;
        this.tokens = null;
        
        // 清理定时器
        if (this.refreshTimer) {
            clearTimeout(this.refreshTimer);
            this.refreshTimer = null;
        }
        
        // 清理本地存储
        Object.values(this.storageKeys).forEach(key => {
            localStorage.removeItem(key);
        });
    }
    
    /**
     * 事件监听
     */
    on(event, listener) {
        if (this.listeners[event]) {
            this.listeners[event].push(listener);
        }
    }
    
    /**
     * 移除事件监听
     */
    off(event, listener) {
        if (this.listeners[event]) {
            const index = this.listeners[event].indexOf(listener);
            if (index > -1) {
                this.listeners[event].splice(index, 1);
            }
        }
    }
    
    /**
     * 触发事件
     */
    emit(event, data) {
        if (this.listeners[event]) {
            this.listeners[event].forEach(listener => {
                try {
                    listener(data);
                } catch (error) {
                    this.config.error('事件监听器执行失败:', error);
                }
            });
        }
    }
    
    /**
     * 获取认证状态
     */
    getAuthStatus() {
        return {
            isAuthenticated: this.isAuthenticated,
            user: this.user,
            hasTokens: !!(this.tokens?.accessToken)
        };
    }
    
    /**
     * 销毁认证管理器
     */
    dispose() {
        this.clearAuthState();
        
        // 清理事件监听器
        Object.keys(this.listeners).forEach(event => {
            this.listeners[event] = [];
        });
        
        this.config.log('身份认证管理器已销毁');
    }
}

// 导出认证管理器
window.AuthManager = AuthManager;
export default AuthManager;
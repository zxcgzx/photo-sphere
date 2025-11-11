/**
 * 身份认证路由
 * 处理登录、注册、令牌刷新等认证相关操作
 */

const express = require('express');
const AuthMiddleware = require('../middleware/auth');

class AuthRoutes {
    constructor(database) {
        this.router = express.Router();
        this.db = database;
        this.authMiddleware = new AuthMiddleware();
        
        // 设置路由
        this.setupRoutes();
    }
    
    setupRoutes() {
        // 安全问题验证（相当于登录）
        this.router.post('/verify-security', 
            this.authMiddleware.createLoginRateLimit(),
            this.verifySecurityQuestions.bind(this)
        );
        
        // 令牌刷新
        this.router.post('/refresh', 
            this.authMiddleware.refreshAccessToken.bind(this.authMiddleware)
        );
        
        // 会话验证
        this.router.get('/session',
            this.authMiddleware.verifyToken,
            this.getSession.bind(this)
        );
        
        // 登出
        this.router.post('/logout',
            this.authMiddleware.verifyToken,
            this.logout.bind(this)
        );
        
        // 获取用户信息
        this.router.get('/profile',
            this.authMiddleware.verifyToken,
            this.getProfile.bind(this)
        );
        
        // 权限检查（测试端点）
        this.router.get('/permissions',
            this.authMiddleware.verifyToken,
            this.getPermissions.bind(this)
        );
        
        // 管理员创建用户（预留功能）
        this.router.post('/create-user',
            this.authMiddleware.verifyToken,
            this.authMiddleware.requirePermission('manage'),
            this.createUser.bind(this)
        );
    }
    
    /**
     * 验证安全问题
     */
    async verifySecurityQuestions(req, res) {
        try {
            const { month, nickname, word } = req.body;
            
            // 参数验证
            if (!month || !nickname || !word) {
                return res.status(400).json({
                    success: false,
                    message: '请完整回答所有安全问题',
                    code: 'MISSING_ANSWERS'
                });
            }
            
            // 验证安全问题答案
            const verification = this.authMiddleware.verifySecurityQuestions({
                month: month.toString(),
                nickname: nickname.trim(),
                word: word.trim()
            });
            
            if (!verification.success) {
                // 记录失败尝试（可以添加到数据库）
                console.log(`登录失败尝试 - IP: ${req.ip}, 时间: ${new Date().toISOString()}`);
                
                return res.status(401).json({
                    success: false,
                    message: '答案不正确，请检查后重试',
                    code: 'INVALID_ANSWERS',
                    details: process.env.NODE_ENV === 'development' ? verification.details : undefined
                });
            }
            
            // 生成用户ID（在实际项目中应该从数据库获取）
            const userId = 'user_primary';
            const userType = 'uploader'; // 给予上传权限，可以查看和上传照片
            
            // 生成令牌对
            const tokens = this.authMiddleware.generateTokenPair(userId, userType);
            
            // 生成会话ID
            const sessionId = this.authMiddleware.generateSessionId();
            
            // 记录成功登录（可以添加到数据库）
            await this.recordLoginSuccess(userId, req.ip, sessionId);
            
            // 返回认证信息
            res.json({
                success: true,
                message: '验证成功，欢迎回到我们的小宇宙！',
                data: {
                    ...tokens,
                    sessionId,
                    user: {
                        id: userId,
                        type: userType,
                        displayName: '我们的小宇宙',
                        loginTime: new Date().toISOString()
                    }
                }
            });
            
        } catch (error) {
            console.error('安全问题验证错误:', error);
            res.status(500).json({
                success: false,
                message: '服务器内部错误',
                code: 'INTERNAL_ERROR'
            });
        }
    }
    
    /**
     * 获取当前会话信息
     */
    async getSession(req, res) {
        try {
            const user = req.user;
            
            res.json({
                success: true,
                data: {
                    user: {
                        id: user.userId,
                        type: user.userType,
                        displayName: '我们的小宇宙',
                        loginTime: new Date(user.timestamp).toISOString()
                    },
                    session: {
                        active: true,
                        expiresAt: new Date(user.exp * 1000).toISOString()
                    }
                }
            });
            
        } catch (error) {
            console.error('获取会话信息错误:', error);
            res.status(500).json({
                success: false,
                message: '服务器内部错误',
                code: 'INTERNAL_ERROR'
            });
        }
    }
    
    /**
     * 登出
     */
    async logout(req, res) {
        try {
            const userId = req.user.userId;
            
            // 记录登出（可以添加到数据库的登录日志表）
            await this.recordLogout(userId, req.ip);
            
            res.json({
                success: true,
                message: '已成功登出'
            });
            
        } catch (error) {
            console.error('登出错误:', error);
            res.status(500).json({
                success: false,
                message: '服务器内部错误',
                code: 'INTERNAL_ERROR'
            });
        }
    }
    
    /**
     * 获取用户资料
     */
    async getProfile(req, res) {
        try {
            const user = req.user;
            
            // 获取用户统计信息
            const stats = await this.getUserStats(user.userId);
            
            res.json({
                success: true,
                data: {
                    user: {
                        id: user.userId,
                        type: user.userType,
                        displayName: '我们的小宇宙',
                        permissions: this.getUserPermissions(user.userType)
                    },
                    stats
                }
            });
            
        } catch (error) {
            console.error('获取用户资料错误:', error);
            res.status(500).json({
                success: false,
                message: '服务器内部错误',
                code: 'INTERNAL_ERROR'
            });
        }
    }
    
    /**
     * 获取用户权限
     */
    async getPermissions(req, res) {
        try {
            const user = req.user;
            const permissions = this.getUserPermissions(user.userType);
            
            res.json({
                success: true,
                data: {
                    userType: user.userType,
                    permissions
                }
            });
            
        } catch (error) {
            console.error('获取权限错误:', error);
            res.status(500).json({
                success: false,
                message: '服务器内部错误',
                code: 'INTERNAL_ERROR'
            });
        }
    }
    
    /**
     * 创建用户（管理员功能）
     */
    async createUser(req, res) {
        try {
            const { userType, displayName, permissions } = req.body;
            
            // 验证输入
            if (!userType || !displayName) {
                return res.status(400).json({
                    success: false,
                    message: '用户类型和显示名称不能为空',
                    code: 'MISSING_FIELDS'
                });
            }
            
            // 生成新用户ID
            const newUserId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            
            // 创建用户记录（在实际项目中应该保存到数据库）
            const newUser = {
                id: newUserId,
                type: userType,
                displayName,
                permissions,
                createdAt: new Date().toISOString(),
                createdBy: req.user.userId
            };
            
            res.json({
                success: true,
                message: '用户创建成功',
                data: {
                    user: newUser
                }
            });
            
        } catch (error) {
            console.error('创建用户错误:', error);
            res.status(500).json({
                success: false,
                message: '服务器内部错误',
                code: 'INTERNAL_ERROR'
            });
        }
    }
    
    /**
     * 记录成功登录
     */
    async recordLoginSuccess(userId, ip, sessionId) {
        try {
            // 在实际项目中，这里应该保存到数据库
            const loginRecord = {
                userId,
                ip,
                sessionId,
                loginTime: new Date().toISOString(),
                userAgent: 'photo-sphere-app'
            };
            
            console.log('登录成功记录:', loginRecord);
            
            // 这里可以添加数据库操作
            // await this.db.query('INSERT INTO login_logs ...', loginRecord);
            
        } catch (error) {
            console.error('记录登录失败:', error);
        }
    }
    
    /**
     * 记录登出
     */
    async recordLogout(userId, ip) {
        try {
            const logoutRecord = {
                userId,
                ip,
                logoutTime: new Date().toISOString()
            };
            
            console.log('登出记录:', logoutRecord);
            
            // 这里可以添加数据库操作
            // await this.db.query('UPDATE login_logs SET logout_time = ? WHERE user_id = ? AND logout_time IS NULL', ...);
            
        } catch (error) {
            console.error('记录登出失败:', error);
        }
    }
    
    /**
     * 获取用户统计信息
     */
    async getUserStats(userId) {
        try {
            // 在实际项目中，这些数据应该从数据库获取
            return {
                totalPhotos: 53,
                uploadedPhotos: 0,
                lastLoginTime: new Date().toISOString(),
                totalLoginCount: 1,
                favoritesCount: 0
            };
            
        } catch (error) {
            console.error('获取用户统计失败:', error);
            return {};
        }
    }
    
    /**
     * 获取用户权限列表
     */
    getUserPermissions(userType) {
        const permissionMap = {
            'admin': ['view', 'upload', 'manage', 'delete'],
            'uploader': ['view', 'upload'],
            'user': ['view']
        };
        
        return permissionMap[userType] || [];
    }
}

module.exports = AuthRoutes;
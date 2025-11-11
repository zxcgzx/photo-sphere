/**
 * 身份认证中间件
 * 处理JWT令牌验证和用户身份管理
 */

const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const rateLimit = require('express-rate-limit');

class AuthMiddleware {
    constructor() {
        // JWT配置
        this.jwtSecret = process.env.JWT_SECRET || 'our-little-universe-secret-2024';
        this.jwtExpires = process.env.JWT_EXPIRES || '7d';
        this.refreshTokenExpires = process.env.REFRESH_TOKEN_EXPIRES || '30d';
        
        // 安全问题答案（实际项目中应该存储在数据库中）
        this.securityAnswers = {
            month: '1', // 一月
            nickname: '宝宝', // 昵称
            word: '宇宙' // "你是我的宇宙"
        };
        
        // 绑定方法
        this.verifyToken = this.verifyToken.bind(this);
        this.verifySecurityQuestions = this.verifySecurityQuestions.bind(this);
    }
    
    /**
     * 生成JWT令牌
     */
    generateToken(payload, expiresIn = this.jwtExpires) {
        return jwt.sign(payload, this.jwtSecret, { 
            expiresIn,
            issuer: 'photo-sphere-app',
            audience: 'photo-sphere-users'
        });
    }
    
    /**
     * 验证JWT令牌
     */
    verifyToken(req, res, next) {
        try {
            const authHeader = req.headers.authorization;
            const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN
            
            if (!token) {
                return res.status(401).json({
                    success: false,
                    message: '访问令牌缺失',
                    code: 'TOKEN_MISSING'
                });
            }
            
            jwt.verify(token, this.jwtSecret, (err, decoded) => {
                if (err) {
                    if (err.name === 'TokenExpiredError') {
                        return res.status(401).json({
                            success: false,
                            message: '访问令牌已过期',
                            code: 'TOKEN_EXPIRED'
                        });
                    } else if (err.name === 'JsonWebTokenError') {
                        return res.status(401).json({
                            success: false,
                            message: '无效的访问令牌',
                            code: 'TOKEN_INVALID'
                        });
                    } else {
                        return res.status(500).json({
                            success: false,
                            message: '令牌验证失败',
                            code: 'TOKEN_VERIFICATION_FAILED'
                        });
                    }
                }
                
                // 将用户信息添加到请求对象
                req.user = decoded;
                next();
            });
            
        } catch (error) {
            console.error('令牌验证错误:', error);
            res.status(500).json({
                success: false,
                message: '服务器内部错误',
                code: 'INTERNAL_ERROR'
            });
        }
    }
    
    /**
     * 可选的令牌验证（不强制要求登录）
     */
    optionalToken(req, res, next) {
        const authHeader = req.headers.authorization;
        const token = authHeader && authHeader.split(' ')[1];
        
        if (token) {
            try {
                const decoded = jwt.verify(token, this.jwtSecret);
                req.user = decoded;
            } catch (err) {
                // 忽略错误，继续执行
                req.user = null;
            }
        } else {
            req.user = null;
        }
        
        next();
    }
    
    /**
     * 验证安全问题
     */
    verifySecurityQuestions(answers) {
        try {
            const { month, nickname, word } = answers;
            
            // 添加调试日志
            console.log('验证安全问题:', {
                received: { month, nickname, word },
                expected: this.securityAnswers
            });
            
            // 验证每个安全问题的答案
            const monthValid = month && month.toString() === this.securityAnswers.month;
            const nicknameValid = nickname && nickname.trim().toLowerCase() === this.securityAnswers.nickname.toLowerCase();
            const wordValid = word && word.trim() === this.securityAnswers.word;
            
            console.log('验证结果:', {
                month: monthValid,
                nickname: nicknameValid,
                word: wordValid
            });
            
            return {
                success: monthValid && nicknameValid && wordValid,
                details: {
                    month: monthValid,
                    nickname: nicknameValid,
                    word: wordValid
                }
            };
            
        } catch (error) {
            console.error('安全问题验证错误:', error);
            return {
                success: false,
                error: '验证过程发生错误'
            };
        }
    }
    
    /**
     * 生成访问令牌和刷新令牌
     */
    generateTokenPair(userId, userType = 'user') {
        const payload = {
            userId,
            userType,
            timestamp: Date.now()
        };
        
        const accessToken = this.generateToken(payload, this.jwtExpires);
        const refreshToken = this.generateToken(
            { ...payload, type: 'refresh' }, 
            this.refreshTokenExpires
        );
        
        return {
            accessToken,
            refreshToken,
            expiresIn: this.jwtExpires,
            tokenType: 'Bearer'
        };
    }
    
    /**
     * 刷新访问令牌
     */
    refreshAccessToken(req, res, next) {
        try {
            const { refreshToken } = req.body;
            
            if (!refreshToken) {
                return res.status(400).json({
                    success: false,
                    message: '刷新令牌缺失',
                    code: 'REFRESH_TOKEN_MISSING'
                });
            }
            
            jwt.verify(refreshToken, this.jwtSecret, (err, decoded) => {
                if (err) {
                    return res.status(401).json({
                        success: false,
                        message: '无效的刷新令牌',
                        code: 'REFRESH_TOKEN_INVALID'
                    });
                }
                
                if (decoded.type !== 'refresh') {
                    return res.status(401).json({
                        success: false,
                        message: '令牌类型错误',
                        code: 'TOKEN_TYPE_MISMATCH'
                    });
                }
                
                // 生成新的访问令牌
                const newTokenPair = this.generateTokenPair(decoded.userId, decoded.userType);
                
                res.json({
                    success: true,
                    message: '令牌刷新成功',
                    data: newTokenPair
                });
            });
            
        } catch (error) {
            console.error('令牌刷新错误:', error);
            res.status(500).json({
                success: false,
                message: '服务器内部错误',
                code: 'INTERNAL_ERROR'
            });
        }
    }
    
    /**
     * 权限检查中间件
     */
    requirePermission(permission) {
        return (req, res, next) => {
            if (!req.user) {
                return res.status(401).json({
                    success: false,
                    message: '需要登录',
                    code: 'LOGIN_REQUIRED'
                });
            }
            
            // 检查用户权限
            if (!this.hasPermission(req.user, permission)) {
                return res.status(403).json({
                    success: false,
                    message: '权限不足',
                    code: 'INSUFFICIENT_PERMISSION',
                    required: permission
                });
            }
            
            next();
        };
    }
    
    /**
     * 检查用户是否拥有指定权限
     */
    hasPermission(user, permission) {
        // 管理员拥有所有权限
        if (user.userType === 'admin') {
            return true;
        }
        
        // 定义权限级别
        const permissions = {
            'view': ['user', 'uploader', 'admin'],
            'upload': ['uploader', 'admin'],
            'manage': ['admin'],
            'delete': ['admin']
        };
        
        const allowedRoles = permissions[permission];
        return allowedRoles && allowedRoles.includes(user.userType);
    }
    
    /**
     * 登录速率限制
     */
    createLoginRateLimit() {
        return rateLimit({
            windowMs: 15 * 60 * 1000, // 15分钟
            max: 5, // 最多5次尝试
            message: {
                success: false,
                message: '登录尝试过于频繁，请15分钟后再试',
                code: 'RATE_LIMIT_EXCEEDED'
            },
            standardHeaders: true,
            legacyHeaders: false,
            keyGenerator: (req) => {
                // 使用IP地址作为限制键
                return req.ip || req.connection.remoteAddress;
            }
        });
    }
    
    /**
     * API访问速率限制
     */
    createApiRateLimit() {
        return rateLimit({
            windowMs: 1 * 60 * 1000, // 1分钟
            max: 100, // 最多100次请求
            message: {
                success: false,
                message: 'API访问过于频繁，请稍后再试',
                code: 'API_RATE_LIMIT_EXCEEDED'
            },
            standardHeaders: true,
            legacyHeaders: false
        });
    }
    
    /**
     * 上传速率限制
     */
    createUploadRateLimit() {
        return rateLimit({
            windowMs: 5 * 60 * 1000, // 5分钟
            max: 20, // 最多20次上传
            message: {
                success: false,
                message: '上传过于频繁，请5分钟后再试',
                code: 'UPLOAD_RATE_LIMIT_EXCEEDED'
            },
            standardHeaders: true,
            legacyHeaders: false
        });
    }
    
    /**
     * 密码哈希
     */
    async hashPassword(password) {
        const saltRounds = 12;
        return await bcrypt.hash(password, saltRounds);
    }
    
    /**
     * 密码验证
     */
    async verifyPassword(password, hashedPassword) {
        return await bcrypt.compare(password, hashedPassword);
    }
    
    /**
     * 生成会话ID
     */
    generateSessionId() {
        return jwt.sign(
            { 
                sessionId: Date.now() + Math.random().toString(36).substr(2, 9),
                timestamp: Date.now()
            }, 
            this.jwtSecret,
            { expiresIn: '24h' }
        );
    }
    
    /**
     * 验证会话
     */
    verifySession(sessionId) {
        try {
            return jwt.verify(sessionId, this.jwtSecret);
        } catch (error) {
            return null;
        }
    }
    
    /**
     * 安全头部中间件
     */
    securityHeaders(req, res, next) {
        // 防止XSS攻击
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.setHeader('X-Frame-Options', 'DENY');
        res.setHeader('X-XSS-Protection', '1; mode=block');
        
        // 严格传输安全
        if (req.secure) {
            res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
        }
        
        // 内容安全策略
        res.setHeader('Content-Security-Policy', 
            "default-src 'self'; " +
            "script-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com; " +
            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
            "font-src 'self' https://fonts.gstatic.com; " +
            "img-src 'self' data: blob:; " +
            "connect-src 'self';"
        );
        
        next();
    }
    
    /**
     * CORS配置
     */
    corsOptions = {
        origin: (origin, callback) => {
            // 允许的域名列表
            const allowedOrigins = [
                'http://localhost:3000',
                'http://localhost:8080',
                'http://127.0.0.1:3000',
                'http://127.0.0.1:8080'
            ];
            
            // 开发环境允许无origin的请求（如移动应用）
            if (!origin || allowedOrigins.includes(origin)) {
                callback(null, true);
            } else {
                callback(new Error('不允许的CORS源'));
            }
        },
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
        credentials: true,
        maxAge: 86400 // 24小时
    };
}

module.exports = AuthMiddleware;
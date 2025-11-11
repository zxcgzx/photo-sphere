const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const path = require('path');
require('dotenv').config();

// 移除SQLite数据库初始化，因为我们使用JSON数据库
// const { initDatabase } = require('./database/init');
const photoRoutes = require('./routes/photos');
const AuthRoutes = require('./routes/auth');
const uploadRoutes = require('./routes/upload');
const AuthMiddleware = require('./middleware/auth');

const app = express();
const PORT = process.env.PORT || 3000;

// 初始化认证中间件
const authMiddleware = new AuthMiddleware();

// 安全中间件
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com"],
      imgSrc: ["'self'", "data:", "blob:"],
      connectSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
}));

// 压缩响应
app.use(compression());

// 安全头部
app.use(authMiddleware.securityHeaders);

// 跨域配置
app.use(cors(authMiddleware.corsOptions));

// API 访问频率限制
app.use('/api/', authMiddleware.createApiRateLimit());

// 解析JSON和表单数据
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 静态文件服务
app.use(express.static(path.join(__dirname, '../public')));
app.use('/photos', express.static(path.join(__dirname, '../photos')));
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// 初始化路由
const authRoutes = new AuthRoutes(null); // 暂时传入null，因为数据库会在路由中初始化

// API路由
app.use('/api/auth', authRoutes.router);
app.use('/api/photos', photoRoutes);
app.use('/api/upload', uploadRoutes);

// 健康检查端点
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: process.env.npm_package_version || '2.0.0'
  });
});

// 服务主页面
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../index-new.html'));
});

// 404处理
app.use((req, res) => {
  res.status(404).json({
    error: '页面未找到',
    message: '请检查URL是否正确'
  });
});

// 全局错误处理
app.use((err, req, res, next) => {
  console.error('服务器错误:', err);
  
  // 不暴露敏感信息到生产环境
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  res.status(err.status || 500).json({
    error: '服务器内部错误',
    message: isDevelopment ? err.message : '请稍后重试',
    ...(isDevelopment && { stack: err.stack })
  });
});

// 初始化数据库并启动服务器
async function startServer() {
  try {
    console.log('🌌 正在启动"我们的小宇宙"服务器...');
    
    // 初始化数据库（使用JSON数据库，跳过SQLite初始化）
    // await initDatabase(); // 注释掉，因为我们使用JSON数据库
    console.log('✅ JSON数据库已就绪');
    
    // 启动HTTP服务器
    app.listen(PORT, () => {
      console.log(`🚀 服务器运行在 http://localhost:${PORT}`);
      console.log(`📊 API接口: http://localhost:${PORT}/api`);
      console.log(`💖 我们的小宇宙正在等待你们的到来...`);
    });
    
  } catch (error) {
    console.error('❌ 服务器启动失败:', error);
    process.exit(1);
  }
}

// 优雅关闭处理
process.on('SIGTERM', () => {
  console.log('🛑 收到终止信号，正在优雅关闭服务器...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('🛑 收到中断信号，正在关闭服务器...');
  process.exit(0);
});

// 未捕获的异常处理
process.on('uncaughtException', (err) => {
  console.error('💥 未捕获的异常:', err);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 未处理的Promise拒绝:', reason);
  process.exit(1);
});

startServer();

module.exports = app;
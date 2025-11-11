/**
 * 错误管理器
 * 统一处理所有错误和异常
 * @version 4.1.0
 */

export class ErrorManager {
    constructor() {
        this.errorLog = [];
        this.maxLogSize = 1000; // 最多保留1000条错误记录
        this.criticalErrors = 0;
        this.warningCount = 0;
        
        // 监听全局错误
        this.setupGlobalErrorHandlers();
        
        console.log('[ErrorManager] 错误管理器初始化完成');
    }
    
    /**
     * 设置全局错误处理器
     */
    setupGlobalErrorHandlers() {
        // 监听JavaScript错误
        window.addEventListener('error', (event) => {
            this.handleGlobalError({
                type: 'JAVASCRIPT_ERROR',
                message: event.message,
                filename: event.filename,
                lineno: event.lineno,
                colno: event.colno,
                error: event.error,
                timestamp: Date.now()
            });
        });
        
        // 监听Promise拒绝
        window.addEventListener('unhandledrejection', (event) => {
            this.handleGlobalError({
                type: 'PROMISE_REJECTION',
                message: event.reason?.message || 'Unknown promise rejection',
                reason: event.reason,
                timestamp: Date.now()
            });
        });
        
        // 监听资源加载错误
        window.addEventListener('error', (event) => {
            if (event.target !== window) {
                this.handleGlobalError({
                    type: 'RESOURCE_ERROR',
                    message: `Failed to load resource: ${event.target.src || event.target.href}`,
                    target: event.target,
                    timestamp: Date.now()
                });
            }
        }, true);
    }
    
    /**
     * 处理全局错误
     */
    handleGlobalError(errorInfo) {
        this.logError(errorInfo);
        
        // 根据错误类型采取不同策略
        switch (errorInfo.type) {
            case 'JAVASCRIPT_ERROR':
                this.handleJavaScriptError(errorInfo);
                break;
            case 'PROMISE_REJECTION':
                this.handlePromiseRejection(errorInfo);
                break;
            case 'RESOURCE_ERROR':
                this.handleResourceError(errorInfo);
                break;
        }
    }
    
    /**
     * 处理JavaScript错误
     */
    handleJavaScriptError(errorInfo) {
        // 判断是否为关键错误
        if (this.isCriticalError(errorInfo)) {
            this.criticalErrors++;
            this.showCriticalErrorUI(errorInfo);
        } else {
            this.warningCount++;
            console.warn('[ErrorManager] JavaScript警告:', errorInfo.message);
        }
    }
    
    /**
     * 处理Promise拒绝
     */
    handlePromiseRejection(errorInfo) {
        console.error('[ErrorManager] Promise拒绝:', errorInfo.message);
        
        // 尝试恢复
        if (this.canRecover(errorInfo)) {
            this.attemptRecovery(errorInfo);
        } else {
            this.showErrorToast('系统出现错误，请刷新页面重试');
        }
    }
    
    /**
     * 处理资源加载错误
     */
    handleResourceError(errorInfo) {
        console.error('[ErrorManager] 资源加载失败:', errorInfo.message);
        
        // 尝试备用资源
        if (errorInfo.target.tagName === 'IMG') {
            errorInfo.target.src = this.getFallbackImage();
        }
    }
    
    /**
     * 处理关键错误（同步错误）
     */
    handleCritical(error, errorCode) {
        const errorInfo = {
            type: 'CRITICAL_ERROR',
            code: errorCode,
            message: error.message || 'Unknown critical error',
            stack: error.stack,
            timestamp: Date.now()
        };
        
        this.criticalErrors++;
        this.logError(errorInfo);
        
        console.error(`[ErrorManager] 关键错误 [${errorCode}]:`, errorInfo.message);
        
        // 显示关键错误UI
        this.showCriticalErrorUI(errorInfo);
        
        // 尝试降级方案
        this.attemptFallback(errorInfo);
    }
    
    /**
     * 处理普通错误
     */
    handleError(error, errorCode) {
        const errorInfo = {
            type: 'ERROR',
            code: errorCode,
            message: error.message || 'Unknown error',
            stack: error.stack,
            timestamp: Date.now()
        };
        
        this.logError(errorInfo);
        
        console.error(`[ErrorManager] 错误 [${errorCode}]:`, errorInfo.message);
        
        // 显示错误提示
        this.showErrorToast(`错误 [${errorCode}]: ${errorInfo.message}`);
    }
    
    /**
     * 记录警告
     */
    handleWarning(message, warningCode) {
        const warningInfo = {
            type: 'WARNING',
            code: warningCode,
            message: message,
            timestamp: Date.now()
        };
        
        this.warningCount++;
        this.logError(warningInfo);
        
        console.warn(`[ErrorManager] 警告 [${warningCode}]:`, message);
    }
    
    /**
     * 判断是否为关键错误
     */
    isCriticalError(errorInfo) {
        const criticalPatterns = [
            'ENGINE_INIT_FAILED',
            'RENDERER_CREATION_FAILED',
            'WEBGL_NOT_SUPPORTED',
            'CRITICAL_RESOURCE_MISSING'
        ];
        
        return criticalPatterns.some(pattern => 
            errorInfo.message.includes(pattern) || 
            errorInfo.code?.includes(pattern)
        );
    }
    
    /**
     * 判断是否可恢复
     */
    canRecover(errorInfo) {
        const recoverablePatterns = [
            'PHOTO_LOAD_FAILED',
            'TEXTURE_MISSING',
            'PARTICLE_SYSTEM_ERROR'
        ];
        
        return recoverablePatterns.some(pattern => 
            errorInfo.code?.includes(pattern)
        );
    }
    
    /**
     * 尝试恢复
     */
    attemptRecovery(errorInfo) {
        console.log('[ErrorManager] 尝试恢复:', errorInfo.code);
        
        // 实现具体的恢复逻辑
        switch (errorInfo.code) {
            case 'PHOTO_LOAD_FAILED':
                // 使用占位符照片
                return this.loadFallbackPhoto();
            case 'PARTICLE_SYSTEM_ERROR':
                // 降级为简单粒子
                return this.enableSimpleParticles();
            default:
                return false;
        }
    }
    
    /**
     * 尝试降级方案
     */
    attemptFallback(errorInfo) {
        console.log('[ErrorManager] 尝试降级方案:', errorInfo.code);
        
        // 显示降级提示
        this.showErrorToast('系统出现严重错误，已启动降级模式');
        
        // 触发降级事件
        window.dispatchEvent(new CustomEvent('engine:fallback', {
            detail: { error: errorInfo }
        }));
    }
    
    /**
     * 记录错误到日志
     */
    logError(errorInfo) {
        const logEntry = {
            ...errorInfo,
            id: this.generateErrorId(),
            userAgent: navigator.userAgent,
            url: window.location.href,
            timestamp: Date.now()
        };
        
        this.errorLog.push(logEntry);
        
        // 限制日志大小
        if (this.errorLog.length > this.maxLogSize) {
            this.errorLog = this.errorLog.slice(-this.maxLogSize);
        }
        
        // 发送到远程监控（可选）
        this.sendToRemoteMonitor(logEntry);
    }
    
    /**
     * 生成错误ID
     */
    generateErrorId() {
        return `ERR-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }
    
    /**
     * 发送到远程监控
     */
    sendToRemoteMonitor(errorInfo) {
        // 实现远程错误收集（如Sentry、LogRocket等）
        if (window.Sentry) {
            window.Sentry.captureException(new Error(errorInfo.message), {
                tags: { errorCode: errorInfo.code }
            });
        }
        
        // 或者发送到自定义监控服务
        // fetch('/api/errors', { method: 'POST', body: JSON.stringify(errorInfo) });
    }
    
    /**
     * 显示关键错误UI
     */
    showCriticalErrorUI(errorInfo) {
        const errorUI = document.createElement('div');
        errorUI.className = 'critical-error-ui';
        errorUI.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.9);
            color: white;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            z-index: 10000;
            font-family: Arial, sans-serif;
        `;
        
        errorUI.innerHTML = `
            <div style="text-align: center; max-width: 600px; padding: 40px;">
                <h1 style="color: #ff6b6b; margin-bottom: 20px;">系统错误</h1>
                <p style="margin-bottom: 30px; font-size: 18px;">
                    抱歉，系统遇到了严重错误<br>
                    错误代码: <strong>${errorInfo.code || 'UNKNOWN'}</strong>
                </p>
                <p style="margin-bottom: 30px; color: #ccc; font-size: 14px;">
                    ${errorInfo.message}
                </p>
                <div style="margin-bottom: 30px;">
                    <button onclick="location.reload()" 
                            style="padding: 12px 24px; margin-right: 10px; background: #4CAF50; color: white; border: none; border-radius: 4px; cursor: pointer;">
                        刷新页面
                    </button>
                    <button onclick="this.parentElement.parentElement.style.display='none'" 
                            style="padding: 12px 24px; background: #666; color: white; border: none; border-radius: 4px; cursor: pointer;">
                        隐藏
                    </button>
                </div>
                <p style="font-size: 12px; color: #999;">
                    如果问题持续存在，请联系技术支持<br>
                    错误ID: ${errorInfo.id || 'N/A'}
                </p>
            </div>
        `;
        
        document.body.appendChild(errorUI);
    }
    
    /**
     * 显示错误提示
     */
    showErrorToast(message) {
        const toast = document.createElement('div');
        toast.className = 'error-toast';
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: #ff6b6b;
            color: white;
            padding: 16px 24px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            z-index: 10001;
            font-family: Arial, sans-serif;
            animation: slideDown 0.3s ease-out;
        `;
        
        toast.textContent = message;
        document.body.appendChild(toast);
        
        // 3秒后自动移除
        setTimeout(() => {
            if (toast.parentNode) {
                toast.style.animation = 'slideUp 0.3s ease-in';
                setTimeout(() => toast.remove(), 300);
            }
        }, 3000);
    }
    
    /**
     * 获取备用图片
     */
    getFallbackImage() {
        return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iIzMzMyIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LXNpemU9IjE4IiBmaWxsPSIjOTk5IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSI+5Zu+54mH5Yqg6L295aSx6LSlPC90ZXh0Pjwvc3ZnPg==';
    }
    
    /**
     * 加载占位照片
     */
    loadFallbackPhoto() {
        // 实现占位照片加载逻辑
        return true;
    }
    
    /**
     * 启用简单粒子
     */
    enableSimpleParticles() {
        // 实现粒子降级逻辑
        return true;
    }
    
    /**
     * 获取错误统计
     */
    getErrorStats() {
        return {
            total: this.errorLog.length,
            critical: this.criticalErrors,
            warnings: this.warningCount,
            recent: this.errorLog.slice(-10)
        };
    }
    
    /**
     * 导出错误日志
     */
    exportErrorLog() {
        const logData = {
            exportTime: new Date().toISOString(),
            stats: this.getErrorStats(),
            log: this.errorLog
        };
        
        const blob = new Blob([JSON.stringify(logData, null, 2)], {
            type: 'application/json'
        });
        
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `error-log-${Date.now()}.json`;
        a.click();
        
        URL.revokeObjectURL(url);
    }
}

// 导出错误管理器
export default ErrorManager;

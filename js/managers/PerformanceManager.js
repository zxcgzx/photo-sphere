/**
 * 性能管理器
 * 实时监控和优化渲染性能
 * @version 4.1.0
 */

export class PerformanceManager {
    constructor(config = {}) {
        this.config = {
            enableMetrics: true,
            metricsUpdateInterval: 1000,
            maxFPS: 60,
            warnOnFrameDrop: true,
            frameDropThreshold: 5, // 低于目标FPS多少时警告
            memoryWarningThreshold: 500 * 1024 * 1024, // 500MB
            ...config
        };
        
        // 性能指标
        this.metrics = {
            fps: 0,
            frameTime: 0,
            frameCount: 0,
            lastFrameTime: performance.now(),
            memoryUsage: 0,
            memoryPeak: 0,
            gpuMemory: 0,
            drawCalls: 0,
            triangles: 0,
            textures: 0,
            shaders: 0
        };
        
        // 性能标记
        this.marks = new Map();
        this.measures = new Map();
        
        // 帧率控制
        this.frameInterval = 1000 / this.config.maxFPS;
        this.lastRenderTime = 0;
        this.frameSkipCount = 0;
        
        // 性能警告
        this.warnings = [];
        this.maxWarnings = 10;
        
        // 性能预算
        this.budgets = {
            frameTime: 16.67, // 60fps = 16.67ms/frame
            drawCalls: 100,
            triangles: 1000000,
            textures: 50
        };
        
        // 启动性能监控
        if (this.config.enableMetrics) {
            this.startMonitoring();
        }
        
        console.log('[PerformanceManager] 性能管理器初始化完成');
    }
    
    /**
     * 开始性能监控
     */
    startMonitoring() {
        // FPS监控
        this.startFPSMonitor();
        
        // 内存监控
        this.startMemoryMonitor();
        
        // 性能指标更新
        this.startMetricsUpdate();
        
        // GPU监控（如果可用）
        if (navigator.gpu) {
            this.startGPUMonitor();
        }
        
        console.log('[PerformanceManager] 性能监控已启动');
    }
    
    /**
     * 开始FPS监控
     */
    startFPSMonitor() {
        let lastTime = performance.now();
        let frameCount = 0;
        
        const monitor = (currentTime) => {
            frameCount++;
            
            if (currentTime - lastTime >= 1000) {
                this.metrics.fps = Math.round((frameCount * 1000) / (currentTime - lastTime));
                this.metrics.frameTime = (currentTime - lastTime) / frameCount;
                
                // 检查帧率下降
                if (this.config.warnOnFrameDrop && this.metrics.fps < this.config.maxFPS - this.config.frameDropThreshold) {
                    this.addWarning(`帧率下降: ${this.metrics.fps} FPS`, 'FPS_DROP');
                }
                
                // 重置计数器
                frameCount = 0;
                lastTime = currentTime;
            }
            
            requestAnimationFrame(monitor);
        };
        
        requestAnimationFrame(monitor);
    }
    
    /**
     * 开始内存监控
     */
    startMemoryMonitor() {
        if (!performance.memory) {
            console.warn('[PerformanceManager] 当前环境不支持内存监控');
            return;
        }
        
        const checkMemory = () => {
            const memory = performance.memory;
            this.metrics.memoryUsage = memory.usedJSHeapSize;
            this.metrics.memoryPeak = Math.max(this.metrics.memoryPeak, memory.usedJSHeapSize);
            
            // 检查内存警告
            if (this.metrics.memoryUsage > this.config.memoryWarningThreshold) {
                this.addWarning(
                    `内存使用过高: ${(this.metrics.memoryUsage / 1048576).toFixed(2)} MB`,
                    'HIGH_MEMORY_USAGE'
                );
            }
            
            // 检查内存泄漏
            if (memory.usedJSHeapSize > memory.totalJSHeapSize * 0.9) {
                this.addWarning('可能存在内存泄漏', 'MEMORY_LEAK');
            }
        };
        
        // 每5秒检查一次内存
        setInterval(checkMemory, 5000);
        checkMemory(); // 立即执行一次
    }
    
    /**
     * 开始GPU监控
     */
    startGPUMonitor() {
        // WebGPU性能监控（未来扩展）
        console.log('[PerformanceManager] GPU监控已就绪（WebGPU）');
    }
    
    /**
     * 开始性能指标更新
     */
    startMetricsUpdate() {
        setInterval(() => {
            this.updateMetricsDisplay();
        }, this.config.metricsUpdateInterval);
    }
    
    /**
     * 更新性能指标显示
     */
    updateMetricsDisplay() {
        const metrics = this.getMetrics();
        
        // 更新DOM元素
        const fpsElement = document.getElementById('fps-counter');
        if (fpsElement) fpsElement.textContent = metrics.fps;
        
        const memoryElement = document.getElementById('memory-usage');
        if (memoryElement) {
            memoryElement.textContent = `${(metrics.memoryUsage / 1048576).toFixed(2)} MB`;
        }
        
        const particleElement = document.getElementById('particle-count');
        if (particleElement) {
            particleElement.textContent = metrics.particleCount;
        }
        
        const renderTimeElement = document.getElementById('render-time');
        if (renderTimeElement) {
            renderTimeElement.textContent = `${metrics.frameTime.toFixed(2)} ms`;
        }
    }
    
    /**
     * 开始帧性能监控
     */
    beginFrame() {
        if (!this.config.enableMetrics) return;
        
        this.marks.set('frame-start', performance.now());
    }
    
    /**
     * 结束帧性能监控
     */
    endFrame() {
        if (!this.config.enableMetrics) return;
        
        const startTime = this.marks.get('frame-start');
        if (startTime) {
            const frameTime = performance.now() - startTime;
            
            // 检查是否超过性能预算
            if (frameTime > this.budgets.frameTime) {
                this.addWarning(
                    `帧时间超过预算: ${frameTime.toFixed(2)} ms`,
                    'FRAME_TIME_BUDGET_EXCEEDED'
                );
            }
            
            this.marks.delete('frame-start');
        }
        
        this.metrics.frameCount++;
    }
    
    /**
     * 性能标记
     */
    mark(name) {
        if (!this.config.enableMetrics) return;
        
        this.marks.set(name, performance.now());
        performance.mark?.(name);
    }
    
    /**
     * 性能测量
     */
    measure(name, startMark, endMark) {
        if (!this.config.enableMetrics) return;
        
        const startTime = this.marks.get(startMark);
        const endTime = this.marks.get(endMark);
        
        if (startTime && endTime) {
            const duration = endTime - startTime;
            this.measures.set(name, duration);
            
            console.log(`[PerformanceManager] ${name}: ${duration.toFixed(2)} ms`);
            
            // 清理标记
            this.marks.delete(startMark);
            this.marks.delete(endMark);
            
            performance.measure?.(name, startMark, endMark);
        }
    }
    
    /**
     * 帧率控制
     */
    shouldRender(currentTime) {
        if (currentTime - this.lastRenderTime < this.frameInterval) {
            this.frameSkipCount++;
            return false;
        }
        
        this.lastRenderTime = currentTime;
        this.frameSkipCount = 0;
        return true;
    }
    
    /**
     * 添加性能警告
     */
    addWarning(message, code) {
        const warning = {
            message,
            code,
            timestamp: Date.now(),
            stack: new Error().stack
        };
        
        this.warnings.push(warning);
        
        // 限制警告数量
        if (this.warnings.length > this.maxWarnings) {
            this.warnings = this.warnings.slice(-this.maxWarnings);
        }
        
        console.warn(`[PerformanceManager] 性能警告 [${code}]: ${message}`);
        
        // 触发警告事件
        window.dispatchEvent(new CustomEvent('performance:warning', {
            detail: warning
        }));
    }
    
    /**
     * 获取性能指标
     */
    getMetrics() {
        return {
            fps: this.metrics.fps,
            frameTime: this.metrics.frameTime,
            memoryUsage: this.metrics.memoryUsage,
            memoryPeak: this.metrics.memoryPeak,
            frameCount: this.metrics.frameCount,
            frameSkipCount: this.frameSkipCount,
            warnings: this.warnings.length,
            isPerformanceGood: this.isPerformanceGood()
        };
    }
    
    /**
     * 判断性能是否良好
     */
    isPerformanceGood() {
        return (
            this.metrics.fps >= this.config.maxFPS * 0.9 &&
            this.metrics.frameTime <= this.budgets.frameTime * 1.1 &&
            this.metrics.memoryUsage < this.config.memoryWarningThreshold
        );
    }
    
    /**
     * 获取内存使用情况
     */
    getMemoryUsage() {
        if (performance.memory) {
            return {
                used: performance.memory.usedJSHeapSize,
                total: performance.memory.totalJSHeapSize,
                limit: performance.memory.jsHeapSizeLimit,
                peak: this.metrics.memoryPeak
            };
        }
        
        return null;
    }
    
    /**
     * 获取性能预算使用情况
     */
    getBudgetUsage() {
        return {
            frameTime: (this.metrics.frameTime / this.budgets.frameTime) * 100,
            memory: (this.metrics.memoryUsage / this.config.memoryWarningThreshold) * 100
        };
    }
    
    /**
     * 生成性能报告
     */
    generateReport() {
        const report = {
            timestamp: Date.now(),
            metrics: this.getMetrics(),
            memory: this.getMemoryUsage(),
            budgetUsage: this.getBudgetUsage(),
            warnings: this.warnings,
            isPerformanceGood: this.isPerformanceGood(),
            recommendations: this.getRecommendations()
        };
        
        return report;
    }
    
    /**
     * 获取性能优化建议
     */
    getRecommendations() {
        const recommendations = [];
        
        const metrics = this.getMetrics();
        const budget = this.getBudgetUsage();
        
        // FPS建议
        if (metrics.fps < 30) {
            recommendations.push({
                priority: 'HIGH',
                category: 'FPS',
                message: '帧率过低，建议减少粒子数量或降低渲染质量',
                action: 'reduceParticleCount'
            });
        } else if (metrics.fps < 50) {
            recommendations.push({
                priority: 'MEDIUM',
                category: 'FPS',
                message: '帧率有优化空间，建议检查渲染瓶颈',
                action: 'profileRender'
            });
        }
        
        // 内存建议
        if (budget.memory > 80) {
            recommendations.push({
                priority: 'HIGH',
                category: 'MEMORY',
                message: '内存使用接近上限，建议清理缓存或降低纹理质量',
                action: 'optimizeMemory'
            });
        }
        
        // 帧时间建议
        if (budget.frameTime > 80) {
            recommendations.push({
                priority: 'HIGH',
                category: 'FRAME_TIME',
                message: '帧时间超过预算，建议优化着色器或减少draw call',
                action: 'optimizeShaders'
            });
        }
        
        return recommendations;
    }
    
    /**
     * 导出性能数据
     */
    exportData() {
        const data = this.generateReport();
        const blob = new Blob([JSON.stringify(data, null, 2)], {
            type: 'application/json'
        });
        
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `performance-report-${Date.now()}.json`;
        a.click();
        
        URL.revokeObjectURL(url);
    }
    
    /**
     * 销毁性能管理器
     */
    destroy() {
        // 清理定时器
        if (this.metricsInterval) {
            clearInterval(this.metricsInterval);
        }
        
        // 清理数据
        this.metrics = {};
        this.marks.clear();
        this.measures.clear();
        this.warnings = [];
        
        console.log('[PerformanceManager] 性能管理器已销毁');
    }
}

// 导出性能管理器
export default PerformanceManager;

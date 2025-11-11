/**
 * 性能监控器
 * 监控FPS、帧时间、内存使用等性能指标
 */

export class PerformanceMonitor {
    constructor() {
        this.fps = 0;
        this.frameTime = 0;
        this.memoryUsage = 0;
        this.lastTime = performance.now();
        this.frameCount = 0;
        this.fpsUpdateInterval = 1000; // 每秒更新一次FPS
        this.lastFpsUpdate = this.lastTime;
        
        // 性能数据历史
        this.performanceHistory = {
            fps: [],
            frameTime: [],
            memoryUsage: []
        };
        this.maxHistoryLength = 60; // 保留最近60帧的数据
    }
    
    /**
     * 更新性能数据
     */
    update() {
        const currentTime = performance.now();
        const deltaTime = currentTime - this.lastTime;
        
        // 更新帧时间
        this.frameTime = deltaTime;
        
        // 更新FPS
        this.frameCount++;
        if (currentTime - this.lastFpsUpdate >= this.fpsUpdateInterval) {
            this.fps = Math.round((this.frameCount * 1000) / (currentTime - this.lastFpsUpdate));
            this.frameCount = 0;
            this.lastFpsUpdate = currentTime;
            
            // 记录到历史数据
            this.recordPerformanceData();
        }
        
        // 更新内存使用（如果可用）
        if (performance.memory) {
            this.memoryUsage = Math.round(performance.memory.usedJSHeapSize / 1048576); // MB
        }
        
        this.lastTime = currentTime;
    }
    
    /**
     * 记录性能数据到历史
     */
    recordPerformanceData() {
        const timestamp = Date.now();
        
        this.performanceHistory.fps.push({
            value: this.fps,
            timestamp
        });
        
        this.performanceHistory.frameTime.push({
            value: this.frameTime,
            timestamp
        });
        
        this.performanceHistory.memoryUsage.push({
            value: this.memoryUsage,
            timestamp
        });
        
        // 限制历史数据长度
        Object.keys(this.performanceHistory).forEach(key => {
            if (this.performanceHistory[key].length > this.maxHistoryLength) {
                this.performanceHistory[key].shift();
            }
        });
    }
    
    /**
     * 获取当前性能数据
     */
    getCurrentPerformance() {
        return {
            fps: this.fps,
            frameTime: this.frameTime,
            memoryUsage: this.memoryUsage
        };
    }
    
    /**
     * 获取性能历史数据
     */
    getPerformanceHistory() {
        return { ...this.performanceHistory };
    }
    
    /**
     * 获取平均FPS
     */
    getAverageFps() {
        const fpsData = this.performanceHistory.fps;
        if (fpsData.length === 0) return 0;
        
        const sum = fpsData.reduce((acc, item) => acc + item.value, 0);
        return Math.round(sum / fpsData.length);
    }
    
    /**
     * 获取平均帧时间
     */
    getAverageFrameTime() {
        const frameTimeData = this.performanceHistory.frameTime;
        if (frameTimeData.length === 0) return 0;
        
        const sum = frameTimeData.reduce((acc, item) => acc + item.value, 0);
        return sum / frameTimeData.length;
    }
    
    /**
     * 性能是否良好
     */
    isPerformanceGood() {
        return this.fps >= 30 && this.frameTime <= 33.33; // 30 FPS, 33.33ms per frame
    }
    
    /**
     * 重置性能数据
     */
    reset() {
        this.fps = 0;
        this.frameTime = 0;
        this.frameCount = 0;
        this.lastTime = performance.now();
        this.lastFpsUpdate = this.lastTime;
        
        this.performanceHistory = {
            fps: [],
            frameTime: [],
            memoryUsage: []
        };
    }
    
    /**
     * 标记性能测量点（用于性能分析）
     */
    mark(name) {
        if (performance.mark) {
            performance.mark(name);
        }
    }
    
    /**
     * 测量两个标记点之间的性能
     */
    measure(name, startMark, endMark) {
        if (performance.measure) {
            try {
                performance.measure(name, startMark, endMark);
                const entries = performance.getEntriesByName(name);
                if (entries.length > 0) {
                    return entries[entries.length - 1].duration;
                }
            } catch (error) {
                console.warn(`性能测量失败: ${error.message}`);
            }
        }
        return 0;
    }
    
    /**
     * 清除性能标记
     */
    clearMarks(name) {
        if (performance.clearMarks) {
            performance.clearMarks(name);
        }
    }
    
    /**
     * 清除性能测量
     */
    clearMeasures(name) {
        if (performance.clearMeasures) {
            performance.clearMeasures(name);
        }
    }
}
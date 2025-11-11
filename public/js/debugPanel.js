/**
 * 调试和性能监控面板
 * 显示实时性能数据和调试信息
 */

import { CONFIG } from './config.js';

class DebugPanel {
    constructor(config, photoManager) {
        this.config = config || CONFIG;
        this.photoManager = photoManager;
        
        // 面板状态
        this.isVisible = false;
        this.isMinimized = false;
        
        // DOM元素
        this.panel = null;
        this.content = null;
        
        // 更新定时器
        this.updateTimer = null;
        this.updateInterval = 1000; // 1秒更新一次
        
        // 性能图表数据
        this.chartData = {
            fps: [],
            memory: [],
            loadTime: [],
            maxPoints: 50
        };
        
        // 绑定方法
        this.updateStats = this.updateStats.bind(this);
        this.toggleVisibility = this.toggleVisibility.bind(this);
    }
    
    /**
     * 初始化调试面板
     */
    initialize() {
        this.createPanel();
        this.setupEventListeners();
        
        // 默认隐藏
        this.hide();
        
        this.config.log('调试面板初始化完成');
    }
    
    /**
     * 创建面板DOM
     */
    createPanel() {
        // 创建主面板
        this.panel = document.createElement('div');
        this.panel.id = 'debug-panel';
        this.panel.className = 'debug-panel';
        this.panel.innerHTML = `
            <div class="debug-header">
                <h3>🔧 性能监控</h3>
                <div class="debug-controls">
                    <button id="debug-minimize" title="最小化">−</button>
                    <button id="debug-close" title="关闭">×</button>
                </div>
            </div>
            <div class="debug-content">
                <div class="debug-section">
                    <h4>🚀 实时性能</h4>
                    <div class="stats-grid">
                        <div class="stat-item">
                            <span class="stat-label">FPS:</span>
                            <span class="stat-value" id="debug-fps">0</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-label">帧时间:</span>
                            <span class="stat-value" id="debug-frame-time">0ms</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-label">内存:</span>
                            <span class="stat-value" id="debug-memory">0MB</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-label">绘制调用:</span>
                            <span class="stat-value" id="debug-draw-calls">0</span>
                        </div>
                    </div>
                </div>
                
                <div class="debug-section">
                    <h4>📸 照片统计</h4>
                    <div class="stats-grid">
                        <div class="stat-item">
                            <span class="stat-label">总数:</span>
                            <span class="stat-value" id="debug-total-photos">0</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-label">已加载:</span>
                            <span class="stat-value" id="debug-loaded-photos">0</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-label">缓存大小:</span>
                            <span class="stat-value" id="debug-cache-size">0</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-label">加载队列:</span>
                            <span class="stat-value" id="debug-queue-size">0</span>
                        </div>
                    </div>
                </div>
                
                <div class="debug-section">
                    <h4>⚡ 优化状态</h4>
                    <div class="stats-grid">
                        <div class="stat-item">
                            <span class="stat-label">优化级别:</span>
                            <span class="stat-value" id="debug-optimization-level">0</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-label">LOD级别:</span>
                            <span class="stat-value" id="debug-lod-level">高</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-label">剔除半径:</span>
                            <span class="stat-value" id="debug-culling-radius">150</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-label">GPU渲染器:</span>
                            <span class="stat-value" id="debug-gpu-renderer">未知</span>
                        </div>
                    </div>
                </div>
                
                <div class="debug-section">
                    <h4>📊 性能曲线</h4>
                    <div class="chart-container">
                        <canvas id="debug-fps-chart" width="280" height="80"></canvas>
                        <div class="chart-label">FPS (过去50秒)</div>
                    </div>
                    <div class="chart-container">
                        <canvas id="debug-memory-chart" width="280" height="80"></canvas>
                        <div class="chart-label">内存使用 (MB)</div>
                    </div>
                </div>
                
                <div class="debug-section">
                    <h4>🛠️ 调试控制</h4>
                    <div class="debug-buttons">
                        <button id="debug-force-gc" class="debug-btn">强制垃圾回收</button>
                        <button id="debug-clear-cache" class="debug-btn">清理缓存</button>
                        <button id="debug-force-optimize" class="debug-btn">强制优化</button>
                        <button id="debug-reload-photos" class="debug-btn">重新加载照片</button>
                    </div>
                </div>
            </div>
        `;
        
        // 添加样式
        this.addStyles();
        
        // 添加到页面
        document.body.appendChild(this.panel);
        
        this.content = this.panel.querySelector('.debug-content');
    }
    
    /**
     * 添加样式
     */
    addStyles() {
        if (document.getElementById('debug-panel-styles')) return;
        
        const style = document.createElement('style');
        style.id = 'debug-panel-styles';
        style.textContent = `
            .debug-panel {
                position: fixed;
                top: 20px;
                right: 20px;
                width: 320px;
                background: rgba(0, 0, 0, 0.9);
                color: white;
                border-radius: 8px;
                font-family: 'Courier New', monospace;
                font-size: 12px;
                z-index: 10000;
                box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
                backdrop-filter: blur(10px);
                border: 1px solid rgba(255, 255, 255, 0.1);
            }
            
            .debug-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 10px 15px;
                background: rgba(255, 255, 255, 0.1);
                border-radius: 8px 8px 0 0;
                border-bottom: 1px solid rgba(255, 255, 255, 0.1);
            }
            
            .debug-header h3 {
                margin: 0;
                font-size: 14px;
                font-weight: bold;
            }
            
            .debug-controls {
                display: flex;
                gap: 5px;
            }
            
            .debug-controls button {
                background: none;
                border: 1px solid rgba(255, 255, 255, 0.3);
                color: white;
                width: 20px;
                height: 20px;
                border-radius: 3px;
                cursor: pointer;
                font-size: 12px;
                display: flex;
                align-items: center;
                justify-content: center;
            }
            
            .debug-controls button:hover {
                background: rgba(255, 255, 255, 0.2);
            }
            
            .debug-content {
                padding: 15px;
                max-height: 600px;
                overflow-y: auto;
            }
            
            .debug-content.minimized {
                display: none;
            }
            
            .debug-section {
                margin-bottom: 20px;
            }
            
            .debug-section h4 {
                margin: 0 0 10px 0;
                font-size: 13px;
                color: #4CAF50;
                border-bottom: 1px solid rgba(76, 175, 80, 0.3);
                padding-bottom: 3px;
            }
            
            .stats-grid {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 8px;
            }
            
            .stat-item {
                display: flex;
                justify-content: space-between;
                padding: 4px 0;
            }
            
            .stat-label {
                color: #ccc;
            }
            
            .stat-value {
                color: #fff;
                font-weight: bold;
            }
            
            .chart-container {
                margin: 10px 0;
                text-align: center;
            }
            
            .chart-container canvas {
                border: 1px solid rgba(255, 255, 255, 0.2);
                border-radius: 4px;
                background: rgba(255, 255, 255, 0.05);
            }
            
            .chart-label {
                font-size: 10px;
                color: #ccc;
                margin-top: 5px;
            }
            
            .debug-buttons {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 8px;
            }
            
            .debug-btn {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                border: none;
                padding: 8px 12px;
                border-radius: 4px;
                cursor: pointer;
                font-size: 11px;
                transition: all 0.3s ease;
            }
            
            .debug-btn:hover {
                transform: translateY(-1px);
                box-shadow: 0 2px 8px rgba(102, 126, 234, 0.3);
            }
            
            .debug-btn:active {
                transform: translateY(0);
            }
            
            .debug-panel.hidden {
                display: none;
            }
            
            /* 自定义滚动条 */
            .debug-content::-webkit-scrollbar {
                width: 6px;
            }
            
            .debug-content::-webkit-scrollbar-track {
                background: rgba(255, 255, 255, 0.1);
                border-radius: 3px;
            }
            
            .debug-content::-webkit-scrollbar-thumb {
                background: rgba(255, 255, 255, 0.3);
                border-radius: 3px;
            }
            
            .debug-content::-webkit-scrollbar-thumb:hover {
                background: rgba(255, 255, 255, 0.5);
            }
        `;
        
        document.head.appendChild(style);
    }
    
    /**
     * 设置事件监听
     */
    setupEventListeners() {
        // 关闭按钮
        const closeBtn = this.panel.querySelector('#debug-close');
        closeBtn.addEventListener('click', () => this.hide());
        
        // 最小化按钮
        const minimizeBtn = this.panel.querySelector('#debug-minimize');
        minimizeBtn.addEventListener('click', () => this.toggleMinimize());
        
        // 调试按钮
        this.setupDebugButtons();
        
        // 键盘快捷键 (Ctrl+Shift+D)
        document.addEventListener('keydown', (event) => {
            if (event.ctrlKey && event.shiftKey && event.code === 'KeyD') {
                event.preventDefault();
                this.toggleVisibility();
            }
        });
    }
    
    /**
     * 设置调试按钮事件
     */
    setupDebugButtons() {
        // 强制垃圾回收
        const gcBtn = this.panel.querySelector('#debug-force-gc');
        gcBtn.addEventListener('click', () => {
            if (window.gc) {
                window.gc();
                this.config.log('强制垃圾回收完成');
            } else {
                this.config.warn('垃圾回收不可用（需要 --enable-precise-memory-info 标志）');
            }
        });
        
        // 清理缓存
        const clearCacheBtn = this.panel.querySelector('#debug-clear-cache');
        clearCacheBtn.addEventListener('click', () => {
            if (this.photoManager.lazyLoader) {
                this.photoManager.lazyLoader.textureCache.clear();
                this.config.log('纹理缓存已清理');
            }
        });
        
        // 强制优化
        const optimizeBtn = this.panel.querySelector('#debug-force-optimize');
        optimizeBtn.addEventListener('click', () => {
            if (this.photoManager.performanceManager) {
                this.photoManager.performanceManager.optimizePerformance();
                this.config.log('强制性能优化已触发');
            }
        });
        
        // 重新加载照片
        const reloadBtn = this.panel.querySelector('#debug-reload-photos');
        reloadBtn.addEventListener('click', async () => {
            try {
                await this.photoManager.refreshPhotos();
                this.config.log('照片重新加载完成');
            } catch (error) {
                this.config.error('照片重新加载失败:', error);
            }
        });
    }
    
    /**
     * 开始更新统计信息
     */
    startUpdating() {
        if (this.updateTimer) return;
        
        this.updateTimer = setInterval(this.updateStats, this.updateInterval);
        this.updateStats(); // 立即更新一次
    }
    
    /**
     * 停止更新统计信息
     */
    stopUpdating() {
        if (this.updateTimer) {
            clearInterval(this.updateTimer);
            this.updateTimer = null;
        }
    }
    
    /**
     * 更新统计信息
     */
    updateStats() {
        if (!this.isVisible || this.isMinimized) return;
        
        try {
            // 获取性能统计
            const perfStats = this.photoManager.getPerformanceStats();
            
            // 更新基础性能数据
            this.updateElement('debug-fps', perfStats.performance?.fps || 0);
            this.updateElement('debug-frame-time', `${perfStats.performance?.frameTime || 0}ms`);
            this.updateElement('debug-memory', `${perfStats.performance?.memoryUsage || 0}MB`);
            this.updateElement('debug-draw-calls', perfStats.performance?.drawCalls || 0);
            
            // 更新照片统计
            this.updateElement('debug-total-photos', perfStats.photos || 0);
            this.updateElement('debug-loaded-photos', perfStats.loaded || 0);
            this.updateElement('debug-cache-size', perfStats.lazyLoader?.cacheSize || 0);
            this.updateElement('debug-queue-size', perfStats.lazyLoader?.queueSize || 0);
            
            // 更新优化状态
            this.updateElement('debug-optimization-level', perfStats.performance?.optimizationLevel || 0);
            this.updateElement('debug-gpu-renderer', perfStats.performance?.gpuRenderer || '未知');
            
            // 更新LOD级别
            const lodLevels = ['低', '中', '高'];
            const lodLevel = lodLevels[2 - (perfStats.performance?.optimizationLevel || 0)] || '高';
            this.updateElement('debug-lod-level', lodLevel);
            
            // 更新图表
            this.updateCharts(perfStats);
            
        } catch (error) {
            this.config.warn('更新调试面板失败:', error);
        }
    }
    
    /**
     * 更新元素内容
     */
    updateElement(id, value) {
        const element = this.panel.querySelector(`#${id}`);
        if (element) {
            element.textContent = value;
        }
    }
    
    /**
     * 更新图表
     */
    updateCharts(perfStats) {
        // 添加新数据点
        const fps = perfStats.performance?.fps || 0;
        const memory = perfStats.performance?.memoryUsage || 0;
        
        this.chartData.fps.push(fps);
        this.chartData.memory.push(memory);
        
        // 保持数据点数量限制
        if (this.chartData.fps.length > this.chartData.maxPoints) {
            this.chartData.fps.shift();
        }
        if (this.chartData.memory.length > this.chartData.maxPoints) {
            this.chartData.memory.shift();
        }
        
        // 绘制图表
        this.drawChart('debug-fps-chart', this.chartData.fps, '#4CAF50', 60);
        this.drawChart('debug-memory-chart', this.chartData.memory, '#FF9800', Math.max(...this.chartData.memory) || 100);
    }
    
    /**
     * 绘制图表
     */
    drawChart(canvasId, data, color, maxValue) {
        const canvas = this.panel.querySelector(`#${canvasId}`);
        if (!canvas) return;
        
        const ctx = canvas.getContext('2d');
        const width = canvas.width;
        const height = canvas.height;
        
        // 清空画布
        ctx.clearRect(0, 0, width, height);
        
        if (data.length < 2) return;
        
        // 绘制网格
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.lineWidth = 1;
        
        // 水平网格线
        for (let i = 0; i <= 4; i++) {
            const y = (height / 4) * i;
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(width, y);
            ctx.stroke();
        }
        
        // 垂直网格线
        for (let i = 0; i <= 10; i++) {
            const x = (width / 10) * i;
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, height);
            ctx.stroke();
        }
        
        // 绘制数据线
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        
        const stepX = width / (this.chartData.maxPoints - 1);
        
        data.forEach((value, index) => {
            const x = index * stepX;
            const y = height - (value / maxValue) * height;
            
            if (index === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        });
        
        ctx.stroke();
        
        // 绘制填充区域
        ctx.fillStyle = color.replace(')', ', 0.2)').replace('rgb', 'rgba');
        ctx.lineTo(width, height);
        ctx.lineTo(0, height);
        ctx.closePath();
        ctx.fill();
    }
    
    /**
     * 显示面板
     */
    show() {
        this.isVisible = true;
        this.panel.classList.remove('hidden');
        this.startUpdating();
        
        // 添加拖拽功能
        this.makeDraggable();
    }
    
    /**
     * 隐藏面板
     */
    hide() {
        this.isVisible = false;
        this.panel.classList.add('hidden');
        this.stopUpdating();
    }
    
    /**
     * 切换显示状态
     */
    toggleVisibility() {
        if (this.isVisible) {
            this.hide();
        } else {
            this.show();
        }
    }
    
    /**
     * 切换最小化状态
     */
    toggleMinimize() {
        this.isMinimized = !this.isMinimized;
        
        if (this.isMinimized) {
            this.content.classList.add('minimized');
            this.panel.querySelector('#debug-minimize').textContent = '+';
        } else {
            this.content.classList.remove('minimized');
            this.panel.querySelector('#debug-minimize').textContent = '−';
        }
    }
    
    /**
     * 使面板可拖拽
     */
    makeDraggable() {
        const header = this.panel.querySelector('.debug-header');
        let isDragging = false;
        let startX, startY, startLeft, startTop;
        
        header.addEventListener('mousedown', (e) => {
            isDragging = true;
            startX = e.clientX;
            startY = e.clientY;
            
            const rect = this.panel.getBoundingClientRect();
            startLeft = rect.left;
            startTop = rect.top;
            
            header.style.cursor = 'grabbing';
        });
        
        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            
            const deltaX = e.clientX - startX;
            const deltaY = e.clientY - startY;
            
            const newLeft = Math.max(0, Math.min(window.innerWidth - this.panel.offsetWidth, startLeft + deltaX));
            const newTop = Math.max(0, Math.min(window.innerHeight - this.panel.offsetHeight, startTop + deltaY));
            
            this.panel.style.left = newLeft + 'px';
            this.panel.style.top = newTop + 'px';
            this.panel.style.right = 'auto';
        });
        
        document.addEventListener('mouseup', () => {
            isDragging = false;
            header.style.cursor = 'grab';
        });
        
        header.style.cursor = 'grab';
    }
    
    /**
     * 销毁调试面板
     */
    dispose() {
        this.stopUpdating();
        
        if (this.panel && this.panel.parentNode) {
            this.panel.parentNode.removeChild(this.panel);
        }
        
        // 移除样式
        const style = document.getElementById('debug-panel-styles');
        if (style && style.parentNode) {
            style.parentNode.removeChild(style);
        }
        
        this.config.log('调试面板已销毁');
    }
}

// 导出调试面板
window.DebugPanel = DebugPanel;
export default DebugPanel;
/**
 * 统计仪表盘
 * 交互式数据可视化
 */

class StatsDashboard {
    constructor(containerId) {
        this.containerId = containerId;
        this.container = document.getElementById(containerId);
        this.isOpen = false;
        
        this.data = {
            photos: [],
            timestamps: [],
            performance: [],
            interactions: []
        };
        
        this.init();
    }
    
    init() {
        this.createDashboard();
        this.bindEvents();
    }
    
    createDashboard() {
        const dashboard = document.createElement('div');
        dashboard.id = 'stats-dashboard';
        dashboard.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            background: rgba(0, 0, 0, 0.95);
            backdrop-filter: blur(20px);
            z-index: 10000;
            display: none;
            overflow-y: auto;
            color: #fff;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        `;
        
        dashboard.innerHTML = `
            <div style="padding: 40px; max-width: 1400px; margin: 0 auto;">
                <!-- 头部 -->
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 40px;">
                    <h1 style="font-size: 36px; background: linear-gradient(135deg, #667eea, #764ba2); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">
                        宇宙数据中心
                    </h1>
                    <button id="close-dashboard" style="background: none; border: 2px solid #667eea; color: #667eea; padding: 10px 20px; border-radius: 8px; cursor: pointer; font-size: 16px;">
                        ✕ 关闭
                    </button>
                </div>
                
                <!-- 概览卡片 -->
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; margin-bottom: 40px;">
                    <div class="stat-card" style="background: linear-gradient(135deg, #667eea, #764ba2); padding: 30px; border-radius: 16px; text-align: center;">
                        <div style="font-size: 48px; margin-bottom: 10px;">📸</div>
                        <div style="font-size: 36px; font-weight: bold;" id="total-photos">0</div>
                        <div style="font-size: 14px; opacity: 0.8;">照片总数</div>
                    </div>
                    
                    <div class="stat-card" style="background: linear-gradient(135deg, #f093fb, #f5576c); padding: 30px; border-radius: 16px; text-align: center;">
                        <div style="font-size: 48px; margin-bottom: 10px;">💕</div>
                        <div style="font-size: 36px; font-weight: bold;" id="sweet-index">95%</div>
                        <div style="font-size: 14px; opacity: 0.8;">甜蜜指数</div>
                    </div>
                    
                    <div class="stat-card" style="background: linear-gradient(135deg, #4facfe, #00f2fe); padding: 30px; border-radius: 16px; text-align: center;">
                        <div style="font-size: 48px; margin-bottom: 10px;">⭐</div>
                        <div style="font-size: 36px; font-weight: bold;" id="memory-count">128</div>
                        <div style="font-size: 14px; opacity: 0.8;">回忆数量</div>
                    </div>
                    
                    <div class="stat-card" style="background: linear-gradient(135deg, #fa709a, #fee140); padding: 30px; border-radius: 16px; text-align: center;">
                        <div style="font-size: 48px; margin-bottom: 10px;">🎮</div>
                        <div style="font-size: 36px; font-weight: bold;" id="interaction-count">0</div>
                        <div style="font-size: 14px; opacity: 0.8;">交互次数</div>
                    </div>
                </div>
                
                <!-- 图表区域 -->
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 30px; margin-bottom: 40px;">
                    <!-- 照片上传时间轴 -->
                    <div style="background: rgba(255, 255, 255, 0.05); padding: 30px; border-radius: 16px; border: 1px solid rgba(255, 255, 255, 0.1);">
                        <h2 style="margin: 0 0 20px 0; font-size: 24px;">📈 照片上传时间轴</h2>
                        <canvas id="timeline-chart" width="600" height="300" style="width: 100%; height: 300px;"></canvas>
                    </div>
                    
                    <!-- 性能监控 -->
                    <div style="background: rgba(255, 255, 255, 0.05); padding: 30px; border-radius: 16px; border: 1px solid rgba(255, 255, 255, 0.1);">
                        <h2 style="margin: 0 0 20px 0; font-size: 24px;">⚡ 性能监控</h2>
                        <canvas id="performance-chart" width="600" height="300" style="width: 100%; height: 300px;"></canvas>
                        
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-top: 20px;">
                            <div style="text-align: center;">
                                <div style="font-size: 24px; font-weight: bold;" id="avg-fps">0</div>
                                <div style="font-size: 12px; opacity: 0.7;">平均FPS</div>
                            </div>
                            <div style="text-align: center;">
                                <div style="font-size: 24px; font-weight: bold;" id="memory-usage">0MB</div>
                                <div style="font-size: 12px; opacity: 0.7;">内存使用</div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- 交互日志 -->
                <div style="background: rgba(255, 255, 255, 0.05); padding: 30px; border-radius: 16px; border: 1px solid rgba(255, 255, 255, 0.1);">
                    <h2 style="margin: 0 0 20px 0; font-size: 24px;">📝 交互日志</h2>
                    <div id="interaction-log" style="max-height: 300px; overflow-y: auto; font-family: 'Courier New', monospace; font-size: 12px; line-height: 1.6;">
                        <!-- 动态生成 -->
                    </div>
                </div>
                
                <!-- 导出功能 -->
                <div style="margin-top: 40px; text-align: center;">
                    <button id="export-stats" style="background: linear-gradient(135deg, #667eea, #764ba2); color: white; border: none; padding: 15px 30px; border-radius: 8px; cursor: pointer; font-size: 16px; margin-right: 10px;">
                        📤 导出统计数据
                    </button>
                    <button id="clear-stats" style="background: rgba(255, 107, 107, 0.2); color: #ff6b6b; border: 1px solid #ff6b6b; padding: 15px 30px; border-radius: 8px; cursor: pointer; font-size: 16px;">
                        🗑️ 清除数据
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(dashboard);
    }
    
    bindEvents() {
        // 关闭按钮
        document.getElementById('close-dashboard')?.addEventListener('click', () => {
            this.hide();
        });
        
        // 导出按钮
        document.getElementById('export-stats')?.addEventListener('click', () => {
            this.exportData();
        });
        
        // 清除按钮
        document.getElementById('clear-stats')?.addEventListener('click', () => {
            if (confirm('确定要清除所有统计数据吗？此操作不可恢复。')) {
                this.clearData();
            }
        });
        
        // ESC键关闭
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isOpen) {
                this.hide();
            }
        });
    }
    
    show() {
        const dashboard = document.getElementById('stats-dashboard');
        if (dashboard) {
            dashboard.style.display = 'block';
            this.isOpen = true;
            this.refreshData();
        }
    }
    
    hide() {
        const dashboard = document.getElementById('stats-dashboard');
        if (dashboard) {
            dashboard.style.display = 'none';
            this.isOpen = false;
        }
    }
    
    refreshData() {
        // 更新概览卡片
        this.updateOverviewCards();
        
        // 绘制图表
        this.drawTimelineChart();
        this.drawPerformanceChart();
        
        // 更新交互日志
        this.updateInteractionLog();
    }
    
    updateOverviewCards() {
        // 从应用状态获取数据
        const photoCount = this.getData('photo-count') || 0;
        const sweetIndex = this.getData('sweet-index') || '95%';
        const memoryCount = this.getData('memory-count') || 128;
        const interactionCount = this.getData('interaction-count') || 0;
        
        document.getElementById('total-photos').textContent = photoCount;
        document.getElementById('sweet-index').textContent = sweetIndex;
        document.getElementById('memory-count').textContent = memoryCount;
        document.getElementById('interaction-count').textContent = interactionCount;
    }
    
    drawTimelineChart() {
        const canvas = document.getElementById('timeline-chart');
        if (!canvas) return;
        
        const ctx = canvas.getContext('2d');
        const width = canvas.width;
        const height = canvas.height;
        
        // 清空画布
        ctx.clearRect(0, 0, width, height);
        
        // 生成模拟数据
        const dataPoints = 30;
        const data = [];
        for (let i = 0; i < dataPoints; i++) {
            data.push(Math.floor(Math.random() * 10) + 1);
        }
        
        // 绘制图表
        ctx.strokeStyle = '#667eea';
        ctx.lineWidth = 3;
        ctx.beginPath();
        
        const stepX = width / (dataPoints - 1);
        const maxValue = Math.max(...data);
        
        data.forEach((value, index) => {
            const x = index * stepX;
            const y = height - (value / maxValue) * height * 0.8 - height * 0.1;
            
            if (index === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
            
            // 绘制数据点
            ctx.fillStyle = '#667eea';
            ctx.beginPath();
            ctx.arc(x, y, 4, 0, Math.PI * 2);
            ctx.fill();
        });
        
        ctx.stroke();
        
        // 添加标题
        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.font = '12px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('最近30天', width / 2, height - 10);
    }
    
    drawPerformanceChart() {
        const canvas = document.getElementById('performance-chart');
        if (!canvas) return;
        
        const ctx = canvas.getContext('2d');
        const width = canvas.width;
        const height = canvas.height;
        
        // 清空画布
        ctx.clearRect(0, 0, width, height);
        
        // 模拟FPS数据
        const fpsData = [];
        for (let i = 0; i < 60; i++) {
            fpsData.push(45 + Math.random() * 30);
        }
        
        // 绘制FPS曲线
        ctx.strokeStyle = '#00ff88';
        ctx.lineWidth = 2;
        ctx.beginPath();
        
        const stepX = width / (fpsData.length - 1);
        
        fpsData.forEach((fps, index) => {
            const x = index * stepX;
            const y = height - (fps / 75) * height * 0.8 - height * 0.1;
            
            if (index === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        });
        
        ctx.stroke();
        
        // 添加网格
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.lineWidth = 1;
        
        for (let i = 0; i <= 4; i++) {
            const y = (i / 4) * height * 0.8 + height * 0.1;
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(width, y);
            ctx.stroke();
        }
    }
    
    updateInteractionLog() {
        const log = document.getElementById('interaction-log');
        if (!log) return;
        
        // 模拟交互日志
        const interactions = [
            '[14:32:25] 查看了照片 #8 "海边的日落"',
            '[14:32:18] 触发了流星雨特效',
            '[14:32:05] 切换了浪漫主题',
            '[14:31:52] 随机查看了照片 #12 "生日派对"',
            '[14:31:45] 开启了自动旋转',
            '[14:31:30] 上传了新照片 #15 "山顶日出"'
        ];
        
        log.innerHTML = interactions.map(item => `<div style="margin-bottom: 5px;">${item}</div>`).join('');
    }
    
    exportData() {
        const data = {
            timestamp: new Date().toISOString(),
            photos: this.getData('photos') || [],
            stats: {
                totalPhotos: this.getData('photo-count') || 0,
                sweetIndex: this.getData('sweet-index') || '95%',
                memoryCount: this.getData('memory-count') || 128,
                interactionCount: this.getData('interaction-count') || 0
            },
            performance: this.getData('performance') || []
        };
        
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `photo-sphere-stats-${Date.now()}.json`;
        a.click();
        
        URL.revokeObjectURL(url);
        
        this.showNotification('统计数据已导出！');
    }
    
    clearData() {
        localStorage.removeItem('stats-data');
        this.refreshData();
        this.showNotification('统计数据已清除');
    }
    
    getData(key) {
        const data = JSON.parse(localStorage.getItem('stats-data') || '{}');
        return data[key];
    }
    
    setData(key, value) {
        const data = JSON.parse(localStorage.getItem('stats-data') || '{}');
        data[key] = value;
        localStorage.setItem('stats-data', JSON.stringify(data));
    }
    
    showNotification(message) {
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #00ff88;
            color: #000;
            padding: 15px 20px;
            border-radius: 8px;
            z-index: 10001;
            font-family: 'Noto Sans SC', sans-serif;
            animation: slideIn 0.3s ease-out;
        `;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 3000);
    }
}

export default StatsDashboard;
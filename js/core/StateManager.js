/**
 * 状态管理器
 * 集中管理应用状态
 */

class StateManager {
    constructor() {
        this.state = {
            // 应用状态
            app: {
                isInitialized: false,
                isRunning: false,
                isPaused: false,
                currentMode: 'normal',
                theme: 'default'
            },
            
            // 性能状态
            performance: {
                fps: 0,
                frameTime: 0,
                memoryUsage: 0,
                drawCalls: 0,
                avgFps: 0
            },
            
            // 照片状态
            photos: {
                total: 0,
                current: 0,
                selected: null,
                list: [],
                categories: {}
            },
            
            // 用户状态
            user: {
                isAuthenticated: false,
                permissions: [],
                preferences: {
                    autoRotate: false,
                    heartbeatMode: false,
                    quality: 'high'
                }
            },
            
            // 特效状态
            effects: {
                activeEffects: [],
                particleCount: 0,
                meteorCount: 0
            }
        };
        
        this.subscribers = new Map();
        this.middlewares = [];
        
        console.log('[StateManager] 初始化完成');
    }
    
    /**
     * 获取状态
     */
    get(path = null) {
        if (!path) return this.state;
        
        return path.split('.').reduce((obj, key) => {
            return obj && obj[key] !== undefined ? obj[key] : null;
        }, this.state);
    }
    
    /**
     * 设置状态（触发更新）
     */
    set(path, value) {
        const keys = path.split('.');
        const lastKey = keys.pop();
        
        // 获取目标对象
        let target = this.state;
        for (const key of keys) {
            if (!target[key]) {
                target[key] = {};
            }
            target = target[key];
        }
        
        // 执行中间件
        const oldValue = target[lastKey];
        for (const middleware of this.middlewares) {
            const result = middleware(path, value, oldValue, this.state);
            if (result === false) {
                console.warn(`[StateManager] 状态更新被中间件阻止: ${path}`);
                return false;
            }
            if (result !== undefined) {
                value = result;
            }
        }
        
        // 更新状态
        target[lastKey] = value;
        
        // 触发订阅
        this.notify(path, value, oldValue);
        
        console.log(`[StateManager] 状态更新: ${path}`, value);
        return true;
    }
    
    /**
     * 订阅状态变化
     */
    subscribe(path, callback) {
        if (!this.subscribers.has(path)) {
            this.subscribers.set(path, new Set());
        }
        
        this.subscribers.get(path).add(callback);
        
        // 立即执行一次
        callback(this.get(path), null);
        
        // 返回取消订阅函数
        return () => {
            if (this.subscribers.has(path)) {
                this.subscribers.get(path).delete(callback);
            }
        };
    }
    
    /**
     * 通知订阅者
     */
    notify(path, value, oldValue) {
        // 通知精确路径的订阅者
        if (this.subscribers.has(path)) {
            for (const callback of this.subscribers.get(path)) {
                try {
                    callback(value, oldValue);
                } catch (error) {
                    console.error(`[StateManager] 订阅者处理失败: ${path}`, error);
                }
            }
        }
        
        // 通知父路径的订阅者
        const parentPath = path.split('.').slice(0, -1).join('.');
        if (parentPath && this.subscribers.has(parentPath)) {
            for (const callback of this.subscribers.get(parentPath)) {
                try {
                    callback(this.get(parentPath), null);
                } catch (error) {
                    console.error(`[StateManager] 父路径订阅者处理失败: ${parentPath}`, error);
                }
            }
        }
    }
    
    /**
     * 添加中间件
     */
    use(middleware) {
        if (typeof middleware !== 'function') {
            throw new Error('[StateManager] 中间件必须是函数');
        }
        this.middlewares.push(middleware);
    }
    
    /**
     * 批量更新状态（原子操作）
     */
    batch(updates) {
        const results = [];
        
        for (const [path, value] of Object.entries(updates)) {
            const result = this.set(path, value);
            results.push({ path, value, success: result });
        }
        
        return results;
    }
    
    /**
     * 重置状态
     */
    reset() {
        this.state = {
            app: {
                isInitialized: false,
                isRunning: false,
                isPaused: false,
                currentMode: 'normal',
                theme: 'default'
            },
            performance: {
                fps: 0,
                frameTime: 0,
                memoryUsage: 0,
                drawCalls: 0,
                avgFps: 0
            },
            photos: {
                total: 0,
                current: 0,
                selected: null,
                list: [],
                categories: {}
            },
            user: {
                isAuthenticated: false,
                permissions: [],
                preferences: {
                    autoRotate: false,
                    heartbeatMode: false,
                    quality: 'high'
                }
            },
            effects: {
                activeEffects: [],
                particleCount: 0,
                meteorCount: 0
            }
        };
        
        this.notify('', null, null);
    }
    
    /**
     * 获取状态快照
     */
    snapshot() {
        return JSON.parse(JSON.stringify(this.state));
    }
    
    /**
     * 从快照恢复状态
     */
    restore(snapshot) {
        this.state = JSON.parse(JSON.stringify(snapshot));
        this.notify('', null, null);
    }
}

export default StateManager;
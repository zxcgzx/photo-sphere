/**
 * 事件总线
 * 解耦模块间通信
 */

class EventBus {
    constructor() {
        this.events = new Map();
        this.onceEvents = new Map();
        this.history = [];
        this.maxHistory = 100;
    }
    
    /**
     * 订阅事件
     */
    on(event, callback, context = null) {
        if (!this.events.has(event)) {
            this.events.set(event, new Set());
        }
        
        const handler = { callback, context };
        this.events.get(event).add(handler);
        
        return () => this.off(event, callback);
    }
    
    /**
     * 订阅一次性事件
     */
    once(event, callback, context = null) {
        if (!this.onceEvents.has(event)) {
            this.onceEvents.set(event, new Set());
        }
        
        const handler = { callback, context };
        this.onceEvents.get(event).add(handler);
    }
    
    /**
     * 取消订阅
     */
    off(event, callback) {
        if (this.events.has(event)) {
            const handlers = this.events.get(event);
            for (const handler of handlers) {
                if (handler.callback === callback) {
                    handlers.delete(handler);
                    break;
                }
            }
        }
    }
    
    /**
     * 发布事件
     */
    emit(event, data = null) {
        // 记录历史
        this.history.push({
            event,
            data,
            timestamp: Date.now()
        });
        
        // 限制历史记录数量
        if (this.history.length > this.maxHistory) {
            this.history.shift();
        }
        
        // 执行一次性订阅
        if (this.onceEvents.has(event)) {
            const onceHandlers = this.onceEvents.get(event);
            for (const handler of onceHandlers) {
                try {
                    handler.callback.call(handler.context, data);
                } catch (error) {
                    console.error(`[EventBus] 一次性事件处理失败: ${event}`, error);
                }
            }
            this.onceEvents.delete(event);
        }
        
        // 执行普通订阅
        if (this.events.has(event)) {
            const handlers = this.events.get(event);
            for (const handler of handlers) {
                try {
                    handler.callback.call(handler.context, data);
                } catch (error) {
                    console.error(`[EventBus] 事件处理失败: ${event}`, error);
                }
            }
        }
        
        console.log(`[EventBus] 事件发布: ${event}`, data);
    }
    
    /**
     * 清空事件
     */
    clear(event = null) {
        if (event) {
            this.events.delete(event);
            this.onceEvents.delete(event);
        } else {
            this.events.clear();
            this.onceEvents.clear();
            this.history = [];
        }
    }
    
    /**
     * 获取事件历史
     */
    getHistory(event = null) {
        if (event) {
            return this.history.filter(h => h.event === event);
        }
        return this.history;
    }
    
    /**
     * 获取事件统计
     */
    getStats() {
        const stats = {
            totalEvents: this.history.length,
            events: {}
        };
        
        this.history.forEach(h => {
            if (!stats.events[h.event]) {
                stats.events[h.event] = 0;
            }
            stats.events[h.event]++;
        });
        
        return stats;
    }
}

// 创建全局事件总线实例
const eventBus = new EventBus();
export default eventBus;
/**
 * 依赖管理器
 * 统一管理外部依赖，避免重复加载
 */

// 外部依赖（从CDN加载）
import * as THREE from 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';
import * as TWEEN from 'https://cdnjs.cloudflare.com/ajax/libs/tween.js/18.6.4/tween.umd.js';

// 创建单例
class DependencyManager {
    constructor() {
        if (DependencyManager.instance) {
            return DependencyManager.instance;
        }
        
        this.dependencies = {
            THREE,
            TWEEN
        };
        
        // 暴露到全局（兼容旧代码）
        window.THREE = THREE;
        window.TWEEN = TWEEN;
        
        DependencyManager.instance = this;
    }
    
    get(name) {
        return this.dependencies[name];
    }
    
    getAll() {
        return { ...this.dependencies };
    }
}

// 创建并导出单例
const dependencyManager = new DependencyManager();
export const { THREE: THREE_LIB, TWEEN: TWEEN_LIB } = dependencyManager.getAll();
export default dependencyManager;
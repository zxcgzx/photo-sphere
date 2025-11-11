/**
 * 资源管理器
 * 统一管理3D资源，防止内存泄漏
 */

import { THREE_LIB as THREE } from './DependencyManager.js';

class ResourceManager {
    constructor() {
        this.resources = {
            geometries: new Map(),
            materials: new Map(),
            textures: new Map(),
            meshes: new Map(),
            shaders: new Map()
        };
        
        this.stats = {
            totalGeometries: 0,
            totalMaterials: 0,
            totalTextures: 0,
            totalMeshes: 0,
            memoryUsage: 0
        };
        
        this.objectPool = new Map();
        
        console.log('[ResourceManager] 初始化完成');
    }
    
    /**
     * 注册几何体
     */
    registerGeometry(name, geometry) {
        if (this.resources.geometries.has(name)) {
            console.warn(`[ResourceManager] 几何体已存在: ${name}`);
            this.disposeGeometry(name);
        }
        
        this.resources.geometries.set(name, geometry);
        this.stats.totalGeometries++;
        
        console.log(`[ResourceManager] 注册几何体: ${name}`);
        return geometry;
    }
    
    /**
     * 获取几何体
     */
    getGeometry(name) {
        return this.resources.geometries.get(name);
    }
    
    /**
     * 释放几何体
     */
    disposeGeometry(name) {
        const geometry = this.resources.geometries.get(name);
        if (geometry) {
            geometry.dispose();
            this.resources.geometries.delete(name);
            this.stats.totalGeometries--;
            console.log(`[ResourceManager] 释放几何体: ${name}`);
        }
    }
    
    /**
     * 注册材质
     */
    registerMaterial(name, material) {
        if (this.resources.materials.has(name)) {
            console.warn(`[ResourceManager] 材质已存在: ${name}`);
            this.disposeMaterial(name);
        }
        
        this.resources.materials.set(name, material);
        this.stats.totalMaterials++;
        
        console.log(`[ResourceManager] 注册材质: ${name}`);
        return material;
    }
    
    /**
     * 获取材质
     */
    getMaterial(name) {
        return this.resources.materials.get(name);
    }
    
    /**
     * 释放材质
     */
    disposeMaterial(name) {
        const material = this.resources.materials.get(name);
        if (material) {
            material.dispose();
            this.resources.materials.delete(name);
            this.stats.totalMaterials--;
            console.log(`[ResourceManager] 释放材质: ${name}`);
        }
    }
    
    /**
     * 注册纹理
     */
    registerTexture(name, texture) {
        if (this.resources.textures.has(name)) {
            console.warn(`[ResourceManager] 纹理已存在: ${name}`);
            this.disposeTexture(name);
        }
        
        this.resources.textures.set(name, texture);
        this.stats.totalTextures++;
        
        console.log(`[ResourceManager] 注册纹理: ${name}`);
        return texture;
    }
    
    /**
     * 获取纹理
     */
    getTexture(name) {
        return this.resources.textures.get(name);
    }
    
    /**
     * 释放纹理
     */
    disposeTexture(name) {
        const texture = this.resources.textures.get(name);
        if (texture) {
            texture.dispose();
            this.resources.textures.delete(name);
            this.stats.totalTextures--;
            console.log(`[ResourceManager] 释放纹理: ${name}`);
        }
    }
    
    /**
     * 注册网格
     */
    registerMesh(name, mesh) {
        if (this.resources.meshes.has(name)) {
            console.warn(`[ResourceManager] 网格已存在: ${name}`);
            this.disposeMesh(name);
        }
        
        this.resources.meshes.set(name, mesh);
        this.stats.totalMeshes++;
        
        console.log(`[ResourceManager] 注册网格: ${name}`);
        return mesh;
    }
    
    /**
     * 获取网格
     */
    getMesh(name) {
        return this.resources.meshes.get(name);
    }
    
    /**
     * 释放网格
     */
    disposeMesh(name) {
        const mesh = this.resources.meshes.get(name);
        if (mesh) {
            // 释放几何体和材质
            if (mesh.geometry) {
                mesh.geometry.dispose();
            }
            if (mesh.material) {
                if (Array.isArray(mesh.material)) {
                    mesh.material.forEach(m => m.dispose());
                } else {
                    mesh.material.dispose();
                }
            }
            
            this.resources.meshes.delete(name);
            this.stats.totalMeshes--;
            console.log(`[ResourceManager] 释放网格: ${name}`);
        }
    }
    
    /**
     * 从对象池获取对象
     */
    acquireFromPool(type, createFn) {
        if (!this.objectPool.has(type)) {
            this.objectPool.set(type, []);
        }
        
        const pool = this.objectPool.get(type);
        
        if (pool.length > 0) {
            console.log(`[ResourceManager] 从对象池获取: ${type}`);
            return pool.pop();
        }
        
        console.log(`[ResourceManager] 创建新对象: ${type}`);
        return createFn();
    }
    
    /**
     * 归还对象到对象池
     */
    releaseToPool(type, object, resetFn = null) {
        if (!this.objectPool.has(type)) {
            this.objectPool.set(type, []);
        }
        
        const pool = this.objectPool.get(type);
        
        // 重置对象
        if (resetFn) {
            resetFn(object);
        }
        
        // 限制池大小
        if (pool.length < 100) {
            pool.push(object);
            console.log(`[ResourceManager] 归还到对象池: ${type}`);
        } else {
            console.warn(`[ResourceManager] 对象池已满，释放对象: ${type}`);
            this.disposeObject(object);
        }
    }
    
    /**
     * 释放对象
     */
    disposeObject(object) {
        if (object.geometry) {
            object.geometry.dispose();
        }
        if (object.material) {
            if (Array.isArray(object.material)) {
                object.material.forEach(m => m.dispose());
            } else {
                object.material.dispose();
            }
        }
    }
    
    /**
     * 清理所有资源
     */
    disposeAll() {
        console.log('[ResourceManager] 开始清理所有资源...');
        
        // 释放几何体
        for (const [name, geometry] of this.resources.geometries) {
            geometry.dispose();
            console.log(`[ResourceManager] 释放几何体: ${name}`);
        }
        this.resources.geometries.clear();
        
        // 释放材质
        for (const [name, material] of this.resources.materials) {
            material.dispose();
            console.log(`[ResourceManager] 释放材质: ${name}`);
        }
        this.resources.materials.clear();
        
        // 释放纹理
        for (const [name, texture] of this.resources.textures) {
            texture.dispose();
            console.log(`[ResourceManager] 释放纹理: ${name}`);
        }
        this.resources.textures.clear();
        
        // 释放网格
        for (const [name, mesh] of this.resources.meshes) {
            this.disposeObject(mesh);
            console.log(`[ResourceManager] 释放网格: ${name}`);
        }
        this.resources.meshes.clear();
        
        // 清空对象池
        this.objectPool.clear();
        
        // 重置统计
        this.stats = {
            totalGeometries: 0,
            totalMaterials: 0,
            totalTextures: 0,
            totalMeshes: 0,
            memoryUsage: 0
        };
        
        console.log('[ResourceManager] 所有资源已清理');
    }
    
    /**
     * 获取资源统计
     */
    getStats() {
        return {
            ...this.stats,
            poolSize: Array.from(this.objectPool.values()).reduce((sum, pool) => sum + pool.length, 0)
        };
    }
    
    /**
     * 打印资源报告
     */
    printReport() {
        console.log('========== 资源管理报告 ==========');
        console.log(`几何体: ${this.stats.totalGeometries}`);
        console.log(`材质: ${this.stats.totalMaterials}`);
        console.log(`纹理: ${this.stats.totalTextures}`);
        console.log(`网格: ${this.stats.totalMeshes}`);
        console.log(`对象池大小: ${this.getStats().poolSize}`);
        console.log('===================================');
    }
}

export default ResourceManager;
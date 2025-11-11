/**
 * Instanced 流星系统
 * 使用 InstancedMesh 实现高性能流星雨
 */

import { THREE_LIB as THREE } from '../core/DependencyManager.js';

class InstancedMeteorSystem {
    constructor(scene, config = {}) {
        this.scene = scene;
        this.config = {
            maxMeteors: 50,
            layers: 3, // 近景、中景、远景
            ...config
        };
        
        this.meteorLayers = [];
        this.activeMeteors = [];
        this.clock = new THREE.Clock();
        
        this.init();
    }
    
    init() {
        // 创建流星几何体（简单的椭球）
        const meteorGeometry = new THREE.SphereGeometry(1, 8, 6);
        meteorGeometry.scale(1, 0.7, 1.3); // 椭球形状
        
        // 创建拖尾几何体
        const trailGeometry = new THREE.CylinderGeometry(0.1, 0.5, 1, 6);
        trailGeometry.translate(0, 0.5, 0); // 底部在原点
        
        // 为每层创建 InstancedMesh
        for (let layer = 0; layer < this.config.layers; layer++) {
            const layerConfig = this.createLayerConfig(layer);
            
            // 流星头
            const meteorMaterial = new THREE.MeshBasicMaterial({
                transparent: true,
                blending: THREE.AdditiveBlending
            });
            
            const meteorInstanced = new THREE.InstancedMesh(
                meteorGeometry,
                meteorMaterial,
                layerConfig.maxMeteors
            );
            
            meteorInstanced.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
            this.scene.add(meteorInstanced);
            
            // 拖尾
            const trailMaterial = new THREE.MeshBasicMaterial({
                transparent: true,
                blending: THREE.AdditiveBlending,
                opacity: 0.6
            });
            
            const trailInstanced = new THREE.InstancedMesh(
                trailGeometry,
                trailMaterial,
                layerConfig.maxMeteors
            );
            
            trailInstanced.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
            this.scene.add(trailInstanced);
            
            this.meteorLayers.push({
                layer,
                meteorInstanced,
                trailInstanced,
                config: layerConfig,
                meteors: []
            });
        }
    }
    
    createLayerConfig(layer) {
        const configs = [
            // 近景
            {
                distance: 200,
                speed: 80,
                size: 2,
                opacity: 0.9,
                maxMeteors: 10
            },
            // 中景
            {
                distance: 400,
                speed: 60,
                size: 1.5,
                opacity: 0.7,
                maxMeteors: 15
            },
            // 远景
            {
                distance: 600,
                speed: 40,
                size: 1,
                opacity: 0.5,
                maxMeteors: 20
            }
        ];
        
        return configs[layer] || configs[1];
    }
    
    /**
     * 创建流星雨
     */
    createMeteorShower(count = 20, options = {}) {
        const defaults = {
            color: 0xffffff,
            layer: 'all', // 'near', 'mid', 'far', 'all'
            targetPosition: null, // 目标照片位置
            spread: 500,
            duration: 3000
        };
        
        const config = { ...defaults, ...options };
        
        const layerIndices = config.layer === 'all' 
            ? [0, 1, 2] 
            : [this.getLayerIndex(config.layer)];
        
        layerIndices.forEach(layerIndex => {
            const layer = this.meteorLayers[layerIndex];
            const layerCount = Math.floor(count / layerIndices.length);
            
            for (let i = 0; i < layerCount; i++) {
                setTimeout(() => {
                    this.createMeteor(layer, config);
                }, i * 150); // 错开时间
            }
        });
    }
    
    createMeteor(layer, options) {
        const layerConfig = layer.config;
        
        // 随机起始位置（天空区域）
        const startX = (Math.random() - 0.5) * options.spread;
        const startY = 400 + Math.random() * 200;
        const startZ = layerConfig.distance * (0.8 + Math.random() * 0.4);
        
        // 计算速度（朝向目标或随机）
        let velocity;
        if (options.targetPosition) {
            // 朝向目标
            const direction = new THREE.Vector3()
                .subVectors(options.targetPosition, new THREE.Vector3(startX, startY, startZ))
                .normalize();
            velocity = direction.multiplyScalar(layerConfig.speed);
        } else {
            // 随机方向
            velocity = new THREE.Vector3(
                -30 - Math.random() * 40,
                -50 - Math.random() * 50,
                (Math.random() - 0.5) * 20
            ).normalize().multiplyScalar(layerConfig.speed);
        }
        
        const meteor = {
            id: Math.random().toString(36).substr(2, 9),
            position: new THREE.Vector3(startX, startY, startZ),
            velocity: velocity,
            life: 1.0,
            maxLife: options.duration / 1000,
            size: layerConfig.size * (0.8 + Math.random() * 0.4),
            color: options.color,
            layer: layer.layer,
            trailPositions: []
        };
        
        // 初始化拖尾位置
        for (let i = 0; i < 10; i++) {
            meteor.trailPositions.push(meteor.position.clone());
        }
        
        layer.meteors.push(meteor);
        this.activeMeteors.push(meteor);
    }
    
    getLayerIndex(layerName) {
        const map = { 'near': 0, 'mid': 1, 'far': 2 };
        return map[layerName] || 1;
    }
    
    /**
     * 更新流星
     */
    update(deltaTime) {
        this.meteorLayers.forEach(layer => {
            layer.meteors = layer.meteors.filter(meteor => {
                // 更新位置
                meteor.position.add(meteor.velocity.clone().multiplyScalar(deltaTime));
                
                // 更新拖尾
                meteor.trailPositions.unshift(meteor.position.clone());
                meteor.trailPositions = meteor.trailPositions.slice(0, 10);
                
                // 更新生命周期
                meteor.life -= deltaTime / meteor.maxLife;
                
                // 更新 InstancedMesh
                this.updateMeteorInstance(layer, meteor);
                
                // 移除死亡的流星
                if (meteor.life <= 0) {
                    this.hideMeteorInstance(layer, meteor);
                    return false;
                }
                
                return true;
            });
        });
        
        // 清理 activeMeteors
        this.activeMeteors = this.activeMeteors.filter(meteor => meteor.life > 0);
    }
    
    updateMeteorInstance(layer, meteor) {
        const matrix = new THREE.Matrix4();
        const color = new THREE.Color(meteor.color);
        
        // 流星头
        matrix.setPosition(meteor.position);
        matrix.scale(new THREE.Vector3(meteor.size, meteor.size * 0.7, meteor.size * 1.3));
        
        const index = this.activeMeteors.indexOf(meteor) % layer.config.maxMeteors;
        layer.meteorInstanced.setMatrixAt(index, matrix);
        layer.meteorInstanced.setColorAt(index, color);
        
        // 拖尾
        if (meteor.trailPositions.length > 1) {
            const trailStart = meteor.trailPositions[0];
            const trailEnd = meteor.trailPositions[meteor.trailPositions.length - 1];
            const trailDirection = new THREE.Vector3().subVectors(trailStart, trailEnd);
            const trailLength = trailDirection.length();
            
            if (trailLength > 0) {
                const trailMatrix = new THREE.Matrix4();
                const trailPosition = trailStart.clone().lerp(trailEnd, 0.5);
                
                trailMatrix.setPosition(trailPosition);
                trailMatrix.lookAt(trailStart, trailEnd, new THREE.Vector3(0, 1, 0));
                trailMatrix.scale(new THREE.Vector3(meteor.size * 0.5, trailLength, meteor.size * 0.5));
                
                layer.trailInstanced.setMatrixAt(index, trailMatrix);
                layer.trailInstanced.setColorAt(index, color);
            }
        }
        
        layer.meteorInstanced.instanceMatrix.needsUpdate = true;
        layer.trailInstanced.instanceMatrix.needsUpdate = true;
        
        if (layer.meteorInstanced.instanceColor) {
            layer.meteorInstanced.instanceColor.needsUpdate = true;
        }
        if (layer.trailInstanced.instanceColor) {
            layer.trailInstanced.instanceColor.needsUpdate = true;
        }
    }
    
    hideMeteorInstance(layer, meteor) {
        const index = this.activeMeteors.indexOf(meteor) % layer.config.maxMeteors;
        const matrix = new THREE.Matrix4();
        matrix.setPosition(0, -10000, 0); // 移到远处
        
        layer.meteorInstanced.setMatrixAt(index, matrix);
        layer.trailInstanced.setMatrixAt(index, matrix);
        
        layer.meteorInstanced.instanceMatrix.needsUpdate = true;
        layer.trailInstanced.instanceMatrix.needsUpdate = true;
    }
    
    /**
     * 获取活跃的流星数量
     */
    getActiveMeteorCount() {
        return this.activeMeteors.length;
    }
    
    /**
     * 销毁
     */
    dispose() {
        this.meteorLayers.forEach(layer => {
            this.scene.remove(layer.meteorInstanced);
            this.scene.remove(layer.trailInstanced);
            layer.meteorInstanced.geometry.dispose();
            layer.meteorInstanced.material.dispose();
            layer.trailInstanced.geometry.dispose();
            layer.trailInstanced.material.dispose();
        });
        
        this.meteorLayers = [];
        this.activeMeteors = [];
    }
}

export default InstancedMeteorSystem;
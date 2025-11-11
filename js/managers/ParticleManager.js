/**
 * 粒子系统管理器
 * 负责GPU加速粒子系统、物理模拟和粒子特效
 * @version 4.1.0
 */

import { THREE_LIB as THREE } from '../core/DependencyManager.js';

export class ParticleManager {
    constructor(scene, config = {}, performanceManager) {
        this.scene = scene;
        this.config = {
            maxParticles: 1500,
            physicsEnabled: true,
            collisionDetection: true,
            gpuAcceleration: true,
            particleSize: 2.0,
            particleColor: 0x9bb5ff,
            emissionRate: 10,
            lifeTime: 5000,
            ...config
        };
        
        this.performanceManager = performanceManager;
        
        // 粒子状态
        this.particles = [];
        this.particleCount = 0;
        this.emitters = new Map();
        
        // GPU粒子系统
        this.gpuParticles = null;
        this.particleTexture = null;
        this.particleMaterial = null;
        this.particleGeometry = null;
        
        // 物理模拟
        this.physics = {
            gravity: new THREE.Vector3(0, -0.01, 0),
            wind: new THREE.Vector3(0.001, 0, 0),
            damping: 0.99
        };
        
        // 初始化
        this.init();
        
        console.log('[ParticleManager] 粒子系统管理器初始化完成');
    }
    
    /**
     * 初始化粒子系统
     */
    init() {
        try {
            this.performanceManager?.mark('particle_init_start');
            
            if (this.config.gpuAcceleration) {
                this.initGPUParticles();
            } else {
                this.initCPUParticles();
            }
            
            this.performanceManager?.mark('particle_init_complete');
            this.performanceManager?.measure('particle_init', 'particle_init_start', 'particle_init_complete');
            
        } catch (error) {
            throw new Error(`粒子系统初始化失败: ${error.message}`);
        }
    }
    
    /**
     * 初始化GPU粒子系统
     */
    initGPUParticles() {
        // 创建粒子纹理
        this.particleTexture = this.createParticleTexture();
        
        // 创建粒子着色器材质
        this.particleMaterial = new THREE.ShaderMaterial({
            uniforms: {
                time: { value: 0 },
                particleTexture: { value: this.particleTexture },
                particleSize: { value: this.config.particleSize },
                particleColor: { value: new THREE.Color(this.config.particleColor) },
                opacity: { value: 0.8 }
            },
            vertexShader: `
                attribute float size;
                attribute float life;
                attribute vec3 velocity;
                
                varying float vLife;
                varying vec3 vPosition;
                
                uniform float time;
                uniform float particleSize;
                
                void main() {
                    vLife = life;
                    vPosition = position;
                    
                    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
                    gl_PointSize = size * particleSize * (300.0 / -mvPosition.z);
                    gl_Position = projectionMatrix * mvPosition;
                }
            `,
            fragmentShader: `
                uniform sampler2D particleTexture;
                uniform vec3 particleColor;
                uniform float opacity;
                
                varying float vLife;
                varying vec3 vPosition;
                
                void main() {
                    vec4 texColor = texture2D(particleTexture, gl_PointCoord);
                    float alpha = texColor.a * vLife * opacity;
                    
                    // 边缘淡化
                    float dist = distance(gl_PointCoord, vec2(0.5));
                    alpha *= 1.0 - smoothstep(0.3, 0.5, dist);
                    
                    gl_FragColor = vec4(particleColor, alpha);
                }
            `,
            transparent: true,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });
        
        // 创建粒子几何体
        this.particleGeometry = new THREE.BufferGeometry();
        
        // 创建缓冲区
        const positions = new Float32Array(this.config.maxParticles * 3);
        const sizes = new Float32Array(this.config.maxParticles);
        const lives = new Float32Array(this.config.maxParticles);
        const velocities = new Float32Array(this.config.maxParticles * 3);
        
        this.particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        this.particleGeometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
        this.particleGeometry.setAttribute('life', new THREE.BufferAttribute(lives, 1));
        this.particleGeometry.setAttribute('velocity', new THREE.BufferAttribute(velocities, 3));
        
        // 创建粒子系统
        this.gpuParticles = new THREE.Points(this.particleGeometry, this.particleMaterial);
        this.gpuParticles.name = 'GPUParticles';
        this.scene.add(this.gpuParticles);
        
        console.log('[ParticleManager] GPU粒子系统已初始化');
    }
    
    /**
     * 初始化CPU粒子系统
     */
    initCPUParticles() {
        // 创建基础粒子
        for (let i = 0; i < this.config.maxParticles; i++) {
            this.particles.push({
                position: new THREE.Vector3(),
                velocity: new THREE.Vector3(),
                acceleration: new THREE.Vector3(),
                size: 1.0,
                life: 0,
                maxLife: 100,
                active: false,
                color: new THREE.Color(this.config.particleColor)
            });
        }
        
        console.log('[ParticleManager] CPU粒子系统已初始化');
    }
    
    /**
     * 创建粒子纹理
     */
    createParticleTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 64;
        canvas.height = 64;
        
        const ctx = canvas.getContext('2d');
        const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
        gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
        gradient.addColorStop(0.2, 'rgba(255, 255, 255, 0.8)');
        gradient.addColorStop(0.4, 'rgba(255, 255, 255, 0.4)');
        gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
        
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 64, 64);
        
        const texture = new THREE.CanvasTexture(canvas);
        texture.needsUpdate = true;
        
        return texture;
    }
    
    /**
     * 创建发射器
     */
    createEmitter(id, config = {}) {
        const emitter = {
            id,
            position: config.position || new THREE.Vector3(),
            velocity: config.velocity || new THREE.Vector3(),
            emissionRate: config.emissionRate || this.config.emissionRate,
            particleCount: config.particleCount || 10,
            lifeTime: config.lifeTime || this.config.lifeTime,
            particleSize: config.particleSize || this.config.particleSize,
            particleColor: config.particleColor || this.config.particleColor,
            active: false,
            lastEmitTime: 0
        };
        
        this.emitters.set(id, emitter);
        
        return emitter;
    }
    
    /**
     * 启动发射器
     */
    startEmitter(id) {
        const emitter = this.emitters.get(id);
        if (emitter) {
            emitter.active = true;
            console.log(`[ParticleManager] 发射器已启动: ${id}`);
        }
    }
    
    /**
     * 停止发射器
     */
    stopEmitter(id) {
        const emitter = this.emitters.get(id);
        if (emitter) {
            emitter.active = false;
            console.log(`[ParticleManager] 发射器已停止: ${id}`);
        }
    }
    
    /**
     * 移除发射器
     */
    removeEmitter(id) {
        this.stopEmitter(id);
        this.emitters.delete(id);
        console.log(`[ParticleManager] 发射器已移除: ${id}`);
    }
    
    /**
     * 发射粒子
     */
    emit(emitterId, count = 1) {
        const emitter = this.emitters.get(emitterId);
        if (!emitter || !emitter.active) return;
        
        const currentTime = Date.now();
        if (currentTime - emitter.lastEmitTime < 1000 / emitter.emissionRate) return;
        
        emitter.lastEmitTime = currentTime;
        
        for (let i = 0; i < count && this.particleCount < this.config.maxParticles; i++) {
            if (this.config.gpuAcceleration) {
                this.emitGPUParticle(emitter);
            } else {
                this.emitCPUParticle(emitter);
            }
        }
    }
    
    /**
     * 发射GPU粒子
     */
    emitGPUParticle(emitter) {
        const positions = this.particleGeometry.attributes.position.array;
        const sizes = this.particleGeometry.attributes.size.array;
        const lives = this.particleGeometry.attributes.life.array;
        const velocities = this.particleGeometry.attributes.velocity.array;
        
        const index = this.particleCount;
        
        // 位置
        positions[index * 3] = emitter.position.x + (Math.random() - 0.5) * 20;
        positions[index * 3 + 1] = emitter.position.y + (Math.random() - 0.5) * 20;
        positions[index * 3 + 2] = emitter.position.z + (Math.random() - 0.5) * 20;
        
        // 大小
        sizes[index] = emitter.particleSize * (0.5 + Math.random() * 0.5);
        
        // 生命周期
        lives[index] = 1.0;
        
        // 速度
        velocities[index * 3] = emitter.velocity.x + (Math.random() - 0.5) * 0.1;
        velocities[index * 3 + 1] = emitter.velocity.y + (Math.random() - 0.5) * 0.1;
        velocities[index * 3 + 2] = emitter.velocity.z + (Math.random() - 0.5) * 0.1;
        
        this.particleCount++;
    }
    
    /**
     * 发射CPU粒子
     */
    emitCPUParticle(emitter) {
        const particle = this.particles.find(p => !p.active);
        if (!particle) return;
        
        particle.position.copy(emitter.position);
        particle.position.add(new THREE.Vector3(
            (Math.random() - 0.5) * 20,
            (Math.random() - 0.5) * 20,
            (Math.random() - 0.5) * 20
        ));
        
        particle.velocity.copy(emitter.velocity);
        particle.velocity.add(new THREE.Vector3(
            (Math.random() - 0.5) * 0.1,
            (Math.random() - 0.5) * 0.1,
            (Math.random() - 0.5) * 0.1
        ));
        
        particle.acceleration.set(0, 0, 0);
        particle.size = emitter.particleSize * (0.5 + Math.random() * 0.5);
        particle.life = emitter.lifeTime;
        particle.maxLife = emitter.lifeTime;
        particle.active = true;
        
        this.particleCount++;
    }
    
    /**
     * 更新粒子系统
     */
    update(deltaTime, currentTime) {
        const time = currentTime * 0.001;
        
        if (this.config.gpuAcceleration) {
            this.updateGPUParticles(deltaTime, time);
        } else {
            this.updateCPUParticles(deltaTime);
        }
        
        // 更新发射器
        this.emitters.forEach(emitter => {
            if (emitter.active) {
                this.emit(emitter.id, emitter.particleCount);
            }
        });
    }
    
    /**
     * 更新GPU粒子
     */
    updateGPUParticles(deltaTime, time) {
        // 更新着色器uniform
        this.particleMaterial.uniforms.time.value = time;
        
        const positions = this.particleGeometry.attributes.position.array;
        const lives = this.particleGeometry.attributes.life.array;
        const velocities = this.particleGeometry.attributes.velocity.array;
        
        let activeCount = 0;
        
        for (let i = 0; i < this.particleCount; i++) {
            // 更新生命周期
            lives[i] -= deltaTime / 1000;
            
            if (lives[i] <= 0) {
                // 粒子死亡，移除
                this.removeParticle(i);
                continue;
            }
            
            // 更新位置
            if (this.config.physicsEnabled) {
                positions[i * 3] += velocities[i * 3] * deltaTime;
                positions[i * 3 + 1] += velocities[i * 3 + 1] * deltaTime;
                positions[i * 3 + 2] += velocities[i * 3 + 2] * deltaTime;
                
                // 应用重力
                velocities[i * 3 + 1] += this.physics.gravity.y * deltaTime;
                
                // 应用风
                velocities[i * 3] += this.physics.wind.x * deltaTime;
                
                // 应用阻尼
                velocities[i * 3] *= this.physics.damping;
                velocities[i * 3 + 1] *= this.physics.damping;
                velocities[i * 3 + 2] *= this.physics.damping;
            }
            
            activeCount++;
        }
        
        // 更新缓冲区
        this.particleGeometry.attributes.position.needsUpdate = true;
        this.particleGeometry.attributes.life.needsUpdate = true;
        this.particleGeometry.attributes.velocity.needsUpdate = true;
        
        this.particleCount = activeCount;
    }
    
    /**
     * 更新CPU粒子
     */
    updateCPUParticles(deltaTime) {
        let activeCount = 0;
        
        this.particles.forEach(particle => {
            if (!particle.active) return;
            
            // 更新生命周期
            particle.life -= deltaTime;
            
            if (particle.life <= 0) {
                particle.active = false;
                return;
            }
            
            // 更新物理
            if (this.config.physicsEnabled) {
                // 更新速度
                particle.velocity.add(particle.acceleration.clone().multiplyScalar(deltaTime * 0.001));
                
                // 应用重力
                particle.velocity.add(this.physics.gravity.clone().multiplyScalar(deltaTime * 0.001));
                
                // 应用风
                particle.velocity.add(this.physics.wind.clone().multiplyScalar(deltaTime * 0.001));
                
                // 应用阻尼
                particle.velocity.multiplyScalar(this.physics.damping);
                
                // 更新位置
                particle.position.add(particle.velocity.clone().multiplyScalar(deltaTime * 0.1));
            }
            
            activeCount++;
        });
        
        this.particleCount = activeCount;
    }
    
    /**
     * 移除粒子
     */
    removeParticle(index) {
        const positions = this.particleGeometry.attributes.position.array;
        const lives = this.particleGeometry.attributes.life.array;
        
        // 将最后一个粒子移到当前位置
        const lastIndex = this.particleCount - 1;
        
        if (index !== lastIndex) {
            positions[index * 3] = positions[lastIndex * 3];
            positions[index * 3 + 1] = positions[lastIndex * 3 + 1];
            positions[index * 3 + 2] = positions[lastIndex * 3 + 2];
            
            lives[index] = lives[lastIndex];
        }
        
        // 减少粒子计数
        this.particleCount--;
    }
    
    /**
     * 创建特效
     */
    createEffect(effectType, position, options = {}) {
        switch (effectType) {
            case 'explosion':
                this.createExplosion(position, options);
                break;
            case 'trail':
                this.createTrail(position, options);
                break;
            case 'aura':
                this.createAura(position, options);
                break;
            case 'heartbeat':
                this.createHeartbeat(position, options);
                break;
        }
    }
    
    /**
     * 创建爆炸效果
     */
    createExplosion(position, options = {}) {
        const emitter = this.createEmitter(`explosion_${Date.now()}`, {
            position: position.clone(),
            velocity: new THREE.Vector3(),
            emissionRate: 100,
            particleCount: 50,
            lifeTime: 2000,
            particleColor: options.color || 0xff6600
        });
        
        this.startEmitter(emitter.id);
        
        setTimeout(() => {
            this.removeEmitter(emitter.id);
        }, 3000);
    }
    
    /**
     * 创建轨迹效果
     */
    createTrail(position, options = {}) {
        const emitter = this.createEmitter(`trail_${Date.now()}`, {
            position: position.clone(),
            velocity: options.velocity || new THREE.Vector3(),
            emissionRate: 30,
            particleCount: 5,
            lifeTime: 1000,
            particleColor: options.color || 0x9bb5ff
        });
        
        this.startEmitter(emitter.id);
        
        return emitter.id;
    }
    
    /**
     * 创建光环效果
     */
    createAura(position, options = {}) {
        const emitter = this.createEmitter(`aura_${Date.now()}`, {
            position: position.clone(),
            velocity: new THREE.Vector3(),
            emissionRate: 50,
            particleCount: 20,
            lifeTime: 3000,
            particleColor: options.color || 0x9bb5ff
        });
        
        this.startEmitter(emitter.id);
        
        return emitter.id;
    }
    
    /**
     * 创建心跳效果
     */
    createHeartbeat(position, options = {}) {
        const emitter = this.createEmitter(`heartbeat_${Date.now()}`, {
            position: position.clone(),
            velocity: new THREE.Vector3(),
            emissionRate: 80,
            particleCount: 30,
            lifeTime: 1500,
            particleColor: options.color || 0xff1493
        });
        
        this.startEmitter(emitter.id);
        
        // 心跳节奏
        const heartbeatInterval = setInterval(() => {
            if (!this.emitters.has(emitter.id)) {
                clearInterval(heartbeatInterval);
                return;
            }
            
            this.emit(emitter.id, 60);
        }, 800);
        
        return emitter.id;
    }
    
    /**
     * 获取粒子统计
     */
    getStats() {
        return {
            activeParticles: this.particleCount,
            maxParticles: this.config.maxParticles,
            activeEmitters: this.emitters.size,
            gpuAcceleration: this.config.gpuAcceleration,
            physicsEnabled: this.config.physicsEnabled
        };
    }
    
    /**
     * 清理粒子系统
     */
    destroy() {
        // 停止所有发射器
        this.emitters.forEach(emitter => {
            this.stopEmitter(emitter.id);
        });
        this.emitters.clear();
        
        // 清理GPU粒子系统
        if (this.gpuParticles) {
            this.scene.remove(this.gpuParticles);
            
            if (this.particleGeometry) {
                this.particleGeometry.dispose();
            }
            
            if (this.particleMaterial) {
                this.particleMaterial.dispose();
            }
            
            if (this.particleTexture) {
                this.particleTexture.dispose();
            }
            
            this.gpuParticles = null;
        }
        
        // 清理粒子数组
        this.particles = [];
        this.particleCount = 0;
        
        console.log('[ParticleManager] 粒子系统已销毁');
    }
}

// 导出粒子管理器
export default ParticleManager;

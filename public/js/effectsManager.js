/**
 * 高级特效管理器
 * 实现真实的粒子效果、运动模糊、光晕等
 */

import { CONFIG } from './config.js';

class EffectsManager {
    constructor(sceneManager) {
        this.config = CONFIG;
        this.sceneManager = sceneManager;
        this.scene = sceneManager.scene;
        this.renderer = sceneManager.renderer;
        
        // 特效存储
        this.activeEffects = new Set();
        this.particleSystems = [];
        this.trails = [];
        
        // 性能优化
        this.clock = new THREE.Clock();
        this.frameCount = 0;
        
        // 预计算
        this.tempVector = new THREE.Vector3();
        this.tempColor = new THREE.Color();
        
        this.init();
    }
    
    init() {
        // 创建特效材质库
        this.createEffectMaterials();
    }
    
    /**
     * 创建特效材质库
     */
    createEffectMaterials() {
        this.materials = {
            // 流星材质 - 带发光效果
            meteor: new THREE.ShaderMaterial({
                uniforms: {
                    time: { value: 0 },
                    color: { value: new THREE.Color(0xffffff) },
                    opacity: { value: 1.0 }
                },
                vertexShader: `
                    varying vec2 vUv;
                    varying vec3 vPosition;
                    
                    void main() {
                        vUv = uv;
                        vPosition = position;
                        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                    }
                `,
                fragmentShader: `
                    uniform float time;
                    uniform vec3 color;
                    uniform float opacity;
                    varying vec2 vUv;
                    varying vec3 vPosition;
                    
                    void main() {
                        float dist = distance(vUv, vec2(0.5));
                        float alpha = (1.0 - dist * 2.0) * opacity;
                        
                        // 添加发光效果
                        vec3 glow = color * (1.0 + sin(time * 10.0) * 0.3);
                        
                        gl_FragColor = vec4(glow, alpha);
                    }
                `,
                transparent: true,
                blending: THREE.AdditiveBlending,
                depthWrite: false
            }),
            
            // 粒子轨迹材质
            trail: new THREE.ShaderMaterial({
                uniforms: {
                    time: { value: 0 },
                    color: { value: new THREE.Color(0x88ccff) }
                },
                vertexShader: `
                    attribute float size;
                    attribute float life;
                    varying float vLife;
                    
                    void main() {
                        vLife = life;
                        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
                        gl_PointSize = size * (300.0 / -mvPosition.z);
                        gl_Position = projectionMatrix * mvPosition;
                    }
                `,
                fragmentShader: `
                    uniform float time;
                    uniform vec3 color;
                    varying float vLife;
                    
                    void main() {
                        float dist = distance(gl_PointCoord, vec2(0.5));
                        if (dist > 0.5) discard;
                        
                        float alpha = (1.0 - dist * 2.0) * vLife;
                        vec3 finalColor = color * vLife;
                        
                        gl_FragColor = vec4(finalColor, alpha);
                    }
                `,
                transparent: true,
                blending: THREE.AdditiveBlending,
                depthWrite: false
            })
        };
    }
    
    /**
     * 创建真实的流星效果
     */
    createRealisticMeteor(options = {}) {
        const defaults = {
            startPosition: new THREE.Vector3(0, 500, 0),
            velocity: new THREE.Vector3(-100, -150, 0),
            size: 2,
            color: 0xffffff,
            trailLength: 50,
            duration: 2000,
            gravity: -9.8
        };
        
        const config = { ...defaults, ...options };
        
        // 创建流星头
        const meteorHead = new THREE.Mesh(
            new THREE.SphereGeometry(config.size, 16, 16),
            this.materials.meteor.clone()
        );
        meteorHead.position.copy(config.startPosition);
        this.scene.add(meteorHead);
        
        // 创建粒子轨迹系统
        const trailGeometry = new THREE.BufferGeometry();
        const trailPositions = new Float32Array(config.trailLength * 3);
        const trailSizes = new Float32Array(config.trailLength);
        const trailLives = new Float32Array(config.trailLength);
        
        trailGeometry.setAttribute('position', new THREE.BufferAttribute(trailPositions, 3));
        trailGeometry.setAttribute('size', new THREE.BufferAttribute(trailSizes, 1));
        trailGeometry.setAttribute('life', new THREE.BufferAttribute(trailLives, 1));
        
        const trailMaterial = this.materials.trail.clone();
        trailMaterial.uniforms.color.value.setHex(config.color);
        
        const trail = new THREE.Points(trailGeometry, trailMaterial);
        this.scene.add(trail);
        
        // 存储流星数据
        const meteor = {
            head: meteorHead,
            trail: trail,
            velocity: config.velocity.clone(),
            positions: [],
            startTime: Date.now(),
            duration: config.duration,
            gravity: config.gravity,
            config: config
        };
        
        this.activeEffects.add(meteor);
        return meteor;
    }
    
    /**
     * 创建粒子爆炸效果
     */
    createParticleExplosion(position, options = {}) {
        const defaults = {
            count: 100,
            color: 0xffffff,
            size: 2,
            velocity: 50,
            gravity: -9.8,
            lifetime: 2000
        };
        
        const config = { ...defaults, ...options };
        
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(config.count * 3);
        const velocities = new Float32Array(config.count * 3);
        const lifetimes = new Float32Array(config.count);
        const sizes = new Float32Array(config.count);
        
        for (let i = 0; i < config.count; i++) {
            const i3 = i * 3;
            
            // 初始位置
            positions[i3] = position.x;
            positions[i3 + 1] = position.y;
            positions[i3 + 2] = position.z;
            
            // 随机速度
            const phi = Math.random() * Math.PI * 2;
            const theta = Math.random() * Math.PI;
            const speed = Math.random() * config.velocity;
            
            velocities[i3] = Math.sin(theta) * Math.cos(phi) * speed;
            velocities[i3 + 1] = Math.cos(theta) * speed;
            velocities[i3 + 2] = Math.sin(theta) * Math.sin(phi) * speed;
            
            lifetimes[i] = 1.0;
            sizes[i] = Math.random() * config.size + 0.5;
        }
        
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('velocity', new THREE.BufferAttribute(velocities, 3));
        geometry.setAttribute('life', new THREE.BufferAttribute(lifetimes, 1));
        geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
        
        const material = this.materials.trail.clone();
        material.uniforms.color.value.setHex(config.color);
        
        const particles = new THREE.Points(geometry, material);
        this.scene.add(particles);
        
        const effect = {
            type: 'explosion',
            mesh: particles,
            startTime: Date.now(),
            lifetime: config.lifetime,
            gravity: config.gravity
        };
        
        this.activeEffects.add(effect);
        return effect;
    }
    
    /**
     * 创建光晕效果
     */
    createGlowEffect(object, options = {}) {
        const defaults = {
            color: 0xffffff,
            intensity: 1.0,
            size: 1.5
        };
        
        const config = { ...defaults, ...options };
        
        // 创建光晕球体
        const glowGeometry = new THREE.SphereGeometry(config.size, 32, 32);
        const glowMaterial = new THREE.ShaderMaterial({
            uniforms: {
                color: { value: new THREE.Color(config.color) },
                intensity: { value: config.intensity }
            },
            vertexShader: `
                varying vec3 vNormal;
                void main() {
                    vNormal = normalize(normalMatrix * normal);
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                uniform vec3 color;
                uniform float intensity;
                varying vec3 vNormal;
                
                void main() {
                    float intensity = pow(0.7 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 2.0);
                    gl_FragColor = vec4(color, 1.0) * intensity * intensity;
                }
            `,
            transparent: true,
            blending: THREE.AdditiveBlending,
            side: THREE.BackSide
        });
        
        const glow = new THREE.Mesh(glowGeometry, glowMaterial);
        glow.position.copy(object.position);
        this.scene.add(glow);
        
        return glow;
    }
    
    /**
     * 更新所有特效
     */
    update() {
        const deltaTime = this.clock.getDelta();
        const currentTime = Date.now();
        
        // 更新材质时间
        Object.values(this.materials).forEach(material => {
            if (material.uniforms.time) {
                material.uniforms.time.value += deltaTime;
            }
        });
        
        // 更新流星
        this.updateMeteors(deltaTime, currentTime);
        
        // 更新粒子爆炸
        this.updateExplosions(deltaTime, currentTime);
        
        // 清理完成的特效
        this.cleanupEffects();
        
        this.frameCount++;
    }
    
    /**
     * 更新流星
     */
    updateMeteors(deltaTime, currentTime) {
        this.activeEffects.forEach(effect => {
            if (!effect.head) return;
            
            const elapsed = currentTime - effect.startTime;
            const progress = elapsed / effect.duration;
            
            if (progress >= 1) {
                // 特效结束
                this.scene.remove(effect.head);
                this.scene.remove(effect.trail);
                effect.head.geometry.dispose();
                effect.head.material.dispose();
                effect.trail.geometry.dispose();
                effect.trail.material.dispose();
                this.activeEffects.delete(effect);
                return;
            }
            
            // 更新物理
            effect.velocity.y += effect.gravity * deltaTime;
            effect.head.position.add(effect.velocity.clone().multiplyScalar(deltaTime));
            
            // 更新轨迹
            effect.positions.push(effect.head.position.clone());
            if (effect.positions.length > effect.config.trailLength) {
                effect.positions.shift();
            }
            
            // 更新几何体
            const positions = effect.trail.geometry.attributes.position.array;
            const lives = effect.trail.geometry.attributes.life.array;
            const sizes = effect.trail.geometry.attributes.size.array;
            
            for (let i = 0; i < effect.positions.length; i++) {
                const pos = effect.positions[i];
                positions[i * 3] = pos.x;
                positions[i * 3 + 1] = pos.y;
                positions[i * 3 + 2] = pos.z;
                
                lives[i] = (i / effect.positions.length) * (1 - progress);
                sizes[i] = effect.config.size * (1 - progress) * (i / effect.positions.length);
            }
            
            effect.trail.geometry.attributes.position.needsUpdate = true;
            effect.trail.geometry.attributes.life.needsUpdate = true;
            effect.trail.geometry.attributes.size.needsUpdate = true;
            
            // 更新透明度
            effect.head.material.uniforms.opacity.value = 1 - progress;
        });
    }
    
    /**
     * 更新爆炸效果
     */
    updateExplosions(deltaTime, currentTime) {
        this.activeEffects.forEach(effect => {
            if (effect.type !== 'explosion') return;
            
            const elapsed = currentTime - effect.startTime;
            const progress = elapsed / effect.lifetime;
            
            if (progress >= 1) {
                this.scene.remove(effect.mesh);
                effect.mesh.geometry.dispose();
                effect.mesh.material.dispose();
                this.activeEffects.delete(effect);
                return;
            }
            
            const positions = effect.mesh.geometry.attributes.position.array;
            const velocities = effect.mesh.geometry.attributes.velocity.array;
            const lives = effect.mesh.geometry.attributes.life.array;
            
            for (let i = 0; i < positions.length / 3; i++) {
                const i3 = i * 3;
                
                // 更新位置
                positions[i3] += velocities[i3] * deltaTime;
                positions[i3 + 1] += velocities[i3 + 1] * deltaTime;
                positions[i3 + 1] += effect.gravity * deltaTime * 10; // 重力
                positions[i3 + 2] += velocities[i3 + 2] * deltaTime;
                
                // 更新生命周期
                lives[i] = 1 - progress;
            }
            
            effect.mesh.geometry.attributes.position.needsUpdate = true;
            effect.mesh.geometry.attributes.life.needsUpdate = true;
        });
    }
    
    /**
     * 清理完成的特效
     */
    cleanupEffects() {
        // 自动在 update 中清理
    }
    
    /**
     * 创建流星雨
     */
    createMeteorShower(count = 10, options = {}) {
        const meteors = [];
        
        for (let i = 0; i < count; i++) {
            setTimeout(() => {
                const meteor = this.createRealisticMeteor({
                    startPosition: new THREE.Vector3(
                        (Math.random() - 0.5) * 2000,
                        800 + Math.random() * 500,
                        (Math.random() - 0.5) * 2000
                    ),
                    velocity: new THREE.Vector3(
                        -50 - Math.random() * 100,
                        -100 - Math.random() * 100,
                        (Math.random() - 0.5) * 50
                    ),
                    color: Math.random() > 0.7 ? 0xffaa00 : 0xffffff,
                    ...options
                });
                meteors.push(meteor);
            }, i * 200);
        }
        
        return meteors;
    }
    
    /**
     * 销毁特效管理器
     */
    dispose() {
        this.activeEffects.forEach(effect => {
            if (effect.head) {
                this.scene.remove(effect.head);
                effect.head.geometry.dispose();
                effect.head.material.dispose();
            }
            if (effect.trail) {
                this.scene.remove(effect.trail);
                effect.trail.geometry.dispose();
                effect.trail.material.dispose();
            }
            if (effect.mesh) {
                this.scene.remove(effect.mesh);
                effect.mesh.geometry.dispose();
                effect.mesh.material.dispose();
            }
        });
        
        Object.values(this.materials).forEach(material => {
            material.dispose();
        });
        
        this.activeEffects.clear();
    }
}

export default EffectsManager;
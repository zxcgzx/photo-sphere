/**
 * 艺术化特效管理器
 * 创造有生命力、自然、富有情感的视觉效果
 */

import { THREE_LIB as THREE } from '../core/DependencyManager.js';
import { CONFIG } from '../config.js';
import InstancedMeteorSystem from './InstancedMeteorSystem.js';

class EffectsManager {
    constructor(sceneManager) {
        this.config = CONFIG;
        this.sceneManager = sceneManager;
        this.scene = sceneManager.scene;
        this.renderer = sceneManager.renderer;
        this.camera = sceneManager.camera;
        
        // 特效存储
        this.activeEffects = new Set();
        this.particleSystems = [];
        this.mouseInfluence = new THREE.Vector2();
        
        // 性能优化
        this.clock = new THREE.Clock();
        this.frameCount = 0;
        
        // 预计算
        this.tempVector = new THREE.Vector3();
        this.tempColor = new THREE.Color();
        
        // 艺术化参数
        this.artisticParams = {
            turbulence: 0.15,           // 湍流强度
            colorVariation: 0.3,        // 颜色变化
            lifeVariation: 0.4,         // 生命周期变化
            speedVariation: 0.5,        // 速度变化
            sizeVariation: 0.6          // 大小变化
        };
        
        this.init();
    }
    
    init() {
        this.createEffectMaterials();
        this.setupMouseInteraction();
        this.initInstancedMeteorSystem();
    }
    
    /**
     * 初始化 Instanced 流星系统
     */
    initInstancedMeteorSystem() {
        this.instancedMeteorSystem = new InstancedMeteorSystem(this.scene, {
            maxMeteors: 50,
            layers: 3
        });
    }
    
    /**
     * 设置鼠标交互
     */
    setupMouseInteraction() {
        document.addEventListener('mousemove', (event) => {
            this.mouseInfluence.x = (event.clientX / window.innerWidth) * 2 - 1;
            this.mouseInfluence.y = -(event.clientY / window.innerHeight) * 2 + 1;
        });
    }
    
    /**
     * 创建特效材质库 - 艺术化版本
     */
    createEffectMaterials() {
        this.materials = {
            // 流星材质 - 燃烧效果
            meteor: new THREE.ShaderMaterial({
                uniforms: {
                    time: { value: 0 },
                    color: { value: new THREE.Color(0xffffff) },
                    intensity: { value: 1.0 },
                    temperature: { value: 1.0 }  // 温度影响颜色
                },
                vertexShader: `
                    varying vec2 vUv;
                    varying vec3 vPosition;
                    varying vec3 vNormal;
                    
                    void main() {
                        vUv = uv;
                        vPosition = position;
                        vNormal = normal;
                        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                    }
                `,
                fragmentShader: `
                    uniform float time;
                    uniform vec3 color;
                    uniform float intensity;
                    uniform float temperature;
                    varying vec2 vUv;
                    varying vec3 vPosition;
                    varying vec3 vNormal;
                    
                    // 噪声函数
                    float random(vec2 st) {
                        return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
                    }
                    
                    void main() {
                        vec2 center = vec2(0.5);
                        float dist = distance(vUv, center);
                        
                        // 温度色彩
                        vec3 hotColor = vec3(1.0, 0.8, 0.3);  // 橙色（炽热）
                        vec3 warmColor = vec3(1.0, 1.0, 0.8); // 黄白色
                        vec3 coolColor = vec3(0.8, 0.9, 1.0); // 蓝白色
                        
                        // 根据温度混合颜色
                        vec3 finalColor = mix(coolColor, warmColor, temperature);
                        finalColor = mix(finalColor, hotColor, temperature * temperature);
                        
                        // 添加噪声（燃烧效果）
                        float noise = random(vUv + time * 0.1);
                        finalColor += noise * 0.1;
                        
                        // 径向渐变
                        float alpha = (1.0 - dist * 2.0) * intensity;
                        alpha *= (0.8 + 0.2 * sin(time * 20.0)); // 闪烁
                        
                        // 边缘发光
                        float glow = exp(-dist * 3.0) * intensity;
                        finalColor += finalColor * glow * 0.5;
                        
                        gl_FragColor = vec4(finalColor, alpha);
                    }
                `,
                transparent: true,
                blending: THREE.AdditiveBlending,
                depthWrite: false
            }),
            
            // 粒子轨迹材质 - 火焰效果
            trail: new THREE.ShaderMaterial({
                uniforms: {
                    time: { value: 0 },
                    color: { value: new THREE.Color(0x88ccff) },
                    globalOpacity: { value: 1.0 }
                },
                vertexShader: `
                    attribute float size;
                    attribute float life;
                    attribute float temperature;
                    varying float vLife;
                    varying float vTemp;
                    
                    void main() {
                        vLife = life;
                        vTemp = temperature;
                        
                        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
                        gl_PointSize = size * (300.0 / -mvPosition.z) * life;
                        gl_Position = projectionMatrix * mvPosition;
                    }
                `,
                fragmentShader: `
                    uniform float time;
                    uniform vec3 color;
                    uniform float globalOpacity;
                    varying float vLife;
                    varying float vTemp;
                    
                    void main() {
                        vec2 center = vec2(0.5);
                        float dist = distance(gl_PointCoord, center);
                        if (dist > 0.5) discard;
                        
                        // 温度色彩
                        vec3 hotColor = vec3(1.0, 0.6, 0.0);
                        vec3 warmColor = vec3(1.0, 0.8, 0.4);
                        vec3 coolColor = color;
                        
                        vec3 finalColor = mix(coolColor, warmColor, vTemp);
                        finalColor = mix(finalColor, hotColor, vTemp * vTemp);
                        
                        // 径向渐变 + 生命周期
                        float alpha = (1.0 - dist * 2.0) * vLife * globalOpacity;
                        
                        gl_FragColor = vec4(finalColor, alpha);
                    }
                `,
                transparent: true,
                blending: THREE.AdditiveBlending,
                depthWrite: false
            }),
            
            // 大气材质 - 用于光晕
            atmosphere: new THREE.ShaderMaterial({
                uniforms: {
                    color: { value: new THREE.Color(0x88ccff) },
                    intensity: { value: 1.0 }
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
                        float fresnel = pow(1.0 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 3.0);
                        vec3 finalColor = color * (1.0 + fresnel * 2.0);
                        gl_FragColor = vec4(finalColor, fresnel * intensity);
                    }
                `,
                transparent: true,
                blending: THREE.AdditiveBlending,
                side: THREE.BackSide
            })
        };
    }
    
    /**
     * 创建艺术化的流星
     */
    createArtisticMeteor(options = {}) {
        const defaults = {
            startPosition: new THREE.Vector3(0, 500, 0),
            velocity: new THREE.Vector3(-80, -120, 20),
            size: 1.5 + Math.random() * 2.5,
            color: Math.random() > 0.7 ? 0xffaa00 : 0xffffff,
            trailLength: 60 + Math.floor(Math.random() * 40),
            duration: 2500 + Math.random() * 1500,
            gravity: -15 - Math.random() * 5,
            turbulence: 0.1 + Math.random() * 0.2,
            temperature: 0.7 + Math.random() * 0.3
        };
        
        const config = { ...defaults, ...options };
        
        // 添加艺术化随机性
        config.velocity.x += (Math.random() - 0.5) * 30;
        config.velocity.z += (Math.random() - 0.5) * 30;
        config.size *= 0.8 + Math.random() * 0.4; // 20%大小变化
        
        // 创建流星头（椭球形，更像真实的流星）
        const meteorGeometry = new THREE.SphereGeometry(config.size, 16, 16);
        meteorGeometry.scale(1, 0.8, 1.2); // 椭球形状
        
        const meteorMaterial = this.materials.meteor.clone();
        meteorMaterial.uniforms.color.value.setHex(config.color);
        meteorMaterial.uniforms.temperature.value = config.temperature;
        
        const meteor = new THREE.Mesh(meteorGeometry, meteorMaterial);
        meteor.position.copy(config.startPosition);
        this.scene.add(meteor);
        
        // 创建多层轨迹（更真实）
        const trails = [];
        const trailCount = 2 + Math.floor(Math.random() * 2); // 2-3层轨迹
        
        for (let layer = 0; layer < trailCount; layer++) {
            const trailGeometry = new THREE.BufferGeometry();
            const trailPositions = new Float32Array(config.trailLength * 3);
            const trailSizes = new Float32Array(config.trailLength);
            const trailLives = new Float32Array(config.trailLength);
            const trailTemps = new Float32Array(config.trailLength);
            
            trailGeometry.setAttribute('position', new THREE.BufferAttribute(trailPositions, 3));
            trailGeometry.setAttribute('size', new THREE.BufferAttribute(trailSizes, 1));
            trailGeometry.setAttribute('life', new THREE.BufferAttribute(trailLives, 1));
            trailGeometry.setAttribute('temperature', new THREE.BufferAttribute(trailTemps, 1));
            
            const trailMaterial = this.materials.trail.clone();
            trailMaterial.uniforms.color.value.setHex(config.color);
            trailMaterial.uniforms.globalOpacity.value = 0.7 - layer * 0.2; // 外层更透明
            
            const trail = new THREE.Points(trailGeometry, trailMaterial);
            this.scene.add(trail);
            
            trails.push({
                mesh: trail,
                offset: layer * 0.1, // 每层偏移
                spread: 0.5 + layer * 0.3 // 扩散度
            });
        }
        
        // 创建大气光晕
        const glowGeometry = new THREE.SphereGeometry(config.size * 3, 16, 16);
        const glowMaterial = this.materials.atmosphere.clone();
        glowMaterial.uniforms.color.value.setHex(config.color);
        glowMaterial.uniforms.intensity.value = 0.5;
        
        const glow = new THREE.Mesh(glowGeometry, glowMaterial);
        glow.position.copy(config.startPosition);
        this.scene.add(glow);
        
        // 存储流星数据
        const meteorData = {
            type: 'artisticMeteor',
            head: meteor,
            trails: trails,
            glow: glow,
            velocity: config.velocity.clone(),
            acceleration: new THREE.Vector3(0, config.gravity, 0),
            positions: [],
            startTime: Date.now(),
            duration: config.duration,
            turbulence: config.turbulence,
            temperature: config.temperature,
            config: config
        };
        
        this.activeEffects.add(meteorData);
        return meteorData;
    }
    
    /**
     * 创建艺术化的爆炸
     */
    createArtisticExplosion(position, options = {}) {
        const defaults = {
            count: 50,
            colors: [0xff6b6b, 0xffd93d, 0x6bcf7f, 0x4ecdc4, 0xff9ff3],
            size: 2,
            power: 8,
            lifetime: 3000,
            gravity: -12,
            turbulence: 0.2
        };
        
        const config = { ...defaults, ...options };
        
        // 添加随机性
        config.count += Math.floor((Math.random() - 0.5) * config.count * 0.3);
        config.power *= 0.8 + Math.random() * 0.4;
        
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(config.count * 3);
        const velocities = new Float32Array(config.count * 3);
        const lifetimes = new Float32Array(config.count);
        const sizes = new Float32Array(config.count);
        const colors = new Float32Array(config.count * 3);
        
        for (let i = 0; i < config.count; i++) {
            const i3 = i * 3;
            
            // 初始位置（添加一些随机偏移）
            positions[i3] = position.x + (Math.random() - 0.5) * 5;
            positions[i3 + 1] = position.y + (Math.random() - 0.5) * 5;
            positions[i3 + 2] = position.z + (Math.random() - 0.5) * 5;
            
            // 随机方向（球形分布）
            const phi = Math.random() * Math.PI * 2;
            const theta = Math.acos(2 * Math.random() - 1); // 均匀球形分布
            const speed = Math.random() * config.power + config.power * 0.3;
            
            velocities[i3] = Math.sin(theta) * Math.cos(phi) * speed;
            velocities[i3 + 1] = Math.sin(theta) * Math.sin(phi) * speed;
            velocities[i3 + 2] = Math.cos(theta) * speed;
            
            // 生命周期（随机变化）
            lifetimes[i] = 1.0;
            
            // 大小（随机）
            sizes[i] = (Math.random() * config.size + 0.5) * (0.8 + Math.random() * 0.4);
            
            // 颜色（从预设中随机选择）
            const color = new THREE.Color(config.colors[Math.floor(Math.random() * config.colors.length)]);
            colors[i3] = color.r;
            colors[i3 + 1] = color.g;
            colors[i3 + 2] = color.b;
        }
        
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('velocity', new THREE.BufferAttribute(velocities, 3));
        geometry.setAttribute('life', new THREE.BufferAttribute(lifetimes, 1));
        geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        
        const material = new THREE.ShaderMaterial({
            uniforms: {
                time: { value: 0 }
            },
            vertexShader: `
                attribute float life;
                attribute float size;
                attribute vec3 color;
                varying vec3 vColor;
                varying float vLife;
                
                void main() {
                    vLife = life;
                    vColor = color;
                    
                    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
                    gl_PointSize = size * (300.0 / -mvPosition.z) * life;
                    gl_Position = projectionMatrix * mvPosition;
                }
            `,
            fragmentShader: `
                varying vec3 vColor;
                varying float vLife;
                
                void main() {
                    vec2 center = vec2(0.5);
                    float dist = distance(gl_PointCoord, center);
                    if (dist > 0.5) discard;
                    
                    float alpha = (1.0 - dist * 2.0) * vLife;
                    vec3 finalColor = vColor * (0.5 + vLife * 0.5);
                    
                    gl_FragColor = vec4(finalColor, alpha);
                }
            `,
            transparent: true,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });
        
        const particles = new THREE.Points(geometry, material);
        this.scene.add(particles);
        
        const effect = {
            type: 'artisticExplosion',
            mesh: particles,
            startTime: Date.now(),
            lifetime: config.lifetime,
            gravity: config.gravity,
            turbulence: config.turbulence,
            position: position.clone(),
            config: config
        };
        
        this.activeEffects.add(effect);
        return effect;
    }
    
    /**
     * 创建魔法光尘（替代简单的浮动表情）
     */
    createMagicDust(position, options = {}) {
        const defaults = {
            count: 30,
            spread: 50,
            lifetime: 5000,
            colors: [0xffffff, 0xffd700, 0xff69b4, 0x00ffff]
        };
        
        const config = { ...defaults, ...options };
        
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(config.count * 3);
        const velocities = new Float32Array(config.count * 3);
        const lifetimes = new Float32Array(config.count);
        const colors = new Float32Array(config.count * 3);
        
        for (let i = 0; i < config.count; i++) {
            const i3 = i * 3;
            
            // 初始位置（球形分布）
            const phi = Math.random() * Math.PI * 2;
            const theta = Math.acos(2 * Math.random() - 1);
            const radius = Math.random() * config.spread;
            
            positions[i3] = position.x + radius * Math.sin(theta) * Math.cos(phi);
            positions[i3 + 1] = position.y + radius * Math.sin(theta) * Math.sin(phi);
            positions[i3 + 2] = position.z + radius * Math.cos(theta);
            
            // 缓慢上升的速度
            velocities[i3] = (Math.random() - 0.5) * 0.5;
            velocities[i3 + 1] = Math.random() * 0.3 + 0.1; // 向上
            velocities[i3 + 2] = (Math.random() - 0.5) * 0.5;
            
            lifetimes[i] = 1.0;
            
            // 随机颜色
            const color = new THREE.Color(config.colors[Math.floor(Math.random() * config.colors.length)]);
            colors[i3] = color.r;
            colors[i3 + 1] = color.g;
            colors[i3 + 2] = color.b;
        }
        
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('velocity', new THREE.BufferAttribute(velocities, 3));
        geometry.setAttribute('life', new THREE.BufferAttribute(lifetimes, 1));
        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        
        const material = this.materials.trail.clone();
        material.uniforms.color.value.setHex(0xffffff);
        
        const dust = new THREE.Points(geometry, material);
        this.scene.add(dust);
        
        const effect = {
            type: 'magicDust',
            mesh: dust,
            startTime: Date.now(),
            lifetime: config.lifetime,
            gravity: -0.5,
            config: config
        };
        
        this.activeEffects.add(effect);
        return effect;
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
        
        // 更新特效
        this.updateArtisticMeteors(deltaTime, currentTime);
        this.updateArtisticExplosions(deltaTime, currentTime);
        this.updateMagicDust(deltaTime, currentTime);
        
        this.frameCount++;
    }
    
    /**
     * 更新艺术化流星
     */
    updateArtisticMeteors(deltaTime, currentTime) {
        this.activeEffects.forEach(effect => {
            if (effect.type !== 'artisticMeteor') return;
            
            const elapsed = currentTime - effect.startTime;
            const progress = elapsed / effect.duration;
            
            if (progress >= 1) {
                this.removeEffect(effect);
                return;
            }
            
            // 湍流影响
            const turbulence = new THREE.Vector3(
                Math.sin(currentTime * 0.01 + effect.head.position.x * 0.01) * effect.turbulence,
                Math.cos(currentTime * 0.008 + effect.head.position.y * 0.01) * effect.turbulence,
                Math.sin(currentTime * 0.012 + effect.head.position.z * 0.01) * effect.turbulence
            );
            
            // 更新物理
            effect.velocity.add(effect.acceleration.clone().multiplyScalar(deltaTime));
            effect.velocity.add(turbulence.multiplyScalar(deltaTime * 10));
            effect.head.position.add(effect.velocity.clone().multiplyScalar(deltaTime));
            
            // 鼠标影响
            const mouseForce = new THREE.Vector3(
                this.mouseInfluence.x * 50,
                this.mouseInfluence.y * 50,
                0
            );
            effect.head.position.add(mouseForce.multiplyScalar(deltaTime));
            
            // 更新轨迹
            effect.positions.push(effect.head.position.clone());
            if (effect.positions.length > effect.config.trailLength) {
                effect.positions.shift();
            }
            
            // 更新多层轨迹
            effect.trails.forEach((trailData, layerIndex) => {
                const positions = trailData.mesh.geometry.attributes.position.array;
                const lives = trailData.mesh.geometry.attributes.life.array;
                const sizes = trailData.mesh.geometry.attributes.size.array;
                const temps = trailData.mesh.geometry.attributes.temperature.array;
                
                for (let i = 0; i < effect.positions.length; i++) {
                    const pos = effect.positions[i];
                    const trailProgress = i / effect.positions.length;
                    
                    // 每层轨迹有轻微偏移
                    const offset = new THREE.Vector3(
                        (Math.random() - 0.5) * trailData.spread,
                        (Math.random() - 0.5) * trailData.spread,
                        (Math.random() - 0.5) * trailData.spread
                    );
                    
                    positions[i * 3] = pos.x + offset.x;
                    positions[i * 3 + 1] = pos.y + offset.y;
                    positions[i * 3 + 2] = pos.z + offset.z;
                    
                    // 轨迹前端更热
                    const temp = effect.temperature * (1 - trailProgress * 0.5);
                    temps[i] = temp;
                    
                    // 大小渐变
                    sizes[i] = effect.config.size * (1 - trailProgress) * (1 - progress);
                    
                    // 透明度渐变
                    lives[i] = (1 - progress) * trailProgress;
                }
                
                trailData.mesh.geometry.attributes.position.needsUpdate = true;
                trailData.mesh.geometry.attributes.life.needsUpdate = true;
                trailData.mesh.geometry.attributes.size.needsUpdate = true;
                trailData.mesh.geometry.attributes.temperature.needsUpdate = true;
            });
            
            // 更新光晕
            effect.glow.position.copy(effect.head.position);
            effect.glow.material.uniforms.intensity.value = (1 - progress) * 0.5;
            
            // 更新流星头
            effect.head.material.uniforms.intensity.value = 1 - progress;
            effect.head.material.uniforms.temperature.value = effect.temperature * (1 - progress * 0.3);
            
            // 添加旋转
            effect.head.rotation.x += deltaTime * 5;
            effect.head.rotation.y += deltaTime * 3;
        });
    }
    
    /**
     * 更新艺术化爆炸
     */
    updateArtisticExplosions(deltaTime, currentTime) {
        this.activeEffects.forEach(effect => {
            if (effect.type !== 'artisticExplosion') return;
            
            const elapsed = currentTime - effect.startTime;
            const progress = elapsed / effect.lifetime;
            
            if (progress >= 1) {
                this.removeEffect(effect);
                return;
            }
            
            const positions = effect.mesh.geometry.attributes.position.array;
            const velocities = effect.mesh.geometry.attributes.velocity.array;
            const lives = effect.mesh.geometry.attributes.life.array;
            
            // 湍流
            const turbulence = new THREE.Vector3(
                Math.sin(currentTime * 0.01 + progress * 10) * effect.turbulence,
                Math.cos(currentTime * 0.008 + progress * 8) * effect.turbulence,
                Math.sin(currentTime * 0.012 + progress * 12) * effect.turbulence
            );
            
            for (let i = 0; i < positions.length / 3; i++) {
                const i3 = i * 3;
                
                // 更新速度（重力和湍流）
                velocities[i3 + 1] += effect.gravity * deltaTime * 10;
                velocities[i3] += turbulence.x * deltaTime * 50;
                velocities[i3 + 1] += turbulence.y * deltaTime * 50;
                velocities[i3 + 2] += turbulence.z * deltaTime * 50;
                
                // 更新位置
                positions[i3] += velocities[i3] * deltaTime;
                positions[i3 + 1] += velocities[i3 + 1] * deltaTime;
                positions[i3 + 2] += velocities[i3 + 2] * deltaTime;
                
                // 生命周期（非线性淡出）
                lives[i] = Math.pow(1 - progress, 2);
            }
            
            effect.mesh.geometry.attributes.position.needsUpdate = true;
            effect.mesh.geometry.attributes.life.needsUpdate = true;
        });
    }
    
    /**
     * 更新魔法光尘
     */
    updateMagicDust(deltaTime, currentTime) {
        this.activeEffects.forEach(effect => {
            if (effect.type !== 'magicDust') return;
            
            const elapsed = currentTime - effect.startTime;
            const progress = elapsed / effect.lifetime;
            
            if (progress >= 1) {
                this.removeEffect(effect);
                return;
            }
            
            const positions = effect.mesh.geometry.attributes.position.array;
            const velocities = effect.mesh.geometry.attributes.velocity.array;
            const lives = effect.mesh.geometry.attributes.life.array;
            
            for (let i = 0; i < positions.length / 3; i++) {
                const i3 = i * 3;
                
                // 添加轻微的随机运动
                velocities[i3] += (Math.random() - 0.5) * 0.1;
                velocities[i3 + 1] += effect.gravity * deltaTime * 10;
                velocities[i3 + 2] += (Math.random() - 0.5) * 0.1;
                
                // 更新位置
                positions[i3] += velocities[i3] * deltaTime;
                positions[i3 + 1] += velocities[i3 + 1] * deltaTime;
                positions[i3 + 2] += velocities[i3 + 2] * deltaTime;
                
                // 生命周期
                lives[i] = Math.pow(1 - progress, 3);
            }
            
            effect.mesh.geometry.attributes.position.needsUpdate = true;
            effect.mesh.geometry.attributes.life.needsUpdate = true;
        });
    }
    
    /**
     * 移除特效
     */
    removeEffect(effect) {
        if (effect.head) {
            this.scene.remove(effect.head);
            effect.head.geometry.dispose();
            effect.head.material.dispose();
        }
        if (effect.trails) {
            effect.trails.forEach(trail => {
                this.scene.remove(trail.mesh);
                trail.mesh.geometry.dispose();
                trail.mesh.material.dispose();
            });
        }
        if (effect.glow) {
            this.scene.remove(effect.glow);
            effect.glow.geometry.dispose();
            effect.glow.material.dispose();
        }
        if (effect.mesh) {
            this.scene.remove(effect.mesh);
            effect.mesh.geometry.dispose();
            effect.mesh.material.dispose();
        }
        
        this.activeEffects.delete(effect);
    }
    
    /**
     * 创建流星雨（自然分布）
     */
    createMeteorShowerNatural(count = 15, options = {}) {
        const meteors = [];
        
        // 自然的时间分布（不是均匀的）
        const delays = [];
        let totalDelay = 0;
        
        for (let i = 0; i < count; i++) {
            // 使用泊松分布模拟自然事件
            const delay = Math.random() * 300 + 100; // 100-400ms间隔
            totalDelay += delay;
            delays.push(totalDelay);
        }
        
        delays.forEach((delay, index) => {
            setTimeout(() => {
                // 随机起始位置（集中在天空区域）
                const startX = (Math.random() - 0.5) * 1500;
                const startY = 600 + Math.random() * 400; // 集中在天空
                const startZ = (Math.random() - 0.5) * 1500;
                
                // 随机速度（但有一定规律）
                const velocity = new THREE.Vector3(
                    -60 - Math.random() * 60, // 主要向左
                    -80 - Math.random() * 80, // 向下
                    (Math.random() - 0.5) * 40 // 轻微Z方向
                );
                
                const meteor = this.createArtisticMeteor({
                    startPosition: new THREE.Vector3(startX, startY, startZ),
                    velocity: velocity,
                    size: 1.5 + Math.random() * 2,
                    color: Math.random() > 0.6 ? 0xffaa00 : 0xffffff,
                    trailLength: 50 + Math.floor(Math.random() * 30),
                    duration: 2000 + Math.random() * 1500,
                    temperature: 0.6 + Math.random() * 0.4
                });
                
                meteors.push(meteor);
            }, delay);
        });
        
        return meteors;
    }
    
    /**
     * 销毁特效管理器
     */
    dispose() {
        this.activeEffects.forEach(effect => this.removeEffect(effect));
        
        Object.values(this.materials).forEach(material => {
            material.dispose();
        });
        
        if (this.instancedMeteorSystem) {
            this.instancedMeteorSystem.dispose();
        }
        
        this.activeEffects.clear();
    }
    
    /**
     * 创建流星雨（使用 InstancedMesh 高性能版本）
     */
    createMeteorShower(count = 20, options = {}) {
        if (this.instancedMeteorSystem) {
            this.instancedMeteorSystem.createMeteorShower(count, options);
            
            // 记录特效
            this.activeEffects.add({
                type: 'meteorShower',
                count,
                options,
                timestamp: Date.now()
            });
        }
    }
    
    /**
     * 更新特效（在动画循环中调用）
     */
    update(deltaTime) {
        if (this.instancedMeteorSystem) {
            this.instancedMeteorSystem.update(deltaTime);
        }
    }
}

export default EffectsManager;
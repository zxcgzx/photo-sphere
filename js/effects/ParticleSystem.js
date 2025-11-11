/**
 * 艺术化物理粒子系统
 * 创造有生命力、自然、富有情感的粒子效果
 */

import { THREE_LIB as THREE } from '../core/DependencyManager.js';
import { CONFIG } from '../config.js';

class ArtisticParticleSystem {
    constructor() {
        this.config = CONFIG;
        this.particles = [];
        this.forces = [];
        
        // 艺术化参数
        this.artisticParams = {
            turbulence: 0.2,            // 湍流强度
            colorVariation: 0.4,        // 颜色变化
            lifeVariation: 0.5,         // 生命周期变化
            speedVariation: 0.6,        // 速度变化
            sizeVariation: 0.7,         // 大小变化
            emotion: 'joy'              // 情感主题
        };
        
        // 物理常量
        this.gravity = -9.8;
        this.airDensity = 1.2;
        this.windForce = new THREE.Vector3(0, 0, 0);
        
        // 性能优化
        this.clock = new THREE.Clock();
        this.isActive = true;
        
        // 预计算
        this.tempVector = new THREE.Vector3();
        
        this.setupMouseInteraction();
    }
    
    /**
     * 设置鼠标交互
     */
    setupMouseInteraction() {
        this.mousePosition = new THREE.Vector2();
        this.mouseInfluence = new THREE.Vector2();
        this.mouseVelocity = new THREE.Vector2();
        this.lastMousePosition = new THREE.Vector2();
        
        document.addEventListener('mousemove', (event) => {
            this.lastMousePosition.copy(this.mousePosition);
            
            this.mousePosition.x = (event.clientX / window.innerWidth) * 2 - 1;
            this.mousePosition.y = -(event.clientY / window.innerHeight) * 2 + 1;
            
            this.mouseVelocity.subVectors(this.mousePosition, this.lastMousePosition);
            this.mouseInfluence.copy(this.mousePosition).multiplyScalar(0.1);
        });
    }
    
    /**
     * 创建艺术化的流星粒子（用于DOM层）
     */
    createShootingStarEmoji(options = {}) {
        const defaults = {
            emoji: ['🌟', '✨', '💫', '⭐'][Math.floor(Math.random() * 4)],
            position: { x: 0, y: 0, z: 0 },
            velocity: { x: -5, y: -8, z: 0 },
            size: 24,
            lifetime: 3000,
            mass: 0.05,
            dragCoefficient: 0.3,
            bounce: 0.2,
            glow: true,
            trail: true
        };
        
        const config = { ...defaults, ...options };
        
        // 添加艺术化随机性
        config.velocity.x += (Math.random() - 0.5) * 3;
        config.velocity.y += (Math.random() - 0.5) * 2;
        config.velocity.z += (Math.random() - 0.5) * 2;
        config.size *= 0.8 + Math.random() * 0.4;
        config.lifetime *= 0.7 + Math.random() * 0.6;
        
        // 创建 DOM 元素
        const element = document.createElement('div');
        element.className = 'artistic-emoji';
        element.textContent = config.emoji;
        element.style.cssText = `
            position: fixed;
            font-size: ${config.size}px;
            pointer-events: none;
            z-index: 999;
            transform: translate(-50%, -50%);
            text-shadow: 0 0 ${config.glow ? '20px' : '10px'} rgba(255, 255, 255, ${config.glow ? '0.9' : '0.6'});
            filter: ${config.glow ? 'blur(0.5px)' : 'none'};
            transition: filter 0.1s ease-out;
            will-change: transform, opacity, filter;
        `;
        
        document.body.appendChild(element);
        
        // 创建粒子对象
        const particle = {
            element,
            position: new THREE.Vector3(config.position.x, config.position.y, config.position.z),
            velocity: new THREE.Vector3(config.velocity.x, config.velocity.y, config.velocity.z),
            acceleration: new THREE.Vector3(0, 0, 0),
            mass: config.mass,
            dragCoefficient: config.dragCoefficient,
            bounce: config.bounce,
            size: config.size,
            lifetime: config.lifetime,
            startTime: Date.now(),
            rotation: Math.random() * Math.PI * 2,
            rotationSpeed: (Math.random() - 0.5) * 0.3,
            originalSize: config.size,
            glowIntensity: config.glow ? 1.0 : 0.5,
            trail: config.trail,
            trailPositions: [],
            maxTrailLength: 8,
            colorShift: Math.random() * Math.PI * 2,
            pulsationSpeed: 2 + Math.random() * 3
        };
        
        this.particles.push(particle);
        return particle;
    }
    
    /**
     * 创建魔法光尘（更艺术的版本）
     */
    createMagicSparkles(position, options = {}) {
        const defaults = {
            count: 15,
            emojis: ['✨', '💫', '🌟', '⭐', '💎'],
            spread: 80,
            lifetime: 4000,
            emotion: 'wonder'
        };
        
        const config = { ...defaults, ...options };
        const particles = [];
        
        for (let i = 0; i < config.count; i++) {
            const phi = Math.random() * Math.PI * 2;
            const theta = Math.acos(2 * Math.random() - 1);
            const radius = Math.pow(Math.random(), 0.5) * config.spread; // 球形分布
            
            const particle = this.createShootingStarEmoji({
                emoji: config.emojis[Math.floor(Math.random() * config.emojis.length)],
                position: {
                    x: position.x + radius * Math.sin(theta) * Math.cos(phi),
                    y: position.y + radius * Math.sin(theta) * Math.sin(phi),
                    z: position.z + radius * Math.cos(theta)
                },
                velocity: {
                    x: (Math.random() - 0.5) * 2,
                    y: Math.random() * 1 + 0.5, // 向上
                    z: (Math.random() - 0.5) * 2
                },
                lifetime: config.lifetime * (0.7 + Math.random() * 0.6),
                size: 16 + Math.random() * 16,
                mass: 0.02 + Math.random() * 0.03
            });
            
            particles.push(particle);
        }
        
        return particles;
    }
    
    /**
     * 创建情感化的表情雨
     */
    createEmotionRain(emotion = 'joy', count = 20) {
        const emotionConfigs = {
            joy: {
                emojis: ['😊', '😄', '🥰', '💕', '💖', '✨', '🌸', '🌺'],
                colors: ['#ff9eb5', '#ffb3d9', '#ffd6e7', '#ffe6f2'],
                speed: { x: 0.5, y: -3, z: 0 },
                lifetime: 6000
            },
            love: {
                emojis: ['❤️', '💖', '💕', '💗', '💓', '💝', '💘', '🌹'],
                colors: ['#ff1744', '#ff4081', '#ff79b0', '#ffab91'],
                speed: { x: 0.3, y: -2, z: 0 },
                lifetime: 8000
            },
            wonder: {
                emojis: ['✨', '💫', '🌟', '⭐', '🌈', '🦄', '🌙', '☁️'],
                colors: ['#bb86fc', '#9c4dcc', '#7b1fa2', '#4a148c'],
                speed: { x: 0.2, y: -1.5, z: 0 },
                lifetime: 7000
            },
            celebration: {
                emojis: ['🎉', '🎊', '🎈', '🎆', '🎇', '✨', '🌟', '💥'],
                colors: ['#ffd700', '#ffab00', '#ff6d00', '#ff3d00'],
                speed: { x: 0.8, y: -4, z: 0 },
                lifetime: 5000
            }
        };
        
        const config = emotionConfigs[emotion] || emotionConfigs.joy;
        const particles = [];
        
        for (let i = 0; i < count; i++) {
            setTimeout(() => {
                const particle = this.createShootingStarEmoji({
                    emoji: config.emojis[Math.floor(Math.random() * config.emojis.length)],
                    position: {
                        x: (Math.random() - 0.5) * window.innerWidth,
                        y: window.innerHeight / 2 + 100,
                        z: (Math.random() - 0.5) * 300
                    },
                    velocity: {
                        x: (Math.random() - 0.5) * config.speed.x * 2,
                        y: -Math.random() * config.speed.y - 1,
                        z: (Math.random() - 0.5) * config.speed.z
                    },
                    lifetime: config.lifetime * (0.8 + Math.random() * 0.4),
                    size: 18 + Math.random() * 14,
                    mass: 0.03 + Math.random() * 0.04,
                    glow: true
                });
                
                particles.push(particle);
            }, i * 150); // 自然的间隔
        }
        
        return particles;
    }
    
    /**
     * 计算空气阻力（更真实的版本）
     */
    calculateArtisticDrag(velocity, dragCoefficient, area = 1.0) {
        const speed = velocity.length();
        if (speed < 0.01) return new THREE.Vector3(0, 0, 0);
        
        // 使用更真实的阻力公式
        const dragMagnitude = 0.5 * this.airDensity * speed * speed * dragCoefficient * area;
        const dragForce = velocity.clone().normalize().multiplyScalar(-dragMagnitude);
        
        // 添加湍流
        const turbulence = new THREE.Vector3(
            (Math.random() - 0.5) * 0.1,
            (Math.random() - 0.5) * 0.1,
            (Math.random() - 0.5) * 0.1
        );
        
        dragForce.add(turbulence);
        return dragForce;
    }
    
    /**
     * 更新物理模拟（艺术化版本）
     */
    update() {
        if (!this.isActive) return;
        
        const deltaTime = this.clock.getDelta();
        const currentTime = Date.now();
        
        // 动态风力
        this.windForce.x = Math.sin(currentTime * 0.001) * 0.5;
        this.windForce.y = Math.cos(currentTime * 0.0008) * 0.2;
        this.windForce.z = Math.sin(currentTime * 0.0012) * 0.3;
        
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const particle = this.particles[i];
            
            const elapsed = currentTime - particle.startTime;
            const progress = elapsed / particle.lifetime;
            
            // 生命周期结束，移除粒子
            if (progress >= 1) {
                document.body.removeChild(particle.element);
                this.particles.splice(i, 1);
                continue;
            }
            
            // 计算力（艺术化）
            const forces = new THREE.Vector3(0, 0, 0);
            
            // 重力（添加艺术化变化）
            const gravityVariation = Math.sin(currentTime * 0.01 + i) * 0.2;
            forces.y += (this.gravity + gravityVariation) * particle.mass;
            
            // 空气阻力（艺术化）
            const drag = this.calculateArtisticDrag(
                particle.velocity,
                particle.dragCoefficient
            );
            forces.add(drag);
            
            // 风力
            forces.add(this.windForce.clone().multiplyScalar(particle.mass));
            
            // 鼠标影响（艺术化）
            const mouseDistance = particle.position.distanceTo(
                new THREE.Vector3(this.mouseInfluence.x * window.innerWidth / 2, 
                                 this.mouseInfluence.y * window.innerHeight / 2, 0)
            );
            
            if (mouseDistance < 200) {
                const mouseForce = new THREE.Vector3(
                    this.mouseInfluence.x * 2,
                    this.mouseInfluence.y * 2,
                    0
                );
                forces.add(mouseForce.multiplyScalar(1 - mouseDistance / 200));
            }
            
            // 添加湍流（艺术化）
            if (Math.random() < 0.15) {
                forces.x += (Math.random() - 0.5) * 0.8;
                forces.z += (Math.random() - 0.5) * 0.8;
            }
            
            // 计算加速度
            particle.acceleration = forces.divideScalar(particle.mass);
            
            // 更新速度
            particle.velocity.add(particle.acceleration.multiplyScalar(deltaTime));
            
            // 限制最大速度
            const maxSpeed = 30;
            if (particle.velocity.length() > maxSpeed) {
                particle.velocity.normalize().multiplyScalar(maxSpeed);
            }
            
            // 更新位置
            particle.position.add(particle.velocity.clone().multiplyScalar(deltaTime));
            
            // 边界碰撞（艺术化）
            if (particle.position.y < -window.innerHeight / 2) {
                particle.position.y = -window.innerHeight / 2;
                particle.velocity.y *= -particle.bounce;
                particle.velocity.x *= 0.7; // 摩擦力
                particle.velocity.z *= 0.7;
                
                // 碰撞时产生小爆炸
                if (Math.random() < 0.3) {
                    particle.velocity.x += (Math.random() - 0.5) * 2;
                    particle.velocity.z += (Math.random() - 0.5) * 2;
                }
            }
            
            // 更新旋转
            particle.rotation += particle.rotationSpeed;
            particle.rotationSpeed *= 0.99; // 旋转衰减
            
            // 更新轨迹
            if (particle.trail && particle.trailPositions.length < particle.maxTrailLength) {
                particle.trailPositions.push(particle.position.clone());
            }
            
            // 更新DOM元素（艺术化）
            this.updateArtisticParticleElement(particle, progress);
        }
    }
    
    /**
     * 更新粒子DOM元素（艺术化）
     */
    updateArtisticParticleElement(particle, progress) {
        const element = particle.element;
        
        // 计算屏幕坐标
        const screenX = particle.position.x + window.innerWidth / 2;
        const screenY = window.innerHeight / 2 - particle.position.y;
        
        // 应用位置
        element.style.left = screenX + 'px';
        element.style.top = screenY + 'px';
        
        // 艺术化的透明度（非线性）
        let alpha = 1 - progress;
        alpha = Math.pow(alpha, 1.5); // 平滑淡出
        alpha *= (0.7 + Math.sin(progress * Math.PI * particle.pulsationSpeed) * 0.3); // 脉动
        element.style.opacity = alpha;
        
        // 艺术化的缩放
        const baseScale = particle.originalSize / particle.size;
        const lifeScale = 0.8 + progress * 0.4; // 生命周期中的大小变化
        const speed = particle.velocity.length();
        const speedScale = 1 + Math.min(speed * 0.02, 0.3); // 速度影响大小
        const finalScale = baseScale * lifeScale * speedScale;
        
        // 颜色偏移（艺术化）
        const hueShift = Math.sin(currentTime * 0.001 + particle.colorShift) * 0.1;
        const colorIntensity = particle.glowIntensity * alpha;
        
        // 应用变换
        const transform = `translate(-50%, -50%) rotate(${particle.rotation}rad) scale(${finalScale})`;
        element.style.transform = transform;
        
        // 运动模糊（艺术化）
        if (speed > 8) {
            const blurAmount = Math.min(speed * 0.15, 8);
            const angle = Math.atan2(particle.velocity.y, particle.velocity.x);
            element.style.filter = `blur(${blurAmount}px) hue-rotate(${hueShift}rad) brightness(${1 + colorIntensity * 0.3})`;
        } else {
            element.style.filter = `hue-rotate(${hueShift}rad) brightness(${1 + colorIntensity * 0.3})`;
        }
        
        // 发光效果（艺术化）
        if (particle.glowIntensity > 0) {
            const glowSize = 10 + particle.glowIntensity * 20 * alpha;
            const glowOpacity = particle.glowIntensity * alpha;
            element.style.textShadow = `0 0 ${glowSize}px rgba(255, 255, 255, ${glowOpacity})`;
        }
    }
    
    /**
     * 创建自然的浮动表情（替代旧的 createFloatingElements）
     */
    createNaturalFloatingElements() {
        // 基于时间的自然生成
        const now = Date.now();
        const hour = (now / 3600000) % 24; // 当前小时（0-23）
        
        // 根据"时间"调整生成概率（模拟自然的节奏）
        const baseProbability = 0.3;
        const timeFactor = Math.sin(hour * Math.PI / 12) * 0.2 + 0.8; // 白天更活跃
        const finalProbability = baseProbability * timeFactor;
        
        if (Math.random() < finalProbability) {
            // 随机选择情感
            const emotions = ['joy', 'love', 'wonder', 'celebration'];
            const emotion = emotions[Math.floor(Math.random() * emotions.length)];
            
            this.createEmotionRain(emotion, 1);
        }
    }
    
    /**
     * 创建庆祝效果
     */
    createCelebration(position, options = {}) {
        const defaults = {
            intensity: 'medium', // low, medium, high
            duration: 3000
        };
        
        const config = { ...defaults, ...options };
        
        // 根据强度创建不同效果
        if (config.intensity === 'low') {
            this.createMagicSparkles(position, { count: 10 });
        } else if (config.intensity === 'medium') {
            this.createMagicSparkles(position, { count: 25 });
            setTimeout(() => {
                this.createEmotionRain('celebration', 10);
            }, 500);
        } else if (config.intensity === 'high') {
            this.createMagicSparkles(position, { count: 50 });
            this.createArtisticExplosion(position, { 
                count: 80, 
                colors: [0xffd700, 0xff6b6b, 0xffd93d, 0x6bcf7f] 
            });
            setTimeout(() => {
                this.createEmotionRain('celebration', 20);
            }, 300);
        }
    }
    
    /**
     * 清理所有粒子
     */
    dispose() {
        this.particles.forEach(particle => {
            if (particle.element && particle.element.parentNode) {
                document.body.removeChild(particle.element);
            }
        });
        this.particles = [];
        this.isActive = false;
    }
}

export default ArtisticParticleSystem;
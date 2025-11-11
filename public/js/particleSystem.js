/**
 * 物理粒子系统
 * 使用真实物理模拟（重力、空气阻力、风力等）
 */

import { CONFIG } from './config.js';

class PhysicsParticleSystem {
    constructor() {
        this.config = CONFIG;
        this.particles = [];
        this.forces = [];
        
        // 物理常量
        this.gravity = -9.8; // 重力加速度
        this.airDensity = 1.2; // 空气密度
        this.windForce = new THREE.Vector3(0, 0, 0);
        
        // 性能优化
        this.clock = new THREE.Clock();
        this.isActive = true;
    }
    
    /**
     * 创建浮动表情粒子
     */
    createFloatingEmoji(options = {}) {
        const defaults = {
            emoji: '❤️',
            position: { x: 0, y: 0, z: 0 },
            velocity: { x: 0, y: 2, z: 0 },
            size: 24,
            lifetime: 5000,
            mass: 0.1,
            dragCoefficient: 0.5,
            bounce: 0.3
        };
        
        const config = { ...defaults, ...options };
        
        // 创建 DOM 元素
        const element = document.createElement('div');
        element.className = 'physics-emoji';
        element.textContent = config.emoji;
        element.style.cssText = `
            position: fixed;
            font-size: ${config.size}px;
            pointer-events: none;
            z-index: 999;
            transform: translate(-50%, -50%);
            text-shadow: 0 0 10px rgba(255, 255, 255, 0.5);
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
            rotationSpeed: (Math.random() - 0.5) * 0.2
        };
        
        this.particles.push(particle);
        return particle;
    }
    
    /**
     * 创建爆炸粒子效果
     */
    createExplosion(position, options = {}) {
        const defaults = {
            count: 20,
            emojis: ['❤️', '✨', '💖', '💫', '🌟'],
            spread: 100,
            power: 5
        };
        
        const config = { ...defaults, ...options };
        const particles = [];
        
        for (let i = 0; i < config.count; i++) {
            const phi = Math.random() * Math.PI * 2;
            const theta = Math.random() * Math.PI;
            const speed = Math.random() * config.power + 2;
            
            const particle = this.createFloatingEmoji({
                emoji: config.emojis[Math.floor(Math.random() * config.emojis.length)],
                position: {
                    x: position.x + (Math.random() - 0.5) * config.spread,
                    y: position.y + (Math.random() - 0.5) * config.spread,
                    z: position.z + (Math.random() - 0.5) * config.spread
                },
                velocity: {
                    x: Math.sin(theta) * Math.cos(phi) * speed,
                    y: Math.sin(theta) * Math.sin(phi) * speed,
                    z: Math.cos(theta) * speed
                },
                lifetime: 3000 + Math.random() * 2000
            });
            
            particles.push(particle);
        }
        
        return particles;
    }
    
    /**
     * 计算空气阻力
     */
    calculateDrag(velocity, dragCoefficient, area = 1.0) {
        const speed = velocity.length();
        if (speed < 0.01) return new THREE.Vector3(0, 0, 0);
        
        const dragMagnitude = 0.5 * this.airDensity * speed * speed * dragCoefficient * area;
        const dragForce = velocity.clone().normalize().multiplyScalar(-dragMagnitude);
        
        return dragForce;
    }
    
    /**
     * 更新物理模拟
     */
    update() {
        if (!this.isActive) return;
        
        const deltaTime = this.clock.getDelta();
        const currentTime = Date.now();
        
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const particle = this.particles[i];
            
            // 计算已过去的时间
            const elapsed = currentTime - particle.startTime;
            const progress = elapsed / particle.lifetime;
            
            // 生命周期结束，移除粒子
            if (progress >= 1) {
                document.body.removeChild(particle.element);
                this.particles.splice(i, 1);
                continue;
            }
            
            // 计算力
            const forces = new THREE.Vector3(0, 0, 0);
            
            // 重力
            forces.y += this.gravity * particle.mass;
            
            // 空气阻力
            const drag = this.calculateDrag(
                particle.velocity,
                particle.dragCoefficient
            );
            forces.add(drag);
            
            // 风力
            forces.add(this.windForce);
            
            // 添加随机扰动（湍流）
            if (Math.random() < 0.1) {
                forces.x += (Math.random() - 0.5) * 0.5;
                forces.z += (Math.random() - 0.5) * 0.5;
            }
            
            // 计算加速度
            particle.acceleration = forces.divideScalar(particle.mass);
            
            // 更新速度
            particle.velocity.add(particle.acceleration.multiplyScalar(deltaTime));
            
            // 更新位置
            particle.position.add(particle.velocity.clone().multiplyScalar(deltaTime));
            
            // 边界碰撞检测（屏幕边界）
            if (particle.position.y < -window.innerHeight / 2) {
                // 地面碰撞
                particle.position.y = -window.innerHeight / 2;
                particle.velocity.y *= -particle.bounce; // 反弹
                particle.velocity.x *= 0.8; // 摩擦力
                particle.velocity.z *= 0.8;
            }
            
            // 更新旋转
            particle.rotation += particle.rotationSpeed;
            
            // 更新DOM元素
            this.updateParticleElement(particle, progress);
        }
    }
    
    /**
     * 更新粒子DOM元素
     */
    updateParticleElement(particle, progress) {
        const element = particle.element;
        
        // 计算屏幕坐标（考虑相机）
        const screenX = particle.position.x + window.innerWidth / 2;
        const screenY = window.innerHeight / 2 - particle.position.y;
        
        // 应用位置
        element.style.left = screenX + 'px';
        element.style.top = screenY + 'px';
        
        // 透明度（生命周期）
        const alpha = 1 - progress * progress; // 平滑淡出
        element.style.opacity = alpha;
        
        // 缩放（模拟透视）
        const scale = 1 + particle.position.z * 0.001;
        element.style.transform = `translate(-50%, -50%) rotate(${particle.rotation}rad) scale(${scale})`;
        
        // 添加运动模糊效果（快速移动时）
        const speed = particle.velocity.length();
        if (speed > 10) {
            const blurAmount = Math.min(speed * 0.1, 5);
            element.style.filter = `blur(${blurAmount}px)`;
        } else {
            element.style.filter = 'none';
        }
    }
    
    /**
     * 设置风力
     */
    setWind(x, y, z) {
        this.windForce.set(x, y, z);
    }
    
    /**
     * 创建随机的浮动表情（替代旧的 createFloatingEmoji）
     */
    createRandomFloatingEmoji() {
        const emojis = ['❤️', '💖', '💕', '💗', '💓', '💝', '💘', '✨', '💫', '🌟', '⭐', '🌸', '🌺', '🌷'];
        const emoji = emojis[Math.floor(Math.random() * emojis.length)];
        
        return this.createFloatingEmoji({
            emoji: emoji,
            position: {
                x: (Math.random() - 0.5) * window.innerWidth,
                y: -window.innerHeight / 2 - 50,
                z: (Math.random() - 0.5) * 500
            },
            velocity: {
                x: (Math.random() - 0.5) * 2,
                y: 3 + Math.random() * 3,
                z: (Math.random() - 0.5) * 2
            },
            lifetime: 8000 + Math.random() * 4000,
            size: 20 + Math.random() * 20
        });
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

export default PhysicsParticleSystem;
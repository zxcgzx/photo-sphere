/**
 * 浪漫粒子系统
 * 情感精灵，会呼吸、会思念、会做梦
 */

import { CONFIG } from './config.js';

class RomanticParticleSystem {
    constructor() {
        this.config = CONFIG;
        this.particles = [];
        this.spirits = []; // 情感精灵
        
        // 浪漫参数
        this.romanceParams = {
            longing: 0.5,              // 思念强度
            dreaminess: 0.7,           // 梦幻感
            tenderness: 0.9,           // 温柔度
            nostalgia: 0.4,            // 怀旧感
            passion: 0.6               // 热情度
        };
        
        // 情感精灵状态
        this.spiritStates = {
            joy: { color: '#ff9eb5', speed: 1.2, glow: 1.0 },
            love: { color: '#ff1744', speed: 0.8, glow: 1.5 },
            longing: { color: '#9370db', speed: 0.5, glow: 0.8 },
            nostalgia: { color: '#e6e6fa', speed: 0.3, glow: 0.6 },
            dream: { color: '#bb86fc', speed: 0.4, glow: 1.2 }
        };
        
        // 时光参数
        this.timeMemory = {
            moments: [],
            silence: 0,
            longing: 0
        };
        
        this.clock = new THREE.Clock();
        this.isActive = true;
        
        this.setupHeartConnection();
    }
    
    /**
     * 设置心灵连接
     */
    setupHeartConnection() {
        this.heartBeat = {
            rate: 60,
            phase: 0,
            intensity: 1.0
        };
        
        this.breath = {
            phase: 0,
            depth: 0.5,
            rhythm: 2
        };
        
        // 心跳节奏
        setInterval(() => {
            this.heartBeat.phase += 0.1;
            this.heartBeat.intensity = Math.sin(this.heartBeat.phase) * 0.3 + 0.7;
        }, 100);
        
        // 呼吸节奏
        setInterval(() => {
            this.breath.phase += 0.05;
            this.breath.depth = Math.sin(this.breath.phase) * 0.5 + 0.5;
        }, 50);
    }
    
    /**
     * 创建情感精灵
     */
    createEmotionSpirit(emotion = 'love', options = {}) {
        const defaults = {
            position: { x: 0, y: 0, z: 0 },
            lifetime: 8000,
            size: 24,
            memory: 0.7
        };
        
        const config = { ...defaults, ...options };
        const state = this.spiritStates[emotion] || this.spiritStates.love;
        
        // 创建精灵元素
        const element = document.createElement('div');
        element.className = 'emotion-spirit';
        element.style.cssText = `
            position: fixed;
            pointer-events: none;
            z-index: 999;
            transform: translate(-50%, -50%);
            will-change: transform, opacity, filter;
            font-smoothing: antialiased;
            -webkit-font-smoothing: antialiased;
        `;
        
        // 根据情感选择表情
        const emotionEmojis = {
            love: ['❤️', '💖', '💕', '💗', '💓', '💝', '💘'],
            joy: ['😊', '😄', '🥰', '🤗', '💕', '✨'],
            longing: ['😢', '🥺', '💔', '🌙', '⭐', '💭'],
            nostalgia: ['😌', '🤍', '🕰️', '📸', '💭', '🌸'],
            dream: ['✨', '💫', '🌟', '🦄', '🌈', '☁️']
        };
        
        const emojis = emotionEmojis[emotion] || emotionEmojis.love;
        element.textContent = emojis[Math.floor(Math.random() * emojis.length)];
        
        document.body.appendChild(element);
        
        // 精灵有自己的意识和情感
        const spirit = {
            element,
            emotion,
            position: new THREE.Vector3(config.position.x, config.position.y, config.position.z),
            velocity: new THREE.Vector3((Math.random() - 0.5) * 2, Math.random() * 2 + 1, (Math.random() - 0.5) * 2),
            acceleration: new THREE.Vector3(0, 0, 0),
            lifetime: config.lifetime,
            startTime: Date.now(),
            size: config.size,
            originalSize: config.size,
            memory: config.memory,
            state,
            
            // 精灵的个性
            personality: {
                shyness: Math.random(),           // 害羞程度
                curiosity: Math.random(),         // 好奇心
                loyalty: Math.random(),           // 忠诚度
                dreaminess: Math.random()         // 梦幻程度
            },
            
            // 精灵的状态
            status: {
                isResting: false,                 // 是否在休息
                isPlaying: false,                 // 是否在玩耍
                isLonging: false,                 // 是否在思念
                isSinging: false                  // 是否在歌唱
            },
            
            // 精灵的记忆
            memory: {
                birthTime: Date.now(),
                beautifulMoments: [],
                favoritePlaces: []
            },
            
            // 物理属性
            mass: 0.02 + Math.random() * 0.03,
            dragCoefficient: 0.2 + Math.random() * 0.2,
            
            // 动画参数
            rotation: Math.random() * Math.PI * 2,
            rotationSpeed: (Math.random() - 0.5) * 0.2,
            colorShift: Math.random() * Math.PI * 2,
            pulsationSpeed: 1 + Math.random() * 2,
            
            // 轨迹
            trailPositions: [],
            maxTrailLength: 12,
            
            // 情感参数
            loveIntensity: 0.5 + Math.random() * 0.5,
            tenderness: 0.7 + Math.random() * 0.3
        };
        
        this.spirits.push(spirit);
        this.recordSpiritMoment('诞生', spirit);
        
        return spirit;
    }
    
    /**
     * 记录精灵的瞬间
     */
    recordSpiritMoment(type, spirit) {
        spirit.memory.beautifulMoments.push({
            type: type,
            time: Date.now() - spirit.memory.birthTime,
            position: spirit.position.clone(),
            emotion: spirit.emotion,
            heartbeat: this.heartBeat.intensity
        });
        
        // 只保留最美好的50个瞬间
        if (spirit.memory.beautifulMoments.length > 50) {
            spirit.memory.beautifulMoments.shift();
        }
    }
    
    /**
     * 创建思念之雨
     */
    createLongingRain(intensity = 'medium') {
        const intensities = {
            light: { count: 10, lifetime: 6000, speed: 1 },
            medium: { count: 25, lifetime: 8000, speed: 0.7 },
            heavy: { count: 50, lifetime: 10000, speed: 0.5 }
        };
        
        const config = intensities[intensity] || intensities.medium;
        const spirits = [];
        
        for (let i = 0; i < config.count; i++) {
            setTimeout(() => {
                const spirit = this.createEmotionSpirit('longing', {
                    position: {
                        x: (Math.random() - 0.5) * window.innerWidth,
                        y: window.innerHeight / 2 + 100,
                        z: (Math.random() - 0.5) * 400
                    },
                    lifetime: config.lifetime * (0.8 + Math.random() * 0.4),
                    size: 20 + Math.random() * 16
                });
                
                // 思念的精灵有特殊的运动
                spirit.velocity.x = (Math.random() - 0.5) * 1;
                spirit.velocity.y = -Math.random() * config.speed - 0.5;
                spirit.velocity.z = (Math.random() - 0.5) * 1;
                
                spirits.push(spirit);
            }, i * (200 / config.speed));
        }
        
        return spirits;
    }
    
    /**
     * 创建梦境之舞
     */
    createDreamDance(centerPosition, options = {}) {
        const defaults = {
            count: 15,
            radius: 100,
            duration: 10000,
            emotion: 'dream'
        };
        
        const config = { ...defaults, ...options };
        const spirits = [];
        
        for (let i = 0; i < config.count; i++) {
            const angle = (i / config.count) * Math.PI * 2;
            const radius = config.radius * (0.8 + Math.random() * 0.4);
            
            const spirit = this.createEmotionSpirit(config.emotion, {
                position: {
                    x: centerPosition.x + Math.cos(angle) * radius,
                    y: centerPosition.y + Math.random() * 40 - 20,
                    z: centerPosition.z + Math.sin(angle) * radius
                },
                lifetime: config.duration * (0.8 + Math.random() * 0.4),
                size: 18 + Math.random() * 14
            });
            
            // 梦境精灵会跳舞
            spirit.velocity.x = Math.sin(angle) * 2;
            spirit.velocity.z = -Math.cos(angle) * 2;
            spirit.velocity.y = Math.sin(angle * 2) * 0.5;
            
            spirits.push(spirit);
        }
        
        return spirits;
    }
    
    /**
     * 创建永恒的誓言（终极浪漫特效）
     */
    createEternalPromise(position, options = {}) {
        const defaults = {
            layers: 3,
            particlesPerLayer: 12,
            expansionSpeed: 0.5,
            lifetime: 15000
        };
        
        const config = { ...defaults, ...options };
        const promise = {
            layers: [],
            startTime: Date.now(),
            centerPosition: position.clone(),
            config: config
        };
        
        // 创建多层花瓣
        for (let layer = 0; layer < config.layers; layer++) {
            const layerSpirits = [];
            const radius = (layer + 1) * 30;
            
            for (let i = 0; i < config.particlesPerLayer; i++) {
                const angle = (i / config.particlesPerLayer) * Math.PI * 2;
                
                setTimeout(() => {
                    const spirit = this.createEmotionSpirit('love', {
                        position: {
                            x: position.x + Math.cos(angle) * radius,
                            y: position.y + Math.sin(angle * 0.5) * 20,
                            z: position.z + Math.sin(angle) * radius
                        },
                        lifetime: config.lifetime * (0.9 + layer * 0.1),
                        size: 24 + layer * 4
                    });
                    
                    // 永恒的誓言会扩散然后回归
                    const expandTime = config.lifetime * 0.3;
                    const returnTime = config.lifetime * 0.4;
                    
                    // 扩散阶段
                    spirit.targetPosition = spirit.position.clone();
                    spirit.originalPosition = spirit.position.clone();
                    spirit.expandVelocity = new THREE.Vector3(
                        Math.cos(angle) * config.expansionSpeed,
                        Math.sin(angle * 0.5) * config.expansionSpeed * 0.3,
                        Math.sin(angle) * config.expansionSpeed
                    );
                    
                    // 标记为永恒的誓言
                    spirit.isEternalPromise = true;
                    spirit.expandTime = expandTime;
                    spirit.returnTime = returnTime;
                    
                    layerSpirits.push(spirit);
                }, layer * 200 + i * 50);
            }
            
            promise.layers.push(layerSpirits);
        }
        
        this.recordSpiritMoment('永恒的誓言', promise);
        return promise;
    }
    
    /**
     * 更新浪漫模拟
     */
    update() {
        if (!this.isActive) return;
        
        const deltaTime = this.clock.getDelta();
        const currentTime = Date.now();
        
        // 更新情感精灵
        this.updateEmotionSpirits(deltaTime, currentTime);
    }
    
    /**
     * 更新情感精灵
     */
    updateEmotionSpirits(deltaTime, currentTime) {
        for (let i = this.spirits.length - 1; i >= 0; i--) {
            const spirit = this.spirits[i];
            
            const elapsed = currentTime - spirit.startTime;
            const progress = elapsed / spirit.lifetime;
            
            // 生命周期结束
            if (progress >= 1) {
                this.recordSpiritMoment('消逝', spirit);
                document.body.removeChild(spirit.element);
                this.spirits.splice(i, 1);
                continue;
            }
            
            // 永恒的誓言特殊处理
            if (spirit.isEternalPromise) {
                if (elapsed < spirit.expandTime) {
                    // 扩散阶段
                    spirit.position.add(spirit.expandVelocity.clone().multiplyScalar(deltaTime));
                } else if (elapsed < spirit.expandTime + spirit.returnTime) {
                    // 回归阶段
                    const returnProgress = (elapsed - spirit.expandTime) / spirit.returnTime;
                    spirit.position.lerpVectors(
                        spirit.targetPosition,
                        spirit.originalPosition,
                        returnProgress
                    );
                } else {
                    // 永恒阶段 - 在中心轻柔飘动
                    const eternalTime = elapsed - (spirit.expandTime + spirit.returnTime);
                    const floatY = Math.sin(eternalTime * 0.002) * 5;
                    const floatX = Math.cos(eternalTime * 0.0015) * 3;
                    
                    spirit.position.copy(spirit.originalPosition);
                    spirit.position.y += floatY;
                    spirit.position.x += floatX;
                }
            } else {
                // 普通精灵的物理
                const forces = new THREE.Vector3(0, 0, 0);
                
                // 重力（但精灵很轻）
                forces.y += this.gravity * spirit.mass * 0.3;
                
                // 空气阻力（温柔）
                const drag = this.calculateSpiritDrag(spirit.velocity, spirit.dragCoefficient);
                forces.add(drag);
                
                // 风力（温柔）
                const windForce = new THREE.Vector3(
                    Math.sin(currentTime * 0.001) * 0.2,
                    Math.cos(currentTime * 0.0008) * 0.1,
                    Math.sin(currentTime * 0.0012) * 0.15
                );
                forces.add(windForce);
                
                // 精灵的个性影响
                if (spirit.personality.shyness > 0.5) {
                    // 害羞的精灵会避开中心
                    const centerDistance = spirit.position.length();
                    if (centerDistance < 100) {
                        const awayForce = spirit.position.clone().normalize().multiplyScalar(0.5);
                        forces.add(awayForce);
                    }
                }
                
                if (spirit.personality.curiosity > 0.5) {
                    // 好奇的精灵会探索边界
                    if (Math.random() < 0.01) {
                        spirit.velocity.add(new THREE.Vector3(
                            (Math.random() - 0.5) * 2,
                            (Math.random() - 0.5) * 1,
                            (Math.random() - 0.5) * 2
                        ));
                    }
                }
                
                // 计算加速度
                spirit.acceleration = forces.divideScalar(spirit.mass);
                
                // 更新速度
                spirit.velocity.add(spirit.acceleration.multiplyScalar(deltaTime));
                
                // 限制速度
                const maxSpeed = 5 * spirit.state.speed;
                if (spirit.velocity.length() > maxSpeed) {
                    spirit.velocity.normalize().multiplyScalar(maxSpeed);
                }
                
                // 更新位置
                spirit.position.add(spirit.velocity.clone().multiplyScalar(deltaTime));
                
                // 边界处理（温柔的）
                if (spirit.position.y < -window.innerHeight / 2) {
                    spirit.position.y = -window.innerHeight / 2;
                    spirit.velocity.y *= -spirit.bounce * 0.5; // 温柔的反弹
                }
            }
            
            // 更新旋转（精灵会跳舞）
            spirit.rotation += spirit.rotationSpeed * spirit.state.speed;
            
            // 更新轨迹
            if (spirit.trailPositions.length < spirit.maxTrailLength) {
                spirit.trailPositions.push(spirit.position.clone());
            } else {
                spirit.trailPositions.shift();
                spirit.trailPositions.push(spirit.position.clone());
            }
            
            // 更新DOM元素（浪漫的）
            this.updateRomanticSpiritElement(spirit, progress);
        }
    }
    
    /**
     * 计算精灵的空气阻力
     */
    calculateSpiritDrag(velocity, dragCoefficient) {
        const speed = velocity.length();
        if (speed < 0.01) return new THREE.Vector3(0, 0, 0);
        
        const dragMagnitude = 0.5 * 1.2 * speed * speed * dragCoefficient * 0.5;
        const dragForce = velocity.clone().normalize().multiplyScalar(-dragMagnitude);
        
        // 添加浪漫的湍流
        const turbulence = new THREE.Vector3(
            (Math.random() - 0.5) * 0.05,
            (Math.random() - 0.5) * 0.05,
            (Math.random() - 0.5) * 0.05
        );
        
        dragForce.add(turbulence);
        return dragForce;
    }
    
    /**
     * 更新精灵DOM元素（浪漫的）
    */
    updateRomanticSpiritElement(spirit, progress) {
        const element = spirit.element;
        
        // 计算屏幕坐标
        const screenX = spirit.position.x + window.innerWidth / 2;
        const screenY = window.innerHeight / 2 - spirit.position.y;
        
        // 应用位置
        element.style.left = screenX + 'px';
        element.style.top = screenY + 'px';
        
        // 浪漫的透明度（非线性，有脉动）
        let alpha = 1 - progress;
        alpha = Math.pow(alpha, 1.2); // 更平滑的淡出
        
        // 心跳脉动
        const heartPulse = Math.sin(this.heartBeat.phase * 2 + spirit.colorShift) * 0.2 + 0.8;
        alpha *= heartPulse;
        
        // 呼吸节奏
        const breathRhythm = Math.sin(this.breath.phase * spirit.pulsationSpeed) * 0.3 + 0.7;
        alpha *= breathRhythm;
        
        element.style.opacity = alpha;
        
        // 浪漫的缩放
        const baseScale = spirit.originalSize / spirit.size;
        const lifeScale = 0.9 + progress * 0.2; // 生命周期中的大小变化
        const speed = spirit.velocity.length();
        const speedScale = 1 + Math.min(speed * 0.1, 0.2); // 速度影响大小
        
        // 心跳缩放
        const heartScale = 1 + Math.sin(this.heartBeat.phase * 3) * 0.1;
        
        const finalScale = baseScale * lifeScale * speedScale * heartScale;
        
        // 颜色偏移（浪漫的）
        const hueShift = Math.sin(this.heartBeat.phase + spirit.colorShift) * 0.1;
        const colorIntensity = spirit.loveIntensity * alpha * heartPulse;
        
        // 应用变换
        const transform = `translate(-50%, -50%) rotate(${spirit.rotation}rad) scale(${finalScale})`;
        element.style.transform = transform;
        
        // 运动模糊（浪漫的）
        if (speed > 2) {
            const blurAmount = Math.min(speed * 0.1, 3);
            element.style.filter = `blur(${blurAmount}px) hue-rotate(${hueShift}rad) brightness(${1 + colorIntensity * 0.2})`;
        } else {
            element.style.filter = `hue-rotate(${hueShift}rad) brightness(${1 + colorIntensity * 0.2})`;
        }
        
        // 发光效果（浪漫的）
        if (spirit.state.glow > 0) {
            const glowSize = 10 + spirit.state.glow * 15 * alpha * heartPulse;
            const glowOpacity = spirit.state.glow * alpha * heartPulse;
            
            // 根据情感改变发光颜色
            let glowColor = spirit.state.color;
            if (spirit.emotion === 'love') {
                glowColor = '#ff1744';
            } else if (spirit.emotion === 'dream') {
                glowColor = '#bb86fc';
            }
            
            element.style.textShadow = `0 0 ${glowSize}px ${glowColor}${Math.floor(glowOpacity * 255).toString(16).padStart(2, '0')}`;
        }
        
        // 添加轨迹效果
        if (spirit.trailPositions.length > 1) {
            const trailOpacity = alpha * 0.3;
            // 这里可以添加轨迹元素的创建和更新
        }
    }
    
    /**
     * 创建永恒的思念（持续不断的温柔粒子）
     */
    createEternalLonging() {
        setInterval(() => {
            if (Math.random() < 0.3) {
                this.createEmotionSpirit('longing', {
                    position: {
                        x: (Math.random() - 0.5) * window.innerWidth,
                        y: window.innerHeight / 2 + Math.random() * 100,
                        z: (Math.random() - 0.5) * 300
                    },
                    lifetime: 10000,
                    size: 16 + Math.random() * 8
                });
            }
        }, 2000);
    }
    
    /**
     * 创建浪漫的氛围（持续）
     */
    createRomanticAtmosphere() {
        // 持续的情感精灵
        setInterval(() => {
            if (Math.random() < 0.5) {
                const emotions = ['love', 'joy', 'dream'];
                const emotion = emotions[Math.floor(Math.random() * emotions.length)];
                
                this.createEmotionSpirit(emotion, {
                    position: {
                        x: (Math.random() - 0.5) * window.innerWidth * 0.8,
                        y: (Math.random() - 0.5) * window.innerHeight * 0.8,
                        z: (Math.random() - 0.5) * 200
                    },
                    lifetime: 8000 + Math.random() * 4000,
                    size: 20 + Math.random() * 10
                });
            }
        }, 1500);
    }
    
    /**
     * 清理所有精灵
     */
    dispose() {
        this.spirits.forEach(spirit => {
            if (spirit.element && spirit.element.parentNode) {
                document.body.removeChild(spirit.element);
            }
        });
        this.spirits = [];
        this.isActive = false;
    }
}

export default RomanticParticleSystem;
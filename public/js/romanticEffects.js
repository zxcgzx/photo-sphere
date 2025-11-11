/**
 * 浪漫特效系统
 * 讲述一个关于爱情、时光和记忆的故事
 */

import { CONFIG } from './config.js';

class RomanticEffectsManager {
    constructor(sceneManager) {
        this.config = CONFIG;
        this.sceneManager = sceneManager;
        this.scene = sceneManager.scene;
        this.renderer = sceneManager.renderer;
        this.camera = sceneManager.camera;
        
        // 浪漫叙事参数
        this.romanceParams = {
            loveIntensity: 0.8,        // 爱意浓度
            memoryWeight: 0.6,         // 记忆重量
            timeFlow: 0.5,             // 时光流速
            dreaminess: 0.7,           // 梦幻感
            melancholy: 0.3,           // 忧郁美
            tenderness: 0.9            // 温柔度
        };
        
        // 情感状态
        this.emotionalState = {
            mood: 'gentle',            // gentle, passionate, nostalgic, dreamy
            heartbeat: 60,             // 心跳频率
            breath: 0.5,               // 呼吸节奏
            memory: [],                // 记忆片段
            longing: 0.4               // 思念程度
        };
        
        // 时光记录
        this.timeMemory = {
            startTime: Date.now(),
            moments: [],               // 珍贵瞬间
            silence: 0,                // 静谧时刻
            waiting: 0                 // 等待时光
        };
        
        this.init();
    }
    
    init() {
        this.createRomanticMaterials();
        this.setupHeartBeat();
        this.setupBreath();
    }
    
    /**
     * 创建浪漫材质
     */
    createRomanticMaterials() {
        this.materials = {
            // 情书流星 - 带着回忆的流星
            loveLetterMeteor: new THREE.ShaderMaterial({
                uniforms: {
                    time: { value: 0 },
                    loveIntensity: { value: this.romanceParams.loveIntensity },
                    memoryTexture: { value: this.createMemoryTexture() },
                    heartbeat: { value: 1.0 }
                },
                vertexShader: `
                    varying vec2 vUv;
                    varying vec3 vPosition;
                    varying float vHeartbeat;
                    
                    void main() {
                        vUv = uv;
                        vPosition = position;
                        
                        // 心跳脉动
                        float heartbeat = sin(time * 3.0) * 0.1 + 1.0;
                        vHeartbeat = heartbeat;
                        
                        vec3 pos = position * heartbeat;
                        gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
                    }
                `,
                fragmentShader: `
                    uniform float time;
                    uniform float loveIntensity;
                    uniform sampler2D memoryTexture;
                    uniform float heartbeat;
                    varying vec2 vUv;
                    varying vec3 vPosition;
                    varying float vHeartbeat;
                    
                    // 噪声函数
                    float noise(vec2 st) {
                        return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
                    }
                    
                    void main() {
                        vec2 center = vec2(0.5);
                        float dist = distance(vUv, center);
                        
                        // 从记忆中采样颜色
                        vec2 memoryUv = vUv + time * 0.05;
                        vec3 memoryColor = texture2D(memoryTexture, memoryUv).rgb;
                        
                        // 爱的色彩
                        vec3 loveColor1 = vec3(1.0, 0.4, 0.6); // 温柔的粉
                        vec3 loveColor2 = vec3(1.0, 0.8, 0.9); // 纯洁的白粉
                        vec3 loveColor3 = vec3(0.9, 0.6, 0.8); // 深情的紫
                        
                        // 混合爱的色彩
                        vec3 finalColor = mix(loveColor1, loveColor2, memoryColor.r);
                        finalColor = mix(finalColor, loveColor3, memoryColor.g);
                        
                        // 心跳闪烁
                        float pulse = sin(time * 5.0) * 0.3 + 0.7;
                        finalColor *= pulse * vHeartbeat;
                        
                        // 边缘的温柔
                        float edge = 1.0 - smoothstep(0.0, 0.5, dist);
                        float alpha = edge * loveIntensity * pulse;
                        
                        // 添加思念的闪烁
                        float longing = sin(time * 2.0 + dist * 10.0) * 0.2 + 0.8;
                        alpha *= longing;
                        
                        gl_FragColor = vec4(finalColor, alpha);
                    }
                `,
                transparent: true,
                blending: THREE.AdditiveBlending,
                depthWrite: false
            }),
            
            // 温柔轨迹 - 像思念一样绵长
            tenderTrail: new THREE.ShaderMaterial({
                uniforms: {
                    time: { value: 0 },
                    tenderness: { value: this.romanceParams.tenderness },
                    melancholy: { value: this.romanceParams.melancholy }
                },
                vertexShader: `
                    attribute float life;
                    attribute float memory;
                    attribute float tenderness;
                    varying float vLife;
                    varying float vMemory;
                    varying float vTenderness;
                    
                    void main() {
                        vLife = life;
                        vMemory = memory;
                        vTenderness = tenderness;
                        
                        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
                        gl_PointSize = size * (400.0 / -mvPosition.z) * life * tenderness;
                        gl_Position = projectionMatrix * mvPosition;
                    }
                `,
                fragmentShader: `
                    uniform float time;
                    uniform float tenderness;
                    uniform float melancholy;
                    varying float vLife;
                    varying float vMemory;
                    varying float vTenderness;
                    
                    void main() {
                        vec2 center = vec2(0.5);
                        float dist = distance(gl_PointCoord, center);
                        if (dist > 0.5) discard;
                        
                        // 温柔的色彩
                        vec3 tenderColor = vec3(0.95, 0.85, 0.95); // 淡紫粉
                        vec3 memoryColor = vec3(0.9, 0.9, 1.0);    // 记忆的白
                        vec3 melancholyColor = vec3(0.7, 0.7, 0.9); // 忧郁的蓝紫
                        
                        // 混合情感
                        vec3 finalColor = mix(tenderColor, memoryColor, vMemory);
                        finalColor = mix(finalColor, melancholyColor, melancholy * (1.0 - vLife));
                        
                        // 温柔的透明度
                        float alpha = (1.0 - dist * 2.0) * vLife * tenderness;
                        alpha *= (0.8 + sin(time * 3.0 + vMemory * 10.0) * 0.2);
                        
                        gl_FragColor = vec4(finalColor, alpha);
                    }
                `,
                transparent: true,
                blending: THREE.AdditiveBlending,
                depthWrite: false
            }),
            
            // 梦幻氛围 - 像梦一样朦胧
            dreamyAtmosphere: new THREE.ShaderMaterial({
                uniforms: {
                    time: { value: 0 },
                    dreaminess: { value: this.romanceParams.dreaminess },
                    breath: { value: 1.0 }
                },
                vertexShader: `
                    varying vec3 vNormal;
                    varying vec3 vPosition;
                    
                    void main() {
                        vNormal = normalize(normalMatrix * normal);
                        vPosition = position;
                        
                        // 呼吸般的起伏
                        float breath = sin(time * 2.0) * 0.1 + 1.0;
                        vec3 pos = position * breath;
                        
                        gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
                    }
                `,
                fragmentShader: `
                    uniform float time;
                    uniform float dreaminess;
                    uniform float breath;
                    varying vec3 vNormal;
                    varying vec3 vPosition;
                    
                    void main() {
                        float fresnel = pow(1.0 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 2.0);
                        
                        // 梦幻色彩
                        vec3 dreamColor1 = vec3(0.8, 0.7, 1.0); // 梦幻紫
                        vec3 dreamColor2 = vec3(0.9, 0.8, 0.95); // 温柔粉紫
                        vec3 dreamColor3 = vec3(0.85, 0.9, 1.0); // 天空蓝
                        
                        // 色彩流动
                        vec3 finalColor = mix(dreamColor1, dreamColor2, sin(time + vPosition.x * 0.01) * 0.5 + 0.5);
                        finalColor = mix(finalColor, dreamColor3, cos(time * 0.7 + vPosition.y * 0.01) * 0.5 + 0.5);
                        
                        // 呼吸的光
                        float breathLight = sin(time * 3.0) * 0.3 + 0.7;
                        finalColor *= breathLight * breath;
                        
                        float alpha = fresnel * dreaminess * breathLight * 0.6;
                        
                        gl_FragColor = vec4(finalColor, alpha);
                    }
                `,
                transparent: true,
                blending: THREE.AdditiveBlending,
                side: THREE.BackSide
            })
        };
    }
    
    /**
     * 创建记忆纹理（存储美好回忆）
     */
    createMemoryTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 256;
        const ctx = canvas.getContext('2d');
        
        // 绘制记忆的纹理
        const gradient = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
        gradient.addColorStop(0, 'rgba(255, 220, 240, 1)');
        gradient.addColorStop(0.5, 'rgba(240, 200, 255, 0.8)');
        gradient.addColorStop(1, 'rgba(220, 180, 255, 0.6)');
        
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 256, 256);
        
        // 添加记忆的噪点
        for (let i = 0; i < 1000; i++) {
            const x = Math.random() * 256;
            const y = Math.random() * 256;
            const size = Math.random() * 3;
            const opacity = Math.random() * 0.3;
            
            ctx.fillStyle = `rgba(255, 255, 255, ${opacity})`;
            ctx.beginPath();
            ctx.arc(x, y, size, 0, Math.PI * 2);
            ctx.fill();
        }
        
        const texture = new THREE.CanvasTexture(canvas);
        return texture;
    }
    
    /**
     * 设置心跳
     */
    setupHeartBeat() {
        this.heartBeatInterval = setInterval(() => {
            this.emotionalState.heartbeat = 60 + Math.sin(Date.now() * 0.001) * 10;
        }, 100);
    }
    
    /**
     * 设置呼吸
     */
    setupBreath() {
        this.breathInterval = setInterval(() => {
            this.emotionalState.breath = Math.sin(Date.now() * 0.0005) * 0.5 + 0.5;
        }, 50);
    }
    
    /**
     * 创建情书流星（带着回忆的流星）
     */
    createLoveLetterMeteor(options = {}) {
        const defaults = {
            startPosition: new THREE.Vector3(0, 400, 0),
            velocity: new THREE.Vector3(-60, -90, 15),
            size: 2 + Math.random() * 2,
            memory: Math.random(), // 记忆浓度
            tenderness: 0.8 + Math.random() * 0.2,
            lifetime: 4000 + Math.random() * 2000
        };
        
        const config = { ...defaults, ...options };
        
        // 流星头（像一颗心跳）
        const meteorGeometry = new THREE.SphereGeometry(config.size, 20, 20);
        meteorGeometry.scale(1, 0.9, 1.1);
        
        const meteorMaterial = this.materials.loveLetterMeteor.clone();
        meteorMaterial.uniforms.loveIntensity.value = this.romanceParams.loveIntensity;
        
        const meteor = new THREE.Mesh(meteorGeometry, meteorMaterial);
        meteor.position.copy(config.startPosition);
        this.scene.add(meteor);
        
        // 温柔的轨迹（像思念一样绵长）
        const trailGeometry = new THREE.BufferGeometry();
        const trailLength = 80 + Math.floor(config.memory * 40);
        const trailPositions = new Float32Array(trailLength * 3);
        const trailSizes = new Float32Array(trailLength);
        const trailLives = new Float32Array(trailLength);
        const trailMemory = new Float32Array(trailLength);
        const trailTenderness = new Float32Array(trailLength);
        
        trailGeometry.setAttribute('position', new THREE.BufferAttribute(trailPositions, 3));
        trailGeometry.setAttribute('size', new THREE.BufferAttribute(trailSizes, 1));
        trailGeometry.setAttribute('life', new THREE.BufferAttribute(trailLives, 1));
        trailGeometry.setAttribute('memory', new THREE.BufferAttribute(trailMemory, 1));
        trailGeometry.setAttribute('tenderness', new THREE.BufferAttribute(trailTenderness, 1));
        
        const trailMaterial = this.materials.tenderTrail.clone();
        trailMaterial.uniforms.tenderness.value = config.tenderness;
        
        const trail = new THREE.Points(trailGeometry, trailMaterial);
        this.scene.add(trail);
        
        // 梦幻光晕（像梦一样朦胧）
        const glowGeometry = new THREE.SphereGeometry(config.size * 4, 16, 16);
        const glowMaterial = this.materials.dreamyAtmosphere.clone();
        glowMaterial.uniforms.dreaminess.value = this.romanceParams.dreaminess;
        
        const glow = new THREE.Mesh(glowGeometry, glowMaterial);
        glow.position.copy(config.startPosition);
        this.scene.add(glow);
        
        const meteorData = {
            type: 'loveLetterMeteor',
            head: meteor,
            trail: trail,
            glow: glow,
            velocity: config.velocity.clone(),
            acceleration: new THREE.Vector3(0, -12, 0),
            positions: [],
            startTime: Date.now(),
            lifetime: config.lifetime,
            memory: config.memory,
            tenderness: config.tenderness,
            config: config
        };
        
        this.activeEffects.add(meteorData);
        this.recordMoment('流星划过', meteorData);
        
        return meteorData;
    }
    
    /**
     * 记录珍贵瞬间
     */
    recordMoment(type, data) {
        this.timeMemory.moments.push({
            type: type,
            time: Date.now() - this.timeMemory.startTime,
            data: data,
            heartbeat: this.emotionalState.heartbeat,
            breath: this.emotionalState.breath
        });
        
        // 保持最近100个瞬间
        if (this.timeMemory.moments.length > 100) {
            this.timeMemory.moments.shift();
        }
    }
    
    /**
     * 创建流星雨（不是随机的，而是有故事的）
     */
    createLoveMeteorShower(count = 12, options = {}) {
        const shower = {
            meteors: [],
            startTime: Date.now(),
            story: this.generateLoveStory(),
            phase: 0
        };
        
        // 故事分三个阶段
        const phases = [
            { delay: 0, count: Math.floor(count * 0.4), emotion: 'firstSight' },
            { delay: 2000, count: Math.floor(count * 0.4), emotion: 'deepLove' },
            { delay: 4000, count: Math.floor(count * 0.2), emotion: 'eternalPromise' }
        ];
        
        phases.forEach((phase, phaseIndex) => {
            setTimeout(() => {
                shower.phase = phaseIndex;
                
                for (let i = 0; i < phase.count; i++) {
                    setTimeout(() => {
                        const meteor = this.createLoveLetterMeteor({
                            startPosition: new THREE.Vector3(
                                (Math.random() - 0.5) * 1200,
                                500 + Math.random() * 300,
                                (Math.random() - 0.5) * 1200
                            ),
                            velocity: new THREE.Vector3(
                                -40 - Math.random() * 40,
                                -70 - Math.random() * 50,
                                (Math.random() - 0.5) * 30
                            ),
                            memory: 0.5 + phaseIndex * 0.25,
                            tenderness: 0.7 + phaseIndex * 0.15,
                            size: 1.5 + phaseIndex * 0.5
                        });
                        
                        shower.meteors.push(meteor);
                    }, i * (300 + Math.random() * 200));
                }
            }, phase.delay);
        });
        
        this.recordMoment('流星雨', shower);
        return shower;
    }
    
    /**
     * 生成爱情故事
     */
    generateLoveStory() {
        const stories = [
            {
                title: '初见',
                content: '在那个安静的夜晚，我第一次看见你，像流星划过我的心',
                color: 0xffc0cb,
                tenderness: 0.8
            },
            {
                title: '心动',
                content: '每一次心跳，都是为你而跳动的旋律',
                color: 0xff69b4,
                tenderness: 0.9
            },
            {
                title: '深爱',
                content: '时间越久，爱意越深，像星星一样永恒',
                color: 0x9370db,
                tenderness: 0.95
            }
        ];
        
        return stories;
    }
    
    /**
     * 创建情感绽放（替代爆炸）
     */
    createEmotionBloom(position, emotion = 'love') {
        const emotions = {
            love: {
                colors: [0xff6b9d, 0xffa8cc, 0xffffff, 0xffd1dc],
                petals: 12,
                tenderness: 0.9
            },
            joy: {
                colors: [0xffff00, 0xffd700, 0xffa500, 0xffffff],
                petals: 8,
                tenderness: 0.8
            },
            nostalgia: {
                colors: [0x9370db, 0xba55d3, 0xffffff, 0xe6e6fa],
                petals: 16,
                tenderness: 0.95
            }
        };
        
        const config = emotions[emotion] || emotions.love;
        
        // 创建花瓣
        const petals = [];
        for (let i = 0; i < config.petals; i++) {
            const angle = (i / config.petals) * Math.PI * 2;
            const petal = this.createLoveLetterMeteor({
                startPosition: position.clone(),
                velocity: new THREE.Vector3(
                    Math.cos(angle) * 30,
                    Math.sin(angle) * 10 + 5,
                    Math.sin(angle) * 30
                ),
                size: 1,
                memory: 0.7,
                tenderness: config.tenderness,
                lifetime: 3000
            });
            
            // 设置花瓣颜色
            const color = config.colors[i % config.colors.length];
            petal.head.material.uniforms.color.value.setHex(color);
            
            petals.push(petal);
        }
        
        const bloom = {
            type: 'emotionBloom',
            petals: petals,
            emotion: emotion,
            startTime: Date.now(),
            position: position.clone()
        };
        
        this.recordMoment('情感绽放', bloom);
        return bloom;
    }
    
    /**
     * 创建时光尘埃（替代魔法光尘）
     */
    createTimeDust(position, options = {}) {
        const defaults = {
            count: 20,
            lifetime: 6000,
            memory: 0.6
        };
        
        const config = { ...defaults, ...options };
        
        const dusts = [];
        for (let i = 0; i < config.count; i++) {
            const dust = this.createLoveLetterMeteor({
                startPosition: position.clone().add(new THREE.Vector3(
                    (Math.random() - 0.5) * 50,
                    (Math.random() - 0.5) * 50,
                    (Math.random() - 0.5) * 50
                )),
                velocity: new THREE.Vector3(
                    (Math.random() - 0.5) * 1,
                    Math.random() * 0.5 + 0.2,
                    (Math.random() - 0.5) * 1
                ),
                size: 0.5 + Math.random() * 0.5,
                memory: config.memory,
                tenderness: 0.95,
                lifetime: config.lifetime * (0.8 + Math.random() * 0.4)
            });
            
            dusts.push(dust);
        }
        
        const dustCloud = {
            type: 'timeDust',
            dusts: dusts,
            startTime: Date.now(),
            position: position.clone()
        };
        
        this.recordMoment('时光尘埃', dustCloud);
        return dustCloud;
    }
    
    /**
     * 更新所有浪漫特效
     */
    update() {
        const deltaTime = this.clock.getDelta();
        const currentTime = Date.now();
        
        // 更新材质
        Object.values(this.materials).forEach(material => {
            if (material.uniforms.time) {
                material.uniforms.time.value += deltaTime;
            }
            if (material.uniforms.heartbeat) {
                material.uniforms.heartbeat.value = this.emotionalState.heartbeat / 60;
            }
        });
        
        // 更新情书流星
        this.updateLoveLetterMeteors(deltaTime, currentTime);
    }
    
    /**
     * 更新情书流星
     */
    updateLoveLetterMeteors(deltaTime, currentTime) {
        this.activeEffects.forEach(effect => {
            if (effect.type !== 'loveLetterMeteor') return;
            
            const elapsed = currentTime - effect.startTime;
            const progress = elapsed / effect.lifetime;
            
            if (progress >= 1) {
                this.removeRomanticEffect(effect);
                return;
            }
            
            // 温柔的物理
            const turbulence = new THREE.Vector3(
                Math.sin(currentTime * 0.008 + effect.head.position.x * 0.005) * effect.tenderness * 0.1,
                Math.cos(currentTime * 0.006 + effect.head.position.y * 0.005) * effect.tenderness * 0.1,
                Math.sin(currentTime * 0.01 + effect.head.position.z * 0.005) * effect.tenderness * 0.1
            );
            
            // 更新物理
            effect.velocity.add(effect.acceleration.clone().multiplyScalar(deltaTime));
            effect.velocity.add(turbulence.multiplyScalar(deltaTime * 20));
            effect.head.position.add(effect.velocity.clone().multiplyScalar(deltaTime));
            
            // 更新轨迹
            effect.positions.push(effect.head.position.clone());
            if (effect.positions.length > effect.config.trailLength) {
                effect.positions.shift();
            }
            
            // 更新温柔轨迹
            const positions = effect.trail.geometry.attributes.position.array;
            const lives = effect.trail.geometry.attributes.life.array;
            const sizes = effect.trail.geometry.attributes.size.array;
            const memory = effect.trail.geometry.attributes.memory.array;
            const tenderness = effect.trail.geometry.attributes.tenderness.array;
            
            for (let i = 0; i < effect.positions.length; i++) {
                const pos = effect.positions[i];
                const trailProgress = i / effect.positions.length;
                
                // 温柔的偏移
                const offset = new THREE.Vector3(
                    Math.sin(currentTime * 0.005 + i) * effect.tenderness * 2,
                    Math.cos(currentTime * 0.003 + i) * effect.tenderness * 2,
                    Math.sin(currentTime * 0.007 + i) * effect.tenderness * 2
                );
                
                positions[i * 3] = pos.x + offset.x;
                positions[i * 3 + 1] = pos.y + offset.y;
                positions[i * 3 + 2] = pos.z + offset.z;
                
                // 记忆浓度（前端更浓）
                memory[i] = effect.memory * (1 - trailProgress * 0.5);
                
                // 温柔度
                tenderness[i] = effect.tenderness;
                
                // 大小
                sizes[i] = effect.config.size * (1 - trailProgress) * (1 - progress) * effect.tenderness;
                
                // 透明度（温柔的淡出）
                lives[i] = (1 - progress) * trailProgress * effect.tenderness;
            }
            
            effect.trail.geometry.attributes.position.needsUpdate = true;
            effect.trail.geometry.attributes.life.needsUpdate = true;
            effect.trail.geometry.attributes.size.needsUpdate = true;
            effect.trail.geometry.attributes.memory.needsUpdate = true;
            effect.trail.geometry.attributes.tenderness.needsUpdate = true;
            
            // 更新光晕
            effect.glow.position.copy(effect.head.position);
            effect.glow.material.uniforms.intensity.value = (1 - progress) * effect.tenderness * 0.4;
            
            // 更新流星头
            effect.head.material.uniforms.loveIntensity.value = this.romanceParams.loveIntensity * (1 - progress);
            effect.head.material.uniforms.intensity.value = 1 - progress;
            
            // 温柔的旋转
            effect.head.rotation.x += deltaTime * effect.tenderness * 3;
            effect.head.rotation.y += deltaTime * effect.tenderness * 2;
        });
    }
    
    /**
     * 移除浪漫特效
     */
    removeRomanticEffect(effect) {
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
     * 销毁浪漫特效管理器
     */
    dispose() {
        this.activeEffects.forEach(effect => this.removeRomanticEffect(effect));
        
        Object.values(this.materials).forEach(material => {
            material.dispose();
        });
        
        if (this.heartBeatInterval) {
            clearInterval(this.heartBeatInterval);
        }
        if (this.breathInterval) {
            clearInterval(this.breathInterval);
        }
        
        this.activeEffects.clear();
    }
}

export default RomanticEffectsManager;
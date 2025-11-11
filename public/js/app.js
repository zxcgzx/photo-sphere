/**
 * 主应用类 - 我们的小宇宙
 * 协调所有模块的工作
 */

import { CONFIG } from './config.js';
import AuthManager from './authManager.js';
import SceneManager from './sceneManager.js';
import PhotoManager from './photoManager.js';
import PerformanceManager from './performanceManager.js';
import DebugPanel from './debugPanel.js';
import UploadModal from './uploadModal.js';
import RomanticEffectsManager from './romanticEffects.js';
import RomanticParticleSystem from './romanticParticles.js';

class PhotoSphereApp {
    constructor() {
        this.config = CONFIG;
        this.sceneManager = null;
        this.photoManager = null;
        this.uploadModal = null;
        this.debugPanel = null;
        this.authManager = null;
        
        // 应用状态
        this.isInitialized = false;
        this.currentMood = 0;
        this.lightMode = 0;
        this.autoRotate = false;
        this.useSmartLoading = true;
        
        // 交互状态
        this.isUserInteracting = false;
        this.targetRotationX = 0;
        this.targetRotationY = 0;
        this.mouseX = 0;
        this.mouseY = 0;
        this.windowHalfX = window.innerWidth / 2;
        this.windowHalfY = window.innerHeight / 2;
        
        // 触摸状态
        this.touchStartX = 0;
        this.touchStartY = 0;
        this.touchDistance = 0;
        
        // UI元素
        this.elements = {};
        
        // 绑定方法
        this.animate = this.animate.bind(this);
        this.onWindowResize = this.onWindowResize.bind(this);
        
        // 定时器管理（用于清理）
        this.timers = [];
        this.intervals = [];
        
        // 星空背景缓存
        this.starFieldCache = null;
        this.starFieldCanvas = null;
        
        // resize 节流定时器
        this.resizeTimer = null;
        
        // 特效管理器
        this.effectsManager = null;
        
        // 物理粒子系统
        this.particleSystem = null;
        
        // 将实例暴露到全局，供其他模块使用
        window.photoSphereApp = this;
    }
    
    /**
     * 初始化应用
     */
    async initialize() {
        try {
            this.config.log('初始化我们的小宇宙应用...');
            
            // 验证配置
            if (!this.config.validate()) {
                throw new Error('配置验证失败');
            }
            
            // 初始化UI元素
            this.initializeElements();
            
            // 初始化身份认证管理器
            this.authManager = new AuthManager(this.config);
            await this.authManager.initialize();
            
            // 显示密码验证界面
            await this.showPasswordScreen();
            
            // 创建星空背景
            this.createStarField();
            
            // 初始化3D场景
            await this.initializeScene();
            
            // 初始化特效管理器
            this.effectsManager = new RomanticEffectsManager(this.sceneManager);
            
            // 初始化物理粒子系统
            this.particleSystem = new RomanticParticleSystem();
            
            // 初始化照片管理器
            await this.initializePhotoManager();
            
            // 设置事件监听
            this.setupEventListeners();
            
            // 初始化上传功能
            this.initializeUpload();
            
            // 初始化调试面板（开发模式）
            if (this.config.debug?.enabled) {
                this.initializeDebugPanel();
            }
            
            // 加载照片
            await this.loadPhotos();
            
            // 更新统计信息
            this.updateStats();
            
            // 创建浮动元素
            this.createFloatingElements();
            
            // 标记为已初始化
            this.isInitialized = true;
            
            this.config.log('应用初始化完成');
            
        } catch (error) {
            this.config.error('应用初始化失败:', error);
            this.showError('应用初始化失败，请刷新页面重试');
            throw error;
        }
    }
    
    /**
     * 初始化UI元素
     */
    initializeElements() {
        this.elements = {
            // 密码界面
            passwordScreen: document.getElementById('password-screen'),
            monthSelect: document.getElementById('month-select'),
            nicknameInput: document.getElementById('nickname-input'),
            wordSelected: document.getElementById('word-selected'),
            enterBtn: document.getElementById('enter-btn'),
            wordBtns: document.querySelectorAll('.word-btn'),
            
            // 加载界面
            loadingScreen: document.getElementById('loading-screen'),
            loadingText: document.getElementById('loading-text'),
            progressBar: document.getElementById('progress-bar'),
            
            // 主界面
            canvasContainer: document.getElementById('canvas-container'),
            titleContainer: document.getElementById('title-container'),
            controlPanel: document.getElementById('control-panel'),
            statsPanel: document.getElementById('stats-panel'),
            
            // 控制按钮
            btnRotate: document.getElementById('btn-rotate'),
            btnStats: document.getElementById('btn-stats'),
            btnRandom: document.getElementById('btn-random'),
            btnMood: document.getElementById('btn-mood'),
            btnLight: document.getElementById('btn-light'),
            btnSurprise: document.getElementById('btn-surprise'),
            
            // 照片查看器
            photoViewer: document.getElementById('photo-viewer'),
            viewerClose: document.getElementById('viewer-close'),
            viewerImage: document.getElementById('viewer-image'),
            viewerDate: document.getElementById('viewer-date'),
            viewerCaption: document.getElementById('viewer-caption'),
            
            // 手势提示
            gestureHint: document.getElementById('gesture-hint'),
            
            // 统计信息
            daysCount: document.getElementById('days-count'),
            photoCount: document.getElementById('photo-count'),
            sweetIndex: document.getElementById('sweet-index')
        };
    }
    
    /**
     * 显示密码验证界面
     */
    async showPasswordScreen() {
        return new Promise((resolve) => {
            if (!this.elements.passwordScreen) {
                resolve(); // 如果没有密码界面，直接继续
                return;
            }
            
            this.initPasswordScreen();
            
            // 监听密码验证成功事件
            this.elements.passwordScreen.addEventListener('passwordSuccess', () => {
                this.elements.passwordScreen.style.display = 'none';
                resolve();
            });
        });
    }
    
    /**
     * 初始化密码验证
     */
    initPasswordScreen() {
        // 单词选择按钮
        this.elements.wordBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                this.elements.wordBtns.forEach(b => b.classList.remove('selected'));
                btn.classList.add('selected');
                this.elements.wordSelected.value = btn.dataset.word;
                this.checkFormComplete();
            });
        });
        
        // 监听输入变化
        this.elements.monthSelect?.addEventListener('change', () => this.checkFormComplete());
        this.elements.nicknameInput?.addEventListener('input', () => this.checkFormComplete());
        
        // 验证按钮
        this.elements.enterBtn?.addEventListener('click', () => this.verifyPassword());
        
        // 回车键提交
        this.elements.nicknameInput?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !this.elements.enterBtn.disabled) {
                this.verifyPassword();
            }
        });
    }
    
    /**
     * 检查表单完整性
     */
    checkFormComplete() {
        const month = this.elements.monthSelect?.value;
        const nickname = this.elements.nicknameInput?.value.trim();
        const word = this.elements.wordSelected?.value;
        
        const isComplete = month && nickname && word;
        
        if (this.elements.enterBtn) {
            this.elements.enterBtn.disabled = !isComplete;
            this.elements.enterBtn.style.opacity = isComplete ? '1' : '0.5';
        }
    }
    
    /**
     * 验证密码
     */
    async verifyPassword() {
        const month = this.elements.monthSelect?.value;
        const nickname = this.elements.nicknameInput?.value.trim();
        const word = this.elements.wordSelected?.value;
        
        // 禁用按钮防止重复提交
        if (this.elements.enterBtn) {
            this.elements.enterBtn.disabled = true;
            this.elements.enterBtn.innerHTML = '<span>🔄 验证中...</span>';
        }
        
        try {
            // 使用认证管理器验证安全问题
            const result = await this.authManager.verifySecurityQuestions({
                month,
                nickname,
                word
            });
            
            if (result.success) {
                this.showSuccessAnimation();
                setTimeout(() => {
                    const event = new CustomEvent('passwordSuccess');
                    this.elements.passwordScreen.dispatchEvent(event);
                }, 2000);
            } else {
                this.showErrorAnimation(result.message || '答案不正确，请重试');
            }
            
        } catch (error) {
            this.config.error('密码验证失败:', error);
            this.showErrorAnimation('验证过程出现错误，请重试');
        } finally {
            // 重新启用按钮
            if (this.elements.enterBtn) {
                this.elements.enterBtn.disabled = false;
                this.elements.enterBtn.innerHTML = '<span>✨ 进入我们的小宇宙 ✨</span>';
            }
        }
    }
    
    /**
     * 成功动画
     */
    showSuccessAnimation() {
        if (!this.elements.enterBtn) return;
        
        this.elements.enterBtn.innerHTML = '<span>🎉 欢迎进入我们的小宇宙！ 🎉</span>';
        this.elements.enterBtn.style.background = 'linear-gradient(135deg, #00ff88, #00ffff)';
        
        // 创建粒子效果
        const container = document.querySelector('.password-container');
        if (container) {
            for (let i = 0; i < 20; i++) {
                setTimeout(() => this.createSuccessParticle(container), i * 100);
            }
        }
    }
    
    /**
     * 错误动画
     */
    showErrorAnimation(message = '答案不对哦，再想想～') {
        if (!this.elements.enterBtn) return;
        
        this.elements.enterBtn.innerHTML = `<span>❌ ${message} ❌</span>`;
        this.elements.enterBtn.style.background = 'linear-gradient(135deg, #ff6b6b, #ff8e8e)';
        
        // 抖动动画
        const container = document.querySelector('.password-container');
        if (container) {
            container.style.animation = 'shake 0.5s ease-in-out';
            
            setTimeout(() => {
                this.elements.enterBtn.innerHTML = '<span>✨ 进入我们的小宇宙 ✨</span>';
                this.elements.enterBtn.style.background = 'linear-gradient(135deg, #667eea, #764ba2, #f093fb)';
                container.style.animation = '';
            }, 3000); // 增加显示时间以便用户看清错误信息
        }
    }
    
    /**
     * 创建成功粒子
     */
    createSuccessParticle(container) {
        const particle = document.createElement('div');
        particle.style.cssText = `
            position: absolute;
            width: 10px;
            height: 10px;
            background: radial-gradient(circle, #00ff88, #00ffff);
            border-radius: 50%;
            pointer-events: none;
            left: ${Math.random() * 100}%;
            top: ${Math.random() * 100}%;
            animation: particleFloat 2s ease-out forwards;
        `;
        
        container.appendChild(particle);
        setTimeout(() => particle.remove(), 2000);
    }
    
    /**
     * 创建星空背景（带缓存优化）
     */
    createStarField() {
        const canvas = document.getElementById('stars-canvas');
        if (!canvas) return;
        
        // 缓存 canvas 引用
        this.starFieldCanvas = canvas;
        
        const ctx = canvas.getContext('2d');
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        
        // 如果已有缓存，直接使用
        if (this.starFieldCache && 
            this.starFieldCache.width === canvas.width && 
            this.starFieldCache.height === canvas.height) {
            ctx.drawImage(this.starFieldCache, 0, 0);
            return;
        }
        
        // 创建渐变背景
        const gradient = ctx.createRadialGradient(
            canvas.width / 2, canvas.height / 2, 0,
            canvas.width / 2, canvas.height / 2, canvas.width / 2
        );
        gradient.addColorStop(0, '#0a0a2a');
        gradient.addColorStop(0.5, '#000814');
        gradient.addColorStop(1, '#000000');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // 创建星星
        for (let i = 0; i < this.config.scene.starsCount; i++) {
            const x = Math.random() * canvas.width;
            const y = Math.random() * canvas.height;
            const radius = Math.random() * 1.5;
            const opacity = Math.random() * 0.8 + 0.2;
            
            ctx.beginPath();
            ctx.arc(x, y, radius, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255, 255, 255, ${opacity})`;
            ctx.fill();
            
            // 添加发光效果
            if (Math.random() > 0.95) {
                const glow = ctx.createRadialGradient(x, y, 0, x, y, radius * 4);
                glow.addColorStop(0, `rgba(255, 255, 255, ${opacity})`);
                glow.addColorStop(1, 'rgba(255, 255, 255, 0)');
                ctx.fillStyle = glow;
                ctx.fillRect(x - radius * 4, y - radius * 4, radius * 8, radius * 8);
            }
        }
        
        // 添加星云效果
        for (let i = 0; i < 3; i++) {
            const x = Math.random() * canvas.width;
            const y = Math.random() * canvas.height;
            const radius = Math.random() * 200 + 100;
            const color = this.config.themes.galaxyColors[Math.floor(Math.random() * this.config.themes.galaxyColors.length)];
            
            const nebula = ctx.createRadialGradient(x, y, 0, x, y, radius);
            nebula.addColorStop(0, color + '20');
            nebula.addColorStop(0.5, color + '10');
            nebula.addColorStop(1, 'transparent');
            ctx.fillStyle = nebula;
            ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
        }
        
        // 缓存绘制结果
        this.starFieldCache = document.createElement('canvas');
        this.starFieldCache.width = canvas.width;
        this.starFieldCache.height = canvas.height;
        this.starFieldCache.getContext('2d').drawImage(canvas, 0, 0);
    }
    
    /**
     * 初始化3D场景
     */
    async initializeScene() {
        this.sceneManager = new SceneManager(this.config);
        await this.sceneManager.initialize(this.elements.canvasContainer);
    }
    
    /**
     * 初始化照片管理器
     */
    async initializePhotoManager() {
        this.photoManager = new PhotoManager(this.config, this.sceneManager);
        await this.photoManager.initialize();
        
        // 设置回调
        this.photoManager.onLoadProgress = (progress, loaded, total) => {
            this.updateLoadingProgress(progress, loaded, total);
        };
        
        this.photoManager.onLoadComplete = (loaded, total) => {
            this.hideLoadingScreen();
            this.showGestureHint();
        };
        
        this.photoManager.onPhotoClick = (photoData, mesh) => {
            this.showPhotoViewer(photoData, mesh);
        };
    }
    
    /**
     * 初始化上传功能
     */
    initializeUpload() {
        // 创建上传模态框
        this.uploadModal = new UploadModal(this.config);
        
        // 检查是否已存在上传按钮，避免重复
        const existingUploadBtn = document.getElementById('btn-upload');
        if (existingUploadBtn) {
            // 使用现有的上传按钮
            existingUploadBtn.addEventListener('click', () => {
                if (this.uploadModal) {
                    this.uploadModal.open();
                } else {
                    window.open('upload.html', '_blank');
                }
            });
        } else if (this.elements.controlPanel) {
            // 在控制面板添加新的上传按钮
            const uploadBtn = document.createElement('button');
            uploadBtn.className = 'control-btn';
            uploadBtn.id = 'btn-upload';
            uploadBtn.innerHTML = '<span>📤</span><span>上传照片</span>';
            uploadBtn.addEventListener('click', () => {
                if (this.uploadModal) {
                    this.uploadModal.open();
                } else {
                    window.open('upload.html', '_blank');
                }
            });
            this.elements.controlPanel.appendChild(uploadBtn);
        }
    }
    
    /**
     * 加载照片
     */
    async loadPhotos() {
        if (this.elements.loadingScreen) {
            this.elements.loadingScreen.style.display = 'flex';
        }
        
        // 根据配置选择加载方式
        if (this.useSmartLoading && this.photoManager.smartLoadPhotos) {
            this.config.log('使用智能懒加载模式');
            await this.photoManager.smartLoadPhotos();
        } else {
            this.config.log('使用传统加载模式');
            await this.photoManager.loadAndDisplayPhotos();
        }
    }
    
    /**
     * 初始化调试面板
     */
    initializeDebugPanel() {
        try {
            this.debugPanel = new DebugPanel(this.config, this.photoManager);
            this.debugPanel.initialize();
            this.config.log('调试面板已初始化');
        } catch (error) {
            this.config.warn('调试面板初始化失败:', error);
        }
    }
    
    /**
     * 设置事件监听
     */
    setupEventListeners() {
        const container = this.elements.canvasContainer;
        if (!container) return;
        
        // 鼠标事件
        container.addEventListener('mousedown', (e) => this.onMouseDown(e), false);
        container.addEventListener('mousemove', (e) => this.onMouseMove(e), false);
        container.addEventListener('mouseup', () => this.onMouseUp(), false);
        container.addEventListener('wheel', (e) => this.onMouseWheel(e), false);
        
        // 触摸事件
        container.addEventListener('touchstart', (e) => this.onTouchStart(e), { passive: false });
        container.addEventListener('touchmove', (e) => this.onTouchMove(e), { passive: false });
        container.addEventListener('touchend', () => this.onTouchEnd(), { passive: false });
        
        // 点击照片
        container.addEventListener('click', (e) => this.photoManager.handlePhotoClick(e), false);
        
        // 控制按钮
        this.elements.btnRotate?.addEventListener('click', () => this.toggleRotate());
        this.elements.btnStats?.addEventListener('click', () => this.toggleStats());
        this.elements.btnRandom?.addEventListener('click', () => this.randomView());
        this.elements.btnMood?.addEventListener('click', () => this.changeMood());
        this.elements.btnLight?.addEventListener('click', () => this.toggleLights());
        this.elements.btnSurprise?.addEventListener('click', () => this.surprise());
        
        // 查看器关闭
        this.elements.viewerClose?.addEventListener('click', () => this.closeViewer());
        
        // 窗口事件
        window.addEventListener('resize', this.onWindowResize, false);
        
        // 键盘事件
        document.addEventListener('keydown', (e) => this.onKeyDown(e));
        
        // 防止页面默认拖拽行为
        document.addEventListener('dragover', e => e.preventDefault());
        document.addEventListener('drop', e => e.preventDefault());
    }
    
    /**
     * 鼠标事件处理
     */
    onMouseDown(event) {
        event.preventDefault();
        this.isUserInteracting = true;
        this.mouseX = event.clientX - this.windowHalfX;
        this.mouseY = event.clientY - this.windowHalfY;
    }
    
    onMouseMove(event) {
        if (this.isUserInteracting) {
            this.mouseX = event.clientX - this.windowHalfX;
            this.targetRotationY = (this.mouseX - event.clientX + this.windowHalfX) * 0.005;
            this.targetRotationX = (this.mouseY - event.clientY + this.windowHalfY) * 0.005;
        }
    }
    
    onMouseUp() {
        this.isUserInteracting = false;
    }
    
    onMouseWheel(event) {
        event.preventDefault();
        const delta = event.deltaY * 0.5;
        if (this.sceneManager && this.sceneManager.camera) {
            this.sceneManager.camera.position.z += delta;
            this.sceneManager.camera.position.z = Math.max(300, Math.min(1000, this.sceneManager.camera.position.z));
        }
    }
    
    /**
     * 触摸事件处理
     */
    onTouchStart(event) {
        event.preventDefault();
        
        if (event.touches.length === 1) {
            this.isUserInteracting = true;
            this.touchStartX = event.touches[0].pageX;
            this.touchStartY = event.touches[0].pageY;
        } else if (event.touches.length === 2) {
            const dx = event.touches[0].pageX - event.touches[1].pageX;
            const dy = event.touches[0].pageY - event.touches[1].pageY;
            this.touchDistance = Math.sqrt(dx * dx + dy * dy);
        }
    }
    
    onTouchMove(event) {
        event.preventDefault();
        
        if (event.touches.length === 1 && this.isUserInteracting) {
            const touchX = event.touches[0].pageX;
            const touchY = event.touches[0].pageY;
            this.targetRotationY = (this.touchStartX - touchX) * 0.005;
            this.targetRotationX = (this.touchStartY - touchY) * 0.005;
        } else if (event.touches.length === 2 && this.sceneManager?.camera) {
            const dx = event.touches[0].pageX - event.touches[1].pageX;
            const dy = event.touches[0].pageY - event.touches[1].pageY;
            const distance = Math.sqrt(dx * dx + dy * dy);
            const delta = (distance - this.touchDistance) * 0.5;
            this.sceneManager.camera.position.z -= delta;
            this.sceneManager.camera.position.z = Math.max(300, Math.min(1000, this.sceneManager.camera.position.z));
            this.touchDistance = distance;
        }
    }
    
    onTouchEnd() {
        this.isUserInteracting = false;
    }
    
    /**
     * 键盘事件处理
     */
    onKeyDown(event) {
        switch (event.key) {
            case ' ':
                event.preventDefault();
                this.toggleRotate();
                break;
            case 'r':
            case 'R':
                this.randomView();
                break;
            case 's':
            case 'S':
                this.toggleStats();
                break;
            case 'Escape':
                this.closeViewer();
                break;
        }
    }
    
    /**
     * 窗口大小调整（带节流优化）
     */
    onWindowResize() {
        // 清除之前的定时器
        if (this.resizeTimer) {
            clearTimeout(this.resizeTimer);
        }
        
        // 延迟执行 resize 操作
        this.resizeTimer = setTimeout(() => {
            this.windowHalfX = window.innerWidth / 2;
            this.windowHalfY = window.innerHeight / 2;
            
            if (this.sceneManager) {
                this.sceneManager.onWindowResize();
            }
            
            // 更新星空画布
            const canvas = document.getElementById('stars-canvas');
            if (canvas) {
                canvas.width = window.innerWidth;
                canvas.height = window.innerHeight;
                this.createStarField();
            }
        }, 250); // 250ms 节流
    }
    
    /**
     * 动画循环
     */
    animate() {
        if (!this.isInitialized) return;
        
        // 自动旋转
        if (this.autoRotate && !this.isUserInteracting && this.sceneManager?.photoGroup) {
            this.sceneManager.photoGroup.rotation.y += this.config.scene.autoRotateSpeed * 0.01;
        }
        
        // 手动旋转
        if (this.isUserInteracting && this.sceneManager?.photoGroup) {
            this.sceneManager.photoGroup.rotation.y += this.targetRotationY;
            this.sceneManager.photoGroup.rotation.x += this.targetRotationX;
            this.targetRotationY *= 0.95;
            this.targetRotationX *= 0.95;
        }
        
        // 限制X轴旋转
        if (this.sceneManager?.photoGroup) {
            this.sceneManager.photoGroup.rotation.x = Math.max(
                -Math.PI / 4, 
                Math.min(Math.PI / 4, this.sceneManager.photoGroup.rotation.x)
            );
            
            // 同步其他组的旋转
            if (this.sceneManager.particleGroup) {
                this.sceneManager.particleGroup.rotation.copy(this.sceneManager.photoGroup.rotation);
            }
            if (this.sceneManager.orbitGroup) {
                this.sceneManager.orbitGroup.rotation.copy(this.sceneManager.photoGroup.rotation);
            }
        }
        
        // 更新特效
        if (this.effectsManager) {
            this.effectsManager.update();
        }
        
        // 更新物理粒子系统
        if (this.particleSystem) {
            this.particleSystem.update();
        }
    }
    
    /**
     * 切换自动旋转
     */
    toggleRotate() {
        this.autoRotate = !this.autoRotate;
        if (this.elements.btnRotate) {
            this.elements.btnRotate.innerHTML = this.autoRotate ? 
                '<span>⏸️</span><span>停止旋转</span>' : 
                '<span>🔄</span><span>自动旋转</span>';
        }
    }
    
    /**
     * 切换统计面板
     */
    toggleStats() {
        if (this.elements.statsPanel) {
            const isVisible = this.elements.statsPanel.style.display !== 'none';
            this.elements.statsPanel.style.display = isVisible ? 'none' : 'block';
        }
    }
    
    /**
     * 随机视角
     */
    randomView() {
        const randomPhoto = this.photoManager?.getRandomPhoto();
        if (!randomPhoto || !this.sceneManager?.camera) return;
        
        // 计算相机位置
        const direction = new THREE.Vector3();
        direction.copy(randomPhoto.position).normalize();
        const targetPosition = direction.multiplyScalar(500);
        
        if (window.TWEEN) {
            new TWEEN.Tween(this.sceneManager.camera.position)
                .to(targetPosition, this.config.animations.cameraMoveDuration)
                .easing(TWEEN.Easing.Quadratic.InOut)
                .start();
        }
        
        // 高亮照片
        this.photoManager.highlightPhoto(randomPhoto);
    }
    
    /**
     * 切换心情主题
     */
    changeMood() {
        this.currentMood = (this.currentMood + 1) % this.config.themes.moods.length;
        const mood = this.config.themes.moods[this.currentMood];
        
        // 更新星空背景
        this.updateStarFieldMood(mood);
        
        // 保存主题设置
        this.config.saveTheme(mood.name);
        
        this.showToast(`切换到${mood.name}主题 🎨`);
    }
    
    /**
     * 更新星空背景主题
     */
    updateStarFieldMood(mood) {
        const canvas = document.getElementById('stars-canvas');
        if (!canvas) return;
        
        const ctx = canvas.getContext('2d');
        
        // 创建新的渐变背景
        const gradient = ctx.createRadialGradient(
            canvas.width / 2, canvas.height / 2, 0,
            canvas.width / 2, canvas.height / 2, canvas.width / 2
        );
        
        if (mood.colors.length === 2) {
            gradient.addColorStop(0, mood.colors[0]);
            gradient.addColorStop(1, mood.colors[1]);
        } else {
            mood.colors.forEach((color, index) => {
                gradient.addColorStop(index / (mood.colors.length - 1), color);
            });
        }
        
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // 重新绘制星星
        for (let i = 0; i < this.config.scene.starsCount; i++) {
            const x = Math.random() * canvas.width;
            const y = Math.random() * canvas.height;
            const radius = Math.random() * 1.5;
            const opacity = Math.random() * 0.8 + 0.2;
            
            ctx.beginPath();
            ctx.arc(x, y, radius, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255, 255, 255, ${opacity})`;
            ctx.fill();
        }
    }
    
    /**
     * 切换灯光模式
     */
    toggleLights() {
        this.lightMode = (this.lightMode + 1) % this.config.themes.lightModes.length;
        const mode = this.config.themes.lightModes[this.lightMode];
        
        if (this.sceneManager) {
            this.sceneManager.switchLightMode(this.lightMode);
        }
        
        this.showToast(`${mode.name} ${this.getLightModeEmoji(this.lightMode)}`);
    }
    
    /**
     * 获取灯光模式表情符号
     */
    getLightModeEmoji(mode) {
        const emojis = ['☀️', '🌌', '🌠'];
        return emojis[mode] || '💡';
    }
    
    /**
     * 浪漫惊喜 - 讲述一个爱情故事
     */
    surprise() {
        // 开始：情书流星雨（讲述我们的故事）
        if (this.effectsManager) {
            // 创建有故事的流星雨（三个阶段：初见→深爱→永恒）
            const loveStory = this.effectsManager.createLoveMeteorShower(12);
            
            // 记录这个珍贵时刻
            this.recordMoment('流星雨开始', { story: loveStory.story });
        }
        
        // 发展：每一张照片都绽放爱意
        if (this.effectsManager) {
            this.photoManager.photoMeshes.forEach((photo, index) => {
                if (!photo.userData.isPhoto || photo.userData.isPlaceholder) return;
                
                // 每个照片都有自己的情感绽放
                setTimeout(() => {
                    const bloom = this.effectsManager.createEmotionBloom(
                        photo.position,
                        index % 2 === 0 ? 'love' : 'joy'
                    );
                    
                    // 记录每一朵绽放的爱
                    this.recordMoment(`照片${index}绽放`, { 
                        emotion: index % 2 === 0 ? 'love' : 'joy',
                        position: photo.position 
                    });
                }, index * 200); // 自然的节奏，像心跳
            });
        }
        
        // 深入：时光尘埃营造梦幻氛围
        if (this.effectsManager) {
            setTimeout(() => {
                this.effectsManager.createTimeDust(
                    new THREE.Vector3(0, 0, 0),
                    { count: 30, lifetime: 8000 }
                );
                
                this.recordMoment('时光尘埃', { center: 'scene' });
            }, 1000);
        }
        
        // 高潮：永恒的誓言
        if (this.effectsManager) {
            setTimeout(() => {
                const promise = this.effectsManager.createEternalPromise(
                    new THREE.Vector3(0, 200, 0),
                    { layers: 3, particlesPerLayer: 12 }
                );
                
                this.recordMoment('永恒的誓言', { 
                    layers: promise.layers.length,
                    center: promise.centerPosition 
                });
            }, 3000);
        }
        
        // 持续：思念之雨（持续的温柔）
        if (this.particleSystem) {
            setTimeout(() => {
                this.particleSystem.createLongingRain('medium');
                this.recordMoment('思念之雨', { intensity: 'medium' });
            }, 1500);
        }
        
        // 照片的情感共鸣
        this.photoManager.photoMeshes.forEach((photo, index) => {
            if (!photo.userData.isPhoto || photo.userData.isPlaceholder) return;
            
            // 每个照片都有自己的情感节奏
            const delay = index * 300; // 像诗歌的韵律
            
            if (window.TWEEN) {
                // 温柔的拥抱（缩放）
                new TWEEN.Tween(photo.scale)
                    .to({ x: 1.25, y: 1.25, z: 1.25 }, 1200)
                    .delay(delay)
                    .easing(TWEEN.Easing.Cubic.Out)
                    .onComplete(() => {
                        new TWEEN.Tween(photo.scale)
                            .to({ x: 1, y: 1, z: 1 }, 2000)
                            .easing(TWEEN.Easing.Elastic.Out)
                            .start();
                    })
                    .start();
                
                // 心跳般的旋转
                const heartBeatRotation = Math.PI * (0.5 + Math.random());
                new TWEEN.Tween(photo.rotation)
                    .to({ 
                        x: photo.rotation.x + (Math.random() - 0.5) * 0.3,
                        y: photo.rotation.y + heartBeatRotation,
                        z: photo.rotation.z + (Math.random() - 0.5) * 0.2
                    }, 2500 + Math.random() * 1000)
                    .delay(delay)
                    .easing(TWEEN.Easing.Sinusoidal.InOut)
                    .start();
                
                // 思念的摇摆（位置）
                const originalPosition = photo.userData.originalPosition || photo.position.clone();
                const longingAmplitude = 15;
                new TWEEN.Tween(photo.position)
                    .to({
                        x: originalPosition.x + Math.sin(index) * longingAmplitude,
                        y: originalPosition.y + Math.cos(index * 2) * longingAmplitude * 0.5,
                        z: originalPosition.z + Math.sin(index * 3) * longingAmplitude * 0.3
                    }, 2000)
                    .delay(delay)
                    .easing(TWEEN.Easing.Sinusoidal.InOut)
                    .onComplete(() => {
                        new TWEEN.Tween(photo.position)
                            .to(originalPosition, 2000)
                            .easing(TWEEN.Easing.Sinusoidal.InOut)
                            .start();
                    })
                    .start();
            }
        });
        
        // 记录这个浪漫时刻
        this.recordMoment('浪漫惊喜', { 
            type: 'loveStory',
            duration: '10s',
            phases: ['流星雨', '情感绽放', '时光尘埃', '永恒誓言', '思念之雨']
        });
        
        // 显示浪漫的提示
        this.showRomanticToast('💕 在时间的长河里，我只为你闪耀 💕');
    }
    
    /**
     * 显示浪漫的Toast提示
     */
    showRomanticToast(message) {
        const toast = document.createElement('div');
        toast.className = 'romantic-toast';
        toast.textContent = message;
        toast.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: linear-gradient(135deg, 
                rgba(255, 105, 180, 0.95), 
                rgba(255, 20, 147, 0.95),
                rgba(221, 160, 221, 0.95));
            color: white;
            padding: 30px 60px;
            border-radius: 60px;
            font-size: 24px;
            font-weight: 600;
            z-index: 10000;
            pointer-events: none;
            opacity: 0;
            text-align: center;
            backdrop-filter: blur(15px);
            border: 2px solid rgba(255, 255, 255, 0.4);
            box-shadow: 
                0 15px 35px rgba(0, 0, 0, 0.4), 
                0 0 30px rgba(255, 20, 147, 0.7),
                inset 0 0 20px rgba(255, 255, 255, 0.3);
            font-family: 'Noto Sans SC', Arial, sans-serif;
            letter-spacing: 1px;
            text-shadow: 0 2px 10px rgba(0, 0, 0, 0.5);
            max-width: 80%;
            line-height: 1.4;
            animation: romanticToast 6s ease-out forwards;
        `;
        
        // 添加动画样式
        if (!document.querySelector('#romanticToastStyle')) {
            const style = document.createElement('style');
            style.id = 'romanticToastStyle';
            style.textContent = `
                @keyframes romanticToast {
                    0% { 
                        opacity: 0; 
                        transform: translate(-50%, -50%) scale(0.3) rotate(-15deg);
                        filter: blur(20px);
                    }
                    15% { 
                        opacity: 1; 
                        transform: translate(-50%, -50%) scale(1.1) rotate(5deg);
                        filter: blur(0);
                    }
                    25% { 
                        transform: translate(-50%, -50%) scale(1) rotate(0deg);
                    }
                    85% { 
                        opacity: 1; 
                        transform: translate(-50%, -50%) scale(1) rotate(0deg);
                    }
                    100% { 
                        opacity: 0; 
                        transform: translate(-50%, -50%) scale(0.8) rotate(10deg);
                        filter: blur(10px);
                    }
                }
            `;
            document.head.appendChild(style);
        }
        
        document.body.appendChild(toast);
        
        // 自动移除
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 6000);
    }
    
    /**
     * 记录珍贵时刻（用于浪漫回忆）
     */
    recordMoment(type, data) {
        const moment = {
            type: type,
            timestamp: Date.now(),
            data: data,
            heartbeat: this.emotionalState?.heartbeat || 60,
            mood: this.emotionalState?.mood || 'gentle'
        };
        
        // 可以存储到本地或发送到服务器
        console.log('💕 记录珍贵时刻:', moment);
    }
    
    /**
     * 显示艺术化的Toast提示
     */
    showArtisticToast(message) {
        const toast = document.createElement('div');
        toast.className = 'artistic-toast';
        toast.textContent = message;
        toast.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: linear-gradient(135deg, rgba(102, 126, 234, 0.9), rgba(118, 75, 162, 0.9));
            color: white;
            padding: 20px 40px;
            border-radius: 50px;
            font-size: 24px;
            font-weight: bold;
            z-index: 10000;
            pointer-events: none;
            opacity: 0;
            text-align: center;
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255, 255, 255, 0.3);
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3), 0 0 20px rgba(102, 126, 234, 0.5);
            animation: artisticToast 4s ease-out forwards;
        `;
        
        // 添加动画样式
        if (!document.querySelector('#artisticToastStyle')) {
            const style = document.createElement('style');
            style.id = 'artisticToastStyle';
            style.textContent = `
                @keyframes artisticToast {
                    0% { 
                        opacity: 0; 
                        transform: translate(-50%, -50%) scale(0.5) rotate(-10deg);
                        filter: blur(10px);
                    }
                    20% { 
                        opacity: 1; 
                        transform: translate(-50%, -50%) scale(1.1) rotate(2deg);
                        filter: blur(0);
                    }
                    40% { 
                        transform: translate(-50%, -50%) scale(1) rotate(0deg);
                    }
                    80% { 
                        opacity: 1; 
                        transform: translate(-50%, -50%) scale(1) rotate(0deg);
                    }
                    100% { 
                        opacity: 0; 
                        transform: translate(-50%, -50%) scale(0.8) rotate(5deg);
                        filter: blur(5px);
                    }
                }
            `;
            document.head.appendChild(style);
        }
        
        document.body.appendChild(toast);
        
        // 自动移除
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 4000);
    }
    
    /**
     * 创建流星（兼容旧版本）
     * @deprecated 使用 EffectsManager.createRealisticMeteor 替代
     */
    createMeteor() {
        // 如果特效管理器可用，使用新的实现
        if (this.effectsManager) {
            this.effectsManager.createRealisticMeteor({
                startPosition: new THREE.Vector3(
                    (Math.random() - 0.5) * 2000,
                    800 + Math.random() * 500,
                    (Math.random() - 0.5) * 2000
                ),
                velocity: new THREE.Vector3(
                    -50 - Math.random() * 100,
                    -100 - Math.random() * 100,
                    (Math.random() - 0.5) * 50
                )
            });
        }
    }
    
    /**
     * 显示照片查看器
     */
    showPhotoViewer(photoData, mesh) {
        if (!this.elements.photoViewer) return;
        
        const { viewerImage, viewerDate, viewerCaption } = this.elements;
        
        if (viewerImage) {
            if (photoData.paths?.original) {
                viewerImage.src = photoData.paths.original;
            } else if (mesh?.material?.map?.image) {
                // 回退到canvas数据
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                canvas.width = mesh.material.map.image.width;
                canvas.height = mesh.material.map.image.height;
                ctx.drawImage(mesh.material.map.image, 0, 0);
                viewerImage.src = canvas.toDataURL();
            }
        }
        
        if (viewerDate) {
            viewerDate.textContent = this.formatDate(photoData.takenAt || photoData.createdAt);
        }
        
        if (viewerCaption) {
            viewerCaption.textContent = photoData.title || photoData.description || '美好的回忆';
        }
        
        this.elements.photoViewer.style.display = 'flex';
    }
    
    /**
     * 关闭查看器
     */
    closeViewer() {
        if (this.elements.photoViewer) {
            this.elements.photoViewer.style.display = 'none';
        }
    }
    
    /**
     * 格式化日期
     */
    formatDate(dateString) {
        if (!dateString) return '未知日期';
        
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString('zh-CN', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
        } catch (error) {
            return '未知日期';
        }
    }
    
    /**
     * 更新加载进度
     */
    updateLoadingProgress(progress, loaded, total) {
        if (this.elements.progressBar) {
            this.elements.progressBar.style.width = progress + '%';
        }
        
        if (this.elements.loadingText) {
            this.elements.loadingText.textContent = 
                `正在准备我们的小宇宙... ${Math.round(progress)}% (${loaded}/${total})`;
        }
    }
    
    /**
     * 隐藏加载界面
     */
    hideLoadingScreen() {
        if (this.elements.loadingScreen) {
            setTimeout(() => {
                this.elements.loadingScreen.style.display = 'none';
            }, 1000);
        }
    }
    
    /**
     * 显示手势提示
     */
    showGestureHint() {
        if (this.elements.gestureHint) {
            this.elements.gestureHint.style.display = 'block';
            setTimeout(() => {
                this.elements.gestureHint.style.display = 'none';
            }, this.config.ui.gestureHintDuration);
        }
    }
    
    /**
     * 更新统计信息
     */
    updateStats() {
        const memorialInfo = this.config.getMemorialInfo();
        
        if (this.elements.daysCount) {
            this.elements.daysCount.textContent = memorialInfo.days;
        }
        
        if (this.elements.photoCount) {
            this.elements.photoCount.textContent = this.photoManager?.photos?.length || 0;
        }
        
        if (this.elements.sweetIndex) {
            const sweetIndex = 90 + Math.floor(Math.random() * 10);
            this.elements.sweetIndex.textContent = sweetIndex;
        }
        
        // 检查里程碑
        if (memorialInfo.milestone) {
            this.showToast(memorialInfo.milestone.message);
        }
    }
    
    /**
     * 创建浮动元素（使用物理引擎）
     */
    createFloatingElements() {
        const intervalId = setInterval(() => {
            if (Math.random() < this.config.ui.floatingEmojiProbability) {
                this.createFloatingEmoji();
            }
        }, this.config.ui.floatingEmojiInterval);
        
        this.intervals.push(intervalId);
    }
    
    /**
     * 创建浮动表情符号（使用物理粒子系统）
     */
    createFloatingEmoji(emoji = null) {
        // 如果物理粒子系统可用，使用新的实现
        if (this.particleSystem) {
            return this.particleSystem.createRandomFloatingEmoji();
        }
        
        // 回退到旧的实现
        const floater = document.createElement('div');
        floater.className = 'floating-emoji';
        floater.textContent = emoji || this.config.getRandomEmoji();
        floater.style.left = Math.random() * window.innerWidth + 'px';
        floater.style.animationDuration = (5 + Math.random() * 5) + 's';
        floater.style.filter = 'drop-shadow(0 0 6px rgba(255, 255, 255, 0.8))';
        document.body.appendChild(floater);
        
        setTimeout(() => floater.remove(), 10000);
    }
    
    /**
     * 显示Toast提示
     */
    showToast(message) {
        const toast = document.createElement('div');
        toast.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(0, 0, 0, 0.8);
            color: white;
            padding: 15px 30px;
            border-radius: 25px;
            font-size: 16px;
            z-index: 300;
            animation: fadeInOut 2s ease;
        `;
        toast.textContent = message;
        document.body.appendChild(toast);
        
        setTimeout(() => toast.remove(), this.config.ui.toastDuration);
    }
    
    /**
     * 显示错误信息
     */
    showError(message) {
        const errorToast = document.createElement('div');
        errorToast.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #ef4444;
            color: white;
            padding: 15px 20px;
            border-radius: 10px;
            font-size: 14px;
            z-index: 1000;
            animation: fadeInOut 4s ease;
        `;
        errorToast.textContent = message;
        document.body.appendChild(errorToast);
        
        setTimeout(() => errorToast.remove(), 4000);
    }
    
    /**
     * 刷新照片（供上传模块调用）
     */
    async refreshPhotos() {
        if (this.photoManager) {
            await this.photoManager.refreshPhotos();
            this.updateStats();
        }
    }
    
    /**
     * 启动应用
     */
    start() {
        // 在动画循环中调用
        const animateLoop = () => {
            this.animate();
            requestAnimationFrame(animateLoop);
        };
        animateLoop();
    }
    
    /**
     * 清理应用
     */
    dispose() {
        // 清理管理器
        if (this.photoManager) {
            this.photoManager.dispose();
        }
        
        if (this.sceneManager) {
            this.sceneManager.dispose();
        }
        
        // 清理特效管理器
        if (this.effectsManager) {
            this.effectsManager.dispose();
        }
        
        // 清理物理粒子系统
        if (this.particleSystem) {
            this.particleSystem.dispose();
        }
        
        // 清理上传模块
        if (this.uploadModal) {
            this.uploadModal.close();
        }
        
        // 清理定时器和间隔
        this.timers.forEach(timer => clearTimeout(timer));
        this.intervals.forEach(interval => clearInterval(interval));
        if (this.resizeTimer) {
            clearTimeout(this.resizeTimer);
        }
        this.timers = [];
        this.intervals = [];
        this.resizeTimer = null;
        
        // 移除事件监听器
        window.removeEventListener('resize', this.onWindowResize);
        
        this.config.log('应用已清理');
    }
}

// 导出应用类
window.PhotoSphereApp = PhotoSphereApp;
export default PhotoSphereApp;
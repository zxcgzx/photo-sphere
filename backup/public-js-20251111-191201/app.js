/**
 * 主应用类 - 我们的小宇宙
 * 协调所有模块的工作
 */

// 集中导入外部依赖（避免重复加载）
import * as THREE from 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';
import * as TWEEN from 'https://cdnjs.cloudflare.com/ajax/libs/tween.js/18.6.4/tween.umd.js';

// 导入应用模块
import { CONFIG } from './config.js';
import AuthManager from './authManager.js';
import SceneManager from './sceneManager.js';
import PhotoManager from './photoManager.js';
import PerformanceManager from './performanceManager.js';
import DebugPanel from './debugPanel.js';
import UploadModal from './uploadModal.js';
import RomanticEffectsManager from './romanticEffects.js';
import RomanticParticleSystem from './romanticParticles.js';

// 将依赖暴露到全局，供其他模块使用
window.THREE = THREE;
window.TWEEN = TWEEN;

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
        
        // resize 节流（使用 requestAnimationFrame 优化）
        this.resizeTimer = null;
        this.resizeAnimationFrame = null;
        
        // 特效管理器
        this.effectsManager = null;
        
        // 特效冷却状态
        this.surpriseCooldown = false;
        this.surpriseCooldownTime = 8000; // 8秒冷却时间
        
        // 物理粒子系统
        this.particleSystem = null;
        
        // 浮动元素定时器ID（用于防止泄漏）
        this.floatingElementsIntervalId = null;
        
        // 将实例暴露到全局，供其他模块使用
        window.photoSphereApp = this;
    }
    
    /**
     * 初始化应用
     */
    async initialize() {
        try {
            // 如果已初始化，先清理资源（防止重复初始化导致定时器泄漏）
            if (this.isInitialized) {
                this.config.log('检测到重复初始化，先清理资源...');
                this.dispose();
            }
            
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
            btnMore: document.getElementById('btn-more'),
            
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
     * 初始化密码验证（增强版：自动聚焦、错误高亮、禁用按钮）
     */
    initPasswordScreen() {
        // 单词选择按钮
        this.elements.wordBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                this.elements.wordBtns.forEach(b => b.classList.remove('selected'));
                btn.classList.add('selected');
                this.elements.wordSelected.value = btn.dataset.word;
                this.checkFormComplete();
                
                // 自动聚焦到下一个未填字段
                this.focusNextEmptyField();
            });
        });
        
        // 监听输入变化（带错误状态清除）
        this.elements.monthSelect?.addEventListener('change', () => {
            this.clearFieldError(this.elements.monthSelect);
            this.checkFormComplete();
            this.focusNextEmptyField();
        });
        
        this.elements.nicknameInput?.addEventListener('input', () => {
            this.clearFieldError(this.elements.nicknameInput);
            this.checkFormComplete();
        });
        
        // 验证按钮
        this.elements.enterBtn?.addEventListener('click', () => this.verifyPassword());
        
        // 回车键提交
        this.elements.nicknameInput?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !this.elements.enterBtn.disabled) {
                this.verifyPassword();
            }
        });
        
        // 自动聚焦第一个字段
        setTimeout(() => {
            this.elements.monthSelect?.focus();
        }, 500);
    }
    
    /**
     * 自动聚焦到下一个未填字段
     */
    focusNextEmptyField() {
        if (!this.elements.monthSelect.value) {
            this.elements.monthSelect.focus();
        } else if (!this.elements.nicknameInput.value.trim()) {
            this.elements.nicknameInput.focus();
        } else if (!this.elements.wordSelected.value) {
            // 如果单词未选择，聚焦到第一个单词按钮
            this.elements.wordBtns[0]?.focus();
        }
    }
    
    /**
     * 清除字段错误状态
     */
    clearFieldError(field) {
        if (field) {
            field.style.borderColor = '';
            field.style.boxShadow = '';
        }
    }
    
    /**
     * 设置字段错误状态
     */
    setFieldError(field) {
        if (field) {
            field.style.borderColor = '#ff6b6b';
            field.style.boxShadow = '0 0 10px rgba(255, 107, 107, 0.5)';
        }
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
     * 验证密码（增强版：错误高亮、智能提示）
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
                }, 1500); // 缩短等待时间
            } else {
                // 智能错误高亮：根据错误类型高亮对应字段
                this.highlightErrorFields(result.failedFields || []);
                this.showErrorAnimation(result.message || '答案不正确，请重试');
            }
            
        } catch (error) {
            this.config.error('密码验证失败:', error);
            this.showErrorAnimation('验证过程出现错误，请重试');
        } finally {
            // 重新启用按钮
            setTimeout(() => {
                if (this.elements.enterBtn) {
                    this.elements.enterBtn.disabled = false;
                    this.elements.enterBtn.innerHTML = '<span>✨ 进入我们的小宇宙 ✨</span>';
                }
            }, 2000);
        }
    }
    
    /**
     * 高亮错误字段
     */
    highlightErrorFields(failedFields) {
        // 清除所有错误状态
        this.clearFieldError(this.elements.monthSelect);
        this.clearFieldError(this.elements.nicknameInput);
        
        // 高亮错误字段
        failedFields.forEach(field => {
            if (field === 'month') {
                this.setFieldError(this.elements.monthSelect);
            } else if (field === 'nickname') {
                this.setFieldError(this.elements.nicknameInput);
            } else if (field === 'word') {
                // 单词选择错误（高亮所有单词按钮）
                this.elements.wordBtns.forEach(btn => {
                    btn.style.borderColor = '#ff6b6b';
                    btn.style.boxShadow = '0 0 10px rgba(255, 107, 107, 0.5)';
                });
            }
        });
        
        // 自动聚焦到第一个错误字段
        if (failedFields.includes('month')) {
            this.elements.monthSelect.focus();
        } else if (failedFields.includes('nickname')) {
            this.elements.nicknameInput.focus();
        } else if (failedFields.includes('word')) {
            this.elements.wordBtns[0]?.focus();
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
     * 错误动画（增强版：缩短显示时间，添加查看提示按钮）
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
                // 恢复按钮状态
                this.elements.enterBtn.innerHTML = '<span>✨ 进入我们的小宇宙 ✨</span>';
                this.elements.enterBtn.style.background = 'linear-gradient(135deg, #667eea, #764ba2, #f093fb)';
                container.style.animation = '';
                
                // 显示查看提示按钮
                this.showHintButton();
            }, 2000); // 缩短显示时间到2秒
        }
    }
    
    /**
     * 显示查看提示按钮
     */
    showHintButton() {
        // 检查是否已存在提示按钮
        let hintBtn = document.getElementById('hint-btn');
        if (hintBtn) return;
        
        // 创建提示按钮
        hintBtn = document.createElement('button');
        hintBtn.id = 'hint-btn';
        hintBtn.className = 'hint-btn';
        hintBtn.innerHTML = '<span>💡 查看提示</span>';
        hintBtn.style.cssText = `
            margin-top: 15px;
            padding: 10px 20px;
            background: rgba(255, 193, 7, 0.2);
            border: 1px solid #ffc107;
            border-radius: 8px;
            color: #ffc107;
            cursor: pointer;
            font-size: 0.9rem;
            transition: all 0.3s ease;
        `;
        
        hintBtn.addEventListener('click', () => {
            this.showHintModal();
            hintBtn.remove();
        });
        
        hintBtn.addEventListener('mouseenter', () => {
            hintBtn.style.background = 'rgba(255, 193, 7, 0.3)';
        });
        
        hintBtn.addEventListener('mouseleave', () => {
            hintBtn.style.background = 'rgba(255, 193, 7, 0.2)';
        });
        
        const form = document.getElementById('password-form');
        form?.appendChild(hintBtn);
    }
    
    /**
     * 显示提示模态框
     */
    showHintModal() {
        const modal = document.createElement('div');
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.8);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 10001;
        `;
        
        modal.innerHTML = `
            <div style="
                background: var(--panel-bg);
                border: 1px solid var(--border-color);
                border-radius: 12px;
                padding: 30px;
                max-width: 400px;
                text-align: center;
                color: var(--text-color);
            ">
                <h3 style="margin-bottom: 20px; color: var(--primary-color);">💡 密码提示</h3>
                <div style="text-align: left; line-height: 1.8; margin-bottom: 20px;">
                    <p>• <strong>月份：</strong>你们第一次见面的月份（数字，如1表示一月）</p>
                    <p>• <strong>昵称：</strong>你们之间的专属昵称</p>
                    <p>• <strong>心动词：</strong>从四个选项中选择</p>
                </div>
                <p style="font-size: 0.9rem; opacity: 0.8; margin-bottom: 20px;">
                    提示：答案藏在你们的回忆里 💕
                </p>
                <button class="btn btn-primary" onclick="this.closest('.hint-modal').remove()">
                    知道了
                </button>
            </div>
        `;
        
        modal.className = 'hint-modal';
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
        
        document.body.appendChild(modal);
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
        
        // 检查是否已存在上传按钮，避免重复创建和重复绑定
        const existingUploadBtn = document.getElementById('btn-upload');
        
        if (existingUploadBtn) {
            // 检查是否已绑定事件（防止重复调用initializeUpload）
            if (existingUploadBtn.dataset.uploadBound === 'true') {
                this.config.log('上传按钮事件已绑定，跳过');
                return;
            }
            
            // 使用现有的上传按钮，绑定事件
            existingUploadBtn.addEventListener('click', () => {
                if (this.uploadModal) {
                    this.uploadModal.open();
                } else {
                    window.open('upload.html', '_blank');
                }
            });
            
            // 标记已绑定
            existingUploadBtn.dataset.uploadBound = 'true';
            this.config.log('使用现有的上传按钮并绑定事件');
        } else if (this.elements.controlPanel) {
            // 在控制面板添加新的上传按钮
            const uploadBtn = document.createElement('button');
            uploadBtn.className = 'control-btn';
            uploadBtn.id = 'btn-upload';
            uploadBtn.innerHTML = '<span>📤</span><span>上传照片</span>';
            uploadBtn.dataset.uploadBound = 'true'; // 立即标记
            
            uploadBtn.addEventListener('click', () => {
                if (this.uploadModal) {
                    this.uploadModal.open();
                } else {
                    window.open('upload.html', '_blank');
                }
            });
            
            this.elements.controlPanel.appendChild(uploadBtn);
            this.config.log('创建新的上传按钮');
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
        
        // 折叠菜单按钮（移动端）
        this.elements.btnMore?.addEventListener('click', () => this.toggleCollapseMenu());
        
        // 折叠菜单中的按钮
        document.getElementById('btn-stats-collapse')?.addEventListener('click', () => {
            this.toggleStats();
            this.hideCollapseMenu();
        });
        
        document.getElementById('btn-mood-collapse')?.addEventListener('click', () => {
            this.changeMood();
            this.hideCollapseMenu();
        });
        
        document.getElementById('btn-light-collapse')?.addEventListener('click', () => {
            this.toggleLights();
            this.hideCollapseMenu();
        });
        
        document.getElementById('btn-surprise-collapse')?.addEventListener('click', () => {
            this.surprise();
            this.hideCollapseMenu();
        });
        
        // 点击外部关闭折叠菜单
        document.addEventListener('click', (e) => {
            const collapseMenu = document.getElementById('collapse-menu');
            const moreBtn = document.getElementById('btn-more');
            
            if (collapseMenu && moreBtn && 
                !collapseMenu.contains(e.target) && 
                !moreBtn.contains(e.target)) {
                this.hideCollapseMenu();
            }
        });
        
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
     * 窗口大小调整（使用 requestAnimationFrame 优化，与渲染循环同步）
     */
    onWindowResize() {
        // 如果已经安排了动画帧，先取消（防止多次触发）
        if (this.resizeAnimationFrame) {
            cancelAnimationFrame(this.resizeAnimationFrame);
        }
        
        // 使用 requestAnimationFrame 确保与渲染周期同步，避免不必要的重绘
        this.resizeAnimationFrame = requestAnimationFrame(() => {
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
            
            this.config.log('窗口大小已调整:', window.innerWidth, 'x', window.innerHeight);
            
            // 清理动画帧引用
            this.resizeAnimationFrame = null;
        });
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
     * 随机视角（增强版：居中显示+信息卡）
     */
    randomView() {
        const randomPhoto = this.photoManager?.getRandomPhoto();
        if (!randomPhoto || !this.sceneManager?.camera) return;
        
        const photoData = randomPhoto.userData.photoData;
        if (!photoData) return;
        
        // 计算相机位置（对准照片）
        const direction = new THREE.Vector3();
        direction.copy(randomPhoto.position).normalize();
        const distance = 400; // 距离照片的距离
        const targetPosition = direction.multiplyScalar(distance);
        
        if (window.TWEEN) {
            // 移动相机到目标位置
            new TWEEN.Tween(this.sceneManager.camera.position)
                .to(targetPosition, this.config.animations.cameraMoveDuration)
                .easing(TWEEN.Easing.Quadratic.InOut)
                .onUpdate(() => {
                    // 让相机始终看向照片中心
                    this.sceneManager.camera.lookAt(randomPhoto.position);
                })
                .onComplete(() => {
                    // 显示照片信息卡
                    this.showPhotoInfoCard(photoData, randomPhoto);
                })
                .start();
        }
        
        // 高亮照片
        this.photoManager.highlightPhoto(randomPhoto);
        
        // 显示提示
        this.showToast(`随机查看：${photoData.title || '未命名照片'} ✨`);
    }
    
    /**
     * 显示照片信息卡
     */
    showPhotoInfoCard(photoData, photoMesh) {
        // 移除已存在的信息卡
        const existingCard = document.getElementById('photo-info-card');
        if (existingCard) {
            existingCard.remove();
        }
        
        // 创建信息卡
        const infoCard = document.createElement('div');
        infoCard.id = 'photo-info-card';
        infoCard.className = 'photo-info-card';
        
        // 格式化日期
        const uploadDate = photoData.uploaded_at ? new Date(photoData.uploaded_at).toLocaleDateString('zh-CN') : '未知日期';
        const caption = photoData.caption || photoData.description || '一张珍贵的回忆';
        
        infoCard.innerHTML = `
            <div class="photo-info-header">
                <h4>${photoData.title || '未命名照片'}</h4>
                <button class="photo-info-close" onclick="this.parentElement.parentElement.remove()">×</button>
            </div>
            <div class="photo-info-body">
                <p class="photo-info-date">📅 ${uploadDate}</p>
                <p class="photo-info-caption">${caption}</p>
            </div>
            <div class="photo-info-actions">
                <button class="btn btn-primary" onclick="window.photoSphereApp.viewPhoto('${photoData.id || ''}')">
                    查看大图
                </button>
            </div>
        `;
        
        // 设置样式
        infoCard.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: var(--panel-bg);
            border: 1px solid var(--border-color);
            border-radius: 12px;
            padding: 20px;
            min-width: 300px;
            max-width: 400px;
            z-index: 1500;
            backdrop-filter: blur(10px);
            color: var(--text-color);
            font-family: 'Noto Sans SC', sans-serif;
            animation: fadeInScale 0.3s ease-out;
        `;
        
        // 添加动画样式
        const style = document.createElement('style');
        style.textContent = `
            @keyframes fadeInScale {
                from {
                    opacity: 0;
                    transform: translate(-50%, -50%) scale(0.8);
                }
                to {
                    opacity: 1;
                    transform: translate(-50%, -50%) scale(1);
                }
            }
            
            .photo-info-card .photo-info-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 15px;
                border-bottom: 1px solid var(--border-color);
                padding-bottom: 10px;
            }
            
            .photo-info-card .photo-info-header h4 {
                margin: 0;
                color: var(--primary-color);
                font-size: 1.2rem;
            }
            
            .photo-info-card .photo-info-close {
                background: none;
                border: none;
                color: var(--text-color);
                font-size: 1.5rem;
                cursor: pointer;
                opacity: 0.7;
                transition: opacity 0.3s ease;
            }
            
            .photo-info-card .photo-info-close:hover {
                opacity: 1;
            }
            
            .photo-info-card .photo-info-body {
                margin-bottom: 15px;
            }
            
            .photo-info-card .photo-info-date {
                margin: 0 0 10px 0;
                font-size: 0.9rem;
                opacity: 0.8;
            }
            
            .photo-info-card .photo-info-caption {
                margin: 0;
                line-height: 1.5;
                font-size: 1rem;
            }
            
            .photo-info-card .photo-info-actions {
                text-align: center;
            }
            
            .photo-info-card .btn {
                padding: 8px 16px;
                background: var(--primary-color);
                color: #000;
                border: none;
                border-radius: 6px;
                cursor: pointer;
                font-size: 0.9rem;
                transition: all 0.3s ease;
            }
            
            .photo-info-card .btn:hover {
                background: var(--secondary-color);
                transform: translateY(-1px);
            }
        `;
        
        if (!document.getElementById('photo-info-card-styles')) {
            style.id = 'photo-info-card-styles';
            document.head.appendChild(style);
        }
        
        // 添加到页面
        document.body.appendChild(infoCard);
        
        // 3秒后自动隐藏
        setTimeout(() => {
            if (infoCard.parentNode) {
                infoCard.style.animation = 'fadeInScale 0.3s ease-out reverse';
                setTimeout(() => infoCard.remove(), 300);
            }
        }, 3000);
    }
    
    /**
     * 切换心情主题（增强版：控制面板、按钮、星云、光源）
     */
    changeMood() {
        this.currentMood = (this.currentMood + 1) % this.config.themes.moods.length;
        const mood = this.config.themes.moods[this.currentMood];
        
        // 更新星空背景
        this.updateStarFieldMood(mood);
        
        // 更新控制面板样式
        this.updateControlPanelMood(mood);
        
        // 更新按钮样式
        this.updateButtonMood(mood);
        
        // 更新星云效果
        this.updateNebulaMood(mood);
        
        // 更新光源颜色
        this.updateLightingMood(mood);
        
        // 保存主题设置
        this.config.saveTheme(mood.name);
        
        this.showToast(`切换到${mood.name}主题 🎨`);
    }
    
    /**
     * 更新控制面板主题
     */
    updateControlPanelMood(mood) {
        if (!this.elements.controlPanel) return;
        
        // 更新控制面板背景色
        const panelBg = this.hexToRgba(mood.colors[0], 0.9);
        this.elements.controlPanel.style.background = panelBg;
        
        // 更新边框颜色
        const borderColor = this.hexToRgba(mood.colors[1] || mood.colors[0], 0.3);
        this.elements.controlPanel.style.borderColor = borderColor;
        
        // 更新所有按钮的悬停效果
        const buttons = this.elements.controlPanel.querySelectorAll('.control-btn');
        buttons.forEach(btn => {
            btn.addEventListener('mouseenter', () => {
                btn.style.borderColor = mood.colors[0];
                btn.style.background = this.hexToRgba(mood.colors[0], 0.1);
            });
            
            btn.addEventListener('mouseleave', () => {
                btn.style.borderColor = borderColor;
                btn.style.background = 'rgba(0, 0, 0, 0.3)';
            });
        });
    }
    
    /**
     * 更新按钮主题
     */
    updateButtonMood(mood) {
        if (!this.elements.enterBtn) return;
        
        // 更新主要按钮的渐变背景
        const btn = this.elements.enterBtn;
        const gradient = `linear-gradient(135deg, ${mood.colors[0]}, ${mood.colors[1] || mood.colors[0]})`;
        btn.style.background = gradient;
        
        // 更新按钮发光效果
        btn.style.boxShadow = `0 0 20px ${this.hexToRgba(mood.colors[0], 0.5)}`;
    }
    
    /**
     * 更新星云效果
     */
    updateNebulaMood(mood) {
        if (!this.sceneManager?.scene) return;
        
        // 移除旧的星云
        const oldNebula = this.sceneManager.scene.getObjectByName('nebula');
        if (oldNebula) {
            this.sceneManager.scene.remove(oldNebula);
        }
        
        // 创建新的星云（使用主题颜色）
        const nebulaGeometry = new THREE.SphereGeometry(800, 32, 32);
        const nebulaMaterial = new THREE.MeshBasicMaterial({
            color: new THREE.Color(mood.colors[0]),
            transparent: true,
            opacity: 0.1,
            side: THREE.BackSide
        });
        
        const nebula = new THREE.Mesh(nebulaGeometry, nebulaMaterial);
        nebula.name = 'nebula';
        this.sceneManager.scene.add(nebula);
        
        // 添加旋转动画
        if (window.TWEEN) {
            const rotationTween = new TWEEN.Tween(nebula.rotation)
                .to({ y: Math.PI * 2 }, 60000) // 60秒转一圈
                .easing(TWEEN.Easing.Linear.None)
                .repeat(Infinity)
                .start();
        }
    }
    
    /**
     * 更新光源颜色
     */
    updateLightingMood(mood) {
        if (!this.sceneManager?.scene) return;
        
        // 更新环境光
        const ambientLight = this.sceneManager.scene.getObjectByName('ambientLight');
        if (ambientLight) {
            ambientLight.color = new THREE.Color(mood.colors[0]);
        }
        
        // 更新点光源
        const pointLights = this.sceneManager.scene.children.filter(child => 
            child.type === 'PointLight' && child.name !== 'ambientLight'
        );
        
        pointLights.forEach((light, index) => {
            const colorIndex = index % mood.colors.length;
            light.color = new THREE.Color(mood.colors[colorIndex]);
            
            // 添加颜色动画
            if (window.TWEEN) {
                const originalIntensity = light.intensity;
                new TWEEN.Tween(light)
                    .to({ intensity: originalIntensity * 1.5 }, 500)
                    .easing(TWEEN.Easing.Quadratic.Out)
                    .onComplete(() => {
                        new TWEEN.Tween(light)
                            .to({ intensity: originalIntensity }, 500)
                            .easing(TWEEN.Easing.Quadratic.In)
                            .start();
                    })
                    .start();
            }
        });
    }
    
    /**
     * 十六进制颜色转RGBA
     */
    hexToRgba(hex, alpha = 1) {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
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
     * 切换折叠菜单（移动端）
     */
    toggleCollapseMenu() {
        const collapseMenu = document.getElementById('collapse-menu');
        if (!collapseMenu) return;
        
        const isVisible = collapseMenu.classList.contains('show');
        
        if (isVisible) {
            this.hideCollapseMenu();
        } else {
            this.showCollapseMenu();
        }
    }
    
    /**
     * 显示折叠菜单
     */
    showCollapseMenu() {
        const collapseMenu = document.getElementById('collapse-menu');
        if (!collapseMenu) return;
        
        collapseMenu.classList.add('show');
        
        // 添加遮罩层（点击外部关闭）
        if (!document.getElementById('collapse-overlay')) {
            const overlay = document.createElement('div');
            overlay.id = 'collapse-overlay';
            overlay.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: transparent;
                z-index: 1000;
            `;
            
            overlay.addEventListener('click', () => this.hideCollapseMenu());
            document.body.appendChild(overlay);
        }
    }
    
    /**
     * 隐藏折叠菜单
     */
    hideCollapseMenu() {
        const collapseMenu = document.getElementById('collapse-menu');
        if (!collapseMenu) return;
        
        collapseMenu.classList.remove('show');
        
        // 移除遮罩层
        const overlay = document.getElementById('collapse-overlay');
        if (overlay) {
            overlay.remove();
        }
    }
    
    /**
     * 浪漫惊喜 - 讲述一个爱情故事
     */
    surprise() {
        // 检查冷却状态
        if (this.surpriseCooldown) {
            console.log('[surprise] 特效冷却中，请稍后再试');
            this.showRomanticToast('💝 特效冷却中，请稍后再试...');
            return;
        }
        
        // 设置冷却状态
        this.surpriseCooldown = true;
        
        // 禁用按钮
        this.disableSurpriseButtons();
        
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
        
        // 设置冷却恢复定时器
        setTimeout(() => {
            this.surpriseCooldown = false;
            this.enableSurpriseButtons();
            console.log('[surprise] 特效冷却结束，可以再次使用');
        }, this.surpriseCooldownTime);
    }
    
    /**
     * 禁用惊喜按钮
     */
    disableSurpriseButtons() {
        const buttons = [
            this.elements.btnSurprise,
            document.getElementById('btn-surprise-collapse')
        ];
        
        buttons.forEach(btn => {
            if (btn) {
                btn.disabled = true;
                btn.style.opacity = '0.5';
                btn.style.cursor = 'not-allowed';
            }
        });
    }
    
    /**
     * 启用惊喜按钮
     */
    enableSurpriseButtons() {
        const buttons = [
            this.elements.btnSurprise,
            document.getElementById('btn-surprise-collapse')
        ];
        
        buttons.forEach(btn => {
            if (btn) {
                btn.disabled = false;
                btn.style.opacity = '1';
                btn.style.cursor = 'pointer';
            }
        });
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
     * 查看照片（从信息卡调用）
     */
    viewPhoto(photoId) {
        if (!photoId || !this.photoManager) return;
        
        // 查找照片数据
        const photoData = this.photoManager.photos.find(p => p.id === photoId);
        const photoMesh = this.photoManager.photoMeshes.find(m => m.userData.photoData?.id === photoId);
        
        if (photoData && photoMesh) {
            // 显示照片查看器
            this.showPhotoViewer(photoData, photoMesh);
            
            // 移除信息卡
            const infoCard = document.getElementById('photo-info-card');
            if (infoCard) {
                infoCard.remove();
            }
        } else {
            this.config.warn('找不到照片:', photoId);
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
     * 更新统计信息（连接真实后端数据）
     */
    async updateStats() {
        try {
            // 获取纪念日信息（前端计算）
            const memorialInfo = this.config.getMemorialInfo();
            
            if (this.elements.daysCount) {
                this.elements.daysCount.textContent = memorialInfo.days;
            }
            
            // 检查里程碑
            if (memorialInfo.milestone) {
                this.showToast(memorialInfo.milestone.message);
            }
            
            // 从后端获取真实统计数据
            const response = await fetch('/api/photos/stats');
            
            if (response.ok) {
                const stats = await response.json();
                
                if (this.elements.photoCount) {
                    this.elements.photoCount.textContent = stats.totalPhotos || 0;
                }
                
                // 计算甜蜜指数（基于照片数量和在一起天数）
                if (this.elements.sweetIndex) {
                    const baseSweetness = 85;
                    const photoBonus = Math.min((stats.totalPhotos || 0) * 0.5, 10); // 每张照片+0.5%，最多+10%
                    const dayBonus = Math.min(memorialInfo.days * 0.01, 5); // 每天+0.01%，最多+5%
                    const sweetIndex = Math.min(baseSweetness + photoBonus + dayBonus, 99);
                    
                    this.elements.sweetIndex.textContent = Math.floor(sweetIndex);
                }
                
                this.config.log('统计信息已更新（使用真实数据）');
            } else {
                // 降级方案：使用本地数据
                this.updateStatsFallback();
            }
        } catch (error) {
            this.config.warn('获取统计数据失败，使用降级方案:', error);
            this.updateStatsFallback();
        }
    }
    
    /**
     * 统计信息降级方案（后端API不可用）
     */
    updateStatsFallback() {
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
        
        this.config.log('统计信息已更新（使用降级方案）');
    }
    
    /**
     * 创建浮动元素（使用物理引擎）
     */
    createFloatingElements() {
        // 防止重复创建浮动元素定时器
        if (this.floatingElementsIntervalId) {
            this.config.warn('浮动元素定时器已存在，跳过创建');
            return;
        }
        
        const intervalId = setInterval(() => {
            if (Math.random() < this.config.ui.floatingEmojiProbability) {
                this.createFloatingEmoji();
            }
        }, this.config.ui.floatingEmojiInterval);
        
        this.floatingElementsIntervalId = intervalId;
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
        // 清理旧的浮动元素定时器（防止积累）
        if (this.floatingElementsIntervalId) {
            clearInterval(this.floatingElementsIntervalId);
            this.floatingElementsIntervalId = null;
            this.config.log('清理旧的浮动元素定时器');
        }
        
        if (this.photoManager) {
            await this.photoManager.refreshPhotos();
            this.updateStats();
        }
        
        // 重新创建浮动元素（使用新的定时器）
        this.createFloatingElements();
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
        
        // 清理浮动元素定时器
        if (this.floatingElementsIntervalId) {
            clearInterval(this.floatingElementsIntervalId);
            this.floatingElementsIntervalId = null;
            this.config.log('浮动元素定时器已清理');
        }
        
        // 清理 resize 动画帧
        if (this.resizeAnimationFrame) {
            cancelAnimationFrame(this.resizeAnimationFrame);
            this.resizeAnimationFrame = null;
            this.config.log('resize 动画帧已清理');
        }
        
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
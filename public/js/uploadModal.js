/**
 * 照片上传模态框组件
 * 可以集成到现有的3D照片星球界面中
 */

import { CONFIG } from './config.js';

class UploadModal {
    constructor(config) {
        this.config = config || CONFIG;
        this.isOpen = false;
        this.files = [];
        this.uploadedCount = 0;
        this.failedFiles = [];
        
        // 并发上传配置
        this.maxConcurrent = 3; // 最大并发数
        this.retryCount = 1; // 失败重试次数
        this.uploadQueue = []; // 上传队列
        this.activeUploads = 0; // 当前活动上传数
        
        this.createModalFromTemplate();
        this.bindEvents();
    }
    
    /**
     * 从模板创建模态框（替代JS字符串）
     */
    createModalFromTemplate() {
        const template = document.getElementById('upload-modal-template');
        
        if (!template) {
            console.error('UploadModal: 找不到模板 #upload-modal-template');
            // 降级到旧的内联HTML方式
            this.createModalFallback();
            return;
        }
        
        // 克隆模板内容
        const modalContent = template.content.cloneNode(true);
        
        // 添加到body
        document.body.appendChild(modalContent);
        
        this.config.log('UploadModal: 从模板创建成功');
    }
    
    /**
     * 降级方案：如果模板不存在，使用内联HTML
     */
    createModalFallback() {
        const modalHTML = `
            <div id="uploadModal" class="upload-modal">
                <div class="upload-modal-content">
                    <div class="upload-modal-header">
                        <h3>📸 添加新照片</h3>
                        <button class="upload-modal-close">&times;</button>
                    </div>
                    
                    <div class="upload-modal-body">
                        <div class="upload-drop-zone" id="uploadDropZone">
                            <div class="upload-icon">☁️</div>
                            <h4>拖拽照片到这里</h4>
                            <p>或点击选择文件</p>
                            <input type="file" id="uploadFileInput" multiple accept="image/*" style="display: none;">
                            <button class="btn-upload-select">选择文件</button>
                        </div>
                        
                        <div class="upload-preview" id="uploadPreview" style="display: none;">
                            <h4>待上传照片</h4>
                            <div class="upload-preview-grid" id="uploadPreviewGrid"></div>
                        </div>
                        
                        <div class="upload-progress" id="uploadProgress" style="display: none;">
                            <div class="progress-bar">
                                <div class="progress-fill" id="uploadProgressFill"></div>
                            </div>
                            <div class="progress-text" id="uploadProgressText">准备上传...</div>
                        </div>
                    </div>
                    
                    <div class="upload-modal-footer">
                        <button class="btn btn-secondary" id="uploadCancelBtn">取消</button>
                        <button class="btn btn-primary" id="uploadStartBtn" disabled>开始上传</button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        
        this.config.warn('UploadModal: 使用降级方案创建');
    }
    
    bindEvents() {
        // 模态框元素
        this.modal = document.getElementById('uploadModal');
        this.closeBtn = this.modal.querySelector('.upload-modal-close');
        this.dropZone = document.getElementById('uploadDropZone');
        this.fileInput = document.getElementById('uploadFileInput');
        this.selectBtn = this.modal.querySelector('.btn-upload-select');
        this.preview = document.getElementById('uploadPreview');
        this.previewGrid = document.getElementById('uploadPreviewGrid');
        this.progress = document.getElementById('uploadProgress');
        this.progressFill = document.getElementById('uploadProgressFill');
        this.progressText = document.getElementById('uploadProgressText');
        this.cancelBtn = document.getElementById('uploadCancelBtn');
        this.startBtn = document.getElementById('uploadStartBtn');
        
        // 绑定事件
        this.closeBtn.addEventListener('click', () => this.close());
        this.cancelBtn.addEventListener('click', () => this.close());
        this.startBtn.addEventListener('click', () => this.startUpload());
        
        // 文件选择
        this.selectBtn.addEventListener('click', () => this.fileInput.click());
        this.dropZone.addEventListener('click', () => this.fileInput.click());
        this.fileInput.addEventListener('change', (e) => this.handleFileSelect(e));
        
        // 拖拽事件
        this.dropZone.addEventListener('dragover', (e) => this.handleDragOver(e));
        this.dropZone.addEventListener('dragleave', (e) => this.handleDragLeave(e));
        this.dropZone.addEventListener('drop', (e) => this.handleDrop(e));
        
        // 点击模态框外部关闭
        this.modal.addEventListener('click', (e) => {
            if (e.target === this.modal) {
                this.close();
            }
        });
        
        // ESC键关闭
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isOpen) {
                this.close();
            }
        });
    }
    
    open() {
        this.isOpen = true;
        this.modal.classList.add('show');
        document.body.style.overflow = 'hidden';
    }
    
    close() {
        this.isOpen = false;
        this.modal.classList.remove('show');
        document.body.style.overflow = '';
        this.reset();
    }
    
    reset() {
        this.files = [];
        this.uploadedCount = 0;
        this.fileInput.value = '';
        this.preview.style.display = 'none';
        this.progress.style.display = 'none';
        this.startBtn.disabled = true;
        this.startBtn.textContent = '开始上传';
        this.previewGrid.innerHTML = '';
    }
    
    handleDragOver(e) {
        e.preventDefault();
        this.dropZone.classList.add('dragover');
    }
    
    handleDragLeave(e) {
        e.preventDefault();
        if (!this.dropZone.contains(e.relatedTarget)) {
            this.dropZone.classList.remove('dragover');
        }
    }
    
    handleDrop(e) {
        e.preventDefault();
        this.dropZone.classList.remove('dragover');
        
        const files = Array.from(e.dataTransfer.files);
        this.addFiles(files);
    }
    
    handleFileSelect(e) {
        const files = Array.from(e.target.files);
        this.addFiles(files);
    }
    
    addFiles(newFiles) {
        const validFiles = newFiles.filter(file => {
            if (!file.type.startsWith('image/')) {
                this.showToast(`${file.name} 不是有效的图片文件`, 'error');
                return false;
            }
            
            if (file.size > 10 * 1024 * 1024) {
                this.showToast(`${file.name} 文件大小超过 10MB`, 'error');
                return false;
            }
            
            const exists = this.files.some(f => 
                f.name === file.name && f.size === file.size
            );
            if (exists) {
                this.showToast(`${file.name} 已存在`, 'error');
                return false;
            }
            
            return true;
        });
        
        if (validFiles.length === 0) return;
        
        validFiles.forEach(file => {
            this.files.push({
                id: Date.now() + Math.random(),
                file,
                name: file.name,
                size: file.size
            });
        });
        
        this.updatePreview();
        this.showToast(`添加了 ${validFiles.length} 个文件`);
    }
    
    updatePreview() {
        if (this.files.length === 0) {
            this.preview.style.display = 'none';
            this.startBtn.disabled = true;
            return;
        }
        
        this.preview.style.display = 'block';
        this.startBtn.disabled = false;
        
        this.previewGrid.innerHTML = '';
        this.files.forEach(fileObj => {
            const item = document.createElement('div');
            item.className = 'upload-preview-item';
            item.dataset.fileId = fileObj.id; // 添加文件ID用于状态更新
            
            const img = document.createElement('img');
            img.className = 'upload-preview-image';
            img.src = URL.createObjectURL(fileObj.file);
            
            const info = document.createElement('div');
            info.className = 'upload-preview-info';
            info.textContent = fileObj.name;
            
            // 状态显示区域
            const status = document.createElement('div');
            status.className = 'upload-preview-status';
            status.innerHTML = '<span class="status-icon">⏳</span><span class="status-text">待上传</span>';
            
            const removeBtn = document.createElement('button');
            removeBtn.className = 'upload-preview-remove';
            removeBtn.textContent = '×';
            removeBtn.addEventListener('click', () => {
                this.removeFile(fileObj.id);
            });
            
            item.appendChild(img);
            item.appendChild(info);
            item.appendChild(status);
            item.appendChild(removeBtn);
            
            this.previewGrid.appendChild(item);
        });
    }
    
    removeFile(fileId) {
        this.files = this.files.filter(f => f.id !== fileId);
        this.updatePreview();
    }
    
    async startUpload() {
        if (this.files.length === 0) return;
        
        this.startBtn.disabled = true;
        this.startBtn.textContent = '上传中...';
        this.progress.style.display = 'block';
        
        // 重置状态
        this.uploadedCount = 0;
        this.failedFiles = [];
        this.uploadQueue = [...this.files]; // 复制文件队列
        this.activeUploads = 0;
        
        // 启动并发上传
        const uploadPromises = [];
        for (let i = 0; i < Math.min(this.maxConcurrent, this.uploadQueue.length); i++) {
            uploadPromises.push(this.processUploadQueue());
        }
        
        try {
            // 等待所有上传完成
            await Promise.all(uploadPromises);
            
            // 处理结果
            if (this.failedFiles.length === 0) {
                // 全部成功
                this.showToast(`✅ 所有 ${this.uploadedCount} 张照片上传成功！`);
                
                // 通知主应用刷新照片
                if (window.photoSphereApp && window.photoSphereApp.refreshPhotos) {
                    await window.photoSphereApp.refreshPhotos();
                }
                
                setTimeout(() => {
                    this.close();
                }, 1500);
            } else {
                // 部分失败
                const successCount = this.uploadedCount;
                const failCount = this.failedFiles.length;
                
                this.showToast(`⚠️ 上传完成：成功 ${successCount} 张，失败 ${failCount} 张`, 'warning');
                
                // 提供重试选项
                this.startBtn.disabled = false;
                this.startBtn.textContent = '重试失败项';
                
                // 将失败文件重新加入队列
                this.files = [...this.failedFiles];
                this.failedFiles = [];
                this.updatePreview();
            }
            
        } catch (error) {
            this.showToast('上传失败: ' + error.message, 'error');
            this.startBtn.disabled = false;
            this.startBtn.textContent = '重试上传';
        }
    }
    
    /**
     * 处理上传队列（并发执行）
     */
    async processUploadQueue() {
        while (this.uploadQueue.length > 0) {
            const fileObj = this.uploadQueue.shift(); // 从队列中取出文件
            if (!fileObj) continue;
            
            this.activeUploads++;
            
            // 更新状态为上传中
            this.updateFileStatus(fileObj.id, 'uploading');
            
            try {
                // 尝试上传（带重试）
                const result = await this.uploadFileWithRetry(fileObj.file);
                
                if (result.success) {
                    this.uploadedCount++;
                    this.updateFileStatus(fileObj.id, 'success');
                } else {
                    this.failedFiles.push(fileObj);
                    this.updateFileStatus(fileObj.id, 'error');
                }
                
            } catch (error) {
                this.config.error(`文件上传失败: ${fileObj.name}`, error);
                this.failedFiles.push(fileObj);
                this.updateFileStatus(fileObj.id, 'error');
            } finally {
                this.activeUploads--;
                
                // 更新总进度
                const totalFiles = this.files.length;
                const processedFiles = this.uploadedCount + this.failedFiles.length;
                const progress = (processedFiles / totalFiles) * 100;
                
                this.updateProgress(progress, `上传中: ${processedFiles}/${totalFiles}`);
            }
        }
    }
    
    /**
     * 上传文件（带重试）
     */
    async uploadFileWithRetry(file, attempt = 0) {
        const maxAttempts = this.retryCount + 1;
        
        try {
            const formData = new FormData();
            formData.append('photos', file);
            formData.append('title', file.name);
            formData.append('description', `上传于 ${new Date().toLocaleString()}`);
            
            const response = await fetch('/api/upload/photos', {
                method: 'POST',
                body: formData
            });
            
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || '上传失败');
            }
            
            return {
                success: true,
                data: await response.json()
            };
            
        } catch (error) {
            if (attempt < maxAttempts - 1) {
                // 重试前等待（指数退避）
                const delay = Math.pow(2, attempt) * 1000; // 1秒, 2秒, 4秒...
                this.config.log(`上传失败，${delay/1000}秒后重试 (${attempt + 1}/${maxAttempts}): ${file.name}`);
                
                await new Promise(resolve => setTimeout(resolve, delay));
                return this.uploadFileWithRetry(file, attempt + 1);
            } else {
                // 最终失败
                return {
                    success: false,
                    error: error.message
                };
            }
        }
    }
    
    /**
     * 更新文件状态显示（适配新的DOM结构）
     */
    updateFileStatus(fileId, status) {
        const fileItem = document.querySelector(`[data-file-id="${fileId}"]`);
        if (!fileItem) return;
        
        const statusEl = fileItem.querySelector('.upload-preview-status');
        if (!statusEl) return;
        
        const iconEl = statusEl.querySelector('.status-icon');
        const textEl = statusEl.querySelector('.status-text');
        
        if (!iconEl || !textEl) return;
        
        switch (status) {
            case 'success':
                iconEl.textContent = '✅';
                textEl.textContent = '上传成功';
                statusEl.style.color = '#00ff88';
                break;
            case 'error':
                iconEl.textContent = '❌';
                textEl.textContent = '上传失败';
                statusEl.style.color = '#ff6b6b';
                break;
            case 'uploading':
                iconEl.textContent = '🔄';
                textEl.textContent = '上传中...';
                statusEl.style.color = '#ffc107';
                break;
            case 'pending':
                iconEl.textContent = '⏳';
                textEl.textContent = '待上传';
                statusEl.style.color = '#9bb5ff';
                break;
        }
    }
    
    /**
     * 上传单个文件（兼容旧版本）
     */
    async uploadSingleFile(file) {
        const result = await this.uploadFileWithRetry(file);
        if (!result.success) {
            throw new Error(result.error || '上传失败');
        }
        return result.data;
    }
    
    async uploadSingleFile(file) {
        const formData = new FormData();
        formData.append('photos', file);
        formData.append('title', file.name);
        formData.append('description', `上传于 ${new Date().toLocaleString()}`);
        
        const response = await fetch('/api/upload/photos', {
            method: 'POST',
            body: formData
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || '上传失败');
        }
        
        return await response.json();
    }
    
    updateProgress(percent, text) {
        this.progressFill.style.width = percent + '%';
        this.progressText.textContent = text;
    }
    
    showToast(message, type = 'success') {
        // 简单的toast实现
        const toast = document.createElement('div');
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === 'error' ? '#ef4444' : '#10b981'};
            color: white;
            padding: 12px 20px;
            border-radius: 8px;
            z-index: 1001;
            font-size: 14px;
            opacity: 0;
            transition: opacity 0.3s ease;
        `;
        toast.textContent = message;
        
        document.body.appendChild(toast);
        
        setTimeout(() => toast.style.opacity = '1', 100);
        setTimeout(() => {
            toast.style.opacity = '0';
            setTimeout(() => document.body.removeChild(toast), 300);
        }, 3000);
    }
}

// 导出上传模态框类
window.UploadModal = UploadModal;
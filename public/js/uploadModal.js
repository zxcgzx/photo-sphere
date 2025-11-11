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
        
        this.createModal();
        this.bindEvents();
    }
    
    createModal() {
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
            
            const img = document.createElement('img');
            img.className = 'upload-preview-image';
            img.src = URL.createObjectURL(fileObj.file);
            
            const info = document.createElement('div');
            info.className = 'upload-preview-info';
            info.textContent = fileObj.name;
            
            const removeBtn = document.createElement('button');
            removeBtn.className = 'upload-preview-remove';
            removeBtn.textContent = '×';
            removeBtn.addEventListener('click', () => {
                this.removeFile(fileObj.id);
            });
            
            item.appendChild(img);
            item.appendChild(info);
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
        
        try {
            for (let i = 0; i < this.files.length; i++) {
                const fileObj = this.files[i];
                const progress = ((i + 1) / this.files.length) * 100;
                
                this.updateProgress(progress, `上传中: ${fileObj.name}`);
                
                await this.uploadSingleFile(fileObj.file);
                this.uploadedCount++;
            }
            
            this.showToast('所有照片上传成功！');
            
            // 通知主应用刷新照片
            if (window.photoSphereApp && window.photoSphereApp.refreshPhotos) {
                await window.photoSphereApp.refreshPhotos();
            }
            
            setTimeout(() => {
                this.close();
            }, 1500);
            
        } catch (error) {
            this.showToast('上传失败: ' + error.message, 'error');
            this.startBtn.disabled = false;
            this.startBtn.textContent = '重试上传';
        }
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
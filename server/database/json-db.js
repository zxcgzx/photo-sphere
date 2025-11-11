/**
 * 基于JSON文件的简化数据库
 * 用于避免SQLite编译问题
 */

const fs = require('fs');
const path = require('path');

class JsonDatabase {
    constructor(dbPath = './database/photos.json') {
        this.dbPath = dbPath;
        this.data = {
            photos: [],
            users: [],
            sessions: []
        };
        this.init();
    }

    init() {
        // 确保数据库目录存在
        const dbDir = path.dirname(this.dbPath);
        if (!fs.existsSync(dbDir)) {
            fs.mkdirSync(dbDir, { recursive: true });
        }

        // 加载现有数据
        this.load();
    }

    load() {
        try {
            if (fs.existsSync(this.dbPath)) {
                const data = fs.readFileSync(this.dbPath, 'utf8');
                this.data = JSON.parse(data);
                console.log('📖 加载JSON数据库成功');
            } else {
                console.log('📝 创建新的JSON数据库');
                this.save();
            }
        } catch (error) {
            console.error('❌ 加载JSON数据库失败:', error);
            this.data = {
                photos: [],
                users: [],
                sessions: []
            };
            this.save();
        }
    }

    save() {
        try {
            fs.writeFileSync(this.dbPath, JSON.stringify(this.data, null, 2));
            console.log('💾 保存JSON数据库成功');
        } catch (error) {
            console.error('❌ 保存JSON数据库失败:', error);
        }
    }

    // 照片操作
    async addPhoto(photoData) {
        const id = Date.now().toString();
        const photo = {
            id,
            ...photoData,
            uploaded_at: new Date().toISOString()
        };
        
        this.data.photos.push(photo);
        this.save();
        return photo;
    }

    async getPhotos(limit = 100, offset = 0) {
        const photos = this.data.photos
            .sort((a, b) => new Date(b.uploaded_at) - new Date(a.uploaded_at))
            .slice(offset, offset + limit);
        
        return photos;
    }

    async getAllPhotos() {
        return this.data.photos;
    }

    async getPhotoById(id) {
        return this.data.photos.find(p => p.id === id);
    }

    async deletePhoto(id) {
        const index = this.data.photos.findIndex(p => p.id === id);
        if (index > -1) {
            this.data.photos.splice(index, 1);
            this.save();
            return true;
        }
        return false;
    }

    // 用户操作
    async addUser(userData) {
        const id = Date.now().toString();
        const user = {
            id,
            ...userData,
            created_at: new Date().toISOString()
        };
        
        this.data.users.push(user);
        this.save();
        return user;
    }

    async getUserById(id) {
        return this.data.users.find(u => u.id === id);
    }

    // 会话操作
    async addSession(sessionData) {
        const id = Date.now().toString();
        const session = {
            id,
            ...sessionData,
            created_at: new Date().toISOString()
        };
        
        this.data.sessions.push(session);
        this.save();
        return session;
    }

    async getSessionByToken(token) {
        return this.data.sessions.find(s => s.token === token);
    }

    async deleteSession(token) {
        const index = this.data.sessions.findIndex(s => s.token === token);
        if (index > -1) {
            this.data.sessions.splice(index, 1);
            this.save();
            return true;
        }
        return false;
    }

    // 统计信息
    async getStats() {
        return {
            totalPhotos: this.data.photos.length,
            totalUsers: this.data.users.length,
            totalSessions: this.data.sessions.length,
            lastUpload: this.data.photos.length > 0 ? 
                Math.max(...this.data.photos.map(p => new Date(p.uploaded_at).getTime())) : null
        };
    }
}

module.exports = JsonDatabase;
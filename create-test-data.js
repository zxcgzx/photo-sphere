/**
 * 创建测试数据
 */
const JsonDatabase = require('./server/database/json-db');

async function createTestData() {
    console.log('📝 创建测试照片数据...');
    
    const db = new JsonDatabase();
    
    // 创建几张测试照片数据
    const testPhotos = [
        {
            filename: 'test1.jpg',
            originalFilename: '美丽的夕阳.jpg',
            filePath: '/uploads/test1.jpg',
            thumbnailPath: '/uploads/test1.jpg',
            mediumPath: '/uploads/test1.jpg',
            fileSize: 1024000,
            mimeType: 'image/jpeg',
            width: 1920,
            height: 1080,
            title: '美丽的夕阳',
            description: '海边的夕阳西下，美不胜收',
            takenAt: '2024-06-01T18:30:00.000Z',
            uploadedBy: null,
            uploadIp: '127.0.0.1',
            positionX: 25.5,
            positionY: 35.2,
            positionZ: -15.8
        },
        {
            filename: 'test2.jpg',
            originalFilename: '快乐时光.jpg',
            filePath: '/uploads/test2.jpg',
            thumbnailPath: '/uploads/test2.jpg',
            mediumPath: '/uploads/test2.jpg',
            fileSize: 856000,
            mimeType: 'image/jpeg',
            width: 1600,
            height: 1200,
            title: '快乐时光',
            description: '和你在一起的每一天都是快乐的时光',
            takenAt: '2024-06-15T14:20:00.000Z',
            uploadedBy: null,
            uploadIp: '127.0.0.1',
            positionX: -18.3,
            positionY: 42.1,
            positionZ: 28.9
        },
        {
            filename: 'test3.jpg',
            originalFilename: '我们的回忆.jpg',
            filePath: '/uploads/test3.jpg',
            thumbnailPath: '/uploads/test3.jpg',
            mediumPath: '/uploads/test3.jpg',
            fileSize: 742000,
            mimeType: 'image/jpeg',
            width: 1400,
            height: 900,
            title: '我们的回忆',
            description: '每一张照片都承载着珍贵的回忆',
            takenAt: '2024-07-01T10:15:00.000Z',
            uploadedBy: null,
            uploadIp: '127.0.0.1',
            positionX: 38.7,
            positionY: -12.5,
            positionZ: 31.4
        }
    ];
    
    // 添加到数据库
    for (const photoData of testPhotos) {
        const result = await db.addPhoto(photoData);
        console.log(`✅ 创建测试照片: ${photoData.title} (ID: ${result.id})`);
    }
    
    // 显示统计信息
    const stats = await db.getStats();
    console.log(`\n📊 数据库统计:`);
    console.log(`- 总照片数: ${stats.totalPhotos}`);
    console.log(`- 最后上传: ${stats.lastUpload ? new Date(stats.lastUpload).toLocaleString() : '无'}`);
    
    console.log('\n🎉 测试数据创建完成！');
    console.log('现在可以访问 http://localhost:3000 查看效果');
}

// 执行
createTestData().catch(console.error);
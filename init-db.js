/**
 * 数据库初始化脚本
 * 运行此脚本来创建数据库和表结构
 */

const { initDatabase } = require('./server/database/init');

async function main() {
    try {
        console.log('🔧 开始初始化数据库...');
        
        const db = await initDatabase();
        console.log('✅ 数据库初始化完成');
        
        // 关闭数据库连接
        db.close((err) => {
            if (err) {
                console.error('❌ 关闭数据库连接失败:', err);
            } else {
                console.log('📦 数据库连接已关闭');
            }
        });
        
    } catch (error) {
        console.error('❌ 数据库初始化失败:', error);
        process.exit(1);
    }
}

main();
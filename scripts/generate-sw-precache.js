#!/usr/bin/env node

/**
 * 生成 Service Worker 预缓存清单
 * 自动扫描 public 目录并生成缓存列表
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// 使用 process.cwd() 替代 __dirname，确保路径正确
const PROJECT_ROOT = process.cwd();
const PUBLIC_DIR = path.join(PROJECT_ROOT, 'public');
const SW_FILE = path.join(PROJECT_ROOT, 'sw.js');

// 需要预缓存的文件模式（相对于 public 目录）
const PRECACHE_PATTERNS = [
  /^\/css\/.*\.css$/,
  /^\/js\/.*\.js$/,
  /^\/icons\/.*\.(png|jpg|jpeg|webp|svg)$/,
  /^\/index-new\.html$/,
  /^\/manifest\.json$/
];

// 扫描目录获取文件列表
function scanDirectory(dir, basePath = '') {
  const files = [];
  
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      const relativePath = path.join(basePath, entry.name).replace(/\\/g, '/');
      
      if (entry.isDirectory()) {
        files.push(...scanDirectory(fullPath, relativePath));
      } else if (entry.isFile()) {
        // 转换为 URL 路径格式
        const urlPath = '/' + relativePath;
        
        // 检查是否匹配预缓存模式
        if (PRECACHE_PATTERNS.some(pattern => pattern.test(urlPath))) {
          files.push(urlPath);
        }
      }
    }
  } catch (error) {
    console.warn(`扫描目录失败: ${dir}`, error.message);
  }
  
  return files;
}

// 计算文件哈希（用于版本控制）
function getFileHash(filePath) {
  try {
    const content = fs.readFileSync(filePath);
    return crypto.createHash('md5').update(content).digest('hex').substring(0, 8);
  } catch (error) {
    return null;
  }
}

// 生成预缓存清单
function generatePrecacheManifest() {
  console.log('🔍 扫描 public 目录...');
  
  const files = scanDirectory(PUBLIC_DIR);
  
  // 添加根目录文件
  const rootFiles = ['index-new.html', 'manifest.json'];
  rootFiles.forEach(file => {
    if (fs.existsSync(path.join(PROJECT_ROOT, file))) {
      files.push('/' + file);
    }
  });
  
  // 去重并排序
  const uniqueFiles = [...new Set(files)].sort();
  
  console.log(`📄 找到 ${uniqueFiles.length} 个需要预缓存的文件:`);
  uniqueFiles.forEach(file => console.log(`  - ${file}`));
  
  return uniqueFiles;
}

// 更新 Service Worker 文件
function updateServiceWorker(precacheFiles) {
  console.log('\n📝 更新 Service Worker...');
  
  try {
    let swContent = fs.readFileSync(SW_FILE, 'utf8');
    
    // 生成新的 STATIC_ASSETS 数组
    const staticAssetsArray = precacheFiles
      .map(file => `  '${file}'`)
      .join(',\n');
    
    // 替换 STATIC_ASSETS
    swContent = swContent.replace(
      /const STATIC_ASSETS = \[[\s\S]*?\];/,
      `const STATIC_ASSETS = [\n${staticAssetsArray}\n];`
    );
    
    // 更新版本号
    const versionMatch = swContent.match(/const CACHE_NAME = 'photo-sphere-v([\d.]+)';/);
    if (versionMatch) {
      const oldVersion = versionMatch[1];
      const versionParts = oldVersion.split('.').map(Number);
      versionParts[2] = (versionParts[2] || 0) + 1; // 增加补丁版本
      const newVersion = versionParts.join('.');
      
      swContent = swContent.replace(
        /const CACHE_NAME = 'photo-sphere-v[\d.]+';/,
        `const CACHE_NAME = 'photo-sphere-v${newVersion}';`
      );
      
      swContent = swContent.replace(
        /const STATIC_CACHE = 'photo-sphere-static-v[\d.]+';/,
        `const STATIC_CACHE = 'photo-sphere-static-v${newVersion}';`
      );
      
      console.log(`📦 版本更新: ${oldVersion} → ${newVersion}`);
    }
    
    fs.writeFileSync(SW_FILE, swContent, 'utf8');
    console.log('✅ Service Worker 更新成功');
    
  } catch (error) {
    console.error('❌ 更新 Service Worker 失败:', error.message);
  }
}

// 主函数
async function main() {
  console.log('🚀 生成 Service Worker 预缓存清单\n');
  
  try {
    const precacheFiles = generatePrecacheManifest();
    updateServiceWorker(precacheFiles);
    
    console.log('\n✨ 完成！');
  } catch (error) {
    console.error('❌ 生成失败:', error);
    process.exit(1);
  }
}

main();
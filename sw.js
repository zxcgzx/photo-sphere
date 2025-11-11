/**
 * Service Worker - 我们的小宇宙
 * 提供离线支持和资源缓存
 */

const CACHE_NAME = 'photo-sphere-v2.0.4';
const STATIC_CACHE = 'photo-sphere-static-v2.0.4';
const DYNAMIC_CACHE = 'photo-sphere-dynamic-v2.0.0';

// 需要缓存的静态资源
const STATIC_ASSETS = [
  '/css/main.css',
  '/icons/icon-128x128.png',
  '/icons/icon-144x144.png',
  '/icons/icon-152x152.png',
  '/icons/icon-192x192.png',
  '/icons/icon-24x24.png',
  '/icons/icon-384x384.png',
  '/icons/icon-512x512.png',
  '/icons/icon-72x72.png',
  '/icons/icon-96x96.png',
  '/index-new.html',
  '/js/app.js',
  '/js/authManager.js',
  '/js/config.js',
  '/js/debugPanel.js',
  '/js/lazyLoader.js',
  '/js/performanceManager.js',
  '/js/photoManager.js',
  '/js/sceneManager.js',
  '/js/uploadModal.js',
  '/manifest.json'
];

// 需要网络优先的资源（API请求等）
const NETWORK_FIRST_PATTERNS = [
  /\/api\//,
  /\/uploads\//,
  /\/photos\/.*\.jpg$/,
  /\/photos\/.*\.png$/,
  /\/photos\/.*\.webp$/
];

// 需要缓存优先的资源
const CACHE_FIRST_PATTERNS = [
  /\.css$/,
  /\.js$/,
  /\.png$/,
  /\.jpg$/,
  /\.jpeg$/,
  /\.gif$/,
  /\.webp$/,
  /\.svg$/,
  /\.woff2?$/,
  /\.ttf$/,
  /\.eot$/
];

/**
 * Service Worker 安装事件
 */
self.addEventListener('install', (event) => {
  console.log('🔧 Service Worker 安装中...');
  
  event.waitUntil(
    (async () => {
      try {
        // 缓存静态资源
        const staticCache = await caches.open(STATIC_CACHE);
        console.log('📦 缓存静态资源...');
        await staticCache.addAll(STATIC_ASSETS.filter(url => !url.startsWith('http')));
        
        // 缓存外部依赖（使用正确的 mode）
        console.log('🌐 缓存外部依赖...');
        const externalAssets = STATIC_ASSETS.filter(url => url.startsWith('http'));
        
        for (const url of externalAssets) {
          try {
            const response = await fetch(url, { 
              mode: 'cors',
              credentials: 'omit'
            });
            
            if (response.ok) {
              // 克隆响应并缓存
              const responseClone = response.clone();
              await staticCache.put(url, responseClone);
              console.log(`✓ 缓存成功: ${url}`);
            } else {
              console.warn(`⚠️ 缓存失败 (状态码 ${response.status}): ${url}`);
            }
          } catch (err) {
            console.warn(`⚠️ 缓存外部资源失败: ${url}`, err.message);
          }
        }
        
        console.log('✅ Service Worker 安装完成');
        // 强制激活新的 Service Worker
        return self.skipWaiting();
      } catch (error) {
        console.error('❌ Service Worker 安装失败:', error);
        throw error;
      }
    })()
  );
});

/**
 * Service Worker 激活事件
 */
self.addEventListener('activate', (event) => {
  console.log('🚀 Service Worker 激活中...');
  
  event.waitUntil(
    Promise.all([
      // 清理旧缓存
      caches.keys().then((cacheNames) => {
        const deletePromises = cacheNames
          .filter(cacheName => 
            cacheName.startsWith('photo-sphere-') && 
            ![STATIC_CACHE, DYNAMIC_CACHE].includes(cacheName)
          )
          .map(cacheName => {
            console.log(`🗑️ 删除旧缓存: ${cacheName}`);
            return caches.delete(cacheName);
          });
        
        return Promise.all(deletePromises);
      }),
      
      // 立即接管所有页面
      self.clients.claim()
    ]).then(() => {
      console.log('✅ Service Worker 激活完成');
    })
  );
});

/**
 * 网络请求拦截
 */
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // 跳过非HTTP请求
  if (!request.url.startsWith('http')) {
    return;
  }
  
  // 跳过POST请求的缓存（上传等）
  if (request.method !== 'GET') {
    return;
  }
  
  // API请求：网络优先策略
  if (NETWORK_FIRST_PATTERNS.some(pattern => pattern.test(url.pathname))) {
    event.respondWith(networkFirst(request));
    return;
  }
  
  // 静态资源：缓存优先策略
  if (CACHE_FIRST_PATTERNS.some(pattern => pattern.test(url.pathname)) || 
      url.origin !== location.origin) {
    event.respondWith(cacheFirst(request));
    return;
  }
  
  // HTML页面：网络优先，回退到缓存
  if (request.headers.get('Accept')?.includes('text/html')) {
    event.respondWith(networkFirst(request, true));
    return;
  }
  
  // 默认：网络优先
  event.respondWith(networkFirst(request));
});

/**
 * 缓存优先策略
 */
async function cacheFirst(request) {
  try {
    // 先查找缓存
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      // 后台更新缓存
      updateCache(request);
      return cachedResponse;
    }
    
    // 缓存未命中，从网络获取
    const networkResponse = await fetch(request);
    
    // 缓存成功响应
    if (networkResponse.ok) {
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
    
  } catch (error) {
    console.error('缓存优先策略失败:', error);
    
    // 返回离线页面或默认响应
    if (request.headers.get('Accept')?.includes('text/html')) {
      const fallbackResponse = await caches.match('/');
      if (fallbackResponse) {
        return fallbackResponse;
      }
    }
    
    throw error;
  }
}

/**
 * 网络优先策略
 */
async function networkFirst(request, fallbackToCache = false) {
  try {
    const networkResponse = await fetch(request);
    
    // 缓存成功响应
    if (networkResponse.ok) {
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
    
  } catch (error) {
    console.warn('网络请求失败，尝试使用缓存:', request.url);
    
    if (fallbackToCache) {
      const cachedResponse = await caches.match(request);
      if (cachedResponse) {
        return cachedResponse;
      }
      
      // HTML请求回退到主页
      if (request.headers.get('Accept')?.includes('text/html')) {
        const fallbackResponse = await caches.match('/');
        if (fallbackResponse) {
          return fallbackResponse;
        }
      }
    }
    
    throw error;
  }
}

/**
 * 后台更新缓存
 */
async function updateCache(request) {
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(DYNAMIC_CACHE);
      await cache.put(request, networkResponse);
    }
  } catch (error) {
    // 后台更新失败不影响用户体验
    console.warn('后台缓存更新失败:', error);
  }
}

/**
 * 推送通知事件
 */
self.addEventListener('push', (event) => {
  if (!event.data) return;
  
  try {
    const data = event.data.json();
    const options = {
      body: data.body || '有新的内容更新',
      icon: '/public/icons/icon-192x192.png',
      badge: '/public/icons/badge-72x72.png',
      image: data.image,
      tag: data.tag || 'photo-sphere-notification',
      requireInteraction: false,
      actions: data.actions || [
        {
          action: 'view',
          title: '查看',
          icon: '/public/icons/view-24x24.png'
        },
        {
          action: 'dismiss',
          title: '关闭',
          icon: '/public/icons/close-24x24.png'
        }
      ],
      data: data
    };
    
    event.waitUntil(
      self.registration.showNotification(data.title || '我们的小宇宙', options)
    );
    
  } catch (error) {
    console.error('推送通知处理失败:', error);
  }
});

/**
 * 通知点击事件
 */
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  const action = event.action;
  const data = event.notification.data;
  
  if (action === 'dismiss') {
    return;
  }
  
  // 处理通知点击
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(clientList => {
        // 查找已存在的窗口
        for (const client of clientList) {
          if (client.url.includes(location.origin) && 'focus' in client) {
            return client.focus();
          }
        }
        
        // 打开新窗口
        if (clients.openWindow) {
          const targetUrl = data?.url || '/';
          return clients.openWindow(targetUrl);
        }
      })
  );
});

/**
 * 后台同步事件
 */
self.addEventListener('sync', (event) => {
  if (event.tag === 'photo-upload') {
    event.waitUntil(syncPhotoUploads());
  }
});

/**
 * 同步照片上传
 */
async function syncPhotoUploads() {
  try {
    // 从IndexedDB获取待上传的照片
    const pendingUploads = await getPendingUploads();
    
    for (const upload of pendingUploads) {
      try {
        const response = await fetch('/api/upload/photos', {
          method: 'POST',
          body: upload.formData
        });
        
        if (response.ok) {
          await removePendingUpload(upload.id);
          console.log('后台同步上传成功:', upload.filename);
        }
      } catch (error) {
        console.error('后台同步上传失败:', upload.filename, error);
      }
    }
  } catch (error) {
    console.error('后台同步失败:', error);
  }
}

/**
 * 获取待上传文件（模拟实现）
 */
async function getPendingUploads() {
  // 实际实现需要使用IndexedDB
  return [];
}

/**
 * 移除待上传文件（模拟实现）
 */
async function removePendingUpload(id) {
  // 实际实现需要操作IndexedDB
  console.log('移除待上传文件:', id);
}

/**
 * 消息事件处理
 */
self.addEventListener('message', (event) => {
  const { type, payload } = event.data;
  
  switch (type) {
    case 'SKIP_WAITING':
      self.skipWaiting();
      break;
      
    case 'GET_VERSION':
      event.ports[0]?.postMessage({ version: CACHE_NAME });
      break;
      
    case 'CLEAR_CACHE':
      clearAllCaches().then(() => {
        event.ports[0]?.postMessage({ success: true });
      });
      break;
      
    case 'CACHE_PHOTOS':
      if (payload?.urls) {
        cachePhotos(payload.urls).then(() => {
          event.ports[0]?.postMessage({ success: true });
        });
      }
      break;
      
    default:
      console.warn('未知消息类型:', type);
  }
});

/**
 * 清理所有缓存
 */
async function clearAllCaches() {
  const cacheNames = await caches.keys();
  const deletePromises = cacheNames
    .filter(name => name.startsWith('photo-sphere-'))
    .map(name => caches.delete(name));
  
  await Promise.all(deletePromises);
  console.log('所有缓存已清理');
}

/**
 * 缓存照片
 */
async function cachePhotos(urls) {
  const cache = await caches.open(DYNAMIC_CACHE);
  const promises = urls.map(url => {
    return fetch(url)
      .then(response => {
        if (response.ok) {
          return cache.put(url, response);
        }
      })
      .catch(err => console.warn(`缓存照片失败: ${url}`, err));
  });
  
  await Promise.allSettled(promises);
  console.log(`缓存了 ${urls.length} 张照片`);
}

console.log('🌌 Service Worker 已加载');
/* =====================================================
   投資大師 Pro MAX — Service Worker v1.0
   功能：PWA 離線支援、資源快取
   ===================================================== */

const CACHE_NAME = 'investmaster-v1';
const STATIC_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  'https://cdn.tailwindcss.com',
  'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js',
  'https://cdn.jsdelivr.net/npm/chartjs-chart-financial@0.2.1/dist/chartjs-chart-financial.umd.min.js',
  'https://cdn.jsdelivr.net/npm/luxon@3.4.4/build/global/luxon.min.js',
  'https://cdn.jsdelivr.net/npm/tesseract.js@v5.0.5/dist/tesseract.min.js'
];

// 安裝：快取靜態資源
self.addEventListener('install', (event) => {
  console.log('[SW] Install');
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn('[SW] 部分資源快取失敗（CDN限制）:', err);
      });
    })
  );
  self.skipWaiting();
});

// 啟動：清除舊快取
self.addEventListener('activate', (event) => {
  console.log('[SW] Activate');
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// 攔截 Fetch：Network First（API請求），Cache First（靜態資源）
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Finnhub API 請求：永遠走網路，不快取
  if (url.hostname === 'finnhub.io') {
    event.respondWith(
      fetch(event.request).catch(() =>
        new Response(JSON.stringify({ error: 'offline' }), {
          headers: { 'Content-Type': 'application/json' }
        })
      )
    );
    return;
  }

  // 靜態資源：Cache First，快取失敗才走網路
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((response) => {
        if (response && response.status === 200 && response.type !== 'opaque') {
          const cloned = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, cloned));
        }
        return response;
      }).catch(() => {
        // 離線回退：回傳快取的首頁
        if (event.request.destination === 'document') {
          return caches.match('./index.html');
        }
      });
    })
  );
});

// 接收推播訊息（未來擴充用）
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});

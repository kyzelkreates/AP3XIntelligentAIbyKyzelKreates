// ============================================================
// AP3X INTELLIGENT AI — SERVICE WORKER v2.3
// Offline-first · Vercel deployment (root path /)
// ============================================================

const CACHE_NAME  = 'ap3x-v2.3';
const OFFLINE_URL = '/index.html';

const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/css/styles.css',
  '/js/storage.js',
  '/js/relationship-engine.js',
  '/js/project-engine.js',
  '/js/ingestion-engine.js',
  '/js/knowledge-engine.js',
  '/js/explanation-engine.js',
  '/js/graph-renderer.js',
  '/js/install-engine.js',
  '/js/site-model-engine.js',
  '/js/project-compiler.js',
  '/js/investor-engine.js',
  '/js/url-ingestion-engine.js',
  '/js/url-intelligence-view.js',
  '/js/app.js',
  '/icons/icon-192.png',
  '/icons/icon-512.png'
];

// ── Install: cache everything ──────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => Promise.allSettled(
        PRECACHE_URLS.map(url =>
          cache.add(new Request(url, { cache: 'reload' }))
            .catch(err => console.warn('[SW] Skip:', url, err.message))
        )
      ))
      .then(() => self.skipWaiting())
  );
});

// ── Activate: wipe old caches ──────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

// ── Fetch: cache-first, network fallback ───────────────────
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Let cross-origin requests (crawler API) go straight to network
  if (url.origin !== location.origin) return;

  // Never cache Vercel serverless functions
  if (url.pathname.startsWith('/api/') || url.pathname.includes('/functions/')) return;

  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;

      return fetch(event.request)
        .then(response => {
          if (response && response.status === 200 && response.type === 'basic') {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => {
          if (event.request.mode === 'navigate') {
            return caches.match(OFFLINE_URL);
          }
        });
    })
  );
});

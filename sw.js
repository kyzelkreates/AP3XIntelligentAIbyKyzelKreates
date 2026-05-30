// ============================================================
// AP3X INTELLIGENT AI — SERVICE WORKER
// Offline-first caching strategy
// ============================================================

const CACHE_NAME    = 'ap3x-v2.1';
const OFFLINE_URL   = '/index.html';

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

// ── Install ────────────────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(PRECACHE_URLS.map(url => {
        return new Request(url, { cache: 'reload' });
      })))
      .then(() => self.skipWaiting())
      .catch(err => console.warn('[SW] Precache error:', err))
  );
});

// ── Activate ───────────────────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

// ── Fetch — Cache-first with network fallback ──────────────
self.addEventListener('fetch', (event) => {
  // Skip non-GET and cross-origin
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== location.origin) return;

  event.respondWith(
    caches.match(event.request)
      .then(cached => {
        if (cached) return cached;

        return fetch(event.request)
          .then(response => {
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }
            const clone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
            return response;
          })
          .catch(() => {
            // Fallback to app shell for navigation requests
            if (event.request.mode === 'navigate') {
              return caches.match(OFFLINE_URL);
            }
          });
      })
  );
});

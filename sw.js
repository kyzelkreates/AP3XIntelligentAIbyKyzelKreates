// ============================================================
// AP3X INTELLIGENT AI — SERVICE WORKER v2.2
// Offline-first — works on GitHub Pages (/AP3XIntelligentAIbyKyzelKreates/)
// ============================================================

const CACHE_NAME  = 'ap3x-v2.2';
const BASE_PATH   = '/AP3XIntelligentAIbyKyzelKreates';
const OFFLINE_URL = BASE_PATH + '/index.html';

const PRECACHE_URLS = [
  BASE_PATH + '/',
  BASE_PATH + '/index.html',
  BASE_PATH + '/manifest.json',
  BASE_PATH + '/css/styles.css',
  BASE_PATH + '/js/storage.js',
  BASE_PATH + '/js/relationship-engine.js',
  BASE_PATH + '/js/project-engine.js',
  BASE_PATH + '/js/ingestion-engine.js',
  BASE_PATH + '/js/knowledge-engine.js',
  BASE_PATH + '/js/explanation-engine.js',
  BASE_PATH + '/js/graph-renderer.js',
  BASE_PATH + '/js/install-engine.js',
  BASE_PATH + '/js/site-model-engine.js',
  BASE_PATH + '/js/project-compiler.js',
  BASE_PATH + '/js/investor-engine.js',
  BASE_PATH + '/js/url-ingestion-engine.js',
  BASE_PATH + '/js/url-intelligence-view.js',
  BASE_PATH + '/js/app.js',
  BASE_PATH + '/icons/icon-192.png',
  BASE_PATH + '/icons/icon-512.png'
];

// ── Install: cache everything ──────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        return Promise.allSettled(
          PRECACHE_URLS.map(url =>
            cache.add(new Request(url, { cache: 'reload' }))
              .catch(err => console.warn('[SW] Failed to cache:', url, err.message))
          )
        );
      })
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

  // Allow cross-origin requests (crawler API calls) to pass through
  if (url.origin !== location.origin) return;

  // Cache-bust the crawler function — always go to network
  if (url.pathname.includes('/functions/')) return;

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

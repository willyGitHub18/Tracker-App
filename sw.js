/**
 * sw.js — Service Worker
 * Cache-first strategy for static assets, network-first for navigation.
 *
 * ⚠ À chaque déploiement : incrémenter APP_VERSION
 *   pour invalider le cache sur tous les appareils.
 */

const APP_VERSION = '1.0.0';  // ← incrémenter à chaque déploiement
const CACHE_NAME  = `athx-${APP_VERSION}`;

// Base path auto-detected from sw.js location (works on GitHub Pages subpaths)
const BASE = self.registration.scope;

const STATIC_ASSETS = [
  BASE,
  BASE + 'index.html',
  BASE + 'css/base.css',
  BASE + 'css/tracker.css',
  BASE + 'css/musculaire.css',
  BASE + 'css/programme.css',
  BASE + 'js/app.js',
  BASE + 'js/db.js',
  BASE + 'js/store.js',
  BASE + 'js/security.js',
  BASE + 'js/data.js',
  BASE + 'js/tracker.js',
  BASE + 'js/musculaire.js',
  BASE + 'js/progression.js',
  BASE + 'js/io.js',
  BASE + 'views/tracker.html',
  BASE + 'views/musculaire.html',
  BASE + 'views/programme.html',
  BASE + 'views/doc.html',
  BASE + 'manifest.json',
  'https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=DM+Sans:wght@400;500;600&display=swap',
];

// ── Install: pre-cache all static assets ────────────────────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
  );
});

// ── Activate: clear old caches ───────────────────────────────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

// ── Fetch: cache-first for static, network-first for navigation ──────────────
self.addEventListener('fetch', event => {
  const { request } = event;

  // Skip non-GET and Chrome extension requests
  if(request.method !== 'GET' || request.url.startsWith('chrome-extension')) return;

  // Navigation requests: network-first with cache fallback
  if(request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then(res => { _updateCache(request, res.clone()); return res; })
        .catch(() => caches.match('/index.html'))
    );
    return;
  }

  // Static assets: cache-first
  event.respondWith(
    caches.match(request).then(cached => {
      if(cached) return cached;
      return fetch(request).then(res => {
        if(res.ok) _updateCache(request, res.clone());
        return res;
      });
    })
  );
});

function _updateCache(request, response) {
  caches.open(CACHE_NAME).then(cache => cache.put(request, response));
}

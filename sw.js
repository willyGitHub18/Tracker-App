/**
 * sw.js — Service Worker Just2Train
 * Architecture monofichier : seul index.html est à cacher.
 *
 * ⚠ À chaque déploiement : incrémenter APP_VERSION
 *   pour invalider le cache sur tous les appareils.
 */

const APP_VERSION = '3.12.2';  // ← incrémenter à chaque déploiement
const CACHE_NAME  = `just2train-${APP_VERSION}`;
const BASE        = self.registration.scope;

// Seuls fichiers réellement présents sur GitHub Pages
const STATIC_ASSETS = [
  BASE,
  BASE + 'index.html',
  BASE + 'manifest.json',
  BASE + 'icons/icon-180.png',
  BASE + 'icons/icon-192.png',
  BASE + 'icons/icon-512.png',
];

// ── Install ───────────────────────────────────────────────────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
      .catch(err => {
        // Ne pas bloquer l'install si une icône manque
        console.warn('[SW] install warning:', err);
        return self.skipWaiting();
      })
  );
});

// ── Activate: purge vieux caches ──────────────────────────────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
      .then(() => {
        // Notify all clients to reload for the new version
        self.clients.matchAll({ type: 'window' }).then(clients => {
          clients.forEach(client => client.postMessage({ type: 'SW_UPDATED', version: APP_VERSION }));
        });
      })
  );
});

// ── Fetch: cache-first pour index.html, network pour le reste ─────────────────
self.addEventListener('fetch', event => {
  const { request } = event;

  if(request.method !== 'GET' || request.url.startsWith('chrome-extension')) return;

  // Navigation → network-first avec fallback cache (garantit la dernière version)
  if(request.mode === 'navigate') {
    event.respondWith(
      fetch(BASE + 'index.html', { cache: 'no-store' })
        .then(response => {
          if(response && response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(BASE + 'index.html', clone));
            return response;
          }
          return caches.match(BASE + 'index.html');
        })
        .catch(() => caches.match(BASE + 'index.html'))
    );
    return;
  }

  // Autres assets → cache-first
  event.respondWith(
    caches.match(request).then(cached => {
      if(cached) return cached;
      return fetch(request).then(response => {
        if(!response || response.status !== 200 || response.type === 'opaque') return response;
        const clone = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(request, clone));
        return response;
      });
    })
  );
});

// ── Message: skipWaiting à la demande (bouton "Mettre à jour") ────────────────
self.addEventListener('message', event => {
  if(event.data === 'skipWaiting') self.skipWaiting();
});

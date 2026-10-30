/* ============================================
   SERVICE WORKER — POKER DE QUINTA 2027
   Estratégia:
   - HTML/JS/CSS/manifest → network-first com fallback em cache
   - Imagens/fontes → cache-first
   - Navegação offline → offline.html
   ============================================ */

const CACHE_VERSION = 'pq2027-v1';
const CACHE_STATIC  = `${CACHE_VERSION}-static`;
const CACHE_RUNTIME = `${CACHE_VERSION}-runtime`;

const PRECACHE = [
  './',
  './index.html',
  './offline.html',
  './manifest.json',
  './icons/icon.svg',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

/* ---------- INSTALL ---------- */
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_STATIC)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting())
      .catch((err) => console.warn('[SW] Falha no precache:', err))
  );
});

/* ---------- ACTIVATE ---------- */
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k !== CACHE_STATIC && k !== CACHE_RUNTIME)
          .map((k) => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

/* ---------- FETCH ---------- */
self.addEventListener('fetch', (event) => {
  const req = event.request;

  // apenas GET
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // ignora extensões de terceiros (ex.: chrome-extension)
  if (!url.protocol.startsWith('http')) return;

  // Navegação (HTML) → network-first, fallback offline.html
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const clone = res.clone();
          caches.open(CACHE_RUNTIME).then((c) => c.put(req, clone));
          return res;
        })
        .catch(() =>
          caches.match(req).then((cached) => cached || caches.match('./offline.html'))
        )
    );
    return;
  }

  // Fontes do Google → cache-first
  if (url.hostname.includes('fonts.googleapis.com') || url.hostname.includes('fonts.gstatic.com')) {
    event.respondWith(
      caches.match(req).then((cached) => {
        if (cached) return cached;
        return fetch(req).then((res) => {
          const clone = res.clone();
          caches.open(CACHE_RUNTIME).then((c) => c.put(req, clone));
          return res;
        }).catch(() => cached);
      })
    );
    return;
  }

  // Imagens → cache-first
  if (req.destination === 'image') {
    event.respondWith(
      caches.match(req).then((cached) => {
        if (cached) return cached;
        return fetch(req).then((res) => {
          const clone = res.clone();
          caches.open(CACHE_RUNTIME).then((c) => c.put(req, clone));
          return res;
        }).catch(() => cached);
      })
    );
    return;
  }

  // Demais recursos → stale-while-revalidate
  event.respondWith(
    caches.match(req).then((cached) => {
      const fetchPromise = fetch(req).then((res) => {
        const clone = res.clone();
        caches.open(CACHE_RUNTIME).then((c) => c.put(req, clone));
        return res;
      }).catch(() => cached);

      return cached || fetchPromise;
    })
  );
});

/* ---------- MENSAGENS (skipWaiting manual) ---------- */
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

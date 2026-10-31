/* ============================================================
   POKER DE QUINTA — SERVICE WORKER
   Estratégia: app shell em cache, navegação network-first com
   fallback offline e fontes com stale-while-revalidate.
   ============================================================ */

const VERSION = "pq-2027-v2.0.2";
const STATIC_CACHE = `${VERSION}-static`;
const FONT_CACHE = `${VERSION}-fonts`;
const APP_ROOT = new URL("./", self.location.href).pathname;
const CONFIRM_PATH = new URL("confirma/", self.location.href).pathname;

const APP_SHELL = [
  "./",
  "./index.html",
  "./offline.html",
  "./manifest.webmanifest",
  "./css/styles.css",
  "./js/data.js",
  "./js/firebase-config.js",
  "./js/firebase-data.js",
  "./js/app.js",
  "./logo%20pdq.png",
  "./assets/icons/favicon-32.png",
  "./assets/icons/icon-192.png",
  "./assets/icons/icon-512.png",
  "./assets/icons/maskable-512.png",
  "./assets/icons/apple-touch-icon.png",
  "./assets/poker-de-quinta-2027.ics",
  "./assets/regulamento-poker-de-quinta-2027.pdf",
];

const FONT_HOSTS = ["fonts.googleapis.com", "fonts.gstatic.com"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => cache.addAll(APP_SHELL))
      .catch(() => {
        /* Um recurso opcional indisponível não deve impedir o app de funcionar. */
      })
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== STATIC_CACHE && key !== FONT_CACHE)
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

function isFontRequest(url) {
  return FONT_HOSTS.includes(url.hostname);
}

async function networkFirst(request, cacheAsShell = true) {
  const cache = await caches.open(STATIC_CACHE);
  try {
    const response = await fetch(request);
    if (cacheAsShell && response && response.ok) {
      cache.put("./index.html", response.clone());
    }
    return response;
  } catch (error) {
    const cached = (await cache.match(request)) || (await cache.match("./index.html"));
    return cached || (await caches.match("./offline.html"));
  }
}

async function cacheFirst(request) {
  const cache = await caches.open(STATIC_CACHE);
  const cached = await cache.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response && (response.ok || response.type === "opaque")) {
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    return (await cache.match("./offline.html")) || Response.error();
  }
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(FONT_CACHE);
  const cached = await cache.match(request);
  const network = fetch(request)
    .then((response) => {
      if (response && (response.ok || response.type === "opaque")) {
        cache.put(request, response.clone());
      }
      return response;
    })
    .catch(() => null);

  return cached || network || Response.error();
}

self.addEventListener("fetch", (event) => {
  const { request } = event;

  if (request.method !== "GET") return;

  const url = new URL(request.url);

  if (url.protocol !== "http:" && url.protocol !== "https:") return;

  if (isFontRequest(url)) {
    event.respondWith(staleWhileRevalidate(request));
    return;
  }

  if (url.origin !== self.location.origin) return;

  /*
   * A página oficial /confirma/ já tem o próprio app e o próprio Firebase.
   * Quando este site é publicado na raiz do mesmo domínio, o service worker
   * também teria escopo sobre ela; por isso não interceptamos nada ali.
   */
  const confirmPathWithoutSlash = CONFIRM_PATH.replace(/\/$/, "");
  if (url.pathname === confirmPathWithoutSlash || url.pathname.startsWith(CONFIRM_PATH)) {
    return;
  }

  if (request.mode === "navigate") {
    const isAppShell = url.pathname === APP_ROOT || url.pathname === `${APP_ROOT}index.html`;
    event.respondWith(networkFirst(request, isAppShell));
    return;
  }

  event.respondWith(cacheFirst(request));
});

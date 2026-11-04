// Service worker: guarda la aplicación para que abra y funcione sin conexión.
// La versión cambia sola en cada publicación (ver scripts/build.mjs), así todos reciben la actualización.
var VERSION = 'cdf-__BUILD__';   // la reemplaza scripts/build.mjs con el código de cada publicación
var ARCHIVOS = ['/', '/app/', '/privacidad/', '/guia/como-completar-carta-documento/', '/analytics.js', '/app/app.css', '/app/app.js', '/manifest.webmanifest', '/icon-192.png', '/icon-512.png', '/icon-maskable-512.png', '/apple-touch-icon.png'];

// Algunos hostings responden con redirecciones: una respuesta redirigida no se puede usar para abrir una página.
function limpia(r) {
  if (!r.redirected) return Promise.resolve(r);
  return r.blob().then(function (b) { return new Response(b, { status: r.status, statusText: r.statusText, headers: r.headers }); });
}

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(VERSION).then(function (c) {
    return Promise.all(ARCHIVOS.map(function (u) {
      return fetch(u, { cache: 'reload' }).then(limpia).then(function (r) { if (r.ok) return c.put(u, r); });
    }));
  }).then(function () { return self.skipWaiting(); }));
});

self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (ks) {
    return Promise.all(ks.filter(function (k) { return k !== VERSION; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});

self.addEventListener('fetch', function (e) {
  if (e.request.method !== 'GET') return;
  var url = new URL(e.request.url);
  if (url.origin !== location.origin) return;
  var key = e.request.url;
  if (e.request.mode === 'navigate') {
    var p = url.pathname;
    if (p === '/app' || p === '/app/' || p === '/app.html' || p === '/app/index.html') key = '/app/';
    else if (p === '/' || p === '/index.html') key = '/';
  }
  // Primero lo guardado (rápido y sin conexión); en segundo plano se actualiza.
  e.respondWith(caches.match(key, { ignoreSearch: true }).then(function (hit) {
    var red = fetch(e.request).then(function (r) {
      if (r && r.ok) limpia(r.clone()).then(function (c) { return caches.open(VERSION).then(function (ca) { return ca.put(key, c); }); });
      return r;
    }).catch(function () { return hit || caches.match('/app/'); });
    return hit || red;
  }));
});

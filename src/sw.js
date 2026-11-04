// Desinstalador: el sitio ya no funciona sin conexión. En los dispositivos que tenían el
// service worker anterior, este lo reemplaza, borra todo lo guardado y se da de baja.
// Dejarlo publicado unos meses para que alcance a los que vuelvan tarde.
self.addEventListener('install', function () { self.skipWaiting(); });
self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys()
    .then(function (ks) { return Promise.all(ks.map(function (k) { return caches.delete(k); })); })
    .then(function () { return self.registration.unregister(); })
    .then(function () { return self.clients.matchAll({ type: 'window' }); })
    .then(function (cs) { cs.forEach(function (c) { c.navigate(c.url); }); }));
});

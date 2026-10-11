/* Service Worker - Liga de Futbol Juvenil (Sub-15)
   - Páginas (HTML): primero internet, y si no hay conexión usa la última copia guardada.
   - Íconos y manifest: primero la copia guardada (carga rápida).
   - Firebase y librerías externas NO se tocan (siempre van directo a internet),
     así los marcadores y datos en vivo nunca quedan viejos.
   Para forzar que todos reciban una versión nueva, cambia el número de CACHE. */
const CACHE = 'liga-sub15-v1';
const BASICOS = ['./', './index.html', './manifest.json', './icon-192.png', './icon-512.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE)
      .then((c) => Promise.all(BASICOS.map((u) => c.add(u).catch(() => {}))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((claves) => Promise.all(claves.filter((k) => k.indexOf('liga-sub15-') === 0 && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;   // Firebase, CDN, etc.: directo a internet

  const esPagina = req.mode === 'navigate' || (req.headers.get('accept') || '').indexOf('text/html') !== -1;
  if (esPagina) {
    e.respondWith(
      fetch(req)
        .then((resp) => {
          const copia = resp.clone();
          caches.open(CACHE).then((c) => c.put(req, copia)).catch(() => {});
          return resp;
        })
        .catch(() => caches.match(req).then((r) => r || caches.match('./index.html')))
    );
    return;
  }

  e.respondWith(
    caches.match(req).then((r) => r || fetch(req).then((resp) => {
      if (resp && resp.ok) { const copia = resp.clone(); caches.open(CACHE).then((c) => c.put(req, copia)).catch(() => {}); }
      return resp;
    }))
  );
});

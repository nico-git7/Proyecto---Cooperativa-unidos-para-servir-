// Service worker: guarda la interfaz para que abra rápido y funcione con mala señal.
// La API siempre va a la red (los datos tienen que estar al día).
const CACHE = 'estaciona-v1';
const SHELL = ['/', '/css/styles.css', '/js/app.js', '/js/api.js', '/js/ui.js', '/js/icons.js',
  '/js/reglas.js', '/js/layout.js', '/js/views/publico.js', '/js/views/conductor.js', '/js/views/trabajador.js', '/js/views/admin.js',
  '/img/icono.svg', '/manifest.webmanifest'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin || url.pathname.startsWith('/api/')) return;
  e.respondWith(
    fetch(e.request)
      .then((res) => {
        const copia = res.clone();
        caches.open(CACHE).then((c) => c.put(e.request, copia));
        return res;
      })
      .catch(() => caches.match(e.request).then((r) => r || caches.match('/'))),
  );
});

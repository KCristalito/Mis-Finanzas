const CACHE = 'finanzas-kelly-v8';
const STATIC = [
  './index.html',
  './manifest.json',
  './icon.svg'
];
const FONT_CACHE = 'finanzas-fonts-v1';
const FONT_URLS = [
  'https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800&family=Playfair+Display:ital,wght@0,700;1,400&family=Caveat:wght@500;700&display=swap'
];

self.addEventListener('install', e => {
  e.waitUntil(
    Promise.all([
      caches.open(CACHE).then(c => c.addAll(STATIC)),
      caches.open(FONT_CACHE).then(c => c.addAll(FONT_URLS).catch(() => {}))
    ])
  );
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys
        .filter(k => k !== CACHE && k !== FONT_CACHE)
        .map(k => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // Fuentes 鈥� cache first
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    e.respondWith(
      caches.open(FONT_CACHE).then(cache =>
        cache.match(e.request).then(cached => {
          if (cached) return cached;
          return fetch(e.request).then(response => {
            cache.put(e.request, response.clone());
            return response;
          }).catch(() => cached);
        })
      )
    );
    return;
  }

  // Firebase y CDNs 鈥� network first, sin bloquear
  if (url.hostname.includes('firebase') || url.hostname.includes('gstatic') || url.hostname.includes('flaticon')) {
    e.respondWith(fetch(e.request).catch(() => new Response('', {status: 408})));
    return;
  }

  // App shell 鈥� cache first
  e.respondWith(
    caches.match(e.request).then(cached =>
      cached || fetch(e.request).then(response => {
        if (response.ok) {
          caches.open(CACHE).then(c => c.put(e.request, response.clone()));
        }
        return response;
      }).catch(() => caches.match('./index.html'))
    )
  );
});

const CACHE = 'ahutk-v2';
const URLS = ['/', '/student-toolkit.html', '/assets/app.css', '/assets/icons.svg', '/assets/favicon.svg'];

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(URLS); }).then(function () { return self.skipWaiting(); }));
});

self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});

self.addEventListener('fetch', function (e) {
  if (e.request.method !== 'GET') return;
  e.respondWith(caches.match(e.request).then(function (cached) {
    return cached || fetch(e.request).then(function (res) {
      if (!res || res.status !== 200 || res.type !== 'basic') return res;
      var clone = res.clone();
      caches.open(CACHE).then(function (c) { c.put(e.request, clone); });
      return res;
    }).catch(function () {
      if (e.request.mode === 'navigate') return caches.match('/student-toolkit.html');
      return new Response('', { status: 503 });
    });
  }));
});

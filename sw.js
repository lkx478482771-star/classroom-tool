const CACHE_PREFIX = 'ahutk-';
const CACHE = CACHE_PREFIX + 'v22';
const URLS = [
  './',
  './index.html',
  './classroom.html',
  './student-toolkit.html',
  './assets/app.css',
  './assets/icons.svg',
  './assets/favicon.svg',
  './data/official.json'
];

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(CACHE)
      .then(function (cache) { return cache.addAll(URLS); })
      .then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys()
      .then(function (keys) {
        return Promise.all(
          keys
            .filter(function (key) {
              return key.indexOf(CACHE_PREFIX) === 0 && key !== CACHE;
            })
            .map(function (key) { return caches.delete(key); })
        );
      })
      .then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (e) {
  if (e.request.method !== 'GET') return;

  var isNavigation = e.request.mode === 'navigate';
  // official.json deliberately gets an offline copy even though the page
  // requests it with cache: 'no-store' to bypass the browser HTTP cache.
  var isOfficialData = new URL(e.request.url).pathname.indexOf('/data/official.json') !== -1;
  var skipCache = e.request.cache === 'no-store';

  e.respondWith(
    (isNavigation || isOfficialData)
      ? networkFirst(e.request)
      : (skipCache ? networkOnly(e.request) : cacheFirst(e.request))
  );
});

function cacheResponse(request, response) {
  if (!response || response.status !== 200 || response.type !== 'basic') return;
  var clone = response.clone();
  caches.open(CACHE).then(function (cache) {
    cache.put(request, clone);
  }).catch(function () {});
}

function offlineFallback(request) {
  if (request.mode === 'navigate') {
    return caches.match('./student-toolkit.html').then(function (cached) {
      return cached || new Response('', { status: 503 });
    });
  }
  return new Response('', { status: 503 });
}

function networkFirst(request) {
  return fetch(request)
    .then(function (response) {
      if (request.mode === 'navigate' && !response.ok) {
        throw new Error('bad navigation response');
      }
      cacheResponse(request, response);
      return response;
    })
    .catch(function () {
      return caches.match(request).then(function (cached) {
        return cached || offlineFallback(request);
      });
    });
}

function networkOnly(request) {
  return fetch(request).catch(function () {
    return offlineFallback(request);
  });
}

function cacheFirst(request) {
  return caches.match(request).then(function (cached) {
    var network = fetch(request).then(function (response) {
      cacheResponse(request, response);
      return response;
    });
    if (cached) {
      network.catch(function () {});
      return cached;
    }
    return network.catch(function () {
      return offlineFallback(request);
    });
  });
}

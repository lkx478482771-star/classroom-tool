/* Legacy worker: unregister so the root sw.js can control the whole site. */
self.addEventListener('install', function () {
  self.skipWaiting();
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    self.registration.unregister().then(function () {
      return self.clients.claim();
    }).catch(function () {})
  );
});

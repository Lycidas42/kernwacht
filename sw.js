// Kernwacht Service Worker
// Strategie: eigene Dateien "network first" (online immer die neueste Version),
// offline aus dem Cache. Schriften "cache first".
// Bei jeder Veröffentlichung VERSION erhöhen (Schema 0.x.y), damit alte Caches verschwinden.
const VERSION = '0.31.0';
const CACHE = 'kw-' + VERSION;
const APP = [
  './',
  './index.html',
  './i18n-en.js',
  './i18n.js',
  './config.js',
  './core.js',
  './audio.js',
  './render.js',
  './online.js',
  './game.js',
  './mine-view.js',
  './vendor/supabase-js-2.117.2.js',
  './vendor/qrcode-generator-1.4.4.js',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/maskable-512.png',
  './icons/apple-touch-icon.png',
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(APP)).then(() => self.skipWaiting()));
});

self.addEventListener('message', e => { if (e.data === 'skip') self.skipWaiting(); });

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE && k !== 'kw-fonts').map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Google Fonts: einmal laden, dann aus dem Cache
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    e.respondWith(
      caches.open('kw-fonts').then(c => c.match(req).then(hit => hit || fetch(req).then(res => { c.put(req, res.clone()); return res; })))
    );
    return;
  }

  // Online-Dienst und Bibliotheken nie aus dem Cache bedienen
  if (url.origin !== location.origin) return;
  // config.js immer frisch, damit neue Zugangsdaten sofort greifen
  if (url.pathname.endsWith('/config.js')) { e.respondWith(fetch(req, { cache: 'no-store' }).catch(() => caches.match(req))); return; }

  // Eigene Dateien: Netz zuerst, Cache als Rückfall
  e.respondWith(
    fetch(req, { cache: 'no-cache' })
      .then(res => {
        if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
        return res;
      })
      .catch(() => caches.match(req).then(hit => hit || caches.match('./index.html')))
  );
});

// Push-Benachrichtigungen („Lager voll“, „Bohrkraft aufgeladen“), verschickt von der Edge Function „push“
self.addEventListener('push', e => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch (err) { d = { body: e.data && e.data.text() }; }
  e.waitUntil(self.registration.showNotification(d.title || 'Kernwacht', {
    body: d.body || '', tag: d.tag || 'kw', icon: './icons/icon-192.png', data: { url: './' },
  }));
});

// Tippen auf die Benachrichtigung: offenes Fenster nach vorn holen, sonst die App öffnen
self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
    for (const c of list) if ('focus' in c) return c.focus();
    return self.clients.openWindow((e.notification.data && e.notification.data.url) || './');
  }));
});

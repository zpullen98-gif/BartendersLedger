/* The Bartender's Ledger — service worker.
   Bump CACHE on every deploy; that string is the whole update mechanism. */
const CACHE = 'ledger-v13';

const ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './css/ledger.css',
  './css/print.css',
  './js/data-core.js',
  './js/engine.js',
  './js/data-questions.js',
  './js/data-lore.js',
  './js/data-service.js',
  './js/srs.js',
  './js/ui-study.js',
  './js/ui-practice.js',
  './js/ui-reference.js',
  './js/ui-prep.js',
  './js/ui-new.js',
  './js/app.js',
  './fonts/rye-400.woff2',
  './fonts/courier-prime-400.woff2',
  './fonts/courier-prime-700.woff2',
  './fonts/libre-franklin-var.woff2',
  './icons/icon.svg',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
  './icons/apple-touch-icon.png'
];

self.addEventListener('install', e => {
  /* cache:'reload' bypasses the HTTP cache so a new SW never precaches stale copies */
  e.waitUntil(caches.open(CACHE).then(c =>
    c.addAll(ASSETS.map(u => new Request(u, { cache: 'reload' })))));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      /* Cache Storage is per-ORIGIN, not per-scope. On zpullen98-gif.github.io every
         project page can see every other project's caches, so deleting everything
         that is not ours would wipe the offline shells of The Sommelier's Codex,
         First Light and Calendar For Life. Only ever reap our own prefix. */
      .then(keys => Promise.all(
        keys.filter(k => k.startsWith('ledger-') && k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('message', e => {
  if (e.data === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return; // external links pass through
  e.respondWith(
    caches.match(req, { ignoreSearch: true }).then(hit =>
      hit || fetch(req).catch(() => (req.mode === 'navigate' ? caches.match('./index.html') : undefined))
    )
  );
});

/* sw.js – saves the app's files on the phone so it opens offline.
   Strategy: show the saved copy immediately, then fetch a fresh copy in the background.
   After you upload changes, the new version appears the NEXT time the app is opened.
   Only bump VERSION if you ever want to force every phone to throw away its saved files. */
const VERSION = 'v1';
const CACHE = 'stake-secretary-hub-' + VERSION;
const FILES = [
  './', 'index.html', 'manifest.json', 'css/style.css',
  'icons/icon-192.png', 'icons/icon-512.png',
  'js/app.js', 'js/storage.js', 'js/dashboard.js', 'js/calendar.js', 'js/interviews.js', 'js/meetings.js',
  'js/tasks.js', 'js/followups.js', 'js/contacts.js', 'js/templates.js', 'js/minutes.js', 'js/polls.js',
  'js/callings.js', 'js/search.js', 'js/settings.js'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== location.origin) return;
  e.respondWith(caches.open(CACHE).then(async cache => {
    const saved = await cache.match(e.request, { ignoreSearch: true });
    const fresh = fetch(e.request).then(res => { if (res.ok) cache.put(e.request, res.clone()); return res; }).catch(() => saved);
    return saved || fresh;
  }));
});

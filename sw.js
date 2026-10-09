// Tiene la pagina e gli effetti sul telefono dell'ospite: se alla festa la rete è debole o cade,
// la pagina si apre lo stesso e la fotocamera con gli effetti funziona.
const C = 'laurea-v2';
const BASE = ['./', 'effetti/LM-regular.woff2', 'effetti/LM-italic.woff2', 'effetti/LM-bold.woff2', 'effetti/hero.png', 'effetti/sigillo.png',
  'effetti/effetti.glb', 'effetti/befana.png', 'effetti/volto.json', 'effetti/fx-alloro.png', 'effetti/fx-oro.png', 'effetti/fx-tocco.png', 'effetti/fx-befana.png',
  'effetti/occhiali_pergamena.glb', 'effetti/fx-occhiali.png', 'effetti/fx-pergamena.png', 'effetti/qr.png'];

self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(caches.open(C).then(c => Promise.all(BASE.map(u => c.add(u).catch(() => {})))));
});
self.addEventListener('activate', e => e.waitUntil(
  caches.keys().then(ks => Promise.all(ks.filter(k => k !== C).map(k => caches.delete(k)))).then(() => self.clients.claim())
));

const keep = (r, res) => {
  if (res.ok || res.type === 'opaque') { const copy = res.clone(); caches.open(C).then(c => c.put(r, copy)).catch(() => {}); } // clone now, before the page reads the body
  return res;
};

self.addEventListener('fetch', e => {
  const r = e.request;
  // uploads, and the album's list (it changes every minute), always go to the network
  if (r.method !== 'GET' || r.url.startsWith('https://api.cloudinary.com') || r.url.includes('/image/list/')) return;
  const own = new URL(r.url).origin === location.origin;
  if (r.mode === 'navigate') {
    // the page: the fresh one if the network answers within 3 s, otherwise the copy on the phone
    const copy = () => caches.match('./');
    e.respondWith(new Promise(ok => {
      const t = setTimeout(() => copy().then(m => m && ok(m)), 3000);
      fetch(r).then(res => { clearTimeout(t); ok(res.ok ? keep('./', res) : res); },
        () => { clearTimeout(t); copy().then(m => ok(m || Response.error())); });
    }));
    return;
  }
  // everything else: the copy at once; the page's own files are refreshed in the background.
  // The libraries and models on the CDNs have the version in their address, so they never change.
  e.respondWith(caches.match(r).then(m => {
    const net = fetch(r).then(res => keep(r, res));
    if (m) { if (own) e.waitUntil(net.catch(() => {})); return m; }
    return net;
  }));
});

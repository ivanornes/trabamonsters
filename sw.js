/* Service worker de Trabamonsters.

   La app es estática y pequeña, así que la estrategia es la más simple que
   funciona: se precachea todo al instalar y a partir de ahí se sirve de caché.
   Sin conexión funciona igual porque no hay nada que pedir al servidor: el
   progreso vive en localStorage, no en una API.

   Al cambiar cualquier fichero hay que subir VERSION. Si no, los navegadores
   seguirán sirviendo la copia vieja indefinidamente, que es la forma clásica
   de volverse loco depurando una PWA. */

var VERSION = 'trabamonsters-v1';

var RECURSOS = [
  './',
  './index.html',
  './manifest.webmanifest',

  './css/base.css',
  './css/animations.css',
  './css/screens.css',

  './fonts/fredoka-latin.woff2',
  './fonts/fredoka-latin-ext.woff2',

  './js/data/silabas.js',
  './js/data/palabras.js',
  './js/data/criaturas.js',
  './js/data/rivales.js',
  './js/core/storage.js',
  './js/core/modelo.js',
  './js/core/combate.js',
  './js/core/audio.js',
  './js/core/anim.js',
  './js/core/debug.js',
  './js/ui/criatura.js',
  './js/ui/router.js',
  './js/ui/tarjeta.js',
  './js/ui/modoSilabas.js',
  './js/ui/modoCombate.js',
  './js/ui/modoPalabras.js',
  './js/ui/modoRafaga.js',
  './js/ui/resumen.js',
  './js/ui/album.js',
  './js/ui/panelAdulto.js',
  './js/app.js',

  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
  './icons/apple-touch-icon.png'
];

self.addEventListener('install', function (ev) {
  ev.waitUntil(
    caches.open(VERSION).then(function (cache) {
      /* addAll aborta entero si un solo fichero falla, lo que dejaría la app
         sin instalar por un icono. Se cachea uno a uno y se toleran los fallos
         sueltos: lo esencial ya habrá entrado. */
      return Promise.all(RECURSOS.map(function (url) {
        return cache.add(url)['catch'](function (e) {
          console.warn('[sw] no se pudo cachear', url, e);
        });
      }));
    }).then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (ev) {
  ev.waitUntil(
    caches.keys().then(function (nombres) {
      return Promise.all(nombres.map(function (n) {
        if (n !== VERSION) return caches['delete'](n);
      }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (ev) {
  var req = ev.request;

  // Sólo GET y sólo lo de este origen: nada de interceptar peticiones ajenas.
  if (req.method !== 'GET') return;
  if (new URL(req.url).origin !== self.location.origin) return;

  ev.respondWith(
    caches.match(req).then(function (guardado) {
      if (guardado) return guardado;

      return fetch(req).then(function (resp) {
        // Se guarda lo que vaya llegando, por si se añaden ficheros nuevos
        // sin tocar la lista de arriba.
        if (resp && resp.ok && resp.type === 'basic') {
          var copia = resp.clone();
          caches.open(VERSION).then(function (c) { c.put(req, copia); });
        }
        return resp;
      })['catch'](function () {
        // Sin red y sin caché: si navegaba, se le da el index.
        if (req.mode === 'navigate') return caches.match('./index.html');
        return new Response('', { status: 504, statusText: 'Sin conexión' });
      });
    })
  );
});

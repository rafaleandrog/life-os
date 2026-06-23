/* Life OS — service worker (PWA, foco Android)
   Cacheia o app shell (HTML/CSS/JS modular + ícones) e libs de CDN (fontes/SDK)
   para abertura instantânea e offline. NUNCA intercepta/cacheia dados nem
   autenticação do Supabase (DATA_HOSTS) — esses sempre vão à rede. Versionado:
   o activate apaga caches antigos e assume o controle sem travar. */
'use strict';

const VERSION = 'lifeos-v4.11.0';
const CORE = [
  './',
  './index.html',
  './manifest.webmanifest',
  './assets/styles/main.css',
  './assets/services/supabase.js',
  './assets/services/auth.js',
  './assets/state/store.js',
  './assets/components/ui.js',
  './assets/components/router.js',
  './assets/components/app.js',
  './assets/icons/icon-192.png',
  './assets/icons/icon-512.png',
  './assets/icons/icon-192-maskable.png',
  './assets/icons/icon-512-maskable.png'
];

// Hosts de DADOS — nunca interceptar/cachear
const DATA_HOSTS = ['supabase.co', 'supabase.in', 'r.jina.ai'];

// Hosts de CDN — cachear após o 1º carregamento
const CDN_HOSTS = ['fonts.googleapis.com', 'fonts.gstatic.com', 'cdn.jsdelivr.net', 'unpkg.com'];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(VERSION)
      .then((c) => c.addAll(CORE))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  let url;
  try { url = new URL(req.url); } catch (_) { return; }
  if (!url.protocol.startsWith('http')) return;
  if (DATA_HOSTS.some((h) => url.hostname === h || url.hostname.endsWith('.' + h))) return;

  // Navegação: rede primeiro (para receber atualizações), cache como fallback offline
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(VERSION).then((c) => c.put('./index.html', copy));
          return res;
        })
        .catch(() => caches.match('./index.html'))
    );
    return;
  }

  const sameOrigin = url.origin === self.location.origin;
  const isCDN = CDN_HOSTS.includes(url.hostname);
  if (!sameOrigin && !isCDN) return;

  // Estáticos e CDNs: cache primeiro + atualização em segundo plano (stale-while-revalidate)
  e.respondWith(
    caches.match(req).then((hit) => {
      const net = fetch(req)
        .then((res) => {
          if (res && (res.ok || res.type === 'opaque')) {
            const copy = res.clone();
            caches.open(VERSION).then((c) => c.put(req, copy));
          }
          return res;
        })
        .catch(() => hit);
      return hit || net;
    })
  );
});

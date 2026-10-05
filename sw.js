/* eslint-disable no-restricted-globals */
/**
 * Sandbox Wallet - Service Worker (vanilla JS, no Workbox)
 *
 * GET /api/credentials  -> NETWORK-FIRST with Cache Storage fallback
 *   1. Try the network (with a timeout so "lie-fi" also falls back).
 *   2. On a 2xx response, store a copy as the "last known" credential list.
 *   3. If the network fails (offline / timeout / 5xx), serve the last known list
 *      from Cache Storage, tagged with X-Cache-Source + X-Cached-At headers
 *      so the UI can show an "offline - last synced at" banner.
 *   4. If nothing is cached yet, return a 503 JSON with X-Offline: true.
 *
 * Navigations -> network-first, fall back to the cached app shell.
 * Static assets (same-origin JS/CSS/icons) -> stale-while-revalidate.
 */

const VERSION = 'v1';
const SHELL_CACHE = `wallet-shell-${VERSION}`;
const API_CACHE = `wallet-api-${VERSION}`;
const NETWORK_TIMEOUT_MS = 4000;

const SCOPE_URL = new URL(self.registration.scope);
const CREDENTIALS_PATH = `${SCOPE_URL.pathname}api/credentials`;
const SHELL_URLS = ['./', './index.html', './manifest.webmanifest', './icons/icon-192.png'];

// ---------------------------------------------------------------- lifecycle

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then((cache) => cache.addAll(SHELL_URLS))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith('wallet-') && key !== SHELL_CACHE && key !== API_CACHE)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

// On logout the app asks us to drop cached identity data.
self.addEventListener('message', (event) => {
  if (event.data?.type === 'CLEAR_CREDENTIAL_CACHE') {
    event.waitUntil(caches.delete(API_CACHE));
  }
});

// ---------------------------------------------------------------- routing

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (url.pathname === CREDENTIALS_PATH) {
    event.respondWith(credentialsNetworkFirst(request));
    return;
  }

  if (request.mode === 'navigate') {
    event.respondWith(navigationNetworkFirst(request));
    return;
  }

  if (/\.(?:js|css|png|svg|ico|webmanifest|woff2?)$/.test(url.pathname)) {
    event.respondWith(staleWhileRevalidate(request, event));
  }
});

// ---------------------------------------------------------------- strategies

async function credentialsNetworkFirst(request) {
  const cache = await caches.open(API_CACHE);
  // One canonical key (no query string) = "the last known credential list".
  const cacheKey = new Request(new URL(CREDENTIALS_PATH, self.location.origin).href);

  try {
    // no-store: bypass the HTTP cache so "online" really means fresh data.
    const response = await fetchWithTimeout(request, NETWORK_TIMEOUT_MS, { cache: 'no-store' });
    if (response.ok) {
      await cache.put(
        cacheKey,
        await withHeaders(response.clone(), { 'X-Cached-At': new Date().toISOString() }),
      );
      return response;
    }
    if (response.status < 500) return response; // 4xx is a real answer, don't mask it with stale data
    throw new Error(`Server error ${response.status}`);
  } catch (error) {
    const cached = await cache.match(cacheKey);
    if (cached) {
      return withHeaders(cached, { 'X-Cache-Source': 'sw-cache' });
    }
    return new Response(
      JSON.stringify({ message: 'Offline and no cached credentials available.' }),
      {
        status: 503,
        statusText: 'Service Unavailable',
        headers: { 'Content-Type': 'application/json', 'X-Offline': 'true' },
      },
    );
  }
}

async function navigationNetworkFirst(request) {
  try {
    return await fetchWithTimeout(request, NETWORK_TIMEOUT_MS);
  } catch {
    const cache = await caches.open(SHELL_CACHE);
    return (await cache.match('./index.html')) || (await cache.match('./')) || Response.error();
  }
}

async function staleWhileRevalidate(request, event) {
  const cache = await caches.open(SHELL_CACHE);
  const cached = await cache.match(request);
  const network = fetch(request)
    .then((response) => {
      if (response.ok) cache.put(request, response.clone());
      return response;
    })
    .catch(() => undefined);
  event.waitUntil(network);
  return cached || (await network) || Response.error();
}

// ---------------------------------------------------------------- helpers

/**
 * fetch() that rejects after `ms`. `init` is optional because navigation
 * requests can't be re-initialised (mode: 'navigate' + RequestInit throws).
 */
function fetchWithTimeout(request, ms, init) {
  const controller = init ? new AbortController() : null;
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => {
      controller?.abort();
      reject(new Error('Network timeout'));
    }, ms);
  });
  const network = init ? fetch(request, { ...init, signal: controller.signal }) : fetch(request);
  return Promise.race([network, timeout]).finally(() => clearTimeout(timer));
}

/** Copy a Response with extra headers (Response headers are immutable). */
async function withHeaders(response, extra) {
  const headers = new Headers(response.headers);
  Object.entries(extra).forEach(([key, value]) => headers.set(key, value));
  headers.set('Content-Type', 'application/json');
  return new Response(await response.blob(), {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

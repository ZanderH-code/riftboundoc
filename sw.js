const CACHE_VERSION = "20260327v18";
const APP_SHELL_CACHE = `rb-shell-${CACHE_VERSION}`;
const RULES_CACHE = `rb-rules-${CACHE_VERSION}`;
const CARD_IMG_CACHE = `rb-card-img-${CACHE_VERSION}`;
const RUNTIME_CACHE = `rb-runtime-${CACHE_VERSION}`;

function getBasePath() {
  try {
    return new URL(self.registration.scope).pathname;
  } catch {
    return "/";
  }
}

function scoped(path) {
  const base = getBasePath();
  const clean = String(path || "").replace(/^\/+/, "");
  return `${base}${clean}`;
}

const APP_SHELL_URLS = [
  "",
  "rules/",
  "cards/",
  "faq/",
  "errata/",
  "updates/",
  "pages/",
  "data/pages.json",
  "data/cards.json",
  "content/rules/index.json",
  "assets/css/styles.css",
  "assets/js/site.js",
  "assets/js/rules-page.js",
  "assets/js/page-detail-page.js",
  "assets/js/cards-page.js",
  "assets/js/reader-page.js",
].map(scoped);

async function warmRulePages() {
  const cache = await caches.open(RULES_CACHE);
  const pagesRes = await fetch(scoped("data/pages.json"), { cache: "no-store" });
  if (!pagesRes.ok) return;
  const pages = await pagesRes.json();
  if (!Array.isArray(pages)) return;
  const urls = [];
  for (const row of pages) {
    const id = encodeURIComponent(String(row?.id || "").trim());
    const file = String(row?.file || "").replace(/^\/+/, "");
    if (id) urls.push(scoped(`pages/${id}/`));
    if (file) urls.push(scoped(file));
  }
  await cache.addAll(urls);
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const shell = await caches.open(APP_SHELL_CACHE);
      await shell.addAll(APP_SHELL_URLS);
      await warmRulePages();
      await self.skipWaiting();
    })()
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keep = new Set([APP_SHELL_CACHE, RULES_CACHE, CARD_IMG_CACHE, RUNTIME_CACHE]);
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => !keep.has(k)).map((k) => caches.delete(k)));
      await self.clients.claim();
    })()
  );
});

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const hit = await cache.match(request);
  if (hit) return hit;
  const res = await fetch(request);
  if (res && (res.ok || res.type === "opaque")) await cache.put(request, res.clone());
  return res;
}

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const hit = await cache.match(request);
  const networkPromise = fetch(request)
    .then((res) => {
      if (res && (res.ok || res.type === "opaque")) cache.put(request, res.clone());
      return res;
    })
    .catch(() => null);
  if (hit) return hit;
  const fresh = await networkPromise;
  if (fresh) return fresh;
  return new Response("Offline", { status: 503, statusText: "Offline" });
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  const basePath = getBasePath();
  const isSameOrigin = url.origin === self.location.origin;
  const isRulePagePath = isSameOrigin && url.pathname.startsWith(`${basePath}pages/`);
  const isRuleMarkdown = isSameOrigin && url.pathname.startsWith(`${basePath}content/pages/`);
  const isDataJson = isSameOrigin && url.pathname.startsWith(`${basePath}data/`);
  const isNav = request.mode === "navigate";
  const isCardImage =
    request.destination === "image" &&
    (url.hostname === "cmsassets.rgpub.io" || /\/sanity\/images\//i.test(url.pathname));

  if (isRulePagePath || isRuleMarkdown) {
    event.respondWith(staleWhileRevalidate(request, RULES_CACHE));
    return;
  }

  if (isCardImage) {
    event.respondWith(cacheFirst(request, CARD_IMG_CACHE));
    return;
  }

  if (isDataJson) {
    event.respondWith(staleWhileRevalidate(request, RUNTIME_CACHE));
    return;
  }

  if (isNav) {
    event.respondWith(
      (async () => {
        try {
          const fresh = await fetch(request);
          const cache = await caches.open(RUNTIME_CACHE);
          if (fresh && fresh.ok) cache.put(request, fresh.clone());
          return fresh;
        } catch {
          const cache = await caches.open(RUNTIME_CACHE);
          return (
            (await cache.match(request)) ||
            (await cache.match(scoped(""))) ||
            new Response("Offline", { status: 503, statusText: "Offline" })
          );
        }
      })()
    );
  }
});

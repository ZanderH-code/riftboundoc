const SITE_VERSION = "2026.02.20";
const ROOT_RESERVED = new Set([
  "faq",
  "faq-detail",
  "errata",
  "errata-detail",
  "rules",
  "pages",
  "reader",
  "updates",
  "assets",
  "content",
  "data",
  "tools",
]);

const q = (selector) => document.querySelector(selector);
const today = () => new Date().toISOString().slice(0, 10);

function siteBase() {
  const parts = window.location.pathname.split("/").filter(Boolean);
  if (!parts.length) return "/";
  if (ROOT_RESERVED.has(parts[0])) return "/";
  return `/${parts[0]}/`;
}

function route(path) {
  const clean = String(path || "").replace(/^\/+/, "");
  return `${siteBase()}${clean}`;
}

function withQuery(href, key, value) {
  const url = new URL(href, window.location.href);
  if (value) url.searchParams.set(key, value);
  return url.pathname + (url.search || "");
}

function showStatus(message) {
  const main = document.querySelector("main");
  if (!main) return;
  let box = document.querySelector("#status-banner");
  if (!box) {
    box = document.createElement("div");
    box.id = "status-banner";
    box.className = "status-banner";
    main.prepend(box);
  }
  box.textContent = message;
}

async function getJson(path, fallback = null) {
  try {
    const res = await fetch(route(path), { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (error) {
    console.warn(`Read failed: ${path}`, error);
    showStatus(`Failed to load ${path}. Please refresh or check repository files.`);
    return fallback;
  }
}

function navActive() {
  const normalize = (pathOrHref) => {
    const url = new URL(pathOrHref, window.location.href);
    return url.pathname.replace(/index\.html$/i, "").replace(/\/+$/, "/");
  };
  const now = normalize(window.location.pathname);
  document.querySelectorAll("nav a").forEach((a) => {
    if (normalize(a.getAttribute("href") || "") === now) a.classList.add("active");
  });
  const ver = document.querySelector("#site-version");
  if (ver) ver.textContent = `v${SITE_VERSION}`;
}

function asItems(list) {
  return Array.isArray(list) ? list : [];
}

function sortByUpdated(items) {
  return [...asItems(items)].sort((a, b) =>
    String(b.updatedAt || "").localeCompare(String(a.updatedAt || ""))
  );
}

function slugify(text) {
  return String(text || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

function markdownToPlain(text) {
  return String(text || "")
    .replace(/\[\[([^\]]+)\]\]\(([^)]+)\)/g, "$1")
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1")
    .replace(/^#+\s*/gm, "")
    .replace(/[*_`>-]/g, "")
    .replace(/^Download Card Errata\s*/i, "")
    .replace(/\s+/g, " ")
    .trim();
}

function docPreview(item, maxLen = 180) {
  const raw = item.summary || item.content || item.answer || item.question || "";
  const plain = markdownToPlain(raw);
  if (plain.length <= maxLen) return plain;
  return `${plain.slice(0, maxLen).trim()}...`;
}

function formatDate(value) {
  const raw = String(value || "").trim();
  if (!raw) return "-";
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return raw;
  return d.toISOString().slice(0, 10);
}

function escapeHtml(text) {
  return String(text || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function debounce(fn, wait = 180) {
  let timer = 0;
  return (...args) => {
    window.clearTimeout(timer);
    timer = window.setTimeout(() => fn(...args), wait);
  };
}

window.rbCore = {
  SITE_VERSION,
  q,
  today,
  route,
  withQuery,
  showStatus,
  getJson,
  navActive,
  asItems,
  sortByUpdated,
  slugify,
  markdownToPlain,
  docPreview,
  formatDate,
  escapeHtml,
  debounce,
};

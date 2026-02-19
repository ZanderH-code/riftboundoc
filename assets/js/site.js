const q = (selector) => document.querySelector(selector);
const today = () => new Date().toISOString().slice(0, 10);
const SITE_VERSION = "2026.02.19";
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
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function renderFaq(items, target, options = {}) {
  const compact = Boolean(options.compact);
  if (!target) return;
  if (!asItems(items).length) {
    target.innerHTML =
      '<article class="item"><h3>No FAQ yet</h3><p class="muted">Add entries in data/faqs.json.</p></article>';
    return;
  }
  target.innerHTML = asItems(items)
    .map((it) => {
      // Backward compatibility for legacy flat QA rows.
      if (it.question || it.answer) {
        return `
      <article class="item">
        <h3>${it.question || "Untitled question"}</h3>
        <p>${it.answer || ""}</p>
        <p class="muted">Source: ${it.source || "Unknown"} | Updated: ${it.updatedAt || "-"}</p>
      </article>
    `;
      }
      const preview = docPreview(it, 180);
      const href = route(`faq-detail/?id=${encodeURIComponent(it.id || "")}`);
      return `
      <article class="item page-card" data-href="${href}" tabindex="0" role="link">
        <h3>${it.title || "Untitled FAQ"}</h3>
        <p>${preview}</p>
        <p class="muted">Source: ${it.source || "Riftbound Official"} | Published: ${
          formatDate(it.publishedAt)
        } | Updated: ${formatDate(it.updatedAt)}</p>
        <a href="${href}">Read online</a>
      </article>
    `;
    })
    .join("");
}

function renderErrata(items, target, options = {}) {
  const compact = Boolean(options.compact);
  if (!target) return;
  if (!asItems(items).length) {
    target.innerHTML =
      '<article class="item"><h3>No errata yet</h3><p class="muted">Add entries in data/errata.json.</p></article>';
    return;
  }
  target.innerHTML = asItems(items)
    .map((it) => {
      const preview = docPreview(it, 180);
      const href = route(`errata-detail/?id=${encodeURIComponent(it.id || "")}`);

      if (compact) {
        return `
      <article class="item page-card" data-href="${href}" tabindex="0" role="link">
        <h3><a href="${href}">${it.title || "Untitled errata"}</a></h3>
        <p>${preview}</p>
        <p class="muted">Source: ${it.source || "Riftbound Official"} | Published: ${
          formatDate(it.publishedAt)
        } | Updated: ${
          formatDate(it.updatedAt)
        }</p>
        <a href="${href}">Read online</a>
      </article>
    `;
      }
      return `
      <article class="item page-card" data-href="${href}" tabindex="0" role="link">
        <h3>${it.title || "Untitled errata"}</h3>
        <p>${preview}</p>
        <p class="muted">Source: ${it.source || "Official"} | Published: ${
          formatDate(it.publishedAt)
        } | Updated: ${formatDate(it.updatedAt)}</p>
        <a href="${href}">Read online</a>
      </article>
    `;
    })
    .join("");
}

function renderRules(files, target) {
  if (!target) return;
  if (!asItems(files).length) {
    target.innerHTML =
      '<article class="item"><h3>No rules yet</h3><p class="muted">Add entries in content/rules/index.json.</p></article>';
    return;
  }
  target.innerHTML = asItems(files)
    .map((it) => {
      const link = resolveRuleLink(it);
      return `
      <article class="item page-card" data-href="${link.href}" tabindex="0" role="link">
        <h3>${it.title || it.name || "Untitled rule"}</h3>
        <p>${it.summary || ""}</p>
        <p class="muted">Source: ${it.source || "Manual"} | Updated: ${formatDate(it.updatedAt)}</p>
        <a href="${link.href}"${link.target ? ` target="${link.target}" rel="${link.rel}"` : ""}>Read online</a>
      </article>
    `
    })
    .join("");
}

function resolveRuleLink(item) {
  const kind = String(item.kind || item.type || "pdf").toLowerCase();
  if (kind === "page") {
    return {
      href: route(`pages/?id=${encodeURIComponent(item.pageId || item.id || "")}`),
      target: "",
      rel: "",
    };
  }
  if (kind === "external") {
    return {
      href: item.url || "#",
      target: "_blank",
      rel: "noopener noreferrer",
    };
  }
  const src = item.url && /^https?:\/\//i.test(String(item.url)) ? item.url : route(item.url || "");
  return {
    href: route(`reader/?src=${encodeURIComponent(src)}`),
    target: "",
    rel: "",
  };
}

function normalizeRuleIndex(indexData) {
  if (Array.isArray(indexData)) return indexData;
  if (!indexData || typeof indexData !== "object") return [];
  if (Array.isArray(indexData.rules)) return indexData.rules;
  if (Array.isArray(indexData.files)) {
    return indexData.files.map((it) => ({
      ...it,
      kind: it.kind || it.type || "pdf",
    }));
  }
  return [];
}

function renderPages(items, target) {
  if (!target) return;
  target.innerHTML = asItems(items)
    .map(
      (it) => `
      <article class="item page-card" data-href="${route(
        `pages/?id=${encodeURIComponent(it.id || "")}`
      )}" tabindex="0" role="link">
        <h3>${it.title || "Untitled page"}</h3>
        <p>${it.summary || ""}</p>
        <p class="muted">Updated: ${formatDate(it.updatedAt)}</p>
      </article>
    `
    )
    .join("");
}

function bindPageCards(container) {
  if (!container) return;
  container.querySelectorAll(".page-card").forEach((card) => {
    const go = () => {
      const href = card.getAttribute("data-href");
      if (href) window.location.href = href;
    };
    card.addEventListener("click", go);
    card.addEventListener("keydown", (ev) => {
      if (ev.key === "Enter" || ev.key === " ") {
        ev.preventDefault();
        go();
      }
    });
  });
}

function renderCoreRuleCard(pages, rules, target) {
  if (!target) return;
  const corePage =
    asItems(pages).find((it) => it.id === "riftbound-core-rules-v1-2") || asItems(pages)[0];
  const coreRuleEntry =
    asItems(rules).find((it) => String(it.pageId || it.id).includes("riftbound-core-rules-v1-2")) ||
    asItems(rules)[0];
  if (!corePage && !coreRuleEntry) {
    target.innerHTML =
      '<article class="item"><h3>Core Rules not found</h3><p class="muted">Add or update the core rule entry in data/pages.json or content/rules/index.json.</p></article>';
    return;
  }
  const href = corePage
    ? route(`pages/?id=${encodeURIComponent(corePage.id)}`)
    : resolveRuleLink(coreRuleEntry).href;
  const title = corePage?.title || coreRuleEntry?.title || "Riftbound Core Rules";
  const summary =
    corePage?.summary ||
    coreRuleEntry?.summary ||
    "Official core rules text version for web reading.";
  target.innerHTML = `
    <article class="item page-card featured-card" data-href="${href}" tabindex="0" role="link">
      <h3>${title}</h3>
      <p>${summary}</p>
      <a href="${href}">Open Core Rules</a>
    </article>
  `;
}

function buildTocFor(contentSelector, tocSelector) {
  const content = q(contentSelector);
  const toc = q(tocSelector);
  if (!content || !toc) return;
  const headings = Array.from(content.querySelectorAll("h2, h3, h4"));
  if (!headings.length) {
    toc.innerHTML = '<div class="toc-title">Contents</div><p class="muted">No sections found.</p>';
    return;
  }
  let html = '<div class="toc-title">Contents</div>';
  headings.forEach((el, idx) => {
    if (!el.id) el.id = `${slugify(el.textContent) || "section"}-${idx + 1}`;
    const level = Number(el.tagName.slice(1));
    const cls = level === 2 ? "toc-l2" : level === 3 ? "toc-l3" : "toc-l4";
    html += `<a href=\"#${el.id}\" class="toc-link ${cls}">${escapeHtml(el.textContent)}</a>`;
  });
  toc.innerHTML = html;
}

function highlightQueryIn(containerSelector) {
  const container = q(containerSelector);
  if (!container) return;
  const term = new URLSearchParams(window.location.search).get("q");
  const needle = markdownToPlain(term);
  if (!needle) return;
  const safe = needle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`(${safe})`, "ig");
  container.innerHTML = container.innerHTML.replace(re, "<mark>$1</mark>");
  const first = container.querySelector("mark");
  if (first) first.scrollIntoView({ behavior: "smooth", block: "center" });
}

function initMobileTocDrawer() {
  const root = q(".reading-layout");
  const panel = q(".reading-layout .side-panel");
  const toc = panel ? panel.querySelector(".toc") : null;
  if (!root || !panel || !toc) return;
  if (q("#toc-fab")) return;
  document.body.classList.add("has-toc-drawer");

  const openBtn = document.createElement("button");
  openBtn.type = "button";
  openBtn.id = "toc-fab";
  openBtn.className = "toc-fab";
  openBtn.setAttribute("aria-controls", "toc-drawer");
  openBtn.setAttribute("aria-expanded", "false");
  openBtn.textContent = "Contents";

  const backdrop = document.createElement("button");
  backdrop.type = "button";
  backdrop.id = "toc-backdrop";
  backdrop.className = "toc-backdrop";
  backdrop.setAttribute("aria-label", "Close contents");

  panel.id = panel.id || "toc-drawer";
  panel.classList.add("toc-drawer");

  const header = document.createElement("div");
  header.className = "toc-drawer-head";
  header.innerHTML = '<strong>Contents</strong>';
  const closeBtn = document.createElement("button");
  closeBtn.type = "button";
  closeBtn.className = "toc-drawer-close";
  closeBtn.setAttribute("aria-label", "Close contents");
  closeBtn.textContent = "Close";
  header.appendChild(closeBtn);

  if (!panel.querySelector(".toc-drawer-head")) panel.prepend(header);
  document.body.appendChild(backdrop);
  document.body.appendChild(openBtn);

  const closeDrawer = () => {
    document.body.classList.remove("toc-drawer-open");
    openBtn.setAttribute("aria-expanded", "false");
  };
  const openDrawer = () => {
    document.body.classList.add("toc-drawer-open");
    openBtn.setAttribute("aria-expanded", "true");
  };

  openBtn.addEventListener("click", openDrawer);
  closeBtn.addEventListener("click", closeDrawer);
  backdrop.addEventListener("click", closeDrawer);
  panel.addEventListener("click", (ev) => {
    if (ev.target && ev.target.closest(".toc-link")) closeDrawer();
  });
  window.addEventListener("keydown", (ev) => {
    if (ev.key === "Escape") closeDrawer();
  });
}

function initReaderPrefs() {
  const keys = {
    scale: "rb_reader_scale",
    line: "rb_reader_line",
    width: "rb_reader_width",
  };
  const root = document.documentElement;
  const apply = () => {
    root.style.setProperty("--reader-font-scale", localStorage.getItem(keys.scale) || "1");
    root.style.setProperty("--reader-line-height", localStorage.getItem(keys.line) || "1.72");
    root.style.setProperty("--reader-max-width", localStorage.getItem(keys.width) || "100%");
  };
  apply();
  const host = q("#reader-prefs");
  if (!host) return;
  host.innerHTML = `
    <div class="reader-prefs">
      <label>Font <input id="pref-scale" type="range" min="0.9" max="1.3" step="0.05" value="${localStorage.getItem(
        keys.scale
      ) || "1"}" /></label>
      <label>Line <input id="pref-line" type="range" min="1.4" max="2.0" step="0.05" value="${localStorage.getItem(
        keys.line
      ) || "1.72"}" /></label>
      <label>Width <input id="pref-width" type="range" min="60" max="100" step="5" value="${(
        localStorage.getItem(keys.width) || "100%"
      ).replace("%", "")}" /></label>
    </div>
  `;
  q("#pref-scale")?.addEventListener("input", (e) => {
    localStorage.setItem(keys.scale, e.target.value);
    apply();
  });
  q("#pref-line")?.addEventListener("input", (e) => {
    localStorage.setItem(keys.line, e.target.value);
    apply();
  });
  q("#pref-width")?.addEventListener("input", (e) => {
    localStorage.setItem(keys.width, `${e.target.value}%`);
    apply();
  });
}

async function buildSearchIndex(pages, faqs, errata, rules) {
  const docs = [];

  for (const page of asItems(pages)) {
    let body = "";
    if (page.file) {
      try {
        body = await fetch(route(page.file), { cache: "no-store" }).then((r) => r.text());
      } catch {
        body = "";
      }
    }
    docs.push({
      kind: "Page",
      title: page.title || "Untitled page",
      href: route(`pages/?id=${encodeURIComponent(page.id || "")}`),
      text: markdownToPlain(`${page.title || ""}\n${page.summary || ""}\n${body}`),
    });
  }

  for (const item of asItems(faqs)) {
    docs.push({
      kind: "FAQ",
      title: item.title || "Untitled FAQ",
      href: route(`faq-detail/?id=${encodeURIComponent(item.id || "")}`),
      text: markdownToPlain(`${item.title || ""}\n${item.summary || ""}\n${item.content || ""}`),
    });
  }

  for (const item of asItems(errata)) {
    docs.push({
      kind: "Errata",
      title: item.title || "Untitled errata",
      href: route(`errata-detail/?id=${encodeURIComponent(item.id || "")}`),
      text: markdownToPlain(`${item.title || ""}\n${item.summary || ""}\n${item.content || ""}`),
    });
  }

  for (const item of asItems(rules)) {
    const link = resolveRuleLink(item);
    docs.push({
      kind: "Rule",
      title: item.title || item.name || "Untitled rule",
      href: link.href || "#",
      text: markdownToPlain(`${item.title || ""}\n${item.summary || ""}\n${item.source || ""}`),
    });
  }

  return docs;
}

function searchDocs(query, docs, options = {}) {
  const mode = options.mode || "hits";
  const kindFilter = options.kind || "all";
  const tokens = markdownToPlain(query)
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean);
  if (!tokens.length) return [];

  const matchedDocs = [];
  for (const doc of docs) {
    if (kindFilter !== "all" && doc.kind !== kindFilter) continue;
    const hay = String(doc.text || "").toLowerCase();
    if (!tokens.every((t) => hay.includes(t))) continue;

    let score = 0;
    for (const token of tokens) {
      let idx = hay.indexOf(token);
      while (idx >= 0) {
        score += 1;
        idx = hay.indexOf(token, idx + token.length);
      }
    }
    matchedDocs.push({ ...doc, score });
  }
  matchedDocs.sort((a, b) => b.score - a.score || a.title.localeCompare(b.title));

  if (mode === "docs") {
    return matchedDocs.map((doc) => ({
      ...doc,
      snippet: buildSearchSnippetAt(doc.text, tokens, 0),
    }));
  }

  // Flatten to hit-level results: one result per matched snippet.
  const flattened = [];
  for (const doc of matchedDocs) {
    const snippets = buildAllSearchSnippets(doc.text, tokens);
    for (const snippet of snippets) {
      flattened.push({
        ...doc,
        snippet,
      });
    }
  }
  return flattened;
}

function buildSearchSnippetAt(text, tokens, hitIndex) {
  const plain = String(text || "").trim();
  if (!plain) return "";
  const idx = hitIndex >= 0 ? hitIndex : 0;
  const start = Math.max(0, idx - 70);
  const end = Math.min(plain.length, idx + 170);
  const prefix = start > 0 ? "..." : "";
  const suffix = end < plain.length ? "..." : "";
  let snippet = `${prefix}${plain.slice(start, end).trim()}${suffix}`;

  // Highlight matched tokens in preview.
  for (const token of tokens) {
    if (!token) continue;
    const safe = token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const re = new RegExp(`(${safe})`, "ig");
    snippet = snippet.replace(re, "<mark>$1</mark>");
  }
  return snippet;
}

function buildAllSearchSnippets(text, tokens, limitPerDoc = 200) {
  const plain = String(text || "").trim();
  if (!plain) return [];
  const lower = plain.toLowerCase();
  const hitIndexes = new Set();
  for (const token of tokens) {
    if (!token) continue;
    let idx = lower.indexOf(token.toLowerCase());
    while (idx >= 0) {
      hitIndexes.add(idx);
      idx = lower.indexOf(token.toLowerCase(), idx + token.length);
    }
  }

  return Array.from(hitIndexes)
    .sort((a, b) => a - b)
    .slice(0, limitPerDoc)
    .map((idx) => buildSearchSnippetAt(plain, tokens, idx));
}

function renderSearchPager(total, page, pageSize, target, onPage) {
  if (!target) return;
  target.innerHTML = "";
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  if (pageCount <= 1) return;

  const mk = (label, to, active = false, disabled = false) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = label;
    if (active) btn.classList.add("active");
    btn.disabled = disabled;
    btn.addEventListener("click", () => onPage(to));
    return btn;
  };

  target.appendChild(mk("Prev", page - 1, false, page <= 1));
  for (let p = 1; p <= pageCount; p += 1) {
    target.appendChild(mk(String(p), p, p === page));
  }
  target.appendChild(mk("Next", page + 1, false, page >= pageCount));
}

function renderSearchResults(results, target, meta, pager, query, page = 1, pageSize = 12, onPage) {
  if (!target || !meta) return;
  if (!query) {
    meta.textContent = "Type keywords to search all indexed content.";
    target.innerHTML = "";
    if (pager) pager.innerHTML = "";
    return;
  }
  const pageCount = Math.max(1, Math.ceil(results.length / pageSize));
  const current = Math.min(Math.max(1, page), pageCount);
  const start = (current - 1) * pageSize;
  const view = results.slice(start, start + pageSize);
  meta.textContent = `${results.length} hit(s) for "${query}" | Page ${current}/${pageCount}`;
  if (!results.length) {
    target.innerHTML = '<article class="item"><p class="muted">No matching content.</p></article>';
    if (pager) pager.innerHTML = "";
    return;
  }
  target.innerHTML = view
    .map((r) => {
      const snippet = r.snippet || "";
      const link = withQuery(r.href, "q", query);
      return `
      <article class="item search-result">
        <div class="result-head">
          <h3><a href="${link}">${escapeHtml(r.title)}</a></h3>
          <span class="result-kind">${r.kind}</span>
        </div>
        <p class="result-snippet">${snippet}</p>
      </article>
    `;
    })
    .join("");
  renderSearchPager(results.length, current, pageSize, pager, onPage);
}

async function initHomeSearch(data) {
  const input = q("#home-search-input");
  const button = q("#home-search-btn");
  const meta = q("#home-search-meta");
  const list = q("#home-search-results");
  const pager = q("#home-search-pager");
  const kindSel = q("#home-search-kind");
  const modeSel = q("#home-search-mode");
  if (!input || !button || !meta || !list || !pager || !kindSel || !modeSel) return;

  const docs = await buildSearchIndex(data.pages, data.faqs, data.errata, data.rules);
  meta.textContent = `Index ready: ${docs.length} documents.`;
  let currentPage = 1;
  let latestResults = [];
  const pageSize = 12;

  const run = (page = 1) => {
    const query = input.value.trim();
    latestResults = searchDocs(query, docs, {
      kind: kindSel.value || "all",
      mode: modeSel.value || "hits",
    });
    currentPage = page;
    renderSearchResults(latestResults, list, meta, pager, query, currentPage, pageSize, (p) => {
      run(p);
    });
  };
  button.addEventListener("click", () => run(1));
  input.addEventListener("keydown", (ev) => {
    if (ev.key === "Enter") run(1);
  });
  input.addEventListener("input", () => {
    if (!input.value.trim()) {
      latestResults = [];
      renderSearchResults([], list, meta, pager, "", 1, pageSize, () => {});
    }
  });
  kindSel.addEventListener("change", () => run(1));
  modeSel.addEventListener("change", () => run(1));
}

function buildPageToc() {
  const toc = q("#page-toc");
  const content = q("#page-content");
  if (!toc || !content) return;

  const headings = Array.from(content.querySelectorAll("h2, h3, h4"));
  const ruleHeadings = Array.from(
    content.querySelectorAll(".rule-row.rule-chapter, .rule-row.rule-heading")
  );

  if (headings.length === 0 && ruleHeadings.length === 0) {
    toc.innerHTML = '<div class="toc-title">Contents</div><p class="muted">No sections found.</p>';
    return;
  }

  let html = '<div class="toc-title">Contents</div>';
  headings.forEach((el, idx) => {
    if (!el.id) el.id = `${slugify(el.textContent) || "section"}-${idx + 1}`;
    const level = Number(el.tagName.slice(1));
    const cls = level === 2 ? "toc-l2" : level === 3 ? "toc-l3" : "toc-l4";
    html += `<a href=\"#${el.id}\" class="toc-link ${cls}">${escapeHtml(el.textContent)}</a>`;
  });

  ruleHeadings.forEach((row, idx) => {
    const idCell = row.querySelector(".rule-id");
    const textCell = row.querySelector(".rule-text");
    const label = `${idCell?.textContent || ""} ${textCell?.textContent || ""}`.trim();
    if (!label) return;
    if (!row.id) row.id = `rule-${slugify(label)}-${idx + 1}`;
    const cls = row.classList.contains("level-0")
      ? "toc-l2"
      : row.classList.contains("level-1")
      ? "toc-l3"
      : "toc-l4";
    html += `<a href=\"#${row.id}\" class="toc-link ${cls}">${escapeHtml(label)}</a>`;
  });
  toc.innerHTML = html;
}

async function initHome() {
  const pages = await getJson("data/pages.json", []);
  const faqs = await getJson("data/faqs.json", []);
  const errata = await getJson("data/errata.json", []);
  const rulesIndex = await getJson("content/rules/index.json", { rules: [] });
  const rules = normalizeRuleIndex(rulesIndex);

  const statsPages = q("#stats-pages");
  const statsFaq = q("#stats-faq");
  const statsErrata = q("#stats-errata");
  const statsRules = q("#stats-rules");
  const statsUpdate = q("#stats-update");
  if (statsPages) statsPages.textContent = asItems(pages).length;
  if (statsFaq) statsFaq.textContent = asItems(faqs).length;
  if (statsErrata) statsErrata.textContent = asItems(errata).length;
  if (statsRules) statsRules.textContent = asItems(rules).length;
  if (statsUpdate) statsUpdate.textContent = today();

  renderFaq(sortByUpdated(faqs).slice(0, 2), q("#home-faq"), { compact: true });
  renderErrata(sortByUpdated(errata).slice(0, 2), q("#home-errata"), { compact: true });
  const homePages = q("#home-pages");
  renderPages(sortByUpdated(pages).slice(0, 4), homePages);
  renderCoreRuleCard(pages, rules, q("#home-core-rule"));
  bindPageCards(homePages);
  bindPageCards(q("#home-faq"));
  bindPageCards(q("#home-errata"));
  bindPageCards(q("#home-core-rule"));
  bindPageCards(q(".hero .grid"));
  initHomeSearch({ pages, faqs, errata, rules });
}

async function initFaqPage() {
  const faqs = await getJson("data/faqs.json", []);
  const list = q("#faq-list");
  renderFaq(sortByUpdated(faqs), list);
  bindPageCards(list);
}

async function initFaqDetail() {
  const id = new URLSearchParams(window.location.search).get("id");
  const faqs = await getJson("data/faqs.json", []);
  const ordered = sortByUpdated(faqs);
  const one = ordered.find((it) => it.id === id) || ordered[0];
  if (!one) return;

  if (q("#faq-title")) q("#faq-title").textContent = one.title || "FAQ";
  if (q("#faq-meta")) {
    q("#faq-meta").textContent = `ID: ${one.id || "-"} | Published: ${formatDate(
      one.publishedAt
    )} | Updated: ${
      formatDate(one.updatedAt)
    }`;
  }
  if (q("#faq-source")) {
    q("#faq-source").innerHTML = `<a href="${one.originUrl || "#"}" target="_blank" rel="noopener noreferrer">Official Source</a>`;
  }
  const body = String(one.content || "").trim();
  if (window.marked && typeof window.marked.parse === "function") {
    q("#faq-content").innerHTML = window.marked.parse(body);
  } else {
    q("#faq-content").innerHTML = `<pre>${body}</pre>`;
  }
  initReaderPrefs();
  buildTocFor("#faq-content", "#faq-toc");
  initMobileTocDrawer();
  highlightQueryIn("#faq-content");
}

async function initRulePage() {
  const local = await getJson("content/rules/index.json", { rules: [] });
  const list = q("#rule-list");
  renderRules(sortByUpdated(normalizeRuleIndex(local)), list);
  bindPageCards(list);
}

async function initErrataPage() {
  const errata = await getJson("data/errata.json", []);
  const list = q("#errata-list");
  renderErrata(sortByUpdated(errata), list);
  bindPageCards(list);
}

async function initErrataDetail() {
  const id = new URLSearchParams(window.location.search).get("id");
  const errata = await getJson("data/errata.json", []);
  const ordered = sortByUpdated(errata);
  const one = ordered.find((it) => it.id === id) || ordered[0];
  if (!one) return;

  if (q("#errata-title")) q("#errata-title").textContent = one.title || "Errata";
  if (q("#errata-meta")) {
    q("#errata-meta").textContent = `ID: ${one.id || "-"} | Published: ${
      formatDate(one.publishedAt)
    } | Updated: ${formatDate(one.updatedAt)}`;
  }
  if (q("#errata-source")) {
    q("#errata-source").innerHTML = `<a href="${one.originUrl || "#"}" target="_blank" rel="noopener noreferrer">Official Source</a>`;
  }

  const body = String(one.content || "").trim();
  if (window.marked && typeof window.marked.parse === "function") {
    q("#errata-content").innerHTML = window.marked.parse(body);
  } else {
    q("#errata-content").innerHTML = `<pre>${body}</pre>`;
  }
  initReaderPrefs();
  buildTocFor("#errata-content", "#errata-toc");
  initMobileTocDrawer();
  highlightQueryIn("#errata-content");
}

function initReader() {
  const src = new URLSearchParams(window.location.search).get("src");
  if (!src) {
    q("#reader-wrap").innerHTML =
      '<p class="muted">Open from the Rules page or use ?src=PDF_URL.</p>';
    return;
  }
  q("#reader-title").textContent = decodeURIComponent(src).split("/").pop();
  q("#pdf-view").src = src;
}

async function initPage() {
  const id = new URLSearchParams(window.location.search).get("id");
  const pages = await getJson("data/pages.json", []);
  const ordered = sortByUpdated(pages);
  const one = ordered.find((it) => it.id === id) || ordered[0];
  if (!one) return;

  q("#page-title").textContent = one.title;
  q("#page-summary").textContent = one.summary || "";
  if (q("#doc-meta")) {
    q("#doc-meta").textContent = `Updated: ${formatDate(one.updatedAt)} | ID: ${one.id}`;
  }

  try {
    const md = await fetch(route(one.file), { cache: "no-store" }).then((r) => r.text());
    if (window.marked && typeof window.marked.parse === "function") {
      q("#page-content").innerHTML = window.marked.parse(md);
    } else {
      q("#page-content").innerHTML = `<pre>${md}</pre>`;
    }
  } catch (error) {
    showStatus(`Failed to load page content: ${one.file}`);
  }

  buildPageToc();
  initReaderPrefs();
  initMobileTocDrawer();
  highlightQueryIn("#page-content");
}

async function initPageList() {
  const pages = await getJson("data/pages.json", []);
  const pageList = q("#page-list");
  renderPages(sortByUpdated(pages), pageList);
  bindPageCards(pageList);
}

async function initUpdatesPage() {
  const wrap = q("#updates-list");
  if (!wrap) return;
  const pages = await getJson("data/pages.json", []);
  const faqs = await getJson("data/faqs.json", []);
  const errata = await getJson("data/errata.json", []);
  const rulesIndex = await getJson("content/rules/index.json", { rules: [] });
  const rules = normalizeRuleIndex(rulesIndex);

  const items = [
    ...asItems(pages).map((x) => ({
      kind: "Page",
      title: x.title || "Untitled page",
      updatedAt: x.updatedAt,
      href: route(`pages/?id=${encodeURIComponent(x.id || "")}`),
    })),
    ...asItems(faqs).map((x) => ({
      kind: "FAQ",
      title: x.title || "Untitled FAQ",
      updatedAt: x.updatedAt,
      href: route(`faq-detail/?id=${encodeURIComponent(x.id || "")}`),
    })),
    ...asItems(errata).map((x) => ({
      kind: "Errata",
      title: x.title || "Untitled errata",
      updatedAt: x.updatedAt,
      href: route(`errata-detail/?id=${encodeURIComponent(x.id || "")}`),
    })),
    ...asItems(rules).map((x) => ({
      kind: "Rule",
      title: x.title || "Untitled rule",
      updatedAt: x.updatedAt,
      href: resolveRuleLink(x).href,
    })),
  ].sort((a, b) => String(b.updatedAt || "").localeCompare(String(a.updatedAt || "")));

  wrap.innerHTML = items
    .map(
      (it) => `
    <article class="item">
      <h3><a href="${it.href}">${escapeHtml(it.title)}</a></h3>
      <p class="muted">Type: ${it.kind} | Updated: ${formatDate(it.updatedAt)}</p>
    </article>
  `
    )
    .join("");
}

window.site = {
  navActive,
  initHome,
  initFaqPage,
  initFaqDetail,
  initRulePage,
  initErrataPage,
  initErrataDetail,
  initReader,
  initPage,
  initPageList,
  initUpdatesPage,
};

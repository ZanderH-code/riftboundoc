const q = (selector) => document.querySelector(selector);
const today = () => new Date().toISOString().slice(0, 10);
const SITE_VERSION = "2026.02.20.11";
const ROOT_RESERVED = new Set([
  "cards",
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
  updateAnchorOffsetVar();
  window.addEventListener("resize", updateAnchorOffsetVar);
}

function getTopbarHeight() {
  const bar = q(".topbar");
  if (!bar) return 0;
  return Math.max(0, Math.round(bar.getBoundingClientRect().height));
}

function updateAnchorOffsetVar() {
  const topbar = getTopbarHeight();
  const vh = window.innerHeight || 800;
  const fallback = vh <= 800 ? 170 : 146;
  const dynamic = Math.max(fallback, topbar + 24);
  document.documentElement.style.setProperty("--anchor-offset", `${dynamic}px`);
}

function asItems(list) {
  return Array.isArray(list) ? list : [];
}

function sortByUpdated(items) {
  return [...asItems(items)].sort((a, b) =>
    String(b.updatedAt || "").localeCompare(String(a.updatedAt || ""))
  );
}

function sortByPublishedThenUpdated(items) {
  return [...asItems(items)].sort((a, b) => {
    const bp = String(b.publishedAt || "");
    const ap = String(a.publishedAt || "");
    const byPublished = bp.localeCompare(ap);
    if (byPublished !== 0) return byPublished;
    return String(b.updatedAt || "").localeCompare(String(a.updatedAt || ""));
  });
}

function sortByTime(items, order = "desc") {
  const asc = order === "asc";
  return [...asItems(items)].sort((a, b) => {
    const aPrimary = String(a.publishedAt || a.updatedAt || "");
    const bPrimary = String(b.publishedAt || b.updatedAt || "");
    const aUpdated = String(a.updatedAt || "");
    const bUpdated = String(b.updatedAt || "");

    let cmp = aPrimary.localeCompare(bPrimary);
    if (cmp === 0) cmp = aUpdated.localeCompare(bUpdated);
    if (cmp === 0) cmp = String(a.title || a.name || "").localeCompare(String(b.title || b.name || ""));
    return asc ? cmp : -cmp;
  });
}

function mountTimeSortControls(listEl, onChange, defaultOrder = "desc") {
  if (!listEl || !listEl.parentElement || typeof onChange !== "function") return;
  const host = listEl.parentElement;

  const toolbar = document.createElement("div");
  toolbar.className = "toolbar list-sort-toolbar";
  toolbar.innerHTML = `
    <span class="muted">Sort by time</span>
    <button type="button" class="secondary" data-order="desc">Newest first</button>
    <button type="button" class="secondary" data-order="asc">Oldest first</button>
  `;
  host.insertBefore(toolbar, listEl);

  const buttons = Array.from(toolbar.querySelectorAll("button[data-order]"));
  const setActive = (order) => {
    buttons.forEach((btn) => {
      btn.classList.toggle("active", btn.getAttribute("data-order") === order);
    });
  };

  buttons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const order = btn.getAttribute("data-order") || "desc";
      setActive(order);
      onChange(order);
    });
  });

  setActive(defaultOrder);
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

function isUsefulTocHeading(text) {
  const t = String(text || "").trim();
  if (!t) return false;
  if (/^\[(new|old)\s+text\]$/i.test(t)) return false;
  if (/^[\[【(（]?\s*(new|old)\s+text\s*[\]】)）]?$/i.test(t)) return false;
  if (/^[▲△▴▵]+$/.test(t)) return false;
  if (/^[^A-Za-z0-9]+$/.test(t)) return false;
  return true;
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
        <h3>${it.title || "Untitled errata"}</h3>
        <p>${preview}</p>
        <p class="muted">Source: ${it.source || "Riftbound Official"} | Published: ${
          formatDate(it.publishedAt)
        } | Updated: ${
          formatDate(it.updatedAt)
        }</p>
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

function normalizeCardsData(data) {
  if (Array.isArray(data)) return data;
  if (data && typeof data === "object" && Array.isArray(data.cards)) return data.cards;
  return [];
}

function renderCards(items, target) {
  if (!target) return;
  const rows = asItems(items);
  if (!rows.length) {
    target.innerHTML =
      '<article class="item"><h3>No cards yet</h3><p class="muted">Run tools/import_official_cards.py to sync official card gallery data.</p></article>';
    return;
  }
  target.innerHTML = rows
    .map((it) => {
      const title = escapeHtml(it.name || "Untitled card");
      const setName = escapeHtml(it.set || "-");
      const code = escapeHtml(it.publicCode || "-");
      const rarity = escapeHtml(it.rarity || "-");
      const type = escapeHtml(asItems(it.cardTypes).join(", ") || "-");
      const domains = escapeHtml(asItems(it.domains).join(", ") || "-");
      const abilityRaw = String(it.abilityText || "");
      const abilityCut = abilityRaw.slice(0, 260);
      const ability = renderCardAbilityText(abilityCut);
      const img = escapeHtml(it.imageUrl || "");
      const alt = escapeHtml(it.imageAlt || it.name || "Card image");
      const stats = [
        it.energy ? `Energy ${escapeHtml(it.energy)}` : "",
        it.might ? `Might ${escapeHtml(it.might)}` : "",
        it.power ? `Power ${escapeHtml(it.power)}` : "",
      ]
        .filter(Boolean)
        .join(" | ");

      return `
      <article class="item card-item" data-card-id="${escapeHtml(it.id || "")}" tabindex="0" role="button" aria-label="Open card details for ${title}">
        <div class="card-media">
          ${img ? `<img src="${img}" alt="${alt}" loading="lazy" />` : "<div class=\"card-media-empty\">No image</div>"}
        </div>
        <div class="card-body">
          <h3>${title}</h3>
          <p class="muted">Code: ${code} | Set: ${setName}</p>
          <p class="muted">Type: ${type} | Domain: ${domains} | Rarity: ${rarity}</p>
          ${stats ? `<p class="muted">${stats}</p>` : ""}
          ${ability ? `<p class="card-ability-preview">${ability}${abilityRaw.length > 260 ? "..." : ""}</p>` : ""}
        </div>
      </article>
    `;
    })
    .join("");
}

function renderCardAbilityText(text) {
  const raw = String(text || "").replace(/\r\n?/g, "\n");
  if (!raw.trim()) return "No ability text.";

  const runeIcon = {
    body: route("assets/img/domains/body.webp"),
    calm: route("assets/img/domains/calm.webp"),
    mind: route("assets/img/domains/mind.webp"),
    order: route("assets/img/domains/order.webp"),
    chaos: route("assets/img/domains/chaos.webp"),
    fury: route("assets/img/domains/fury.webp"),
  };

  let html = escapeHtml(raw);
  html = html.replace(/:rb_energy_(\d+):/gi, (_m, n) => {
    return `<span class="rb-token rb-energy" title="Energy ${n}">${escapeHtml(n)}</span>`;
  });
  html = html.replace(/:rb_rune_([a-z]+):/gi, (_m, keyRaw) => {
    const key = String(keyRaw || "").toLowerCase();
    const src = runeIcon[key];
    if (!src) {
      if (key === "rainbow") {
        return '<span class="rb-token rb-rainbow" title="Any rune"></span>';
      }
      return `<span class="rb-token rb-rune-text">${escapeHtml(key)}</span>`;
    }
    return `<img class="rb-token rb-rune" src="${escapeHtml(src)}" alt="${escapeHtml(
      key
    )} rune" title="${escapeHtml(key)} rune" />`;
  });
  return html.replace(/\n/g, "<br />");
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
    </article>
  `;
}

function flashAnchorTarget(targetId) {
  if (!targetId) return;
  const el = document.getElementById(targetId);
  if (!el) return;
  el.classList.remove("anchor-focus");
  // Force reflow so repeated clicks retrigger animation.
  void el.offsetWidth;
  el.classList.add("anchor-focus");
  window.setTimeout(() => el.classList.remove("anchor-focus"), 1600);
}

function scrollToAnchorTarget(targetId) {
  if (!targetId) return;
  const el = document.getElementById(targetId);
  if (!el) return;
  updateAnchorOffsetVar();
  const topbar = getTopbarHeight();
  const viewport = window.innerHeight || 0;
  // Keep target in the upper-middle viewport area.
  const preferredOffset = Math.max(topbar + 20, Math.round(viewport * 0.32));
  const targetTop = Math.max(0, window.scrollY + el.getBoundingClientRect().top - preferredOffset);
  window.scrollTo({ top: targetTop, behavior: "smooth" });
}

function bindTocHighlights(toc) {
  if (!toc) return;
  toc.querySelectorAll('a[href^="#"]').forEach((a) => {
    a.addEventListener("click", (ev) => {
      const id = String(a.getAttribute("href") || "").replace(/^#/, "");
      if (!id) return;
      ev.preventDefault();
      scrollToAnchorTarget(id);
      try {
        const base = window.location.pathname + window.location.search;
        window.history.replaceState({}, "", `${base}#${id}`);
      } catch {}
      window.setTimeout(() => flashAnchorTarget(id), 120);
    });
  });
}

function buildTocFor(contentSelector, tocSelector) {
  const content = q(contentSelector);
  const toc = q(tocSelector);
  if (!content || !toc) return;
  const headings = Array.from(content.querySelectorAll("h2, h3, h4")).filter((el) =>
    isUsefulTocHeading(el.textContent)
  );
  const questionRows =
    contentSelector === "#faq-content"
      ? Array.from(content.querySelectorAll("p, li")).filter((el) => {
          const txt = String(el.textContent || "").trim();
          return /^Q:\s+/i.test(txt) || /^Q：\s+/.test(txt);
        })
      : [];

  if (!headings.length && !questionRows.length) {
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

  if (questionRows.length) {
    html += '<div class="toc-title" style="margin-top:8px">Questions</div>';
    questionRows.forEach((el, idx) => {
      if (!el.id) el.id = `faq-q-${idx + 1}`;
      const label = String(el.textContent || "").trim();
      html += `<a href=\"#${el.id}\" class="toc-link toc-l3">${escapeHtml(label)}</a>`;
    });
  }
  toc.innerHTML = html;
  bindTocHighlights(toc);
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

function normalizeDocumentMarkdown(markdown, kind = "generic") {
  let text = String(markdown || "")
    .replace(/\r\n?/g, "\n")
    .replace(/\u00a0/g, " ")
    .replace(/\u200b/g, "")
    .replace(/\ufeff/g, "");

  text = text
    .replace(
      /design shorthand!Origins FAQ Outstanding Issues and ErrataSome categories/gi,
      "design shorthand!\n\n## Origins FAQ Outstanding Issues and Errata\n\nSome categories"
    )
    .replace(
      /Spiritforged Functional ErrataA handful of cards in Spiritforged/gi,
      "## Spiritforged Functional Errata\n\nA handful of cards in Spiritforged"
    )
    .replace(
      /Rules ClarificationsThere are a few cards in Spiritforged/gi,
      "## Rules Clarifications\n\nThere are a few cards in Spiritforged"
    );

  const sectionTitles = new Set([
    "Origins FAQ Outstanding Issues and Errata",
    "Cards that Tell You to Play Other Cards from Your Deck",
    "Reflexive Triggers on Spiritforged Cards",
    "Spiritforged Functional Errata",
    "Rules Clarifications",
    "Cards that Reduce Might",
    "Origins Cards",
    "Spiritforged Cards",
  ]);

  const lines = text.split("\n");
  const out = [];
  for (let i = 0; i < lines.length; i += 1) {
    const raw = lines[i];
    const line = String(raw || "").trim();
    const prev = String(lines[i - 1] || "").trim();
    const next = String(lines[i + 1] || "").trim();

    if (!line) {
      out.push("");
      continue;
    }
    if (line.startsWith("#") || line.startsWith("- ") || line.startsWith("* ") || line.startsWith("<")) {
      out.push(raw);
      continue;
    }
    if (sectionTitles.has(line)) {
      out.push(`## ${line}`);
      continue;
    }
    if (/^Q:\s+/i.test(line) || /^Q：\s+/.test(line)) {
      out.push(`### ${line}`);
      continue;
    }
    if (line.toUpperCase() === "[NEW TEXT]" || line.toUpperCase() === "[OLD TEXT]") {
      out.push(`#### ${line}`);
      continue;
    }
    if (/\(revised text\)$/i.test(line)) {
      out.push(`### ${line}`);
      continue;
    }
    if (
      !prev &&
      next &&
      line.length <= 72 &&
      /^[A-Z0-9].*/.test(line) &&
      !/[.!?:]$/.test(line) &&
      !line.startsWith("[")
    ) {
      out.push(`### ${line}`);
      continue;
    }
    if (
      (kind === "faq" || kind === "errata") &&
      /^[A-Z][A-Za-z0-9'`",.!?&\- ]{2,70}$/.test(line) &&
      !/[.:?]$/.test(line) &&
      !/^\[/.test(line) &&
      !prev &&
      next
    ) {
      out.push(`#### ${line}`);
      continue;
    }
    out.push(raw);
  }
  return out.join("\n").replace(/\n{3,}/g, "\n\n").trim();
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
  panel.addEventListener("click", (ev) => {
    if (ev.target && ev.target.closest(".toc-link")) closeDrawer();
  });
  document.addEventListener("click", (ev) => {
    if (!document.body.classList.contains("toc-drawer-open")) return;
    const target = ev.target;
    if (!target) return;
    if (panel.contains(target) || openBtn.contains(target)) return;
    closeDrawer();
  });
  window.addEventListener("keydown", (ev) => {
    if (ev.key === "Escape") closeDrawer();
  });

  // Open by default on desktop; keep collapsed on mobile.
  if (window.matchMedia("(min-width: 981px)").matches) openDrawer();
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

async function buildSearchIndex(pages, faqs, errata, rules, cards = []) {
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
      kind: "Rule",
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

  for (const item of asItems(cards)) {
    docs.push({
      kind: "Card",
      title: item.name || item.publicCode || "Untitled card",
      href: route("cards/"),
      text: markdownToPlain(
        [
          item.name,
          item.publicCode,
          item.set,
          asItems(item.cardTypes).join(" "),
          asItems(item.superTypes).join(" "),
          asItems(item.domains).join(" "),
          asItems(item.tags).join(" "),
          item.rarity,
          item.abilityText,
        ]
          .filter(Boolean)
          .join("\n")
      ),
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

  const docs = await buildSearchIndex(data.pages, data.faqs, data.errata, data.rules, data.cards);
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

  const headings = Array.from(content.querySelectorAll("h2, h3, h4")).filter((el) =>
    isUsefulTocHeading(el.textContent)
  );
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
  bindTocHighlights(toc);
}

async function initHome() {
  const pages = await getJson("data/pages.json", []);
  const faqs = await getJson("data/faqs.json", []);
  const errata = await getJson("data/errata.json", []);
  const cardsRaw = await getJson("data/cards.json", { cards: [] });
  const cards = normalizeCardsData(cardsRaw);
  const rulesIndex = await getJson("content/rules/index.json", { rules: [] });
  const rules = normalizeRuleIndex(rulesIndex);

  const statsFaq = q("#stats-faq");
  const statsErrata = q("#stats-errata");
  const statsRules = q("#stats-rules");
  const statsCards = q("#stats-cards");
  const statsUpdate = q("#stats-update");
  if (statsFaq) statsFaq.textContent = asItems(faqs).length;
  if (statsErrata) statsErrata.textContent = asItems(errata).length;
  if (statsRules) statsRules.textContent = asItems(rules).length;
  if (statsCards) statsCards.textContent = asItems(cards).length;
  if (statsUpdate) statsUpdate.textContent = today();

  renderFaq(sortByPublishedThenUpdated(faqs).slice(0, 2), q("#home-faq"), { compact: true });
  renderErrata(sortByPublishedThenUpdated(errata).slice(0, 2), q("#home-errata"), { compact: true });
  renderRules(sortByPublishedThenUpdated(rules).slice(0, 3), q("#home-rules"));
  bindPageCards(q("#home-faq"));
  bindPageCards(q("#home-errata"));
  bindPageCards(q("#home-rules"));
  bindPageCards(q(".hero .grid"));
  initHomeSearch({ pages, faqs, errata, rules, cards });
}

async function initFaqPage() {
  const faqs = await getJson("data/faqs.json", []);
  const list = q("#faq-list");
  if (!list) return;
  const render = (order = "desc") => {
    renderFaq(sortByTime(faqs, order), list);
    bindPageCards(list);
  };
  mountTimeSortControls(list, render, "desc");
  render("desc");
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
  let body = String(one.content || "").trim();
  body = normalizeDocumentMarkdown(body, "faq");
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
  if (!list) return;
  const rules = normalizeRuleIndex(local);
  const render = (order = "desc") => {
    renderRules(sortByTime(rules, order), list);
    bindPageCards(list);
  };
  mountTimeSortControls(list, render, "desc");
  render("desc");
}

async function initErrataPage() {
  const errata = await getJson("data/errata.json", []);
  const list = q("#errata-list");
  if (!list) return;
  const render = (order = "desc") => {
    renderErrata(sortByTime(errata, order), list);
    bindPageCards(list);
  };
  mountTimeSortControls(list, render, "desc");
  render("desc");
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

  const body = normalizeDocumentMarkdown(String(one.content || "").trim(), "errata");
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

async function initCardsPage() {
  const raw = await getJson("data/cards.json", { cards: [] });
  const faqs = await getJson("data/faqs.json", []);
  const errata = await getJson("data/errata.json", []);
  const cards = normalizeCardsData(raw);
  const list = q("#cards-list");
  const meta = q("#cards-meta");
  const pager = q("#cards-pager");
  const searchInput = q("#cards-search-input");
  const filterRoot = q("#cards-filters");
  const filterToggle = q("#cards-filter-toggle");
  const filterBody = q("#cards-filter-body");
  const sortKeySelect = q("#cards-sort-key");
  const sortDirBtn = q("#cards-sort-dir");
  const domainWrap = q("#cards-domain-icons");
  const setToggle = q("#cards-set-toggle");
  const setLabel = q("#cards-set-label");
  const setMenu = q("#cards-set-menu");
  const typeToggle = q("#cards-type-toggle");
  const typeLabel = q("#cards-type-label");
  const typeMenu = q("#cards-type-menu");
  const supertypeToggle = q("#cards-supertype-toggle");
  const supertypeLabel = q("#cards-supertype-label");
  const supertypeMenu = q("#cards-supertype-menu");
  const variantToggle = q("#cards-variant-toggle");
  const variantLabel = q("#cards-variant-label");
  const variantMenu = q("#cards-variant-menu");
  const rarityToggle = q("#cards-rarity-toggle");
  const rarityLabel = q("#cards-rarity-label");
  const rarityMenu = q("#cards-rarity-menu");
  const energyMin = q("#cards-energy-min");
  const energyMax = q("#cards-energy-max");
  const powerMin = q("#cards-power-min");
  const powerMax = q("#cards-power-max");
  const mightMin = q("#cards-might-min");
  const mightMax = q("#cards-might-max");
  const energyValue = q("#cards-energy-value");
  const powerValue = q("#cards-power-value");
  const mightValue = q("#cards-might-value");
  const modal = q("#cards-modal");
  const modalClose = q("#cards-modal-close");
  const modalImage = q("#cards-modal-image");
  const modalTitle = q("#cards-modal-title");
  const modalMeta = q("#cards-modal-meta");
  const modalStats = q("#cards-modal-stats");
  const modalTags = q("#cards-modal-tags");
  const modalText = q("#cards-modal-text");
  const modalFaqWrap = q("#cards-modal-faq-wrap");
  const modalFaqList = q("#cards-modal-faq-list");
  const modalErrataWrap = q("#cards-modal-errata-wrap");
  const modalErrataList = q("#cards-modal-errata-list");
  if (
    !list ||
    !meta ||
    !pager ||
    !searchInput ||
    !filterRoot ||
    !filterToggle ||
    !filterBody ||
    !sortKeySelect ||
    !sortDirBtn ||
    !domainWrap ||
    !setToggle ||
    !setLabel ||
    !setMenu ||
    !typeToggle ||
    !typeLabel ||
    !typeMenu ||
    !supertypeToggle ||
    !supertypeLabel ||
    !supertypeMenu ||
    !variantToggle ||
    !variantLabel ||
    !variantMenu ||
    !rarityToggle ||
    !rarityLabel ||
    !rarityMenu ||
    !energyMin ||
    !energyMax ||
    !powerMin ||
    !powerMax ||
    !mightMin ||
    !mightMax ||
    !energyValue ||
    !powerValue ||
    !mightValue ||
    !modal ||
    !modalClose ||
    !modalImage ||
    !modalTitle ||
    !modalMeta ||
    !modalStats ||
    !modalTags ||
    !modalText ||
    !modalFaqWrap ||
    !modalFaqList ||
    !modalErrataWrap ||
    !modalErrataList
  ) {
    return;
  }

  const unique = (arr) =>
    Array.from(new Set(arr.map((x) => String(x || "").trim()).filter(Boolean))).sort((a, b) =>
      a.localeCompare(b)
    );
  const sets = unique(cards.map((x) => x.set));
  const types = Array.from(
    new Set(cards.flatMap((x) => asItems(x.cardTypes)).map((x) => String(x || "").trim()).filter(Boolean))
  ).sort((a, b) => a.localeCompare(b));
  const supertypes = Array.from(
    new Set(cards.flatMap((x) => asItems(x.superTypes)).map((x) => String(x || "").trim()).filter(Boolean))
  ).sort((a, b) => a.localeCompare(b));
  const variantOptions = ["Standard", "Foil", "Alt Art", "Overnumber", "Signed", "Promo"];
  const rarities = unique(cards.map((x) => x.rarity));
  const allDomains = unique(cards.flatMap((x) => asItems(x.domains)));
  const domainOrder = ["Fury", "Calm", "Mind", "Body", "Chaos", "Order"];

  const numberRange = (rows) => {
    const nums = rows.map((x) => Number(x)).filter(Number.isFinite);
    if (!nums.length) return { min: 0, max: 0 };
    return { min: Math.min(...nums), max: Math.max(...nums) };
  };
  const limits = {
    energy: numberRange(cards.map((c) => c.energy)),
    power: numberRange(cards.map((c) => c.power)),
    might: numberRange(cards.map((c) => c.might)),
  };

  const state = {
    query: "",
    sortKey: "card",
    sortDir: "asc",
    sets: new Set(),
    types: new Set(),
    supertypes: new Set(),
    variants: new Set(),
    rarities: new Set(),
    domains: new Set(),
    ranges: {
      energy: { ...limits.energy },
      power: { ...limits.power },
      might: { ...limits.might },
    },
    page: 1,
  };

  const rarityRank = {
    common: 1,
    uncommon: 2,
    rare: 3,
    epic: 4,
    legendary: 5,
    showcase: 6,
  };

  const domainIcons = {
    Body: route("assets/img/domains/body.webp"),
    Calm: route("assets/img/domains/calm.webp"),
    Mind: route("assets/img/domains/mind.webp"),
    Order: route("assets/img/domains/order.webp"),
    Chaos: route("assets/img/domains/chaos.webp"),
    Fury: route("assets/img/domains/fury.webp"),
  };
  sortKeySelect.value = state.sortKey;
  sortDirBtn.textContent = "Asc";

  const buildDomainButtons = () => {
    const ordered = domainOrder.filter((x) => allDomains.includes(x));
    domainWrap.innerHTML = ordered
      .map((domain) => {
        const icon = domainIcons[domain] || "";
        return `<button type="button" class="cards-domain-btn" data-domain="${escapeHtml(
          domain
        )}" title="${escapeHtml(domain)}" aria-label="Filter ${escapeHtml(domain)}"><img src="${escapeHtml(
          icon
        )}" alt="${escapeHtml(domain)} domain icon" loading="lazy" /></button>`;
      })
      .join("");
    domainWrap.querySelectorAll(".cards-domain-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const domain = btn.getAttribute("data-domain") || "";
        if (!domain) return;
        if (state.domains.has(domain)) state.domains.delete(domain);
        else state.domains.add(domain);
        paintDomainButtons();
        render(1);
      });
    });
  };
  const paintDomainButtons = () => {
    domainWrap.querySelectorAll(".cards-domain-btn").forEach((btn) => {
      const domain = btn.getAttribute("data-domain") || "";
      btn.classList.toggle("active", state.domains.has(domain));
    });
  };

  const multiMenus = [];
  const closeMultiMenus = (except = null) => {
    multiMenus.forEach((m) => {
      if (except && m === except) return;
      m.hidden = true;
    });
    [
      setToggle,
      typeToggle,
      supertypeToggle,
      variantToggle,
      rarityToggle,
    ].forEach((btn) => {
      if (btn) btn.setAttribute("aria-expanded", "false");
    });
  };

  const bindMultiFilter = ({ toggle, label, menu, options, selected }) => {
    multiMenus.push(menu);
    const updateLabel = () => {
      if (!selected.size) {
        label.textContent = "All";
        return;
      }
      if (selected.size === 1) {
        label.textContent = Array.from(selected)[0];
        return;
      }
      label.textContent = `${selected.size} selected`;
    };
    const renderMenu = () => {
      menu.innerHTML = options
        .map(
          (name) => `
        <label class="cards-multi-item">
          <input type="checkbox" value="${escapeHtml(name)}" ${selected.has(name) ? "checked" : ""} />
          <span>${escapeHtml(name)}</span>
        </label>
      `
        )
        .join("");
      menu.querySelectorAll('input[type="checkbox"]').forEach((input) => {
        input.addEventListener("change", () => {
          const name = input.value;
          if (input.checked) selected.add(name);
          else selected.delete(name);
          updateLabel();
          render(1);
        });
      });
    };
    toggle.addEventListener("click", () => {
      const willOpen = menu.hidden;
      closeMultiMenus(menu);
      menu.hidden = !willOpen;
      toggle.setAttribute("aria-expanded", willOpen ? "true" : "false");
    });
    updateLabel();
    renderMenu();
  };

  const getCardVariantSet = (card) => {
    const bag = new Set();
    const text = markdownToPlain(
      [card.variant, card.variantName, asItems(card.tags).join(" ")]
        .filter(Boolean)
        .join(" ")
    ).toLowerCase();
    if (/\bfoil\b/.test(text)) bag.add("Foil");
    if (/\balt\s*art\b|\balternate\s*art\b|\baltart\b/.test(text)) bag.add("Alt Art");
    if (/\bovernumber\b|\bover-number\b|\bserialized\b/.test(text)) bag.add("Overnumber");
    if (/\bsigned\b|\bautograph\b/.test(text)) bag.add("Signed");
    if (/\bpromo\b/.test(text)) bag.add("Promo");
    if (/\bstandard\b/.test(text) || bag.size === 0) bag.add("Standard");
    return bag;
  };

  const findRelatedDocs = (docs, cardName) => {
    const full = String(cardName || "").trim();
    if (!full) return [];
    const base = full.split(",")[0].trim();
    const needles = Array.from(new Set([full, base].filter(Boolean).map((x) => x.toLowerCase())));
    const toHay = (doc) => markdownToPlain([doc.title, doc.summary, doc.content].filter(Boolean).join("\n"));

    const pickMatchedSnippets = (doc) => {
      const body = markdownToPlain(String(doc.content || doc.summary || ""));
      const chunks = body
        .split(/\n+|(?<=[.!?])\s+/)
        .map((x) => x.trim())
        .filter(Boolean);
      const hits = [];
      let firstNeedle = "";
      for (const chunk of chunks) {
        const low = chunk.toLowerCase();
        const matched = needles.find((n) => low.includes(n));
        if (!matched) continue;
        if (!firstNeedle) firstNeedle = matched;
        const clipped = chunk.length > 180 ? `${chunk.slice(0, 180).trim()}...` : chunk;
        hits.push(escapeHtml(clipped));
        if (hits.length >= 2) break;
      }
      if (hits.length) return { snippet: hits.join(" ... "), query: firstNeedle || needles[0] || "" };
      const fallback = body.slice(0, 180).trim();
      return { snippet: escapeHtml(fallback) + (body.length > 180 ? "..." : ""), query: needles[0] || "" };
    };

    return asItems(docs)
      .map((doc) => {
        const hay = toHay(doc);
        const lower = hay.toLowerCase();
        const matched = needles.some((n) => lower.includes(n));
        if (!matched) return null;
        const picked = pickMatchedSnippets(doc);
        return {
          id: doc.id || "",
          title: doc.title || "Untitled",
          snippet: picked.snippet,
          query: picked.query,
        };
      })
      .filter(Boolean)
      .slice(0, 4);
  };

  const renderRelatedDocs = (rows, wrap, listEl, kind) => {
    if (!rows.length) {
      wrap.hidden = true;
      listEl.innerHTML = "";
      return;
    }
    wrap.hidden = false;
    const toHref = (id, query) => {
      const baseHref =
        kind === "faq"
          ? route(`faq-detail/?id=${encodeURIComponent(id)}`)
          : route(`errata-detail/?id=${encodeURIComponent(id)}`);
      return withQuery(baseHref, "q", query || "");
    };
    listEl.innerHTML = rows
      .map(
        (x) => `
      <article class="cards-related-item">
        <h4><a href="${toHref(x.id, x.query)}">${escapeHtml(x.title)}</a></h4>
        <p class="muted">${x.snippet}</p>
      </article>
    `
      )
      .join("");
  };

  const setupRange = (name, minInput, maxInput, valueEl, range) => {
    minInput.min = String(range.min);
    minInput.max = String(range.max);
    minInput.value = String(range.min);
    maxInput.min = String(range.min);
    maxInput.max = String(range.max);
    maxInput.value = String(range.max);
    const sync = (from) => {
      let minVal = Number(minInput.value);
      let maxVal = Number(maxInput.value);
      if (from === "min" && minVal > maxVal) {
        maxVal = minVal;
        maxInput.value = String(maxVal);
      }
      if (from === "max" && maxVal < minVal) {
        minVal = maxVal;
        minInput.value = String(minVal);
      }
      state.ranges[name] = { min: minVal, max: maxVal };
      const isAny = minVal === range.min && maxVal === range.max;
      valueEl.textContent = isAny ? "Any" : `${minVal}-${maxVal}`;
      render(1);
    };
    minInput.addEventListener("input", () => sync("min"));
    maxInput.addEventListener("input", () => sync("max"));
    valueEl.textContent = "Any";
  };
  setupRange("energy", energyMin, energyMax, energyValue, limits.energy);
  setupRange("power", powerMin, powerMax, powerValue, limits.power);
  setupRange("might", mightMin, mightMax, mightValue, limits.might);
  buildDomainButtons();
  paintDomainButtons();

  const toInt = (v) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : Number.NaN;
  };

  const getSorted = (rows) => {
    const listRows = [...rows];
    const dir = state.sortDir === "desc" ? -1 : 1;
    listRows.sort((a, b) => {
      const collectorCmp = (toInt(a.collectorNumber) || 0) - (toInt(b.collectorNumber) || 0);
      const nameCmp = String(a.name || "").localeCompare(String(b.name || ""));
      const rarityCmp =
        (rarityRank[String(a.rarity || "").toLowerCase()] || 99) -
        (rarityRank[String(b.rarity || "").toLowerCase()] || 99);
      const mightCmp = (toInt(a.might) || 0) - (toInt(b.might) || 0);
      let cmp = collectorCmp || nameCmp;
      if (state.sortKey === "rarity") cmp = rarityCmp || nameCmp;
      else if (state.sortKey === "might") cmp = mightCmp || nameCmp;
      else if (state.sortKey === "name") cmp = nameCmp;
      return cmp * dir;
    });
    return listRows;
  };

  const inNumberRange = (value, range, limitsForValue) => {
    const isAny = range.min === limitsForValue.min && range.max === limitsForValue.max;
    const n = Number(value);
    if (!Number.isFinite(n)) return isAny;
    return n >= range.min && n <= range.max;
  };

  const matchesDomains = (cardDomains) => {
    if (!state.domains.size) return true;
    const row = new Set(asItems(cardDomains).map((x) => String(x)));
    for (const x of state.domains) {
      if (row.has(x)) return true;
    }
    return false;
  };

  const matchesAnySelected = (values, selected) => {
    if (!selected.size) return true;
    const row = new Set(asItems(values).map((x) => String(x)));
    for (const value of selected) {
      if (row.has(String(value))) return true;
    }
    return false;
  };

  const filtered = () => {
    const term = markdownToPlain(state.query).toLowerCase();
    return getSorted(
      cards.filter((c) => {
        if (!matchesAnySelected([String(c.set || "")], state.sets)) return false;
        if (!matchesAnySelected(asItems(c.cardTypes), state.types)) return false;
        if (!matchesAnySelected(asItems(c.superTypes), state.supertypes)) return false;
        if (!matchesAnySelected(Array.from(getCardVariantSet(c)), state.variants)) return false;
        if (!matchesAnySelected([String(c.rarity || "")], state.rarities)) return false;
        if (!matchesDomains(c.domains)) return false;
        if (!inNumberRange(c.energy, state.ranges.energy, limits.energy)) return false;
        if (!inNumberRange(c.power, state.ranges.power, limits.power)) return false;
        if (!inNumberRange(c.might, state.ranges.might, limits.might)) return false;
        if (!term) return true;
        const hay = markdownToPlain(
          [
            c.name,
            c.publicCode,
            c.set,
            c.rarity,
            asItems(c.cardTypes).join(" "),
            asItems(c.superTypes).join(" "),
            asItems(c.domains).join(" "),
            asItems(c.tags).join(" "),
            c.abilityText,
          ]
            .filter(Boolean)
            .join("\n")
        ).toLowerCase();
        return term.split(/\s+/).filter(Boolean).every((t) => hay.includes(t));
      })
    );
  };

  const pageSize = 24;

  const openCardModal = (cardId) => {
    const card = cards.find((c) => String(c.id) === String(cardId));
    if (!card) return;
    modalImage.src = card.imageUrl || "";
    modalImage.alt = card.imageAlt || card.name || "Card image";
    modalTitle.textContent = card.name || "Untitled card";
    modalMeta.textContent = `${card.publicCode || "-"} | ${card.set || "-"} | ${card.rarity || "-"}`;
    modalStats.textContent = `Type: ${asItems(card.cardTypes).join(", ") || "-"} | Domain: ${
      asItems(card.domains).join(", ") || "-"
    } | Energy: ${card.energy || "-"} | Might: ${card.might || "-"} | Power: ${card.power || "-"}`;
    modalTags.textContent = asItems(card.tags).length ? `Tags: ${asItems(card.tags).join(", ")}` : "";
    modalText.innerHTML = renderCardAbilityText(card.abilityText);
    const relatedFaq = findRelatedDocs(faqs, card.name);
    const relatedErrata = findRelatedDocs(errata, card.name);
    renderRelatedDocs(relatedFaq, modalFaqWrap, modalFaqList, "faq");
    renderRelatedDocs(relatedErrata, modalErrataWrap, modalErrataList, "errata");
    modal.hidden = false;
    document.body.classList.add("modal-open");
  };

  const closeCardModal = () => {
    modal.hidden = true;
    document.body.classList.remove("modal-open");
  };

  const bindCardClicks = () => {
    list.querySelectorAll(".card-item[data-card-id]").forEach((cardEl) => {
      const open = () => openCardModal(cardEl.getAttribute("data-card-id") || "");
      cardEl.addEventListener("click", open);
      cardEl.addEventListener("keydown", (ev) => {
        if (ev.key === "Enter" || ev.key === " ") {
          ev.preventDefault();
          open();
        }
      });
    });
  };

  const render = (page = 1) => {
    const rows = filtered();
    const pageCount = Math.max(1, Math.ceil(rows.length / pageSize));
    state.page = Math.min(Math.max(1, page), pageCount);
    const start = (state.page - 1) * pageSize;
    const view = rows.slice(start, start + pageSize);
    renderCards(view, list);
    bindCardClicks();
    meta.textContent = `${rows.length} card(s) | Page ${state.page}/${pageCount} | Source: ${
      raw.source || "Riftbound Official"
    }`;
    renderSearchPager(rows.length, state.page, pageSize, pager, (p) => render(p));
  };

  bindMultiFilter({
    toggle: setToggle,
    label: setLabel,
    menu: setMenu,
    options: sets,
    selected: state.sets,
  });
  bindMultiFilter({
    toggle: typeToggle,
    label: typeLabel,
    menu: typeMenu,
    options: types,
    selected: state.types,
  });
  bindMultiFilter({
    toggle: supertypeToggle,
    label: supertypeLabel,
    menu: supertypeMenu,
    options: supertypes,
    selected: state.supertypes,
  });
  bindMultiFilter({
    toggle: variantToggle,
    label: variantLabel,
    menu: variantMenu,
    options: variantOptions,
    selected: state.variants,
  });
  bindMultiFilter({
    toggle: rarityToggle,
    label: rarityLabel,
    menu: rarityMenu,
    options: rarities,
    selected: state.rarities,
  });
  sortKeySelect.addEventListener("change", () => {
    state.sortKey = sortKeySelect.value || "card";
    render(1);
  });
  sortDirBtn.addEventListener("click", () => {
    state.sortDir = state.sortDir === "asc" ? "desc" : "asc";
    sortDirBtn.textContent = state.sortDir === "asc" ? "Asc" : "Desc";
    render(1);
  });

  filterToggle.addEventListener("click", () => {
    filterRoot.classList.toggle("collapsed");
    filterBody.hidden = filterRoot.classList.contains("collapsed");
    filterToggle.textContent = filterRoot.classList.contains("collapsed") ? "Show" : "Hide";
  });

  searchInput.addEventListener("input", () => {
    state.query = searchInput.value || "";
    render(1);
  });
  searchInput.addEventListener("keydown", (ev) => {
    if (ev.key === "/") {
      ev.preventDefault();
      setToggle.focus();
    }
    if (ev.key === "Enter") {
      state.query = searchInput.value || "";
      render(1);
    }
  });

  modalClose.addEventListener("click", closeCardModal);
  modal.addEventListener("click", (ev) => {
    const t = ev.target;
    if (t && t.closest && t.closest("[data-cards-close='1']")) closeCardModal();
  });
  document.addEventListener("click", (ev) => {
    const t = ev.target;
    if (t && t.closest && t.closest(".cards-multi")) return;
    closeMultiMenus();
  });
  document.addEventListener("keydown", (ev) => {
    if (ev.key === "Escape") closeMultiMenus();
    if (ev.key === "Escape" && !modal.hidden) closeCardModal();
  });

  render(1);
}

function initReader() {
  const keys = {
    lastSrc: "rb_reader_last_src",
    lastPage: "rb_reader_last_page",
    bookmarks: "rb_reader_bookmarks_v1",
    immersive: "rb_reader_immersive",
  };
  const params = new URLSearchParams(window.location.search);
  const lastSrc = localStorage.getItem(keys.lastSrc) || "";
  const src = params.get("src") || lastSrc;
  if (!src) {
    q("#reader-wrap").innerHTML =
      '<p class="muted">Open from the Rules page or use ?src=PDF_URL.</p>';
    return;
  }

  const fallbackLink = q("#reader-fallback");
  const title = decodeURIComponent(src).split("/").pop() || "PDF Reader";
  q("#reader-title").textContent = title;
  localStorage.setItem(keys.lastSrc, src);

  const readBookmarks = () => {
    try {
      const raw = localStorage.getItem(keys.bookmarks);
      const rows = raw ? JSON.parse(raw) : [];
      return Array.isArray(rows) ? rows : [];
    } catch {
      return [];
    }
  };
  const saveBookmarks = (rows) => {
    localStorage.setItem(keys.bookmarks, JSON.stringify(rows));
  };
  const buildReaderHref = (page) => route(`reader/?src=${encodeURIComponent(src)}&page=${page}`);
  const srcWithPage = (page) => {
    const base = String(src).split("#")[0];
    return `${base}#page=${page}`;
  };
  const getStoredPage = () => Number(localStorage.getItem(`${keys.lastPage}:${src}`) || 1);
  const pageFromUrl = Number(params.get("page") || 0);
  let currentPage = Number.isFinite(pageFromUrl) && pageFromUrl > 0 ? pageFromUrl : getStoredPage();
  if (!Number.isFinite(currentPage) || currentPage <= 0) currentPage = 1;

  const pageInput = q("#reader-page");
  const goBtn = q("#reader-go");
  const retryBtn = q("#reader-retry");
  const shareBtn = q("#reader-share");
  const addBookmarkBtn = q("#reader-bookmark-add");
  const immersiveBtn = q("#reader-immersive");
  const meta = q("#reader-meta");
  const frame = q("#pdf-view");
  const bookmarkList = q("#reader-bookmarks");
  const searchInput = q("#reader-search-input");
  const searchBtn = q("#reader-search-btn");
  const searchMeta = q("#reader-search-meta");
  const searchResults = q("#reader-search-results");

  const updateUrl = (page) => {
    const next = new URL(window.location.href);
    next.searchParams.set("src", src);
    next.searchParams.set("page", String(page));
    window.history.replaceState({}, "", next.pathname + next.search);
  };
  const renderBookmarks = () => {
    if (!bookmarkList) return;
    const rows = readBookmarks()
      .filter((x) => x && x.src === src)
      .sort((a, b) => Number(a.page) - Number(b.page));
    if (!rows.length) {
      bookmarkList.innerHTML = '<article class="item"><p class="muted">No bookmarks yet.</p></article>';
      return;
    }
    bookmarkList.innerHTML = rows
      .map(
        (x, idx) => `
      <article class="item">
        <h3 style="margin: 0 0 6px">Page ${Number(x.page)}</h3>
        <p class="muted" style="margin: 0">${x.createdAt || ""}</p>
        <div class="toolbar" style="margin-top: 8px">
          <button type="button" class="secondary" data-bm-open="${idx}">Open</button>
          <button type="button" class="secondary" data-bm-del="${idx}">Delete</button>
        </div>
      </article>
    `
      )
      .join("");
    bookmarkList.querySelectorAll("[data-bm-open]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const rowsNow = readBookmarks().filter((x) => x && x.src === src);
        const one = rowsNow[Number(btn.getAttribute("data-bm-open"))];
        if (one) loadPage(Number(one.page) || 1);
      });
    });
    bookmarkList.querySelectorAll("[data-bm-del]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const filtered = readBookmarks();
        const scoped = filtered.filter((x) => x && x.src === src);
        const one = scoped[Number(btn.getAttribute("data-bm-del"))];
        if (!one) return;
        saveBookmarks(
          filtered.filter(
            (x) => !(x && x.src === one.src && Number(x.page) === Number(one.page) && x.createdAt === one.createdAt)
          )
        );
        renderBookmarks();
      });
    });
  };
  const loadPage = (page) => {
    const safe = Number.isFinite(page) && page > 0 ? Math.floor(page) : 1;
    currentPage = safe;
    if (pageInput) pageInput.value = String(safe);
    if (frame) frame.src = srcWithPage(safe);
    localStorage.setItem(`${keys.lastPage}:${src}`, String(safe));
    updateUrl(safe);
    if (meta) meta.textContent = `Reading page ${safe}. Progress saved automatically.`;
  };

  if (fallbackLink) fallbackLink.href = route("rules/");
  if (pageInput) pageInput.value = String(currentPage);
  loadPage(currentPage);
  renderBookmarks();

  if (goBtn) {
    goBtn.addEventListener("click", () => {
      const v = Number(pageInput?.value || 1);
      loadPage(v);
    });
  }
  if (pageInput) {
    pageInput.addEventListener("keydown", (ev) => {
      if (ev.key === "Enter") loadPage(Number(pageInput.value || 1));
    });
  }
  if (retryBtn) {
    retryBtn.addEventListener("click", () => loadPage(currentPage));
  }
  if (shareBtn) {
    shareBtn.addEventListener("click", async () => {
      const href = new URL(buildReaderHref(currentPage), window.location.origin).toString();
      try {
        await navigator.clipboard.writeText(href);
        if (meta) meta.textContent = "Share link copied.";
      } catch {
        if (meta) meta.textContent = `Share link: ${href}`;
      }
    });
  }
  if (addBookmarkBtn) {
    addBookmarkBtn.addEventListener("click", () => {
      const rows = readBookmarks();
      const one = {
        src,
        page: currentPage,
        createdAt: new Date().toISOString().slice(0, 16).replace("T", " "),
      };
      rows.push(one);
      saveBookmarks(rows);
      renderBookmarks();
      if (meta) meta.textContent = `Bookmarked page ${currentPage}.`;
    });
  }

  const applyImmersive = () => {
    const on = localStorage.getItem(keys.immersive) === "1";
    document.body.classList.toggle("reader-immersive", on);
    if (immersiveBtn) immersiveBtn.textContent = on ? "Exit Immersive" : "Immersive";
  };
  applyImmersive();
  if (immersiveBtn) {
    immersiveBtn.addEventListener("click", () => {
      const next = localStorage.getItem(keys.immersive) === "1" ? "0" : "1";
      localStorage.setItem(keys.immersive, next);
      applyImmersive();
    });
  }

  const runSearch = async () => {
    const query = String(searchInput?.value || "").trim();
    if (!query) {
      if (searchMeta) searchMeta.textContent = "Type a keyword to search rule content.";
      if (searchResults) searchResults.innerHTML = "";
      return;
    }
    const pages = await getJson("data/pages.json", []);
    const faqs = await getJson("data/faqs.json", []);
    const errata = await getJson("data/errata.json", []);
    const rulesIndex = await getJson("content/rules/index.json", { rules: [] });
    const rules = normalizeRuleIndex(rulesIndex);
    const cardsRaw = await getJson("data/cards.json", { cards: [] });
    const cards = normalizeCardsData(cardsRaw);
    const docs = await buildSearchIndex(pages, faqs, errata, rules, cards);
    const hits = searchDocs(query, docs, { kind: "Rule", mode: "hits" }).slice(0, 20);
    if (searchMeta) searchMeta.textContent = `${hits.length} rule hit(s) for "${query}".`;
    if (!searchResults) return;
    if (!hits.length) {
      searchResults.innerHTML = '<article class="item"><p class="muted">No matches in rules.</p></article>';
      return;
    }
    searchResults.innerHTML = hits
      .map(
        (r) => `
      <article class="item search-result">
        <h3 style="margin:0 0 6px"><a href="${withQuery(r.href, "q", query)}">${escapeHtml(r.title)}</a></h3>
        <p class="result-snippet">${r.snippet || ""}</p>
      </article>
    `
      )
      .join("");
  };
  if (searchBtn) searchBtn.addEventListener("click", runSearch);
  if (searchInput) {
    searchInput.addEventListener("keydown", (ev) => {
      if (ev.key === "Enter") runSearch();
    });
  }
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
    const normalized = md.includes('<div class="rule-sheet">') ? md : normalizeDocumentMarkdown(md, "page");
    if (window.marked && typeof window.marked.parse === "function") {
      q("#page-content").innerHTML = window.marked.parse(normalized);
    } else {
      q("#page-content").innerHTML = `<pre>${normalized}</pre>`;
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
    ...asItems(pages)
      .filter((x) => asItems(rules).some((r) => String(r.pageId || r.id) === String(x.id || "")))
      .map((x) => ({
        kind: "Rule",
        title: x.title || "Untitled rule page",
        updatedAt: x.updatedAt,
        href: route(`pages/?id=${encodeURIComponent(x.id || "")}`),
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
  initCardsPage,
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














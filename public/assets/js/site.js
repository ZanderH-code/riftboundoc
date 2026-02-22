const q = (selector) => document.querySelector(selector);
const today = () => new Date().toISOString().slice(0, 10);
const SITE_VERSION = "2026.02.20.22";
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

function normalizeSearchText(value) {
  return String(value || "")
    .normalize("NFKC")
    .replace(/[’‘`´]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
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

function normalizeDatasetItems(payload, key = "items") {
  if (Array.isArray(payload)) return payload;
  if (!payload || typeof payload !== "object") return [];
  if (Array.isArray(payload[key])) return payload[key];
  return [];
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
  const decodeEntities = (value) => {
    const el = document.createElement("textarea");
    el.innerHTML = String(value || "");
    return el.value;
  };

  return decodeEntities(String(text || ""))
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|li|h\d|tr|section|article)>/gi, "\n")
    .replace(/<li[^>]*>/gi, "- ")
    .replace(/<[^>]+>/g, " ")
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

function flashQueryTarget(el) {
  if (!el) return;
  const kick = () => {
    el.classList.remove("query-focus");
    // Force reflow so repeated jumps retrigger animation.
    void el.offsetWidth;
    el.classList.add("query-focus");
    window.setTimeout(() => el.classList.remove("query-focus"), 8000);
  };
  // Delay slightly so highlight starts when smooth scrolling is near target.
  window.setTimeout(kick, 220);
}

function extractRuleId(text) {
  const plain = markdownToPlain(String(text || ""));
  const m = plain.match(/(^|\s)(\d+(?:\.[0-9a-z]+)*\.?)(?=\s|$)/i);
  return m ? String(m[2] || "").trim() : "";
}

function normalizeRuleToken(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\.+$/, "")
    .replace(/[^0-9a-z.]+/g, "");
}

function ruleTokenToAnchorId(value) {
  const token = normalizeRuleToken(value);
  if (!token) return "";
  return `rule-${token.replace(/\./g, "-")}`;
}

function tagRuleRowsForAnchors(containerSelector) {
  const container = q(containerSelector);
  if (!container) return;
  const rows = Array.from(container.querySelectorAll(".rule-row"));
  for (const row of rows) {
    const idCell = row.querySelector(".rule-id");
    const token = normalizeRuleToken(idCell ? idCell.textContent : "");
    if (!token) continue;
    row.setAttribute("data-rule-id", token);
    if (!row.id) row.id = ruleTokenToAnchorId(token);
  }
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
  const headings = Array.from(content.querySelectorAll("h1, h2, h3, h4")).filter((el) =>
    isUsefulTocHeading(el.textContent)
  );
  if (!headings.length) {
    toc.innerHTML = '<div class="toc-title">Contents</div><p class="muted">No sections found.</p>';
    return;
  }
  let html = '<div class="toc-title">Contents</div>';
  headings.forEach((el, idx) => {
    if (!el.id) el.id = `${slugify(el.textContent) || "section"}-${idx + 1}`;
    const level = Number(el.tagName.slice(1));
    const cls = level <= 2 ? "toc-l2" : level === 3 ? "toc-l3" : "toc-l4";
    html += `<a href=\"#${el.id}\" class="toc-link ${cls}">${escapeHtml(el.textContent)}</a>`;
  });
  toc.innerHTML = html;
  bindTocHighlights(toc);
}

function highlightQueryIn(containerSelector) {
  const container = q(containerSelector);
  if (!container) return;
  const params = new URLSearchParams(window.location.search);
  const term = params.get("q");
  const relQuery = markdownToPlain(params.get("rq"));
  const relHeading = markdownToPlain(params.get("rh"));
  const relRuleId = String(params.get("rr") || "").trim();
  const derivedRuleId = extractRuleId(params.get("rq") || params.get("q") || "");
  const effectiveRuleId = relRuleId || derivedRuleId;
  const relIndex = Math.max(1, Number.parseInt(params.get("ri") || "1", 10) || 1);
  const needle = markdownToPlain(term);
  const removeRevisedSuffix = (text) =>
    normalizeSearchText(text).replace(/\s*\(revised text\)\s*$/i, "").trim();
  const toCore = (text) => normalizeSearchText(text).replace(/\s+/g, " ").trim();
  const getBlocks = () =>
    Array.from(container.querySelectorAll("p, li, h1, h2, h3, h4, blockquote, pre, .rule-text, .rule-row"));

  const findHeadingSection = () => {
    if (!relHeading) return null;
    const headingNorm = normalizeSearchText(relHeading);
    const headings = Array.from(container.querySelectorAll("h1, h2, h3, h4"));
    const found =
      headings.find((h) => normalizeSearchText(h.textContent) === headingNorm) ||
      headings.find((h) => removeRevisedSuffix(h.textContent) === removeRevisedSuffix(relHeading));
    if (!found) return null;
    const nodes = [];
    let node = found.nextElementSibling;
    while (node) {
      if (/^H[1-4]$/.test(node.tagName || "")) break;
      nodes.push(node);
      node = node.nextElementSibling;
    }
    return { heading: found, nodes };
  };

  const scrollToPreciseRelated = () => {
    if (effectiveRuleId) {
      const wanted = normalizeRuleToken(effectiveRuleId);
      const rows = Array.from(container.querySelectorAll(".rule-row"));
      const exact = rows.filter((row) => {
        const idCell = row.querySelector(".rule-id");
        return normalizeRuleToken(idCell ? idCell.textContent : "") === wanted;
      });
      if (exact.length) {
        const target = exact[Math.min(relIndex - 1, exact.length - 1)] || exact[0];
        target.scrollIntoView({ behavior: "smooth", block: "center" });
        flashQueryTarget(target);
        return true;
      }
    }

    if (relQuery) {
      const queryNorm = normalizeSearchText(relQuery);
      const blocks = getBlocks();
      const exactTextHits = blocks.filter(
        (el) => normalizeSearchText(el.textContent || "") === queryNorm
      );
      if (exactTextHits.length) {
        const target = exactTextHits[Math.min(relIndex - 1, exactTextHits.length - 1)] || exactTextHits[0];
        target.scrollIntoView({ behavior: "smooth", block: "center" });
        flashQueryTarget(target);
        return true;
      }
    }

    const section = findHeadingSection();
    const queryNorm = normalizeSearchText(relQuery);
    if (section && queryNorm) {
      const pool = [];
      const add = (el) => {
        if (!el || pool.includes(el)) return;
        pool.push(el);
      };
      for (const node of section.nodes) {
        if (node.matches && node.matches("p, li, blockquote, pre, .rule-text, .rule-row")) add(node);
        if (node.querySelectorAll) {
          node.querySelectorAll("p, li, blockquote, pre, .rule-text, .rule-row").forEach(add);
        }
      }
      const hits = pool.filter((el) => {
        const txt = normalizeSearchText(el.textContent || "");
        return txt && txt.includes(queryNorm);
      });
      if (hits.length) {
        const target = hits[Math.min(relIndex - 1, hits.length - 1)] || hits[0];
        target.scrollIntoView({ behavior: "smooth", block: "center" });
        flashQueryTarget(target);
        return true;
      }
    }

    if (!queryNorm && !section) return false;

    let scopedBlocks = getBlocks();
    if (section) {
      const bucket = [];
      const keep = (el) => {
        if (!el || bucket.includes(el)) return;
        bucket.push(el);
      };
      keep(section.heading);
      for (const node of section.nodes) {
        if (node.matches && node.matches("p, li, h1, h2, h3, h4, blockquote, pre, .rule-text, .rule-row")) {
          keep(node);
        }
        if (node.querySelectorAll) {
          node
            .querySelectorAll("p, li, h1, h2, h3, h4, blockquote, pre, .rule-text, .rule-row")
            .forEach(keep);
        }
      }
      if (bucket.length) scopedBlocks = bucket;
    }

    const queryCore = toCore(relQuery);
    const queryTokens = (queryCore || queryNorm).split(/\s+/).filter((t) => t.length >= 2).slice(0, 20);
    const candidateScores = scopedBlocks.map((el) => {
      if (!queryNorm) return { el, score: 1 };
      const t = normalizeSearchText(el.textContent || "");
      const tCore = toCore(el.textContent || "");
      if (!t) return { el, score: 0 };
      if (queryCore && queryCore.length >= 12 && tCore.includes(queryCore)) return { el, score: 2200 };
      if (t.includes(queryNorm)) return { el, score: 1000 };
      let score = 0;
      for (const token of queryTokens) {
        if (tCore.includes(token) || t.includes(token)) score += 1;
      }
      return { el, score };
    });

    const minScore = queryNorm ? Math.max(2, Math.min(6, Math.ceil(queryTokens.length * 0.45))) : 1;
    const exactCandidates = candidateScores.filter((x) => x.score >= minScore).map((x) => x.el);

    if (exactCandidates.length) {
      const target = exactCandidates[Math.min(relIndex - 1, exactCandidates.length - 1)] || exactCandidates[0];
      if (target) {
        target.scrollIntoView({ behavior: "smooth", block: "center" });
        flashQueryTarget(target);
      }
      return Boolean(target);
    }
    const weakCandidates = candidateScores.filter((x) => x.score > 0).map((x) => x.el);
    if (weakCandidates.length) {
      const target = weakCandidates[Math.min(relIndex - 1, weakCandidates.length - 1)] || weakCandidates[0];
      if (target) {
        target.scrollIntoView({ behavior: "smooth", block: "center" });
        flashQueryTarget(target);
      }
      return Boolean(target);
    }
    return false;
  };

  if (scrollToPreciseRelated()) return;
  if (relHeading) {
    const headingNorm = normalizeSearchText(relHeading);
    const headings = Array.from(container.querySelectorAll("h1, h2, h3, h4"));
    const candidates = headings.filter(
      (h) =>
        normalizeSearchText(h.textContent) === headingNorm ||
        removeRevisedSuffix(h.textContent) === removeRevisedSuffix(relHeading)
    );
    if (candidates.length) {
      const target = candidates[Math.min(relIndex - 1, candidates.length - 1)] || candidates[0];
      target.scrollIntoView({ behavior: "smooth", block: "center" });
      flashQueryTarget(target);
      return;
    }
  }
  if (!needle) return;

  const needleNorm = normalizeSearchText(needle);
  if (!needleNorm) return;
  const tokens = needleNorm.split(/\s+/).filter((t) => t.length >= 2).slice(0, 8);
  if (!tokens.length) return;

  const blocks = getBlocks();
  let best = null;
  let bestScore = -1;
  for (const el of blocks) {
    const txt = normalizeSearchText(el.textContent || "");
    if (!txt) continue;
    let score = 0;
    if (txt.includes(needleNorm)) score += 1000;
    for (const token of tokens) {
      if (txt.includes(token)) score += 1;
    }
    if (score > bestScore) {
      bestScore = score;
      best = el;
    }
  }
  if (best && bestScore > 1) {
    best.scrollIntoView({ behavior: "smooth", block: "center" });
    flashQueryTarget(best);
  }
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
    let nextNonEmpty = "";
    for (let j = i + 1; j < lines.length; j += 1) {
      const t = String(lines[j] || "").trim();
      if (!t) continue;
      nextNonEmpty = t;
      break;
    }

    if (!line) {
      out.push("");
      continue;
    }
    if (kind === "page" && /^#\s+\d{3}\./.test(line)) {
      // Keep one document title h1; chapter-like numeric headings are h2.
      out.push(raw.replace(/^#\s+/, "## "));
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
    if (
      kind === "errata" &&
      /^[A-Z][A-Za-z0-9'`",.!?&\- ]{2,70}$/.test(line) &&
      !/^\[/.test(line) &&
      !line.startsWith("#") &&
      /^####\s+\[NEW TEXT\]/i.test(next)
    ) {
      out.push(`### ${line}`);
      continue;
    }
    if (/\(revised text\)$/i.test(line)) {
      out.push(`### ${line}`);
      continue;
    }
    if (
      !prev &&
      nextNonEmpty &&
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
      nextNonEmpty
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

function initReaderPrefs(options = {}) {
  const { onSettle } = options;
  const keys = {
    scale: "rb_reader_scale",
    line: "rb_reader_line",
    width: "rb_reader_width",
  };
  const defaults = {
    scale: 1,
    line: 1.72,
    width: 100,
  };
  const limits = {
    scale: { min: 0.9, max: 1.3, step: 0.05 },
    line: { min: 1.4, max: 2.0, step: 0.05 },
    width: { min: 60, max: 100, step: 5 },
  };
  const root = document.documentElement;
  const clampToStep = (value, min, max, step) => {
    const num = Number.parseFloat(String(value));
    if (!Number.isFinite(num)) return min;
    const bounded = Math.max(min, Math.min(max, num));
    const snapped = Math.round((bounded - min) / step) * step + min;
    return Number(snapped.toFixed(4));
  };
  const parseStored = () => ({
    scale: clampToStep(localStorage.getItem(keys.scale) ?? defaults.scale, limits.scale.min, limits.scale.max, limits.scale.step),
    line: clampToStep(localStorage.getItem(keys.line) ?? defaults.line, limits.line.min, limits.line.max, limits.line.step),
    width: clampToStep(
      String(localStorage.getItem(keys.width) ?? `${defaults.width}%`).replace("%", ""),
      limits.width.min,
      limits.width.max,
      limits.width.step
    ),
  });
  const state = parseStored();
  const presets = {
    compact: { scale: 0.95, line: 1.62, width: 96 },
    balanced: { scale: defaults.scale, line: defaults.line, width: defaults.width },
    comfort: { scale: 1.1, line: 1.85, width: 88 },
  };
  let rafId = 0;
  let nextPaint = null;
  let persistTimer = 0;
  const apply = (values) => {
    root.style.setProperty("--reader-font-scale", String(values.scale));
    root.style.setProperty("--reader-line-height", String(values.line));
    root.style.setProperty("--reader-max-width", `${values.width}%`);
  };
  const queueApply = () => {
    nextPaint = { ...state };
    if (rafId) return;
    rafId = window.requestAnimationFrame(() => {
      rafId = 0;
      if (!nextPaint) return;
      apply(nextPaint);
      nextPaint = null;
    });
  };
  const persist = () => {
    localStorage.setItem(keys.scale, String(state.scale));
    localStorage.setItem(keys.line, String(state.line));
    localStorage.setItem(keys.width, `${state.width}%`);
  };
  const schedulePersist = () => {
    if (persistTimer) window.clearTimeout(persistTimer);
    persistTimer = window.setTimeout(() => {
      persistTimer = 0;
      persist();
    }, 220);
  };
  const flushPersist = () => {
    if (persistTimer) {
      window.clearTimeout(persistTimer);
      persistTimer = 0;
    }
    persist();
  };
  const notifySettled = () => {
    document.dispatchEvent(new CustomEvent("readerprefschange", { detail: { ...state } }));
    if (typeof onSettle === "function") onSettle({ ...state });
  };
  const settle = () => {
    queueApply();
    flushPersist();
    notifySettled();
  };
  apply(state);
  const host = q("#reader-prefs");
  if (!host) return;
  host.innerHTML = `
    <div class="reader-prefs reader-prefs-modern">
      <div class="reader-prefs-presets" role="group" aria-label="Reader presets">
        <button type="button" class="reader-preset-btn" data-preset="compact">Compact</button>
        <button type="button" class="reader-preset-btn" data-preset="balanced">Balanced</button>
        <button type="button" class="reader-preset-btn" data-preset="comfort">Comfort</button>
      </div>
      <label class="reader-pref-control" for="pref-scale">
        <span class="reader-pref-head"><span>Font size</span><strong id="pref-scale-value">100%</strong></span>
        <input id="pref-scale" type="range" min="0.9" max="1.3" step="0.05" value="${state.scale}" />
      </label>
      <label class="reader-pref-control" for="pref-line">
        <span class="reader-pref-head"><span>Line height</span><strong id="pref-line-value">1.72</strong></span>
        <input id="pref-line" type="range" min="1.4" max="2.0" step="0.05" value="${state.line}" />
      </label>
      <label class="reader-pref-control" for="pref-width">
        <span class="reader-pref-head"><span>Content width</span><strong id="pref-width-value">100%</strong></span>
        <input id="pref-width" type="range" min="60" max="100" step="5" value="${state.width}" />
      </label>
      <button id="pref-reset" type="button" class="secondary reader-prefs-reset">Reset</button>
    </div>
  `;
  const scaleInput = q("#pref-scale");
  const lineInput = q("#pref-line");
  const widthInput = q("#pref-width");
  const scaleValue = q("#pref-scale-value");
  const lineValue = q("#pref-line-value");
  const widthValue = q("#pref-width-value");
  const resetBtn = q("#pref-reset");
  const presetButtons = Array.from(host.querySelectorAll(".reader-preset-btn"));
  if (!scaleInput || !lineInput || !widthInput || !scaleValue || !lineValue || !widthValue || !resetBtn) return;

  const updateRangeFill = (input) => {
    const min = Number.parseFloat(input.min) || 0;
    const max = Number.parseFloat(input.max) || 100;
    const value = Number.parseFloat(input.value) || min;
    const pct = max <= min ? 0 : ((value - min) / (max - min)) * 100;
    input.style.setProperty("--range-progress", `${Math.max(0, Math.min(100, pct))}%`);
  };
  const updateLabels = () => {
    scaleValue.textContent = `${Math.round(state.scale * 100)}%`;
    lineValue.textContent = state.line.toFixed(2);
    widthValue.textContent = `${Math.round(state.width)}%`;
  };
  const matchesPreset = (name) => {
    const preset = presets[name];
    if (!preset) return false;
    return (
      Math.abs(preset.scale - state.scale) < 0.001 &&
      Math.abs(preset.line - state.line) < 0.001 &&
      Math.abs(preset.width - state.width) < 0.001
    );
  };
  const updatePresetState = () => {
    presetButtons.forEach((button) => {
      const active = matchesPreset(button.dataset.preset);
      button.classList.toggle("active", active);
      button.setAttribute("aria-pressed", active ? "true" : "false");
    });
  };
  const syncUiFromState = () => {
    scaleInput.value = String(state.scale);
    lineInput.value = String(state.line);
    widthInput.value = String(state.width);
    updateLabels();
    updateRangeFill(scaleInput);
    updateRangeFill(lineInput);
    updateRangeFill(widthInput);
    updatePresetState();
  };
  const readInputsIntoState = () => {
    state.scale = clampToStep(scaleInput.value, limits.scale.min, limits.scale.max, limits.scale.step);
    state.line = clampToStep(lineInput.value, limits.line.min, limits.line.max, limits.line.step);
    state.width = clampToStep(widthInput.value, limits.width.min, limits.width.max, limits.width.step);
  };
  const onInput = () => {
    readInputsIntoState();
    updateLabels();
    updateRangeFill(scaleInput);
    updateRangeFill(lineInput);
    updateRangeFill(widthInput);
    updatePresetState();
    queueApply();
    schedulePersist();
  };

  scaleInput.addEventListener("input", onInput);
  lineInput.addEventListener("input", onInput);
  widthInput.addEventListener("input", onInput);
  scaleInput.addEventListener("change", settle);
  lineInput.addEventListener("change", settle);
  widthInput.addEventListener("change", settle);

  presetButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const preset = presets[button.dataset.preset];
      if (!preset) return;
      state.scale = preset.scale;
      state.line = preset.line;
      state.width = preset.width;
      syncUiFromState();
      settle();
    });
  });
  resetBtn.addEventListener("click", () => {
    state.scale = defaults.scale;
    state.line = defaults.line;
    state.width = defaults.width;
    syncUiFromState();
    settle();
  });
  syncUiFromState();
}

let searchIndexLitePromise = null;

async function getSearchIndexLite() {
  if (searchIndexLitePromise) return searchIndexLitePromise;
  searchIndexLitePromise = (async () => {
    const payload = await getJson("data/search-index-lite.json", null);
    if (!payload || typeof payload !== "object") return null;
    const docs = normalizeDatasetItems(payload, "docs");
    if (!docs.length) return null;
    return docs.map((doc) => ({
      kind: doc.kind || "Rule",
      title: doc.title || "Untitled document",
      href: doc.href ? route(String(doc.href).replace(/^\/+/, "")) : route(String(doc.hrefPath || "")),
      text: String(doc.text || ""),
    }));
  })();
  return searchIndexLitePromise;
}

async function buildSearchIndex(pages, faqs, errata, rules, cards = []) {
  const prebuilt = await getSearchIndexLite();
  if (prebuilt && prebuilt.length) return prebuilt;
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

function buildPageToc() {
  const toc = q("#page-toc");
  const content = q("#page-content");
  if (!toc || !content) return;

  const headings = Array.from(content.querySelectorAll("h1, h2, h3, h4")).filter((el) =>
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
    const cls = level <= 2 ? "toc-l2" : level === 3 ? "toc-l3" : "toc-l4";
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
  if (window.homePage && typeof window.homePage.initHomePage === "function") {
    const initHomeSearch =
      window.searchPage && typeof window.searchPage.initHomeSearch === "function"
        ? (data) =>
            window.searchPage.initHomeSearch(data, {
              q,
              buildSearchIndex,
              searchDocs,
              withQuery,
              escapeHtml,
              renderSearchPager,
            })
        : null;
    return window.homePage.initHomePage({
      q,
      today,
      getJson,
      asItems,
      sortByPublishedThenUpdated,
      renderFaq,
      renderErrata,
      renderRules,
      bindPageCards,
      normalizeCardsData,
      normalizeRuleIndex,
      initHomeSearch,
    });
  }
  console.warn("home-page.js is not loaded; home page initialization skipped.");
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
  if (window.faqDetailPage && typeof window.faqDetailPage.initFaqDetailPage === "function") {
    return window.faqDetailPage.initFaqDetailPage({
      q,
      getJson,
      sortByUpdated,
      formatDate,
      normalizeDocumentMarkdown,
      buildTocFor,
      highlightQueryIn,
      initReaderPrefs,
      initMobileTocDrawer,
    });
  }
  console.warn("faq-detail-page.js is not loaded; FAQ detail initialization skipped.");
}

async function initRulePage() {
  if (window.rulesPage && typeof window.rulesPage.initRulesPage === "function") {
    return window.rulesPage.initRulesPage({
      q,
      getJson,
      normalizeRuleIndex,
      sortByTime,
      mountTimeSortControls,
      renderRules,
      bindPageCards,
    });
  }
  console.warn("rules-page.js is not loaded; rules page initialization skipped.");
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
  if (window.errataDetailPage && typeof window.errataDetailPage.initErrataDetailPage === "function") {
    return window.errataDetailPage.initErrataDetailPage({
      q,
      getJson,
      sortByUpdated,
      formatDate,
      normalizeDocumentMarkdown,
      buildTocFor,
      highlightQueryIn,
      initReaderPrefs,
      initMobileTocDrawer,
    });
  }
  console.warn("errata-detail-page.js is not loaded; errata detail initialization skipped.");
}

async function initCardsPage() {
  if (window.cardsPage && typeof window.cardsPage.initCardsPage === "function") {
    return window.cardsPage.initCardsPage({
      q,
      route,
      withQuery,
      getJson,
      asItems,
      normalizeRuleIndex,
      markdownToPlain,
      escapeHtml,
      renderSearchPager,
      normalizeSearchText,
      extractRuleId,
      ruleTokenToAnchorId,
    });
  }
  console.warn("cards-page.js is not loaded; cards page initialization skipped.");
}

function initReader() {
  if (window.readerPage && typeof window.readerPage.initReaderPage === "function") {
    return window.readerPage.initReaderPage({
      q,
      route,
      withQuery,
      getJson,
      normalizeRuleIndex,
      normalizeCardsData,
      buildSearchIndex,
      searchDocs,
      escapeHtml,
    });
  }
  console.warn("reader-page.js is not loaded; reader page initialization skipped.");
}

async function initPage() {
  if (window.pageDetailPage && typeof window.pageDetailPage.initPageDetailPage === "function") {
    return window.pageDetailPage.initPageDetailPage({
      q,
      route,
      getJson,
      sortByUpdated,
      formatDate,
      normalizeDocumentMarkdown,
      showStatus,
      tagRuleRowsForAnchors,
      buildPageToc,
      initReaderPrefs,
      initMobileTocDrawer,
      highlightQueryIn,
    });
  }
  console.warn("page-detail-page.js is not loaded; page detail initialization skipped.");
}

async function initPageList() {
  if (window.pageListPage && typeof window.pageListPage.initPageListPage === "function") {
    return window.pageListPage.initPageListPage({
      q,
      getJson,
      sortByUpdated,
      renderPages,
      bindPageCards,
    });
  }
  console.warn("page-list-page.js is not loaded; page list initialization skipped.");
}

async function initUpdatesPage() {
  if (window.updatesPage && typeof window.updatesPage.initUpdatesPage === "function") {
    return window.updatesPage.initUpdatesPage({
      q,
      route,
      getJson,
      asItems,
      formatDate,
      escapeHtml,
      normalizeRuleIndex,
      resolveRuleLink,
    });
  }
  console.warn("updates-page.js is not loaded; updates page initialization skipped.");
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















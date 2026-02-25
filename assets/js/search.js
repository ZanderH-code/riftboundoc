const {
  route,
  withQuery,
  markdownToPlain,
  escapeHtml,
  asItems,
  debounce,
} = window.rbCore;

const { resolveRuleLink } = window.rbRender;
const SEARCH_CACHE_KEY = "rb_search_index_v3";

function buildSearchCacheSignature(data) {
  const bag = {
    pages: asItems(data.pages).map((x) => `${x.id || ""}:${x.updatedAt || ""}`),
    faqs: asItems(data.faqs).map((x) => `${x.id || ""}:${x.updatedAt || ""}`),
    errata: asItems(data.errata).map((x) => `${x.id || ""}:${x.updatedAt || ""}`),
    rules: asItems(data.rules).map((x) => `${x.id || ""}:${x.updatedAt || ""}`),
  };
  return JSON.stringify(bag);
}

function readSearchCache(signature) {
  try {
    const raw = localStorage.getItem(SEARCH_CACHE_KEY);
    if (!raw) return null;
    const cache = JSON.parse(raw);
    if (!cache || cache.signature !== signature || !Array.isArray(cache.docs)) return null;
    return cache.docs;
  } catch {
    return null;
  }
}

function writeSearchCache(signature, docs) {
  try {
    localStorage.setItem(
      SEARCH_CACHE_KEY,
      JSON.stringify({
        signature,
        docs,
        cachedAt: new Date().toISOString(),
      })
    );
  } catch {
    // Ignore storage quota / private mode errors.
  }
}

async function buildSearchIndex(data) {
  const signature = buildSearchCacheSignature(data);
  const cached = readSearchCache(signature);
  if (cached) return cached;

  const docs = [];
  for (const page of asItems(data.pages)) {
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
      href: route(`pages/${encodeURIComponent(page.id || "")}/`),
      titleText: markdownToPlain(page.title || ""),
      bodyText: markdownToPlain(`${page.summary || ""}\n${body}`),
    });
  }

  for (const item of asItems(data.faqs)) {
    docs.push({
      kind: "FAQ",
      title: item.title || "Untitled FAQ",
      href: route(`faq-detail/?id=${encodeURIComponent(item.id || "")}`),
      titleText: markdownToPlain(item.title || ""),
      bodyText: markdownToPlain(`${item.summary || ""}\n${item.content || ""}`),
    });
  }

  for (const item of asItems(data.errata)) {
    docs.push({
      kind: "Errata",
      title: item.title || "Untitled errata",
      href: route(`errata-detail/?id=${encodeURIComponent(item.id || "")}`),
      titleText: markdownToPlain(item.title || ""),
      bodyText: markdownToPlain(`${item.summary || ""}\n${item.content || ""}`),
    });
  }

  for (const item of asItems(data.rules)) {
    const link = resolveRuleLink(item);
    docs.push({
      kind: "Rule",
      title: item.title || item.name || "Untitled rule",
      href: link.href || "#",
      titleText: markdownToPlain(item.title || ""),
      bodyText: markdownToPlain(`${item.summary || ""}\n${item.source || ""}`),
    });
  }

  writeSearchCache(signature, docs);
  return docs;
}

function findHitIndexes(text, tokens) {
  const plain = String(text || "");
  const lower = plain.toLowerCase();
  const indexes = [];
  for (const token of tokens) {
    let idx = lower.indexOf(token);
    while (idx >= 0) {
      indexes.push(idx);
      idx = lower.indexOf(token, idx + token.length);
    }
  }
  return Array.from(new Set(indexes)).sort((a, b) => a - b);
}

function buildSearchSnippetAt(text, tokens, hitIndex, contextLen = 170) {
  const plain = String(text || "").trim();
  if (!plain) return "";
  const idx = hitIndex >= 0 ? hitIndex : 0;
  const left = Math.max(0, Math.floor(contextLen * 0.4));
  const right = Math.max(60, contextLen);
  const start = Math.max(0, idx - left);
  const end = Math.min(plain.length, idx + right);
  const prefix = start > 0 ? "..." : "";
  const suffix = end < plain.length ? "..." : "";
  let snippet = `${prefix}${plain.slice(start, end).trim()}${suffix}`;

  for (const token of tokens) {
    if (!token) continue;
    const safe = token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const re = new RegExp(`(${safe})`, "ig");
    snippet = snippet.replace(re, "<mark>$1</mark>");
  }
  return snippet;
}

function searchDocs(query, docs, options = {}) {
  const mode = options.mode || "hits";
  const kindFilter = options.kind || "all";
  const scope = options.scope || "all";
  const contextLen = Number(options.contextLen || 170);
  const maxHitsPerField = 120;
  const tokens = markdownToPlain(query)
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean);
  if (!tokens.length) return [];

  const docMatches = [];
  for (const doc of docs) {
    if (kindFilter !== "all" && doc.kind !== kindFilter) continue;
    const titleText = String(doc.titleText || "").toLowerCase();
    const bodyText = String(doc.bodyText || "").toLowerCase();

    const titleOk = tokens.every((t) => titleText.includes(t));
    const bodyOk = tokens.every((t) => bodyText.includes(t));
    const includeTitle = scope !== "body";
    const includeBody = scope !== "title";

    if ((!includeTitle || !titleOk) && (!includeBody || !bodyOk)) continue;

    let score = 0;
    if (includeTitle && titleOk) score += 10;
    if (includeBody && bodyOk) score += 3;
    docMatches.push({ ...doc, score, titleOk, bodyOk });
  }

  docMatches.sort((a, b) => b.score - a.score || a.title.localeCompare(b.title));

  if (mode === "docs") {
    return docMatches.map((doc) => {
      const sourceText = doc.titleOk ? doc.titleText : doc.bodyText;
      const idx = findHitIndexes(sourceText, tokens)[0] ?? 0;
      return {
        ...doc,
        field: doc.titleOk ? "title" : "body",
        snippet: buildSearchSnippetAt(sourceText, tokens, idx, contextLen),
      };
    });
  }

  const hits = [];
  for (const doc of docMatches) {
    if (scope !== "body" && doc.titleOk) {
      for (const idx of findHitIndexes(doc.titleText, tokens).slice(0, maxHitsPerField)) {
        hits.push({
          ...doc,
          field: "title",
          snippet: buildSearchSnippetAt(doc.titleText, tokens, idx, Math.min(120, contextLen)),
        });
      }
    }
    if (scope !== "title" && doc.bodyOk) {
      for (const idx of findHitIndexes(doc.bodyText, tokens).slice(0, maxHitsPerField)) {
        hits.push({
          ...doc,
          field: "body",
          snippet: buildSearchSnippetAt(doc.bodyText, tokens, idx, contextLen),
        });
      }
    }
  }

  hits.sort((a, b) => {
    if (a.field !== b.field) return a.field === "title" ? -1 : 1;
    if (a.title !== b.title) return a.title.localeCompare(b.title);
    return 0;
  });
  return hits;
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
  for (let p = 1; p <= pageCount; p += 1) target.appendChild(mk(String(p), p, p === page));
  target.appendChild(mk("Next", page + 1, false, page >= pageCount));
}

function renderSearchResultCard(hit, query) {
  const link = withQuery(hit.href, "q", query);
  const fieldText = hit.field === "title" ? "Title" : "Body";
  return `
    <article class="item search-result">
      <div class="result-head">
        <h3><a href="${link}">${escapeHtml(hit.title)}</a></h3>
        <span class="result-kind">${hit.kind}</span>
      </div>
      <p class="result-meta muted">Match: ${fieldText}</p>
      <p class="result-snippet">${hit.snippet || ""}</p>
    </article>
  `;
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

  if (!results.length) {
    meta.textContent = `0 hit(s) for "${query}"`;
    target.innerHTML = '<article class="item"><p class="muted">No matching content.</p></article>';
    if (pager) pager.innerHTML = "";
    return;
  }

  meta.textContent = `${results.length} hit(s) for "${query}" | Page ${current}/${pageCount}`;

  const titleHits = view.filter((x) => x.field === "title");
  const bodyHits = view.filter((x) => x.field !== "title");
  const blocks = [];
  if (titleHits.length) {
    blocks.push('<h3 class="result-group">Title Matches</h3>');
    blocks.push(titleHits.map((r) => renderSearchResultCard(r, query)).join(""));
  }
  if (bodyHits.length) {
    blocks.push('<h3 class="result-group">Body Matches</h3>');
    blocks.push(bodyHits.map((r) => renderSearchResultCard(r, query)).join(""));
  }
  target.innerHTML = blocks.join("");

  renderSearchPager(results.length, current, pageSize, pager, onPage);
}

async function initHomeSearch(data) {
  const input = document.querySelector("#home-search-input");
  const button = document.querySelector("#home-search-btn");
  const meta = document.querySelector("#home-search-meta");
  const list = document.querySelector("#home-search-results");
  const pager = document.querySelector("#home-search-pager");
  const kindSel = document.querySelector("#home-search-kind");
  const modeSel = document.querySelector("#home-search-mode");
  const scopeSel = document.querySelector("#home-search-scope");
  const contextSel = document.querySelector("#home-search-context");
  if (!input || !button || !meta || !list || !pager || !kindSel || !modeSel || !scopeSel || !contextSel)
    return;

  const docs = await buildSearchIndex(data);
  meta.textContent = `Index ready: ${docs.length} documents.`;

  const pageSize = 12;
  let latestResults = [];

  const run = (page = 1) => {
    const query = input.value.trim();
    latestResults = searchDocs(query, docs, {
      kind: kindSel.value || "all",
      mode: modeSel.value || "hits",
      scope: scopeSel.value || "all",
      contextLen: Number(contextSel.value || 170),
    });
    renderSearchResults(latestResults, list, meta, pager, query, page, pageSize, (p) => run(p));
  };

  const runDebounced = debounce(() => run(1), 180);

  button.addEventListener("click", () => run(1));
  input.addEventListener("keydown", (ev) => {
    if (ev.key === "Enter") run(1);
  });
  input.addEventListener("input", () => {
    if (!input.value.trim()) {
      latestResults = [];
      renderSearchResults([], list, meta, pager, "", 1, pageSize, () => {});
      return;
    }
    runDebounced();
  });

  kindSel.addEventListener("change", () => run(1));
  modeSel.addEventListener("change", () => run(1));
  scopeSel.addEventListener("change", () => run(1));
  contextSel.addEventListener("change", () => run(1));
}

window.rbSearch = {
  buildSearchIndex,
  searchDocs,
  initHomeSearch,
};

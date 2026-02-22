(function () {
  const fallbackDeps = {
    q: (selector) => document.querySelector(selector),
    buildSearchIndex: () => Promise.resolve([]),
    searchDocs: () => [],
    withQuery: (href, key, value) => {
      const url = new URL(href, window.location.href);
      if (value) url.searchParams.set(key, value);
      return url.pathname + (url.search || "");
    },
    escapeHtml: (text) =>
      String(text || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;"),
    renderSearchPager: () => {},
  };

  function resolveDeps(deps = {}) {
    return {
      ...fallbackDeps,
      ...deps,
    };
  }

  let q = fallbackDeps.q;
  let buildSearchIndex = fallbackDeps.buildSearchIndex;
  let searchDocs = fallbackDeps.searchDocs;
  let withQuery = fallbackDeps.withQuery;
  let escapeHtml = fallbackDeps.escapeHtml;
  let renderSearchPager = fallbackDeps.renderSearchPager;

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
      .map((result) => {
        const snippet = result.snippet || "";
        const link = withQuery(result.href, "q", query);
        return `
      <article class="item search-result">
        <div class="result-head">
          <h3><a href="${link}">${escapeHtml(result.title)}</a></h3>
          <span class="result-kind">${result.kind}</span>
        </div>
        <p class="result-snippet">${snippet}</p>
      </article>
    `;
      })
      .join("");
    renderSearchPager(results.length, current, pageSize, pager, onPage);
  }

  async function initHomeSearch(data, deps = {}) {
    ({ q, buildSearchIndex, searchDocs, withQuery, escapeHtml, renderSearchPager } = resolveDeps(deps));
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
    let latestResults = [];
    const pageSize = 12;

    const run = (page = 1) => {
      const query = input.value.trim();
      latestResults = searchDocs(query, docs, {
        kind: kindSel.value || "all",
        mode: modeSel.value || "hits",
      });
      renderSearchResults(latestResults, list, meta, pager, query, page, pageSize, (nextPage) => {
        run(nextPage);
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

  window.searchPage = {
    ...(window.searchPage || {}),
    initHomeSearch,
  };
})();

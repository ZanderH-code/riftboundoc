(function () {
  const fallbackDeps = {
    q: (selector) => document.querySelector(selector),
    route: (path) => {
      const clean = String(path || "").replace(/^\/+/, "");
      return `/${clean}`;
    },
    getJson: (_path, fallback = null) => Promise.resolve(fallback),
    sortByUpdated: (items) =>
      Array.isArray(items)
        ? [...items].sort((a, b) => String(b.updatedAt || "").localeCompare(String(a.updatedAt || "")))
        : [],
    formatDate: (value) => String(value || "-"),
    normalizeDocumentMarkdown: (markdown) => String(markdown || ""),
    showStatus: () => {},
    tagRuleRowsForAnchors: () => {},
    buildPageToc: () => {},
    initReaderPrefs: () => {},
    initMobileTocDrawer: () => {},
    highlightQueryIn: () => {},
  };

  function resolveDeps(deps = {}) {
    return {
      ...fallbackDeps,
      ...deps,
    };
  }

  async function initPageDetailPage(deps = {}) {
    const {
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
    } = resolveDeps(deps);
    const id = new URLSearchParams(window.location.search).get("id");
    const pages = await getJson("data/pages.json", []);
    const ordered = sortByUpdated(pages);
    const one = ordered.find((item) => item.id === id) || ordered[0];
    if (!one) return;

    if (q("#page-title")) q("#page-title").textContent = one.title;
    if (q("#page-summary")) q("#page-summary").textContent = one.summary || "";
    if (q("#doc-meta")) {
      q("#doc-meta").textContent = `Updated: ${formatDate(one.updatedAt)} | ID: ${one.id}`;
    }

    try {
      const markdown = await fetch(route(one.file), { cache: "no-store" }).then((response) => response.text());
      const normalized = markdown.includes('<div class="rule-sheet">')
        ? markdown
        : normalizeDocumentMarkdown(markdown, "page");
      if (window.marked && typeof window.marked.parse === "function") {
        q("#page-content").innerHTML = window.marked.parse(normalized);
      } else {
        q("#page-content").innerHTML = `<pre>${normalized}</pre>`;
      }
    } catch {
      showStatus(`Failed to load page content: ${one.file}`);
    }

    tagRuleRowsForAnchors("#page-content");
    buildPageToc();
    initReaderPrefs();
    initMobileTocDrawer();
    highlightQueryIn("#page-content");
  }

  window.pageDetailPage = {
    ...(window.pageDetailPage || {}),
    initPageDetailPage,
  };
})();

(function () {
  const fallbackDeps = {
    q: (selector) => document.querySelector(selector),
    getJson: (_path, fallback = null) => Promise.resolve(fallback),
    sortByUpdated: (items) =>
      Array.isArray(items)
        ? [...items].sort((a, b) => String(b.updatedAt || "").localeCompare(String(a.updatedAt || "")))
        : [],
    renderPages: () => {},
    bindPageCards: () => {},
  };

  function resolveDeps(deps = {}) {
    return {
      ...fallbackDeps,
      ...deps,
    };
  }

  async function initPageListPage(deps = {}) {
    const { q, getJson, sortByUpdated, renderPages, bindPageCards } = resolveDeps(deps);
    const pages = await getJson("data/pages.json", []);
    const pageList = q("#page-list");
    if (!pageList) return;
    renderPages(sortByUpdated(pages), pageList);
    bindPageCards(pageList);
  }

  window.pageListPage = {
    ...(window.pageListPage || {}),
    initPageListPage,
  };
})();

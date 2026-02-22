(function () {
  const fallbackDeps = {
    q: (selector) => document.querySelector(selector),
    getJson: (_path, fallback = null) => Promise.resolve(fallback),
    normalizeRuleIndex: (indexData) => {
      if (Array.isArray(indexData)) return indexData;
      if (indexData && typeof indexData === "object" && Array.isArray(indexData.rules)) return indexData.rules;
      return [];
    },
    sortByTime: (items, order = "desc") => {
      const asc = order === "asc";
      const rows = Array.isArray(items) ? [...items] : [];
      rows.sort((a, b) => {
        const aPrimary = String(a.publishedAt || a.updatedAt || "");
        const bPrimary = String(b.publishedAt || b.updatedAt || "");
        const aUpdated = String(a.updatedAt || "");
        const bUpdated = String(b.updatedAt || "");
        let cmp = aPrimary.localeCompare(bPrimary);
        if (cmp === 0) cmp = aUpdated.localeCompare(bUpdated);
        if (cmp === 0) cmp = String(a.title || a.name || "").localeCompare(String(b.title || b.name || ""));
        return asc ? cmp : -cmp;
      });
      return rows;
    },
    mountTimeSortControls: () => {},
    renderRules: () => {},
    bindPageCards: () => {},
  };

  function resolveDeps(deps = {}) {
    return {
      ...fallbackDeps,
      ...deps,
    };
  }

  async function initRulesPage(deps = {}) {
    const { q, getJson, normalizeRuleIndex, sortByTime, mountTimeSortControls, renderRules, bindPageCards } =
      resolveDeps(deps);
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

  window.rulesPage = {
    ...(window.rulesPage || {}),
    initRulesPage,
  };
})();

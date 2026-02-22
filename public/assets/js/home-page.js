(function () {
  const fallbackDeps = {
    q: (selector) => document.querySelector(selector),
    today: () => new Date().toISOString().slice(0, 10),
    getJson: (_path, fallback = null) => Promise.resolve(fallback),
    asItems: (list) => (Array.isArray(list) ? list : []),
    sortByPublishedThenUpdated: (items) => (Array.isArray(items) ? [...items] : []),
    renderFaq: () => {},
    renderErrata: () => {},
    renderRules: () => {},
    bindPageCards: () => {},
    normalizeCardsData: (data) => {
      if (Array.isArray(data)) return data;
      if (data && typeof data === "object" && Array.isArray(data.cards)) return data.cards;
      return [];
    },
    normalizeRuleIndex: (indexData) => {
      if (Array.isArray(indexData)) return indexData;
      if (indexData && typeof indexData === "object" && Array.isArray(indexData.rules)) return indexData.rules;
      return [];
    },
    initHomeSearch: null,
  };

  function resolveDeps(deps = {}) {
    return {
      ...fallbackDeps,
      ...deps,
    };
  }

  async function initHomePage(deps = {}) {
    const {
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
    } = resolveDeps(deps);

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

    if (typeof initHomeSearch === "function") {
      initHomeSearch({ pages, faqs, errata, rules, cards });
      return;
    }
    console.warn("search-page.js is not loaded; home search initialization skipped.");
  }

  window.homePage = {
    ...(window.homePage || {}),
    initHomePage,
  };
})();

const { q, today, sortByUpdated, getJson } = window.rbCore;
const { renderFaq, renderErrata, renderRules, normalizeRuleIndex, bindPageCards } = window.rbRender;
const { initHomeSearch } = window.rbSearch;

async function initHomePage() {
  const pages = await getJson("data/pages.json", []);
  const faqs = await getJson("data/faqs.json", []);
  const errata = await getJson("data/errata.json", []);
  const rulesIndex = await getJson("content/rules/index.json", { rules: [] });
  const rules = normalizeRuleIndex(rulesIndex);

  const statsFaq = q("#stats-faq");
  const statsErrata = q("#stats-errata");
  const statsRules = q("#stats-rules");
  const statsUpdate = q("#stats-update");
  if (statsFaq) statsFaq.textContent = Array.isArray(faqs) ? faqs.length : 0;
  if (statsErrata) statsErrata.textContent = Array.isArray(errata) ? errata.length : 0;
  if (statsRules) statsRules.textContent = Array.isArray(rules) ? rules.length : 0;
  if (statsUpdate) statsUpdate.textContent = today();

  renderFaq(sortByUpdated(faqs).slice(0, 2), q("#home-faq"), { compact: true });
  renderErrata(sortByUpdated(errata).slice(0, 2), q("#home-errata"), { compact: true });
  renderRules(sortByUpdated(rules).slice(0, 3), q("#home-rules"));

  bindPageCards(q("#home-faq"));
  bindPageCards(q("#home-errata"));
  bindPageCards(q("#home-rules"));
  bindPageCards(q(".hero .grid"));

  initHomeSearch({ pages, faqs, errata, rules });
}

window.rbHome = {
  initHomePage,
};

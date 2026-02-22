(function () {
  const fallbackDeps = {
    q: (selector) => document.querySelector(selector),
    route: (path) => {
      const clean = String(path || "").replace(/^\/+/, "");
      return `/${clean}`;
    },
    getJson: (_path, fallback = null) => Promise.resolve(fallback),
    asItems: (list) => (Array.isArray(list) ? list : []),
    normalizeRuleIndex: (indexData) => (Array.isArray(indexData) ? indexData : []),
    markdownToPlain: (text) => String(text || "").replace(/\s+/g, " ").trim(),
    escapeHtml: (text) =>
      String(text || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;"),
    renderSearchPager: () => {},
    normalizeSearchText: (value) => String(value || "").toLowerCase(),
  };

  function resolveDeps(deps = {}) {
    return {
      ...fallbackDeps,
      ...deps,
    };
  }

  let q = fallbackDeps.q;
  let route = fallbackDeps.route;
  let getJson = fallbackDeps.getJson;
  let asItems = fallbackDeps.asItems;
  let normalizeRuleIndex = fallbackDeps.normalizeRuleIndex;
  let markdownToPlain = fallbackDeps.markdownToPlain;
  let escapeHtml = fallbackDeps.escapeHtml;
  let renderSearchPager = fallbackDeps.renderSearchPager;
  let normalizeSearchText = fallbackDeps.normalizeSearchText;
  const normalizeCardsData = (data) => {
    if (Array.isArray(data)) return data;
    if (data && typeof data === 'object' && Array.isArray(data.cards)) return data.cards;
    return [];
  };
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
  html = html.replace(/:rb_might:/gi, () => {
    return "might";
  });
  html = html.replace(/:rb_exhaust:/gi, () => {
    return '<span class="rb-token rb-exhaust" title="Exhaust" aria-label="Exhaust"></span>';
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
  async function initCardsPage(deps = {}) {
  ({ q, route, getJson, asItems, normalizeRuleIndex, markdownToPlain, escapeHtml, renderSearchPager, normalizeSearchText } = resolveDeps(deps));
  const raw = await getJson("data/cards.json", { cards: [] });
  const faqs = await getJson("data/faqs.json", []);
  const errata = await getJson("data/errata.json", []);
  const pages = await getJson("data/pages.json", []);
  const rulesIndex = await getJson("content/rules/index.json", { rules: [] });
  const rules = normalizeRuleIndex(rulesIndex);
  const cards = normalizeCardsData(raw);
  const list = q("#cards-list");
  const meta = q("#cards-meta");
  const pager = q("#cards-pager");
  const searchInput = q("#cards-search-input");
  const filterRoot = q("#cards-filters");
  const filterToggle = q("#cards-filter-toggle");
  const filterClear = q("#cards-filter-clear");
  const activeFiltersWrap = q("#cards-active-filters");
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
  const modalRulesWrap = q("#cards-modal-rules-wrap");
  const modalRulesList = q("#cards-modal-rules-list");
  if (
    !list ||
    !meta ||
    !pager ||
    !searchInput ||
    !filterRoot ||
    !filterToggle ||
    !filterClear ||
    !activeFiltersWrap ||
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
    !modalErrataList ||
    !modalRulesWrap ||
    !modalRulesList
  ) {
    return;
  }

  const rulePageIds = asItems(rules)
    .filter((it) => String(it.kind || "").toLowerCase() === "page")
    .map((it) => String(it.pageId || it.id || "").trim())
    .filter(Boolean);
  const rulePagesById = new Map(
    asItems(pages)
      .filter((it) => it && it.file)
      .map((it) => [String(it.id || "").trim(), it])
  );
  let relatedRuleDocsPromise = null;
  const loadRelatedRuleDocs = async () => {
    if (relatedRuleDocsPromise) return relatedRuleDocsPromise;
    relatedRuleDocsPromise = (async () => {
      const docs = [];
      for (const pageId of rulePageIds) {
        const page = rulePagesById.get(String(pageId || "").trim());
        if (!page || !page.file) continue;
        try {
          const body = await fetch(route(page.file), { cache: "no-store" }).then((r) => r.text());
          docs.push({
            kind: "rule",
            id: page.id || pageId,
            title: page.title || "Riftbound Rule",
            summary: page.summary || "",
            content: body,
            updatedAt: page.updatedAt || "",
            publishedAt: page.publishedAt || "",
          });
        } catch (error) {
          console.warn(`Failed to load rule page for card relation: ${pageId}`, error);
        }
      }
      return docs;
    })();
    return relatedRuleDocsPromise;
  };

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
  const inferCardVariantSet = (card) => {
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
  const variantDisplayOrder = ["Standard", "Foil", "Alt Art", "Overnumber", "Signed", "Promo"];
  const variantCounts = new Map();
  cards.forEach((card) => {
    inferCardVariantSet(card).forEach((v) => {
      variantCounts.set(v, (variantCounts.get(v) || 0) + 1);
    });
  });
  const variantOptions = variantDisplayOrder.filter((v) => (variantCounts.get(v) || 0) > 0);
  const rarities = unique(cards.map((x) => x.rarity));
  const allDomains = unique(cards.flatMap((x) => asItems(x.domains)));
  const domainOrder = ["Fury", "Calm", "Mind", "Body", "Chaos", "Order"];
  const allCardNamesLower = unique(cards.map((x) => String(x.name || "").trim().toLowerCase()));
  const longerNameByPrefix = new Map();
  allCardNamesLower.forEach((name) => {
    const first = name.split(",")[0].trim();
    if (!first) return;
    for (let i = 0; i < allCardNamesLower.length; i += 1) {
      const other = allCardNamesLower[i];
      if (!other || other === first) continue;
      if (!other.startsWith(`${first} `)) continue;
      if (!longerNameByPrefix.has(first)) longerNameByPrefix.set(first, []);
      longerNameByPrefix.get(first).push(other);
    }
  });

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

  const parseCsvParam = (params, keys = []) => {
    for (const key of keys) {
      const raw = String(params.get(key) || "").trim();
      if (!raw) continue;
      return raw
        .split(",")
        .map((x) => decodeURIComponent(x).trim())
        .filter(Boolean);
    }
    return [];
  };

  const pickAllowedSet = (params, keys, allowedValues) => {
    const allowed = new Set(asItems(allowedValues).map((x) => String(x)));
    return new Set(parseCsvParam(params, keys).filter((x) => allowed.has(String(x))));
  };

  const parseRangeBound = (params, keys, fallback) => {
    for (const key of keys) {
      const raw = params.get(key);
      if (raw == null || raw === "") continue;
      const n = Number(raw);
      if (Number.isFinite(n)) return n;
    }
    return fallback;
  };

  const applyCardsStateFromUrl = () => {
    const params = new URLSearchParams(window.location.search);
    const query = String(params.get("q") || params.get("query") || "").trim();
    state.query = query;

    const sortKey = String(params.get("sort") || params.get("sortKey") || "").trim();
    if (["card", "name", "rarity", "might"].includes(sortKey)) state.sortKey = sortKey;

    const sortDir = String(params.get("dir") || params.get("sortDir") || "").trim().toLowerCase();
    if (["asc", "desc"].includes(sortDir)) state.sortDir = sortDir;

    state.page = Math.max(1, Number.parseInt(params.get("page") || "1", 10) || 1);

    state.domains = pickAllowedSet(params, ["domain", "domains"], allDomains);
    state.sets = pickAllowedSet(params, ["set", "sets"], sets);
    state.types = pickAllowedSet(params, ["type", "types"], types);
    state.supertypes = pickAllowedSet(params, ["supertype", "supertypes"], supertypes);
    state.variants = pickAllowedSet(params, ["variant", "variants"], variantOptions);
    state.rarities = pickAllowedSet(params, ["rarity", "rarities"], rarities);

    for (const stat of ["energy", "power", "might"]) {
      const limit = limits[stat];
      const minRaw = parseRangeBound(params, [`${stat}Min`, `${stat}_min`, `${stat}From`], limit.min);
      const maxRaw = parseRangeBound(params, [`${stat}Max`, `${stat}_max`, `${stat}To`], limit.max);
      const min = Math.max(limit.min, Math.min(limit.max, minRaw));
      const max = Math.max(limit.min, Math.min(limit.max, maxRaw));
      state.ranges[stat] = {
        min: Math.min(min, max),
        max: Math.max(min, max),
      };
    }
  };

  const syncCardsUrlState = () => {
    const params = new URLSearchParams(window.location.search);
    const setParam = (key, value, fallback = "") => {
      if (String(value || "") === String(fallback || "")) params.delete(key);
      else params.set(key, value);
    };
    const setCsvParam = (key, values) => {
      const list = Array.from(values || []).map((x) => String(x)).filter(Boolean).sort();
      if (!list.length) params.delete(key);
      else params.set(key, list.join(","));
    };

    setParam("q", state.query.trim(), "");
    setParam("sort", state.sortKey, "card");
    setParam("dir", state.sortDir, "asc");
    setParam("page", String(state.page || 1), "1");

    setCsvParam("domains", state.domains);
    setCsvParam("sets", state.sets);
    setCsvParam("types", state.types);
    setCsvParam("supertypes", state.supertypes);
    setCsvParam("variants", state.variants);
    setCsvParam("rarities", state.rarities);

    for (const stat of ["energy", "power", "might"]) {
      const limit = limits[stat];
      const range = state.ranges[stat] || limit;
      const minKey = `${stat}Min`;
      const maxKey = `${stat}Max`;
      if (Number(range.min) === Number(limit.min) && Number(range.max) === Number(limit.max)) {
        params.delete(minKey);
        params.delete(maxKey);
      } else {
        params.set(minKey, String(range.min));
        params.set(maxKey, String(range.max));
      }
    }

    ["query", "sortKey", "sortDir", "domain", "set", "type", "supertype", "variant", "rarity", "energy_min", "energy_max", "power_min", "power_max", "might_min", "might_max", "energyFrom", "energyTo", "powerFrom", "powerTo", "mightFrom", "mightTo"].forEach((k) => params.delete(k));

    const next = `${window.location.pathname}${params.toString() ? `?${params.toString()}` : ""}${window.location.hash || ""}`;
    const current = `${window.location.pathname}${window.location.search}${window.location.hash || ""}`;
    if (next !== current) window.history.replaceState({}, "", next);
  };

  applyCardsStateFromUrl();

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
  searchInput.value = state.query;
  sortKeySelect.value = state.sortKey;
  sortDirBtn.textContent = state.sortDir === "asc" ? "Asc" : "Desc";

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

  const knownCardNames = new Set(
    asItems(cards)
      .map((c) =>
        String(c?.name || "")
          .trim()
          .normalize("NFKC")
          .replace(/[’‘`´]/g, "'")
          .replace(/[“”]/g, '"')
          .toLowerCase()
      )
      .filter(Boolean)
  );

  const findRelatedDocs = (docs, cardName, fallbackKind = "") => {
    const normalizeForMatch = (value) =>
      String(value || "")
        .normalize("NFKC")
        .replace(/[’‘`´]/g, "'")
        .replace(/[“”]/g, '"')
        // Common mojibake forms seen in imported content.
        .replace(/鈥檚/g, "'s")
        .replace(/鈥檛/g, "'t")
        .replace(/鈥檒/g, "'l")
        .replace(/鈥檓/g, "'m")
        .replace(/鈥檙/g, "'r")
        .replace(/鈥檝/g, "'v")
        .replace(/鈥檇/g, "'d")
        .toLowerCase();
    const full = String(cardName || "").trim();
    if (!full) return [];
    const fullLower = normalizeForMatch(full);
    const needles = [fullLower];
    const escapeRegExp = (s) => String(s || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const docKindOf = (doc) =>
      String(doc.kind || fallbackKind || "")
        .trim()
        .toLowerCase();
    const docTitleOf = (doc) => String(doc.title || doc.question || "Untitled").trim();
    const docBodyOf = (doc) => {
      if (doc.content || doc.summary) {
        return [doc.content, doc.summary].filter(Boolean).join("\n");
      }
      // Backward compatibility for legacy flat FAQ rows.
      if (doc.question || doc.answer) {
        return [doc.question, doc.answer].filter(Boolean).join("\n\n");
      }
      return "";
    };
    const matchNeedleIndex = (textLower, needleLower) => {
      if (!textLower || !needleLower) return -1;
      const re = new RegExp(`(^|[^a-z0-9])(${escapeRegExp(needleLower)})(?=$|[^a-z0-9])`, "gi");
      let m;
      while ((m = re.exec(textLower)) !== null) {
        const idx = m.index + (m[1] ? m[1].length : 0);
        const suffix = textLower.slice(idx);
        const longer = longerNameByPrefix.get(needleLower) || [];
        const shadowed = longer.some((name) => suffix.startsWith(name));
        if (!shadowed) return idx;
      }
      return -1;
    };
    const toHay = (doc) =>
      normalizeForMatch(markdownToPlain([docTitleOf(doc), doc.summary, docBodyOf(doc)].filter(Boolean).join("\n")));

    const pickMatchedSnippets = (doc) => {
      const markdown = String(docBodyOf(doc));
      const lines = markdown.replace(/\r\n?/g, "\n").split("\n");
      const sections = [];
      let current = { heading: "", body: [] };
      const docKind = docKindOf(doc);
      const isErrataDoc = docKind === "errata";
      const isRuleDoc = docKind === "rule";
      const isFaqDoc = docKind === "faq" || /faq/i.test(docTitleOf(doc));
      const hits = [];
      const seen = new Set();
      const anchorSeq = new Map();
      const buildJumpQuery = (snippet) => {
        const plain = markdownToPlain(String(snippet || "")).trim();
        if (!plain) return "";
        const parts = plain
          .split(/\n+/)
          .map((x) => x.trim())
          .filter(Boolean);
        let chosen = parts[0] || plain;
        if (parts.length >= 2 && !/^q[:：]/i.test(parts[0] || "")) chosen = parts[1];
        const words = chosen.split(/\s+/).filter(Boolean).slice(0, 18);
        return words.join(" ").trim();
      };
      const cleanSnippet = (snippet) => {
        const raw = String(snippet || "").trim();
        if (!raw) return "";
        const parts = raw
          .split(/<br\s*\/?>\s*<br\s*\/?>/i)
          .map((x) => String(x || "").trim())
          .filter(Boolean);
        const out = [];
        const local = new Set();
        for (const part of parts) {
          const key = normalizeForMatch(markdownToPlain(part));
          if (!key || local.has(key)) continue;
          local.add(key);
          out.push(part);
        }
        return out.join("<br /><br />").trim();
      };
      const dedupKeyFor = (snippet) => {
        const plain = normalizeForMatch(markdownToPlain(snippet));
        if (!plain) return "";
        if (isFaqDoc) {
          const qIdx = plain.indexOf("q:");
          if (qIdx > 0) return plain.slice(qIdx).trim();
        }
        return plain;
      };
      const pushHit = (snippet, query, anchorText = "", anchorHeading = "", meta = null) => {
        const body = cleanSnippet(snippet);
        if (!body) return;
        const key = dedupKeyFor(body).slice(0, 420);
        if (seen.has(key)) return;
        seen.add(key);
        const anchorKey = `${normalizeForMatch(anchorHeading)}|${normalizeForMatch(anchorText)}`;
        const anchorIndex = (anchorSeq.get(anchorKey) || 0) + 1;
        anchorSeq.set(anchorKey, anchorIndex);
        hits.push({
          snippet: body,
          query: query || needles[0] || "",
          jumpQuery: buildJumpQuery(body),
          anchorText: String(anchorText || "").trim(),
          anchorHeading: String(anchorHeading || "").trim(),
          anchorIndex,
          ruleId: meta && meta.ruleId ? String(meta.ruleId).trim() : "",
        });
      };

      if (isRuleDoc) {
        const toRuleRow = (line) => {
          const raw = String(line || "");
          const bullet = raw.match(/^(\s*)[-*]\s+(.*)$/);
          if (!bullet) return null;
          const indent = String(bullet[1] || "").length;
          const body = String(bullet[2] || "").trim();
          const m = body.match(/^([0-9]+(?:\.[0-9a-z]+)*\.?)\s*(.*)$/i);
          if (!m) return null;
          const id = String(m[1] || "").trim();
          const text = markdownToPlain(String(m[2] || "").trim());
          return { indent, id, text };
        };

        const ruleRows = lines.map((line) => toRuleRow(line)).filter(Boolean);
        for (let i = 0; i < ruleRows.length; i += 1) {
          const row = ruleRows[i];
          const rowText = `${row.id} ${row.text}`.trim();
          const rowLower = rowText.toLowerCase();
          const hit = needles.find((n) => matchNeedleIndex(rowLower, n) >= 0);
          if (!hit) continue;

          let parent = null;
          for (let j = i - 1; j >= 0; j -= 1) {
            if (ruleRows[j].indent < row.indent) {
              parent = ruleRows[j];
              break;
            }
          }

          const parts = [];
          if (parent) parts.push(`${parent.id} ${parent.text}`.trim());
          parts.push(rowText);
          pushHit(
            parts.map((p) => escapeHtml(p)).join("<br /><br />"),
            hit,
            rowText,
            parent ? parent.text : "",
            { ruleId: row.id }
          );
        }
      }

      for (let i = 0; i < lines.length; i += 1) {
        const line = String(lines[i] || "");
        const trimmed = line.trim();
        let heading = "";
        // Base split by level-2 headings.
        if (/^##\s+/.test(line)) {
          heading = line.replace(/^##\s+/, "").trim();
        } else if (
          (isErrataDoc || isFaqDoc) &&
          /^###\s+/.test(line) &&
          !/^###\s+q[:：]/i.test(line)
        ) {
          // Errata/FAQ may use level-3 card headings.
          heading = line.replace(/^###\s+/, "").trim();
        } else if (isFaqDoc && /\(revised text\)\s*$/i.test(trimmed) && !trimmed.startsWith("#")) {
          // FAQ may contain plain "Card Name (revised text)" headings.
          let j = i + 1;
          while (j < lines.length && !String(lines[j] || "").trim()) j += 1;
          if (j < lines.length && !String(lines[j] || "").trim().startsWith("#")) {
            heading = trimmed;
          }
        } else if (isErrataDoc && trimmed && !trimmed.startsWith("#")) {
          // Spiritforged Errata has entries like "Falling Star" without markdown heading.
          let j = i + 1;
          while (j < lines.length && !String(lines[j] || "").trim()) j += 1;
          if (j < lines.length && /^####\s+\[NEW TEXT\]/i.test(String(lines[j] || ""))) {
            heading = trimmed;
          }
        }
        if (heading) {
          if (current.heading || current.body.length) sections.push(current);
          current = { heading, body: [] };
          continue;
        }
        current.body.push(line);
      }
      if (current.heading || current.body.length) sections.push(current);

      const toParagraphs = (section) =>
        String(section.body.join("\n"))
          .split(/\n\s*\n+/)
          .map((x) => markdownToPlain(x))
          .map((x) => x.trim())
          .filter(Boolean);

      const isOtherCardTitleParagraph = (text) => {
        const raw = String(text || "").trim();
        if (!raw) return false;
        const norm = normalizeForMatch(raw).replace(/\s*\(revised text\)\s*$/i, "").trim();
        if (!norm || norm === fullLower) return false;
        return knownCardNames.has(norm);
      };

      const toSnippetFromParagraph = (paragraph, preferredNeedle = "") => {
        const lower = normalizeForMatch(paragraph);
        const hit =
          preferredNeedle ||
          needles.find((n) => matchNeedleIndex(lower, n) >= 0) ||
          needles[0] ||
          "";
        return {
          snippet: escapeHtml(paragraph.trim()),
          query: hit || needles[0] || "",
        };
      };

      if (isFaqDoc) {
        const splitFaqBlocks = (paragraphs) => {
          const blocks = [];
          let current = [];
          for (const paragraph of paragraphs) {
            const text = String(paragraph || "").trim();
            if (!text) continue;
            if (/^q[:：]/i.test(text) && current.length) {
              blocks.push(current);
              current = [];
            }
            current.push(text);
          }
          if (current.length) blocks.push(current);
          return blocks.length ? blocks : [paragraphs.filter(Boolean)];
        };

        for (const section of sections) {
          const heading = String(section.heading || "").trim();
          const headingLow = normalizeForMatch(heading);
          const headingHit = needles.find((n) => matchNeedleIndex(headingLow, n) >= 0) || "";
          const paragraphs = toParagraphs(section);
          if (!paragraphs.length) continue;
          const blocks = splitFaqBlocks(paragraphs);
          for (const block of blocks) {
            const cleanBlock = [];
            for (const row of block) {
              const text = String(row || "").trim();
              if (!text) continue;
              const norm = normalizeForMatch(text);
              if (norm === headingLow) continue;
              if (isOtherCardTitleParagraph(text)) break;
              cleanBlock.push(text);
            }
            if (!cleanBlock.length) continue;
            const blockHit =
              headingHit ||
              cleanBlock
                .map((row) => normalizeForMatch(row))
                .map((row) => needles.find((n) => matchNeedleIndex(row, n) >= 0))
                .find(Boolean) ||
              "";
            if (!blockHit) continue;
            const bodyText = cleanBlock.map((x) => escapeHtml(x)).join("<br /><br />");
            pushHit(
              `${heading ? `${escapeHtml(heading)}<br /><br />` : ""}${bodyText}`,
              blockHit,
              cleanBlock[0] || heading,
              heading
            );
          }
        }
        return hits.slice(0, 12);
      }

      // 1) Title-first strategy: section heading (TOC-like) first, then doc title.
      for (const section of sections) {
        const heading = String(section.heading || "").trim();
        const headingLow = normalizeForMatch(heading);
        const hit = needles.find((n) => matchNeedleIndex(headingLow, n) >= 0);
        if (!hit) continue;
        const paragraphs = toParagraphs(section);
        if (paragraphs.length) {
          let bodyParts = [];
          if (isFaqDoc) {
            // Keep FAQ snippet scoped to this card entry only.
            for (const row of paragraphs) {
              const text = String(row || "").trim();
              if (!text) continue;
              const norm = normalizeForMatch(text);
              if (norm === headingLow) continue;
              if (isOtherCardTitleParagraph(text)) break;
              bodyParts.push(text);
            }
          } else {
            bodyParts = paragraphs
              .map((x) => String(x || "").trim())
              .filter((x) => x && normalizeForMatch(x) !== headingLow)
              .slice(0, isRuleDoc ? 2 : 99);
          }
          const bodyText = bodyParts.map((x) => escapeHtml(x)).join("<br /><br />");
          pushHit(
            `${escapeHtml(heading)}${bodyText ? `<br /><br />${bodyText}` : ""}`,
            hit,
            bodyParts[0] || heading,
            heading
          );
          continue;
        }
        pushHit(escapeHtml(heading), hit, heading, heading);
      }

      const docTitle = markdownToPlain(docTitleOf(doc));
      const docTitleLow = normalizeForMatch(docTitle);
      const docTitleHit = needles.find((n) => matchNeedleIndex(docTitleLow, n) >= 0);
      if (docTitleHit) {
        const bodyParagraphs = markdownToPlain(markdown)
          .split(/\n\s*\n+/)
          .map((x) => x.trim())
          .filter(Boolean);
        if (isFaqDoc && bodyParagraphs.length) {
          const pieces = [bodyParagraphs[0]];
          const next = String(bodyParagraphs[1] || "").trim();
          if (next && !/^q[:：]/i.test(next)) pieces.push(next);
          pushHit(
            pieces.map((p) => escapeHtml(p)).join("<br /><br />"),
            docTitleHit,
            pieces[0] || docTitle,
            docTitle
          );
        } else {
          const bodyFirst = bodyParagraphs.find(Boolean);
          if (bodyFirst) {
            const one = toSnippetFromParagraph(bodyFirst, docTitleHit);
            pushHit(one.snippet, one.query, bodyFirst, docTitle);
          } else {
            pushHit(escapeHtml(docTitle), docTitleHit, docTitle, docTitle);
          }
        }
      }

      for (const section of sections) {
        const paragraphs = toParagraphs(section);
        const headingLow = normalizeForMatch(String(section.heading || "").trim());
        const headingIsCard = knownCardNames.has(headingLow);
        if (headingIsCard && headingLow !== fullLower) continue;
        const matchedParagraphs = [];
        let firstHit = "";
        for (let idx = 0; idx < paragraphs.length; idx += 1) {
          const paragraph = paragraphs[idx];
          const lower = normalizeForMatch(paragraph);
          const hit = needles.find((n) => matchNeedleIndex(lower, n) >= 0);
          if (!hit) continue;
          if (!firstHit) firstHit = hit;
          matchedParagraphs.push(paragraph);
          if (isFaqDoc) {
            const next = String(paragraphs[idx + 1] || "").trim();
            if (next && !/^q[:：]/i.test(next) && !isOtherCardTitleParagraph(next)) matchedParagraphs.push(next);
          }
          if (!isFaqDoc && matchedParagraphs.length >= 2) break;
        }
        if (matchedParagraphs.length) {
          const joined = matchedParagraphs.map((p) => escapeHtml(String(p).trim())).join("<br /><br />");
          pushHit(joined, firstHit || needles[0] || "", matchedParagraphs[0] || "", section.heading || "");
        }
      }

      return hits.slice(0, 12);
    };

    return asItems(docs)
      .map((doc) => {
        const hay = toHay(doc);
        const lower = normalizeForMatch(hay);
        const matched = needles.some((n) => matchNeedleIndex(lower, n) >= 0);
        if (!matched) return null;
        const picked = pickMatchedSnippets(doc);
        if (!picked || !picked.length) return null;
        const first = picked[0];
        return {
          id: doc.id || "",
          title: docTitleOf(doc),
          publishedAt: doc.publishedAt || "",
          updatedAt: doc.updatedAt || "",
          snippet: first.snippet,
          query: first.query,
          matches: picked,
          sourceTitle: docTitleOf(doc),
        };
      })
      .filter(Boolean)
      .sort((a, b) => {
        const bp = String(b.publishedAt || "");
        const ap = String(a.publishedAt || "");
        let cmp = bp.localeCompare(ap);
        if (cmp === 0) {
          cmp = String(b.updatedAt || "").localeCompare(String(a.updatedAt || ""));
        }
        return cmp;
      })
      .slice(0, 4);
  };

  const renderRelatedDocs = (rows, wrap, listEl, kind) => {
    if (!rows.length) {
      wrap.hidden = true;
      listEl.innerHTML = "";
      return;
    }
    wrap.hidden = false;
    const toHref = (id, hitLike) => {
      const query = String(hitLike?.jumpQuery || hitLike?.query || "");
      const relQuery = String(hitLike?.anchorText || hitLike?.jumpQuery || hitLike?.query || "");
      const relHeading = String(hitLike?.anchorHeading || "");
      const relRuleId =
        String(hitLike?.ruleId || "").trim() ||
        extractRuleId(hitLike?.anchorText || hitLike?.jumpQuery || hitLike?.query || "");
      const relIndex = Math.max(1, Number.parseInt(hitLike?.anchorIndex || "1", 10) || 1);
      let baseHref = route(`errata-detail/?id=${encodeURIComponent(id)}`);
      if (kind === "faq") {
        baseHref = route(`faq-detail/?id=${encodeURIComponent(id)}`);
      } else if (kind === "rule") {
        baseHref = route(`pages/?id=${encodeURIComponent(id)}`);
      }
      let href = withQuery(baseHref, "q", query || "");
      href = withQuery(href, "rq", relQuery || "");
      href = withQuery(href, "rh", relHeading || "");
      href = withQuery(href, "rr", relRuleId || "");
      href = withQuery(href, "ri", String(relIndex));
      if (kind === "rule" && relRuleId) {
        const anchorId = ruleTokenToAnchorId(relRuleId);
        if (anchorId) href += `#${anchorId}`;
      }
      return href;
    };
    listEl.innerHTML = rows
      .map((x, i) => {
        const itemId = `rel-${kind}-${String(x.id || i).replace(/[^a-z0-9_-]/gi, "-")}-${i}`;
        const first = asItems(x.matches)[0] || x;
        const total = Math.max(1, asItems(x.matches).length);
        const initialHref = toHref(x.id, first);
        return `
      <div class="cards-related-item cards-related-card-link" data-related-id="${itemId}" data-rel-href="${initialHref}" tabindex="0" role="link">
        <div class="cards-related-nav${total > 1 ? "" : " is-hidden"}">
          <button type="button" class="cards-related-btn" data-rel-prev aria-label="Previous match">&#10094;</button>
          <button type="button" class="cards-related-btn" data-rel-next aria-label="Next match">&#10095;</button>
        </div>
        <p class="muted cards-related-snippet" data-rel-snippet>${first.snippet || ""}</p>
        <div class="cards-related-foot">
          <span class="cards-related-count${total > 1 ? "" : " is-hidden"}" data-rel-count>1/${total}</span>
          <a class="cards-related-source" data-rel-link href="${initialHref}">${escapeHtml(
          x.sourceTitle || x.title
        )}</a>
        </div>
      </div>
    `;
      })
      .join("");

    rows.forEach((row, i) => {
      const itemId = `rel-${kind}-${String(row.id || i).replace(/[^a-z0-9_-]/gi, "-")}-${i}`;
      const root = listEl.querySelector(`[data-related-id="${itemId}"]`);
      if (!root) return;
      const snippetEl = root.querySelector("[data-rel-snippet]");
      const countEl = root.querySelector("[data-rel-count]");
      const linkEl = root.querySelector("[data-rel-link]");
      const prevBtn = root.querySelector("[data-rel-prev]");
      const nextBtn = root.querySelector("[data-rel-next]");
      const hits = asItems(row.matches).length ? asItems(row.matches) : [row];
      let at = 0;
      const currentHit = () => hits[at] || hits[0];
      const currentHref = () => toHref(row.id, currentHit());
      const paint = () => {
        const h = currentHit();
        if (!h) return;
        const href = currentHref();
        if (snippetEl) snippetEl.innerHTML = String(h.snippet || "");
        if (countEl) countEl.textContent = `${at + 1}/${hits.length}`;
        if (linkEl) linkEl.href = href;
        root.setAttribute("data-rel-href", href);
      };
      if (prevBtn) {
        prevBtn.addEventListener("click", () => {
          at = (at - 1 + hits.length) % hits.length;
          paint();
        });
      }
      if (nextBtn) {
        nextBtn.addEventListener("click", () => {
          at = (at + 1) % hits.length;
          paint();
        });
      }
      root.addEventListener("click", (ev) => {
        if (ev.target && ev.target.closest(".cards-related-btn, .cards-related-source")) return;
        const href = currentHref();
        if (href) window.location.href = href;
      });
      root.addEventListener("keydown", (ev) => {
        if (ev.key !== "Enter" && ev.key !== " ") return;
        ev.preventDefault();
        const href = currentHref();
        if (href) window.location.href = href;
      });
      if (linkEl) {
        linkEl.addEventListener("click", (ev) => {
          ev.preventDefault();
          const href = currentHref();
          if (href) window.location.href = href;
        });
      }
      paint();
    });
  };

  const ruleRelationCache = new Map();
  const findRelatedRules = async (cardName) => {
    const key = String(cardName || "").trim().toLowerCase();
    if (!key || !rulePageIds.length) return [];
    if (ruleRelationCache.has(key)) return ruleRelationCache.get(key);
    const relatedRuleDocs = await loadRelatedRuleDocs();
    if (!relatedRuleDocs.length) return [];
    const rows = findRelatedDocs(relatedRuleDocs, cardName);
    ruleRelationCache.set(key, rows);
    return rows;
  };

  const setupRange = (name, minInput, maxInput, valueEl, range) => {
    const wrap = minInput.parentElement;
    if (wrap) {
      minInput.classList.add("range-min");
      maxInput.classList.add("range-max");
    }
    minInput.min = String(range.min);
    minInput.max = String(range.max);
    maxInput.min = String(range.min);
    maxInput.max = String(range.max);

    const initial = state.ranges[name] || range;
    const initialMin = Math.max(range.min, Math.min(range.max, Number(initial.min)));
    const initialMax = Math.max(range.min, Math.min(range.max, Number(initial.max)));
    minInput.value = String(Math.min(initialMin, initialMax));
    maxInput.value = String(Math.max(initialMin, initialMax));
    const paint = (minVal, maxVal, from = "") => {
      const total = Math.max(1, range.max - range.min);
      const minPct = ((minVal - range.min) / total) * 100;
      const maxPct = ((maxVal - range.min) / total) * 100;
      if (wrap) {
        wrap.style.setProperty("--min-pct", `${Math.max(0, Math.min(100, minPct))}%`);
        wrap.style.setProperty("--max-pct", `${Math.max(0, Math.min(100, maxPct))}%`);
      }
      if (minVal === maxVal) {
        if (from === "min") {
          minInput.style.zIndex = "5";
          maxInput.style.zIndex = "4";
        } else {
          minInput.style.zIndex = "4";
          maxInput.style.zIndex = "5";
        }
      } else {
        minInput.style.zIndex = "4";
        maxInput.style.zIndex = "5";
      }
    };
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
      paint(minVal, maxVal, from);
      const isAny = minVal === range.min && maxVal === range.max;
      valueEl.textContent = isAny ? "Any" : `${minVal}-${maxVal}`;
      render(1);
    };
    minInput.addEventListener("input", () => sync("min"));
    maxInput.addEventListener("input", () => sync("max"));
    const bootMin = Number(minInput.value);
    const bootMax = Number(maxInput.value);
    state.ranges[name] = { min: bootMin, max: bootMax };
    paint(bootMin, bootMax, "max");
    valueEl.textContent =
      bootMin === range.min && bootMax === range.max ? "Any" : `${bootMin}-${bootMax}`;
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

  const getSorted = (rows, query = "") => {
    const listRows = [...rows];
    const dir = state.sortDir === "desc" ? -1 : 1;
    const q = markdownToPlain(query).toLowerCase().trim();
    const qTokens = q.split(/\s+/).filter(Boolean);
    const escapeRe = (s) => String(s || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const containsWord = (text, token) =>
      new RegExp(`(^|[^a-z0-9])${escapeRe(token)}(?=$|[^a-z0-9])`, "i").test(String(text || ""));
    const rankCache = new Map();
    const getSearchRank = (card) => {
      if (!qTokens.length) return null;
      const key = `${card.id || ""}::${card.publicCode || ""}::${card.name || ""}`;
      if (rankCache.has(key)) return rankCache.get(key);

      const name = markdownToPlain(card.name || "").toLowerCase();
      const hay = markdownToPlain(
        [
          card.name,
          card.publicCode,
          card.set,
          card.rarity,
          asItems(card.cardTypes).join(" "),
          asItems(card.superTypes).join(" "),
          asItems(card.domains).join(" "),
          asItems(card.tags).join(" "),
          card.abilityText,
        ]
          .filter(Boolean)
          .join("\n")
      ).toLowerCase();

      const exactName = name === q;
      const prefixName = !!q && name.startsWith(q);
      const allInName = qTokens.every((t) => name.includes(t));
      const allInNameAsWord = qTokens.every((t) => containsWord(name, t));
      const allInHay = qTokens.every((t) => hay.includes(t));
      const allInHayAsWord = qTokens.every((t) => containsWord(hay, t));

      let bucket = 99;
      if (exactName) bucket = 0;
      else if (prefixName) bucket = 1;
      else if (allInNameAsWord) bucket = 2;
      else if (allInName) bucket = 3;
      else if (allInHayAsWord) bucket = 4;
      else if (allInHay) bucket = 5;

      const rank = {
        bucket,
        namePos: name.indexOf(qTokens[0] || ""),
        hayPos: hay.indexOf(qTokens[0] || ""),
      };
      rankCache.set(key, rank);
      return rank;
    };

    listRows.sort((a, b) => {
      if (qTokens.length) {
        const ar = getSearchRank(a);
        const br = getSearchRank(b);
        if (ar && br) {
          let relCmp = ar.bucket - br.bucket;
          if (relCmp === 0) relCmp = (ar.namePos < 0 ? 9999 : ar.namePos) - (br.namePos < 0 ? 9999 : br.namePos);
          if (relCmp === 0) relCmp = (ar.hayPos < 0 ? 9999 : ar.hayPos) - (br.hayPos < 0 ? 9999 : br.hayPos);
          if (relCmp !== 0) return relCmp;
        }
      }

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
      }),
      state.query
    );
  };

  const resetCardsFilters = () => {
    state.query = "";
    state.sortKey = "card";
    state.sortDir = "asc";
    state.sets.clear();
    state.types.clear();
    state.supertypes.clear();
    state.variants.clear();
    state.rarities.clear();
    state.domains.clear();
    state.ranges = {
      energy: { ...limits.energy },
      power: { ...limits.power },
      might: { ...limits.might },
    };
    state.page = 1;

    searchInput.value = "";
    sortKeySelect.value = "card";
    sortDirBtn.textContent = "Asc";
    paintDomainButtons();

    [
      [setLabel, state.sets],
      [typeLabel, state.types],
      [supertypeLabel, state.supertypes],
      [variantLabel, state.variants],
      [rarityLabel, state.rarities],
    ].forEach(([labelEl, selected]) => {
      if (!labelEl) return;
      labelEl.textContent = selected.size ? `${selected.size} selected` : "All";
    });

    [
      [energyMin, energyMax, limits.energy, energyValue, "energy"],
      [powerMin, powerMax, limits.power, powerValue, "power"],
      [mightMin, mightMax, limits.might, mightValue, "might"],
    ].forEach(([minEl, maxEl, limit, valueEl, key]) => {
      minEl.value = String(limit.min);
      maxEl.value = String(limit.max);
      state.ranges[key] = { min: limit.min, max: limit.max };
      const wrap = minEl.parentElement;
      if (wrap) {
        wrap.style.setProperty("--min-pct", "0%");
        wrap.style.setProperty("--max-pct", "100%");
      }
      valueEl.textContent = "Any";
    });
  };

  const renderActiveFilterChips = () => {
    const chips = [];
    if (state.query.trim()) chips.push({ key: "query", value: "1", label: `Search: ${state.query.trim()}` });
    if (state.sortKey !== "card") chips.push({ key: "sortKey", value: state.sortKey, label: `Sort: ${state.sortKey}` });
    if (state.sortDir !== "asc") chips.push({ key: "sortDir", value: state.sortDir, label: `Dir: ${state.sortDir}` });

    const pushSet = (key, values, prefix) => {
      Array.from(values || []).sort().forEach((v) => chips.push({ key, value: v, label: `${prefix}: ${v}` }));
    };
    pushSet("domains", state.domains, "Domain");
    pushSet("sets", state.sets, "Set");
    pushSet("types", state.types, "Type");
    pushSet("supertypes", state.supertypes, "Supertype");
    pushSet("variants", state.variants, "Variant");
    pushSet("rarities", state.rarities, "Rarity");

    ["energy", "power", "might"].forEach((stat) => {
      const range = state.ranges[stat];
      const limit = limits[stat];
      if (range.min !== limit.min || range.max !== limit.max) {
        chips.push({ key: `${stat}Range`, value: stat, label: `${stat}: ${range.min}-${range.max}` });
      }
    });

    if (!chips.length) {
      activeFiltersWrap.hidden = true;
      activeFiltersWrap.innerHTML = "";
      return;
    }

    activeFiltersWrap.hidden = false;
    activeFiltersWrap.innerHTML = chips
      .map(
        (chip) => `<button type="button" class="cards-chip" data-chip-key="${escapeHtml(chip.key)}" data-chip-value="${escapeHtml(
          chip.value
        )}" aria-label="Remove ${escapeHtml(chip.label)}">${escapeHtml(chip.label)} <span aria-hidden="true">×</span></button>`
      )
      .join("");
  };

  const removeChip = (key, value) => {
    if (key === "query") state.query = "";
    else if (key === "sortKey") state.sortKey = "card";
    else if (key === "sortDir") state.sortDir = "asc";
    else if (key === "domains") state.domains.delete(value);
    else if (key === "sets") state.sets.delete(value);
    else if (key === "types") state.types.delete(value);
    else if (key === "supertypes") state.supertypes.delete(value);
    else if (key === "variants") state.variants.delete(value);
    else if (key === "rarities") state.rarities.delete(value);
    else if (key.endsWith("Range")) {
      const stat = value;
      if (limits[stat]) state.ranges[stat] = { ...limits[stat] };
    }

    searchInput.value = state.query;
    sortKeySelect.value = state.sortKey;
    sortDirBtn.textContent = state.sortDir === "asc" ? "Asc" : "Desc";

    setLabel.textContent = state.sets.size === 1 ? Array.from(state.sets)[0] : state.sets.size ? `${state.sets.size} selected` : "All";
    typeLabel.textContent = state.types.size === 1 ? Array.from(state.types)[0] : state.types.size ? `${state.types.size} selected` : "All";
    supertypeLabel.textContent =
      state.supertypes.size === 1
        ? Array.from(state.supertypes)[0]
        : state.supertypes.size
          ? `${state.supertypes.size} selected`
          : "All";
    variantLabel.textContent =
      state.variants.size === 1 ? Array.from(state.variants)[0] : state.variants.size ? `${state.variants.size} selected` : "All";
    rarityLabel.textContent =
      state.rarities.size === 1 ? Array.from(state.rarities)[0] : state.rarities.size ? `${state.rarities.size} selected` : "All";

    const syncRangeControl = (minEl, maxEl, valueEl, stat) => {
      const limit = limits[stat];
      const range = state.ranges[stat] || limit;
      minEl.value = String(range.min);
      maxEl.value = String(range.max);
      const total = Math.max(1, limit.max - limit.min);
      const minPct = ((range.min - limit.min) / total) * 100;
      const maxPct = ((range.max - limit.min) / total) * 100;
      const wrap = minEl.parentElement;
      if (wrap) {
        wrap.style.setProperty("--min-pct", `${Math.max(0, Math.min(100, minPct))}%`);
        wrap.style.setProperty("--max-pct", `${Math.max(0, Math.min(100, maxPct))}%`);
      }
      valueEl.textContent = range.min === limit.min && range.max === limit.max ? "Any" : `${range.min}-${range.max}`;
    };
    syncRangeControl(energyMin, energyMax, energyValue, "energy");
    syncRangeControl(powerMin, powerMax, powerValue, "power");
    syncRangeControl(mightMin, mightMax, mightValue, "might");

    paintDomainButtons();
  };

  const pageSize = 24;

  const openCardModal = async (cardId) => {
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
    const relatedFaq = findRelatedDocs(faqs, card.name, "faq");
    const relatedErrata = findRelatedDocs(errata, card.name, "errata");
    const relatedRules = await findRelatedRules(card.name);
    renderRelatedDocs(relatedFaq, modalFaqWrap, modalFaqList, "faq");
    renderRelatedDocs(relatedErrata, modalErrataWrap, modalErrataList, "errata");
    renderRelatedDocs(relatedRules, modalRulesWrap, modalRulesList, "rule");
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
    renderActiveFilterChips();
    syncCardsUrlState();
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

  filterClear.addEventListener("click", () => {
    closeMultiMenus();
    resetCardsFilters();
    render(1);
  });

  activeFiltersWrap.addEventListener("click", (ev) => {
    const btn = ev.target && ev.target.closest ? ev.target.closest(".cards-chip") : null;
    if (!btn) return;
    const key = btn.getAttribute("data-chip-key") || "";
    const value = btn.getAttribute("data-chip-value") || "";
    removeChip(key, value);
    render(1);
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

  render(state.page);
}
  window.cardsPage = {
    ...(window.cardsPage || {}),
    initCardsPage,
  };
})();

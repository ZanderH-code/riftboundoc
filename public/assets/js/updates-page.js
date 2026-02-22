(function () {
  const fallbackDeps = {
    q: (selector) => document.querySelector(selector),
    route: (path) => {
      const clean = String(path || "").replace(/^\/+/, "");
      return `/${clean}`;
    },
    getJson: (_path, fallback = null) => Promise.resolve(fallback),
    asItems: (list) => (Array.isArray(list) ? list : []),
    formatDate: (value) => String(value || "-"),
    escapeHtml: (text) =>
      String(text || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/\"/g, "&quot;")
        .replace(/'/g, "&#39;"),
    normalizeRuleIndex: (indexData) => {
      if (Array.isArray(indexData)) return indexData;
      if (indexData && typeof indexData === "object" && Array.isArray(indexData.rules)) return indexData.rules;
      return [];
    },
    resolveRuleLink: () => ({ href: "#", target: "", rel: "" }),
  };

  function resolveDeps(deps = {}) {
    return {
      ...fallbackDeps,
      ...deps,
    };
  }

  function deduplicateUpdateItems(items) {
    const canonical = new Map();
    const normalize = (value) =>
      String(value || "")
        .toLowerCase()
        .replace(/\([^)]*text version[^)]*\)/g, "")
        .replace(/\s+/g, " ")
        .trim();

    for (const item of asItems(items)) {
      const kind = String(item.kind || "").toLowerCase();
      const href = String(item.href || "");
      const titleKey = normalize(item.title || "");
      const pageMatch = href.match(/[?&]id=([^&#]+)/i);
      const pageId = pageMatch ? decodeURIComponent(pageMatch[1] || "") : "";
      const key = `${kind}|${pageId || titleKey}`;
      const prev = canonical.get(key);
      if (!prev) {
        canonical.set(key, item);
        continue;
      }
      const prevUpdated = String(prev.updatedAt || "");
      const nextUpdated = String(item.updatedAt || "");
      if (nextUpdated > prevUpdated) {
        canonical.set(key, item);
        continue;
      }
      if (
        nextUpdated === prevUpdated &&
        href.includes("/pages/?id=") &&
        !String(prev.href || "").includes("/pages/?id=")
      ) {
        canonical.set(key, item);
      }
    }

    return Array.from(canonical.values()).sort((a, b) =>
      String(b.updatedAt || "").localeCompare(String(a.updatedAt || ""))
    );
  }

  async function initUpdatesPage(deps = {}) {
    const { q, route, getJson, asItems, formatDate, escapeHtml, normalizeRuleIndex, resolveRuleLink } =
      resolveDeps(deps);
    const wrap = q("#updates-list");
    const filterRoot = q("#updates-type-filters");
    if (!wrap) return;

    const pages = await getJson("data/pages.json", []);
    const faqs = await getJson("data/faqs.json", []);
    const errata = await getJson("data/errata.json", []);
    const rulesIndex = await getJson("content/rules/index.json", { rules: [] });
    const rules = normalizeRuleIndex(rulesIndex);

    const items = deduplicateUpdateItems([
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
    ]);

    const renderUpdates = (kind = "all") => {
      const normalized = String(kind || "all").toLowerCase();
      const rows =
        normalized === "all"
          ? items
          : items.filter((it) => String(it.kind || "").toLowerCase() === normalized);

      wrap.innerHTML = rows
        .map(
          (it) => `
    <article class="item">
      <h3><a href="${it.href}">${escapeHtml(it.title)}</a></h3>
      <p class="muted">Type: ${it.kind} | Updated: ${formatDate(it.updatedAt)}</p>
    </article>
  `
        )
        .join("");
    };

    if (filterRoot) {
      filterRoot.querySelectorAll(".updates-type-btn").forEach((btn) => {
        btn.addEventListener("click", () => {
          const kind = String(btn.getAttribute("data-kind") || "all").toLowerCase();
          filterRoot.querySelectorAll(".updates-type-btn").forEach((b) => b.classList.remove("active"));
          btn.classList.add("active");
          renderUpdates(kind);
        });
      });
    }

    renderUpdates("all");
  }

  window.updatesPage = {
    ...(window.updatesPage || {}),
    deduplicateUpdateItems,
    initUpdatesPage,
  };
})();

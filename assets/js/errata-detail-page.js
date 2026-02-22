(function () {
  const fallbackDeps = {
    q: (selector) => document.querySelector(selector),
    getJson: (_path, fallback = null) => Promise.resolve(fallback),
    sortByUpdated: (items) =>
      Array.isArray(items)
        ? [...items].sort((a, b) => String(b.updatedAt || "").localeCompare(String(a.updatedAt || "")))
        : [],
    formatDate: (value) => String(value || "-"),
    normalizeDocumentMarkdown: (markdown) => String(markdown || ""),
    buildTocFor: () => {},
    highlightQueryIn: () => {},
    initReaderPrefs: () => {},
    initMobileTocDrawer: () => {},
  };

  function resolveDeps(deps = {}) {
    return {
      ...fallbackDeps,
      ...deps,
    };
  }

  async function initErrataDetailPage(deps = {}) {
    const {
      q,
      getJson,
      sortByUpdated,
      formatDate,
      normalizeDocumentMarkdown,
      buildTocFor,
      highlightQueryIn,
      initReaderPrefs,
      initMobileTocDrawer,
    } = resolveDeps(deps);
    const id = new URLSearchParams(window.location.search).get("id");
    const errata = await getJson("data/errata.json", []);
    const ordered = sortByUpdated(errata);
    const one = ordered.find((it) => it.id === id) || ordered[0];
    if (!one) return;

    if (q("#errata-title")) q("#errata-title").textContent = one.title || "Errata";
    if (q("#errata-meta")) {
      q("#errata-meta").textContent = `ID: ${one.id || "-"} | Published: ${formatDate(
        one.publishedAt
      )} | Updated: ${formatDate(one.updatedAt)}`;
    }
    if (q("#errata-source")) {
      q("#errata-source").innerHTML = `<a href="${one.originUrl || "#"}" target="_blank" rel="noopener noreferrer">Official Source</a>`;
    }

    const body = normalizeDocumentMarkdown(String(one.content || "").trim(), "errata");
    if (window.marked && typeof window.marked.parse === "function") {
      q("#errata-content").innerHTML = window.marked.parse(body);
    } else {
      q("#errata-content").innerHTML = `<pre>${body}</pre>`;
    }

    initReaderPrefs({
      onSettle: () => {
        buildTocFor("#errata-content", "#errata-toc");
        highlightQueryIn("#errata-content");
      },
    });
    buildTocFor("#errata-content", "#errata-toc");
    initMobileTocDrawer();
    highlightQueryIn("#errata-content");
  }

  window.errataDetailPage = {
    ...(window.errataDetailPage || {}),
    initErrataDetailPage,
  };
})();

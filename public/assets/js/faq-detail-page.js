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

  async function initFaqDetailPage(deps = {}) {
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
    const faqs = await getJson("data/faqs.json", []);
    const ordered = sortByUpdated(faqs);
    const one = ordered.find((it) => it.id === id) || ordered[0];
    if (!one) return;

    if (q("#faq-title")) q("#faq-title").textContent = one.title || "FAQ";
    if (q("#faq-meta")) {
      q("#faq-meta").textContent = `ID: ${one.id || "-"} | Published: ${formatDate(
        one.publishedAt
      )} | Updated: ${formatDate(one.updatedAt)}`;
    }
    if (q("#faq-source")) {
      q("#faq-source").innerHTML = `<a href="${one.originUrl || "#"}" target="_blank" rel="noopener noreferrer">Official Source</a>`;
    }
    let body = String(one.content || "").trim();
    body = normalizeDocumentMarkdown(body, "faq");
    if (window.marked && typeof window.marked.parse === "function") {
      q("#faq-content").innerHTML = window.marked.parse(body);
    } else {
      q("#faq-content").innerHTML = `<pre>${body}</pre>`;
    }

    initReaderPrefs();
    buildTocFor("#faq-content", "#faq-toc");
    initMobileTocDrawer();
    highlightQueryIn("#faq-content");
  }

  window.faqDetailPage = {
    ...(window.faqDetailPage || {}),
    initFaqDetailPage,
  };
})();

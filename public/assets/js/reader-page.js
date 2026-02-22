(function () {
  const fallbackDeps = {
    q: (selector) => document.querySelector(selector),
    route: (path) => {
      const clean = String(path || "").replace(/^\/+/, "");
      return `/${clean}`;
    },
    withQuery: (href, key, value) => {
      const url = new URL(href, window.location.href);
      if (value) url.searchParams.set(key, value);
      return url.pathname + (url.search || "");
    },
    getJson: (_path, fallback = null) => Promise.resolve(fallback),
    normalizeRuleIndex: (indexData) => {
      if (Array.isArray(indexData)) return indexData;
      if (indexData && typeof indexData === "object" && Array.isArray(indexData.rules)) return indexData.rules;
      return [];
    },
    normalizeCardsData: (data) => {
      if (Array.isArray(data)) return data;
      if (data && typeof data === "object" && Array.isArray(data.cards)) return data.cards;
      return [];
    },
    buildSearchIndex: () => Promise.resolve([]),
    searchDocs: () => [],
    escapeHtml: (text) =>
      String(text || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;"),
  };

  function resolveDeps(deps = {}) {
    return {
      ...fallbackDeps,
      ...deps,
    };
  }

  function initReaderPage(deps = {}) {
    const {
      q,
      route,
      withQuery,
      getJson,
      normalizeRuleIndex,
      normalizeCardsData,
      buildSearchIndex,
      searchDocs,
      escapeHtml,
    } = resolveDeps(deps);
    const keys = {
      lastSrc: "rb_reader_last_src",
      lastPage: "rb_reader_last_page",
      bookmarks: "rb_reader_bookmarks_v1",
      immersive: "rb_reader_immersive",
    };
    const params = new URLSearchParams(window.location.search);
    const lastSrc = localStorage.getItem(keys.lastSrc) || "";
    const src = params.get("src") || lastSrc;
    if (!src) {
      q("#reader-wrap").innerHTML =
        '<p class="muted">Open from the Rules page or use ?src=PDF_URL.</p>';
      return;
    }

    const fallbackLink = q("#reader-fallback");
    const title = decodeURIComponent(src).split("/").pop() || "PDF Reader";
    q("#reader-title").textContent = title;
    localStorage.setItem(keys.lastSrc, src);

    const readBookmarks = () => {
      try {
        const raw = localStorage.getItem(keys.bookmarks);
        const rows = raw ? JSON.parse(raw) : [];
        return Array.isArray(rows) ? rows : [];
      } catch {
        return [];
      }
    };
    const saveBookmarks = (rows) => {
      localStorage.setItem(keys.bookmarks, JSON.stringify(rows));
    };
    const buildReaderHref = (page) => route(`reader/?src=${encodeURIComponent(src)}&page=${page}`);
    const srcWithPage = (page) => {
      const base = String(src).split("#")[0];
      return `${base}#page=${page}`;
    };
    const getStoredPage = () => Number(localStorage.getItem(`${keys.lastPage}:${src}`) || 1);
    const pageFromUrl = Number(params.get("page") || 0);
    let currentPage = Number.isFinite(pageFromUrl) && pageFromUrl > 0 ? pageFromUrl : getStoredPage();
    if (!Number.isFinite(currentPage) || currentPage <= 0) currentPage = 1;

    const pageInput = q("#reader-page");
    const goBtn = q("#reader-go");
    const retryBtn = q("#reader-retry");
    const shareBtn = q("#reader-share");
    const addBookmarkBtn = q("#reader-bookmark-add");
    const immersiveBtn = q("#reader-immersive");
    const meta = q("#reader-meta");
    const frame = q("#pdf-view");
    const bookmarkList = q("#reader-bookmarks");
    const searchInput = q("#reader-search-input");
    const searchBtn = q("#reader-search-btn");
    const searchMeta = q("#reader-search-meta");
    const searchResults = q("#reader-search-results");

    const updateUrl = (page) => {
      const next = new URL(window.location.href);
      next.searchParams.set("src", src);
      next.searchParams.set("page", String(page));
      window.history.replaceState({}, "", next.pathname + next.search);
    };
    const renderBookmarks = () => {
      if (!bookmarkList) return;
      const rows = readBookmarks()
        .filter((x) => x && x.src === src)
        .sort((a, b) => Number(a.page) - Number(b.page));
      if (!rows.length) {
        bookmarkList.innerHTML = '<article class="item"><p class="muted">No bookmarks yet.</p></article>';
        return;
      }
      bookmarkList.innerHTML = rows
        .map(
          (x, idx) => `
      <article class="item">
        <h3 style="margin: 0 0 6px">Page ${Number(x.page)}</h3>
        <p class="muted" style="margin: 0">${x.createdAt || ""}</p>
        <div class="toolbar" style="margin-top: 8px">
          <button type="button" class="secondary" data-bm-open="${idx}">Open</button>
          <button type="button" class="secondary" data-bm-del="${idx}">Delete</button>
        </div>
      </article>
    `
        )
        .join("");
      bookmarkList.querySelectorAll("[data-bm-open]").forEach((btn) => {
        btn.addEventListener("click", () => {
          const rowsNow = readBookmarks().filter((x) => x && x.src === src);
          const one = rowsNow[Number(btn.getAttribute("data-bm-open"))];
          if (one) loadPage(Number(one.page) || 1);
        });
      });
      bookmarkList.querySelectorAll("[data-bm-del]").forEach((btn) => {
        btn.addEventListener("click", () => {
          const filtered = readBookmarks();
          const scoped = filtered.filter((x) => x && x.src === src);
          const one = scoped[Number(btn.getAttribute("data-bm-del"))];
          if (!one) return;
          saveBookmarks(
            filtered.filter(
              (x) =>
                !(
                  x &&
                  x.src === one.src &&
                  Number(x.page) === Number(one.page) &&
                  x.createdAt === one.createdAt
                )
            )
          );
          renderBookmarks();
        });
      });
    };
    const loadPage = (page) => {
      const safe = Number.isFinite(page) && page > 0 ? Math.floor(page) : 1;
      currentPage = safe;
      if (pageInput) pageInput.value = String(safe);
      if (frame) frame.src = srcWithPage(safe);
      localStorage.setItem(`${keys.lastPage}:${src}`, String(safe));
      updateUrl(safe);
      if (meta) meta.textContent = `Reading page ${safe}. Progress saved automatically.`;
    };

    if (fallbackLink) fallbackLink.href = route("rules/");
    if (pageInput) pageInput.value = String(currentPage);
    loadPage(currentPage);
    renderBookmarks();

    if (goBtn) {
      goBtn.addEventListener("click", () => {
        const v = Number(pageInput?.value || 1);
        loadPage(v);
      });
    }
    if (pageInput) {
      pageInput.addEventListener("keydown", (ev) => {
        if (ev.key === "Enter") loadPage(Number(pageInput.value || 1));
      });
    }
    if (retryBtn) {
      retryBtn.addEventListener("click", () => loadPage(currentPage));
    }
    if (shareBtn) {
      shareBtn.addEventListener("click", async () => {
        const href = new URL(buildReaderHref(currentPage), window.location.origin).toString();
        try {
          await navigator.clipboard.writeText(href);
          if (meta) meta.textContent = "Share link copied.";
        } catch {
          if (meta) meta.textContent = `Share link: ${href}`;
        }
      });
    }
    if (addBookmarkBtn) {
      addBookmarkBtn.addEventListener("click", () => {
        const rows = readBookmarks();
        const one = {
          src,
          page: currentPage,
          createdAt: new Date().toISOString().slice(0, 16).replace("T", " "),
        };
        rows.push(one);
        saveBookmarks(rows);
        renderBookmarks();
        if (meta) meta.textContent = `Bookmarked page ${currentPage}.`;
      });
    }

    const applyImmersive = () => {
      const on = localStorage.getItem(keys.immersive) === "1";
      document.body.classList.toggle("reader-immersive", on);
      if (immersiveBtn) immersiveBtn.textContent = on ? "Exit Immersive" : "Immersive";
    };
    applyImmersive();
    if (immersiveBtn) {
      immersiveBtn.addEventListener("click", () => {
        const next = localStorage.getItem(keys.immersive) === "1" ? "0" : "1";
        localStorage.setItem(keys.immersive, next);
        applyImmersive();
      });
    }

    const runSearch = async () => {
      const query = String(searchInput?.value || "").trim();
      if (!query) {
        if (searchMeta) searchMeta.textContent = "Type a keyword to search rule content.";
        if (searchResults) searchResults.innerHTML = "";
        return;
      }
      const pages = await getJson("data/pages.json", []);
      const faqs = await getJson("data/faqs.json", []);
      const errata = await getJson("data/errata.json", []);
      const rulesIndex = await getJson("content/rules/index.json", { rules: [] });
      const rules = normalizeRuleIndex(rulesIndex);
      const cardsRaw = await getJson("data/cards.json", { cards: [] });
      const cards = normalizeCardsData(cardsRaw);
      const docs = await buildSearchIndex(pages, faqs, errata, rules, cards);
      const hits = searchDocs(query, docs, { kind: "Rule", mode: "hits" }).slice(0, 20);
      if (searchMeta) searchMeta.textContent = `${hits.length} rule hit(s) for "${query}".`;
      if (!searchResults) return;
      if (!hits.length) {
        searchResults.innerHTML = '<article class="item"><p class="muted">No matches in rules.</p></article>';
        return;
      }
      searchResults.innerHTML = hits
        .map(
          (r) => `
      <article class="item search-result">
        <h3 style="margin:0 0 6px"><a href="${withQuery(r.href, "q", query)}">${escapeHtml(r.title)}</a></h3>
        <p class="result-snippet">${r.snippet || ""}</p>
      </article>
    `
        )
        .join("");
    };
    if (searchBtn) searchBtn.addEventListener("click", runSearch);
    if (searchInput) {
      searchInput.addEventListener("keydown", (ev) => {
        if (ev.key === "Enter") runSearch();
      });
    }
  }

  window.readerPage = {
    ...(window.readerPage || {}),
    initReaderPage,
  };
})();

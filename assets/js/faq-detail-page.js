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

  function findBestCardMatch(contextText, cards) {
    const hay = String(contextText || "").toLowerCase();
    if (!hay) return null;
    let best = null;
    for (const card of cards) {
      const name = String(card.name || "").toLowerCase().trim();
      if (!name || name.length < 3) continue;
      if (!hay.includes(name)) continue;
      if (!best || name.length > best.name.length) best = { card, name };
    }
    return best ? best.card : null;
  }

  function buildCardEmbed(card) {
    const image = String(card.imageUrl || "");
    const code = String(card.publicCode || card.id || "").trim();
    const setName = String(card.set || "").trim();
    const href = `../cards/?q=${encodeURIComponent(card.name || "")}`;
    return `
      <figure class="faq-card-embed">
        <a class="faq-card-embed-link" href="${href}">
          <img class="faq-card-embed-image" src="${image}" alt="${String(card.name || "Card")}" loading="lazy" />
          <figcaption class="faq-card-embed-meta">
            <strong>${String(card.name || "Card")}</strong>
            <span>${code}${setName ? ` · ${setName}` : ""}</span>
          </figcaption>
        </a>
      </figure>
    `;
  }

  async function replaceFaqImagesWithCardEmbeds(root, getJson) {
    if (!root) return;
    const images = Array.from(root.querySelectorAll("img")).filter((img) =>
      String(img.src || "").includes("cmsassets.rgpub.io")
    );
    if (!images.length) return;
    const payload = await getJson("data/cards.json", {});
    const cards = Array.isArray(payload?.cards) ? payload.cards : [];
    if (!cards.length) return;
    for (const img of images) {
      const context = [
        img.closest("p")?.textContent || "",
        img.closest("li")?.textContent || "",
        img.previousElementSibling?.textContent || "",
        img.nextElementSibling?.textContent || "",
        img.parentElement?.previousElementSibling?.textContent || "",
        img.parentElement?.nextElementSibling?.textContent || "",
      ].join(" ");
      const card = findBestCardMatch(context, cards);
      if (!card || !card.imageUrl) continue;
      const wrapper = document.createElement("div");
      wrapper.innerHTML = buildCardEmbed(card).trim();
      const node = wrapper.firstElementChild;
      if (!node) continue;
      const parent = img.parentElement;
      parent.replaceChild(node, img);
    }
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
    await replaceFaqImagesWithCardEmbeds(q("#faq-content"), getJson);

    initReaderPrefs({
      onSettle: () => {
        buildTocFor("#faq-content", "#faq-toc");
        highlightQueryIn("#faq-content");
      },
    });
    buildTocFor("#faq-content", "#faq-toc");
    initMobileTocDrawer();
    highlightQueryIn("#faq-content");
  }

  window.faqDetailPage = {
    ...(window.faqDetailPage || {}),
    initFaqDetailPage,
  };
})();

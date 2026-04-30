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

  function normalizeName(value) {
    return String(value || "")
      .toLowerCase()
      .replace(/[^a-z0-9' -]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function scoreNameMatch(a, b) {
    const x = normalizeName(a);
    const y = normalizeName(b);
    if (!x || !y) return 0;
    if (x === y) return 1;
    if (x.includes(y) || y.includes(x)) return 0.92;
    const xs = new Set(x.split(" "));
    const ys = new Set(y.split(" "));
    let inter = 0;
    for (const t of xs) if (ys.has(t)) inter += 1;
    return (2 * inter) / (xs.size + ys.size);
  }

  function bestCardByName(candidate, cards) {
    let best = null;
    let bestScore = 0;
    for (const card of cards) {
      const s = scoreNameMatch(candidate, card.name || "");
      if (s > bestScore) {
        bestScore = s;
        best = card;
      }
    }
    return bestScore >= 0.62 ? best : null;
  }

  async function ensureTesseract() {
    if (window.Tesseract) return window.Tesseract;
    await new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = "https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js";
      s.onload = resolve;
      s.onerror = reject;
      document.head.appendChild(s);
    });
    return window.Tesseract;
  }

  function detectCardBounds(imageData, width, height) {
    const d = imageData.data;
    let minX = width;
    let minY = height;
    let maxX = 0;
    let maxY = 0;
    for (let y = 0; y < height; y += 2) {
      for (let x = 0; x < width; x += 2) {
        const i = (y * width + x) * 4;
        const r = d[i];
        const g = d[i + 1];
        const b = d[i + 2];
        const spread = Math.max(r, g, b) - Math.min(r, g, b);
        if (spread > 18 || (r > 160 && g < 120)) {
          if (x < minX) minX = x;
          if (y < minY) minY = y;
          if (x > maxX) maxX = x;
          if (y > maxY) maxY = y;
        }
      }
    }
    if (maxX <= minX || maxY <= minY) return null;
    return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
  }

  async function extractCardNameFromImage(imgUrl) {
    const Tesseract = await ensureTesseract();
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.referrerPolicy = "no-referrer";
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = reject;
      img.src = imgUrl;
    });
    const c = document.createElement("canvas");
    c.width = img.naturalWidth;
    c.height = img.naturalHeight;
    const ctx = c.getContext("2d", { willReadFrequently: true });
    ctx.drawImage(img, 0, 0);
    const bounds = detectCardBounds(ctx.getImageData(0, 0, c.width, c.height), c.width, c.height) || {
      x: Math.floor(c.width * 0.45),
      y: 0,
      w: Math.floor(c.width * 0.53),
      h: c.height,
    };
    const rx = Math.floor(bounds.x + bounds.w * 0.12);
    const ry = Math.floor(bounds.y + bounds.h * 0.64);
    const rw = Math.floor(bounds.w * 0.76);
    const rh = Math.floor(bounds.h * 0.16);
    const n = document.createElement("canvas");
    n.width = rw * 2;
    n.height = rh * 2;
    const nx = n.getContext("2d", { willReadFrequently: true });
    nx.drawImage(c, rx, ry, rw, rh, 0, 0, n.width, n.height);
    const image = nx.getImageData(0, 0, n.width, n.height);
    for (let i = 0; i < image.data.length; i += 4) {
      const v = (image.data[i] + image.data[i + 1] + image.data[i + 2]) / 3;
      const boost = v > 120 ? 255 : 0;
      image.data[i] = boost;
      image.data[i + 1] = boost;
      image.data[i + 2] = boost;
    }
    nx.putImageData(image, 0, 0);
    const { data } = await Tesseract.recognize(n, "eng", {
      tessedit_char_whitelist: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz' -",
    });
    return String(data?.text || "").replace(/\s+/g, " ").trim();
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
      let card = null;
      try {
        const ocrName = await extractCardNameFromImage(img.src);
        card = bestCardByName(ocrName, cards);
      } catch (_e) {}
      if (!card) {
      const context = [
        img.closest("p")?.textContent || "",
        img.closest("li")?.textContent || "",
        img.previousElementSibling?.textContent || "",
        img.nextElementSibling?.textContent || "",
        img.parentElement?.previousElementSibling?.textContent || "",
        img.parentElement?.nextElementSibling?.textContent || "",
      ].join(" ");
      card = findBestCardMatch(context, cards);
      }
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

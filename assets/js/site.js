const q = (selector) => document.querySelector(selector);
const today = () => new Date().toISOString().slice(0, 10);

async function getJson(path, fallback = null) {
  try {
    const res = await fetch(path, { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (error) {
    console.warn(`Read failed: ${path}`, error);
    return fallback;
  }
}

function navActive() {
  const name = window.location.pathname.split("/").pop() || "index.html";
  document.querySelectorAll("nav a").forEach((a) => {
    if (a.getAttribute("href") === name) a.classList.add("active");
  });
}

function asItems(list) {
  return Array.isArray(list) ? list : [];
}

function sortByUpdated(items) {
  return [...asItems(items)].sort((a, b) =>
    String(b.updatedAt || "").localeCompare(String(a.updatedAt || ""))
  );
}

function slugify(text) {
  return String(text || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

function markdownToPlain(text) {
  return String(text || "")
    .replace(/\[\[([^\]]+)\]\]\(([^)]+)\)/g, "$1")
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1")
    .replace(/^#+\s*/gm, "")
    .replace(/[*_`>-]/g, "")
    .replace(/^Download Card Errata\s*/i, "")
    .replace(/\s+/g, " ")
    .trim();
}

function docPreview(item, maxLen = 180) {
  const raw = item.summary || item.content || item.answer || item.question || "";
  const plain = markdownToPlain(raw);
  if (plain.length <= maxLen) return plain;
  return `${plain.slice(0, maxLen).trim()}...`;
}

function formatDate(value) {
  const raw = String(value || "").trim();
  if (!raw) return "-";
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return raw;
  return d.toISOString().slice(0, 10);
}

function renderFaq(items, target, options = {}) {
  const compact = Boolean(options.compact);
  if (!target) return;
  if (!asItems(items).length) {
    target.innerHTML =
      '<article class="item"><h3>No FAQ yet</h3><p class="muted">Add entries in data/faqs.json.</p></article>';
    return;
  }
  target.innerHTML = asItems(items)
    .map((it) => {
      // Backward compatibility for legacy flat QA rows.
      if (it.question || it.answer) {
        return `
      <article class="item">
        <h3>${it.question || "Untitled question"}</h3>
        <p>${it.answer || ""}</p>
        <p class="muted">Source: ${it.source || "Unknown"} | Updated: ${it.updatedAt || "-"}</p>
      </article>
    `;
      }
      const preview = docPreview(it, 180);
      return `
      <article class="item page-card" data-href="faq-detail.html?id=${encodeURIComponent(
        it.id || ""
      )}" tabindex="0" role="link">
        <h3>${it.title || "Untitled FAQ"}</h3>
        <p>${preview}</p>
        <p class="muted">Source: ${it.source || "Riftbound Official"} | Published: ${
          formatDate(it.publishedAt)
        } | Updated: ${formatDate(it.updatedAt)}</p>
        <a href="faq-detail.html?id=${encodeURIComponent(it.id || "")}">Read online</a>
      </article>
    `;
    })
    .join("");
}

function renderErrata(items, target, options = {}) {
  const compact = Boolean(options.compact);
  if (!target) return;
  if (!asItems(items).length) {
    target.innerHTML =
      '<article class="item"><h3>No errata yet</h3><p class="muted">Add entries in data/errata.json.</p></article>';
    return;
  }
  target.innerHTML = asItems(items)
    .map((it) => {
      const preview = docPreview(it, 180);

      if (compact) {
        return `
      <article class="item">
        <h3>${it.title || "Untitled errata"}</h3>
        <p>${preview}</p>
        <p class="muted">Source: ${it.source || "Riftbound Official"} | Published: ${
          formatDate(it.publishedAt)
        } | Updated: ${
          formatDate(it.updatedAt)
        }</p>
      </article>
    `;
      }
      return `
      <article class="item page-card" data-href="errata-detail.html?id=${encodeURIComponent(
        it.id || ""
      )}" tabindex="0" role="link">
        <h3>${it.title || "Untitled errata"}</h3>
        <p>${preview}</p>
        <p class="muted">Source: ${it.source || "Official"} | Published: ${
          formatDate(it.publishedAt)
        } | Updated: ${formatDate(it.updatedAt)}</p>
        <a href="errata-detail.html?id=${encodeURIComponent(it.id || "")}">Read online</a>
      </article>
    `;
    })
    .join("");
}

function renderRules(files, target) {
  if (!target) return;
  if (!asItems(files).length) {
    target.innerHTML =
      '<article class="item"><h3>No rules yet</h3><p class="muted">Add entries in content/rules/index.json.</p></article>';
    return;
  }
  target.innerHTML = asItems(files)
    .map((it) => {
      const link = resolveRuleLink(it);
      return `
      <article class="item page-card" data-href="${link.href}" tabindex="0" role="link">
        <h3>${it.title || it.name || "Untitled rule"}</h3>
        <p>${it.summary || ""}</p>
        <p class="muted">Source: ${it.source || "Manual"} | Updated: ${formatDate(it.updatedAt)}</p>
        <a href="${link.href}"${link.target ? ` target="${link.target}" rel="${link.rel}"` : ""}>Read online</a>
      </article>
    `
    })
    .join("");
}

function resolveRuleLink(item) {
  const kind = String(item.kind || item.type || "pdf").toLowerCase();
  if (kind === "page") {
    return {
      href: `page.html?id=${encodeURIComponent(item.pageId || item.id || "")}`,
      target: "",
      rel: "",
    };
  }
  if (kind === "external") {
    return {
      href: item.url || "#",
      target: "_blank",
      rel: "noopener noreferrer",
    };
  }
  return {
    href: `reader.html?src=${encodeURIComponent(item.url || "")}`,
    target: "",
    rel: "",
  };
}

function normalizeRuleIndex(indexData) {
  if (Array.isArray(indexData)) return indexData;
  if (!indexData || typeof indexData !== "object") return [];
  if (Array.isArray(indexData.rules)) return indexData.rules;
  if (Array.isArray(indexData.files)) {
    return indexData.files.map((it) => ({
      ...it,
      kind: it.kind || it.type || "pdf",
    }));
  }
  return [];
}

function renderPages(items, target) {
  if (!target) return;
  target.innerHTML = asItems(items)
    .map(
      (it) => `
      <article class="item page-card" data-href="page.html?id=${encodeURIComponent(
        it.id || ""
      )}" tabindex="0" role="link">
        <h3>${it.title || "Untitled page"}</h3>
        <p>${it.summary || ""}</p>
        <p class="muted">Updated: ${formatDate(it.updatedAt)}</p>
      </article>
    `
    )
    .join("");
}

function bindPageCards(container) {
  if (!container) return;
  container.querySelectorAll(".page-card").forEach((card) => {
    const go = () => {
      const href = card.getAttribute("data-href");
      if (href) window.location.href = href;
    };
    card.addEventListener("click", go);
    card.addEventListener("keydown", (ev) => {
      if (ev.key === "Enter" || ev.key === " ") {
        ev.preventDefault();
        go();
      }
    });
  });
}

function renderCoreRuleCard(pages, rules, target) {
  if (!target) return;
  const corePage =
    asItems(pages).find((it) => it.id === "riftbound-core-rules-v1-2") || asItems(pages)[0];
  const coreRuleEntry =
    asItems(rules).find((it) => String(it.pageId || it.id).includes("riftbound-core-rules-v1-2")) ||
    asItems(rules)[0];
  if (!corePage && !coreRuleEntry) {
    target.innerHTML =
      '<article class="item"><h3>Core Rules not found</h3><p class="muted">Add or update the core rule entry in data/pages.json or content/rules/index.json.</p></article>';
    return;
  }
  const href = corePage
    ? `page.html?id=${encodeURIComponent(corePage.id)}`
    : resolveRuleLink(coreRuleEntry).href;
  const title = corePage?.title || coreRuleEntry?.title || "Riftbound Core Rules";
  const summary =
    corePage?.summary ||
    coreRuleEntry?.summary ||
    "Official core rules text version for web reading.";
  target.innerHTML = `
    <article class="item page-card featured-card" data-href="${href}" tabindex="0" role="link">
      <h3>${title}</h3>
      <p>${summary}</p>
      <a href="${href}">Open Core Rules</a>
    </article>
  `;
}

function buildPageToc() {
  const toc = q("#page-toc");
  const content = q("#page-content");
  if (!toc || !content) return;

  const headings = Array.from(content.querySelectorAll("h2, h3, h4"));
  const ruleHeadings = Array.from(
    content.querySelectorAll(".rule-row.rule-chapter, .rule-row.rule-heading")
  );

  if (headings.length === 0 && ruleHeadings.length === 0) {
    toc.innerHTML = "<strong>On This Page</strong><p class=\"muted\">No headings found.</p>";
    return;
  }

  let html = "<strong>On This Page</strong>";
  headings.forEach((el, idx) => {
    if (!el.id) el.id = `${slugify(el.textContent) || "section"}-${idx + 1}`;
    const level = Number(el.tagName.slice(1));
    const margin = level === 2 ? 0 : level === 3 ? 14 : 28;
    html += `<a href=\"#${el.id}\" style=\"margin-left:${margin}px\">${el.textContent}</a>`;
  });

  ruleHeadings.forEach((row, idx) => {
    const idCell = row.querySelector(".rule-id");
    const textCell = row.querySelector(".rule-text");
    const label = `${idCell?.textContent || ""} ${textCell?.textContent || ""}`.trim();
    if (!label) return;
    if (!row.id) row.id = `rule-${slugify(label)}-${idx + 1}`;
    const level = row.classList.contains("level-0")
      ? 0
      : row.classList.contains("level-1")
      ? 14
      : 28;
    html += `<a href=\"#${row.id}\" style=\"margin-left:${level}px\">${label}</a>`;
  });
  toc.innerHTML = html;
}

async function initHome() {
  const pages = await getJson("data/pages.json", []);
  const faqs = await getJson("data/faqs.json", []);
  const errata = await getJson("data/errata.json", []);
  const rulesIndex = await getJson("content/rules/index.json", { rules: [] });
  const rules = normalizeRuleIndex(rulesIndex);

  const statsPages = q("#stats-pages");
  const statsFaq = q("#stats-faq");
  const statsErrata = q("#stats-errata");
  const statsRules = q("#stats-rules");
  const statsUpdate = q("#stats-update");
  if (statsPages) statsPages.textContent = asItems(pages).length;
  if (statsFaq) statsFaq.textContent = asItems(faqs).length;
  if (statsErrata) statsErrata.textContent = asItems(errata).length;
  if (statsRules) statsRules.textContent = asItems(rules).length;
  if (statsUpdate) statsUpdate.textContent = today();

  renderFaq(sortByUpdated(faqs).slice(0, 2), q("#home-faq"), { compact: true });
  renderErrata(sortByUpdated(errata).slice(0, 2), q("#home-errata"), { compact: true });
  const homePages = q("#home-pages");
  renderPages(sortByUpdated(pages).slice(0, 4), homePages);
  renderCoreRuleCard(pages, rules, q("#home-core-rule"));
  bindPageCards(homePages);
  bindPageCards(q("#home-faq"));
  bindPageCards(q("#home-errata"));
  bindPageCards(q("#home-core-rule"));
  bindPageCards(q(".hero .grid"));
}

async function initFaqPage() {
  const faqs = await getJson("data/faqs.json", []);
  const list = q("#faq-list");
  renderFaq(sortByUpdated(faqs), list);
  bindPageCards(list);
}

async function initFaqDetail() {
  const id = new URLSearchParams(window.location.search).get("id");
  const faqs = await getJson("data/faqs.json", []);
  const ordered = sortByUpdated(faqs);
  const one = ordered.find((it) => it.id === id) || ordered[0];
  if (!one) return;

  if (q("#faq-title")) q("#faq-title").textContent = one.title || "FAQ";
  if (q("#faq-meta")) {
    q("#faq-meta").textContent = `ID: ${one.id || "-"} | Published: ${formatDate(
      one.publishedAt
    )} | Updated: ${
      formatDate(one.updatedAt)
    }`;
  }
  if (q("#faq-source")) {
    q("#faq-source").innerHTML = `<a href="${one.originUrl || "#"}" target="_blank" rel="noopener noreferrer">Official Source</a>`;
  }
  const body = String(one.content || "").trim();
  if (window.marked && typeof window.marked.parse === "function") {
    q("#faq-content").innerHTML = window.marked.parse(body);
  } else {
    q("#faq-content").innerHTML = `<pre>${body}</pre>`;
  }
}

async function initRulePage() {
  const local = await getJson("content/rules/index.json", { rules: [] });
  const list = q("#rule-list");
  renderRules(sortByUpdated(normalizeRuleIndex(local)), list);
  bindPageCards(list);
}

async function initErrataPage() {
  const errata = await getJson("data/errata.json", []);
  const list = q("#errata-list");
  renderErrata(sortByUpdated(errata), list);
  bindPageCards(list);
}

async function initErrataDetail() {
  const id = new URLSearchParams(window.location.search).get("id");
  const errata = await getJson("data/errata.json", []);
  const ordered = sortByUpdated(errata);
  const one = ordered.find((it) => it.id === id) || ordered[0];
  if (!one) return;

  if (q("#errata-title")) q("#errata-title").textContent = one.title || "Errata";
  if (q("#errata-meta")) {
    q("#errata-meta").textContent = `ID: ${one.id || "-"} | Published: ${
      formatDate(one.publishedAt)
    } | Updated: ${formatDate(one.updatedAt)}`;
  }
  if (q("#errata-source")) {
    q("#errata-source").innerHTML = `<a href="${one.originUrl || "#"}" target="_blank" rel="noopener noreferrer">Official Source</a>`;
  }

  const body = String(one.content || "").trim();
  if (window.marked && typeof window.marked.parse === "function") {
    q("#errata-content").innerHTML = window.marked.parse(body);
  } else {
    q("#errata-content").innerHTML = `<pre>${body}</pre>`;
  }
}

function initReader() {
  const src = new URLSearchParams(window.location.search).get("src");
  if (!src) {
    q("#reader-wrap").innerHTML =
      '<p class="muted">Open from the Rules page or use ?src=PDF_URL.</p>';
    return;
  }
  q("#reader-title").textContent = decodeURIComponent(src).split("/").pop();
  q("#pdf-view").src = src;
}

async function initPage() {
  const id = new URLSearchParams(window.location.search).get("id");
  const pages = await getJson("data/pages.json", []);
  const ordered = sortByUpdated(pages);
  const one = ordered.find((it) => it.id === id) || ordered[0];
  if (!one) return;

  q("#page-title").textContent = one.title;
  q("#page-summary").textContent = one.summary || "";
  if (q("#doc-meta")) {
    q("#doc-meta").textContent = `Updated: ${formatDate(one.updatedAt)} | ID: ${one.id}`;
  }

  const md = await fetch(one.file, { cache: "no-store" }).then((r) => r.text());
  if (window.marked && typeof window.marked.parse === "function") {
    q("#page-content").innerHTML = window.marked.parse(md);
  } else {
    q("#page-content").innerHTML = `<pre>${md}</pre>`;
  }

  buildPageToc();
}

async function initPageList() {
  const pages = await getJson("data/pages.json", []);
  const pageList = q("#page-list");
  renderPages(sortByUpdated(pages), pageList);
  bindPageCards(pageList);
}

window.site = {
  navActive,
  initHome,
  initFaqPage,
  initFaqDetail,
  initRulePage,
  initErrataPage,
  initErrataDetail,
  initReader,
  initPage,
  initPageList,
};

const { q, route, getJson, navActive, asItems, sortByUpdated, formatDate, escapeHtml, showStatus } = window.rbCore;
const { renderFaq, renderErrata, renderRules, renderPages, normalizeRuleIndex, resolveRuleLink, bindPageCards } = window.rbRender;
const { buildTocFor, buildPageToc, highlightQueryIn, initContentsDrawer } = window.rbReading;

function initReaderPrefs() {
  const keys = {
    scale: "rb_reader_scale",
    line: "rb_reader_line",
    width: "rb_reader_width",
  };
  const root = document.documentElement;
  const apply = () => {
    root.style.setProperty("--reader-font-scale", localStorage.getItem(keys.scale) || "1");
    root.style.setProperty("--reader-line-height", localStorage.getItem(keys.line) || "1.72");
    root.style.setProperty("--reader-max-width", localStorage.getItem(keys.width) || "100%");
  };
  apply();

  const host = q("#reader-prefs");
  if (!host) return;
  host.innerHTML = `
    <div class="reader-prefs">
      <label>Font <input id="pref-scale" type="range" min="0.9" max="1.3" step="0.05" value="${localStorage.getItem(
        keys.scale
      ) || "1"}" /></label>
      <label>Line <input id="pref-line" type="range" min="1.4" max="2.0" step="0.05" value="${localStorage.getItem(
        keys.line
      ) || "1.72"}" /></label>
      <label>Width <input id="pref-width" type="range" min="60" max="100" step="5" value="${(
        localStorage.getItem(keys.width) || "100%"
      ).replace("%", "")}" /></label>
    </div>
  `;
  q("#pref-scale")?.addEventListener("input", (e) => {
    localStorage.setItem(keys.scale, e.target.value);
    apply();
  });
  q("#pref-line")?.addEventListener("input", (e) => {
    localStorage.setItem(keys.line, e.target.value);
    apply();
  });
  q("#pref-width")?.addEventListener("input", (e) => {
    localStorage.setItem(keys.width, `${e.target.value}%`);
    apply();
  });
}

function upsertMeta(name, content, attr = "name") {
  if (!content) return;
  let tag = document.head.querySelector(`meta[${attr}='${name}']`);
  if (!tag) {
    tag = document.createElement("meta");
    tag.setAttribute(attr, name);
    document.head.appendChild(tag);
  }
  tag.setAttribute("content", content);
}

function applySeoMeta({ title, description, canonicalPath }) {
  if (title) document.title = `${title} - Riftbound Hub`;
  if (description) {
    upsertMeta("description", description);
    upsertMeta("og:description", description, "property");
  }
  if (title) upsertMeta("og:title", title, "property");
  upsertMeta("og:type", "article", "property");
  if (canonicalPath) {
    const canonical = new URL(canonicalPath, window.location.origin).toString();
    upsertMeta("og:url", canonical, "property");
  }
}

async function initHome() {
  await window.rbHome.initHomePage();
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
    )} | Updated: ${formatDate(one.updatedAt)}`;
  }
  if (q("#faq-source")) {
    q("#faq-source").innerHTML = `<a href="${one.originUrl || "#"}" target="_blank" rel="noopener noreferrer">Official Source</a>`;
  }

  const body = String(one.content || "").trim();
  if (window.marked && typeof window.marked.parse === "function") {
    q("#faq-content").innerHTML = window.marked.parse(body);
  } else {
    q("#faq-content").innerHTML = `<pre>${escapeHtml(body)}</pre>`;
  }

  initReaderPrefs();
  buildTocFor("#faq-content", "#faq-toc");
  initContentsDrawer();
  highlightQueryIn("#faq-content");

  applySeoMeta({
    title: one.title || "FAQ",
    description: (one.summary || "Official Riftbound FAQ entry.").slice(0, 160),
    canonicalPath: route(`faq-detail/?id=${encodeURIComponent(one.id || "")}`),
  });
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
    q("#errata-meta").textContent = `ID: ${one.id || "-"} | Published: ${formatDate(
      one.publishedAt
    )} | Updated: ${formatDate(one.updatedAt)}`;
  }
  if (q("#errata-source")) {
    q("#errata-source").innerHTML = `<a href="${one.originUrl || "#"}" target="_blank" rel="noopener noreferrer">Official Source</a>`;
  }

  const body = String(one.content || "").trim();
  if (window.marked && typeof window.marked.parse === "function") {
    q("#errata-content").innerHTML = window.marked.parse(body);
  } else {
    q("#errata-content").innerHTML = `<pre>${escapeHtml(body)}</pre>`;
  }

  initReaderPrefs();
  buildTocFor("#errata-content", "#errata-toc");
  initContentsDrawer();
  highlightQueryIn("#errata-content");

  applySeoMeta({
    title: one.title || "Errata",
    description: (one.summary || "Official Riftbound errata entry.").slice(0, 160),
    canonicalPath: route(`errata-detail/?id=${encodeURIComponent(one.id || "")}`),
  });
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

  try {
    const md = await fetch(route(one.file), { cache: "no-store" }).then((r) => r.text());
    if (window.marked && typeof window.marked.parse === "function") {
      q("#page-content").innerHTML = window.marked.parse(md);
    } else {
      q("#page-content").innerHTML = `<pre>${escapeHtml(md)}</pre>`;
    }
  } catch {
    showStatus(`Failed to load page content: ${one.file}`);
  }

  buildPageToc();
  initReaderPrefs();
  initContentsDrawer();
  highlightQueryIn("#page-content");

  applySeoMeta({
    title: one.title || "Rule Page",
    description: (one.summary || "Riftbound rules text page.").slice(0, 160),
    canonicalPath: route(`pages/?id=${encodeURIComponent(one.id || "")}`),
  });
}

async function initPageList() {
  const pages = await getJson("data/pages.json", []);
  const pageList = q("#page-list");
  renderPages(sortByUpdated(pages), pageList);
  bindPageCards(pageList);
}

async function initUpdatesPage() {
  const wrap = q("#updates-list");
  if (!wrap) return;

  const pages = await getJson("data/pages.json", []);
  const faqs = await getJson("data/faqs.json", []);
  const errata = await getJson("data/errata.json", []);
  const rulesIndex = await getJson("content/rules/index.json", { rules: [] });
  const rules = normalizeRuleIndex(rulesIndex);

  const items = [
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
  ].sort((a, b) => String(b.updatedAt || "").localeCompare(String(a.updatedAt || "")));

  wrap.innerHTML = items
    .map(
      (it) => `
    <article class="item">
      <h3><a href="${it.href}">${escapeHtml(it.title)}</a></h3>
      <p class="muted">Type: ${it.kind} | Updated: ${formatDate(it.updatedAt)}</p>
    </article>
  `
    )
    .join("");
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
  initUpdatesPage,
};

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

function renderFaq(items, target) {
  target.innerHTML = asItems(items)
    .map(
      (it) => `
      <article class="item">
        <h3>${it.question || "Untitled question"}</h3>
        <p>${it.answer || ""}</p>
        <p class="muted">Source: ${it.source || "Unknown"} | Updated: ${it.updatedAt || "-"}</p>
      </article>
    `
    )
    .join("");
}

function renderRules(files, target) {
  target.innerHTML = asItems(files)
    .map(
      (it) => `
      <article class="item">
        <h3>${it.title || it.name || "Untitled file"}</h3>
        <p class="muted">Source: ${it.source || "Manual"} | Updated: ${it.updatedAt || "-"}</p>
        <a href="reader.html?src=${encodeURIComponent(it.url || "")}">Read online</a>
      </article>
    `
    )
    .join("");
}

function renderPages(items, target) {
  target.innerHTML = asItems(items)
    .map(
      (it) => `
      <article class="item">
        <h3>${it.title || "Untitled page"}</h3>
        <p>${it.summary || ""}</p>
        <p class="muted">Updated: ${it.updatedAt || "-"}</p>
        <a href="page.html?id=${encodeURIComponent(it.id || "")}">Open</a>
      </article>
    `
    )
    .join("");
}

function buildPageToc() {
  const toc = q("#page-toc");
  const content = q("#page-content");
  if (!toc || !content) return;

  const headings = Array.from(content.querySelectorAll("h2, h3, h4"));
  if (headings.length === 0) {
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
  toc.innerHTML = html;
}

async function initHome() {
  const pages = await getJson("data/pages.json", []);
  const faqs = await getJson("data/faqs.json", []);
  const rules = await getJson("content/rules/index.json", { files: [] });

  q("#stats-pages").textContent = asItems(pages).length;
  q("#stats-faq").textContent = asItems(faqs).length;
  q("#stats-rules").textContent = asItems(rules.files).length;
  q("#stats-update").textContent = today();

  renderFaq(sortByUpdated(faqs).slice(0, 4), q("#home-faq"));
  renderPages(sortByUpdated(pages).slice(0, 4), q("#home-pages"));
}

async function initFaqPage() {
  const faqs = await getJson("data/faqs.json", []);
  renderFaq(sortByUpdated(faqs), q("#faq-list"));
}

async function initRulePage() {
  const local = await getJson("content/rules/index.json", { files: [] });
  renderRules(sortByUpdated(local.files), q("#rule-list"));
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
    q("#doc-meta").textContent = `Updated: ${one.updatedAt || "-"} | ID: ${one.id}`;
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
  renderPages(sortByUpdated(pages), q("#page-list"));
}

window.site = {
  navActive,
  initHome,
  initFaqPage,
  initRulePage,
  initReader,
  initPage,
  initPageList,
};

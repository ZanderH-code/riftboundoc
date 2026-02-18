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

async function initHome() {
  const pages = await getJson("data/pages.json", []);
  const faqs = await getJson("data/faqs.json", []);
  const rules = await getJson("content/rules/index.json", { files: [] });

  q("#stats-pages").textContent = asItems(pages).length;
  q("#stats-faq").textContent = asItems(faqs).length;
  q("#stats-rules").textContent = asItems(rules.files).length;
  q("#stats-update").textContent = today();

  renderFaq(asItems(faqs).slice(0, 4), q("#home-faq"));
}

async function initFaqPage() {
  const faqs = await getJson("data/faqs.json", []);
  renderFaq(asItems(faqs), q("#faq-list"));
}

async function initRulePage() {
  const local = await getJson("content/rules/index.json", { files: [] });
  renderRules(asItems(local.files), q("#rule-list"));
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
  const one = asItems(pages).find((it) => it.id === id) || asItems(pages)[0];
  if (!one) return;
  q("#page-title").textContent = one.title;
  q("#page-summary").textContent = one.summary || "";
  const md = await fetch(one.file, { cache: "no-store" }).then((r) => r.text());
  q("#page-content").innerHTML = window.marked.parse(md);
}

async function initPageList() {
  const pages = await getJson("data/pages.json", []);
  q("#page-list").innerHTML = asItems(pages)
    .map(
      (it) => `
      <article class="item">
        <h3>${it.title}</h3>
        <p>${it.summary || ""}</p>
        <p class="muted">Updated: ${it.updatedAt || "-"}</p>
        <a href="page.html?id=${encodeURIComponent(it.id)}">Open</a>
      </article>
    `
    )
    .join("");
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

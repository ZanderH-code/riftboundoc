const { q, slugify, escapeHtml, markdownToPlain } = window.rbCore;

function buildTocFor(contentSelector, tocSelector) {
  const content = q(contentSelector);
  const toc = q(tocSelector);
  if (!content || !toc) return;
  const headings = Array.from(content.querySelectorAll("h2, h3, h4"));
  if (!headings.length) {
    toc.innerHTML = '<div class="toc-title">Contents</div><p class="muted">No sections found.</p>';
    return;
  }
  let html = '<div class="toc-title">Contents</div>';
  headings.forEach((el, idx) => {
    if (!el.id) el.id = `${slugify(el.textContent) || "section"}-${idx + 1}`;
    const level = Number(el.tagName.slice(1));
    const cls = level === 2 ? "toc-l2" : level === 3 ? "toc-l3" : "toc-l4";
    html += `<a href=\"#${el.id}\" class=\"toc-link ${cls}\">${escapeHtml(el.textContent)}</a>`;
  });
  toc.innerHTML = html;
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
    toc.innerHTML = '<div class="toc-title">Contents</div><p class="muted">No sections found.</p>';
    return;
  }

  let html = '<div class="toc-title">Contents</div>';
  headings.forEach((el, idx) => {
    if (!el.id) el.id = `${slugify(el.textContent) || "section"}-${idx + 1}`;
    const level = Number(el.tagName.slice(1));
    const cls = level === 2 ? "toc-l2" : level === 3 ? "toc-l3" : "toc-l4";
    html += `<a href=\"#${el.id}\" class=\"toc-link ${cls}\">${escapeHtml(el.textContent)}</a>`;
  });

  ruleHeadings.forEach((row, idx) => {
    const idCell = row.querySelector(".rule-id");
    const textCell = row.querySelector(".rule-text");
    const label = `${idCell?.textContent || ""} ${textCell?.textContent || ""}`.trim();
    if (!label) return;
    if (!row.id) row.id = `rule-${slugify(label)}-${idx + 1}`;
    const cls = row.classList.contains("level-0")
      ? "toc-l2"
      : row.classList.contains("level-1")
      ? "toc-l3"
      : "toc-l4";
    html += `<a href=\"#${row.id}\" class=\"toc-link ${cls}\">${escapeHtml(label)}</a>`;
  });

  toc.innerHTML = html;
}

function highlightQueryIn(containerSelector) {
  const container = q(containerSelector);
  if (!container) return;
  const term = new URLSearchParams(window.location.search).get("q");
  const needle = markdownToPlain(term);
  if (!needle) return;
  const safe = needle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`(${safe})`, "ig");
  container.innerHTML = container.innerHTML.replace(re, "<mark>$1</mark>");
  const first = container.querySelector("mark");
  if (first) first.scrollIntoView({ behavior: "smooth", block: "center" });
}

function tocStateKey() {
  const desktop = window.matchMedia("(min-width: 981px)").matches;
  return desktop ? "rb_toc_open_desktop" : "rb_toc_open_mobile";
}

function initContentsDrawer() {
  const root = q(".reading-layout");
  const panel = q(".reading-layout .side-panel");
  const toc = panel ? panel.querySelector(".toc") : null;
  if (!root || !panel || !toc) return;
  if (q("#toc-fab")) return;
  document.body.classList.add("has-toc-drawer");

  const openBtn = document.createElement("button");
  openBtn.type = "button";
  openBtn.id = "toc-fab";
  openBtn.className = "toc-fab";
  openBtn.setAttribute("aria-controls", "toc-drawer");
  openBtn.setAttribute("aria-expanded", "false");
  openBtn.textContent = "Contents";

  panel.id = panel.id || "toc-drawer";
  panel.classList.add("toc-drawer");

  const header = document.createElement("div");
  header.className = "toc-drawer-head";
  header.innerHTML = "<strong>Contents</strong>";
  const closeBtn = document.createElement("button");
  closeBtn.type = "button";
  closeBtn.className = "toc-drawer-close";
  closeBtn.setAttribute("aria-label", "Close contents");
  closeBtn.textContent = "Close";
  header.appendChild(closeBtn);

  if (!panel.querySelector(".toc-drawer-head")) panel.prepend(header);
  document.body.appendChild(openBtn);

  const closeDrawer = () => {
    document.body.classList.remove("toc-drawer-open");
    openBtn.setAttribute("aria-expanded", "false");
    localStorage.setItem(tocStateKey(), "0");
  };
  const openDrawer = () => {
    document.body.classList.add("toc-drawer-open");
    openBtn.setAttribute("aria-expanded", "true");
    localStorage.setItem(tocStateKey(), "1");
  };

  openBtn.addEventListener("click", openDrawer);
  closeBtn.addEventListener("click", closeDrawer);
  panel.addEventListener("click", (ev) => {
    if (ev.target && ev.target.closest(".toc-link")) closeDrawer();
  });
  document.addEventListener("click", (ev) => {
    if (!document.body.classList.contains("toc-drawer-open")) return;
    const target = ev.target;
    if (!target) return;
    if (panel.contains(target) || openBtn.contains(target)) return;
    closeDrawer();
  });
  window.addEventListener("keydown", (ev) => {
    if (ev.key === "Escape") closeDrawer();
  });

  const saved = localStorage.getItem(tocStateKey());
  if (saved === "1") {
    openDrawer();
  } else if (saved === "0") {
    closeDrawer();
  } else if (window.matchMedia("(min-width: 981px)").matches) {
    openDrawer();
  } else {
    closeDrawer();
  }
}

window.rbReading = {
  buildTocFor,
  buildPageToc,
  highlightQueryIn,
  initContentsDrawer,
};

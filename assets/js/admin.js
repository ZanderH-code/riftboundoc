const state = {
  owner: "",
  repo: "",
  branch: "main",
  token: "",
  pages: [],
  faqs: [],
  rulesIndex: { updatedAt: "", files: [] },
};

const byId = (id) => document.getElementById(id);
const nowDate = () => new Date().toISOString().slice(0, 10);

function setStatus(msg, isError = false) {
  const el = byId("status");
  el.textContent = msg;
  el.style.color = isError ? "#b42318" : "#005f73";
}

function ghHeaders() {
  return {
    Authorization: `Bearer ${state.token}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };
}

function api(path) {
  return `https://api.github.com/repos/${state.owner}/${state.repo}/${path}`;
}

function utf8ToBase64(text) {
  return btoa(unescape(encodeURIComponent(text)));
}

function base64ToUtf8(base64) {
  return decodeURIComponent(escape(atob(base64)));
}

async function readRepoFile(path) {
  const res = await fetch(api(`contents/${path}?ref=${state.branch}`), {
    headers: ghHeaders(),
  });
  if (!res.ok) throw new Error(`Failed to read ${path}`);
  const json = await res.json();
  return {
    sha: json.sha,
    text: base64ToUtf8(String(json.content).replace(/\n/g, "")),
  };
}

async function writeRepoFile(path, text, message) {
  let sha;
  try {
    sha = (await readRepoFile(path)).sha;
  } catch (_) {
    sha = undefined;
  }

  const body = {
    message,
    content: utf8ToBase64(text),
    branch: state.branch,
  };
  if (sha) body.sha = sha;

  const res = await fetch(api(`contents/${path}`), {
    method: "PUT",
    headers: { ...ghHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Failed to write ${path}: ${await res.text()}`);
}

async function putRawBase64(path, base64, message) {
  let sha;
  try {
    sha = (await readRepoFile(path)).sha;
  } catch (_) {
    sha = undefined;
  }

  const body = { message, content: base64, branch: state.branch };
  if (sha) body.sha = sha;

  const res = await fetch(api(`contents/${path}`), {
    method: "PUT",
    headers: { ...ghHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Upload failed: ${await res.text()}`);
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function renderPageButtons() {
  byId("page-list").innerHTML = state.pages
    .map(
      (p) =>
        `<button class="secondary" type="button" data-page-id="${p.id}">${p.title}</button>`
    )
    .join(" ");
}

async function loadAll() {
  const [pagesRaw, faqsRaw, rulesRaw] = await Promise.all([
    readRepoFile("data/pages.json"),
    readRepoFile("data/faqs.json"),
    readRepoFile("content/rules/index.json"),
  ]);

  state.pages = JSON.parse(pagesRaw.text);
  state.faqs = JSON.parse(faqsRaw.text);
  state.rulesIndex = JSON.parse(rulesRaw.text);

  renderPageButtons();
  byId("faq-json").value = JSON.stringify(state.faqs, null, 2);
  byId("rule-json").value = JSON.stringify(state.rulesIndex, null, 2);
  setStatus("Repository data loaded.");
}

function bindConfig() {
  byId("save-config").addEventListener("click", () => {
    state.owner = byId("owner").value.trim();
    state.repo = byId("repo").value.trim();
    state.branch = byId("branch").value.trim() || "main";
    state.token = byId("token").value.trim();

    if (!state.owner || !state.repo || !state.token) {
      setStatus("Please provide owner, repo, and token.", true);
      return;
    }

    localStorage.setItem(
      "riftbound-admin-config",
      JSON.stringify({ owner: state.owner, repo: state.repo, branch: state.branch })
    );
    setStatus("Config saved in browser.");
  });

  byId("load-data").addEventListener("click", async () => {
    try {
      if (!state.owner || !state.repo || !state.token) {
        setStatus("Save config first.", true);
        return;
      }
      await loadAll();
    } catch (error) {
      setStatus(String(error), true);
    }
  });
}

function bindPages() {
  byId("new-page").addEventListener("click", () => {
    byId("page-id").value = "";
    byId("page-title").value = "";
    byId("page-summary").value = "";
    byId("page-md").value = "# New Page\n";
  });

  byId("page-list").addEventListener("click", async (event) => {
    const id = event.target.getAttribute("data-page-id");
    if (!id) return;
    const page = state.pages.find((p) => p.id === id);
    if (!page) return;

    const file = await readRepoFile(page.file);
    byId("page-id").value = page.id;
    byId("page-title").value = page.title;
    byId("page-summary").value = page.summary || "";
    byId("page-md").value = file.text;
  });

  byId("save-page").addEventListener("click", async () => {
    try {
      const id = byId("page-id").value.trim();
      const title = byId("page-title").value.trim();
      const summary = byId("page-summary").value.trim();
      const markdown = byId("page-md").value;

      if (!id || !title) {
        setStatus("Page id and title are required.", true);
        return;
      }

      const file = `content/pages/${id}.md`;
      await writeRepoFile(file, markdown, `page: update ${id}`);

      const row = { id, title, summary, file, updatedAt: nowDate() };
      const existing = state.pages.find((p) => p.id === id);
      if (existing) Object.assign(existing, row);
      else state.pages.push(row);

      await writeRepoFile(
        "data/pages.json",
        JSON.stringify(state.pages, null, 2),
        `page-index: update ${id}`
      );

      renderPageButtons();
      setStatus(`Page saved: ${id}`);
    } catch (error) {
      setStatus(String(error), true);
    }
  });
}

function bindFaqAndRules() {
  byId("save-faq").addEventListener("click", async () => {
    try {
      const obj = JSON.parse(byId("faq-json").value);
      state.faqs = obj;
      await writeRepoFile("data/faqs.json", JSON.stringify(obj, null, 2), "faq: update");
      setStatus("FAQ JSON saved.");
    } catch (error) {
      setStatus(String(error), true);
    }
  });

  byId("save-rule-index").addEventListener("click", async () => {
    try {
      const obj = JSON.parse(byId("rule-json").value);
      state.rulesIndex = obj;
      await writeRepoFile(
        "content/rules/index.json",
        JSON.stringify(obj, null, 2),
        "rules: update index"
      );
      setStatus("Rule index saved.");
    } catch (error) {
      setStatus(String(error), true);
    }
  });
}

function bindPdfUpload() {
  byId("upload-pdf").addEventListener("click", async () => {
    try {
      const file = byId("pdf-file").files[0];
      if (!file || !file.name.toLowerCase().endsWith(".pdf")) {
        setStatus("Please choose a PDF file.", true);
        return;
      }

      const title = byId("pdf-title").value.trim() || file.name;
      const path = `content/rules/files/${file.name}`;
      const base64 = await fileToBase64(file);
      await putRawBase64(path, base64, `rules: upload ${file.name}`);

      const url = `https://${state.owner}.github.io/${state.repo}/${path}`;
      state.rulesIndex.updatedAt = nowDate();
      state.rulesIndex.files = Array.isArray(state.rulesIndex.files)
        ? state.rulesIndex.files
        : [];
      state.rulesIndex.files.unshift({
        title,
        name: file.name,
        url,
        source: "Manual",
        updatedAt: nowDate(),
      });

      byId("rule-json").value = JSON.stringify(state.rulesIndex, null, 2);
      await writeRepoFile(
        "content/rules/index.json",
        JSON.stringify(state.rulesIndex, null, 2),
        "rules: update index after upload"
      );

      setStatus(`PDF uploaded: ${file.name}`);
    } catch (error) {
      setStatus(String(error), true);
    }
  });
}

function preloadConfig() {
  const raw = localStorage.getItem("riftbound-admin-config");
  if (!raw) return;

  try {
    const cfg = JSON.parse(raw);
    byId("owner").value = cfg.owner || "";
    byId("repo").value = cfg.repo || "";
    byId("branch").value = cfg.branch || "main";
  } catch (_) {
    // Ignore invalid cached config.
  }
}

window.addEventListener("DOMContentLoaded", () => {
  preloadConfig();
  bindConfig();
  bindPages();
  bindFaqAndRules();
  bindPdfUpload();
});

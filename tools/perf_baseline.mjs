import { spawn } from "node:child_process";
import { promises as fs } from "node:fs";
import path from "node:path";
import process from "node:process";

const ROOT = process.cwd();
const DIST_DIR = path.join(ROOT, "dist");
const DATA_DIR = path.join(ROOT, "data");
const REPORT_DIR = path.join(ROOT, "docs", "perf");
const REPORT_JSON = path.join(REPORT_DIR, "baseline-latest.json");
const REPORT_MD = path.join(REPORT_DIR, "baseline-latest.md");

async function exists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function readJson(filePath, fallback = null) {
  try {
    const raw = await fs.readFile(filePath, "utf8");
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

async function listFiles(dir) {
  const out = [];
  async function walk(current) {
    const entries = await fs.readdir(current, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) {
        await walk(full);
      } else {
        out.push(full);
      }
    }
  }
  await walk(dir);
  return out;
}

async function collectBundleStats() {
  const files = await listFiles(DIST_DIR);
  const bundles = [];
  for (const file of files) {
    if (!file.endsWith(".js") && !file.endsWith(".css")) continue;
    const stat = await fs.stat(file);
    bundles.push({
      file: path.relative(DIST_DIR, file).replace(/\\/g, "/"),
      bytes: stat.size,
    });
  }
  bundles.sort((a, b) => b.bytes - a.bytes || a.file.localeCompare(b.file));
  const totals = bundles.reduce(
    (acc, bundle) => {
      acc.totalBytes += bundle.bytes;
      if (bundle.file.endsWith(".js")) acc.jsBytes += bundle.bytes;
      if (bundle.file.endsWith(".css")) acc.cssBytes += bundle.bytes;
      return acc;
    },
    { totalBytes: 0, jsBytes: 0, cssBytes: 0 }
  );
  return { bundles, totals };
}

function startStaticServer(port) {
  return spawn("python", ["-m", "http.server", String(port), "--directory", "dist"], {
    cwd: ROOT,
    stdio: ["ignore", "pipe", "pipe"],
  });
}

async function waitForServer(url, timeoutMs = 30_000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url, { redirect: "manual" });
      if (res.status >= 200 && res.status < 500) return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`Timed out waiting for server at ${url}`);
}

async function probePage(baseURL, pagePath) {
  const start = performance.now();
  const res = await fetch(`${baseURL}${pagePath}`, { redirect: "follow" });
  const html = await res.text();
  const elapsedMs = Number((performance.now() - start).toFixed(2));
  const scriptCount = (html.match(/<script\b/gi) || []).length;
  const cssCount = (html.match(/<link\b[^>]*rel=["']stylesheet["']/gi) || []).length;
  return {
    path: pagePath,
    status: res.status,
    elapsedMs,
    htmlBytes: Buffer.byteLength(html, "utf8"),
    scriptCount,
    cssCount,
  };
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function renderMarkdown(report, previous = null) {
  const lines = [];
  lines.push("# Performance Baseline");
  lines.push("");
  lines.push(`Generated at: ${report.generatedAt}`);
  lines.push("");
  lines.push("## Bundle Totals");
  lines.push("");
  lines.push(`- Total JS+CSS: ${formatBytes(report.bundleTotals.totalBytes)}`);
  lines.push(`- JS: ${formatBytes(report.bundleTotals.jsBytes)}`);
  lines.push(`- CSS: ${formatBytes(report.bundleTotals.cssBytes)}`);
  lines.push("");
  lines.push("## Page Probes");
  lines.push("");
  for (const probe of report.pageProbes) {
    lines.push(
      `- \`${probe.path}\`: ${probe.elapsedMs} ms, HTML ${formatBytes(probe.htmlBytes)}, scripts ${probe.scriptCount}, styles ${probe.cssCount}`
    );
  }
  lines.push("");
  lines.push("## Top Bundles");
  lines.push("");
  for (const bundle of report.topBundles) {
    lines.push(`- \`${bundle.file}\`: ${formatBytes(bundle.bytes)}`);
  }

  if (previous) {
    lines.push("");
    lines.push("## Delta vs Previous");
    lines.push("");
    const deltaTotal = report.bundleTotals.totalBytes - (previous.bundleTotals?.totalBytes || 0);
    const deltaJs = report.bundleTotals.jsBytes - (previous.bundleTotals?.jsBytes || 0);
    const deltaCss = report.bundleTotals.cssBytes - (previous.bundleTotals?.cssBytes || 0);
    lines.push(`- Total JS+CSS delta: ${deltaTotal >= 0 ? "+" : ""}${formatBytes(deltaTotal)}`);
    lines.push(`- JS delta: ${deltaJs >= 0 ? "+" : ""}${formatBytes(deltaJs)}`);
    lines.push(`- CSS delta: ${deltaCss >= 0 ? "+" : ""}${formatBytes(deltaCss)}`);
  }

  lines.push("");
  return lines.join("\n");
}

async function main() {
  if (!(await exists(DIST_DIR))) {
    throw new Error("dist/ is missing. Run `npm run build` first.");
  }

  const faqs = await readJson(path.join(DATA_DIR, "faqs.json"), []);
  const firstFaqId = Array.isArray(faqs) && faqs.length ? encodeURIComponent(faqs[0].id || "") : "";
  const faqPath = firstFaqId ? `/faq-detail/?id=${firstFaqId}` : "/faq-detail/";
  const pagesToProbe = ["/", "/cards/", faqPath, "/updates/"];

  const bundleStats = await collectBundleStats();

  const port = Number(process.env.PERF_BASELINE_PORT || 4173);
  const baseURL = `http://127.0.0.1:${port}`;
  const server = startStaticServer(port);
  let previous = null;
  const compareIndex = process.argv.indexOf("--compare");
  if (compareIndex >= 0 && process.argv[compareIndex + 1]) {
    previous = await readJson(path.resolve(ROOT, process.argv[compareIndex + 1]), null);
  }

  try {
    await waitForServer(`${baseURL}/`);
    const pageProbes = [];
    for (const pagePath of pagesToProbe) {
      pageProbes.push(await probePage(baseURL, pagePath));
    }

    const report = {
      generatedAt: new Date().toISOString(),
      bundleTotals: bundleStats.totals,
      topBundles: bundleStats.bundles.slice(0, 12),
      pageProbes,
    };

    await fs.mkdir(REPORT_DIR, { recursive: true });
    await fs.writeFile(REPORT_JSON, `${JSON.stringify(report, null, 2)}\n`, "utf8");
    await fs.writeFile(REPORT_MD, renderMarkdown(report, previous), "utf8");

    console.log(`Saved ${path.relative(ROOT, REPORT_JSON)}`);
    console.log(`Saved ${path.relative(ROOT, REPORT_MD)}`);
  } finally {
    server.kill("SIGTERM");
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const SITE_META_PATH = path.join(ROOT, "src", "lib", "site-meta.ts");
const SW_PATHS = [path.join(ROOT, "sw.js"), path.join(ROOT, "public", "sw.js")];
const TARGET_TZ = "America/Port-au-Prince";

function readText(filePath) {
  return fs.readFileSync(filePath, "utf8");
}

function writeText(filePath, content) {
  fs.writeFileSync(filePath, content, "utf8");
}

function getTodayPartsInTimezone(timeZone) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const pick = (type) => parts.find((p) => p.type === type)?.value || "";
  return {
    year: pick("year"),
    month: pick("month"),
    day: pick("day"),
  };
}

function nextVersion(existingSiteVersion, today) {
  const match = /^(\d{4})\.(\d{2})\.(\d{2})\.(\d{2})$/.exec(existingSiteVersion || "");
  const todayKey = `${today.year}.${today.month}.${today.day}`;
  if (match) {
    const existingDate = `${match[1]}.${match[2]}.${match[3]}`;
    const existingSeq = Number.parseInt(match[4], 10);
    if (existingDate === todayKey) {
      return { date: today, seq: existingSeq + 1 };
    }
  }
  return { date: today, seq: 1 };
}

function formatVersions(date, seq) {
  const seq2 = String(seq).padStart(2, "0");
  const siteVersion = `${date.year}.${date.month}.${date.day}.${seq2}`;
  const assetVersion = `${date.year}${date.month}${date.day}v${seq}`;
  return { siteVersion, assetVersion };
}

function bumpSiteMeta() {
  const content = readText(SITE_META_PATH);
  const siteMatch = content.match(/siteVersion:\s*"([^"]+)"/);
  if (!siteMatch) {
    throw new Error("Could not find siteVersion in src/lib/site-meta.ts");
  }

  const today = getTodayPartsInTimezone(TARGET_TZ);
  const next = nextVersion(siteMatch[1], today);
  const { siteVersion, assetVersion } = formatVersions(next.date, next.seq);

  const updated = content
    .replace(/siteVersion:\s*"[^"]+"/, `siteVersion: "${siteVersion}"`)
    .replace(/assetVersion:\s*"[^"]+"/, `assetVersion: "${assetVersion}"`);

  writeText(SITE_META_PATH, updated);
  return { siteVersion, assetVersion };
}

function bumpServiceWorkerCache(cacheVersion) {
  for (const swPath of SW_PATHS) {
    const content = readText(swPath);
    const updated = content.replace(/const CACHE_VERSION = "[^"]+";/, `const CACHE_VERSION = "${cacheVersion}";`);
    writeText(swPath, updated);
  }
}

function main() {
  const { siteVersion, assetVersion } = bumpSiteMeta();
  bumpServiceWorkerCache(assetVersion);
  console.log(`Bumped siteVersion=${siteVersion}, assetVersion=${assetVersion}`);
}

main();

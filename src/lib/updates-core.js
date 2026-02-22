function asItems(list) {
  return Array.isArray(list) ? list : [];
}

export function deduplicateUpdateItems(items) {
  const canonical = new Map();
  const normalize = (value) =>
    String(value || "")
      .toLowerCase()
      .replace(/\([^)]*text version[^)]*\)/g, "")
      .replace(/\s+/g, " ")
      .trim();

  for (const item of asItems(items)) {
    const kind = String(item.kind || "").toLowerCase();
    const href = String(item.href || "");
    const titleKey = normalize(item.title || "");
    const pageMatch = href.match(/[?&]id=([^&#]+)/i);
    const pageId = pageMatch ? decodeURIComponent(pageMatch[1] || "") : "";
    const key = `${kind}|${pageId || titleKey}`;
    const prev = canonical.get(key);
    if (!prev) {
      canonical.set(key, item);
      continue;
    }

    const prevUpdated = String(prev.updatedAt || "");
    const nextUpdated = String(item.updatedAt || "");
    if (nextUpdated > prevUpdated) {
      canonical.set(key, item);
      continue;
    }
    if (
      nextUpdated === prevUpdated &&
      href.includes("/pages/?id=") &&
      !String(prev.href || "").includes("/pages/?id=")
    ) {
      canonical.set(key, item);
    }
  }

  return Array.from(canonical.values()).sort((a, b) =>
    String(b.updatedAt || "").localeCompare(String(a.updatedAt || ""))
  );
}


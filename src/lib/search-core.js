export function tokenizeQuery(query) {
  return String(query || "")
    .toLowerCase()
    .trim()
    .split(/\s+/)
    .filter(Boolean);
}

export function searchByTokens(docs, query, options = {}) {
  const tokens = tokenizeQuery(query);
  const kind = options.kind || "all";
  if (!tokens.length) return [];

  return (docs || []).filter((doc) => {
    if (kind !== "all" && doc.kind !== kind) return false;
    const title = String(doc.titleText || "").toLowerCase();
    const body = String(doc.bodyText || "").toLowerCase();
    return tokens.every((t) => title.includes(t) || body.includes(t));
  });
}

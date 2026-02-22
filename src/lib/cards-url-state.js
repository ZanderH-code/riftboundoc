function asItems(list) {
  return Array.isArray(list) ? list : [];
}

function parseCsvParam(params, keys = []) {
  for (const key of keys) {
    const raw = String(params.get(key) || "").trim();
    if (!raw) continue;
    return raw
      .split(",")
      .map((item) => decodeURIComponent(item).trim())
      .filter(Boolean);
  }
  return [];
}

function pickAllowedSet(params, keys, allowedValues) {
  const allowed = new Set(asItems(allowedValues).map((item) => String(item)));
  return new Set(parseCsvParam(params, keys).filter((item) => allowed.has(String(item))));
}

function parseRangeBound(params, keys, fallback) {
  for (const key of keys) {
    const raw = params.get(key);
    if (raw == null || raw === "") continue;
    const value = Number(raw);
    if (Number.isFinite(value)) return value;
  }
  return fallback;
}

function normalizeSearch(search) {
  if (!search) return "";
  return String(search).startsWith("?") ? String(search).slice(1) : String(search);
}

function toStateRange(limit, minRaw, maxRaw) {
  const min = Math.max(limit.min, Math.min(limit.max, minRaw));
  const max = Math.max(limit.min, Math.min(limit.max, maxRaw));
  return {
    min: Math.min(min, max),
    max: Math.max(min, max),
  };
}

export function parseCardsStateFromSearch(
  search,
  { allDomains = [], sets = [], types = [], supertypes = [], variantOptions = [], rarities = [], limits = {} } = {}
) {
  const params = new URLSearchParams(normalizeSearch(search));
  const fallbackLimits = {
    energy: { min: 0, max: 0 },
    power: { min: 0, max: 0 },
    might: { min: 0, max: 0 },
    ...limits,
  };
  const state = {
    query: "",
    sortKey: "card",
    sortDir: "asc",
    sets: new Set(),
    types: new Set(),
    supertypes: new Set(),
    variants: new Set(),
    rarities: new Set(),
    domains: new Set(),
    ranges: {
      energy: { ...fallbackLimits.energy },
      power: { ...fallbackLimits.power },
      might: { ...fallbackLimits.might },
    },
    page: 1,
  };

  const query = String(params.get("q") || params.get("query") || "").trim();
  state.query = query;

  const sortKey = String(params.get("sort") || params.get("sortKey") || "").trim();
  if (["card", "name", "rarity", "might"].includes(sortKey)) state.sortKey = sortKey;

  const sortDir = String(params.get("dir") || params.get("sortDir") || "").trim().toLowerCase();
  if (["asc", "desc"].includes(sortDir)) state.sortDir = sortDir;

  state.page = Math.max(1, Number.parseInt(params.get("page") || "1", 10) || 1);
  state.domains = pickAllowedSet(params, ["domain", "domains"], allDomains);
  state.sets = pickAllowedSet(params, ["set", "sets"], sets);
  state.types = pickAllowedSet(params, ["type", "types"], types);
  state.supertypes = pickAllowedSet(params, ["supertype", "supertypes"], supertypes);
  state.variants = pickAllowedSet(params, ["variant", "variants"], variantOptions);
  state.rarities = pickAllowedSet(params, ["rarity", "rarities"], rarities);

  for (const stat of ["energy", "power", "might"]) {
    const limit = fallbackLimits[stat];
    const minRaw = parseRangeBound(params, [`${stat}Min`, `${stat}_min`, `${stat}From`], limit.min);
    const maxRaw = parseRangeBound(params, [`${stat}Max`, `${stat}_max`, `${stat}To`], limit.max);
    state.ranges[stat] = toStateRange(limit, minRaw, maxRaw);
  }

  return state;
}

export function serializeCardsStateToSearch(initialSearch, state, limits = {}) {
  const fallbackLimits = {
    energy: { min: 0, max: 0 },
    power: { min: 0, max: 0 },
    might: { min: 0, max: 0 },
    ...limits,
  };
  const params = new URLSearchParams(normalizeSearch(initialSearch));
  const setParam = (key, value, fallback = "") => {
    if (String(value || "") === String(fallback || "")) params.delete(key);
    else params.set(key, value);
  };
  const setCsvParam = (key, values) => {
    const list = Array.from(values || [])
      .map((item) => String(item))
      .filter(Boolean)
      .sort();
    if (!list.length) params.delete(key);
    else params.set(key, list.join(","));
  };

  setParam("q", String(state.query || "").trim(), "");
  setParam("sort", state.sortKey, "card");
  setParam("dir", state.sortDir, "asc");
  setParam("page", String(state.page || 1), "1");

  setCsvParam("domains", state.domains);
  setCsvParam("sets", state.sets);
  setCsvParam("types", state.types);
  setCsvParam("supertypes", state.supertypes);
  setCsvParam("variants", state.variants);
  setCsvParam("rarities", state.rarities);

  for (const stat of ["energy", "power", "might"]) {
    const limit = fallbackLimits[stat];
    const range = state.ranges?.[stat] || limit;
    const minKey = `${stat}Min`;
    const maxKey = `${stat}Max`;
    if (Number(range.min) === Number(limit.min) && Number(range.max) === Number(limit.max)) {
      params.delete(minKey);
      params.delete(maxKey);
    } else {
      params.set(minKey, String(range.min));
      params.set(maxKey, String(range.max));
    }
  }

  [
    "query",
    "sortKey",
    "sortDir",
    "domain",
    "set",
    "type",
    "supertype",
    "variant",
    "rarity",
    "energy_min",
    "energy_max",
    "power_min",
    "power_max",
    "might_min",
    "might_max",
    "energyFrom",
    "energyTo",
    "powerFrom",
    "powerTo",
    "mightFrom",
    "mightTo",
  ].forEach((key) => params.delete(key));

  return params.toString();
}


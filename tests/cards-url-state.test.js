import { describe, expect, it } from "vitest";
import { parseCardsStateFromSearch, serializeCardsStateToSearch } from "../src/lib/cards-url-state.js";

const allowed = {
  allDomains: ["Mind", "Body", "Chaos"],
  sets: ["Alpha", "Beta"],
  types: ["Champion", "Spell"],
  supertypes: ["Human", "Spirit"],
  variantOptions: ["Standard", "Foil"],
  rarities: ["Common", "Rare"],
  limits: {
    energy: { min: 0, max: 10 },
    power: { min: 0, max: 8 },
    might: { min: 0, max: 6 },
  },
};

describe("cards URL state parse and serialize", () => {
  it("parses canonical and legacy params with clamping and filtering", () => {
    const state = parseCardsStateFromSearch(
      "?query=legacy%20query&sortKey=rarity&sortDir=DESC&page=0&domain=Mind,Unknown&sets=Beta,Unknown&type=Spell&supertype=Spirit&variant=Foil,Unknown&rarities=Rare,Unknown&energy_min=-1&energy_max=99&powerFrom=7&powerTo=2&mightMin=not-a-number",
      allowed
    );

    expect(state.query).toBe("legacy query");
    expect(state.sortKey).toBe("rarity");
    expect(state.sortDir).toBe("desc");
    expect(state.page).toBe(1);
    expect(Array.from(state.domains)).toEqual(["Mind"]);
    expect(Array.from(state.sets)).toEqual(["Beta"]);
    expect(Array.from(state.types)).toEqual(["Spell"]);
    expect(Array.from(state.supertypes)).toEqual(["Spirit"]);
    expect(Array.from(state.variants)).toEqual(["Foil"]);
    expect(Array.from(state.rarities)).toEqual(["Rare"]);
    expect(state.ranges.energy).toEqual({ min: 0, max: 10 });
    expect(state.ranges.power).toEqual({ min: 2, max: 7 });
    expect(state.ranges.might).toEqual({ min: 0, max: 6 });
  });

  it("serializes canonical params, removes legacy keys, and preserves unknown params", () => {
    const serialized = serializeCardsStateToSearch(
      "?foo=1&query=old&sortKey=name&domain=Body&energy_min=1&powerFrom=3",
      {
        query: "alpha",
        sortKey: "might",
        sortDir: "desc",
        page: 3,
        domains: new Set(["Chaos", "Mind"]),
        sets: new Set(["Beta"]),
        types: new Set(["Champion"]),
        supertypes: new Set(["Human"]),
        variants: new Set(["Foil"]),
        rarities: new Set(["Rare"]),
        ranges: {
          energy: { min: 1, max: 9 },
          power: { min: 0, max: 8 },
          might: { min: 2, max: 4 },
        },
      },
      allowed.limits
    );

    const params = new URLSearchParams(serialized);
    expect(params.get("foo")).toBe("1");
    expect(params.get("q")).toBe("alpha");
    expect(params.get("sort")).toBe("might");
    expect(params.get("dir")).toBe("desc");
    expect(params.get("page")).toBe("3");
    expect(params.get("domains")).toBe("Chaos,Mind");
    expect(params.get("sets")).toBe("Beta");
    expect(params.get("types")).toBe("Champion");
    expect(params.get("supertypes")).toBe("Human");
    expect(params.get("variants")).toBe("Foil");
    expect(params.get("rarities")).toBe("Rare");
    expect(params.get("energyMin")).toBe("1");
    expect(params.get("energyMax")).toBe("9");
    expect(params.get("powerMin")).toBeNull();
    expect(params.get("powerMax")).toBeNull();
    expect(params.get("mightMin")).toBe("2");
    expect(params.get("mightMax")).toBe("4");

    expect(params.get("query")).toBeNull();
    expect(params.get("sortKey")).toBeNull();
    expect(params.get("domain")).toBeNull();
    expect(params.get("energy_min")).toBeNull();
    expect(params.get("powerFrom")).toBeNull();
  });
});


import { describe, expect, it } from "vitest";
import { searchByTokens } from "../src/lib/search-core.js";

const docs = [
  { kind: "FAQ", titleText: "How Repeat works", bodyText: "Repeat allows extra cost" },
  { kind: "Errata", titleText: "Card text changes", bodyText: "Weaponmaster wording update" },
  { kind: "Rule", titleText: "Core rules", bodyText: "Showdown and timing windows" },
];

describe("search behavior", () => {
  it("matches tokens across title and body", () => {
    const found = searchByTokens(docs, "repeat cost");
    expect(found.length).toBe(1);
    expect(found[0].kind).toBe("FAQ");
  });

  it("supports kind filter", () => {
    const found = searchByTokens(docs, "update", { kind: "Errata" });
    expect(found.length).toBe(1);
    expect(found[0].kind).toBe("Errata");
  });

  it("returns empty for blank query", () => {
    expect(searchByTokens(docs, "   ").length).toBe(0);
  });
});

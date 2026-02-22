import { describe, expect, it } from "vitest";
import cards from "../public/data/cards.json" assert { type: "json" };
import faqs from "../public/data/faqs.json" assert { type: "json" };
import errata from "../public/data/errata.json" assert { type: "json" };

describe("content data shape", () => {
  it("has non-empty core datasets", () => {
    expect(typeof cards).toBe("object");
    expect(Array.isArray(cards.cards)).toBe(true);
    expect(Array.isArray(faqs)).toBe(true);
    expect(Array.isArray(errata)).toBe(true);
    expect(cards.cards.length).toBeGreaterThan(0);
    expect(faqs.length).toBeGreaterThan(0);
    expect(errata.length).toBeGreaterThan(0);
  });

  it("keeps required FAQ/Errata fields", () => {
    for (const item of [...faqs, ...errata]) {
      expect(typeof item.id).toBe("string");
      expect(item.id.length).toBeGreaterThan(0);
      expect(typeof item.title).toBe("string");
      expect(item.title.length).toBeGreaterThan(0);
      expect(typeof item.updatedAt).toBe("string");
      expect(item.updatedAt.length).toBeGreaterThan(0);
    }
  });
});

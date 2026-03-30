import { describe, expect, it } from "vitest";
import cards from "../data/cards.json" assert { type: "json" };
import bannedCards from "../data/banned-cards.json" assert { type: "json" };

function normalizeName(value) {
  return String(value || "")
    .normalize("NFKC")
    .replace(/[’‘`´]/g, "'")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

describe("banned card legality mapping", () => {
  it("ensures each banned name matches at least one card", () => {
    const names = Array.isArray(bannedCards.names) ? bannedCards.names : [];
    const cardNames = new Set((cards.cards || []).map((card) => normalizeName(card.name)));
    const unmatched = names.filter((name) => !cardNames.has(normalizeName(name)));
    expect(unmatched).toEqual([]);
  });

  it("applies to all variants of a banned card name", () => {
    const normalizedTarget = normalizeName("Draven, Vanquisher");
    const dravenVariants = (cards.cards || []).filter((card) => normalizeName(card.name) === normalizedTarget);
    expect(dravenVariants.length).toBeGreaterThan(1);
  });
});

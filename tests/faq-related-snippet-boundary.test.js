import { describe, expect, it } from "vitest";
import cardRelatedIndex from "../data/card-related-index.json" assert { type: "json" };

const normalize = (value) =>
  String(value || "")
    .normalize("NFKC")
    .replace(/[’‘`´]/g, "'")
    .replace(/[“”]/g, '"')
    .toLowerCase();

const getFirstFaqSnippet = (cardName) => {
  const key = normalize(cardName);
  const row = cardRelatedIndex.byCardName?.[key]?.faq?.[0];
  const hit = row?.matches?.[0];
  return String(hit?.snippet || "");
};

describe("card related FAQ snippets", () => {
  it("keeps faq snippet scoped to Yone without leaking Tianna body", () => {
    const yone = getFirstFaqSnippet("Yone, Blademaster");
    expect(yone.length).toBeGreaterThan(0);
    expect(normalize(yone).startsWith(normalize("Yone, Blademaster"))).toBe(true);
    expect(normalize(yone)).toContain(normalize("Q: When and how does Yone trigger?"));
    expect(normalize(yone)).not.toContain(normalize("Forgotten Monument works differently from Tianna"));
  });

  it("keeps faq snippet scoped to Tianna without leaking Yone heading", () => {
    const tianna = getFirstFaqSnippet("Tianna Crownguard");
    expect(tianna.length).toBeGreaterThan(0);
    expect(normalize(tianna).startsWith(normalize("Tianna Crownguard"))).toBe(true);
    expect(normalize(tianna)).toContain(normalize("Q:"));
    expect(normalize(tianna)).not.toContain(normalize("Yone, Blademaster"));
  });

  it("returns first faq snippets for multiple card examples", () => {
    const cards = [
      "Yone, Blademaster",
      "Tianna Crownguard",
      "Svellsongur",
      "Nocturne, Horrifying",
      "Draven, Audacious",
      "Pickpocket",
      "Rumble, Hotheaded",
      "Kato the Arm",
    ];

    for (const name of cards) {
      const snippet = getFirstFaqSnippet(name);
      expect(snippet.length).toBeGreaterThan(0);
      expect(normalize(snippet)).toContain(normalize(name));
    }
  });
});

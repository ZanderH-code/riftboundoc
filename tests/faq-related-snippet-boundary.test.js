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

const getFirstRuleSnippet = (cardName) => {
  const key = normalize(cardName);
  const row = cardRelatedIndex.byCardName?.[key]?.rule?.[0];
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

  it("keeps plain-question FAQ snippets scoped to Turn to Dust", () => {
    const snippet = getFirstFaqSnippet("Turn to Dust");
    const text = normalize(snippet);

    expect(snippet.length).toBeGreaterThan(0);
    expect(text).toContain(normalize("If I play Turn to Dust on an attached Equipment"));
    expect(text).toContain(normalize("Attached Equipment only have their printed rules text made inactive"));
    expect(text).not.toContain(normalize("What happens if you Brush a Brush"));
    expect(text).not.toContain(normalize("swap back"));
    expect(text).not.toContain(normalize("The Brush token will cease to exist"));
  });

  it("keeps related rules snippets scoped to concrete rule examples", () => {
    const examples = [
      ["Annie, Fiery", "715.2", "Bonus Damage"],
      ["Cleave", "807.2", "Assault"],
      ["Brush", "184.8", "Brush battlefield token"],
      ["Baron Pit", "184.9", "Baron Pit battlefield token"],
      ["Rocket Barrage", "820.2.a", "Rocket Barrage"],
      ["Stalwart Poro", "814.2", "Shield"],
    ];

    for (const [name, ruleId, phrase] of examples) {
      const snippet = getFirstRuleSnippet(name);
      const text = normalize(snippet);
      expect(snippet.length).toBeGreaterThan(0);
      expect(text).toContain(normalize(ruleId));
      expect(text).toContain(normalize(phrase));
    }
  });
});

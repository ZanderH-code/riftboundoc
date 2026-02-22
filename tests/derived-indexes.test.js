import { describe, expect, it } from "vitest";
import updatesIndex from "../data/updates-index.json" assert { type: "json" };
import cardRelatedIndex from "../data/card-related-index.json" assert { type: "json" };
import searchIndexLite from "../data/search-index-lite.json" assert { type: "json" };
import faqsMeta from "../data/faqs.meta.json" assert { type: "json" };
import errataMeta from "../data/errata.meta.json" assert { type: "json" };
import pagesMeta from "../data/pages.meta.json" assert { type: "json" };

describe("derived indexes", () => {
  it("ships metadata and non-empty payloads", () => {
    for (const payload of [updatesIndex, cardRelatedIndex, searchIndexLite]) {
      expect(typeof payload.dataVersion).toBe("string");
      expect(typeof payload.generatedAt).toBe("string");
      expect(payload.generatedAt.length).toBeGreaterThan(0);
      expect(typeof payload.source).toBe("string");
      expect(payload.source.length).toBeGreaterThan(0);
    }

    expect(Array.isArray(updatesIndex.items)).toBe(true);
    expect(Array.isArray(searchIndexLite.docs)).toBe(true);
    expect(searchIndexLite.docs.length).toBeGreaterThan(0);
    expect(typeof cardRelatedIndex.byCardId).toBe("object");
    expect(typeof cardRelatedIndex.byCardName).toBe("object");
  });

  it("keeps array dataset metadata sidecars", () => {
    for (const sidecar of [faqsMeta, errataMeta, pagesMeta]) {
      expect(typeof sidecar.dataVersion).toBe("string");
      expect(typeof sidecar.generatedAt).toBe("string");
      expect(typeof sidecar.source).toBe("string");
      expect(typeof sidecar.itemsPath).toBe("string");
      expect(typeof sidecar.count).toBe("number");
    }
  });
});

import { describe, expect, it } from "vitest";
import { deduplicateUpdateItems } from "../src/lib/updates-core.js";

describe("updates dedup behavior", () => {
  it("keeps the latest update per kind and page id", () => {
    const rows = deduplicateUpdateItems([
      {
        kind: "Rule",
        title: "Combat Rules",
        updatedAt: "2026-01-10",
        href: "/rule-detail/?id=rule-combat",
      },
      {
        kind: "rule",
        title: "Different title should still dedup by id",
        updatedAt: "2026-02-01",
        href: "/pages/?id=rule-combat",
      },
      {
        kind: "FAQ",
        title: "Timing",
        updatedAt: "2026-01-30",
        href: "/faq-detail/?id=faq-1",
      },
    ]);

    expect(rows).toHaveLength(2);
    expect(rows[0].href).toBe("/pages/?id=rule-combat");
    expect(rows[0].updatedAt).toBe("2026-02-01");
    expect(rows[1].kind).toBe("FAQ");
  });

  it("prefers pages links when timestamps match", () => {
    const rows = deduplicateUpdateItems([
      {
        kind: "Rule",
        title: "Deckbuilding",
        updatedAt: "2026-01-20",
        href: "/rules/#deckbuilding",
      },
      {
        kind: "rule",
        title: "Deckbuilding (text version)",
        updatedAt: "2026-01-20",
        href: "/pages/?id=deckbuilding",
      },
    ]);

    expect(rows).toHaveLength(1);
    expect(rows[0].href).toBe("/pages/?id=deckbuilding");
  });

  it("normalizes title text version suffixes for non-id links", () => {
    const rows = deduplicateUpdateItems([
      {
        kind: "Errata",
        title: "Spirit Update (Text Version)",
        updatedAt: "2026-01-15",
        href: "/errata-detail/?slug=spirit-update",
      },
      {
        kind: "errata",
        title: "Spirit   Update",
        updatedAt: "2026-01-25",
        href: "/errata-detail/?slug=spirit-update-v2",
      },
    ]);

    expect(rows).toHaveLength(1);
    expect(rows[0].updatedAt).toBe("2026-01-25");
  });
});


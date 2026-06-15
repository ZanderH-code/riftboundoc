import { describe, expect, it } from "vitest";
import fs from "node:fs";

describe("FAQ card embed routing", () => {
  it("uses site-rooted card links instead of FAQ-relative links", () => {
    const source = fs.readFileSync("assets/js/faq-detail-page.js", "utf8");

    expect(source).toContain('route("cards/")');
    expect(source).not.toContain("../cards/?q=");
  });
});

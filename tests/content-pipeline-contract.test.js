import { describe, expect, it } from "vitest";
import fs from "node:fs";

describe("content pipeline contract", () => {
  it("runs normalize before schema validation", () => {
    const script = fs.readFileSync("tools/format_and_validate_content.py", "utf8");
    const normalizeIndex = script.indexOf('"tools/normalize_content.py"');
    const validateIndex = script.indexOf('"tools/validate_content_schema.py"');

    expect(script).toContain("sys.executable");
    expect(normalizeIndex).toBeGreaterThan(-1);
    expect(validateIndex).toBeGreaterThan(-1);
    expect(normalizeIndex).toBeLessThan(validateIndex);
  });
});

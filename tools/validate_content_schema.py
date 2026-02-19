#!/usr/bin/env python3
import json
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


def read_json(path: Path):
    return json.loads(path.read_text(encoding="utf-8"))


def require_fields(rows, fields, label):
    errors = []
    for idx, row in enumerate(rows):
        for key in fields:
            if key not in row:
                errors.append(f"{label}[{idx}] missing field: {key}")
    return errors


def main():
    errors = []

    faqs = read_json(ROOT / "data" / "faqs.json")
    errata = read_json(ROOT / "data" / "errata.json")
    pages = read_json(ROOT / "data" / "pages.json")
    rules = read_json(ROOT / "content" / "rules" / "index.json").get("rules", [])

    doc_fields = ["kind", "id", "title", "summary", "content", "source", "publishedAt", "originUrl", "updatedAt"]
    errors.extend(require_fields(faqs, doc_fields, "faqs"))
    errors.extend(require_fields(errata, doc_fields, "errata"))
    errors.extend(require_fields(pages, ["id", "title", "summary", "file", "updatedAt"], "pages"))
    errors.extend(require_fields(rules, ["id", "title", "kind", "summary", "source", "updatedAt"], "rules"))

    if errors:
      print("Schema validation failed:")
      for e in errors:
        print(f"- {e}")
      sys.exit(1)

    print("Schema validation passed.")


if __name__ == "__main__":
    main()

#!/usr/bin/env python3
import json
import re
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
DATE_RE = re.compile(r"^\d{4}-\d{2}-\d{2}$")
ISO_RE = re.compile(r"^\d{4}-\d{2}-\d{2}T")


def read_json(path: Path):
    return json.loads(path.read_text(encoding="utf-8"))


def require_fields(rows, fields, label):
    errors = []
    for idx, row in enumerate(rows):
        for key in fields:
            if key not in row:
                errors.append(f"{label}[{idx}] missing field: {key}")
    return errors


def validate_date(value: str, label: str, errors: list[str], allow_iso: bool = True):
    raw = str(value or "").strip()
    if not raw:
        errors.append(f"{label} is empty")
        return
    if DATE_RE.match(raw):
        return
    if allow_iso and ISO_RE.match(raw):
        return
    errors.append(f"{label} has invalid date format: {raw}")


def validate_unique_ids(rows, label, errors):
    seen = set()
    for idx, row in enumerate(rows):
        rid = str(row.get("id", "")).strip()
        if not rid:
            errors.append(f"{label}[{idx}] id is empty")
            continue
        if rid in seen:
            errors.append(f"{label}[{idx}] duplicate id: {rid}")
        seen.add(rid)


def main():
    errors = []

    faqs = read_json(ROOT / "data" / "faqs.json")
    errata = read_json(ROOT / "data" / "errata.json")
    pages = read_json(ROOT / "data" / "pages.json")
    rules_index = read_json(ROOT / "content" / "rules" / "index.json")
    rules = rules_index.get("rules", [])

    doc_fields = ["kind", "id", "title", "summary", "content", "source", "publishedAt", "originUrl", "updatedAt"]
    errors.extend(require_fields(faqs, doc_fields, "faqs"))
    errors.extend(require_fields(errata, doc_fields, "errata"))
    errors.extend(require_fields(pages, ["kind", "id", "title", "summary", "file", "updatedAt"], "pages"))
    errors.extend(require_fields(rules, ["id", "title", "kind", "summary", "source", "updatedAt"], "rules"))

    validate_unique_ids(faqs, "faqs", errors)
    validate_unique_ids(errata, "errata", errors)
    validate_unique_ids(pages, "pages", errors)
    validate_unique_ids(rules, "rules", errors)

    page_ids = {str(p.get("id", "")).strip() for p in pages}

    for idx, row in enumerate(faqs):
        if row.get("kind") != "faq":
            errors.append(f"faqs[{idx}] kind should be faq")
        validate_date(row.get("publishedAt"), f"faqs[{idx}].publishedAt", errors, allow_iso=True)
        validate_date(row.get("updatedAt"), f"faqs[{idx}].updatedAt", errors, allow_iso=True)

    for idx, row in enumerate(errata):
        if row.get("kind") != "errata":
            errors.append(f"errata[{idx}] kind should be errata")
        validate_date(row.get("publishedAt"), f"errata[{idx}].publishedAt", errors, allow_iso=True)
        validate_date(row.get("updatedAt"), f"errata[{idx}].updatedAt", errors, allow_iso=True)

    for idx, row in enumerate(pages):
        if row.get("kind") != "rule_page":
            errors.append(f"pages[{idx}] kind should be rule_page")
        validate_date(row.get("updatedAt"), f"pages[{idx}].updatedAt", errors, allow_iso=False)
        file_rel = str(row.get("file", ""))
        if not file_rel:
            errors.append(f"pages[{idx}] file is empty")
        else:
            target = ROOT / file_rel
            if not target.exists():
                errors.append(f"pages[{idx}] file missing: {file_rel}")

    for idx, row in enumerate(rules):
        validate_date(row.get("updatedAt"), f"rules[{idx}].updatedAt", errors, allow_iso=False)
        kind = str(row.get("kind", "")).lower()
        if kind not in {"page", "pdf", "external"}:
            errors.append(f"rules[{idx}] unsupported kind: {kind}")
            continue

        if kind == "page":
            page_id = str(row.get("pageId", "")).strip()
            if not page_id:
                errors.append(f"rules[{idx}] kind=page requires pageId")
            elif page_id not in page_ids:
                errors.append(f"rules[{idx}] pageId not found in data/pages.json: {page_id}")

        if kind in {"pdf", "external"} and not str(row.get("url", "")).strip():
            errors.append(f"rules[{idx}] kind={kind} requires url")

    if errors:
        print("Schema validation failed:")
        for err in errors:
            print(f"- {err}")
        sys.exit(1)

    print("Schema validation passed.")


if __name__ == "__main__":
    main()

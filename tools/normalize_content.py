#!/usr/bin/env python3
"""Normalize textual content across FAQ/Errata/Rule pages."""

from __future__ import annotations

import json
from pathlib import Path

from text_normalizer import markdown_to_plain, normalize_markdown_document


ROOT = Path(__file__).resolve().parents[1]


def read_json(path: Path):
    return json.loads(path.read_text(encoding="utf-8"))


def write_json(path: Path, data):
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")


def normalize_rows(path: Path, kind: str):
    rows = read_json(path)
    changed = 0
    for row in rows:
        before = str(row.get("content", ""))
        after = normalize_markdown_document(before, kind=kind)
        if after != before:
            row["content"] = after
            changed += 1
        row["summary"] = markdown_to_plain(row.get("content", ""))[:180]
    write_json(path, rows)
    return changed, len(rows)


def normalize_pages_markdown():
    pages = read_json(ROOT / "data" / "pages.json")
    changed = 0
    checked = 0
    for item in pages:
        rel = item.get("file")
        if not rel:
            continue
        target = ROOT / rel
        if not target.exists() or target.suffix.lower() != ".md":
            continue
        checked += 1
        src = target.read_text(encoding="utf-8")
        if '<div class="rule-sheet">' in src:
            continue
        dst = normalize_markdown_document(src, kind="page")
        if dst != src:
            target.write_text(dst + "\n", encoding="utf-8")
            changed += 1
    return changed, checked


def main():
    faq_changed, faq_total = normalize_rows(ROOT / "data" / "faqs.json", "faq")
    err_changed, err_total = normalize_rows(ROOT / "data" / "errata.json", "errata")
    page_changed, page_total = normalize_pages_markdown()

    print(
        "Normalized content:",
        f"FAQ {faq_changed}/{faq_total},",
        f"Errata {err_changed}/{err_total},",
        f"Rule pages {page_changed}/{page_total}",
    )


if __name__ == "__main__":
    main()

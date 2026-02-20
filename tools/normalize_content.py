#!/usr/bin/env python3
"""Normalize textual content across FAQ/Errata/Rule pages."""

from __future__ import annotations

import json
from pathlib import Path

from text_normalizer import markdown_to_plain, normalize_inline_text, normalize_markdown_document


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

def normalize_cards_data():
    path = ROOT / "data" / "cards.json"
    payload = read_json(path)
    rows = payload.get("cards", [])
    changed = 0

    text_keys = [
        "name",
        "set",
        "rarity",
        "energy",
        "might",
        "power",
        "orientation",
        "imageAlt",
        "abilityText",
    ]
    list_text_keys = ["domains", "cardTypes", "superTypes", "tags"]

    for row in rows:
        for key in text_keys:
            if key not in row:
                continue
            before = row.get(key)
            if not isinstance(before, str):
                continue
            after = normalize_inline_text(before)
            if after != before:
                row[key] = after
                changed += 1
        for key in list_text_keys:
            val = row.get(key)
            if not isinstance(val, list):
                continue
            out = []
            local_changed = False
            for item in val:
                if isinstance(item, str):
                    fixed = normalize_inline_text(item)
                    out.append(fixed)
                    local_changed = local_changed or (fixed != item)
                else:
                    out.append(item)
            if local_changed:
                row[key] = out
                changed += 1

    if isinstance(payload.get("source"), str):
        payload["source"] = normalize_inline_text(payload["source"])
    if isinstance(payload.get("originUrl"), str):
        payload["originUrl"] = normalize_inline_text(payload["originUrl"])
    write_json(path, payload)
    return changed, len(rows)


def main():
    faq_changed, faq_total = normalize_rows(ROOT / "data" / "faqs.json", "faq")
    err_changed, err_total = normalize_rows(ROOT / "data" / "errata.json", "errata")
    page_changed, page_total = normalize_pages_markdown()
    card_changed, card_total = normalize_cards_data()

    print(
        "Normalized content:",
        f"FAQ {faq_changed}/{faq_total},",
        f"Errata {err_changed}/{err_total},",
        f"Rule pages {page_changed}/{page_total}",
        f"Cards {card_changed}/{card_total}",
    )


if __name__ == "__main__":
    main()

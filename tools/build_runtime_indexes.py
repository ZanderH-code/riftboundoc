#!/usr/bin/env python3
"""Generate deterministic runtime indexes and dataset metadata artifacts."""

from __future__ import annotations

import json
import os
import re
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import quote

ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = ROOT / "data"
RULES_INDEX_PATH = ROOT / "content" / "rules" / "index.json"
DATA_VERSION = "1.0.0"


def read_json(path: Path):
    return json.loads(path.read_text(encoding="utf-8"))


def write_json(path: Path, payload):
    path.parent.mkdir(parents=True, exist_ok=True)
    text = json.dumps(payload, ensure_ascii=False, indent=2)
    path.write_text(text + "\n", encoding="utf-8")


def iso_generated_at() -> str:
    epoch = os.getenv("SOURCE_DATE_EPOCH")
    if epoch:
        try:
            dt = datetime.fromtimestamp(int(epoch), tz=timezone.utc)
            return dt.replace(microsecond=0).isoformat().replace("+00:00", "Z")
        except ValueError:
            pass
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def normalize_text(value: str) -> str:
    return " ".join(str(value or "").split()).strip()


def normalize_for_match(value: str) -> str:
    text = str(value or "")
    text = text.replace("\u2019", "'").replace("\u2018", "'").replace("`", "'").replace("\u2032", "'")
    text = text.replace("\u201c", '"').replace("\u201d", '"')
    text = text.lower()
    replacements = {
        "\u9225\u6a9a": "'s",
        "\u9225\u6a9b": "'t",
        "\u9225\u6a92": "'l",
        "\u9225\u6a93": "'m",
        "\u9225\u6a99": "'r",
        "\u9225\u6a9d": "'v",
        "\u9225\u6a87": "'d",
    }
    for src, dst in replacements.items():
        text = text.replace(src, dst)
    return text


def markdown_to_plain(value: str) -> str:
    text = str(value or "")
    text = re.sub(r"\[\[([^\]]+)\]\]\(([^)]+)\)", r"\1", text)
    text = re.sub(r"\[([^\]]+)\]\(([^)]+)\)", r"\1", text)
    text = re.sub(r"<br\s*/?>", "\n", text, flags=re.I)
    text = re.sub(r"</(p|div|li|h\d|tr|section|article)>", "\n", text, flags=re.I)
    text = re.sub(r"<li[^>]*>", "- ", text, flags=re.I)
    text = re.sub(r"<[^>]+>", " ", text)
    text = re.sub(r"^#+\s*", "", text, flags=re.M)
    text = re.sub(r"[*_`>-]", "", text)
    text = re.sub(r"\s+", " ", text)
    return text.strip()


def as_items(payload, key: str = "items"):
    if isinstance(payload, list):
        return payload
    if isinstance(payload, dict) and isinstance(payload.get(key), list):
        return payload[key]
    return []


def extract_rule_token(value: str) -> str:
    plain = markdown_to_plain(value)
    match = re.search(r"(^|\s)(\d+(?:\.[0-9a-z]+)*\.?)(?=\s|$)", plain, flags=re.I)
    return str(match.group(2)).strip() if match else ""


def snippet_from_match(plain: str, needle: str, ctx: int = 180) -> str:
    if not plain:
        return ""
    low = plain.lower()
    pos = low.find(needle.lower())
    if pos < 0:
        pos = 0
    start = max(0, pos - 60)
    end = min(len(plain), pos + ctx)
    prefix = "..." if start > 0 else ""
    suffix = "..." if end < len(plain) else ""
    return f"{prefix}{plain[start:end].strip()}{suffix}"


def route_for_rule(rule: dict) -> str:
    kind = str(rule.get("kind") or rule.get("type") or "pdf").lower()
    if kind == "page":
        page_id = str(rule.get("pageId") or rule.get("id") or "")
        return f"pages/{quote(page_id)}/"
    if kind == "external":
        return str(rule.get("url") or "")
    src = str(rule.get("url") or "")
    return f"reader/?src={quote(src)}"


def deduplicate_updates(items: list[dict]) -> list[dict]:
    canonical: dict[str, dict] = {}

    def normalize_title(value: str) -> str:
        text = str(value or "").lower()
        text = re.sub(r"\([^)]*text version[^)]*\)", "", text)
        return normalize_text(text)

    for item in items:
        kind = str(item.get("kind") or "").lower()
        path = str(item.get("hrefPath") or item.get("href") or "")
        page_match = re.search(r"[?&]id=([^&#]+)", path, flags=re.I)
        page_id = page_match.group(1) if page_match else ""
        key = f"{kind}|{page_id or normalize_title(item.get('title') or '')}"
        prev = canonical.get(key)
        if prev is None:
            canonical[key] = item
            continue

        prev_updated = str(prev.get("updatedAt") or "")
        next_updated = str(item.get("updatedAt") or "")
        if next_updated > prev_updated:
            canonical[key] = item
            continue
        if next_updated == prev_updated and "/pages/" in path:
            prev_path = str(prev.get("hrefPath") or prev.get("href") or "")
            if "/pages/" not in prev_path:
                canonical[key] = item

    return sorted(canonical.values(), key=lambda row: str(row.get("updatedAt") or ""), reverse=True)


def collect_rules(rules_payload: dict, pages: list[dict]) -> list[dict]:
    rules = as_items(rules_payload, "rules")
    page_by_id = {str(page.get("id") or ""): page for page in pages}
    out = []
    for rule in rules:
        kind = str(rule.get("kind") or rule.get("type") or "pdf").lower()
        if kind == "page":
            page_id = str(rule.get("pageId") or rule.get("id") or "")
            page = page_by_id.get(page_id)
            body = ""
            if page and page.get("file"):
                file_path = ROOT / str(page.get("file"))
                if file_path.exists():
                    body = file_path.read_text(encoding="utf-8")
            out.append(
                {
                    "kind": "rule",
                    "id": page_id,
                    "title": page.get("title") if page else rule.get("title"),
                    "summary": page.get("summary") if page else rule.get("summary"),
                    "content": body,
                    "updatedAt": page.get("updatedAt") if page else rule.get("updatedAt"),
                    "hrefPath": f"pages/{quote(page_id)}/",
                }
            )
        else:
            href = route_for_rule(rule)
            out.append(
                {
                    "kind": "rule",
                    "id": str(rule.get("id") or "").strip(),
                    "title": rule.get("title") or rule.get("name"),
                    "summary": rule.get("summary"),
                    "content": "",
                    "updatedAt": rule.get("updatedAt"),
                    "href": href,
                    "hrefPath": "" if href.startswith("http") else href,
                }
            )
    return out


def group_related_rows(cards: list[dict], docs: list[dict], kind: str) -> tuple[dict, dict]:
    by_card_id: dict[str, list] = {}
    by_card_name: dict[str, list] = {}

    names = [
        {
            "id": str(card.get("id") or "").strip(),
            "name": str(card.get("name") or "").strip(),
            "needle": normalize_for_match(str(card.get("name") or "")),
        }
        for card in cards
        if str(card.get("id") or "").strip() and str(card.get("name") or "").strip()
    ]

    for doc in docs:
        doc_id = str(doc.get("id") or "").strip()
        if not doc_id:
            continue
        title = str(doc.get("title") or "Untitled")
        plain = markdown_to_plain("\n".join([str(doc.get("title") or ""), str(doc.get("summary") or ""), str(doc.get("content") or "")]))
        low = normalize_for_match(plain)

        for card in names:
            needle = card["needle"]
            if not needle:
                continue
            if re.search(rf"(^|[^a-z0-9]){re.escape(needle)}(?=$|[^a-z0-9])", low) is None:
                continue

            snippet = snippet_from_match(plain, needle)
            hit = {
                "snippet": snippet,
                "query": card["name"],
                "jumpQuery": card["name"],
                "anchorText": card["name"],
                "anchorHeading": title,
                "anchorIndex": 1,
                "ruleId": extract_rule_token(snippet) if kind == "rule" else "",
            }
            row = {
                "id": doc_id,
                "title": title,
                "sourceTitle": title,
                "matches": [hit],
            }
            by_card_id.setdefault(card["id"], []).append(row)
            by_card_name.setdefault(needle, []).append(row)

    def dedupe(rows: list[dict]) -> list[dict]:
        merged: dict[str, dict] = {}
        for row in rows:
            key = str(row.get("id") or "")
            if key not in merged:
                merged[key] = {**row, "matches": list(row.get("matches") or [])}
            else:
                merged[key]["matches"].extend(list(row.get("matches") or []))

        out = []
        for row in merged.values():
            seen = set()
            hits = []
            for hit in row.get("matches") or []:
                key = normalize_for_match(str(hit.get("snippet") or ""))
                if not key or key in seen:
                    continue
                seen.add(key)
                hits.append(hit)
            if not hits:
                continue
            row["matches"] = hits[:12]
            out.append(row)

        out.sort(key=lambda x: str(x.get("title") or ""))
        return out[:4]

    by_card_id = {k: dedupe(v) for k, v in by_card_id.items()}
    by_card_name = {k: dedupe(v) for k, v in by_card_name.items()}
    return by_card_id, by_card_name


def inject_object_metadata(payload: dict, generated_at: str, source_default: str) -> dict:
    out = dict(payload)
    out["dataVersion"] = DATA_VERSION
    out["generatedAt"] = generated_at
    if not normalize_text(out.get("source") or ""):
        out["source"] = source_default
    return out


def build_all() -> None:
    generated_at = iso_generated_at()

    cards_payload = read_json(DATA_DIR / "cards.json")
    faqs_payload = read_json(DATA_DIR / "faqs.json")
    errata_payload = read_json(DATA_DIR / "errata.json")
    pages_payload = read_json(DATA_DIR / "pages.json")
    rules_payload = read_json(RULES_INDEX_PATH)

    cards = as_items(cards_payload, "cards")
    faqs = as_items(faqs_payload)
    errata = as_items(errata_payload)
    pages = as_items(pages_payload)
    rules_docs = collect_rules(rules_payload, pages)

    updates_candidates = []
    updates_candidates.extend(
        {
            "kind": "FAQ",
            "title": row.get("title") or "Untitled FAQ",
            "updatedAt": row.get("updatedAt") or "",
            "hrefPath": f"faq-detail/?id={quote(str(row.get('id') or ''))}",
        }
        for row in faqs
    )
    updates_candidates.extend(
        {
            "kind": "Errata",
            "title": row.get("title") or "Untitled errata",
            "updatedAt": row.get("updatedAt") or "",
            "hrefPath": f"errata-detail/?id={quote(str(row.get('id') or ''))}",
        }
        for row in errata
    )

    rules = as_items(rules_payload, "rules")
    for rule in rules:
        href = route_for_rule(rule)
        updates_candidates.append(
            {
                "kind": "Rule",
                "title": rule.get("title") or rule.get("name") or "Untitled rule",
                "updatedAt": rule.get("updatedAt") or "",
                "hrefPath": "" if href.startswith("http") else href,
                "href": href if href.startswith("http") else "",
            }
        )

    for page in pages:
        page_id = str(page.get("id") or "")
        if not page_id:
            continue
        if not any(str(rule.get("pageId") or rule.get("id") or "") == page_id for rule in rules):
            continue
        updates_candidates.append(
            {
                "kind": "Rule",
                "title": page.get("title") or "Untitled rule page",
                "updatedAt": page.get("updatedAt") or "",
                "hrefPath": f"pages/{quote(page_id)}/",
            }
        )

    updates_items = deduplicate_updates(updates_candidates)
    updates_index = inject_object_metadata({"items": updates_items, "count": len(updates_items)}, generated_at, "riftboundoc derived updates index")
    write_json(DATA_DIR / "updates-index.json", updates_index)

    faq_docs = [
        {
            "id": str(row.get("id") or ""),
            "title": row.get("title") or "Untitled FAQ",
            "summary": row.get("summary") or "",
            "content": row.get("content") or "",
            "updatedAt": row.get("updatedAt") or "",
        }
        for row in faqs
    ]
    errata_docs = [
        {
            "id": str(row.get("id") or ""),
            "title": row.get("title") or "Untitled errata",
            "summary": row.get("summary") or "",
            "content": row.get("content") or "",
            "updatedAt": row.get("updatedAt") or "",
        }
        for row in errata
    ]

    faq_by_id, faq_by_name = group_related_rows(cards, faq_docs, "faq")
    errata_by_id, errata_by_name = group_related_rows(cards, errata_docs, "errata")
    rules_by_id, rules_by_name = group_related_rows(cards, rules_docs, "rule")

    by_card_id = {}
    by_card_name = {}

    for card in cards:
        card_id = str(card.get("id") or "").strip()
        if card_id:
            group = {
                "faq": faq_by_id.get(card_id, []),
                "errata": errata_by_id.get(card_id, []),
                "rule": rules_by_id.get(card_id, []),
            }
            if any(group.values()):
                by_card_id[card_id] = group

        name_key = normalize_for_match(str(card.get("name") or ""))
        if not name_key or name_key in by_card_name:
            continue
        by_card_name[name_key] = {
            "faq": faq_by_name.get(name_key, []),
            "errata": errata_by_name.get(name_key, []),
            "rule": rules_by_name.get(name_key, []),
        }

    card_related_index = inject_object_metadata(
        {
            "byCardId": dict(sorted(by_card_id.items(), key=lambda kv: kv[0])),
            "byCardName": dict(sorted(by_card_name.items(), key=lambda kv: kv[0])),
        },
        generated_at,
        "riftboundoc derived card related index",
    )
    write_json(DATA_DIR / "card-related-index.json", card_related_index)

    search_docs = []
    for page in pages:
        body = ""
        file_rel = str(page.get("file") or "")
        if file_rel:
            file_path = ROOT / file_rel
            if file_path.exists():
                body = file_path.read_text(encoding="utf-8")
        search_docs.append(
            {
                "kind": "Rule",
                "title": page.get("title") or "Untitled page",
                "hrefPath": f"pages/{quote(str(page.get('id') or ''))}/",
                "text": markdown_to_plain("\n".join([str(page.get("title") or ""), str(page.get("summary") or ""), body])),
            }
        )

    for row in faqs:
        search_docs.append(
            {
                "kind": "FAQ",
                "title": row.get("title") or "Untitled FAQ",
                "hrefPath": f"faq-detail/?id={quote(str(row.get('id') or ''))}",
                "text": markdown_to_plain("\n".join([str(row.get("title") or ""), str(row.get("summary") or ""), str(row.get("content") or "")])),
            }
        )

    for row in errata:
        search_docs.append(
            {
                "kind": "Errata",
                "title": row.get("title") or "Untitled errata",
                "hrefPath": f"errata-detail/?id={quote(str(row.get('id') or ''))}",
                "text": markdown_to_plain("\n".join([str(row.get("title") or ""), str(row.get("summary") or ""), str(row.get("content") or "")])),
            }
        )

    for row in rules:
        href = route_for_rule(row)
        search_docs.append(
            {
                "kind": "Rule",
                "title": row.get("title") or row.get("name") or "Untitled rule",
                "href": href if href.startswith("http") else "",
                "hrefPath": "" if href.startswith("http") else href,
                "text": markdown_to_plain("\n".join([str(row.get("title") or ""), str(row.get("summary") or ""), str(row.get("source") or "")])),
            }
        )

    for row in cards:
        search_docs.append(
            {
                "kind": "Card",
                "title": row.get("name") or row.get("publicCode") or "Untitled card",
                "hrefPath": "cards/",
                "text": markdown_to_plain(
                    "\n".join(
                        [
                            str(row.get("name") or ""),
                            str(row.get("publicCode") or ""),
                            str(row.get("set") or ""),
                            " ".join(as_items(row.get("cardTypes", []))),
                            " ".join(as_items(row.get("superTypes", []))),
                            " ".join(as_items(row.get("domains", []))),
                            " ".join(as_items(row.get("tags", []))),
                            str(row.get("rarity") or ""),
                            str(row.get("abilityText") or ""),
                        ]
                    )
                ),
            }
        )

    search_docs.sort(
        key=lambda x: (
            str(x.get("kind") or ""),
            str(x.get("title") or ""),
            str(x.get("hrefPath") or ""),
            str(x.get("href") or ""),
        )
    )
    search_index = inject_object_metadata({"docs": search_docs, "count": len(search_docs)}, generated_at, "riftboundoc derived search index")
    write_json(DATA_DIR / "search-index-lite.json", search_index)

    write_json(DATA_DIR / "cards.json", inject_object_metadata(cards_payload, generated_at, "Riftbound Official Card Gallery"))
    write_json(RULES_INDEX_PATH, inject_object_metadata(rules_payload, generated_at, "Riftbound Official"))

    sidecars = {
        "faqs.meta.json": {
            "source": str(faqs[0].get("source") if faqs else "Riftbound Official") or "Riftbound Official",
            "count": len(faqs),
            "itemsPath": "faqs.json",
        },
        "errata.meta.json": {
            "source": str(errata[0].get("source") if errata else "Riftbound Official") or "Riftbound Official",
            "count": len(errata),
            "itemsPath": "errata.json",
        },
        "pages.meta.json": {
            "source": "riftboundoc content pages",
            "count": len(pages),
            "itemsPath": "pages.json",
        },
    }
    for filename, payload in sidecars.items():
        write_json(
            DATA_DIR / filename,
            {
                "dataVersion": DATA_VERSION,
                "generatedAt": generated_at,
                "source": payload["source"],
                "count": payload["count"],
                "itemsPath": payload["itemsPath"],
            },
        )

    print("Generated runtime indexes and metadata artifacts.")


if __name__ == "__main__":
    build_all()

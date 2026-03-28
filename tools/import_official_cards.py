#!/usr/bin/env python3
"""Import Riftbound official card gallery data into data/cards.json."""

from __future__ import annotations

import argparse
import datetime as dt
import html
import json
import re
from pathlib import Path
from urllib.request import Request, urlopen

from text_normalizer import normalize_inline_text

NEXT_DATA_RE = re.compile(
    r'<script[^>]+id="__NEXT_DATA__"[^>]*>(.*?)</script>', re.DOTALL | re.IGNORECASE
)


def fetch(url: str) -> str:
    req = Request(
        url,
        headers={
            "User-Agent": "Mozilla/5.0 (compatible; riftboundoc-card-importer/1.0)",
            "Accept-Language": "en-US,en;q=0.9",
        },
    )
    with urlopen(req, timeout=30) as res:
        return res.read().decode("utf-8", errors="replace")


def html_to_text(raw_html: str) -> str:
    out = str(raw_html or "")
    out = re.sub(r"<br\s*/?>", "\n", out, flags=re.IGNORECASE)
    out = re.sub(r"</p\s*>", "\n\n", out, flags=re.IGNORECASE)
    out = re.sub(r"<[^>]+>", "", out)
    out = html.unescape(out)
    out = normalize_inline_text(out)
    out = re.sub(r"\n{3,}", "\n\n", out)
    return out.strip()


def pick_values(row: dict, path: tuple[str, ...], default=""):
    cur = row
    for key in path:
        if not isinstance(cur, dict):
            return default
        cur = cur.get(key)
    return cur if cur is not None else default


def normalize_card(row: dict) -> dict:
    domains = [
        d.get("label", "").strip()
        for d in pick_values(row, ("domain", "values"), [])
        if isinstance(d, dict) and d.get("label")
    ]
    card_types = [
        t.get("label", "").strip()
        for t in pick_values(row, ("cardType", "type"), [])
        if isinstance(t, dict) and t.get("label")
    ]
    super_types = [
        t.get("label", "").strip()
        for t in pick_values(row, ("cardType", "superType"), [])
        if isinstance(t, dict) and t.get("label")
    ]
    tags = [
        x.strip()
        for x in pick_values(row, ("tags", "tags"), [])
        if isinstance(x, str) and x.strip()
    ]
    ability_html = pick_values(row, ("text", "richText", "body"), "")
    effect_html = pick_values(row, ("effect", "richText", "body"), "")
    ability_text = html_to_text(ability_html)
    effect_text = html_to_text(effect_html)
    merged_text = "\n\n".join(x for x in (ability_text, effect_text) if x).strip()
    return {
        "id": row.get("id", ""),
        "name": normalize_inline_text(row.get("name", "")),
        "publicCode": row.get("publicCode", ""),
        "collectorNumber": row.get("collectorNumber", 0),
        "set": normalize_inline_text(pick_values(row, ("set", "value", "label"), "")),
        "setId": pick_values(row, ("set", "value", "id"), ""),
        "domains": [normalize_inline_text(x) for x in domains],
        "rarity": normalize_inline_text(pick_values(row, ("rarity", "value", "label"), "")),
        "cardTypes": [normalize_inline_text(x) for x in card_types],
        "superTypes": [normalize_inline_text(x) for x in super_types],
        "energy": pick_values(row, ("energy", "value", "label"), ""),
        "might": pick_values(row, ("might", "value", "label"), ""),
        "power": pick_values(row, ("power", "value", "label"), ""),
        "tags": [normalize_inline_text(x) for x in tags],
        "orientation": normalize_inline_text(row.get("orientation", "")),
        "imageUrl": pick_values(row, ("cardImage", "url"), ""),
        "imageAlt": normalize_inline_text(pick_values(row, ("cardImage", "accessibilityText"), "")),
        "abilityText": normalize_inline_text(merged_text),
    }


def parse_cards(page_html: str) -> list[dict]:
    m = NEXT_DATA_RE.search(page_html)
    if not m:
        raise RuntimeError("Unable to locate __NEXT_DATA__ on gallery page.")
    payload = json.loads(m.group(1))

    props = payload.get("props")
    if not isinstance(props, dict):
        raise RuntimeError("Unexpected gallery payload: missing props object.")

    page_props = props.get("pageProps")
    if not isinstance(page_props, dict):
        raise RuntimeError("Unexpected gallery payload: missing pageProps object.")

    page = page_props.get("page")
    if not isinstance(page, dict):
        raise RuntimeError("Unexpected gallery payload: missing page object.")

    blades = page.get("blades")
    if not isinstance(blades, list):
        raise RuntimeError("Unexpected gallery payload: missing blades list.")

    for blade in blades:
        cards = blade.get("cards", {}).get("items") if isinstance(blade, dict) else None
        if isinstance(cards, list) and cards:
            out = [normalize_card(row) for row in cards if isinstance(row, dict)]
            out.sort(
                key=lambda x: (
                    x.get("set", ""),
                    int(x.get("collectorNumber") or 0),
                    x.get("publicCode", ""),
                    x.get("id", ""),
                )
            )
            return out
    raise RuntimeError("Card list was not found in expected blades payload.")


def validate_cards(cards: list[dict], source_url: str) -> None:
    if not cards:
        raise RuntimeError(f"No cards parsed from source: {source_url}")

    missing_image = [c.get("name", "<unknown>") for c in cards if not c.get("imageUrl")]
    if missing_image:
        sample = ", ".join(missing_image[:5])
        raise RuntimeError(
            f"Parsed {len(cards)} cards but {len(missing_image)} are missing imageUrl (examples: {sample})."
        )

def dedupe_cards(cards: list[dict]) -> tuple[list[dict], list[str]]:
    deduped: list[dict] = []
    duplicate_keys: list[str] = []
    seen = set()
    for c in cards:
        key = str(c.get("id") or c.get("publicCode") or "").strip().lower()
        if not key:
            key = f"{c.get('set','')}::{c.get('collectorNumber',0)}::{c.get('name','')}".strip().lower()
        if key in seen:
            duplicate_keys.append(key)
            continue
        seen.add(key)
        deduped.append(c)
    return deduped, duplicate_keys


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument(
        "output",
        nargs="?",
        default="data/cards.json",
        help="Output JSON path (default: data/cards.json)",
    )
    official_url = "https://riftbound.leagueoflegends.com/en-us/card-gallery/"
    ap.add_argument(
        "--url",
        default=official_url,
        help="Official gallery URL",
    )
    ap.add_argument(
        "--allow-non-official-url",
        action="store_true",
        help="Allow overriding --url away from the official gallery endpoint",
    )
    args = ap.parse_args()

    if not args.allow_non_official_url and args.url.rstrip("/") != official_url.rstrip("/"):
        raise RuntimeError(
            "Refusing non-official URL. Use --allow-non-official-url only for debugging/import experiments."
        )

    html_doc = fetch(args.url)
    cards = parse_cards(html_doc)
    cards, duplicate_keys = dedupe_cards(cards)
    if duplicate_keys:
        sample = ", ".join(duplicate_keys[:5])
        print(
            f"Warning: deduped {len(duplicate_keys)} duplicate cards from source (examples: {sample})."
        )
    validate_cards(cards, args.url)
    now = dt.date.today().isoformat()
    output = {
        "source": normalize_inline_text("Riftbound Official Card Gallery"),
        "originUrl": args.url,
        "updatedAt": now,
        "count": len(cards),
        "cards": cards,
    }
    out_path = Path(args.output)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(json.dumps(output, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Wrote {len(cards)} cards to {out_path}")


if __name__ == "__main__":
    main()

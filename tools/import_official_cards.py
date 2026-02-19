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
    return {
        "id": row.get("id", ""),
        "name": row.get("name", ""),
        "publicCode": row.get("publicCode", ""),
        "collectorNumber": row.get("collectorNumber", 0),
        "set": pick_values(row, ("set", "value", "label"), ""),
        "setId": pick_values(row, ("set", "value", "id"), ""),
        "domains": domains,
        "rarity": pick_values(row, ("rarity", "value", "label"), ""),
        "cardTypes": card_types,
        "superTypes": super_types,
        "energy": pick_values(row, ("energy", "value", "label"), ""),
        "might": pick_values(row, ("might", "value", "label"), ""),
        "power": pick_values(row, ("power", "value", "label"), ""),
        "tags": tags,
        "orientation": row.get("orientation", ""),
        "imageUrl": pick_values(row, ("cardImage", "url"), ""),
        "imageAlt": pick_values(row, ("cardImage", "accessibilityText"), ""),
        "abilityText": html_to_text(ability_html),
    }


def parse_cards(page_html: str) -> list[dict]:
    m = NEXT_DATA_RE.search(page_html)
    if not m:
        raise RuntimeError("Unable to locate __NEXT_DATA__ on gallery page.")
    payload = json.loads(m.group(1))
    blades = (
        payload.get("props", {})
        .get("pageProps", {})
        .get("page", {})
        .get("blades", [])
    )
    for blade in blades:
        cards = blade.get("cards", {}).get("items")
        if isinstance(cards, list) and cards:
            out = [normalize_card(row) for row in cards if isinstance(row, dict)]
            out.sort(key=lambda x: (x.get("name", ""), x.get("publicCode", "")))
            return out
    raise RuntimeError("Card list was not found in expected blades payload.")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument(
        "output",
        nargs="?",
        default="data/cards.json",
        help="Output JSON path (default: data/cards.json)",
    )
    ap.add_argument(
        "--url",
        default="https://riftbound.leagueoflegends.com/en-us/card-gallery/",
        help="Official gallery URL",
    )
    args = ap.parse_args()

    html_doc = fetch(args.url)
    cards = parse_cards(html_doc)
    now = dt.date.today().isoformat()
    output = {
        "source": "Riftbound Official Card Gallery",
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


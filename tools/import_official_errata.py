#!/usr/bin/env python3
import argparse
import html
import json
import re
from datetime import datetime, timezone
from pathlib import Path
from urllib.request import urlopen
from urllib.parse import urlparse

from text_normalizer import markdown_to_plain, normalize_markdown_document


NEXT_DATA_RE = re.compile(
    r'<script[^>]+id="__NEXT_DATA__"[^>]*>(.*?)</script>', re.DOTALL | re.IGNORECASE
)


def fetch_text(url: str) -> str:
    with urlopen(url, timeout=45) as resp:  # nosec B310
        raw = resp.read()
    return raw.decode("utf-8", errors="replace")


def html_to_markdown(raw_html: str) -> str:
    text = raw_html
    text = re.sub(
        r'<a[^>]*href="([^"]+)"[^>]*>(.*?)</a>',
        lambda m: f"[{strip_tags(m.group(2)).strip()}]({m.group(1)})",
        text,
        flags=re.IGNORECASE | re.DOTALL,
    )
    text = re.sub(r"<br\s*/?>", "\n", text, flags=re.IGNORECASE)
    text = re.sub(r"<h2[^>]*>(.*?)</h2>", r"\n## \1\n", text, flags=re.IGNORECASE | re.DOTALL)
    text = re.sub(r"<h3[^>]*>(.*?)</h3>", r"\n### \1\n", text, flags=re.IGNORECASE | re.DOTALL)
    text = re.sub(r"<h4[^>]*>(.*?)</h4>", r"\n#### \1\n", text, flags=re.IGNORECASE | re.DOTALL)
    text = re.sub(r"<li[^>]*>", "\n- ", text, flags=re.IGNORECASE)
    text = re.sub(r"</li>", "", text, flags=re.IGNORECASE)
    text = re.sub(r"</p>", "\n\n", text, flags=re.IGNORECASE)
    text = re.sub(r"<p[^>]*>", "", text, flags=re.IGNORECASE)
    text = re.sub(r"<[^>]+>", "", text)
    text = html.unescape(text)
    text = re.sub(r"[ \t]+\n", "\n", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def strip_tags(raw_html: str) -> str:
    out = re.sub(r"<[^>]+>", "", raw_html)
    return html.unescape(out)

def parse_errata_page(page_html: str, url: str):
    m = NEXT_DATA_RE.search(page_html)
    if not m:
        return None
    root = json.loads(m.group(1))
    page = root.get("props", {}).get("pageProps", {}).get("page", {})
    blades = page.get("blades", [])
    rich_blade = next((b for b in blades if b.get("type") == "articleRichText"), {})
    raw_body = (rich_blade.get("richText") or {}).get("body", "")
    content = normalize_markdown_document(html_to_markdown(raw_body), kind="errata")
    path = urlparse(url).path.rstrip("/")
    slug = path.split("/")[-1] if path else "official-errata"
    return {
        "kind": "errata",
        "id": slug,
        "title": page.get("title", "Official Errata"),
        "summary": markdown_to_plain(content)[:180],
        "content": content,
        "source": "Riftbound Official",
        "publishedAt": page.get("displayedPublishDate", ""),
        "originUrl": url,
    }


def main():
    parser = argparse.ArgumentParser(description="Import official Riftbound errata pages.")
    parser.add_argument("output_json", help="Output path, e.g. data/errata.json")
    parser.add_argument("urls", nargs="+", help="Official errata URLs")
    args = parser.parse_args()

    rows = []
    for url in args.urls:
        html_text = fetch_text(url)
        row = parse_errata_page(html_text, url)
        if row:
            rows.append(row)

    stamp = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    for row in rows:
        row["updatedAt"] = stamp

    output = Path(args.output_json)
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(rows, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Imported {len(rows)} errata entries -> {output}")


if __name__ == "__main__":
    main()

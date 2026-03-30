#!/usr/bin/env python3
"""Import official Riftbound article pages into content/pages and data/pages.json."""

from __future__ import annotations

import argparse
import datetime as dt
import html
import json
import re
from pathlib import Path
from urllib.parse import urlparse
from urllib.request import urlopen

from text_normalizer import markdown_to_plain, normalize_inline_text, normalize_markdown_document

NEXT_DATA_RE = re.compile(
    r'<script[^>]+id="__NEXT_DATA__"[^>]*>(.*?)</script>', re.DOTALL | re.IGNORECASE
)


def fetch_text(url: str) -> str:
    with urlopen(url, timeout=45) as resp:  # nosec B310
        raw = resp.read()
    return raw.decode("utf-8", errors="replace")


def strip_tags(raw_html: str) -> str:
    out = re.sub(r"<[^>]+>", "", raw_html)
    return html.unescape(out)


def html_to_markdown(raw_html: str) -> str:
    text = str(raw_html or "")
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


def iso_to_date(value: str) -> str:
    raw = str(value or "").strip()
    if not raw:
        return dt.date.today().isoformat()
    m = re.match(r"^(\d{4}-\d{2}-\d{2})", raw)
    if m:
        return m.group(1)
    return dt.date.today().isoformat()


def parse_page(page_html: str, url: str) -> dict:
    m = NEXT_DATA_RE.search(page_html)
    if not m:
        raise RuntimeError(f"Unable to locate __NEXT_DATA__ from page: {url}")

    root = json.loads(m.group(1))
    page = root.get("props", {}).get("pageProps", {}).get("page", {})
    blades = page.get("blades", [])
    blocks: list[str] = []
    for blade in blades:
        if blade.get("type") != "articleRichText":
            continue
        body = (blade.get("richText") or {}).get("body", "")
        md = html_to_markdown(body)
        if md:
            blocks.append(md)

    body_md = normalize_markdown_document("\n\n".join(blocks).strip(), kind="page")
    if not body_md:
        raise RuntimeError(f"No articleRichText content parsed from page: {url}")

    path = urlparse(url).path.rstrip("/")
    slug = path.split("/")[-1] if path else "official-page"
    title = normalize_inline_text(str(page.get("title") or slug.replace("-", " ").title()).strip())
    published_at = iso_to_date(page.get("displayedPublishDate"))
    content = normalize_markdown_document(
        f"# {title}\n\nSource: {url}\n\nPublished: {published_at}\n\n{body_md}",
        kind="page",
    )
    summary = normalize_inline_text(str(page.get("description") or "").strip()) or markdown_to_plain(content)[:180]
    return {
        "id": slug,
        "title": title,
        "summary": summary,
        "content": content,
        "updatedAt": published_at,
        "file": f"content/pages/{slug}.md",
    }


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("pages_json", nargs="?", default="data/pages.json")
    ap.add_argument("urls", nargs="+")
    args = ap.parse_args()

    root = Path(__file__).resolve().parents[1]
    pages_json = root / args.pages_json
    rows = json.loads(pages_json.read_text(encoding="utf-8"))
    rows_by_id = {str(r.get("id") or ""): r for r in rows if isinstance(r, dict)}

    imported: list[dict] = []
    for url in args.urls:
        page_html = fetch_text(url)
        page = parse_page(page_html, url)
        md_path = root / page["file"]
        md_path.parent.mkdir(parents=True, exist_ok=True)
        md_path.write_text(page["content"] + "\n", encoding="utf-8")
        imported.append(page)

    for page in imported:
        rows_by_id[page["id"]] = {
            "kind": "rule_page",
            "id": page["id"],
            "title": page["title"],
            "summary": page["summary"],
            "file": page["file"],
            "updatedAt": page["updatedAt"],
        }

    preserved_order_ids = [str(r.get("id") or "") for r in rows if isinstance(r, dict)]
    final_rows = []
    used = set()
    for rid in preserved_order_ids:
        row = rows_by_id.get(rid)
        if row:
            final_rows.append(row)
            used.add(rid)
    for rid, row in rows_by_id.items():
        if rid in used:
            continue
        final_rows.append(row)

    pages_json.write_text(json.dumps(final_rows, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Imported {len(imported)} official pages -> {pages_json}")


if __name__ == "__main__":
    main()

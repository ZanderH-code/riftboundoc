#!/usr/bin/env python3
import argparse
import html
import json
import re
from datetime import datetime, timezone
from pathlib import Path
from urllib.request import urlopen


NEXT_DATA_RE = re.compile(
    r'<script[^>]+id="__NEXT_DATA__"[^>]*>(.*?)</script>', re.DOTALL | re.IGNORECASE
)


def fetch_text(url: str) -> str:
    with urlopen(url, timeout=45) as resp:  # nosec B310
        return resp.read().decode("utf-8", errors="replace")


def html_to_text(raw_html: str) -> str:
    text = raw_html
    text = re.sub(r"<br\s*/?>", "\n", text, flags=re.IGNORECASE)
    text = re.sub(r"</p>", "\n\n", text, flags=re.IGNORECASE)
    text = re.sub(r"<li[^>]*>", "- ", text, flags=re.IGNORECASE)
    text = re.sub(r"</li>", "\n", text, flags=re.IGNORECASE)
    text = re.sub(r"<[^>]+>", "", text)
    text = html.unescape(text)
    text = re.sub(r"[ \t]+\n", "\n", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def parse_faq_items(page_html: str):
    m = NEXT_DATA_RE.search(page_html)
    if not m:
        return []
    root = json.loads(m.group(1))

    page = root.get("props", {}).get("pageProps", {}).get("page", {})
    blades = page.get("blades", [])
    published = page.get("displayedPublishDate", "")
    title = page.get("title", "Official FAQ")

    out = []
    for blade in blades:
        btype = blade.get("type")
        if btype == "articleRichTextAccordion":
            header = blade.get("header") or {}
            section = header.get("subtitle") or header.get("title") or blade.get("fragmentId") or "FAQ"
            for group in blade.get("groups") or []:
                q = str(group.get("label", "")).strip()
                body = (group.get("content") or {}).get("body", "")
                a = html_to_text(body)
                if q and a:
                    out.append(
                        {
                            "question": q,
                            "answer": a,
                            "source": title,
                            "section": section,
                            "publishedAt": published,
                        }
                    )

        if btype == "articleRichText":
            raw_body = (blade.get("richText") or {}).get("body", "")
            text = html_to_text(raw_body)
            out.extend(parse_qas_from_text(text, title, published))

    # De-duplicate by question text.
    seen = set()
    unique = []
    for row in out:
        key = row["question"].strip().lower()
        if not key or key in seen:
            continue
        seen.add(key)
        unique.append(row)
    return unique


def parse_qas_from_text(text: str, source: str, published: str):
    lines = [ln.strip() for ln in text.splitlines()]
    lines = [ln for ln in lines if ln]
    out = []
    i = 0
    while i < len(lines):
        line = lines[i]
        if not line.startswith("Q:"):
            i += 1
            continue
        question = line
        i += 1
        answer_lines = []
        while i < len(lines) and not lines[i].startswith("Q:"):
            answer_lines.append(lines[i])
            i += 1
        answer = "\n".join(answer_lines).strip()
        if answer:
            out.append(
                {
                    "question": question,
                    "answer": answer,
                    "source": source,
                    "section": "FAQ",
                    "publishedAt": published,
                }
            )
    return out


def main():
    parser = argparse.ArgumentParser(description="Import official Riftbound FAQ pages.")
    parser.add_argument("output_json", help="Output path, e.g. data/faqs.json")
    parser.add_argument("urls", nargs="+", help="Official FAQ URLs")
    args = parser.parse_args()

    all_rows = []
    for url in args.urls:
        html_text = fetch_text(url)
        items = parse_faq_items(html_text)
        for row in items:
            row["originUrl"] = url
        all_rows.extend(items)

    stamp = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    for row in all_rows:
        row["updatedAt"] = stamp

    output = Path(args.output_json)
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(all_rows, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Imported {len(all_rows)} FAQ entries -> {output}")


if __name__ == "__main__":
    main()

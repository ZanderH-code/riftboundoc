#!/usr/bin/env python3
import argparse
import html
import re
from pathlib import Path

from pypdf import PdfReader

NUMBERED_RE = re.compile(r"^(?P<num>\d{3}(?:\.[0-9a-z]+)*)\.\s*(?P<text>.*)$", re.IGNORECASE)
BULLET_RE = re.compile(r"^[*\-]\s+(?P<text>.+)$")


def normalize_line(line: str) -> str:
    line = re.sub(r"\s+", " ", line).strip()
    # Normalize common ligatures from PDF extraction.
    line = (
        line.replace("\ufb01", "fi")
        .replace("\ufb02", "fl")
        .replace("\u201c", '"')
        .replace("\u201d", '"')
        .replace("\u2018", "'")
        .replace("\u2019", "'")
        .replace("\u2014", "-")
    )
    return line


def is_short_heading(text: str) -> bool:
    words = text.split()
    if not words or len(words) > 10:
        return False
    if text.startswith("*"):
        return False
    if text.endswith((".", ",", ";", ":", "!", "?")):
        return False
    return True


def level_from_num(num: str) -> int:
    return max(0, num.count("."))


def make_rule_row(rule_id: str, content: str, row_type: str, level: int = 0) -> str:
    rid = html.escape(rule_id)
    txt = html.escape(content)
    return (
        f'<div class="rule-row {row_type} level-{level}">'
        f'<div class="rule-id">{rid}</div>'
        f'<div class="rule-text">{txt}</div>'
        "</div>"
    )


def parse_page_rows(raw_text: str):
    lines = [normalize_line(x) for x in raw_text.splitlines()]
    lines = [x for x in lines if x]

    rows = []
    last_numbered = False

    for line in lines:
        # Numbered rule lines: 103.1.b.2. text
        m = NUMBERED_RE.match(line)
        if m:
            num_raw = m.group("num")
            num = num_raw + "."
            text = m.group("text").strip()
            lvl = level_from_num(num_raw)

            if not text:
                rows.append({"id": num, "text": "", "type": "rule-plain", "level": lvl})
            elif lvl == 0 and num_raw.endswith("00") and is_short_heading(text):
                rows.append(
                    {"id": num, "text": text, "type": "rule-chapter", "level": lvl}
                )
            elif is_short_heading(text):
                rows.append(
                    {"id": num, "text": text, "type": "rule-heading", "level": lvl}
                )
            else:
                rows.append({"id": num, "text": text, "type": "rule-plain", "level": lvl})

            last_numbered = True
            continue

        # Bullet lines become sub-points visually.
        bm = BULLET_RE.match(line)
        if bm:
            text = "* " + bm.group("text")
            rows.append({"id": "", "text": text, "type": "rule-bullet", "level": 1})
            last_numbered = False
            continue

        # Continuation lines (often wrapped from previous rule).
        if last_numbered:
            rows.append({"id": "", "text": line, "type": "rule-cont", "level": 1})
        else:
            rows.append({"id": "", "text": line, "type": "rule-plain", "level": 0})

        last_numbered = False

    return rows


def can_cross_page_merge(prev_row, next_row) -> bool:
    if not prev_row or not next_row:
        return False
    if next_row["id"] != "":
        return False
    if next_row["type"] != "rule-plain":
        return False
    if prev_row["type"] not in ("rule-plain", "rule-cont"):
        return False

    prev = prev_row["text"].strip()
    nxt = next_row["text"].strip()
    if not prev or not nxt:
        return False

    # Avoid merging page headers.
    if nxt.startswith("Riftbound Core Rules") or nxt.startswith("Last Updated:"):
        return False

    # Merge when previous line likely got cut at page boundary.
    if prev[-1] in ".!?;:":
        return False

    starts_like_continuation = nxt[0].islower() or nxt[0] in "),.;:"
    return starts_like_continuation


def merge_cross_page_continuations(page_rows):
    for i in range(1, len(page_rows)):
        prev_rows = page_rows[i - 1]
        cur_rows = page_rows[i]
        if not prev_rows or not cur_rows:
            continue

        while prev_rows and cur_rows and can_cross_page_merge(prev_rows[-1], cur_rows[0]):
            prev_rows[-1]["text"] = (
                f"{prev_rows[-1]['text']} {cur_rows[0]['text']}".strip()
            )
            del cur_rows[0]


def render_page(page_num: int, rows) -> str:
    out = [f"### Page {page_num}", '<div class="rule-sheet">']
    for row in rows:
        out.append(
            make_rule_row(row["id"], row["text"], row["type"], row.get("level", 0))
        )
    out.append("</div>")
    return "\n\n".join(out)


def convert_pdf(pdf_path: Path) -> str:
    reader = PdfReader(str(pdf_path))
    page_rows = []
    for i, page in enumerate(reader.pages, start=1):
        page_rows.append(parse_page_rows(page.extract_text() or ""))

    merge_cross_page_continuations(page_rows)

    pages = []
    for i, rows in enumerate(page_rows, start=1):
        pages.append(render_page(i, rows))
    return "\n\n---\n\n".join(pages).strip() + "\n"


def main() -> None:
    parser = argparse.ArgumentParser(description="Convert PDF to styled rule markdown.")
    parser.add_argument("input_pdf", help="Input PDF path")
    parser.add_argument("output_md", help="Output markdown path")
    parser.add_argument("--title", default="Rulebook", help="Top title")
    args = parser.parse_args()

    input_pdf = Path(args.input_pdf)
    output_md = Path(args.output_md)

    if not input_pdf.exists():
        raise SystemExit(f"Input PDF not found: {input_pdf}")

    output_md.parent.mkdir(parents=True, exist_ok=True)
    body = convert_pdf(input_pdf)

    header = (
        f"# {args.title}\n\n"
        "> Converted from official PDF with structured rule layout.\n\n"
    )
    output_md.write_text(header + body, encoding="utf-8")
    print(f"Saved markdown: {output_md}")


if __name__ == "__main__":
    main()

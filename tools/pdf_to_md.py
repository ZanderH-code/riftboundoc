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


def format_page(page_num: int, raw_text: str) -> str:
    lines = [normalize_line(x) for x in raw_text.splitlines()]
    lines = [x for x in lines if x]

    out = [f"### Page {page_num}", '<div class="rule-sheet">']
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
                out.append(make_rule_row(num, "", "rule-plain", lvl))
            elif lvl == 0 and num_raw.endswith("00") and is_short_heading(text):
                out.append(make_rule_row(num, text, "rule-chapter", lvl))
            elif is_short_heading(text):
                out.append(make_rule_row(num, text, "rule-heading", lvl))
            else:
                out.append(make_rule_row(num, text, "rule-plain", lvl))

            last_numbered = True
            continue

        # Bullet lines become sub-points visually.
        bm = BULLET_RE.match(line)
        if bm:
            text = "* " + bm.group("text")
            out.append(make_rule_row("", text, "rule-bullet", 1))
            last_numbered = False
            continue

        # Continuation lines (often wrapped from previous rule).
        if last_numbered:
            out.append(make_rule_row("", line, "rule-cont", 1))
        else:
            out.append(make_rule_row("", line, "rule-plain", 0))

        last_numbered = False

    out.append("</div>")
    return "\n\n".join(out)


def convert_pdf(pdf_path: Path) -> str:
    reader = PdfReader(str(pdf_path))
    pages = []
    for i, page in enumerate(reader.pages, start=1):
        pages.append(format_page(i, page.extract_text() or ""))
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

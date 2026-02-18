#!/usr/bin/env python3
import argparse
import re
from pathlib import Path

from pypdf import PdfReader


HEADING_RE = re.compile(r"^(?P<num>\d{3}(?:\.[0-9a-z]+)*)\.\s+(?P<text>.+)$", re.IGNORECASE)


def normalize_line(line: str) -> str:
    cleaned = re.sub(r"\s+", " ", line).strip()
    cleaned = cleaned.replace("\u201c", '"').replace("\u201d", '"')
    cleaned = cleaned.replace("\u2018", "'").replace("\u2019", "'")
    return cleaned


def is_heading_text(text: str) -> bool:
    words = text.split()
    if not words:
        return False
    if len(words) > 9:
        return False
    if text.startswith("*"):
        return False
    if text.endswith(('.', '!', '?', ';', ':')):
        return False
    return True


def classify_line(line: str) -> str:
    if not line:
        return ""

    if line.startswith("*"):
        return f"- {line.lstrip('* ').strip()}"

    m = HEADING_RE.match(line)
    if m:
        num = m.group("num")
        text = m.group("text").strip()
        if text.startswith("*"):
            return f"- **{num}.** {text.lstrip('* ').strip()}"
        if is_heading_text(text):
            return f"#### {num}. {text}"
        return f"**{num}.** {text}"

    return line


def format_page_text(page_num: int, raw_text: str) -> str:
    out = [f"### Page {page_num}"]
    lines = [normalize_line(x) for x in raw_text.splitlines()]
    lines = [x for x in lines if x]

    for line in lines:
        out.append(classify_line(line))

    return "\n\n".join(out)


def extract_pdf_markdown(pdf_path: Path) -> str:
    reader = PdfReader(str(pdf_path))
    chunks = []

    for i, page in enumerate(reader.pages, start=1):
        text = page.extract_text() or ""
        chunks.append(format_page_text(i, text))

    return "\n\n---\n\n".join(chunks).strip() + "\n"


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Convert a PDF rulebook into structured markdown text."
    )
    parser.add_argument("input_pdf", help="Input PDF path")
    parser.add_argument("output_md", help="Output Markdown path")
    parser.add_argument(
        "--title",
        default="Rulebook",
        help="Markdown H1 title (default: Rulebook)",
    )
    args = parser.parse_args()

    input_pdf = Path(args.input_pdf)
    output_md = Path(args.output_md)

    if not input_pdf.exists():
        raise SystemExit(f"Input PDF not found: {input_pdf}")

    output_md.parent.mkdir(parents=True, exist_ok=True)

    body = extract_pdf_markdown(input_pdf)
    header = f"# {args.title}\n\n> Converted from PDF for web reading.\n\n"
    output_md.write_text(header + body, encoding="utf-8")
    print(f"Saved markdown: {output_md}")


if __name__ == "__main__":
    main()

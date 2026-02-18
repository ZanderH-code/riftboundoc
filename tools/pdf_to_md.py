#!/usr/bin/env python3
import argparse
from pathlib import Path

from pypdf import PdfReader


def extract_pdf_text(pdf_path: Path) -> str:
    reader = PdfReader(str(pdf_path))
    chunks = []
    for i, page in enumerate(reader.pages, start=1):
        text = page.extract_text() or ""
        chunks.append(f"## Page {i}\n\n{text.strip()}\n")
    return "\n".join(chunks).strip() + "\n"


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Convert a PDF rulebook into markdown text."
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

    body = extract_pdf_text(input_pdf)
    output_md.write_text(f"# {args.title}\n\n{body}", encoding="utf-8")
    print(f"Saved markdown: {output_md}")


if __name__ == "__main__":
    main()

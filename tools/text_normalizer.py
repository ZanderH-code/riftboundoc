#!/usr/bin/env python3
"""Shared markdown normalizer for FAQ/Errata/Rule text content."""

from __future__ import annotations

import re


COMMON_SECTION_HEADINGS = {
    "Origins FAQ Outstanding Issues and Errata",
    "Cards that Tell You to Play Other Cards from Your Deck",
    "Reflexive Triggers on Spiritforged Cards",
    "Spiritforged Functional Errata",
    "Rules Clarifications",
    "Cards that Reduce Might",
    "Origins Cards",
    "Spiritforged Cards",
}


def normalize_whitespace(text: str) -> str:
    out = str(text or "")
    out = out.replace("\r\n", "\n").replace("\r", "\n")
    out = out.replace("\u00a0", " ")
    out = out.replace("\u200b", "")
    out = out.replace("\ufeff", "")
    out = re.sub(r"[ \t]+\n", "\n", out)
    out = re.sub(r"\n{3,}", "\n\n", out)
    return out.strip()


def markdown_to_plain(text: str) -> str:
    out = str(text or "")
    out = re.sub(r"\[\[([^\]]+)\]\]\([^)]+\)", r"\1", out)
    out = re.sub(r"\[([^\]]+)\]\([^)]+\)", r"\1", out)
    out = re.sub(r"^#+\s*", "", out, flags=re.MULTILINE)
    out = re.sub(r"[*_`>-]", "", out)
    out = re.sub(r"^Download Card Errata\s*", "", out, flags=re.IGNORECASE)
    out = re.sub(r"\s+", " ", out)
    return out.strip()


def _split_known_joined_headers(text: str) -> str:
    replacements = [
        (
            "design shorthand!Origins FAQ Outstanding Issues and ErrataSome categories",
            "design shorthand!\n\n## Origins FAQ Outstanding Issues and Errata\n\nSome categories",
        ),
        (
            "Spiritforged Functional ErrataA handful of cards in Spiritforged",
            "## Spiritforged Functional Errata\n\nA handful of cards in Spiritforged",
        ),
        (
            "Rules ClarificationsThere are a few cards in Spiritforged",
            "## Rules Clarifications\n\nThere are a few cards in Spiritforged",
        ),
    ]
    out = text
    for old, new in replacements:
        out = out.replace(old, new)
    return out


def normalize_markdown_document(text: str, kind: str = "generic") -> str:
    out = normalize_whitespace(text)
    out = _split_known_joined_headers(out)

    lines = out.split("\n")
    normalized = []

    for idx, raw in enumerate(lines):
        line = raw.strip()
        prev_line = lines[idx - 1].strip() if idx > 0 else ""
        next_line = lines[idx + 1].strip() if idx + 1 < len(lines) else ""

        if not line:
            normalized.append("")
            continue

        if line.startswith("#") or line.startswith("-") or line.startswith("*"):
            normalized.append(raw)
            continue
        if line.startswith("<") and line.endswith(">"):
            normalized.append(raw)
            continue

        if line in COMMON_SECTION_HEADINGS:
            normalized.append(f"## {line}")
            continue

        if re.match(r"^Q:\s+", line, flags=re.IGNORECASE) or re.match(r"^Q：\s+", line):
            normalized.append(f"### {line}")
            continue

        if line.upper() in {"[NEW TEXT]", "[OLD TEXT]"}:
            normalized.append(f"#### {line}")
            continue

        if line.lower().endswith("(revised text)"):
            normalized.append(f"### {line}")
            continue

        if (
            not prev_line
            and next_line
            and len(line) <= 72
            and not re.search(r"[.!?:]$", line)
            and not line.startswith("[")
            and re.match(r"^[A-Z0-9].*", line)
        ):
            normalized.append(f"### {line}")
            continue

        normalized.append(raw)

    out = "\n".join(normalized)
    out = re.sub(r"\n{3,}", "\n\n", out)
    return out.strip()

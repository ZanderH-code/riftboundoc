#!/usr/bin/env python3
"""Sync runtime static assets/data/content into public/ for Astro builds."""

from __future__ import annotations

import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PUBLIC = ROOT / "public"

DIRS_TO_COPY = ["assets", "data", "content"]
FILES_TO_COPY = [
    "robots.txt",
    "sitemap.xml",
    "rss.xml",
    "faq.html",
    "faq-detail.html",
    "errata.html",
    "errata-detail.html",
    "rules.html",
    "reader.html",
    "page.html",
    "cards.html",
]


def copy_dir(name: str):
    src = ROOT / name
    dst = PUBLIC / name
    if dst.exists():
        shutil.rmtree(dst)
    shutil.copytree(src, dst)
    print(f"synced dir: {name}")


def copy_file(name: str):
    src = ROOT / name
    if not src.exists():
        return
    dst = PUBLIC / name
    dst.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(src, dst)
    print(f"synced file: {name}")


def main():
    PUBLIC.mkdir(parents=True, exist_ok=True)
    for name in DIRS_TO_COPY:
        copy_dir(name)
    for name in FILES_TO_COPY:
        copy_file(name)
    print("public sync complete.")


if __name__ == "__main__":
    main()


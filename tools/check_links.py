#!/usr/bin/env python3
import re
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
EXCLUDE_PARTS = {"node_modules", "dist", "public", ".astro"}
HTML = [
    p
    for p in ROOT.rglob("*.html")
    if not any(part in EXCLUDE_PARTS for part in p.relative_to(ROOT).parts)
]
HREF_RE = re.compile(r'href="([^"]+)"')


def is_external(href: str) -> bool:
    return href.startswith("http://") or href.startswith("https://") or href.startswith("mailto:")


def exists_local(base: Path, href: str) -> bool:
    if href.startswith("#"):
        return True
    href = href.split("?")[0]
    if href == "":
        return True
    if href.startswith("/"):
        p = ROOT / href.lstrip("/")
    else:
        p = (base / href).resolve()
    if p.is_dir():
        if (p / "index.html").exists():
            return True
    elif p.exists():
        return True

    # Allow links inside mirrored folders (e.g., public/) to resolve against repo root.
    root_guess = ROOT / href.lstrip("./")
    if root_guess.is_dir():
        return (root_guess / "index.html").exists()
    return root_guess.exists()


def main():
    errors = []
    for file in HTML:
        text = file.read_text(encoding="utf-8", errors="replace")
        for href in HREF_RE.findall(text):
            if is_external(href):
                continue
            if not exists_local(file.parent, href):
                errors.append(f"{file.relative_to(ROOT)} -> {href}")
    if errors:
        print("Broken local links:")
        for e in errors:
            print("-", e)
        sys.exit(1)
    print("Link check passed.")


if __name__ == "__main__":
    main()

#!/usr/bin/env python3
import json
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def run(cmd):
    print("+", " ".join(cmd))
    subprocess.run(cmd, check=True, cwd=ROOT)


def read_json(path: Path):
    return json.loads(path.read_text(encoding="utf-8"))


def ensure_path(rel_path: str):
    target = ROOT / rel_path
    if not target.exists():
        raise RuntimeError(f"missing required path: {rel_path}")


def main():
    run([sys.executable, "tools/validate_content_schema.py"])
    run([sys.executable, "tools/check_links.py"])

    faqs = read_json(ROOT / "data" / "faqs.json")
    errata = read_json(ROOT / "data" / "errata.json")
    rules = read_json(ROOT / "content" / "rules" / "index.json").get("rules", [])

    if not faqs:
        raise RuntimeError("data/faqs.json is empty")
    if not errata:
        raise RuntimeError("data/errata.json is empty")
    if not rules:
        raise RuntimeError("content/rules/index.json has no rules")

    for route in [
        "src/pages/index.astro",
        "src/pages/cards/index.astro",
        "src/pages/faq/index.astro",
        "src/pages/faq-detail/index.astro",
        "src/pages/errata/index.astro",
        "src/pages/errata-detail/index.astro",
        "src/pages/rules/index.astro",
        "src/pages/pages/index.astro",
        "src/pages/reader/index.astro",
        "src/pages/updates/index.astro",
    ]:
        ensure_path(route)

    print("Predeploy checks passed.")


if __name__ == "__main__":
    main()

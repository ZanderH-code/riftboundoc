#!/usr/bin/env python3
import subprocess
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


def run(cmd):
    print("+", " ".join(cmd))
    subprocess.run(cmd, check=True, cwd=ROOT)


def main():
    run(
        [
            sys.executable,
            "tools/import_official_faqs.py",
            "data/faqs.json",
            "https://riftbound.leagueoflegends.com/en-us/news/rules-and-releases/riftbound-origins-faq/",
            "https://riftbound.leagueoflegends.com/en-us/news/rules-and-releases/riftbound-spiritforged-faq/",
        ]
    )
    run(
        [
            sys.executable,
            "tools/import_official_errata.py",
            "data/errata.json",
            "https://riftbound.leagueoflegends.com/en-us/news/rules-and-releases/riftbound-origins-card-errata/",
            "https://riftbound.leagueoflegends.com/en-us/news/rules-and-releases/riftbound-spiritforged-errata/",
        ]
    )
    run(
        [
            sys.executable,
            "tools/import_official_cards.py",
            "data/cards.json",
        ]
    )
    run([sys.executable, "tools/normalize_content.py"])
    run([sys.executable, "tools/predeploy_check.py"])
    print("Sync complete.")


if __name__ == "__main__":
    main()

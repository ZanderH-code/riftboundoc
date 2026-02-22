#!/usr/bin/env python3
"""Run the canonical content pipeline: normalize text then validate schema."""

from __future__ import annotations

import subprocess
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


def run_step(args: list[str]) -> int:
    proc = subprocess.run(args, cwd=ROOT)
    return int(proc.returncode)


def main() -> int:
    steps = [
        [sys.executable, "tools/normalize_content.py"],
        [sys.executable, "tools/build_runtime_indexes.py"],
        [sys.executable, "tools/validate_content_schema.py"],
    ]
    for step in steps:
        code = run_step(step)
        if code != 0:
            return code
    print("Content format pipeline passed.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

#!/usr/bin/env python3
"""Run vendored UNSLOP scanners without treating findings as failures."""

from __future__ import annotations

import argparse
import json
import os
import subprocess
import sys
from pathlib import Path
from typing import Any, Dict, List

HERE = Path(__file__).resolve().parent
SCANNERS = (
    ("banned_phrases", "banned_phrase_scan.py", ()),
    ("structure", "structure_scan.py", ("--genre", "docs")),
    ("silhouette", "silhouette_scan.py", ("--genre", "docs")),
    ("readability", "readability_metrics.py", ()),
)


def parse_args(argv: List[str]) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Advisory-only deterministic audit of Markdown files."
    )
    parser.add_argument("files", nargs="+", help="Markdown files to scan")
    return parser.parse_args(argv)


def run_scanner(name: str, script: str, options: tuple, path: Path) -> Dict[str, Any]:
    command = [sys.executable, str(HERE / script), *options, str(path)]
    environment = dict(os.environ, PYTHONDONTWRITEBYTECODE="1")
    completed = subprocess.run(command, text=True, capture_output=True, env=environment)
    if completed.returncode not in (0, 1):
        detail = completed.stderr.strip() or completed.stdout.strip() or "no diagnostic"
        raise RuntimeError(f"{name} failed with exit {completed.returncode}: {detail}")
    try:
        result = json.loads(completed.stdout)
    except json.JSONDecodeError as exc:
        raise RuntimeError(f"{name} emitted invalid JSON: {exc}") from exc
    return {
        "name": name,
        "finding_status": "findings" if completed.returncode == 1 else "clean_or_declined",
        "result": result,
    }


def main(argv: List[str]) -> int:
    args = parse_args(argv)
    paths = [Path(raw) for raw in args.files]
    for path in paths:
        if not path.is_file():
            print(f"error: not a readable file: {path}", file=sys.stderr)
            return 2
        if path.suffix.lower() not in (".md", ".markdown"):
            print(f"error: expected a Markdown file: {path}", file=sys.stderr)
            return 2

    report: Dict[str, Any] = {
        "advisory": True,
        "authority": "none",
        "files": [],
    }
    try:
        for path in paths:
            scans = [
                run_scanner(name, script, options, path)
                for name, script, options in SCANNERS
            ]
            report["files"].append({"path": str(path), "scans": scans})
    except (OSError, RuntimeError) as exc:
        print(f"error: {exc}", file=sys.stderr)
        return 3

    print(json.dumps(report, indent=2, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))

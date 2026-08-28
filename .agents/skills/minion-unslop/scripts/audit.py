#!/usr/bin/env python3
"""Run vendored UNSLOP scanners without treating findings as failures."""

from __future__ import annotations

import argparse
import json
import os
import subprocess
import sys
from collections import namedtuple
from pathlib import Path
from typing import Any, Dict, List

sys.dont_write_bytecode = True

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))

from _lang import is_probably_english  # noqa: E402

GENRES = ("prose", "docs", "social")

Scanner = namedtuple("Scanner", "name script genre_aware language_aware")
SCANNERS = (
    Scanner("banned_phrases", "banned_phrase_scan.py", False, True),
    Scanner("structure", "structure_scan.py", True, True),
    Scanner("silhouette", "silhouette_scan.py", True, True),
    Scanner("readability", "readability_metrics.py", False, False),
)
LANGUAGE_AWARE = frozenset(s.name for s in SCANNERS if s.language_aware)


def parse_args(argv: List[str]) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Advisory-only deterministic audit of Markdown files."
    )
    parser.add_argument("files", nargs="+", help="Markdown files to scan")
    parser.add_argument(
        "--genre",
        choices=GENRES,
        default="docs",
        help="threshold profile for the structure and silhouette scans (default: docs)",
    )
    return parser.parse_args(argv)


def run_scanner(scanner: Scanner, path: Path, genre: str) -> Dict[str, Any]:
    name = scanner.name
    options = ["--genre", genre] if scanner.genre_aware else []
    command = [sys.executable, str(HERE / scanner.script), *options, str(path)]
    environment = dict(os.environ, PYTHONDONTWRITEBYTECODE="1")
    completed = subprocess.run(command, text=True, capture_output=True, env=environment)
    if completed.returncode not in (0, 1):
        detail = completed.stderr.strip() or completed.stdout.strip() or "no diagnostic"
        raise RuntimeError(
            f"{name} failed on {path} with exit {completed.returncode}: {detail}"
        )
    try:
        result = json.loads(completed.stdout)
    except json.JSONDecodeError as exc:
        raise RuntimeError(f"{name} emitted invalid JSON for {path}: {exc}") from exc
    if not isinstance(result, dict):
        raise RuntimeError(f"{name} emitted a non-object JSON result for {path}")
    if result.get("error"):
        raise RuntimeError(f"{name} could not scan {path}: {result['error']}")
    return {
        "name": name,
        "finding_status": "findings" if completed.returncode == 1 else "clean_or_declined",
        "result": result,
    }


def enforce_english_only(scans: List[Dict[str, Any]], text: str) -> List[Dict[str, Any]]:
    """UNSLOP judges English prose only. Scanners that carry their own language
    check own their verdict and are never rewritten here; the wrapper runs the
    same shared check for the scans that have none."""
    if is_probably_english(text):
        return scans
    for scan in scans:
        if scan["name"] in LANGUAGE_AWARE:
            continue
        scan["finding_status"] = "clean_or_declined"
        scan["result"] = {
            "non_english": True,
            "flags": [],
            "note": "scanner has no language check; declined by the shared "
            "English-only heuristic in _lang.py",
        }
    return scans


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
        "genre": args.genre,
        "files": [],
    }
    try:
        for path in paths:
            scans = [
                run_scanner(scanner, path, args.genre) for scanner in SCANNERS
            ]
            text = path.read_text(errors="replace")
            report["files"].append(
                {"path": str(path), "scans": enforce_english_only(scans, text)}
            )
    except (OSError, RuntimeError) as exc:
        print(f"error: {exc}", file=sys.stderr)
        return 3

    print(json.dumps(report, indent=2, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))

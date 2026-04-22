#!/usr/bin/env python3
from __future__ import annotations

import argparse
from datetime import date
from pathlib import Path


def iter_dairy_notes(directory: Path) -> list[Path]:
    return sorted(
        [
            path
            for path in directory.glob("*.md")
            if path.is_file() and path.name != "README.md"
        ],
        key=lambda path: path.name,
    )


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Find the earliest dairy note file in a directory."
    )
    parser.add_argument(
        "directory",
        nargs="?",
        default="/home/fantengyuan/workspace/.codex/memory/dairy",
        help="Path to the dairy directory. Defaults to .codex/memory/dairy.",
    )
    parser.add_argument(
        "--all",
        action="store_true",
        help="Print every dairy note in ascending date order instead of only the earliest one.",
    )
    parser.add_argument(
        "--before",
        metavar="YYYY-MM-DD",
        help="Only include dairy notes whose filename date is strictly earlier than this date.",
    )
    parser.add_argument(
        "--before-today",
        action="store_true",
        help="Only include dairy notes whose filename date is strictly earlier than today.",
    )
    args = parser.parse_args()

    directory = Path(args.directory).expanduser().resolve()
    if not directory.is_dir():
        raise SystemExit(f"not a directory: {directory}")

    notes = iter_dairy_notes(directory)
    cutoff = None
    if args.before and args.before_today:
        raise SystemExit("use either --before or --before-today, not both")
    if args.before:
        cutoff = args.before
        try:
            date.fromisoformat(cutoff)
        except ValueError as exc:
            raise SystemExit(f"invalid --before date: {cutoff}") from exc
    elif args.before_today:
        cutoff = date.today().isoformat()
    if cutoff is not None:
        notes = [note for note in notes if note.stem < cutoff]
    if not notes:
        raise SystemExit(f"no dairy notes found under: {directory}")

    if args.all:
        for note in notes:
            print(note)
        return 0

    print(notes[0])
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

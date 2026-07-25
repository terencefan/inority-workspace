#!/usr/bin/env python3
"""Summarize py-spy folded/raw output without third-party dependencies."""

from __future__ import annotations

import argparse
import json
from collections import Counter
from pathlib import Path


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("input", type=Path)
    parser.add_argument("--top", type=int, default=20)
    parser.add_argument("--output", type=Path)
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    leaf: Counter[str] = Counter()
    inclusive: Counter[str] = Counter()
    stacks: Counter[str] = Counter()
    total = 0

    for line_number, raw_line in enumerate(
        args.input.read_text(encoding="utf-8").splitlines(), start=1
    ):
        line = raw_line.strip()
        if not line:
            continue
        try:
            stack, count_text = line.rsplit(" ", 1)
            count = int(count_text)
        except ValueError as exc:
            raise ValueError(f"{args.input}:{line_number}: malformed folded row") from exc
        frames = stack.split(";")
        total += count
        stacks[stack] += count
        leaf[frames[-1]] += count
        for frame in set(frames):
            inclusive[frame] += count

    def top_rows(counter: Counter[str]) -> list[dict[str, int | float | str]]:
        return [
            {
                "name": name,
                "samples": count,
                "sample_share": round(count / total, 6) if total else 0,
            }
            for name, count in counter.most_common(args.top)
        ]

    result = {
        "schema_version": 1,
        "source": str(args.input),
        "total_samples": total,
        "unique_stacks": len(stacks),
        "top_leaf_frames": top_rows(leaf),
        "top_inclusive_frames": top_rows(inclusive),
        "top_stacks": top_rows(stacks),
    }
    rendered = json.dumps(result, ensure_ascii=False, indent=2) + "\n"
    if args.output:
        args.output.write_text(rendered, encoding="utf-8")
    else:
        print(rendered, end="")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

from __future__ import annotations

import argparse
import sys
from pathlib import Path

import difflib
import re
from dataclasses import dataclass

from commands.normalize import NUMBERED_H3_RE, extract_h3_blocks, parse_sections, section_slice


HEADING_RE = re.compile(r"^(### )(?:[🟢🟡🔴]\s+)?(\d+)(\. .*)$")
ITEM_TOKEN_RE = re.compile(r"item-(\d+)(-execution-record|-acceptance-record)?")


@dataclass(frozen=True)
class Step:
    number: int
    label: str
    heading_idx: int


def load_numbered_steps(lines: list[str], section_name: str) -> tuple[tuple[int, int], list[Step]]:
    h2_sections = parse_sections(lines, 2)
    section = section_slice(h2_sections, section_name, len(lines))
    if section is None:
        raise ValueError(f"missing `## {section_name}` section")

    start, end = section
    steps: list[Step] = []
    for heading_idx, title, _, _ in extract_h3_blocks(lines, start + 1, end):
        match = NUMBERED_H3_RE.match(title)
        if match is None:
            raise ValueError(f"`## {section_name}` contains a non-numbered step heading: {title}")
        steps.append(Step(number=int(match.group(1)), label=match.group(2), heading_idx=heading_idx))
    if not steps:
        raise ValueError(f"`## {section_name}` does not contain any numbered items")
    return section, steps


def ensure_step_alignment(plan_steps: list[Step], record_steps: list[Step]) -> None:
    plan_shape = [(step.number, step.label) for step in plan_steps]
    record_shape = [(step.number, step.label) for step in record_steps]
    if plan_shape != record_shape:
        raise ValueError("`## 执行计划` and `## 执行记录` are not aligned; renumbering aborted")


def build_mapping(steps: list[Step], start: int, shift: int) -> dict[int, int]:
    if start < 1:
        raise ValueError("`--start` must be >= 1")
    if shift < 1:
        raise ValueError("`--shift` must be >= 1")

    existing_numbers = {step.number for step in steps}
    if start not in existing_numbers:
        available = ", ".join(str(step.number) for step in steps)
        raise ValueError(f"`--start {start}` does not match an existing item; available numbers: {available}")

    return {step.number: step.number + shift for step in steps if step.number >= start}


def replace_heading(line: str, mapping: dict[int, int]) -> str:
    newline = "\n" if line.endswith("\n") else ""
    body = line[:-1] if newline else line
    match = HEADING_RE.match(body)
    if match is None:
        return line

    old_number = int(match.group(2))
    new_number = mapping.get(old_number)
    if new_number is None:
        return line
    traffic_light = ""
    title_body = body.removeprefix(match.group(1))
    if title_body.startswith(("🟢 ", "🟡 ", "🔴 ")):
        traffic_light = title_body[:2]
    return f"{match.group(1)}{traffic_light}{new_number}{match.group(3)}{newline}"


def replace_item_tokens(line: str, mapping: dict[int, int]) -> str:
    def repl(match: re.Match[str]) -> str:
        old_number = int(match.group(1))
        suffix = match.group(2) or ""
        new_number = mapping.get(old_number)
        if new_number is None:
            return match.group(0)
        return f"item-{new_number}{suffix}"

    return ITEM_TOKEN_RE.sub(repl, line)


def rewrite_section(lines: list[str], section: tuple[int, int], mapping: dict[int, int]) -> None:
    start, end = section
    for idx in range(start + 1, end):
        line = lines[idx]
        line = replace_heading(line, mapping)
        line = replace_item_tokens(line, mapping)
        lines[idx] = line


def shift_runbook_items(text: str, start: int, shift: int) -> tuple[str, dict[int, int]]:
    lines = text.splitlines(keepends=True)
    if not lines:
        raise ValueError("runbook is empty")

    plain_lines = [line.rstrip("\n") for line in lines]
    plan_section, plan_steps = load_numbered_steps(plain_lines, "执行计划")
    record_section, record_steps = load_numbered_steps(plain_lines, "执行记录")
    ensure_step_alignment(plan_steps, record_steps)

    mapping = build_mapping(plan_steps, start=start, shift=shift)
    updated_lines = list(lines)
    rewrite_section(updated_lines, plan_section, mapping)
    rewrite_section(updated_lines, record_section, mapping)
    return "".join(updated_lines), mapping


def render_diff(path: Path, before: str, after: str) -> str:
    return "".join(
        difflib.unified_diff(
            before.splitlines(keepends=True),
            after.splitlines(keepends=True),
            fromfile=str(path),
            tofile=str(path),
        )
    )


def register(subparsers: argparse._SubParsersAction[argparse.ArgumentParser]) -> None:
    parser = subparsers.add_parser(
        "shift-items",
        help="Shift numbered runbook items to open insertion slots",
        description=(
            "Shift numbered items in `## 执行计划` and `## 执行记录` "
            "to open insertion slots in the middle of a runbook."
        ),
    )
    parser.add_argument("runbook", type=Path, help="Path to the runbook markdown file")
    parser.add_argument("--start", type=int, required=True, help="First existing item number to shift")
    parser.add_argument("--shift", type=int, required=True, help="How many slots to open")
    parser.add_argument(
        "--in-place",
        action="store_true",
        help="Write the rewritten markdown back to the source file",
    )
    parser.set_defaults(handler=handle)


def handle(args: argparse.Namespace) -> int:
    source = args.runbook.read_text(encoding="utf-8")
    try:
        rewritten, mapping = shift_runbook_items(source, start=args.start, shift=args.shift)
    except ValueError as exc:
        print(f"error: {exc}", file=sys.stderr)
        return 1

    if rewritten == source:
        print("No numbering changes were required.", file=sys.stderr)
        return 0

    opened_end = args.start + args.shift - 1
    moved_count = len(mapping)
    moved_summary = f"{min(mapping)}-{max(mapping)} -> {min(mapping.values())}-{max(mapping.values())}"

    if args.in_place:
        args.runbook.write_text(rewritten, encoding="utf-8")
        print(
            f"Shifted {moved_count} item(s) in {args.runbook}; "
            f"opened slots {args.start}-{opened_end}; moved {moved_summary}."
        )
        return 0

    diff = render_diff(args.runbook, source, rewritten)
    if diff:
        sys.stdout.write(diff)
    else:
        print("No numbering changes were required.", file=sys.stderr)
    print(
        f"Preview only: would open slots {args.start}-{opened_end} by shifting {moved_count} item(s).",
        file=sys.stderr,
    )
    return 0

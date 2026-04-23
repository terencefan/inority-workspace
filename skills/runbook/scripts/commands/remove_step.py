from __future__ import annotations

import argparse
import sys
from pathlib import Path

import commands.normalize as normalize_cmd
import commands.validate as validate_cmd


def extract_item_blocks(
    lines: list[str], section_name: str, *, include_anchor: bool
) -> list[dict[str, int | str]]:
    h2_sections = normalize_cmd.parse_sections(lines, 2)
    section = normalize_cmd.section_slice(h2_sections, section_name, len(lines))
    if section is None:
        raise ValueError(f"missing `## {section_name}` section")

    blocks: list[dict[str, int | str]] = []
    for heading_idx, title, block_start, block_end in normalize_cmd.extract_h3_blocks(lines, section[0] + 1, section[1]):
        match = normalize_cmd.NUMBERED_H3_RE.match(title)
        if match is None:
            continue

        start_idx = block_start
        if include_anchor:
            probe = heading_idx - 1
            while probe > section[0] and not lines[probe].strip():
                probe -= 1
            if probe > section[0] and lines[probe].strip().startswith("<a id="):
                start_idx = probe

        h4_blocks = normalize_cmd.extract_h4_blocks(lines, block_start + 1, block_end)
        content_end = h4_blocks[-1][3] if h4_blocks else block_end
        blocks.append(
            {
                "number": int(match.group(1)),
                "label": match.group(2),
                "start_idx": start_idx,
                "content_end": content_end,
            }
        )
    return blocks


def remove_block_from_section(
    lines: list[str], section_name: str, item: int, *, include_anchor: bool
) -> list[str]:
    blocks = extract_item_blocks(lines, section_name, include_anchor=include_anchor)
    for block in blocks:
        if int(block["number"]) == item:
            start_idx = int(block["start_idx"])
            end_idx = int(block["content_end"])
            return lines[:start_idx] + lines[end_idx:]
    raise ValueError(f"`## {section_name}` does not contain item {item}")


def remove_step(text: str, item: int) -> str:
    lines = text.splitlines(keepends=True)
    if not lines:
        raise ValueError("runbook is empty")

    updated = remove_block_from_section(lines, "执行计划", item, include_anchor=True)
    updated = remove_block_from_section(updated, "执行记录", item, include_anchor=False)
    return "".join(updated)


def register(subparsers: argparse._SubParsersAction[argparse.ArgumentParser]) -> None:
    parser = subparsers.add_parser(
        "remove-step",
        help="Remove one numbered step from plan and records",
        description="Remove one numbered step from 执行计划 and 执行记录, then normalize and validate.",
    )
    parser.add_argument("path", help="Path to the runbook markdown file.")
    parser.add_argument("--item", type=int, required=True, help="Numbered item to remove.")
    parser.set_defaults(handler=handle)


def handle(args: argparse.Namespace) -> int:
    path = Path(args.path).expanduser().resolve()
    if not path.is_file():
        print(f"error: target file not found: {path}", file=sys.stderr)
        return 1

    try:
        rewritten = remove_step(path.read_text(encoding="utf-8"), args.item)
    except ValueError as exc:
        print(f"error: {exc}", file=sys.stderr)
        return 1

    normalized = normalize_cmd.normalize_runbook_numbering(rewritten)
    errors = validate_cmd.collect_errors(normalized)
    if errors:
        validate_cmd.print_fail(path, errors, json_mode=False)
        return 1

    path.write_text(normalized, encoding="utf-8")
    print(f"[runbook-remove-step] removed item {args.item} from {path}")
    return 0

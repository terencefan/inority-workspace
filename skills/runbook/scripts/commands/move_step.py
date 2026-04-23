from __future__ import annotations

import argparse
import sys
from pathlib import Path

import commands.normalize as normalize_cmd
import commands.validate as validate_cmd


def extract_item_blocks(
    lines: list[str], section_name: str, *, include_anchor: bool
) -> tuple[tuple[int, int], list[dict[str, int | str]]]:
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
    return section, blocks


def extract_block_text(
    lines: list[str], section_name: str, item: int, *, include_anchor: bool
) -> tuple[str, list[str]]:
    _, blocks = extract_item_blocks(lines, section_name, include_anchor=include_anchor)
    for block in blocks:
        if int(block["number"]) == item:
            start_idx = int(block["start_idx"])
            end_idx = int(block["content_end"])
            return "".join(lines[start_idx:end_idx]), lines[:start_idx] + lines[end_idx:]
    raise ValueError(f"`## {section_name}` does not contain item {item}")


def insertion_index(
    lines: list[str], section_name: str, after: int, *, include_anchor: bool
) -> int:
    section, blocks = extract_item_blocks(lines, section_name, include_anchor=include_anchor)
    if after < 0:
        raise ValueError("`--after` must be >= 0")
    if after == 0:
        return int(blocks[0]["start_idx"]) if blocks else section[1]

    for idx, block in enumerate(blocks):
        if int(block["number"]) != after:
            continue
        if idx == len(blocks) - 1:
            return int(block["content_end"])
        return int(blocks[idx + 1]["start_idx"])
    available = ", ".join(str(int(block["number"])) for block in blocks)
    raise ValueError(f"`--after {after}` does not match an existing item; available numbers: {available}")


def move_in_section(
    lines: list[str],
    section_name: str,
    *,
    item: int,
    after: int,
    include_anchor: bool,
) -> list[str]:
    block_text, removed_lines = extract_block_text(lines, section_name, item, include_anchor=include_anchor)
    insert_at = insertion_index(removed_lines, section_name, after, include_anchor=include_anchor)
    block_lines = block_text.splitlines(keepends=True)
    return removed_lines[:insert_at] + block_lines + removed_lines[insert_at:]


def move_step(text: str, item: int, after: int) -> str:
    if item == after:
        raise ValueError("`--item` and `--after` must not be the same")

    lines = text.splitlines(keepends=True)
    if not lines:
        raise ValueError("runbook is empty")

    updated = move_in_section(lines, "执行计划", item=item, after=after, include_anchor=True)
    updated = move_in_section(updated, "执行记录", item=item, after=after, include_anchor=False)
    return "".join(updated)


def register(subparsers: argparse._SubParsersAction[argparse.ArgumentParser]) -> None:
    parser = subparsers.add_parser(
        "move-step",
        help="Move one numbered step to a new position",
        description="Move one numbered step in 执行计划 and 执行记录, then normalize and validate.",
    )
    parser.add_argument("path", help="Path to the runbook markdown file.")
    parser.add_argument("--item", type=int, required=True, help="Numbered item to move.")
    parser.add_argument("--after", type=int, required=True, help="Move the item after this numbered step. Use 0 for first.")
    parser.set_defaults(handler=handle)


def handle(args: argparse.Namespace) -> int:
    path = Path(args.path).expanduser().resolve()
    if not path.is_file():
        print(f"error: target file not found: {path}", file=sys.stderr)
        return 1

    try:
        rewritten = move_step(path.read_text(encoding="utf-8"), args.item, args.after)
    except ValueError as exc:
        print(f"error: {exc}", file=sys.stderr)
        return 1

    normalized = normalize_cmd.normalize_runbook_numbering(rewritten)
    errors = validate_cmd.collect_errors(normalized)
    if errors:
        validate_cmd.print_fail(path, errors, json_mode=False)
        return 1

    path.write_text(normalized, encoding="utf-8")
    print(f"[runbook-move-step] moved item {args.item} after {args.after} in {path}")
    return 0

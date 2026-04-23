from __future__ import annotations

import argparse
import re
from pathlib import Path


NUMBERED_H3_RE = re.compile(r"^(\d+)\. (.+)$")
STEP_SIGNED_EXEC_RE = re.compile(r"^#### 执行 @\S+ \d{4}-\d{2}-\d{2} \d{2}:\d{2} [A-Za-z0-9:+-]+$")
STEP_SIGNED_ACCEPT_RE = re.compile(r"^#### 验收 @\S+ \d{4}-\d{2}-\d{2} \d{2}:\d{2} [A-Za-z0-9:+-]+$")
PLAN_JUMP_LINK_RE = re.compile(r"^\[跳转到(?:执行|验收)记录\]\(#item-\d+-(?:execution|acceptance)-record\)$")
ITEM_TOKEN_RE = re.compile(r"item-(\d+)(-execution-record|-acceptance-record)?")


def parse_sections(lines: list[str], level: int) -> list[tuple[int, str]]:
    prefix = "#" * level + " "
    return [
        (idx, line[len(prefix) :].strip())
        for idx, line in enumerate(lines)
        if line.startswith(prefix)
    ]


def section_slice(
    sections: list[tuple[int, str]], title: str, lines_len: int
) -> tuple[int, int] | None:
    for i, (start, name) in enumerate(sections):
        if name == title:
            end = sections[i + 1][0] if i + 1 < len(sections) else lines_len
            return start, end
    return None


def extract_h3_blocks(
    lines: list[str], start: int, end: int
) -> list[tuple[int, str, int, int]]:
    local_h3 = parse_sections(lines[start:end], 3)
    blocks: list[tuple[int, str, int, int]] = []
    for i, (local_start, title) in enumerate(local_h3):
        abs_start = start + local_start
        abs_end = start + local_h3[i + 1][0] if i + 1 < len(local_h3) else end
        blocks.append((abs_start, title, abs_start, abs_end))
    return blocks


def extract_h4_blocks(
    lines: list[str], start: int, end: int
) -> list[tuple[int, str, int, int]]:
    local_h4 = parse_sections(lines[start:end], 4)
    blocks: list[tuple[int, str, int, int]] = []
    for i, (local_start, title) in enumerate(local_h4):
        abs_start = start + local_start
        abs_end = start + local_h4[i + 1][0] if i + 1 < len(local_h4) else end
        blocks.append((abs_start, title, abs_start, abs_end))
    return blocks


def replace_item_number_tokens(line: str, old_number: int, new_number: int) -> str:
    def repl(match: re.Match[str]) -> str:
        actual = int(match.group(1))
        if actual != old_number:
            return match.group(0)
        suffix = match.group(2) or ""
        return f"item-{new_number}{suffix}"

    return ITEM_TOKEN_RE.sub(repl, line)


def normalize_numbered_step_section(
    lines: list[str],
    section_name: str,
    *,
    fix_item_tokens: bool,
) -> None:
    h2_sections = parse_sections(lines, 2)
    section = section_slice(h2_sections, section_name, len(lines))
    if section is None:
        return

    section_start, section_end = section
    expected = 1
    for heading_idx, title, block_start, block_end in extract_h3_blocks(lines, section_start + 1, section_end):
        match = NUMBERED_H3_RE.match(title)
        if match is None:
            continue

        actual = int(match.group(1))
        label = match.group(2)
        newline = "\n" if lines[heading_idx].endswith("\n") else ""
        lines[heading_idx] = f"### {expected}. {label}{newline}"

        if fix_item_tokens and actual != expected:
            anchor_idx = heading_idx - 1
            while anchor_idx > section_start and not lines[anchor_idx].strip():
                anchor_idx -= 1
            if anchor_idx > section_start:
                lines[anchor_idx] = replace_item_number_tokens(lines[anchor_idx], actual, expected)
            for idx in range(block_start + 1, block_end):
                lines[idx] = replace_item_number_tokens(lines[idx], actual, expected)
        expected += 1


def normalize_plan_jump_links(lines: list[str]) -> None:
    h2_sections = parse_sections(lines, 2)
    section = section_slice(h2_sections, "执行计划", len(lines))
    if section is None:
        return

    step_blocks = extract_h3_blocks(lines, section[0] + 1, section[1])
    for step_index, (_, _, step_start, step_end) in reversed(list(enumerate(step_blocks, start=1))):
        h4_blocks = extract_h4_blocks(lines, step_start + 1, step_end)
        for _, h4_title, block_start, block_end in reversed(h4_blocks):
            is_exec_block = h4_title == "执行" or STEP_SIGNED_EXEC_RE.match(f"#### {h4_title}") is not None
            is_accept_block = h4_title == "验收" or STEP_SIGNED_ACCEPT_RE.match(f"#### {h4_title}") is not None
            if not is_exec_block and not is_accept_block:
                continue

            expected_link = (
                f"[跳转到执行记录](#item-{step_index}-execution-record)"
                if is_exec_block
                else f"[跳转到验收记录](#item-{step_index}-acceptance-record)"
            )

            body_lines = [
                line
                for line in lines[block_start + 1 : block_end]
                if not PLAN_JUMP_LINK_RE.match(line.strip())
            ]
            while body_lines and not body_lines[0].strip():
                body_lines.pop(0)

            replacement = ["\n", f"{expected_link}\n", "\n", *body_lines]
            lines[block_start + 1 : block_end] = replacement


def normalize_runbook_numbering(text: str) -> str:
    lines = text.splitlines(keepends=True)
    if not lines:
        return text

    normalize_numbered_step_section(lines, "执行计划", fix_item_tokens=True)
    normalize_numbered_step_section(lines, "执行记录", fix_item_tokens=True)
    normalize_numbered_step_section(lines, "访谈记录", fix_item_tokens=False)
    normalize_plan_jump_links(lines)
    return "".join(lines)


def normalize_file(path: Path) -> tuple[str, str, bool]:
    source = path.read_text(encoding="utf-8")
    normalized = normalize_runbook_numbering(source)
    changed = normalized != source
    if changed:
        path.write_text(normalized, encoding="utf-8")
    return source, normalized, changed


def register(subparsers: argparse._SubParsersAction[argparse.ArgumentParser]) -> None:
    parser = subparsers.add_parser(
        "normalize",
        help="Normalize numbering, item anchors, and jump links",
        description="Normalize runbook numbering, item anchors, and jump links in place.",
    )
    parser.add_argument("path", help="Path to runbook markdown.")
    parser.set_defaults(handler=handle)


def handle(args: argparse.Namespace) -> int:
    path = Path(args.path).expanduser().resolve()
    _, _, changed = normalize_file(path)
    status = "updated" if changed else "unchanged"
    print(f"[runbook-normalize] {status} {path}")
    return 0

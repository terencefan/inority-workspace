from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path

import commands.normalize as normalize_cmd
import commands.validate as validate_cmd


NUMBERED_TITLE_RE = re.compile(r"^\d+\.\s+(.+)$")


def clean_title(raw_title: str) -> str:
    title = raw_title.strip()
    if not title or "\n" in title:
        raise ValueError("`--title` must be a single non-empty line")
    match = NUMBERED_TITLE_RE.match(title)
    if match is not None:
        title = match.group(1).strip()
    return title


def extract_item_blocks(lines: list[str], section_name: str) -> tuple[tuple[int, int], list[dict[str, int | str]]]:
    h2_sections = normalize_cmd.parse_sections(lines, 2)
    section = normalize_cmd.section_slice(h2_sections, section_name, len(lines))
    if section is None:
        raise ValueError(f"missing `## {section_name}` section")

    blocks: list[dict[str, int | str]] = []
    for heading_idx, title, block_start, block_end in normalize_cmd.extract_h3_blocks(lines, section[0] + 1, section[1]):
        match = normalize_cmd.NUMBERED_H3_RE.match(title)
        if match is None:
            continue
        h4_blocks = normalize_cmd.extract_h4_blocks(lines, block_start + 1, block_end)
        content_end = h4_blocks[-1][3] if h4_blocks else block_end
        blocks.append(
            {
                "number": int(match.group(1)),
                "label": match.group(2),
                "heading_idx": heading_idx,
                "block_start": block_start,
                "block_end": block_end,
                "content_end": content_end,
            }
        )
    return section, blocks


def first_item_insert_index(
    lines: list[str],
    section: tuple[int, int],
) -> int:
    section_start, section_end = section
    for idx in range(section_start + 1, section_end):
        stripped = lines[idx].strip()
        if stripped.startswith("- "):
            return idx
    return section_end


def insertion_index(blocks: list[dict[str, int | str]], after: int) -> tuple[int, int]:
    if after < 0:
        raise ValueError("`--after` must be >= 0")
    if after == 0:
        first = blocks[0]
        return int(first["block_start"]), 1

    for idx, block in enumerate(blocks):
        if int(block["number"]) != after:
            continue
        provisional_number = after + 1
        if idx == len(blocks) - 1:
            return int(block["content_end"]), provisional_number
        return int(block["block_end"]), provisional_number
    available = ", ".join(str(int(block["number"])) for block in blocks)
    raise ValueError(f"`--after {after}` does not match an existing item; available numbers: {available}")


def build_plan_step(number: int, title: str) -> str:
    traffic_light = title[:2] if title.startswith(("🟢 ", "🟡 ", "🔴 ")) else "🟡 "
    clean_title = title[2:] if title.startswith(("🟢 ", "🟡 ", "🔴 ")) else title
    return (
        f"\n<a id=\"item-{number}\"></a>\n\n"
        f"### {traffic_light}{number}. {clean_title}\n\n"
        "> [!WARNING]\n"
        f"> 本步骤以幂等方式执行：{clean_title}。\n\n"
        "#### 执行\n\n"
        f"[跳转到执行记录](#item-{number}-execution-record)\n\n"
        "操作性质：幂等\n\n"
        "执行分组：<执行分组标题>\n\n"
        "```bash\n...\n```\n\n"
        "预期结果：\n\n"
        "- <预期状态变化或产物>\n\n"
        "停止条件：\n\n"
        "- <失败条件>\n"
        "- <若命中停止条件或出现新的事实，必须回规划态>\n\n"
        "#### 验收\n\n"
        f"[跳转到验收记录](#item-{number}-acceptance-record)\n\n"
        "验收命令：\n\n"
        "```bash\n...\n```\n\n"
        "预期结果：\n\n"
        "- <通过证据>\n\n"
        "停止条件：\n\n"
        "- <验收失败条件>\n"
        "- <若验收失败或出现新 blocker，不得直接续跑下一项>\n"
    )


def build_record_step(number: int, title: str) -> str:
    traffic_light = title[:2] if title.startswith(("🟢 ", "🟡 ", "🔴 ")) else "🟡 "
    clean_title = title[2:] if title.startswith(("🟢 ", "🟡 ", "🔴 ")) else title
    return (
        f"\n### {traffic_light}{number}. {clean_title}\n\n"
        f"<a id=\"item-{number}-execution-record\"></a>\n\n"
        "#### 执行记录\n\n"
        "执行命令：\n\n"
        "```bash\n...\n```\n\n"
        "执行结果：\n\n"
        "```text\n...\n```\n\n"
        "执行结论：\n\n"
        "- 待执行\n\n"
        f"<a id=\"item-{number}-acceptance-record\"></a>\n\n"
        "#### 验收记录\n\n"
        "验收命令：\n\n"
        "```bash\n...\n```\n\n"
        "验收结果：\n\n"
        "```text\n...\n```\n\n"
        "验收结论：\n\n"
        "- 待执行\n"
    )


def add_step(text: str, title: str, after: int | None) -> str:
    lines = text.splitlines(keepends=True)
    if not lines:
        raise ValueError("runbook is empty")

    _, plan_blocks = extract_item_blocks(lines, "执行计划")
    _, record_blocks = extract_item_blocks(lines, "执行记录")
    plan_titles = [str(block["label"]) for block in plan_blocks]
    record_titles = [str(block["label"]) for block in record_blocks]
    if plan_titles != record_titles:
        raise ValueError("`## 执行计划` and `## 执行记录` are not aligned; add-step aborted")

    plan_section, _ = extract_item_blocks(lines, "执行计划")
    record_section, _ = extract_item_blocks(lines, "执行记录")
    if not plan_blocks and not record_blocks:
        if after not in (None, 0):
            raise ValueError("`--after` must be omitted or set to 0 when no numbered items exist yet")
        plan_insert_at = first_item_insert_index(lines, plan_section)
        provisional_number = 1
        record_insert_at = first_item_insert_index(lines, record_section)
    else:
        target_after = after if after is not None else int(plan_blocks[-1]["number"])
        plan_insert_at, provisional_number = insertion_index(plan_blocks, target_after)
        record_insert_at, _ = insertion_index(record_blocks, target_after)

    plan_block = build_plan_step(provisional_number, title)
    record_block = build_record_step(provisional_number, title)

    updated = "".join(lines[:plan_insert_at]) + plan_block + "".join(lines[plan_insert_at:])
    updated_lines = updated.splitlines(keepends=True)

    # Recompute record insertion point after the plan insertion has changed line offsets.
    record_section_after_plan, record_blocks_after_plan = extract_item_blocks(updated_lines, "执行记录")
    if record_blocks_after_plan:
        record_insert_at, _ = insertion_index(record_blocks_after_plan, target_after)
    else:
        record_insert_at = first_item_insert_index(updated_lines, record_section_after_plan)
    updated = "".join(updated_lines[:record_insert_at]) + record_block + "".join(updated_lines[record_insert_at:])
    return updated


def register(subparsers: argparse._SubParsersAction[argparse.ArgumentParser]) -> None:
    parser = subparsers.add_parser(
        "add-step",
        help="Insert one numbered step into plan and records with skeleton blocks",
        description="Insert one numbered step into 执行计划 and 执行记录, then normalize and validate.",
    )
    parser.add_argument("path", help="Path to the runbook markdown file.")
    parser.add_argument("--title", required=True, help="Step title without numbering.")
    parser.add_argument(
        "--after",
        type=int,
        help="Insert after this numbered item. Defaults to append after the current last item.",
    )
    parser.set_defaults(handler=handle)


def handle(args: argparse.Namespace) -> int:
    path = Path(args.path).expanduser().resolve()
    if not path.is_file():
        print(f"error: target file not found: {path}", file=sys.stderr)
        return 1

    try:
        title = clean_title(args.title)
        rewritten = add_step(path.read_text(encoding="utf-8"), title=title, after=args.after)
    except ValueError as exc:
        print(f"error: {exc}", file=sys.stderr)
        return 1

    path.write_text(rewritten, encoding="utf-8")
    _, normalized, _ = normalize_cmd.normalize_file(path)
    errors = validate_cmd.filter_incremental_draft_errors(validate_cmd.collect_errors(normalized))
    if errors:
        validate_cmd.print_fail(path, errors, json_mode=False)
        return 1

    print(f"[runbook-add-step] inserted {title} into {path}")
    return 0

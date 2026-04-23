from __future__ import annotations

import argparse
import sys
from pathlib import Path

import commands.normalize as normalize_cmd
import commands.validate as validate_cmd


def build_record_block(number: int, title: str) -> str:
    return (
        f"### {number}. {title}\n\n"
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


def sync_records(text: str) -> str:
    lines = text.splitlines(keepends=True)
    if not lines:
        raise ValueError("runbook is empty")

    h2_sections = normalize_cmd.parse_sections(lines, 2)
    plan_section = normalize_cmd.section_slice(h2_sections, "执行计划", len(lines))
    record_section = normalize_cmd.section_slice(h2_sections, "执行记录", len(lines))
    if plan_section is None or record_section is None:
        raise ValueError("missing `## 执行计划` or `## 执行记录` section")

    plan_blocks = normalize_cmd.extract_h3_blocks(lines, plan_section[0] + 1, plan_section[1])
    if not plan_blocks:
        raise ValueError("`## 执行计划` does not contain any numbered items")

    record_body = "".join(
        build_record_block(int(match.group(1)), match.group(2))
        for _, title, _, _ in plan_blocks
        if (match := normalize_cmd.NUMBERED_H3_RE.match(title)) is not None
    )
    replacement = f"## 执行记录\n\n{record_body}"
    return "".join(lines[: record_section[0]]) + replacement + "".join(lines[record_section[1] :])


def register(subparsers: argparse._SubParsersAction[argparse.ArgumentParser]) -> None:
    parser = subparsers.add_parser(
        "sync-records",
        help="Rebuild 执行记录 from 执行计划 titles",
        description="Rebuild 执行记录 from 执行计划 titles, then normalize and validate.",
    )
    parser.add_argument("path", help="Path to the runbook markdown file.")
    parser.set_defaults(handler=handle)


def handle(args: argparse.Namespace) -> int:
    path = Path(args.path).expanduser().resolve()
    if not path.is_file():
        print(f"error: target file not found: {path}", file=sys.stderr)
        return 1

    try:
        rewritten = sync_records(path.read_text(encoding="utf-8"))
    except ValueError as exc:
        print(f"error: {exc}", file=sys.stderr)
        return 1

    path.write_text(rewritten, encoding="utf-8")
    _, normalized, _ = normalize_cmd.normalize_file(path)
    errors = validate_cmd.collect_errors(normalized)
    if errors:
        validate_cmd.print_fail(path, errors, json_mode=False)
        return 1

    print(f"[runbook-sync-records] synchronized records in {path}")
    return 0

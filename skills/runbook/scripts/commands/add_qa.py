from __future__ import annotations

import argparse
import sys
from pathlib import Path

import commands.normalize as normalize_cmd
import commands.validate as validate_cmd


def clean_text(name: str, value: str) -> str:
    cleaned = value.strip()
    if not cleaned or "\n" in cleaned:
        raise ValueError(f"`--{name}` must be a single non-empty line")
    return cleaned


def add_qa(text: str, question: str, answer: str, impact: str) -> str:
    lines = text.splitlines(keepends=True)
    if not lines:
        raise ValueError("runbook is empty")

    h2_sections = normalize_cmd.parse_sections(lines, 2)
    section = normalize_cmd.section_slice(h2_sections, "访谈记录", len(lines))
    if section is None:
        raise ValueError("missing `## 访谈记录` section")

    blocks = normalize_cmd.extract_h3_blocks(lines, section[0] + 1, section[1])
    next_number = len(blocks) + 1
    insert_at = section[1]
    block = (
        f"\n### {next_number}. <问题主题>\n\n"
        f"> Q：{question}\n"
        ">\n"
        f"> A：{answer}\n\n"
        "收敛影响：\n\n"
        f"- {impact}\n"
    )
    return "".join(lines[:insert_at]) + block + "".join(lines[insert_at:])


def register(subparsers: argparse._SubParsersAction[argparse.ArgumentParser]) -> None:
    parser = subparsers.add_parser(
        "add-qa",
        help="Append one structured QA entry to 访谈记录",
        description="Append one structured QA entry to 访谈记录 and validate the runbook.",
    )
    parser.add_argument("path", help="Path to the runbook markdown file.")
    parser.add_argument("--question", required=True, help="Question text for Q line.")
    parser.add_argument("--answer", required=True, help="Answer text for A line.")
    parser.add_argument("--impact", required=True, help="Convergence impact bullet.")
    parser.set_defaults(handler=handle)


def handle(args: argparse.Namespace) -> int:
    path = Path(args.path).expanduser().resolve()
    if not path.is_file():
        print(f"error: target file not found: {path}", file=sys.stderr)
        return 1

    try:
        question = clean_text("question", args.question)
        answer = clean_text("answer", args.answer)
        impact = clean_text("impact", args.impact)
        rewritten = add_qa(path.read_text(encoding="utf-8"), question, answer, impact)
    except ValueError as exc:
        print(f"error: {exc}", file=sys.stderr)
        return 1

    path.write_text(rewritten, encoding="utf-8")
    _, normalized, _ = normalize_cmd.normalize_file(path)
    errors = validate_cmd.collect_errors(normalized)
    if errors:
        validate_cmd.print_fail(path, errors, json_mode=False)
        return 1

    print(f"[runbook-add-qa] appended QA to {path}")
    return 0

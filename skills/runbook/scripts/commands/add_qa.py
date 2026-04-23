from __future__ import annotations

import argparse
import sys
from datetime import datetime
from pathlib import Path

import commands.normalize as normalize_cmd
import commands.validate as validate_cmd


def clean_text(name: str, value: str) -> str:
    cleaned = value.strip()
    if not cleaned or "\n" in cleaned:
        raise ValueError(f"`--{name}` must be a single non-empty line")
    return cleaned


def current_interview_time() -> str:
    now = datetime.now().astimezone()
    timezone_name = now.tzname() or now.strftime("%z")
    return f"{now:%Y-%m-%d %H:%M} {timezone_name}"


def add_qa(
    text: str,
    question: str,
    answer: str,
    impact: str,
    interview_time: str | None = None,
) -> str:
    lines = text.splitlines(keepends=True)
    if not lines:
        raise ValueError("runbook is empty")

    h2_sections = normalize_cmd.parse_sections(lines, 2)
    section = normalize_cmd.section_slice(h2_sections, "访谈记录", len(lines))
    if section is None:
        raise ValueError("missing `## 访谈记录` section")

    insert_at = section[1]
    time_line = f"访谈时间：{interview_time or current_interview_time()}\n\n"
    block = (
        f"\n### Q：{question}\n\n"
        f"> A：{answer}\n\n"
        f"{time_line}"
        f"{impact}\n"
    )
    return "".join(lines[:insert_at]) + block + "".join(lines[insert_at:])


def register(subparsers: argparse._SubParsersAction[argparse.ArgumentParser]) -> None:
    parser = subparsers.add_parser(
        "add-qa",
        help="Append one structured QA entry to 访谈记录",
        description="Append one structured QA entry to 访谈记录 and validate the runbook.",
    )
    parser.add_argument("path", help="Path to the runbook markdown file.")
    parser.add_argument("--question", required=True, help="Question text for the Q heading.")
    parser.add_argument("--answer", required=True, help="Answer text for A line.")
    parser.add_argument("--time", help="Interview time line written below the answer; defaults to current local time.")
    parser.add_argument("--impact", required=True, help="One impact line written below the answer.")
    parser.set_defaults(handler=handle)


def handle(args: argparse.Namespace) -> int:
    path = Path(args.path).expanduser().resolve()
    if not path.is_file():
        print(f"error: target file not found: {path}", file=sys.stderr)
        return 1

    try:
        question = clean_text("question", args.question)
        answer = clean_text("answer", args.answer)
        interview_time = clean_text("time", args.time) if args.time is not None else None
        impact = clean_text("impact", args.impact)
        rewritten = add_qa(
            path.read_text(encoding="utf-8"),
            question,
            answer,
            impact,
            interview_time,
        )
    except ValueError as exc:
        print(f"error: {exc}", file=sys.stderr)
        return 1

    path.write_text(rewritten, encoding="utf-8")
    _, normalized, _ = normalize_cmd.normalize_file(path)
    errors = validate_cmd.filter_incremental_draft_errors(validate_cmd.collect_errors(normalized))
    if errors:
        validate_cmd.print_fail(path, errors, json_mode=False)
        return 1

    print(f"[runbook-add-qa] appended QA to {path}")
    return 0

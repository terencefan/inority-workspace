from __future__ import annotations

import argparse
import re
import sys
from datetime import datetime
from pathlib import Path

from commands.normalize import normalize_runbook_numbering
from commands.shift_items import render_diff
from commands.normalize import NUMBERED_H3_RE, extract_h3_blocks, extract_h4_blocks, parse_sections, section_slice
from commands.validator_client import (
    RECORD_SIGNED_ACCEPT_RE,
    RECORD_SIGNED_EXEC_RE,
    STEP_SIGNED_ACCEPT_RE,
    STEP_SIGNED_EXEC_RE,
    collect_errors,
    print_fail,
)


SIGNATURE_TIMESTAMP_RE = re.compile(r"^\d{4}-\d{2}-\d{2} \d{2}:\d{2} [A-Za-z0-9:+-]+$")

PHASE_SPECS = {
    "execution": {
        "plan_heading": "执行",
        "plan_regex": STEP_SIGNED_EXEC_RE,
        "record_heading": "执行记录",
        "record_regex": RECORD_SIGNED_EXEC_RE,
    },
    "acceptance": {
        "plan_heading": "验收",
        "plan_regex": STEP_SIGNED_ACCEPT_RE,
        "record_heading": "验收记录",
        "record_regex": RECORD_SIGNED_ACCEPT_RE,
    },
}

PHASE_ALIASES = {
    "execution": "execution",
    "exec": "execution",
    "acceptance": "acceptance",
    "accept": "acceptance",
}


def register(subparsers: argparse._SubParsersAction[argparse.ArgumentParser]) -> None:
    parser = subparsers.add_parser(
        "sign-step",
        help="Sign one execution or acceptance step and require validator pass",
        description=(
            "Sign one step in both `## 执行计划` and `## 执行记录`, "
            "then require the whole runbook to pass validation before writing."
        ),
    )
    parser.add_argument("runbook", type=Path, help="Path to the runbook markdown file")
    parser.add_argument("--item", type=int, required=True, help="Numbered item to sign")
    parser.add_argument(
        "--phase",
        choices=sorted(PHASE_ALIASES),
        required=True,
        help="Which phase to sign: execution/exec or acceptance/accept",
    )
    parser.add_argument(
        "--signer",
        default="codex",
        help="Signer name without spaces; defaults to `codex`",
    )
    parser.add_argument(
        "--timestamp",
        help="Signature timestamp in `YYYY-MM-DD HH:MM TZ` format; defaults to current local time",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Preview the signature diff without writing the file",
    )
    parser.set_defaults(handler=handle)


def normalize_phase(phase: str) -> str:
    return PHASE_ALIASES[phase]


def build_signature_label(signer: str, timestamp: str | None) -> str:
    normalized_signer = signer.strip().lstrip("@")
    if not normalized_signer or any(char.isspace() for char in normalized_signer):
        raise ValueError("`--signer` must be a non-empty single token without spaces")

    if timestamp is None:
        current = datetime.now().astimezone()
        timestamp = current.strftime("%Y-%m-%d %H:%M %z")
    if not SIGNATURE_TIMESTAMP_RE.match(timestamp):
        raise ValueError("`--timestamp` must match `YYYY-MM-DD HH:MM TZ`")

    return f"@{normalized_signer} {timestamp}"


def find_numbered_item_block(lines: list[str], section_name: str, item_number: int) -> tuple[int, str, int, int]:
    h2_sections = parse_sections(lines, 2)
    section = section_slice(h2_sections, section_name, len(lines))
    if section is None:
        raise ValueError(f"missing `## {section_name}` section")

    for heading_idx, title, block_start, block_end in extract_h3_blocks(lines, section[0] + 1, section[1]):
        match = NUMBERED_H3_RE.match(title)
        if match is None:
            continue
        if int(match.group(1)) == item_number:
            return heading_idx, title, block_start, block_end
    raise ValueError(f"`## {section_name}` does not contain item {item_number}")


def replace_h4_heading(
    lines: list[str],
    start: int,
    end: int,
    plain_heading: str,
    signed_regex: re.Pattern[str],
    replacement: str,
) -> bool:
    for heading_idx, title, _, _ in extract_h4_blocks(lines, start + 1, end):
        full_heading = f"#### {title}"
        if title == plain_heading or signed_regex.match(full_heading):
            newline = "\n" if lines[heading_idx].endswith("\n") else ""
            lines[heading_idx] = f"{replacement}{newline}"
            return True
    return False


def ensure_record_block_ready_for_signature(
    lines: list[str],
    start: int,
    end: int,
    record_heading: str,
    signed_regex: re.Pattern[str],
) -> None:
    for _, title, block_start, block_end in extract_h4_blocks(lines, start + 1, end):
        full_heading = f"#### {title}"
        if title != record_heading and not signed_regex.match(full_heading):
            continue
        body = "\n".join(lines[block_start:block_end])
        if "待执行" in body or "待验收" in body:
            raise ValueError("target record block still contains placeholder conclusions; fill evidence before signing")
        return
    raise ValueError(f"missing `#### {record_heading}` block in execution records")


def sign_step(text: str, item: int, phase: str, signer: str, timestamp: str | None) -> tuple[str, str]:
    normalized_phase = normalize_phase(phase)
    phase_spec = PHASE_SPECS[normalized_phase]
    signature_label = build_signature_label(signer, timestamp)

    lines = text.splitlines(keepends=True)
    if not lines:
        raise ValueError("runbook is empty")

    plan_heading_idx, _, plan_start, plan_end = find_numbered_item_block(lines, "执行计划", item)
    _, _, record_start, record_end = find_numbered_item_block(lines, "执行记录", item)
    ensure_record_block_ready_for_signature(
        lines,
        record_start,
        record_end,
        phase_spec["record_heading"],
        phase_spec["record_regex"],
    )

    plan_replacement = f"#### {phase_spec['plan_heading']} {signature_label}"
    record_replacement = f"#### {phase_spec['record_heading']} {signature_label}"

    if not replace_h4_heading(
        lines,
        plan_start,
        plan_end,
        phase_spec["plan_heading"],
        phase_spec["plan_regex"],
        plan_replacement,
    ):
        raise ValueError(f"`### {lines[plan_heading_idx].strip()}` missing `#### {phase_spec['plan_heading']}` block")

    if not replace_h4_heading(
        lines,
        record_start,
        record_end,
        phase_spec["record_heading"],
        phase_spec["record_regex"],
        record_replacement,
    ):
        raise ValueError(f"`## 执行记录` item {item} missing `#### {phase_spec['record_heading']}` block")

    return "".join(lines), signature_label


def handle(args: argparse.Namespace) -> int:
    source = args.runbook.read_text(encoding="utf-8")
    try:
        rewritten, signature_label = sign_step(
            source,
            item=args.item,
            phase=args.phase,
            signer=args.signer,
            timestamp=args.timestamp,
        )
    except ValueError as exc:
        print(f"error: {exc}", file=sys.stderr)
        return 1

    normalized = normalize_runbook_numbering(rewritten)
    errors = collect_errors(normalized)
    if errors:
        print_fail(args.runbook.expanduser().resolve(), errors, json_mode=False)
        return 1

    if args.dry_run:
        diff = render_diff(args.runbook, source, normalized)
        if diff:
            sys.stdout.write(diff)
        print(
            f"Preview only: would sign item {args.item} {normalize_phase(args.phase)} as {signature_label}; validator passed.",
            file=sys.stderr,
        )
        return 0

    args.runbook.write_text(normalized, encoding="utf-8")
    print(
        f"Signed item {args.item} {normalize_phase(args.phase)} in {args.runbook} as {signature_label}; "
        "validator passed."
    )
    return 0

from __future__ import annotations

import argparse
import json
import re
from dataclasses import asdict, dataclass
from functools import lru_cache
from pathlib import Path

import yaml

import commands.normalize as normalize_cmd

normalize_runbook_numbering = normalize_cmd.normalize_runbook_numbering


REQUIRED_H2 = [
    "背景与现状",
    "目标与非目标",
    "风险与收益",
    "思维脑图",
    "红线行为",
    "清理现场",
    "执行计划",
    "执行记录",
    "最终验收",
    "回滚方案",
    "访谈记录",
    "外部链接",
]

REQUIRED_H3_BY_H2 = {
    "背景与现状": ["背景", "现状"],
    "目标与非目标": ["目标", "非目标"],
    "风险与收益": ["风险", "收益"],
}

FORBIDDEN_H2 = {"当前已决策", "当前前提", "编排策略", "参考文献", "问答记录"}
FORBIDDEN_H3 = {"当前前提", "编排策略"}

NUMBERED_H3_RE = re.compile(r"^(?:[🟢🟡🔴]\s+)?(\d+)\. (.+)$")
DATE_TOKEN_RE = re.compile(r"\b20\d{2}[-_]?(?:0[1-9]|1[0-2])[-_]?(?:0[1-9]|[12]\d|3[01])\b")
STEP_SIGNED_EXEC_RE = re.compile(r"^#### 执行 @\S+ \d{4}-\d{2}-\d{2} \d{2}:\d{2} [A-Za-z0-9:+-]+$")
STEP_SIGNED_ACCEPT_RE = re.compile(r"^#### 验收 @\S+ \d{4}-\d{2}-\d{2} \d{2}:\d{2} [A-Za-z0-9:+-]+$")
RECORD_SIGNED_EXEC_RE = re.compile(r"^#### 执行记录 @\S+ \d{4}-\d{2}-\d{2} \d{2}:\d{2} [A-Za-z0-9:+-]+$")
RECORD_SIGNED_ACCEPT_RE = re.compile(r"^#### 验收记录 @\S+ \d{4}-\d{2}-\d{2} \d{2}:\d{2} [A-Za-z0-9:+-]+$")
EXTERNAL_LINK_HEADER_RE = re.compile(
    r"^\|\s*(?:name|名称)\s*\|\s*(?:type|类型)\s*\|\s*(?:link|链接)\s*\|\s*desc\s*\|\s*$",
    re.IGNORECASE,
)
EXTERNAL_LINK_SEPARATOR_RE = re.compile(r"^\|\s*:?-{3,}:?\s*\|\s*:?-{3,}:?\s*\|\s*:?-{3,}:?\s*\|\s*:?-{3,}:?\s*\|\s*$")
EXTERNAL_LINK_ROW_RE = re.compile(r"^\|\s*[^|]+\s*\|\s*[^|]+\s*\|\s*\[[^\]]+\]\([^)]+\)\s*\|\s*[^|。！？.!?]+[。！？.!?]?\s*\|\s*$")
ANSWER_OPTION_SHORTHAND_RE = re.compile(
    r"^> A：\s*(?:选项\s*`?\d+`?|选\s*`?\d+`?)(?:[。；，,\s]|$)"
)
INTERVIEW_TIME_RE = re.compile(r"^访谈时间：\s*\S.*$")
QUESTION_OPTION_SLASH_RE = re.compile(r"^Q：.*\b\d+\s*[/／]\s*\d+(?:\s*[/／]\s*\d+)+")
QUESTION_OPTION_MARKER_RE = re.compile(
    r"(?:^|[\s（(])(?:\d+[.、)）:]|[A-Za-z][.、)）:]|[一二三四五六七八九十]+[、)）:])"
)
TRANSFER_ACTION_RE = re.compile(
    r"(?mi)^\s*(?:scp|sftp|rsync|kubectl\s+cp|docker\s+cp|rclone\s+copy|curl\b.*(?:-T|--upload-file))\b"
)
REMOTE_EXEC_ACTION_RE = re.compile(
    r"(?mi)^\s*(?:ssh|ansible(?:-playbook)?|pssh|pdsh|clush|kubectl\s+exec|docker\s+exec)\b"
)
OPERATION_NATURE_RE = re.compile(r"^操作性质：\s*(只读|幂等|破坏性)\s*$")
STEP_TRAFFIC_LIGHT_RE = re.compile(r"^[🟢🟡🔴]\s+")
OPERATION_UI = {
    "只读": ("🟢", "[!TIP]"),
    "幂等": ("🟡", "[!WARNING]"),
    "破坏性": ("🔴", "[!CAUTION]"),
}
HOST_LOW_LEVEL_CONFIG_PATH_RE = re.compile(
    r"(?x)"
    r"(?:"
    r"/etc/(?:"
    r"netplan(?:/|$)|network(?:/|$)|NetworkManager/(?:system-connections|conf\.d)(?:/|$)|"
    r"sysconfig/network-scripts(?:/|$)|systemd/network(?:/|$)|"
    r"fstab|crypttab|multipath(?:\.conf|/)|lvm(?:/|\.conf)|"
    r"cgconfig\.conf|cgrules\.conf"
    r")|"
    r"/etc/systemd/(?:system|user)/[^\s]*\.(?:slice|service)|"
    r"/sys/fs/cgroup(?:/|$)"
    r")"
)
HOST_CONFIG_WRITE_ACTION_RE = re.compile(
    r"(?mi)(?:^|[|;&]\s*)(?:sudo\s+)?"
    r"(?:tee|sed\s+-i|perl\s+-pi|cp|mv|rm|install|chmod|chown|truncate)\b"
)
HOST_CONFIG_REDIRECT_RE = re.compile(r">\s*(?:\S+\s+)?(?:/etc/|/sys/fs/cgroup)")
HOST_LOW_LEVEL_MUTATION_RE = re.compile(
    r"(?mix)^\s*(?:sudo\s+)?(?:"
    r"ip\s+(?:link|addr|route|rule)\s+(?:add|del|delete|replace|set)|"
    r"nmcli\s+connection\s+(?:add|modify|delete|up|down|reload)|"
    r"netplan\s+(?:apply|try)|"
    r"if(?:up|down)\b|"
    r"brctl\s+(?:addbr|delbr|addif|delif)|"
    r"ovs-vsctl\b|"
    r"tc\s+qdisc\s+(?:add|del|delete|replace)|"
    r"iptables(?:-legacy|-nft)?\s+(?:-[ADIFPRXN]|--append|--delete|--insert|--flush|--policy|--replace|--new-chain|--delete-chain)|"
    r"nft\s+(?:add|delete|flush|insert|replace)|"
    r"firewall-cmd\s+(?:--add|--remove|--reload|--permanent)|"
    r"sysctl\s+-w\s+net\.|"
    r"parted|fdisk|sfdisk|sgdisk|mkfs(?:\.\S+)?|wipefs|"
    r"pvcreate|vgcreate|lvcreate|lvremove|lvextend|lvresize|resize2fs|xfs_growfs|"
    r"mdadm\s+--create|mount|umount|swapon|swapoff|"
    r"dd\b.*\bof=|"
    r"systemctl\s+set-property"
    r")(?:\b|$|(?=/))"
)

ERROR_CODE_CATALOG_PATH = Path(__file__).resolve().parent.parent.parent / "references" / "validator-error-codes.yaml"
INCREMENTAL_DRAFT_ERROR_CODES = {
    "E020",
    "E021",
    "E040",
    "E050",
    "E030",
    "E060",
    "E061",
    "E076",
    "E090",
    "E091",
    "E092",
    "E094",
    "E095",
    "E100",
}


@dataclass
class ValidationError:
    code: str
    message: str
    line: int | None = None
    content: str | None = None


@dataclass
class NumberedStepResult:
    entries: list[tuple[int, int, str]]
    errors: list[ValidationError]


def err(
    code: str,
    message: str,
    lines: list[str],
    line_idx: int | None = None,
    content: str | None = None,
) -> ValidationError:
    if content is None and line_idx is not None and 0 <= line_idx < len(lines):
        content = lines[line_idx].rstrip()
    return ValidationError(
        code=code,
        message=message,
        line=None if line_idx is None else line_idx + 1,
        content=content if content else None,
    )


@lru_cache(maxsize=1)
def load_error_catalog() -> dict[str, dict[str, str]]:
    payload = yaml.safe_load(ERROR_CODE_CATALOG_PATH.read_text(encoding="utf-8"))
    if not isinstance(payload, dict):
        raise RuntimeError(f"invalid error catalog format: {ERROR_CODE_CATALOG_PATH}")
    return payload


def error_message(code: str, **params: object) -> str:
    catalog = load_error_catalog()
    entry = catalog.get(code)
    if not isinstance(entry, dict) or "message" not in entry:
        raise KeyError(f"missing error catalog entry for {code}")
    return entry["message"].format(**params)


def filter_incremental_draft_errors(
    errors: list[ValidationError],
) -> list[ValidationError]:
    return [item for item in errors if item.code not in INCREMENTAL_DRAFT_ERROR_CODES]


def first_non_empty_line_idx(lines: list[str], start: int, end: int) -> int | None:
    for idx in range(start, end):
        if lines[idx].strip():
            return idx
    return None


def extract_dot_block(
    lines: list[str], start: int, end: int
) -> tuple[int, int, list[str]] | None:
    block_start = None
    for idx in range(start, end):
        if lines[idx].strip() == "```dot":
            block_start = idx
            break
    if block_start is None:
        return None
    for idx in range(block_start + 1, end):
        if lines[idx].strip() == "```":
            return block_start, idx, lines[block_start + 1 : idx]
    return None


parse_sections = normalize_cmd.parse_sections
section_slice = normalize_cmd.section_slice
extract_h3_blocks = normalize_cmd.extract_h3_blocks
extract_h4_blocks = normalize_cmd.extract_h4_blocks


def collect_errors(text: str, *, path: Path | None = None) -> list[ValidationError]:
    lines = normalize_cmd.normalize_runbook_numbering(text).splitlines()
    errors: list[ValidationError] = []

    if not lines or not lines[0].startswith("# "):
        errors.append(err("E001", error_message("E001"), lines, 0 if lines else None))
        return errors
    if DATE_TOKEN_RE.search(lines[0]):
        errors.append(err("E105", error_message("E105"), lines, 0))
    if path is not None and DATE_TOKEN_RE.search(path.name):
        errors.append(
            ValidationError(
                code="E106",
                message=error_message("E106"),
                content=path.name,
            )
        )

    for idx, line in enumerate(lines):
        if line.strip() in {f"## {name}" for name in FORBIDDEN_H2}:
            errors.append(err("E002", error_message("E002", title=line.strip()[3:]), lines, idx))
        if line.strip() in {f"### {name}" for name in FORBIDDEN_H3}:
            errors.append(err("E003", error_message("E003", title=line.strip()[4:]), lines, idx))

    h2_sections = parse_sections(lines, 2)
    h2_titles = [title for _, title in h2_sections]
    if h2_titles != REQUIRED_H2:
        mismatch_idx = 0
        for expected, actual in zip(REQUIRED_H2, h2_titles):
            if expected != actual:
                break
            mismatch_idx += 1
        line_idx = h2_sections[mismatch_idx][0] if mismatch_idx < len(h2_sections) else None
        errors.append(
            err(
                "E010",
                error_message("E010", expected_order=" / ".join(REQUIRED_H2)),
                lines,
                line_idx,
                " / ".join(h2_titles) if h2_titles else "<missing>",
            )
        )

    errors.extend(validate_h3_whitelist(lines, h2_sections))
    errors.extend(validate_current_and_target(lines, h2_sections))
    errors.extend(validate_qa(lines, h2_sections))
    errors.extend(validate_mindmap(lines, h2_sections))
    errors.extend(validate_redlines(lines, h2_sections))
    errors.extend(validate_cleanup_section(lines, h2_sections))
    errors.extend(validate_plan_and_records(lines, h2_sections))
    errors.extend(validate_final_acceptance(lines, h2_sections))
    errors.extend(validate_rollback_plan(lines, h2_sections))
    errors.extend(validate_external_links(lines, h2_sections))

    return errors


def validate_h3_whitelist(
    lines: list[str], h2_sections: list[tuple[int, str]]
) -> list[ValidationError]:
    errors: list[ValidationError] = []
    for h2_title, required in REQUIRED_H3_BY_H2.items():
        section = section_slice(h2_sections, h2_title, len(lines))
        if section is None:
            continue
        start, end = section
        found = [title for _, title in parse_sections(lines[start:end], 3)]
        if found != required:
            line_idx = first_non_empty_line_idx(lines, start + 1, end) or start
            errors.append(
                err(
                    "E011",
                    error_message("E011", h2_title=h2_title, expected_order=" / ".join(required)),
                    lines,
                    line_idx,
                    " / ".join(found) if found else "<missing>",
                )
            )
    return errors


def validate_current_and_target(
    lines: list[str], h2_sections: list[tuple[int, str]]
) -> list[ValidationError]:
    errors: list[ValidationError] = []
    background = section_slice(h2_sections, "背景与现状", len(lines))
    if background is None:
        return errors
    start, end = background
    h3 = parse_sections(lines[start:end], 3)
    for title in ("现状",):
        subsection = section_slice(h3, title, end - start)
        if subsection is None:
            continue
        local_start, local_end = subsection
        abs_start = start + local_start
        abs_end = start + local_end
        body = "\n".join(lines[abs_start:abs_end])
        if "```dot" not in body:
            errors.append(err("E020", error_message("E020", title=title), lines, abs_start))
        if 'fontname="Noto Sans CJK SC"' not in body:
            errors.append(err("E021", error_message("E021", title=title), lines, abs_start))
        if "Arial" in body:
            errors.append(err("E022", error_message("E022", title=title), lines, abs_start))
    target = section_slice(h2_sections, "目标与非目标", len(lines))
    if target is None:
        return errors
    start, end = target
    h3 = parse_sections(lines[start:end], 3)
    subsection = section_slice(h3, "目标", end - start)
    if subsection is not None:
        local_start, local_end = subsection
        abs_start = start + local_start
        abs_end = start + local_end
        body = "\n".join(lines[abs_start:abs_end])
        if "```dot" not in body:
            errors.append(err("E020", error_message("E020", title="目标"), lines, abs_start))
        if 'fontname="Noto Sans CJK SC"' not in body:
            errors.append(err("E021", error_message("E021", title="目标"), lines, abs_start))
        if "Arial" in body:
            errors.append(err("E022", error_message("E022", title="目标"), lines, abs_start))
    return errors


def validate_qa(
    lines: list[str], h2_sections: list[tuple[int, str]]
) -> list[ValidationError]:
    section = section_slice(h2_sections, "访谈记录", len(lines))
    if section is None:
        return []
    start, end = section
    blocks = extract_h3_blocks(lines, start + 1, end)
    errors: list[ValidationError] = []

    if len(blocks) < 5:
        errors.append(err("E030", error_message("E030"), lines, start))

    for heading_idx, title, block_start, block_end in blocks:
        if NUMBERED_H3_RE.match(title):
            errors.append(err("E032", error_message("E032"), lines, heading_idx))
        if not title.startswith("Q：") or title == "Q：":
            errors.append(err("E031", error_message("E031"), lines, heading_idx))
            continue
        if question_contains_options(title):
            errors.append(err("E049", error_message("E049"), lines, heading_idx))

        body = [(idx, lines[idx].rstrip()) for idx in range(block_start + 1, block_end) if lines[idx].strip()]
        if len(body) < 2:
            errors.append(err("E033", error_message("E033"), lines, heading_idx))
            continue

        q_quote_idx = next((idx for idx, (_, line) in enumerate(body) if line.startswith("> Q：")), None)
        if q_quote_idx is not None:
            errors.append(err("E034", error_message("E034"), lines, body[q_quote_idx][0]))

        a_label_pos = next(
            (i for i, (_, line) in enumerate(body) if line.startswith("> A：")),
            None,
        )
        if a_label_pos is None:
            errors.append(err("E036", error_message("E036"), lines, heading_idx))
            continue
        a_label_idx = body[a_label_pos][0]
        a_label = body[a_label_pos][1]
        if a_label == "> A：":
            errors.append(err("E037", error_message("E037"), lines, a_label_idx))
        if ANSWER_OPTION_SHORTHAND_RE.match(a_label):
            errors.append(err("E039", error_message("E039"), lines, a_label_idx))

        body_lines = [
            (idx, line)
            for idx, line in body[a_label_pos + 1 :]
            if line.strip() and not line.startswith(">")
        ]
        interview_time_lines = [(idx, line) for idx, line in body_lines if line.startswith("访谈时间：")]
        if not interview_time_lines:
            errors.append(err("E053", error_message("E053"), lines, heading_idx))
        if any(not INTERVIEW_TIME_RE.match(line) for _, line in interview_time_lines):
            errors.append(err("E053", error_message("E053"), lines, interview_time_lines[0][0]))
        if len(interview_time_lines) > 1:
            errors.append(err("E054", error_message("E054"), lines, interview_time_lines[1][0]))
        if interview_time_lines and body_lines[0][1] != interview_time_lines[0][1]:
            errors.append(err("E055", error_message("E055"), lines, interview_time_lines[0][0]))

        impact_lines = [(idx, line) for idx, line in body_lines if not line.startswith("访谈时间：")]
        if interview_time_lines and impact_lines:
            interview_time_idx = interview_time_lines[0][0]
            if interview_time_idx + 1 < len(lines) and lines[interview_time_idx + 1].strip():
                errors.append(err("E056", error_message("E056"), lines, interview_time_idx))
        if not impact_lines:
            errors.append(err("E033", error_message("E033"), lines, heading_idx))
        if any(line == "收敛影响：" for _, line in impact_lines):
            errors.append(err("E038", error_message("E038"), lines, heading_idx))

    return errors


def question_contains_options(question_heading: str) -> bool:
    if QUESTION_OPTION_SLASH_RE.search(question_heading):
        return True
    question_body = question_heading.removeprefix("Q：").strip()
    return len(QUESTION_OPTION_MARKER_RE.findall(question_body)) >= 2


def validate_mindmap(
    lines: list[str], h2_sections: list[tuple[int, str]]
) -> list[ValidationError]:
    section = section_slice(h2_sections, "思维脑图", len(lines))
    if section is None:
        return []
    start, end = section
    dot_block = extract_dot_block(lines, start + 1, end)
    if dot_block is None:
        return [err("E040", error_message("E040"), lines, start)]
    block_start, _, dot_lines = dot_block
    dot_text = "\n".join(dot_lines)
    if 'fontname="Noto Sans CJK SC"' not in dot_text:
        return [err("E047", error_message("E047"), lines, block_start)]
    if "Arial" in dot_text:
        return [err("E048", error_message("E048"), lines, block_start)]

    edge_re = re.compile(r"^\s*([A-Za-z0-9_]+)\s*->\s*([A-Za-z0-9_]+)")
    children: dict[str, list[str]] = {}
    indegree: dict[str, int] = {}
    outdegree: dict[str, int] = {}
    edge_count = 0

    for raw in dot_lines:
        match = edge_re.search(raw)
        if not match:
            continue
        src, dst = match.group(1), match.group(2)
        edge_count += 1
        children.setdefault(src, []).append(dst)
        children.setdefault(dst, [])
        indegree[dst] = indegree.get(dst, 0) + 1
        indegree.setdefault(src, 0)
        outdegree[src] = outdegree.get(src, 0) + 1
        outdegree.setdefault(dst, 0)

    if edge_count == 0:
        return [err("E041", error_message("E041"), lines, block_start)]

    nodes = set(children) | set(indegree) | set(outdegree)
    roots = [node for node in nodes if indegree.get(node, 0) == 0]
    if len(roots) != 1:
        return [err("E042", error_message("E042"), lines, block_start)]

    categories = children.get(roots[0], [])
    if len(categories) < 3:
        return [err("E043", error_message("E043"), lines, block_start)]

    errors: list[ValidationError] = []
    for category in categories:
        leaves = children.get(category, [])
        if len(leaves) < 2:
            errors.append(err("E044", error_message("E044"), lines, block_start, category))
        if len(leaves) > 3:
            errors.append(err("E045", error_message("E045"), lines, block_start, category))
        for leaf in leaves:
            if outdegree.get(leaf, 0) != 0:
                errors.append(err("E046", error_message("E046"), lines, block_start, leaf))
    return errors


def validate_redlines(
    lines: list[str], h2_sections: list[tuple[int, str]]
) -> list[ValidationError]:
    section = section_slice(h2_sections, "红线行为", len(lines))
    if section is None:
        return []
    start, end = section
    if parse_sections(lines[start + 1 : end], 3):
        return [err("E051", error_message("E051"), lines, start)]
    bullet_count = sum(1 for idx in range(start + 1, end) if lines[idx].strip().startswith("- "))
    if bullet_count == 0:
        return [err("E050", error_message("E050"), lines, start)]
    return []


def validate_cleanup_section(
    lines: list[str], h2_sections: list[tuple[int, str]]
) -> list[ValidationError]:
    section = section_slice(h2_sections, "清理现场", len(lines))
    if section is None:
        return []
    start, end = section
    body = "\n".join(lines[start:end])
    errors: list[ValidationError] = []
    if parse_sections(lines[start + 1 : end], 3):
        errors.append(err("E052", error_message("E052"), lines, start))
    for label, code in (
        ("清理触发条件：", "E057"),
        ("清理命令：", "E058"),
        ("清理完成条件：", "E059"),
        ("恢复执行入口：", "E068"),
    ):
        if label not in body:
            errors.append(err(code, error_message(code, label=label), lines, start))
    if "```" not in body:
        errors.append(err("E069", error_message("E069"), lines, start))
    return errors


def validate_plan_and_records(
    lines: list[str], h2_sections: list[tuple[int, str]]
) -> list[ValidationError]:
    errors: list[ValidationError] = []
    plan = section_slice(h2_sections, "执行计划", len(lines))
    records = section_slice(h2_sections, "执行记录", len(lines))
    if plan is None or records is None:
        return errors

    plan_steps = extract_h3_blocks(lines, plan[0] + 1, plan[1])
    record_steps = extract_h3_blocks(lines, records[0] + 1, records[1])

    if not plan_steps:
        errors.append(err("E060", error_message("E060"), lines, plan[0]))
    if not record_steps:
        errors.append(err("E061", error_message("E061"), lines, records[0]))

    plan_titles = [title for _, title, _, _ in plan_steps]
    record_titles = [title for _, title, _, _ in record_steps]
    if plan_titles != record_titles:
        errors.append(err("E062", error_message("E062"), lines, records[0], f"plan={plan_titles} record={record_titles}"))

    plan_numbered = parse_numbered_steps(lines, plan_steps, "执行计划")
    record_numbered = parse_numbered_steps(lines, record_steps, "执行记录")
    errors.extend(plan_numbered.errors)
    errors.extend(record_numbered.errors)

    if plan_numbered.entries and record_numbered.entries:
        if len(plan_numbered.entries) != len(record_numbered.entries):
            errors.append(err("E066", error_message("E066"), lines, records[0]))
        else:
            for plan_entry, record_entry in zip(plan_numbered.entries, record_numbered.entries):
                _, plan_no, plan_label = plan_entry
                _, record_no, record_label = record_entry
                if plan_no != record_no or plan_label != record_label:
                    errors.append(
                        err(
                            "E067",
                            error_message("E067"),
                            lines,
                            record_entry[0],
                            f"plan={plan_no}. {plan_label} record={record_no}. {record_label}",
                        )
                    )
                    break

    for index, (heading_idx, title, block_start, block_end) in enumerate(plan_steps, start=1):
        errors.extend(validate_plan_step(lines, title, heading_idx, block_start, block_end, index))

    for index, (heading_idx, title, block_start, block_end) in enumerate(record_steps, start=1):
        errors.extend(validate_record_step(lines, title, heading_idx, block_start, block_end, index))

    return errors


def parse_numbered_steps(
    lines: list[str], steps: list[tuple[int, str, int, int]], section_name: str
) -> NumberedStepResult:
    entries: list[tuple[int, int, str]] = []
    errors: list[ValidationError] = []
    expected = 1

    for heading_idx, title, _, _ in steps:
        match = NUMBERED_H3_RE.match(title)
        if not match:
            errors.append(err("E064", error_message("E064", section_name=section_name), lines, heading_idx))
            continue

        actual = int(match.group(1))
        label = match.group(2)
        if actual != expected:
            errors.append(err("E065", error_message("E065", section_name=section_name, expected=expected, actual=actual), lines, heading_idx))
            expected = actual
        expected += 1
        entries.append((heading_idx, actual, label))

    return NumberedStepResult(entries=entries, errors=errors)


def validate_plan_step(
    lines: list[str],
    title: str,
    heading_idx: int,
    start: int,
    end: int,
    index: int,
) -> list[ValidationError]:
    errors: list[ValidationError] = []
    exec_natures: list[tuple[int, str]] = []
    title_match = NUMBERED_H3_RE.match(title)
    step_label = title_match.group(2) if title_match else title
    h4_blocks = normalize_cmd.extract_h4_blocks(lines, start + 1, end)
    h4_titles = [name for _, name, _, _ in h4_blocks]
    if "执行" not in h4_titles and not any(STEP_SIGNED_EXEC_RE.match(f"#### {name}") for name in h4_titles):
        errors.append(err("E070", error_message("E070", title=title), lines, heading_idx))
    if "验收" not in h4_titles and not any(STEP_SIGNED_ACCEPT_RE.match(f"#### {name}") for name in h4_titles):
        errors.append(err("E071", error_message("E071", title=title), lines, heading_idx))

    for _, h4_title, block_start, block_end in h4_blocks:
        if h4_title not in {"执行", "验收"} and not STEP_SIGNED_EXEC_RE.match(f"#### {h4_title}") and not STEP_SIGNED_ACCEPT_RE.match(f"#### {h4_title}"):
            errors.append(err("E072", error_message("E072", title=title), lines, block_start))
            continue
        block_text = "\n".join(lines[block_start:block_end])
        is_exec_block = h4_title == "执行" or STEP_SIGNED_EXEC_RE.match(f"#### {h4_title}") is not None
        is_accept_block = h4_title == "验收" or STEP_SIGNED_ACCEPT_RE.match(f"#### {h4_title}") is not None
        if "```" not in block_text:
            errors.append(err("E073", error_message("E073", title=title, h4_title=h4_title), lines, block_start))
        if "预期结果：" not in block_text:
            errors.append(err("E074", error_message("E074", title=title, h4_title=h4_title), lines, block_start))
        if "停止条件：" not in block_text:
            errors.append(err("E075", error_message("E075", title=title, h4_title=h4_title), lines, block_start))
        if is_exec_block and mixes_cross_machine_transfer_and_exec(block_text):
            errors.append(err("E089", error_message("E089", title=title, h4_title=h4_title), lines, block_start))
        if is_exec_block:
            nature_lines = [
                (idx, lines[idx].strip())
                for idx in range(block_start, block_end)
                if lines[idx].strip().startswith("操作性质：")
            ]
            if not nature_lines:
                errors.append(err("E096", error_message("E096", title=title), lines, block_start))
            for nature_idx, nature_line in nature_lines:
                match = OPERATION_NATURE_RE.match(nature_line)
                if match is None:
                    errors.append(err("E096", error_message("E096", title=title), lines, nature_idx))
                    continue
                nature = match.group(1)
                exec_natures.append((nature_idx, nature))
                expected_emoji, expected_alert = OPERATION_UI[nature]
                pre_exec_text = "\n".join(lines[start + 1 : block_start])
                if not title.startswith(f"{expected_emoji} "):
                    errors.append(err("E099", error_message("E099", title=title), lines, heading_idx))
                if expected_alert not in pre_exec_text:
                    errors.append(err("E102", error_message("E102", title=title), lines, heading_idx))
                if nature == "破坏性" and (
                    "严重后果：" not in pre_exec_text or pre_exec_text.count("[!CAUTION]") < 2
                ):
                    errors.append(err("E103", error_message("E103", title=title), lines, heading_idx))
            if modifies_host_low_level_config(block_text) and "破坏性" not in nature_values_in_block(nature_lines):
                errors.append(err("E104", error_message("E104", title=title), lines, block_start))
        expected_link = f"[跳转到执行记录](#item-{index}-execution-record)" if is_exec_block else f"[跳转到验收记录](#item-{index}-acceptance-record)"
        disallowed_link = f"[跳转到验收记录](#item-{index}-acceptance-record)" if is_exec_block else f"[跳转到执行记录](#item-{index}-execution-record)"
        expected_count = block_text.count(expected_link)
        if expected_count == 0:
            errors.append(err("E077", error_message("E077", title=title, h4_title=h4_title), lines, block_start))
        elif expected_count != 1:
            errors.append(err("E078", error_message("E078", title=title, h4_title=h4_title), lines, block_start))
        if disallowed_link in block_text:
            errors.append(err("E079", error_message("E079", title=title, h4_title=h4_title), lines, block_start))
    nature_values = {nature for _, nature in exec_natures}
    if len(nature_values) > 1:
        first_mixed_idx = exec_natures[0][0]
        errors.append(err("E097", error_message("E097", title=title), lines, first_mixed_idx))
    return errors


def mixes_cross_machine_transfer_and_exec(block_text: str) -> bool:
    return bool(TRANSFER_ACTION_RE.search(block_text) and REMOTE_EXEC_ACTION_RE.search(block_text))


def nature_values_in_block(nature_lines: list[tuple[int, str]]) -> set[str]:
    values: set[str] = set()
    for _, nature_line in nature_lines:
        match = OPERATION_NATURE_RE.match(nature_line)
        if match:
            values.add(match.group(1))
    return values


def modifies_host_low_level_config(block_text: str) -> bool:
    if HOST_LOW_LEVEL_MUTATION_RE.search(block_text):
        return True
    for line in block_text.splitlines():
        if not HOST_LOW_LEVEL_CONFIG_PATH_RE.search(line):
            continue
        if HOST_CONFIG_WRITE_ACTION_RE.search(line) or HOST_CONFIG_REDIRECT_RE.search(line):
            return True
    return False


def destructive_plan_items(
    lines: list[str],
    h2_sections: list[tuple[int, str]],
) -> list[tuple[int, str, int]]:
    plan = section_slice(h2_sections, "执行计划", len(lines))
    if plan is None:
        return []

    items: list[tuple[int, str, int]] = []
    for heading_idx, title, block_start, block_end in extract_h3_blocks(lines, plan[0] + 1, plan[1]):
        match = NUMBERED_H3_RE.match(title)
        if match is None:
            continue
        h4_blocks = normalize_cmd.extract_h4_blocks(lines, block_start + 1, block_end)
        for _, h4_title, h4_start, h4_end in h4_blocks:
            is_exec_block = h4_title == "执行" or STEP_SIGNED_EXEC_RE.match(f"#### {h4_title}") is not None
            if not is_exec_block:
                continue
            block_text = "\n".join(lines[h4_start:h4_end])
            if re.search(r"(?m)^操作性质：\s*破坏性\s*$", block_text):
                items.append((int(match.group(1)), title, heading_idx))
                break
    return items


def validate_record_step(
    lines: list[str],
    title: str,
    heading_idx: int,
    start: int,
    end: int,
    index: int,
) -> list[ValidationError]:
    errors: list[ValidationError] = []
    block_text = "\n".join(lines[start:end])
    if f'<a id="item-{index}-execution-record"></a>' not in block_text:
        errors.append(err("E080", error_message("E080", title=title), lines, heading_idx))
    if f'<a id="item-{index}-acceptance-record"></a>' not in block_text:
        errors.append(err("E081", error_message("E081", title=title), lines, heading_idx))

    h4_blocks = normalize_cmd.extract_h4_blocks(lines, start + 1, end)
    h4_titles = [name for _, name, _, _ in h4_blocks]
    if not any(name == "执行记录" or RECORD_SIGNED_EXEC_RE.match(f"#### {name}") for name in h4_titles):
        errors.append(err("E082", error_message("E082", title=title), lines, heading_idx))
    if not any(name == "验收记录" or RECORD_SIGNED_ACCEPT_RE.match(f"#### {name}") for name in h4_titles):
        errors.append(err("E083", error_message("E083", title=title), lines, heading_idx))

    for _, h4_title, block_start, block_end in h4_blocks:
        full_h4 = f"#### {h4_title}"
        if h4_title not in {"执行记录", "验收记录"} and not RECORD_SIGNED_EXEC_RE.match(full_h4) and not RECORD_SIGNED_ACCEPT_RE.match(full_h4):
            errors.append(err("E084", error_message("E084", title=title), lines, block_start))
            continue

        body = "\n".join(lines[block_start:block_end])
        if ("执行记录" in h4_title and "执行命令：" not in body) or ("执行记录" in h4_title and "执行结果：" not in body) or ("执行记录" in h4_title and "执行结论：" not in body):
            errors.append(err("E085", error_message("E085", title=title), lines, block_start))
        if ("验收记录" in h4_title and "验收命令：" not in body) or ("验收记录" in h4_title and "验收结果：" not in body) or ("验收记录" in h4_title and "验收结论：" not in body):
            errors.append(err("E086", error_message("E086", title=title), lines, block_start))
        if "```" not in body:
            errors.append(err("E087", error_message("E087", title=title), lines, block_start))
        if "@" in h4_title and ("待执行" in body or "待验收" in body):
            errors.append(err("E088", error_message("E088", title=title), lines, block_start))
    return errors


def validate_final_acceptance(
    lines: list[str], h2_sections: list[tuple[int, str]]
) -> list[ValidationError]:
    section = section_slice(h2_sections, "最终验收", len(lines))
    if section is None:
        return []
    start, end = section
    body = "\n".join(lines[start:end])
    errors: list[ValidationError] = []
    for label, code in (
        ("最终验收命令：", "E090"),
        ("最终验收结果：", "E091"),
        ("最终验收结论：", "E092"),
    ):
        if label not in body:
            errors.append(err(code, error_message(code, label=label), lines, start))
    if "- [ ]" not in body and "- [x]" not in body:
        errors.append(err("E076", error_message("E076"), lines, start))
    return errors


def validate_rollback_plan(
    lines: list[str], h2_sections: list[tuple[int, str]]
) -> list[ValidationError]:
    section = section_slice(h2_sections, "回滚方案", len(lines))
    if section is None:
        return []
    start, end = section
    body = "\n".join(lines[start:end])
    errors: list[ValidationError] = []
    if parse_sections(lines[start + 1 : end], 3):
        errors.append(err("E093", error_message("E093"), lines, start))
    if "回滚" not in body:
        errors.append(err("E094", error_message("E094"), lines, start))
    if "```" not in body:
        errors.append(err("E095", error_message("E095"), lines, start))
    for item_no, title, heading_idx in destructive_plan_items(lines, h2_sections):
        if not re.search(rf"(?m)^\s*{item_no}\.\s+\S", body):
            errors.append(err("E098", error_message("E098", title=title, item=item_no), lines, heading_idx))
    return errors


def validate_external_links(
    lines: list[str], h2_sections: list[tuple[int, str]]
) -> list[ValidationError]:
    section = section_slice(h2_sections, "外部链接", len(lines))
    if section is None:
        return []
    start, end = section
    entries = [(idx, lines[idx].strip()) for idx in range(start + 1, end) if lines[idx].strip()]
    if not entries:
        return [err("E100", error_message("E100"), lines, start)]
    errors: list[ValidationError] = []
    if len(entries) < 3:
        return [err("E101", error_message("E101"), lines, start)]
    if not EXTERNAL_LINK_HEADER_RE.match(entries[0][1]):
        errors.append(err("E101", error_message("E101"), lines, entries[0][0]))
    if not EXTERNAL_LINK_SEPARATOR_RE.match(entries[1][1]):
        errors.append(err("E101", error_message("E101"), lines, entries[1][0]))
    for idx, entry in entries[2:]:
        if not EXTERNAL_LINK_ROW_RE.match(entry):
            errors.append(err("E101", error_message("E101"), lines, idx))
    return errors


def print_pass(path: Path, json_mode: bool) -> None:
    if json_mode:
        print(json.dumps({"status": "pass", "path": str(path), "errors": []}, ensure_ascii=False, indent=2))
    else:
        print(f"[runbook-validator] PASS {path}")


def build_natural_language_summary(errors: list[ValidationError]) -> list[str]:
    summary = [f"本次扫描共发现 {len(errors)} 个问题，当前 runbook 还不能进入执行态"]
    for index, item in enumerate(errors, start=1):
        location = f"第 {item.line} 行" if item.line is not None else "某处"
        detail = f"{location}需要修正：{item.message}"
        if item.content:
            detail += f" 当前命中的内容是：{item.content}"
        summary.append(f"{index}. {detail}")
    summary.append("请先按以上问题修正文档，再重新运行 runctl validate")
    return summary


def print_fail(path: Path, errors: list[ValidationError], json_mode: bool) -> None:
    summary = build_natural_language_summary(errors)
    if json_mode:
        print(
            json.dumps(
                {
                    "status": "fail",
                    "path": str(path),
                    "errors": [asdict(e) for e in errors],
                    "natural_language_summary": "\n".join(summary),
                    "natural_language_items": summary,
                },
                ensure_ascii=False,
                indent=2,
            )
        )
        return
    print(f"[runbook-validator] FAIL {path}")
    for item in errors:
        location = f" line {item.line}" if item.line is not None else ""
        print(f"- {item.code}{location}: {item.message}")
        if item.content:
            print(f"  content: {item.content}")
    print("\n[runbook-validator] 自然语言总结")
    for line in summary:
        print(f"- {line}")


def register(subparsers: argparse._SubParsersAction[argparse.ArgumentParser]) -> None:
    parser = subparsers.add_parser(
        "validate",
        help="Validate runbook structure and evidence fields",
        description="Validate runbook structure and evidence fields.",
    )
    parser.add_argument("path", help="Path to runbook markdown.")
    parser.add_argument("--json", action="store_true", help="Emit JSON diagnostics.")
    parser.set_defaults(handler=handle)


def handle(args: argparse.Namespace) -> int:
    path = Path(args.path).expanduser().resolve()
    if not path.is_file():
        print_fail(path, [ValidationError(code="E000", message=error_message("E000", path=path))], args.json)
        return 2

    _, normalized, _ = normalize_cmd.normalize_file(path)
    errors = collect_errors(normalized, path=path)
    if errors:
        print_fail(path, errors, args.json)
        return 1

    print_pass(path, args.json)
    return 0

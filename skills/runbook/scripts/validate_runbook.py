#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import re
from dataclasses import asdict, dataclass
from pathlib import Path


REQUIRED_H2 = [
    "背景与现状",
    "目标与非目标",
    "风险与收益",
    "思维脑图",
    "红线行为",
    "执行计划",
    "执行记录",
    "最终验收",
    "回滚方案",
    "访谈记录",
    "文档链接",
]

REQUIRED_H3_BY_H2 = {
    "背景与现状": ["背景", "现状"],
    "目标与非目标": ["目标", "非目标"],
    "风险与收益": ["风险", "收益"],
}

FORBIDDEN_H2 = {"当前已决策", "当前前提", "编排策略", "参考文献", "问答记录"}
FORBIDDEN_H3 = {"当前前提", "编排策略"}

QUESTION_RE = re.compile(r"^### (\d+)\. .+$")
NUMBERED_H3_RE = re.compile(r"^(\d+)\. (.+)$")
STEP_SIGNED_EXEC_RE = re.compile(r"^#### 执行 @\S+ \d{4}-\d{2}-\d{2} \d{2}:\d{2} [A-Za-z0-9:+-]+$")
STEP_SIGNED_ACCEPT_RE = re.compile(r"^#### 验收 @\S+ \d{4}-\d{2}-\d{2} \d{2}:\d{2} [A-Za-z0-9:+-]+$")
RECORD_SIGNED_EXEC_RE = re.compile(r"^#### 执行记录 @\S+ \d{4}-\d{2}-\d{2} \d{2}:\d{2} [A-Za-z0-9:+-]+$")
RECORD_SIGNED_ACCEPT_RE = re.compile(r"^#### 验收记录 @\S+ \d{4}-\d{2}-\d{2} \d{2}:\d{2} [A-Za-z0-9:+-]+$")
REFERENCE_LINK_RE = re.compile(r"^- \[[^\]]+\]\([^)]+\)：.+$")
ANSWER_OPTION_SHORTHAND_RE = re.compile(
    r"^> A：\s*(?:选项\s*`?\d+`?|选\s*`?\d+`?)(?:[。；，,\s]|$)"
)


@dataclass
class ValidationError:
    code: str
    message: str
    line: int | None = None
    content: str | None = None


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


def collect_errors(text: str) -> list[ValidationError]:
    lines = text.splitlines()
    errors: list[ValidationError] = []

    if not lines or not lines[0].startswith("# "):
        errors.append(err("E001", "首行必须是 runbook 标题。", lines, 0 if lines else None))
        return errors

    for idx, line in enumerate(lines):
        if line.strip() in {f"## {name}" for name in FORBIDDEN_H2}:
            errors.append(err("E002", f"不允许出现 `## {line.strip()[3:]}`。", lines, idx))
        if line.strip() in {f"### {name}" for name in FORBIDDEN_H3}:
            errors.append(err("E003", f"不允许出现 `### {line.strip()[4:]}`。", lines, idx))

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
                "二级标题顺序必须严格为: " + " / ".join(REQUIRED_H2),
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
    errors.extend(validate_plan_and_records(lines, h2_sections))
    errors.extend(validate_final_acceptance(lines, h2_sections))
    errors.extend(validate_rollback_plan(lines, h2_sections))
    errors.extend(validate_doc_links(lines, h2_sections))

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
                    f"`## {h2_title}` 下的三级标题必须严格为: " + " / ".join(required),
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
            errors.append(err("E020", f"`### {title}` 必须包含一个 dot 代码块。", lines, abs_start))
        if "fontname=\"Noto Sans CJK SC\"" not in body:
            errors.append(err("E021", f"`### {title}` 的 dot 代码块必须显式使用 `Noto Sans CJK SC`。", lines, abs_start))
        if "Arial" in body:
            errors.append(err("E022", f"`### {title}` 的 dot 代码块不允许继续使用 `Arial`。", lines, abs_start))
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
            errors.append(err("E020", "`### 目标` 必须包含一个 dot 代码块。", lines, abs_start))
        if "fontname=\"Noto Sans CJK SC\"" not in body:
            errors.append(err("E021", "`### 目标` 的 dot 代码块必须显式使用 `Noto Sans CJK SC`。", lines, abs_start))
        if "Arial" in body:
            errors.append(err("E022", "`### 目标` 的 dot 代码块不允许继续使用 `Arial`。", lines, abs_start))
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
        errors.append(err("E030", "`## 访谈记录` 至少需要 5 条真实用户访谈。", lines, start))

    expected = 1
    for heading_idx, title, block_start, block_end in blocks:
        match = QUESTION_RE.match(f"### {title}")
        if not match:
            errors.append(err("E031", "`## 访谈记录` 下的三级标题必须是 `### N. 主题`。", lines, heading_idx))
            continue
        actual = int(match.group(1))
        if actual != expected:
            errors.append(
                err(
                    "E032",
                    f"`## 访谈记录` 的编号必须连续；期望 {expected}，实际 {actual}。",
                    lines,
                    heading_idx,
                )
            )
            expected = actual
        expected += 1

        body = [(idx, lines[idx].rstrip()) for idx in range(block_start + 1, block_end) if lines[idx].strip()]
        if len(body) < 3:
            errors.append(err("E033", "每条问答至少包含 `Q/A` 与 `收敛影响`。", lines, heading_idx))
            continue

        q_label_idx, q_label = body[0]
        if not q_label.startswith("> Q：") or q_label == "> Q：":
            errors.append(err("E034", "问答必须以同一行 `> Q：...` 开始。", lines, q_label_idx))

        a_label_pos = next(
            (
                i
                for i, (_, line) in enumerate(body[1:], start=1)
                if line.startswith("> A：")
            ),
            None,
        )
        if a_label_pos is None:
            errors.append(err("E036", "问答缺少同一行 `> A：...`。", lines, heading_idx))
            continue
        a_label_idx = body[a_label_pos][0]
        a_label = body[a_label_pos][1]
        if a_label == "> A：":
            errors.append(err("E037", "回答正文必须和 `> A：` 写在同一行。", lines, a_label_idx))
        if ANSWER_OPTION_SHORTHAND_RE.match(a_label):
            errors.append(err("E039", "`A：...` 不能只写“选项 1/2/3”这类脱离上下文的简写。", lines, a_label_idx))

        raw_between = [lines[idx].rstrip() for idx in range(q_label_idx + 1, a_label_idx)]
        if ">" not in raw_between:
            errors.append(err("E035", "`Q：` 和 `A：` 之间必须保留一个空 quote 行。", lines, q_label_idx))

        if not any(line == "收敛影响：" for _, line in body):
            errors.append(err("E038", "每条问答后都必须有 `收敛影响：`。", lines, heading_idx))

    return errors


def validate_mindmap(
    lines: list[str], h2_sections: list[tuple[int, str]]
) -> list[ValidationError]:
    section = section_slice(h2_sections, "思维脑图", len(lines))
    if section is None:
        return []
    start, end = section
    dot_block = extract_dot_block(lines, start + 1, end)
    if dot_block is None:
        return [err("E040", "`## 思维脑图` 必须包含一个 dot 代码块。", lines, start)]
    block_start, block_end, dot_lines = dot_block
    dot_text = "\n".join(dot_lines)
    if 'fontname="Noto Sans CJK SC"' not in dot_text:
        return [err("E047", "`## 思维脑图` 的 dot 代码块必须显式使用 `Noto Sans CJK SC`。", lines, block_start)]
    if "Arial" in dot_text:
        return [err("E048", "`## 思维脑图` 的 dot 代码块不允许继续使用 `Arial`。", lines, block_start)]

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
        return [err("E041", "`## 思维脑图` 至少需要一条边。", lines, block_start)]

    nodes = set(children) | set(indegree) | set(outdegree)
    roots = [node for node in nodes if indegree.get(node, 0) == 0]
    if len(roots) != 1:
        return [err("E042", "`## 思维脑图` 必须且只能有一个根节点。", lines, block_start)]

    root = roots[0]
    categories = children.get(root, [])
    if len(categories) < 3:
        return [err("E043", "`## 思维脑图` 至少需要 3 个边界/选型问题。", lines, block_start)]

    errors: list[ValidationError] = []
    for category in categories:
        leaves = children.get(category, [])
        if len(leaves) < 2:
            errors.append(err("E044", "每个边界/选型问题至少需要 2 个叶子结论。", lines, block_start, category))
        if len(leaves) > 3:
            errors.append(err("E045", "每个边界/选型问题最多保留 3 个叶子结论。", lines, block_start, category))
        for leaf in leaves:
            if outdegree.get(leaf, 0) != 0:
                errors.append(err("E046", "叶子结论不能继续向下发散。", lines, block_start, leaf))
    return errors


def validate_redlines(
    lines: list[str], h2_sections: list[tuple[int, str]]
) -> list[ValidationError]:
    section = section_slice(h2_sections, "红线行为", len(lines))
    if section is None:
        return []
    start, end = section
    if parse_sections(lines[start + 1 : end], 3):
        return [err("E051", "`## 红线行为` 不允许包含三级子标题。", lines, start)]
    bullet_count = sum(1 for idx in range(start + 1, end) if lines[idx].strip().startswith("- "))
    if bullet_count == 0:
        return [err("E050", "`## 红线行为` 至少需要一条明确禁止项。", lines, start)]
    return []


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
        errors.append(err("E060", "`## 执行计划` 至少需要一个步骤。", lines, plan[0]))
    if not record_steps:
        errors.append(err("E061", "`## 执行记录` 至少需要一个步骤。", lines, records[0]))

    plan_titles = [title for _, title, _, _ in plan_steps]
    record_titles = [title for _, title, _, _ in record_steps]
    if plan_titles != record_titles:
        errors.append(
            err(
                "E062",
                "`## 执行计划` 和 `## 执行记录` 的步骤标题必须一一对应。",
                lines,
                records[0],
                f"plan={plan_titles} record={record_titles}",
            )
        )

    plan_numbered = parse_numbered_steps(lines, plan_steps, "执行计划")
    record_numbered = parse_numbered_steps(lines, record_steps, "执行记录")
    errors.extend(plan_numbered.errors)
    errors.extend(record_numbered.errors)

    if plan_numbered.entries and "冻结现状" not in plan_numbered.entries[0][2]:
        errors.append(err("E063", "执行计划的第一个步骤必须是“冻结现状”或同等语义。", lines, plan_steps[0][0]))

    if plan_numbered.entries and record_numbered.entries:
        if len(plan_numbered.entries) != len(record_numbered.entries):
            errors.append(
                err(
                    "E066",
                    "`## 执行计划` 和 `## 执行记录` 的编号步骤数量必须一致。",
                    lines,
                    records[0],
                )
            )
        else:
            for idx, (plan_entry, record_entry) in enumerate(zip(plan_numbered.entries, record_numbered.entries), start=1):
                _, plan_no, plan_label = plan_entry
                _, record_no, record_label = record_entry
                if plan_no != record_no or plan_label != record_label:
                    errors.append(
                        err(
                            "E067",
                            "`## 执行计划` 和 `## 执行记录` 的编号与标题必须完全对齐。",
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


@dataclass
class NumberedStepResult:
    entries: list[tuple[int, int, str]]
    errors: list[ValidationError]


def parse_numbered_steps(
    lines: list[str], steps: list[tuple[int, str, int, int]], section_name: str
) -> NumberedStepResult:
    entries: list[tuple[int, int, str]] = []
    errors: list[ValidationError] = []
    expected = 1

    for heading_idx, title, _, _ in steps:
        match = NUMBERED_H3_RE.match(title)
        if not match:
            errors.append(
                err(
                    "E064",
                    f"`## {section_name}` 下的三级标题必须是 `### N. 标题`。",
                    lines,
                    heading_idx,
                )
            )
            continue

        actual = int(match.group(1))
        label = match.group(2)
        if actual != expected:
            errors.append(
                err(
                    "E065",
                    f"`## {section_name}` 的编号必须连续；期望 {expected}，实际 {actual}。",
                    lines,
                    heading_idx,
                )
            )
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
    h4_blocks = extract_h4_blocks(lines, start + 1, end)
    h4_titles = [title for _, title, _, _ in h4_blocks]
    if "执行" not in h4_titles and not any(STEP_SIGNED_EXEC_RE.match(f"#### {name}") for name in h4_titles):
        errors.append(err("E070", f"`### {title}` 缺少 `#### 执行`。", lines, heading_idx))
    if "验收" not in h4_titles and not any(STEP_SIGNED_ACCEPT_RE.match(f"#### {name}") for name in h4_titles):
        errors.append(err("E071", f"`### {title}` 缺少 `#### 验收`。", lines, heading_idx))

    for _, h4_title, block_start, block_end in h4_blocks:
        if h4_title not in {"执行", "验收"} and not STEP_SIGNED_EXEC_RE.match(f"#### {h4_title}") and not STEP_SIGNED_ACCEPT_RE.match(f"#### {h4_title}"):
            errors.append(err("E072", f"`### {title}` 下存在非法四级标题。", lines, block_start))
            continue
        block_text = "\n".join(lines[block_start:block_end])
        is_exec_block = h4_title == "执行" or STEP_SIGNED_EXEC_RE.match(f"#### {h4_title}") is not None
        is_accept_block = h4_title == "验收" or STEP_SIGNED_ACCEPT_RE.match(f"#### {h4_title}") is not None
        if "```" not in block_text:
            errors.append(err("E073", f"`### {title}` 的 `#### {h4_title}` 必须包含 code block。", lines, block_start))
        if "预期结果：" not in block_text:
            errors.append(err("E074", f"`### {title}` 的 `#### {h4_title}` 缺少 `预期结果：`。", lines, block_start))
        if "停止条件：" not in block_text:
            errors.append(err("E075", f"`### {title}` 的 `#### {h4_title}` 缺少 `停止条件：`。", lines, block_start))
        if is_accept_block:
            if "- [ ]" not in block_text and "- [x]" not in block_text:
                errors.append(err("E076", f"`### {title}` 的 `#### 验收` 至少需要一个 checkbox。", lines, block_start))
        expected_link = f"[跳转到执行记录](#item-{index}-execution-record)" if is_exec_block else f"[跳转到验收记录](#item-{index}-acceptance-record)"
        disallowed_link = f"[跳转到验收记录](#item-{index}-acceptance-record)" if is_exec_block else f"[跳转到执行记录](#item-{index}-execution-record)"
        expected_count = block_text.count(expected_link)
        if expected_count == 0:
            errors.append(err("E077", f"`### {title}` 的 `#### {h4_title}` 缺少页内跳转链接。", lines, block_start))
        elif expected_count != 1:
            errors.append(err("E078", f"`### {title}` 的 `#### {h4_title}` 页内跳转链接只能出现一次。", lines, block_start))
        if disallowed_link in block_text:
            errors.append(err("E079", f"`### {title}` 的 `#### {h4_title}` 只能跳转到对应记录，不能混入另一类跳转。", lines, block_start))
    return errors


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
        errors.append(err("E080", f"`### {title}` 缺少执行记录 anchor。", lines, heading_idx))
    if f'<a id="item-{index}-acceptance-record"></a>' not in block_text:
        errors.append(err("E081", f"`### {title}` 缺少验收记录 anchor。", lines, heading_idx))

    h4_blocks = extract_h4_blocks(lines, start + 1, end)
    h4_titles = [title for _, title, _, _ in h4_blocks]
    if not any(title == "执行记录" or RECORD_SIGNED_EXEC_RE.match(f"#### {title}") for title in h4_titles):
        errors.append(err("E082", f"`### {title}` 缺少 `#### 执行记录`。", lines, heading_idx))
    if not any(title == "验收记录" or RECORD_SIGNED_ACCEPT_RE.match(f"#### {title}") for title in h4_titles):
        errors.append(err("E083", f"`### {title}` 缺少 `#### 验收记录`。", lines, heading_idx))

    for _, h4_title, block_start, block_end in h4_blocks:
        full_h4 = f"#### {h4_title}"
        if h4_title not in {"执行记录", "验收记录"} and not RECORD_SIGNED_EXEC_RE.match(full_h4) and not RECORD_SIGNED_ACCEPT_RE.match(full_h4):
            errors.append(err("E084", f"`### {title}` 下存在非法记录标题。", lines, block_start))
            continue

        body = "\n".join(lines[block_start:block_end])
        if ("执行记录" in h4_title and "执行命令：" not in body) or ("执行记录" in h4_title and "执行结果：" not in body) or ("执行记录" in h4_title and "执行结论：" not in body):
            errors.append(err("E085", f"`### {title}` 的执行记录缺少命令/结果/结论字段。", lines, block_start))
        if ("验收记录" in h4_title and "验收命令：" not in body) or ("验收记录" in h4_title and "验收结果：" not in body) or ("验收记录" in h4_title and "验收结论：" not in body):
            errors.append(err("E086", f"`### {title}` 的验收记录缺少命令/结果/结论字段。", lines, block_start))
        if "```" not in body:
            errors.append(err("E087", f"`### {title}` 的记录块必须包含代码或文本证据块。", lines, block_start))
        if ("@" in h4_title) and ("待执行" in body or "待验收" in body):
            errors.append(err("E088", f"`### {title}` 已签名的记录块不能继续保留待执行占位。", lines, block_start))
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
            errors.append(err(code, f"`## 最终验收` 缺少 `{label}`。", lines, start))
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
        errors.append(err("E093", "`## 回滚方案` 不允许包含三级子标题。", lines, start))
    if "回滚" not in body:
        errors.append(err("E094", "`## 回滚方案` 至少需要明确回滚边界或回滚动作。", lines, start))
    if "```" not in body:
        errors.append(err("E095", "`## 回滚方案` 至少需要一个真实命令代码块。", lines, start))
    return errors


def validate_doc_links(
    lines: list[str], h2_sections: list[tuple[int, str]]
) -> list[ValidationError]:
    section = section_slice(h2_sections, "文档链接", len(lines))
    if section is None:
        return []
    start, end = section
    entries = [(idx, lines[idx].strip()) for idx in range(start + 1, end) if lines[idx].strip()]
    if not entries:
        return [err("E100", "`## 文档链接` 不能为空。", lines, start)]
    errors: list[ValidationError] = []
    for idx, entry in entries:
        if not REFERENCE_LINK_RE.match(entry):
            errors.append(err("E101", "`## 文档链接` 只能使用带说明的 Markdown 列表项。", lines, idx))
    return errors


def print_pass(path: Path, json_mode: bool) -> None:
    if json_mode:
        print(json.dumps({"status": "pass", "path": str(path), "errors": []}, ensure_ascii=False, indent=2))
    else:
        print(f"[runbook-validator] PASS {path}")


def build_natural_language_summary(errors: list[ValidationError]) -> list[str]:
    summary = [f"本次扫描共发现 {len(errors)} 个问题，当前 runbook 还不能进入执行态。"]
    for index, item in enumerate(errors, start=1):
        location = f"第 {item.line} 行" if item.line is not None else "某处"
        detail = f"{location}需要修正：{item.message}"
        if item.content:
            detail += f" 当前命中的内容是：{item.content}"
        summary.append(f"{index}. {detail}")
    summary.append("请先按以上问题修正文档，再重新运行 validate_runbook.py。")
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


def main() -> int:
    parser = argparse.ArgumentParser(description="Validate .codex runbook structure.")
    parser.add_argument("path", help="Path to runbook markdown.")
    parser.add_argument("--json", action="store_true", help="Emit JSON diagnostics.")
    args = parser.parse_args()

    path = Path(args.path).expanduser().resolve()
    if not path.is_file():
        print_fail(path, [ValidationError(code="E000", message=f"file not found: {path}")], args.json)
        return 2

    errors = collect_errors(path.read_text(encoding="utf-8"))
    if errors:
        print_fail(path, errors, args.json)
        return 1

    print_pass(path, args.json)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

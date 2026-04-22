#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import re
import sys
from dataclasses import asdict, dataclass
from pathlib import Path


REQUIRED_H2 = [
    "背景与现状",
    "目标与非目标",
    "风险与收益",
    "红线行为",
    "访谈记录",
    "思维脑图",
    "执行计划",
    "执行记录",
    "最终验收",
    "参考文献",
]

REQUIRED_H3_BY_H2 = {
    "背景与现状": ["背景", "现状"],
    "目标与非目标": ["目标", "非目标"],
    "风险与收益": ["风险", "收益"],
}

SIGNED_EXEC_RE = re.compile(r"^#### 执行 @\S+ \d{4}-\d{2}-\d{2} \d{2}:\d{2} CST$")
SIGNED_ACCEPT_RE = re.compile(r"^#### 验收 @\S+ \d{4}-\d{2}-\d{2} \d{2}:\d{2} CST$")
STEP_RE = re.compile(r"^### 步骤 \d+ - .+$")
INTERVIEW_RE = re.compile(r"^### 访谈 (\d+) - .+$")
REFERENCE_LINK_RE = re.compile(r"^- \[[^\]]+\]\([^)]+\)$")
INTERVIEW_Q_LABEL_RE = re.compile(r"^> Q:$")
INTERVIEW_A_LABEL_RE = re.compile(r"^> A:$")
INTERVIEW_TEXT_RE = re.compile(r"^> .+")


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
    resolved_content = content
    if resolved_content is None and line_idx is not None and 0 <= line_idx < len(lines):
        resolved_content = lines[line_idx].rstrip()
    return ValidationError(
        code=code,
        message=message,
        line=None if line_idx is None else line_idx + 1,
        content=resolved_content if resolved_content else None,
    )


def read_text(path: Path) -> str:
    return path.read_text(encoding="utf-8")


def parse_sections(lines: list[str], level: int) -> list[tuple[int, str]]:
    prefix = "#" * level + " "
    sections: list[tuple[int, str]] = []
    for idx, line in enumerate(lines):
        if line.startswith(prefix):
            sections.append((idx, line[len(prefix):].strip()))
    return sections


def section_slice(
    lines: list[str], sections: list[tuple[int, str]], title: str
) -> tuple[int, int] | None:
    for index, (start, name) in enumerate(sections):
        if name == title:
            end = sections[index + 1][0] if index + 1 < len(sections) else len(lines)
            return start, end
    return None


def first_non_empty_line_idx(lines: list[str], start: int, end: int) -> int | None:
    for idx in range(start, end):
        if lines[idx].strip():
            return idx
    return None


def collect_errors(text: str) -> list[ValidationError]:
    lines = text.splitlines()
    errors: list[ValidationError] = []

    if not lines or not lines[0].startswith("# "):
        errors.append(err("E001", "首行必须是 runbook 标题。", lines, 0 if lines else None))

    for idx, line in enumerate(lines[:20]):
        if line.strip() == "Rules:":
            errors.append(err("E002", "runbook 正文最前面不能包含 `Rules:` 块。", lines, idx))

    h2_sections = parse_sections(lines, 2)
    h2_titles = [title for _, title in h2_sections]
    if h2_titles != REQUIRED_H2:
        mismatch_idx = 0
        for expected, actual in zip(REQUIRED_H2, h2_titles):
            if expected != actual:
                break
            mismatch_idx += 1
        line_idx = h2_sections[mismatch_idx][0] if mismatch_idx < len(h2_sections) else None
        actual_order = " / ".join(h2_titles) if h2_titles else "<missing>"
        errors.append(
            err(
                "E010",
                "二级标题顺序必须严格为: "
                + " / ".join(REQUIRED_H2)
                + f"；当前实际为: {actual_order}",
                lines,
                line_idx,
            )
        )

    errors.extend(validate_heading_whitelist(lines, h2_sections))

    local_h3 = parse_sections(lines, 3)
    for h2_title, required_h3_titles in REQUIRED_H3_BY_H2.items():
        h2_range = section_slice(lines, h2_sections, h2_title)
        if h2_range is None:
            continue
        start, end = h2_range
        h3_sections = parse_sections(lines[start:end], 3)
        found = [title for _, title in h3_sections]
        if found != required_h3_titles:
            line_idx = start
            if h3_sections:
                line_idx = start + h3_sections[0][0]
            errors.append(
                err(
                    "E011",
                    f"`## {h2_title}` 下的三级标题必须严格为: "
                    + " / ".join(required_h3_titles)
                    + f"；当前实际为: {' / '.join(found) if found else '<missing>'}",
                    lines,
                    line_idx,
                )
            )

    for title in ("现状", "目标"):
        target_range = section_slice(lines, local_h3, title)
        if target_range is None:
            continue
        start, end = target_range
        body = "\n".join(lines[start:end])
        if "```dot" not in body:
            errors.append(
                err(
                    "E020",
                    f"`### {title}` 必须包含一个 dot 代码块。",
                    lines,
                    start,
                )
            )

    interview_range = section_slice(lines, h2_sections, "访谈记录")
    if interview_range is not None:
        errors.extend(validate_interviews(lines, interview_range))

    mindmap_error = validate_mindmap(lines, h2_sections)
    if mindmap_error is not None:
        errors.append(mindmap_error)

    plan_steps = extract_steps(lines, h2_sections, "执行计划")
    record_steps = extract_steps(lines, h2_sections, "执行记录")

    if not plan_steps:
        section = section_slice(lines, h2_sections, "执行计划")
        errors.append(
            err(
                "E040",
                "`## 执行计划` 至少需要一个步骤。",
                lines,
                None if section is None else section[0],
            )
        )
    if not record_steps:
        section = section_slice(lines, h2_sections, "执行记录")
        errors.append(
            err(
                "E041",
                "`## 执行记录` 至少需要一个步骤。",
                lines,
                None if section is None else section[0],
            )
        )
    if [name for _, name, _ in plan_steps] != [name for _, name, _ in record_steps]:
        line_idx = record_steps[0][0] if record_steps else (plan_steps[0][0] if plan_steps else None)
        plan_titles = [name for _, name, _ in plan_steps]
        record_titles = [name for _, name, _ in record_steps]
        errors.append(
            err(
                "E042",
                "`## 执行计划` 和 `## 执行记录` 的步骤标题必须一一对应；"
                f" plan={plan_titles} record={record_titles}",
                lines,
                line_idx,
            )
        )

    errors.extend(validate_plan_steps(lines, plan_steps))
    errors.extend(validate_record_steps(lines, record_steps))

    references_range = section_slice(lines, h2_sections, "参考文献")
    if references_range is not None:
        start, end = references_range
        reference_lines = [
            (idx, lines[idx].strip())
            for idx in range(start + 1, end)
            if lines[idx].strip()
        ]
        if not reference_lines:
            errors.append(err("E050", "`## 参考文献` 不能为空。", lines, start))
        for line_idx, line in reference_lines:
            if not REFERENCE_LINK_RE.match(line):
                errors.append(
                    err(
                        "E051",
                        "`## 参考文献` 只能使用 Markdown 链接条目。",
                        lines,
                        line_idx,
                    )
                )
                break

    return errors


def validate_mindmap(
    lines: list[str], h2_sections: list[tuple[int, str]]
) -> ValidationError | None:
    section = section_slice(lines, h2_sections, "思维脑图")
    if section is None:
        return err("E032", "`## 思维脑图` 必须是一个 rooted `dot` 脑图。", lines)
    start, end = section
    dot_block = extract_dot_block(lines, start + 1, end)
    if dot_block is None:
        focus_idx = first_non_empty_line_idx(lines, start + 1, end) or start
        return err("E032", "`## 思维脑图` 必须包含一个 `dot` 代码块。", lines, focus_idx)

    block_start, block_end, dot_lines = dot_block
    for idx in range(start + 1, end):
        line = lines[idx].strip()
        if not line:
            continue
        if block_start <= idx <= block_end:
            continue
        return err(
            "E033",
            "`## 思维脑图` 只能包含一个 `dot` 代码块，不能混入其他正文或列表。",
            lines,
            idx,
        )

    dot_error = validate_two_level_dot_graph(lines, dot_lines, block_start)
    if dot_error is not None:
        return dot_error
    return None


def validate_heading_whitelist(
    lines: list[str], h2_sections: list[tuple[int, str]]
) -> list[ValidationError]:
    errors: list[ValidationError] = []
    current_h2: str | None = None
    current_h3: str | None = None
    h2_titles = {title for _, title in h2_sections}

    for idx, line in enumerate(lines):
        stripped = line.strip()
        if not stripped.startswith("#"):
            continue
        if re.match(r"^#{5,}\s", stripped):
            errors.append(
                err("E080", "runbook 不允许使用五级及以上标题。", lines, idx)
            )
            continue
        if stripped.startswith("# "):
            if idx != 0:
                errors.append(
                    err("E081", "runbook 只能在首行使用一级标题。", lines, idx)
                )
            continue
        if stripped.startswith("## "):
            title = stripped[3:].strip()
            current_h2 = title
            current_h3 = None
            if title not in h2_titles:
                errors.append(
                    err("E082", "二级标题必须来自白名单。", lines, idx)
                )
            continue
        if stripped.startswith("### "):
            title = stripped[4:].strip()
            current_h3 = title
            if current_h2 in REQUIRED_H3_BY_H2:
                if title not in REQUIRED_H3_BY_H2[current_h2]:
                    errors.append(
                        err(
                            "E083",
                            f"`## {current_h2}` 下的三级标题必须来自白名单。",
                            lines,
                            idx,
                        )
                    )
            elif current_h2 in {"执行计划", "执行记录"}:
                if not STEP_RE.match(stripped):
                    errors.append(
                        err(
                            "E084",
                            f"`## {current_h2}` 下的三级标题只能是 `### 步骤 N - ...`。",
                            lines,
                            idx,
                        )
                    )
            elif current_h2 == "访谈记录":
                if not INTERVIEW_RE.match(stripped):
                    errors.append(
                        err(
                            "E130",
                            "`## 访谈记录` 下的三级标题只能是 `### 访谈 N - ...`。",
                            lines,
                            idx,
                        )
                    )
            else:
                errors.append(
                    err(
                        "E085",
                        f"`## {current_h2}` 下不允许出现三级标题。",
                        lines,
                        idx,
                    )
                )
            continue
        if stripped.startswith("#### "):
            if current_h2 == "执行计划":
                if stripped not in {"#### 执行", "#### 验收"}:
                    errors.append(
                        err(
                            "E086",
                            "`## 执行计划` 下的四级标题只能是 `#### 执行` 或 `#### 验收`。",
                            lines,
                            idx,
                        )
                    )
            elif current_h2 == "执行记录":
                if stripped not in {"#### 执行", "#### 验收"} and not SIGNED_EXEC_RE.match(stripped) and not SIGNED_ACCEPT_RE.match(stripped):
                    errors.append(
                        err(
                            "E087",
                            "`## 执行记录` 下的四级标题只能是白名单的 `执行/验收` 形式。",
                            lines,
                            idx,
                        )
                    )
            else:
                errors.append(
                    err(
                        "E088",
                        "只有 `## 执行计划` 和 `## 执行记录` 允许出现四级标题。",
                        lines,
                        idx,
                    )
                )
    return errors


def validate_interviews(
    lines: list[str], section_range: tuple[int, int]
) -> list[ValidationError]:
    start, end = section_range
    local_h3 = parse_sections(lines[start:end], 3)
    interviews = [
        (start + idx, title)
        for idx, title in local_h3
        if INTERVIEW_RE.match(f"### {title}")
    ]
    errors: list[ValidationError] = []

    if len(interviews) < 5:
        focus = interviews[-1][0] if interviews else start
        errors.append(
            err("E131", "`## 访谈记录` 至少需要五组用户访谈 Q/A。", lines, focus)
        )

    expected_num = 1
    for pos, (line_idx, title) in enumerate(interviews):
        match = INTERVIEW_RE.match(f"### {title}")
        if not match:
            continue
        actual_num = int(match.group(1))
        if actual_num != expected_num:
            errors.append(
                err(
                    "E132",
                    f"`## 访谈记录` 的访谈编号必须连续递增；期望 {expected_num}，实际 {actual_num}。",
                    lines,
                    line_idx,
                )
            )
            expected_num = actual_num
        expected_num += 1

        block_end = interviews[pos + 1][0] if pos + 1 < len(interviews) else end
        errors.extend(validate_single_interview_block(lines, line_idx, block_end))

    return errors


def validate_single_interview_block(
    lines: list[str], start: int, end: int
) -> list[ValidationError]:
    errors: list[ValidationError] = []
    body = [(idx, lines[idx].rstrip()) for idx in range(start + 1, end) if lines[idx].strip()]
    if len(body) < 4:
        errors.append(
            err(
                "E133",
                "每组访谈必须包含分行的 `Q:` 和 `A:`。",
                lines,
                start,
            )
        )
        return errors

    q_label_idx, q_label = body[0]
    q_text_idx, q_text = body[1]
    a_label_idx = None
    a_text_idx = None
    for idx, (line_idx, line) in enumerate(body[2:], start=2):
        if INTERVIEW_A_LABEL_RE.match(line):
            a_label_idx = line_idx
            if idx + 1 < len(body):
                a_text_idx = body[idx + 1][0]
            break

    if not INTERVIEW_Q_LABEL_RE.match(q_label):
        errors.append(err("E134", "访谈块必须先写单独一行的 `> Q:`。", lines, q_label_idx))
    if not INTERVIEW_TEXT_RE.match(q_text) or INTERVIEW_Q_LABEL_RE.match(q_text) or INTERVIEW_A_LABEL_RE.match(q_text):
        errors.append(err("E135", "`> Q:` 后一行必须是问题正文。", lines, q_text_idx))
    if a_label_idx is None:
        errors.append(err("E136", "访谈块缺少单独一行的 `> A:`。", lines, q_text_idx))
        return errors
    if not INTERVIEW_A_LABEL_RE.match(lines[a_label_idx].rstrip()):
        errors.append(err("E136", "访谈块缺少单独一行的 `> A:`。", lines, a_label_idx))
    if a_text_idx is None:
        errors.append(err("E137", "`> A:` 后一行必须是回答正文。", lines, a_label_idx))
        return errors
    a_text = lines[a_text_idx].rstrip()
    if not INTERVIEW_TEXT_RE.match(a_text) or INTERVIEW_Q_LABEL_RE.match(a_text) or INTERVIEW_A_LABEL_RE.match(a_text):
        errors.append(err("E137", "`> A:` 后一行必须是回答正文。", lines, a_text_idx))

    return errors


def extract_dot_block(
    lines: list[str], start: int, end: int
) -> tuple[int, int, list[str]] | None:
    block_start: int | None = None
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


def validate_two_level_dot_graph(
    lines: list[str], dot_lines: list[str], block_start: int
) -> ValidationError | None:
    edge_re = re.compile(r"^\s*([A-Za-z0-9_]+)\s*->\s*([A-Za-z0-9_]+)")
    out_degree: dict[str, int] = {}
    in_degree: dict[str, int] = {}
    children: dict[str, list[str]] = {}
    edge_count = 0

    for offset, raw in enumerate(dot_lines):
        match = edge_re.search(raw)
        if not match:
            continue
        src, dst = match.group(1), match.group(2)
        edge_count += 1
        out_degree[src] = out_degree.get(src, 0) + 1
        in_degree[dst] = in_degree.get(dst, 0) + 1
        out_degree.setdefault(dst, 0)
        in_degree.setdefault(src, 0)
        children.setdefault(src, []).append(dst)
        children.setdefault(dst, [])
        if src == dst:
            return err(
                "E091",
                "`dot` 脑图不能出现自环。",
                lines,
                block_start + offset + 1,
                raw.rstrip(),
            )

    if edge_count == 0:
        return err(
            "E089",
            "`dot` 脑图至少需要一条边。",
            lines,
            block_start,
            "```dot",
        )

    nodes = set(out_degree) | set(in_degree)
    roots = [node for node in nodes if in_degree.get(node, 0) == 0]
    if len(roots) != 1:
        focus_node = roots[0] if roots else next(iter(nodes))
        line_idx, content = find_dot_node_usage(lines, block_start, dot_lines, focus_node)
        return err(
            "E090",
            "`dot` 脑图必须且只能有一个 brain 根节点。",
            lines,
            line_idx,
            content,
        )

    root = roots[0]
    categories = children.get(root, [])
    if len(categories) < 2:
        line_idx, content = find_dot_node_usage(lines, block_start, dot_lines, root)
        return err(
            "E092",
            "brain 根节点至少需要两个一级分类节点。",
            lines,
            line_idx,
            content,
        )

    for category in categories:
        if in_degree.get(category, 0) != 1:
            line_idx, content = find_dot_node_usage(lines, block_start, dot_lines, category)
            return err(
                "E093",
                "一级分类节点只能从 brain 根节点进入一次。",
                lines,
                line_idx,
                content,
            )
        conclusions = children.get(category, [])
        if len(conclusions) < 2:
            line_idx, content = find_dot_node_usage(lines, block_start, dot_lines, category)
            return err(
                "E094",
                "每个一级分类节点至少需要两个二级结论节点。",
                lines,
                line_idx,
                content,
            )
        for conclusion in conclusions:
            if out_degree.get(conclusion, 0) != 0:
                line_idx, content = find_dot_node_usage(lines, block_start, dot_lines, conclusion)
                return err(
                    "E095",
                    "二级结论节点不能继续向下发散。",
                    lines,
                    line_idx,
                    content,
                )
            if in_degree.get(conclusion, 0) != 1:
                line_idx, content = find_dot_node_usage(lines, block_start, dot_lines, conclusion)
                return err(
                    "E096",
                    "二级结论节点只能属于一个一级分类。",
                    lines,
                    line_idx,
                    content,
                )

    allowed_nodes = {root, *categories}
    for category in categories:
        allowed_nodes.update(children.get(category, []))
    for node in nodes:
        if node not in allowed_nodes:
            line_idx, content = find_dot_node_usage(lines, block_start, dot_lines, node)
            return err(
                "E097",
                "脑图只能包含 brain、一级分类和二级结论三层节点。",
                lines,
                line_idx,
                content,
            )
    return None


def find_dot_node_usage(
    lines: list[str], block_start: int, dot_lines: list[str], node: str
) -> tuple[int | None, str | None]:
    pattern = re.compile(rf"\b{re.escape(node)}\b")
    for offset, raw in enumerate(dot_lines):
        if pattern.search(raw):
            return block_start + offset + 1, raw.rstrip()
    return block_start, "```dot"


def extract_steps(
    lines: list[str], h2_sections: list[tuple[int, str]], title: str
) -> list[tuple[int, str, list[tuple[int, str]]]]:
    section = section_slice(lines, h2_sections, title)
    if section is None:
        return []
    start, end = section
    steps: list[tuple[int, str, list[tuple[int, str]]]] = []
    current_title: str | None = None
    current_line_idx: int | None = None
    current_body: list[tuple[int, str]] = []

    for idx in range(start + 1, end):
        line = lines[idx]
        if STEP_RE.match(line):
            if current_title is not None and current_line_idx is not None:
                steps.append((current_line_idx, current_title, current_body))
            current_title = line
            current_line_idx = idx
            current_body = []
            continue
        if current_title is not None:
            current_body.append((idx, line))
    if current_title is not None and current_line_idx is not None:
        steps.append((current_line_idx, current_title, current_body))
    return steps


def validate_plan_steps(
    lines: list[str], steps: list[tuple[int, str, list[tuple[int, str]]]]
) -> list[ValidationError]:
    errors: list[ValidationError] = []
    for step_line_idx, title, body in steps:
        headings = [line.strip() for _, line in body if line.startswith("#### ")]
        if "#### 执行" not in headings:
            errors.append(err("E060", f"`{title}` 缺少 `#### 执行`。", lines, step_line_idx))
        if "#### 验收" not in headings:
            errors.append(err("E061", f"`{title}` 缺少 `#### 验收`。", lines, step_line_idx))
    return errors


def validate_record_steps(
    lines: list[str], steps: list[tuple[int, str, list[tuple[int, str]]]]
) -> list[ValidationError]:
    errors: list[ValidationError] = []
    for step_line_idx, title, body in steps:
        exec_indices = [(idx, line) for idx, line in body if line.startswith("#### 执行")]
        accept_indices = [(idx, line) for idx, line in body if line.startswith("#### 验收")]
        if not exec_indices:
            errors.append(err("E070", f"`{title}` 缺少 `#### 执行` 记录块。", lines, step_line_idx))
        if not accept_indices:
            errors.append(err("E071", f"`{title}` 缺少 `#### 验收` 记录块。", lines, step_line_idx))

        for line_idx, line in exec_indices:
            stripped = line.strip()
            if stripped not in {"#### 执行"} and not SIGNED_EXEC_RE.match(stripped):
                errors.append(
                    err(
                        "E072",
                        f"`{title}` 的执行记录小标题格式非法。",
                        lines,
                        line_idx,
                    )
                )
        for line_idx, line in accept_indices:
            stripped = line.strip()
            if stripped not in {"#### 验收"} and not SIGNED_ACCEPT_RE.match(stripped):
                errors.append(
                    err(
                        "E073",
                        f"`{title}` 的验收记录小标题格式非法。",
                        lines,
                        line_idx,
                    )
                )

        errors.extend(validate_signed_placeholder_mismatch(lines, title, body))
    return errors


def validate_signed_placeholder_mismatch(
    lines: list[str], title: str, body: list[tuple[int, str]]
) -> list[ValidationError]:
    errors: list[ValidationError] = []
    for idx, (_, line) in enumerate(body):
        stripped = line.strip()
        if not (SIGNED_EXEC_RE.match(stripped) or SIGNED_ACCEPT_RE.match(stripped)):
            continue
        block_lines: list[tuple[int, str]] = []
        for follower_idx, follower in body[idx + 1 :]:
            if follower.startswith("#### "):
                break
            if follower.strip():
                block_lines.append((follower_idx, follower.strip()))
        for block_line_idx, block_line in block_lines:
            if block_line in {"- 待执行。", "- 待验收。"}:
                errors.append(
                    err(
                        "E074",
                        f"`{title}` 已带签名，但内容仍是待执行/待验收占位。",
                        lines,
                        block_line_idx,
                    )
                )
                break
    return errors


def print_fail_text(path: Path, errors: list[ValidationError]) -> None:
    print(f"[runbook-validator] FAIL {path}")
    for item in errors:
        location = f" line {item.line}" if item.line is not None else ""
        print(f"- {item.code}{location}: {item.message}")
        if item.content:
            print(f"  content: {item.content}")


def print_fail_json(path: Path, errors: list[ValidationError]) -> None:
    payload = {
        "status": "fail",
        "path": str(path),
        "errors": [asdict(item) for item in errors],
    }
    print(json.dumps(payload, ensure_ascii=False, indent=2))


def print_pass_text(path: Path) -> None:
    print(f"[runbook-validator] PASS {path}")


def print_pass_json(path: Path) -> None:
    payload = {
        "status": "pass",
        "path": str(path),
        "errors": [],
    }
    print(json.dumps(payload, ensure_ascii=False, indent=2))


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Validate runbook structure before execution admission."
    )
    parser.add_argument("path", help="Path to the runbook markdown file.")
    parser.add_argument(
        "--json",
        action="store_true",
        help="Emit machine-readable JSON diagnostics.",
    )
    args = parser.parse_args()

    path = Path(args.path).expanduser().resolve()
    if not path.is_file():
        missing = ValidationError(
            code="E000",
            message=f"file not found: {path}",
        )
        if args.json:
            print_fail_json(path, [missing])
        else:
            print_fail_text(path, [missing])
        return 2

    errors = collect_errors(read_text(path))
    if errors:
        if args.json:
            print_fail_json(path, errors)
        else:
            print_fail_text(path, errors)
        return 1

    if args.json:
        print_pass_json(path)
    else:
        print_pass_text(path)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

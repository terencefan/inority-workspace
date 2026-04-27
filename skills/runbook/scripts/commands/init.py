from __future__ import annotations

import argparse
import sys
from pathlib import Path


TITLE_PLACEHOLDER = "# <主题>执行手册"
REQUIRED_FILENAME_SUFFIX = "-runbook.md"
REQUIRED_TITLE_SUFFIX = "执行手册"
SKELETON_TEMPLATE = """# <主题>执行手册

> [!NOTE]
> 当前模式：`<coding|operation|migration>`

## 背景与现状

### 背景

### 现状

## 目标与非目标

### 目标

### 非目标

## 风险与收益

### 风险

### 收益

## 思维脑图

## 红线行为

## 清理现场

## 执行计划

## 执行记录

## 最终验收

## 回滚方案

## 访谈记录

## 外部链接
"""


def render_template(*, title: str | None) -> str:
    text = SKELETON_TEMPLATE
    if title is None:
        return text

    cleaned = title.strip()
    if not cleaned or "\n" in cleaned:
        raise ValueError("`--title` must be a single non-empty line")
    if not cleaned.endswith(REQUIRED_TITLE_SUFFIX):
        raise ValueError(f"`--title` must end with {REQUIRED_TITLE_SUFFIX}")
    return text.replace(TITLE_PLACEHOLDER, f"# {cleaned}", 1)


def register(subparsers: argparse._SubParsersAction[argparse.ArgumentParser]) -> None:
    parser = subparsers.add_parser(
        "init",
        help="Create a new authority runbook from the template",
        description="Create a new authority runbook from the template.",
    )
    parser.add_argument("path", help="Path to the runbook markdown file to create.")
    parser.add_argument("--title", help="Optional runbook title to replace the template placeholder.")
    parser.add_argument(
        "--force",
        action="store_true",
        help="Overwrite the target file if it already exists.",
    )
    parser.set_defaults(handler=handle)


def handle(args: argparse.Namespace) -> int:
    path = Path(args.path).expanduser().resolve()
    if not path.name.endswith(REQUIRED_FILENAME_SUFFIX):
        print(
            f"error: runbook filename must end with {REQUIRED_FILENAME_SUFFIX}: {path.name}",
            file=sys.stderr,
        )
        return 1
    if path.exists() and path.is_dir():
        print(f"error: target path is a directory: {path}", file=sys.stderr)
        return 1
    if path.exists() and not args.force:
        print(f"error: target file already exists: {path}; use --force to overwrite", file=sys.stderr)
        return 1

    try:
        content = render_template(title=args.title)
    except ValueError as exc:
        print(f"error: {exc}", file=sys.stderr)
        return 1

    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content, encoding="utf-8")
    action = "overwrote" if args.force and path.exists() else "created"
    print(f"[runbook-init] {action} {path}")
    return 0

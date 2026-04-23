from __future__ import annotations

import argparse
import sys
from pathlib import Path


AUTHORITY_TEMPLATE = Path(__file__).resolve().parent.parent.parent / "references" / "authority-runbook-template.md"
TITLE_PLACEHOLDER = "# <runbook 标题>"


def render_template(*, title: str | None) -> str:
    text = AUTHORITY_TEMPLATE.read_text(encoding="utf-8")
    if title is None:
        return text

    cleaned = title.strip()
    if not cleaned or "\n" in cleaned:
        raise ValueError("`--title` must be a single non-empty line")
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

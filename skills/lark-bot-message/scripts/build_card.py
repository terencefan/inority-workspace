#!/usr/bin/env python3
"""Build a compact Feishu/Lark interactive card JSON payload."""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path


def read_body(args: argparse.Namespace) -> str:
    if args.body is not None:
        return args.body
    if args.body_file is not None:
        return Path(args.body_file).read_text(encoding="utf-8")
    raise SystemExit("one of --body or --body-file is required")


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Build JSON for lark-cli im +messages-send --msg-type interactive --content."
    )
    parser.add_argument("--title", required=True, help="Card header title.")
    parser.add_argument("--body", help="Markdown body content.")
    parser.add_argument("--body-file", help="Read Markdown body content from a UTF-8 file.")
    parser.add_argument(
        "--template",
        default="blue",
        choices=["blue", "wathet", "turquoise", "green", "yellow", "orange", "red", "purple", "grey"],
        help="Feishu card header color template.",
    )
    parser.add_argument("--button-text", help="Optional primary button label.")
    parser.add_argument("--button-url", help="Optional primary button URL.")
    args = parser.parse_args()

    if bool(args.button_text) != bool(args.button_url):
        raise SystemExit("--button-text and --button-url must be provided together")

    elements: list[dict[str, object]] = [{"tag": "markdown", "content": read_body(args)}]
    if args.button_text and args.button_url:
        elements.append(
            {
                "tag": "action",
                "actions": [
                    {
                        "tag": "button",
                        "text": {"tag": "plain_text", "content": args.button_text},
                        "url": args.button_url,
                        "type": "primary",
                    }
                ],
            }
        )

    card = {
        "config": {"wide_screen_mode": True},
        "header": {
            "template": args.template,
            "title": {"tag": "plain_text", "content": args.title},
        },
        "elements": elements,
    }
    json.dump(card, sys.stdout, ensure_ascii=False, separators=(",", ":"))
    sys.stdout.write("\n")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

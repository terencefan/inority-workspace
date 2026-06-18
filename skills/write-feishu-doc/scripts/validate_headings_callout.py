#!/usr/bin/env python3
"""Validate that each top-level heading block is immediately followed by a callout block."""

from __future__ import annotations

import argparse
import re
import sys
from dataclasses import dataclass
from pathlib import Path

TOKEN_RE = re.compile(r"<!--.*?-->|<(/?)([a-zA-Z0-9_-]+)\b[^>]*?>", re.S)


@dataclass
class Block:
    tag: str
    start: int
    end: int
    text: str


def extract_blocks(xml: str) -> list[Block]:
    blocks: list[Block] = []
    stack: list[tuple[str, int, int]] = []

    for match in TOKEN_RE.finditer(xml):
        token = match.group(0)
        if token.startswith("<!--"):
            continue

        is_close = bool(match.group(1))
        tag = match.group(2)
        is_self_closing = token.rstrip().endswith("/>")

        if not is_close:
            depth = len(stack)
            stack.append((tag, match.start(), depth))
            if is_self_closing:
                open_tag, start, depth = stack.pop()
                if depth == 0:
                    blocks.append(Block(tag=open_tag, start=start, end=match.end(), text=xml[start:match.end()]))
            continue

        for idx in range(len(stack) - 1, -1, -1):
            open_tag, start, depth = stack[idx]
            if open_tag == tag:
                if depth == 0:
                    blocks.append(Block(tag=tag, start=start, end=match.end(), text=xml[start:match.end()]))
                del stack[idx:]
                break

    blocks.sort(key=lambda block: block.start)
    return blocks


def strip_tags(text: str) -> str:
    text = re.sub(r"<[^>]+>", "", text)
    return " ".join(text.split())


def find_next_block(blocks: list[Block], current: Block) -> Block | None:
    for block in blocks:
        if block.start > current.end:
            return block
    return None


def validate(xml: str) -> list[str]:
    blocks = extract_blocks(xml)
    headings = [block for block in blocks if block.tag == "title" or re.fullmatch(r"h[1-6]", block.tag)]
    errors: list[str] = []

    for heading in headings:
        next_block = find_next_block(blocks, heading)
        heading_text = strip_tags(heading.text) or heading.tag
        if next_block is None:
            errors.append(f"{heading.tag} '{heading_text}' has no following block; expected a callout")
            continue
        if next_block.tag != "callout":
            errors.append(
                f"{heading.tag} '{heading_text}' is followed by '{next_block.tag}' instead of 'callout'"
            )

    return errors


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("xml_file", type=Path, help="Authority XML file to validate")
    args = parser.parse_args()

    xml = args.xml_file.read_text()
    errors = validate(xml)
    if not errors:
        print(f"OK: {args.xml_file}")
        return 0

    print(f"FAIL: {args.xml_file}")
    for error in errors:
        print(f"- {error}")
    return 1


if __name__ == "__main__":
    sys.exit(main())

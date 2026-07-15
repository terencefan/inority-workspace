#!/usr/bin/env python3
"""Reject semicolons in Feishu document prose while ignoring literal content."""

from __future__ import annotations

import argparse
import re
import sys
import xml.etree.ElementTree as ET
from dataclasses import dataclass
from pathlib import Path


SEMICOLONS = {";", "\uff1b"}
IGNORED_TAGS = {
    "code",
    "pre",
    "whiteboard",
    "source",
    "img",
    "blockquote",
}
HEADING_RE = re.compile(r"h[1-6]")


@dataclass(frozen=True)
class Finding:
    block: str
    heading: str
    snippet: str


def local_tag(tag: str) -> str:
    return tag.rsplit("}", 1)[-1]


def prose_text(element: ET.Element) -> str:
    if local_tag(element.tag) in IGNORED_TAGS:
        return ""

    parts: list[str] = []
    if element.text:
        parts.append(element.text)
    for child in element:
        if local_tag(child.tag) not in IGNORED_TAGS:
            parts.append(prose_text(child))
        if child.tail:
            parts.append(child.tail)
    return "".join(parts)


def normalize_snippet(text: str, limit: int = 140) -> str:
    text = " ".join(text.split())
    if len(text) <= limit:
        return text
    return text[: limit - 3].rstrip() + "..."


def validate(xml: str) -> list[Finding]:
    try:
        root = ET.fromstring(f"<document>{xml}</document>")
    except ET.ParseError as exc:
        raise ValueError(f"invalid authority XML: {exc}") from exc

    findings: list[Finding] = []
    current_heading = "document start"

    for block in root:
        tag = local_tag(block.tag)
        text = prose_text(block)
        if tag == "title" or HEADING_RE.fullmatch(tag):
            current_heading = normalize_snippet(text) or tag
        if tag in IGNORED_TAGS or not any(mark in text for mark in SEMICOLONS):
            continue

        block_id = block.attrib.get("id")
        block_label = f"{tag}#{block_id}" if block_id else tag
        findings.append(
            Finding(
                block=block_label,
                heading=current_heading,
                snippet=normalize_snippet(text),
            )
        )

    return findings


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("xml_file", type=Path, help="Authority XML file to validate")
    args = parser.parse_args()

    try:
        findings = validate(args.xml_file.read_text())
    except (OSError, ValueError) as exc:
        print(f"FAIL: {args.xml_file}")
        print(f"- {exc}")
        return 1

    if not findings:
        print(f"OK: {args.xml_file}")
        return 0

    print(f"FAIL: {args.xml_file}")
    print(
        "Semicolons are not allowed in document prose. Rewrite parallel items as a list, "
        "table, or subheadings instead of replacing punctuation mechanically."
    )
    for finding in findings:
        print(f"- [{finding.heading}] {finding.block}: {finding.snippet}")
    return 1


if __name__ == "__main__":
    sys.exit(main())

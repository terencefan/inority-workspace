from __future__ import annotations

import argparse

from . import validate_cmd as validate_cmd


def build_parser(prog: str = "specctl") -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog=prog,
        description="spec-ctl unified CLI for validating authority specs.",
    )
    subparsers = parser.add_subparsers(dest="command", required=True)
    validate_cmd.register(subparsers)
    return parser


def main(argv: list[str] | None = None, *, prog: str = "specctl") -> int:
    parser = build_parser(prog=prog)
    args = parser.parse_args(argv)
    handler = getattr(args, "handler", None)
    if handler is None:
        parser.print_help()
        return 2
    return handler(args)

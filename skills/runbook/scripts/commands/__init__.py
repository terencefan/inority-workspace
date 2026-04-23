from __future__ import annotations

import argparse

from . import add_step as add_step_cmd
from . import move_step as move_step_cmd
from . import remove_step as remove_step_cmd
from . import add_qa as add_qa_cmd
from . import init as init_cmd
from . import normalize as normalize_cmd
from . import shift_items as shift_items_cmd
from . import sign_step as sign_step_cmd
from . import sync_records as sync_records_cmd
from . import validate as validate_cmd


def build_parser(prog: str = "runctl") -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog=prog,
        description="runbook-ctl unified CLI for validating and editing authority runbooks.",
    )
    subparsers = parser.add_subparsers(dest="command", required=True)
    init_cmd.register(subparsers)
    add_step_cmd.register(subparsers)
    add_qa_cmd.register(subparsers)
    move_step_cmd.register(subparsers)
    remove_step_cmd.register(subparsers)
    normalize_cmd.register(subparsers)
    validate_cmd.register(subparsers)
    shift_items_cmd.register(subparsers)
    sign_step_cmd.register(subparsers)
    sync_records_cmd.register(subparsers)
    return parser


def main(argv: list[str] | None = None, *, prog: str = "runctl") -> int:
    parser = build_parser(prog=prog)
    args = parser.parse_args(argv)
    handler = getattr(args, "handler", None)
    if handler is None:
        parser.print_help()
        return 2
    return handler(args)

from __future__ import annotations

import argparse
import sys
from pathlib import Path

import commands.normalize as normalize_cmd
import commands.validator_client as validator_client


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
        validator_client.print_fail(
            path,
            [validator_client.ValidationError(code="E000", message=validator_client.error_message("E000", path=path))],
            args.json,
        )
        return 2

    _, normalized, _ = normalize_cmd.normalize_file(path)
    try:
        errors = validator_client.invoke_validator_core(normalized, path=path)
    except RuntimeError as exc:
        print(f"error: {exc}", file=sys.stderr)
        return 1
    if errors:
        validator_client.print_fail(path, errors, args.json)
        return 1

    validator_client.print_pass(path, args.json)
    return 0

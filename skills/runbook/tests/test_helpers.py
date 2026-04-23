from __future__ import annotations

import json
from pathlib import Path


TESTS_DIR = Path(__file__).resolve().parent
SKILL_DIR = TESTS_DIR.parent
SCRIPTS_DIR = SKILL_DIR / "scripts"
RUNCTL = SCRIPTS_DIR / "runctl"
ASSETS_DIR = TESTS_DIR / "assets"
REFERENCE_TEMPLATE = SKILL_DIR / "references" / "authority-runbook-template.md"
ERROR_CODE_CATALOG = SKILL_DIR / "references" / "validator-error-codes.yaml"


def load_text(path: Path) -> str:
    return path.read_text(encoding="utf-8")


def load_json(path: Path) -> object:
    return json.loads(load_text(path))


def apply_replacements(text: str, replacements: list[dict[str, str]]) -> str:
    updated = text
    for replacement in replacements:
        old = replacement["old"]
        new = replacement["new"]
        if old not in updated:
            raise AssertionError(f"fixture replacement target not found: {old!r}")
        updated = updated.replace(old, new)
    return updated

from __future__ import annotations

import json
from pathlib import Path


TESTS_DIR = Path(__file__).resolve().parent
SKILL_DIR = TESTS_DIR.parent
SCRIPTS_DIR = SKILL_DIR / "scripts"
SPECCTL = SCRIPTS_DIR / "specctl"
ASSETS_DIR = TESTS_DIR / "assets"
REFERENCE_SPEC = ASSETS_DIR / "reference-spec.md"
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

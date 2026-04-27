from __future__ import annotations

import json
import re
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

from test_helpers import ASSETS_DIR, ERROR_CODE_CATALOG, REFERENCE_SPEC, SCRIPTS_DIR, SPECCTL, apply_replacements, load_json, load_text

sys.path.insert(0, str(SCRIPTS_DIR))

import commands.validator_client as validate_core


class ValidateSpecTests(unittest.TestCase):
    maxDiff = None

    def setUp(self) -> None:
        self.reference_text = load_text(REFERENCE_SPEC)
        self.cases = load_json(ASSETS_DIR / "validate_cases.json")
        self.error_catalog_text = load_text(ERROR_CODE_CATALOG)

    def test_reference_spec_passes_validation(self) -> None:
        self.assertEqual([], validate_core.collect_errors(self.reference_text))

    def test_error_code_catalog_covers_runtime_codes(self) -> None:
        runtime_codes = set(re.findall(r'"(E\d{3})"', load_text(SCRIPTS_DIR / "commands" / "validator_client.py")))
        runtime_codes.update(re.findall(r'"(E\d{3})"', load_text(SCRIPTS_DIR / "commands" / "validate_cmd.py")))
        runtime_codes.update(re.findall(r'"(E\d{3})"', load_text(SCRIPTS_DIR / "commands" / "validate.mjs")))
        runtime_codes.add("E000")
        catalog = validate_core.load_error_catalog()

        self.assertTrue(self.error_catalog_text.startswith("E000:"))
        self.assertTrue(runtime_codes.issubset(catalog.keys()))
        self.assertEqual("首行必须是 spec 标题", validate_core.error_message("E001"))

    def test_asset_cases_emit_expected_error_codes(self) -> None:
        for case in self.cases:
            with self.subTest(case=case["name"]):
                mutated = apply_replacements(self.reference_text, case["replacements"])
                codes = {item.code for item in validate_core.collect_errors(mutated)}
                for expected in case["expected_codes"]:
                    self.assertIn(expected, codes)

    def test_cli_json_failure_payload_contains_expected_codes(self) -> None:
        case = next(item for item in self.cases if item["name"] == "missing-convergence-impact")
        mutated = apply_replacements(self.reference_text, case["replacements"])

        with tempfile.TemporaryDirectory() as tmpdir:
            spec_path = Path(tmpdir) / "invalid-spec.md"
            spec_path.write_text(mutated, encoding="utf-8")
            result = subprocess.run(
                [sys.executable, str(SPECCTL), "validate", str(spec_path), "--json"],
                capture_output=True,
                text=True,
                check=False,
            )

            self.assertEqual(1, result.returncode)
            payload = json.loads(result.stdout)
            self.assertEqual("fail", payload["status"])
            self.assertEqual(str(spec_path.resolve()), payload["path"])
            self.assertIn("natural_language_summary", payload)
            self.assertIn("natural_language_items", payload)
            codes = {item["code"] for item in payload["errors"]}
            for expected in case["expected_codes"]:
                self.assertIn(expected, codes)

    def test_filename_must_end_with_required_suffix(self) -> None:
        with tempfile.TemporaryDirectory() as tmpdir:
            spec_path = Path(tmpdir) / "example.md"
            spec_path.write_text(self.reference_text, encoding="utf-8")
            result = subprocess.run(
                [sys.executable, str(SPECCTL), "validate", str(spec_path), "--json"],
                capture_output=True,
                text=True,
                check=False,
            )

            self.assertEqual(1, result.returncode)
            payload = json.loads(result.stdout)
            codes = {item["code"] for item in payload["errors"]}
            self.assertIn("E003", codes)

    def test_specctl_validate_help_lists_subcommands(self) -> None:
        result = subprocess.run(
            [sys.executable, str(SPECCTL), "--help"],
            capture_output=True,
            text=True,
            check=False,
        )

        self.assertEqual(0, result.returncode)
        self.assertIn("spec-ctl unified CLI", result.stdout)
        self.assertIn("usage: specctl", result.stdout)
        self.assertIn("validate", result.stdout)

    def test_specctl_validate_passes_reference_spec(self) -> None:
        result = subprocess.run(
            [sys.executable, str(SPECCTL), "validate", str(REFERENCE_SPEC)],
            capture_output=True,
            text=True,
            check=False,
        )

        self.assertEqual(0, result.returncode)
        self.assertIn("[spec-validator] PASS", result.stdout)


if __name__ == "__main__":
    unittest.main()

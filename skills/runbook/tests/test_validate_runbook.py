from __future__ import annotations

import json
import re
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

from test_helpers import ASSETS_DIR, ERROR_CODE_CATALOG, RUNCTL, REFERENCE_TEMPLATE, SCRIPTS_DIR, apply_replacements, load_json, load_text

sys.path.insert(0, str(SCRIPTS_DIR))

import commands.validator_client as validate_core


class ValidateRunbookTests(unittest.TestCase):
    maxDiff = None

    def setUp(self) -> None:
        self.template_text = load_text(REFERENCE_TEMPLATE)
        self.cases = load_json(ASSETS_DIR / "validate_cases.json")
        self.normalize_cases = load_json(ASSETS_DIR / "normalize_cases.json")
        self.error_catalog_text = load_text(ERROR_CODE_CATALOG)

    def test_reference_template_passes_validation(self) -> None:
        self.assertEqual([], validate_core.collect_errors(self.template_text))

    def test_error_code_catalog_covers_runtime_codes(self) -> None:
        runtime_codes = set(re.findall(r'"(E\d{3})"', load_text(SCRIPTS_DIR / "commands" / "validator_client.py")))
        runtime_codes.update(re.findall(r'"(E\d{3})"', load_text(SCRIPTS_DIR / "commands" / "validate_cmd.py")))
        runtime_codes.update(re.findall(r'"(E\d{3})"', load_text(SCRIPTS_DIR / "commands" / "validate.mjs")))
        runtime_codes.add("E000")
        catalog = validate_core.load_error_catalog()

        self.assertTrue(self.error_catalog_text.startswith("E000:"))
        self.assertTrue(runtime_codes.issubset(catalog.keys()))
        self.assertEqual("首行必须是 runbook 标题", validate_core.error_message("E001"))

    def test_auto_normalize_numbering_restores_template_shape(self) -> None:
        for case_name, case in self.normalize_cases.items():
            with self.subTest(case=case_name):
                mutated = apply_replacements(self.template_text, case["replacements"])
                normalized = validate_core.normalize_runbook_numbering(mutated)

                self.assertEqual(self.template_text, normalized)
                self.assertEqual([], validate_core.collect_errors(mutated))

    def test_asset_cases_emit_expected_error_codes(self) -> None:
        for case in self.cases:
            with self.subTest(case=case["name"]):
                mutated = apply_replacements(self.template_text, case["replacements"])
                codes = {item.code for item in validate_core.collect_errors(mutated)}
                for expected in case["expected_codes"]:
                    self.assertIn(expected, codes)

    def test_cli_json_failure_payload_contains_expected_codes(self) -> None:
        case = next(item for item in self.cases if item["name"] == "inline-question-options")
        mutated = apply_replacements(self.template_text, case["replacements"])

        with tempfile.TemporaryDirectory() as tmpdir:
            runbook_path = Path(tmpdir) / "invalid-runbook.md"
            runbook_path.write_text(mutated, encoding="utf-8")
            result = subprocess.run(
                [sys.executable, str(RUNCTL), "validate", str(runbook_path), "--json"],
                capture_output=True,
                text=True,
                check=False,
            )

        self.assertEqual(1, result.returncode)
        payload = json.loads(result.stdout)
        self.assertEqual("fail", payload["status"])
        self.assertEqual(str(runbook_path.resolve()), payload["path"])
        self.assertIn("natural_language_summary", payload)
        self.assertIn("natural_language_items", payload)
        codes = {item["code"] for item in payload["errors"]}
        for expected in case["expected_codes"]:
            self.assertIn(expected, codes)

    def test_title_must_not_include_date(self) -> None:
        mutated = self.template_text.replace("# <主题>执行手册", "# 2026-04-23 Canary Bootstrap 执行手册", 1)

        codes = {item.code for item in validate_core.collect_errors(mutated)}

        self.assertIn("E105", codes)

    def test_filename_must_not_include_date(self) -> None:
        with tempfile.TemporaryDirectory() as tmpdir:
            dated_dir = Path(tmpdir) / "2026-04-23"
            dated_dir.mkdir()
            runbook_path = dated_dir / "2026-04-23-canary-bootstrap.md"
            runbook_path.write_text(self.template_text, encoding="utf-8")
            result = subprocess.run(
                [sys.executable, str(RUNCTL), "validate", str(runbook_path), "--json"],
                capture_output=True,
                text=True,
                check=False,
            )

        self.assertEqual(1, result.returncode)
        payload = json.loads(result.stdout)
        codes = {item["code"] for item in payload["errors"]}
        self.assertIn("E106", codes)

    def test_title_must_end_with_required_suffix(self) -> None:
        mutated = self.template_text.replace("# <主题>执行手册", "# Canary Bootstrap", 1)

        codes = {item.code for item in validate_core.collect_errors(mutated)}

        self.assertIn("E107", codes)

    def test_filename_must_end_with_required_suffix(self) -> None:
        with tempfile.TemporaryDirectory() as tmpdir:
            runbook_path = Path(tmpdir) / "canary-bootstrap.md"
            runbook_path.write_text(self.template_text, encoding="utf-8")
            result = subprocess.run(
                [sys.executable, str(RUNCTL), "validate", str(runbook_path), "--json"],
                capture_output=True,
                text=True,
                check=False,
            )

        self.assertEqual(1, result.returncode)
        payload = json.loads(result.stdout)
        codes = {item["code"] for item in payload["errors"]}
        self.assertIn("E108", codes)

    def test_mode_note_must_exist_under_title(self) -> None:
        mutated = self.template_text.replace("> [!NOTE]\n> 当前模式：`<coding|operation|migration|slides>`\n\n", "", 1)

        codes = {item.code for item in validate_core.collect_errors(mutated)}

        self.assertIn("E109", codes)
        self.assertIn("E110", codes)

    def test_mode_note_must_use_supported_mode(self) -> None:
        mutated = self.template_text.replace(
            "> 当前模式：`<coding|operation|migration|slides>`",
            "> 当前模式：`unknown`",
            1,
        )

        codes = {item.code for item in validate_core.collect_errors(mutated)}

        self.assertIn("E110", codes)

    def test_mode_note_accepts_slides(self) -> None:
        mutated = self.template_text.replace(
            "> 当前模式：`<coding|operation|migration|slides>`",
            "> 当前模式：`slides`",
            1,
        )

        codes = {item.code for item in validate_core.collect_errors(mutated)}

        self.assertNotIn("E110", codes)

    def test_runctl_validate_help_lists_subcommands(self) -> None:
        result = subprocess.run(
            [sys.executable, str(RUNCTL), "--help"],
            capture_output=True,
            text=True,
            check=False,
        )

        self.assertEqual(0, result.returncode)
        self.assertIn("runbook-ctl unified CLI", result.stdout)
        self.assertIn("usage: runctl", result.stdout)
        self.assertIn("init", result.stdout)
        self.assertIn("add-step", result.stdout)
        self.assertIn("add-qa", result.stdout)
        self.assertIn("move-step", result.stdout)
        self.assertIn("remove-step", result.stdout)
        self.assertIn("normalize", result.stdout)
        self.assertIn("validate", result.stdout)
        self.assertIn("shift-items", result.stdout)
        self.assertIn("sign-step", result.stdout)
        self.assertIn("sync-records", result.stdout)

    def test_runctl_normalize_writes_normalized_numbering_back_to_file(self) -> None:
        for case_name, case in self.normalize_cases.items():
            with self.subTest(case=case_name):
                mutated = apply_replacements(self.template_text, case["replacements"])

                with tempfile.TemporaryDirectory() as tmpdir:
                    runbook_path = Path(tmpdir) / f"{case_name}-runbook.md"
                    runbook_path.write_text(mutated, encoding="utf-8")
                    result = subprocess.run(
                        [sys.executable, str(RUNCTL), "normalize", str(runbook_path)],
                        capture_output=True,
                        text=True,
                        check=False,
                    )

                    self.assertEqual(0, result.returncode)
                    self.assertEqual(self.template_text, runbook_path.read_text(encoding="utf-8"))
                    self.assertIn("[runbook-normalize] updated", result.stdout)

    def test_runctl_validate_passes_reference_template(self) -> None:
        result = subprocess.run(
            [sys.executable, str(RUNCTL), "validate", str(REFERENCE_TEMPLATE)],
            capture_output=True,
            text=True,
            check=False,
        )

        self.assertEqual(0, result.returncode)
        self.assertIn("[runbook-validator] PASS", result.stdout)

    def test_runctl_validate_writes_normalized_numbering_back_to_file(self) -> None:
        for case_name, case in self.normalize_cases.items():
            with self.subTest(case=case_name):
                mutated = apply_replacements(self.template_text, case["replacements"])

                with tempfile.TemporaryDirectory() as tmpdir:
                    runbook_path = Path(tmpdir) / f"{case_name}-runbook.md"
                    runbook_path.write_text(mutated, encoding="utf-8")
                    result = subprocess.run(
                        [sys.executable, str(RUNCTL), "validate", str(runbook_path)],
                        capture_output=True,
                        text=True,
                        check=False,
                    )

                    self.assertEqual(0, result.returncode)
                    self.assertEqual(self.template_text, runbook_path.read_text(encoding="utf-8"))

                self.assertIn("[runbook-validator] PASS", result.stdout)

if __name__ == "__main__":
    unittest.main()

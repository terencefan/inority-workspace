from __future__ import annotations

import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

from test_helpers import (
    ASSETS_DIR,
    RUNCTL,
    REFERENCE_TEMPLATE,
    SCRIPTS_DIR,
    apply_replacements,
    load_json,
    load_text,
)

sys.path.insert(0, str(SCRIPTS_DIR))

from commands import sign_step as sign_step_command
import commands.validate as validate_core


class SignRunbookStepTests(unittest.TestCase):
    maxDiff = None

    def setUp(self) -> None:
        self.template_text = load_text(REFERENCE_TEMPLATE)
        self.case = load_json(ASSETS_DIR / "sign_cases.json")["execution_ready"]

    def signed_source(self) -> str:
        return apply_replacements(self.template_text, self.case["replacements"])

    def test_sign_step_updates_plan_and_record_headings(self) -> None:
        rewritten, signature_label = sign_step_command.sign_step(
            self.signed_source(),
            item=self.case["item"],
            phase=self.case["phase"],
            signer=self.case["signer"],
            timestamp=self.case["timestamp"],
        )

        self.assertEqual("@codex 2026-04-23 10:30 +0800", signature_label)
        for fragment in self.case["expected_fragments"]:
            self.assertIn(fragment, rewritten)
        self.assertEqual([], validate_core.collect_errors(rewritten))

    def test_runctl_sign_step_dry_run_requires_validator_pass(self) -> None:
        with tempfile.TemporaryDirectory() as tmpdir:
            runbook_path = Path(tmpdir) / "sign-dry-run.md"
            runbook_path.write_text(self.signed_source(), encoding="utf-8")
            result = subprocess.run(
                [
                    sys.executable,
                    str(RUNCTL),
                    "sign-step",
                    str(runbook_path),
                    "--item",
                    str(self.case["item"]),
                    "--phase",
                    self.case["phase"],
                    "--signer",
                    self.case["signer"],
                    "--timestamp",
                    self.case["timestamp"],
                    "--dry-run",
                ],
                capture_output=True,
                text=True,
                check=False,
            )

            self.assertEqual(0, result.returncode)
            self.assertEqual(self.signed_source(), runbook_path.read_text(encoding="utf-8"))

        self.assertIn("#### 执行 @codex 2026-04-23 10:30 +0800", result.stdout)
        self.assertIn("validator passed", result.stderr)

    def test_sign_script_rejects_placeholder_record_blocks(self) -> None:
        with tempfile.TemporaryDirectory() as tmpdir:
            runbook_path = Path(tmpdir) / "sign-fail.md"
            runbook_path.write_text(self.template_text, encoding="utf-8")
            result = subprocess.run(
                [
                    sys.executable,
                    str(RUNCTL),
                    "sign-step",
                    str(runbook_path),
                    "--item",
                    "1",
                    "--phase",
                    "execution",
                ],
                capture_output=True,
                text=True,
                check=False,
            )

            self.assertEqual(1, result.returncode)
            self.assertEqual(self.template_text, runbook_path.read_text(encoding="utf-8"))

        self.assertIn("placeholder conclusions", result.stderr)


if __name__ == "__main__":
    unittest.main()

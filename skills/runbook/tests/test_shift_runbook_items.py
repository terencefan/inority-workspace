from __future__ import annotations

import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

from test_helpers import ASSETS_DIR, RUNCTL, REFERENCE_TEMPLATE, SCRIPTS_DIR, apply_replacements, load_json, load_text

sys.path.insert(0, str(SCRIPTS_DIR))

import commands.shift_items as shift_items_core


class ShiftRunbookItemsTests(unittest.TestCase):
    maxDiff = None

    def setUp(self) -> None:
        self.template_text = load_text(REFERENCE_TEMPLATE)
        self.case = load_json(ASSETS_DIR / "shift_cases.json")["start_2_shift_2"]

    def expected_shifted_text(self) -> str:
        return apply_replacements(self.template_text, self.case["replacements"])

    def test_shift_runbook_items_matches_asset_expectation(self) -> None:
        rewritten, mapping = shift_items_core.shift_runbook_items(
            self.template_text,
            start=self.case["start"],
            shift=self.case["shift"],
        )

        self.assertEqual(self.expected_shifted_text(), rewritten)
        self.assertEqual({2: 4}, mapping)
        for fragment in self.case["absent_fragments"]:
            self.assertNotIn(fragment, rewritten)

    def test_preview_cli_emits_diff_without_writing_file(self) -> None:
        with tempfile.TemporaryDirectory() as tmpdir:
            runbook_path = Path(tmpdir) / "preview.md"
            runbook_path.write_text(self.template_text, encoding="utf-8")
            result = subprocess.run(
                [
                    sys.executable,
                    str(RUNCTL),
                    "shift-items",
                    str(runbook_path),
                    "--start",
                    str(self.case["start"]),
                    "--shift",
                    str(self.case["shift"]),
                ],
                capture_output=True,
                text=True,
                check=False,
            )

            self.assertEqual(0, result.returncode)
            self.assertEqual(self.template_text, runbook_path.read_text(encoding="utf-8"))

        self.assertIn("---", result.stdout)
        self.assertIn("+++ ", result.stdout)
        self.assertIn("### 🔴 4. <编号项标题>", result.stdout)
        self.assertIn("Preview only: would open slots 2-3", result.stderr)

    def test_runctl_shift_items_preview_matches_existing_cli_contract(self) -> None:
        with tempfile.TemporaryDirectory() as tmpdir:
            runbook_path = Path(tmpdir) / "preview-runctl.md"
            runbook_path.write_text(self.template_text, encoding="utf-8")
            result = subprocess.run(
                [
                    sys.executable,
                    str(RUNCTL),
                    "shift-items",
                    str(runbook_path),
                    "--start",
                    str(self.case["start"]),
                    "--shift",
                    str(self.case["shift"]),
                ],
                capture_output=True,
                text=True,
                check=False,
            )

            self.assertEqual(0, result.returncode)
            self.assertEqual(self.template_text, runbook_path.read_text(encoding="utf-8"))

        self.assertIn("### 🔴 4. <编号项标题>", result.stdout)
        self.assertIn("Preview only: would open slots 2-3", result.stderr)

    def test_in_place_cli_writes_shifted_content(self) -> None:
        with tempfile.TemporaryDirectory() as tmpdir:
            runbook_path = Path(tmpdir) / "in-place.md"
            runbook_path.write_text(self.template_text, encoding="utf-8")
            result = subprocess.run(
                [
                    sys.executable,
                    str(RUNCTL),
                    "shift-items",
                    str(runbook_path),
                    "--start",
                    str(self.case["start"]),
                    "--shift",
                    str(self.case["shift"]),
                    "--in-place",
                ],
                capture_output=True,
                text=True,
                check=False,
            )

            self.assertEqual(0, result.returncode)
            self.assertEqual(self.expected_shifted_text(), runbook_path.read_text(encoding="utf-8"))

        self.assertIn("opened slots 2-3", result.stdout)
        self.assertIn("moved 2-2 -> 4-4", result.stdout)

    def test_shift_rejects_misaligned_plan_and_records(self) -> None:
        misaligned = self.template_text.replace(
            "### 🔴 2. <编号项标题>\n\n<a id=\"item-2-execution-record\"></a>",
            "### 🔴 2. 不对齐标题\n\n<a id=\"item-2-execution-record\"></a>",
            1,
        )

        with self.assertRaisesRegex(ValueError, "not aligned"):
            shift_items_core.shift_runbook_items(misaligned, start=2, shift=2)


if __name__ == "__main__":
    unittest.main()

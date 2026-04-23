from __future__ import annotations

import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

from test_helpers import REFERENCE_TEMPLATE, RUNCTL, load_text

sys.path.insert(0, str(RUNCTL.parent))

import commands.validate as validate_cmd


class MoveRemoveStepTests(unittest.TestCase):
    maxDiff = None

    def setUp(self) -> None:
        self.template_text = load_text(REFERENCE_TEMPLATE)

    def test_runctl_remove_step_removes_plan_and_record_item(self) -> None:
        with tempfile.TemporaryDirectory() as tmpdir:
            runbook_path = Path(tmpdir) / "authority.md"
            runbook_path.write_text(self.template_text, encoding="utf-8")
            result = subprocess.run(
                [sys.executable, str(RUNCTL), "remove-step", str(runbook_path), "--item", "2"],
                capture_output=True,
                text=True,
                check=False,
            )

            self.assertEqual(0, result.returncode)
            content = runbook_path.read_text(encoding="utf-8")

        self.assertIn("[runbook-remove-step] removed item 2", result.stdout)
        self.assertNotIn("### 2. <编号项标题>", content)
        self.assertEqual([], validate_cmd.collect_errors(content))

    def test_runctl_move_step_reorders_existing_item(self) -> None:
        with tempfile.TemporaryDirectory() as tmpdir:
            runbook_path = Path(tmpdir) / "authority.md"
            runbook_path.write_text(self.template_text, encoding="utf-8")

            add_result = subprocess.run(
                [
                    sys.executable,
                    str(RUNCTL),
                    "add-step",
                    str(runbook_path),
                    "--title",
                    "收尾检查",
                ],
                capture_output=True,
                text=True,
                check=False,
            )
            self.assertEqual(0, add_result.returncode)

            move_result = subprocess.run(
                [
                    sys.executable,
                    str(RUNCTL),
                    "move-step",
                    str(runbook_path),
                    "--item",
                    "3",
                    "--after",
                    "1",
                ],
                capture_output=True,
                text=True,
                check=False,
            )

            self.assertEqual(0, move_result.returncode)
            content = runbook_path.read_text(encoding="utf-8")

        self.assertIn("[runbook-move-step] moved item 3 after 1", move_result.stdout)
        self.assertEqual(2, content.count("### 2. 收尾检查"))
        self.assertEqual(2, content.count("### 3. <编号项标题>"))
        self.assertEqual([], validate_cmd.collect_errors(content))


if __name__ == "__main__":
    unittest.main()

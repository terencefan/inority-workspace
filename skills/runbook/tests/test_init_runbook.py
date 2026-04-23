from __future__ import annotations

import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

from test_helpers import REFERENCE_TEMPLATE, RUNCTL, load_text


class InitRunbookTests(unittest.TestCase):
    maxDiff = None

    def setUp(self) -> None:
        self.template_text = load_text(REFERENCE_TEMPLATE)

    def test_runctl_init_creates_template_file(self) -> None:
        with tempfile.TemporaryDirectory() as tmpdir:
            runbook_path = Path(tmpdir) / "authority.md"
            result = subprocess.run(
                [sys.executable, str(RUNCTL), "init", str(runbook_path)],
                capture_output=True,
                text=True,
                check=False,
            )

            self.assertEqual(0, result.returncode)
            self.assertEqual(self.template_text, runbook_path.read_text(encoding="utf-8"))
            self.assertIn("[runbook-init] created", result.stdout)

    def test_runctl_init_supports_title_substitution(self) -> None:
        with tempfile.TemporaryDirectory() as tmpdir:
            runbook_path = Path(tmpdir) / "authority.md"
            result = subprocess.run(
                [sys.executable, str(RUNCTL), "init", str(runbook_path), "--title", "Canary Bootstrap"],
                capture_output=True,
                text=True,
                check=False,
            )

            self.assertEqual(0, result.returncode)
            created = runbook_path.read_text(encoding="utf-8")
            self.assertTrue(created.startswith("# Canary Bootstrap\n"))
            self.assertNotIn("# <runbook 标题>", created)

    def test_runctl_init_refuses_overwrite_without_force(self) -> None:
        with tempfile.TemporaryDirectory() as tmpdir:
            runbook_path = Path(tmpdir) / "authority.md"
            runbook_path.write_text("existing\n", encoding="utf-8")
            result = subprocess.run(
                [sys.executable, str(RUNCTL), "init", str(runbook_path)],
                capture_output=True,
                text=True,
                check=False,
            )

            self.assertEqual(1, result.returncode)
            self.assertEqual("existing\n", runbook_path.read_text(encoding="utf-8"))
            self.assertIn("target file already exists", result.stderr)

    def test_runctl_init_force_overwrites_existing_file(self) -> None:
        with tempfile.TemporaryDirectory() as tmpdir:
            runbook_path = Path(tmpdir) / "authority.md"
            runbook_path.write_text("existing\n", encoding="utf-8")
            result = subprocess.run(
                [
                    sys.executable,
                    str(RUNCTL),
                    "init",
                    str(runbook_path),
                    "--title",
                    "Fresh Runbook",
                    "--force",
                ],
                capture_output=True,
                text=True,
                check=False,
            )

            self.assertEqual(0, result.returncode)
            self.assertTrue(runbook_path.read_text(encoding="utf-8").startswith("# Fresh Runbook\n"))
            self.assertIn("[runbook-init] overwrote", result.stdout)


if __name__ == "__main__":
    unittest.main()

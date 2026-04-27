from __future__ import annotations

import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

from test_helpers import REFERENCE_TEMPLATE, RUNCTL, load_text

sys.path.insert(0, str(RUNCTL.parent))

import commands.init as init_cmd


class InitRunbookTests(unittest.TestCase):
    maxDiff = None

    def setUp(self) -> None:
        self.template_text = load_text(REFERENCE_TEMPLATE)

    def test_runctl_init_creates_template_file(self) -> None:
        with tempfile.TemporaryDirectory() as tmpdir:
            runbook_path = Path(tmpdir) / "authority-runbook.md"
            result = subprocess.run(
                [sys.executable, str(RUNCTL), "init", str(runbook_path)],
                capture_output=True,
                text=True,
                check=False,
            )

            self.assertEqual(0, result.returncode)
            created = runbook_path.read_text(encoding="utf-8")

        self.assertNotEqual(self.template_text, created)
        self.assertEqual(init_cmd.SKELETON_TEMPLATE, created)
        self.assertIn("[runbook-init] created", result.stdout)

    def test_runctl_init_supports_title_substitution(self) -> None:
        with tempfile.TemporaryDirectory() as tmpdir:
            runbook_path = Path(tmpdir) / "authority-runbook.md"
            result = subprocess.run(
                [sys.executable, str(RUNCTL), "init", str(runbook_path), "--title", "Canary Bootstrap 执行手册"],
                capture_output=True,
                text=True,
                check=False,
            )

            self.assertEqual(0, result.returncode)
            created = runbook_path.read_text(encoding="utf-8")
            self.assertTrue(created.startswith("# Canary Bootstrap 执行手册\n"))
            self.assertNotIn("# <主题>执行手册", created)

    def test_runctl_init_refuses_overwrite_without_force(self) -> None:
        with tempfile.TemporaryDirectory() as tmpdir:
            runbook_path = Path(tmpdir) / "authority-runbook.md"
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
            runbook_path = Path(tmpdir) / "authority-runbook.md"
            runbook_path.write_text("existing\n", encoding="utf-8")
            result = subprocess.run(
                [
                    sys.executable,
                    str(RUNCTL),
                    "init",
                    str(runbook_path),
                    "--title",
                    "Fresh Runbook 执行手册",
                    "--force",
                ],
                capture_output=True,
                text=True,
                check=False,
            )

            self.assertEqual(0, result.returncode)
            self.assertTrue(runbook_path.read_text(encoding="utf-8").startswith("# Fresh Runbook 执行手册\n"))
            self.assertIn("[runbook-init] overwrote", result.stdout)

    def test_runctl_init_rejects_non_runbook_filename(self) -> None:
        with tempfile.TemporaryDirectory() as tmpdir:
            runbook_path = Path(tmpdir) / "authority.md"
            result = subprocess.run(
                [sys.executable, str(RUNCTL), "init", str(runbook_path)],
                capture_output=True,
                text=True,
                check=False,
            )

        self.assertEqual(1, result.returncode)
        self.assertIn("must end with -runbook.md", result.stderr)

    def test_runctl_init_rejects_title_without_required_suffix(self) -> None:
        with tempfile.TemporaryDirectory() as tmpdir:
            runbook_path = Path(tmpdir) / "authority-runbook.md"
            result = subprocess.run(
                [sys.executable, str(RUNCTL), "init", str(runbook_path), "--title", "Canary Bootstrap"],
                capture_output=True,
                text=True,
                check=False,
            )

        self.assertEqual(1, result.returncode)
        self.assertIn("must end with 执行手册", result.stderr)


if __name__ == "__main__":
    unittest.main()

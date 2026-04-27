from __future__ import annotations

import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

from test_helpers import REFERENCE_TEMPLATE, RUNCTL, load_text

sys.path.insert(0, str(RUNCTL.parent))

import commands.validator_client as validate_cmd


class SyncRecordsTests(unittest.TestCase):
    maxDiff = None

    def setUp(self) -> None:
        self.template_text = load_text(REFERENCE_TEMPLATE)

    def test_runctl_sync_records_rebuilds_record_titles_from_plan(self) -> None:
        mutated = self.template_text.replace("### 🔴 2. <编号项标题>", "### 🔴 2. 新的执行步骤", 1)
        mutated = mutated.replace("### 🔴 2. <编号项标题>", "### 🔴 2. 老的记录标题", 1)

        with tempfile.TemporaryDirectory() as tmpdir:
            runbook_path = Path(tmpdir) / "authority-runbook.md"
            runbook_path.write_text(mutated, encoding="utf-8")
            result = subprocess.run(
                [sys.executable, str(RUNCTL), "sync-records", str(runbook_path)],
                capture_output=True,
                text=True,
                check=False,
            )

            self.assertEqual(0, result.returncode)
            content = runbook_path.read_text(encoding="utf-8")

        self.assertIn("[runbook-sync-records] synchronized records", result.stdout)
        self.assertEqual(2, content.count("### 🔴 2. 新的执行步骤"))
        self.assertNotIn("### 🔴 2. 老的记录标题", content)
        self.assertIn("<a id=\"item-2-execution-record\"></a>", content)
        self.assertEqual([], validate_cmd.collect_errors(content))


if __name__ == "__main__":
    unittest.main()

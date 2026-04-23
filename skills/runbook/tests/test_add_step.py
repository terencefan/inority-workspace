from __future__ import annotations

import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

from test_helpers import REFERENCE_TEMPLATE, RUNCTL, load_text

sys.path.insert(0, str(RUNCTL.parent))

import commands.validate as validate_cmd


class AddStepTests(unittest.TestCase):
    maxDiff = None

    def setUp(self) -> None:
        self.template_text = load_text(REFERENCE_TEMPLATE)

    def test_runctl_add_step_inserts_plan_and_record_blocks(self) -> None:
        with tempfile.TemporaryDirectory() as tmpdir:
            runbook_path = Path(tmpdir) / "authority.md"
            runbook_path.write_text(self.template_text, encoding="utf-8")
            result = subprocess.run(
                [
                    sys.executable,
                    str(RUNCTL),
                    "add-step",
                    str(runbook_path),
                    "--title",
                    "检查镜像缓存",
                    "--after",
                    "1",
                ],
                capture_output=True,
                text=True,
                check=False,
            )

            self.assertEqual(0, result.returncode)
            content = runbook_path.read_text(encoding="utf-8")

        self.assertIn("[runbook-add-step] inserted 检查镜像缓存", result.stdout)
        self.assertEqual(2, content.count("### 2. 检查镜像缓存"))
        self.assertEqual(2, content.count("### 3. <编号项标题>"))
        self.assertIn("[跳转到执行记录](#item-2-execution-record)", content)
        self.assertIn("<a id=\"item-2-execution-record\"></a>", content)
        self.assertEqual([], validate_cmd.collect_errors(content))

    def test_runctl_add_step_appends_by_default(self) -> None:
        with tempfile.TemporaryDirectory() as tmpdir:
            runbook_path = Path(tmpdir) / "authority.md"
            runbook_path.write_text(self.template_text, encoding="utf-8")
            result = subprocess.run(
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

            self.assertEqual(0, result.returncode)
            content = runbook_path.read_text(encoding="utf-8")

        self.assertEqual(2, content.count("### 3. 收尾检查"))
        self.assertEqual([], validate_cmd.collect_errors(content))


if __name__ == "__main__":
    unittest.main()

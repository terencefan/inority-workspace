from __future__ import annotations

import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

from test_helpers import REFERENCE_TEMPLATE, RUNCTL, load_text

sys.path.insert(0, str(RUNCTL.parent))

import commands.validate as validate_cmd


class AddQaTests(unittest.TestCase):
    maxDiff = None

    def setUp(self) -> None:
        self.template_text = load_text(REFERENCE_TEMPLATE)

    def test_runctl_add_qa_appends_structured_interview_entry(self) -> None:
        with tempfile.TemporaryDirectory() as tmpdir:
            runbook_path = Path(tmpdir) / "authority.md"
            runbook_path.write_text(self.template_text, encoding="utf-8")
            result = subprocess.run(
                [
                    sys.executable,
                    str(RUNCTL),
                    "add-qa",
                    str(runbook_path),
                    "--question",
                    "是否要求只读侦察先行",
                    "--answer",
                    "需要先冻结现场再规划",
                    "--impact",
                    "后续 authority 保持先 freeze 再落执行路径",
                ],
                capture_output=True,
                text=True,
                check=False,
            )

            self.assertEqual(0, result.returncode)
            content = runbook_path.read_text(encoding="utf-8")

        self.assertIn("[runbook-add-qa] appended QA", result.stdout)
        self.assertIn("### 6. <问题主题>", content)
        self.assertIn("> Q：是否要求只读侦察先行", content)
        self.assertIn("> A：需要先冻结现场再规划", content)
        self.assertIn("- 后续 authority 保持先 freeze 再落执行路径", content)
        self.assertEqual([], validate_cmd.collect_errors(content))


if __name__ == "__main__":
    unittest.main()

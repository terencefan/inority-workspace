from __future__ import annotations

import subprocess
import sys
import tempfile
import unittest
import re
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
        self.assertIn("### Q：是否要求只读侦察先行", content)
        self.assertIn("> A：需要先冻结现场再规划", content)
        self.assertRegex(
            content,
            r"访谈时间：\d{4}-\d{2}-\d{2} \d{2}:\d{2} .+\n\n后续 authority 保持先 freeze 再落执行路径",
        )
        self.assertIn("后续 authority 保持先 freeze 再落执行路径", content)
        self.assertEqual([], validate_cmd.collect_errors(content))

    def test_runctl_add_qa_supports_explicit_interview_time(self) -> None:
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
                    "是否需要记录提问时间",
                    "--answer",
                    "需要，方便回看规划上下文",
                    "--time",
                    "2026-04-23 14:30 CST",
                    "--impact",
                    "后续复盘可以对齐当时的现场状态",
                ],
                capture_output=True,
                text=True,
                check=False,
            )

            self.assertEqual(0, result.returncode)
            content = runbook_path.read_text(encoding="utf-8")

        self.assertIn("访谈时间：2026-04-23 14:30 CST", content)
        self.assertIn("访谈时间：2026-04-23 14:30 CST\n\n后续复盘可以对齐当时的现场状态", content)
        self.assertEqual([], validate_cmd.collect_errors(content))

    def test_runctl_add_qa_supports_blank_init_output(self) -> None:
        with tempfile.TemporaryDirectory() as tmpdir:
            runbook_path = Path(tmpdir) / "authority.md"
            init_result = subprocess.run(
                [sys.executable, str(RUNCTL), "init", str(runbook_path)],
                capture_output=True,
                text=True,
                check=False,
            )
            self.assertEqual(0, init_result.returncode)

            result = subprocess.run(
                [
                    sys.executable,
                    str(RUNCTL),
                    "add-qa",
                    str(runbook_path),
                    "--question",
                    "是否先冻结现场",
                    "--answer",
                    "是，先冻结再继续规划",
                    "--impact",
                    "后续执行路径先补 freeze item",
                ],
                capture_output=True,
                text=True,
                check=False,
            )

            self.assertEqual(0, result.returncode)
            content = runbook_path.read_text(encoding="utf-8")

        self.assertIn("### Q：是否先冻结现场", content)
        self.assertIn("> A：是，先冻结再继续规划", content)
        self.assertEqual([], validate_cmd.filter_incremental_draft_errors(validate_cmd.collect_errors(content)))


if __name__ == "__main__":
    unittest.main()

from __future__ import annotations

import unittest


@unittest.skip("runbook validator coverage moved to MJS; use `npm run runbook:test`.")
class LegacyRunbookValidatorTest(unittest.TestCase):
    def test_migrated_to_mjs(self) -> None:
        self.fail("legacy Python validator tests should stay skipped")

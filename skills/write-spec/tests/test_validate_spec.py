from __future__ import annotations

import unittest


@unittest.skip("write-spec validator coverage moved to MJS; run the MJS test entrypoint instead.")
class LegacyWriteSpecValidatorTest(unittest.TestCase):
    def test_migrated_to_mjs(self) -> None:
        self.fail("legacy Python validator tests should stay skipped")

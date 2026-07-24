import unittest
from egglands.content import build_content_manifest


class ContentTests(unittest.TestCase):
    def test_manifest(self):
        manifest = build_content_manifest()
        self.assertEqual(manifest["project_version"], "0.27")
        self.assertEqual(manifest["schema_version"], 4)
        self.assertEqual(set(manifest["races"]), {"human", "tiefling", "khajit"})
        self.assertEqual(set(manifest["classes"]), {"warrior", "mage", "noble"})
        self.assertIn("bread", manifest["items"])
        self.assertIn("bake_bread", manifest["recipes"])


if __name__ == "__main__":
    unittest.main()

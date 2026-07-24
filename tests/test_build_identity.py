from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "artifacts" / "previews" / "the-egg-lands-v0.27-trade-ally-escort-preview.html"


class BuildIdentityTests(unittest.TestCase):
    def test_build_markers(self):
        self.assertTrue(OUTPUT.is_file())
        text = OUTPUT.read_text(encoding="utf-8")
        self.assertIn("The Egg Lands v0.27", text)
        self.assertIn("V024_PATCH", text)
        self.assertIn("V025_PATCH", text)
        self.assertIn("V026_PATCH", text)
        self.assertIn("V027_PATCH", text)
        self.assertIn("__egglandsEconomyV026", text)
        self.assertIn("__egglandsAlliesV027", text)
        self.assertIn("Invite to escort", text)
        self.assertIn("escortActiveV027", text)
        self.assertIn("Living Economy", text)
        self.assertIn("Direct Trade", text)
        self.assertIn("/api/v1/economy/live/sync", text)
        self.assertIn("/api/v1/economy/live/trade", text)
        self.assertIn("development_score", text)
        self.assertIn("empire_market", text)
        self.assertIn("__egglandsAudioV025", text)
        self.assertIn("data:audio/wav;base64,", text)
        self.assertNotIn("F10 opens", text)


if __name__ == "__main__":
    unittest.main()

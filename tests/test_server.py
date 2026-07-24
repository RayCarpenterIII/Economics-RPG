import unittest
from egglands.server.app import health_payload


class ServerTests(unittest.TestCase):
    def test_health(self):
        payload = health_payload()
        self.assertEqual(payload["phase"], 3)
        self.assertEqual(payload["project_version"], "0.27")
        self.assertTrue(payload["python_economy"])
        self.assertTrue(payload["live_bridge"])
        self.assertTrue(payload["shadow_economy"])
        self.assertEqual(payload["bridge_mode"], "python-authoritative-town-economy")
        self.assertTrue(payload["authoritative_town_prices"])
        self.assertTrue(payload["authoritative_town_inventory"])
        self.assertTrue(payload["python_production"])
        self.assertTrue(payload["python_employment"])
        self.assertTrue(payload["python_wages"])
        self.assertTrue(payload["python_consumption"])
        self.assertTrue(payload["villager_trade"])
        self.assertTrue(payload["development_gated_markets"])
        self.assertTrue(payload["empire_internal_market_foundation"])
        self.assertTrue(payload["byte_backed_audio"])
        self.assertGreaterEqual(payload["audio_clip_count"], 10)
        self.assertGreater(payload["audio_bytes"], 100_000)


if __name__ == "__main__":
    unittest.main()

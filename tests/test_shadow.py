from __future__ import annotations

import unittest

from egglands.economy.shadow import ShadowEconomyStore
from egglands.simulation.bridge import BrowserGameState
from egglands.simulation.protocol import PROTOCOL_VERSION


def payload(sequence: int = 1, stock: float = 10.0) -> dict:
    return {
        "protocol_version": PROTOCOL_VERSION,
        "client_version": "0.27",
        "session_id": "shadow-session",
        "sequence": sequence,
        "captured_at_ms": 10,
        "game": {
            "scene": "world",
            "selected_class": "noble",
            "agent_count": 100,
            "town_name": "EGG LANDS",
            "world_day": 2,
        },
        "player": {"name": "Tester", "race": "khajit"},
        "raptors": {"count": 1, "tamed_count": 1},
        "economy": {
            "town_population": 100,
            "town_building_count": 8,
            "market_inventory": {"grain": stock, "cloth": 500},
            "market_prices": {"grain": 1.0, "cloth": 2.0},
            "material_stock": {"stone": 12},
            "material_prices": {"stone": 1.2},
        },
    }


class ShadowEconomyTests(unittest.TestCase):
    def test_shadow_report_is_read_only_and_deterministic(self):
        state = BrowserGameState.from_payload(payload())
        store = ShadowEconomyStore()
        report = store.ingest(state)
        self.assertEqual(report.mode, "shadow-read-only")
        self.assertEqual(report.version, "0.27")
        self.assertGreater(report.shortage_count, 0)
        self.assertEqual(report.items["grain"].signal, "raise")
        self.assertEqual(report.items["cloth"].signal, "lower")
        self.assertFalse(store.status()["authoritative"])

    def test_stock_delta_is_tracked_by_session(self):
        store = ShadowEconomyStore()
        store.ingest(BrowserGameState.from_payload(payload(1, 10)))
        report = store.ingest(BrowserGameState.from_payload(payload(2, 15)))
        self.assertEqual(report.items["grain"].stock_delta, 5.0)
        self.assertEqual(report.packet_count, 2)

    def test_reset_clears_sessions(self):
        store = ShadowEconomyStore()
        store.ingest(BrowserGameState.from_payload(payload()))
        store.reset()
        self.assertEqual(store.status()["status"], "waiting")


if __name__ == "__main__":
    unittest.main()

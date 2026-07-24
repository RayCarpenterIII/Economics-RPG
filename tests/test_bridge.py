from __future__ import annotations
import unittest

from egglands.simulation.bridge import BridgeStore, BridgeValidationError
from egglands.simulation.protocol import PROTOCOL_VERSION


def payload(sequence: int = 1, session_id: str = "test-session") -> dict:
    return {
        "protocol_version": PROTOCOL_VERSION,
        "client_version": "0.27",
        "session_id": session_id,
        "sequence": sequence,
        "captured_at_ms": 10,
        "game": {"scene": "world", "selected_class": "mage", "agent_count": 8},
        "player": {"name": "Tester", "race": "khajit", "health": 9, "max_health": 10},
        "raptors": {"count": 2, "tamed_count": 1},
        "economy": {
            "town_population": 8,
            "market_inventory": {"grain": 20},
            "market_prices": {"grain": 1.2},
        },
    }


class BridgeTests(unittest.TestCase):
    def test_ingest_and_status(self):
        store = BridgeStore()
        state = store.ingest(payload(), "127.0.0.1")
        self.assertEqual(state.player_name, "Tester")
        self.assertEqual(state.market_inventory["grain"], 20.0)
        status = store.status()
        self.assertTrue(status["connected"])
        self.assertEqual(status["received_count"], 1)
        self.assertEqual(status["session_count"], 1)

    def test_sequence_cannot_move_backwards_in_same_session(self):
        store = BridgeStore()
        store.ingest(payload(5))
        with self.assertRaises(BridgeValidationError):
            store.ingest(payload(4))

    def test_new_session_can_restart_sequence(self):
        store = BridgeStore()
        store.ingest(payload(9, "a"))
        store.ingest(payload(1, "b"))
        self.assertEqual(store.status()["session_count"], 2)

    def test_protocol_is_validated(self):
        value = payload()
        value["protocol_version"] = 999
        with self.assertRaises(BridgeValidationError):
            BridgeStore().ingest(value)


if __name__ == "__main__":
    unittest.main()

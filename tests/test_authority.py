from __future__ import annotations

import unittest

from egglands.economy.authority import MAX_PRICE_STEP_PERCENT, MarketAuthorityStore
from egglands.economy.shadow import ShadowEconomyStore
from egglands.simulation.bridge import BrowserGameState
from egglands.simulation.protocol import PROTOCOL_VERSION


def payload(sequence: int = 1) -> dict:
    return {
        "protocol_version": PROTOCOL_VERSION,
        "client_version": "0.27",
        "session_id": "authority-session",
        "sequence": sequence,
        "captured_at_ms": 10,
        "game": {"scene": "world", "town_name": "EGG LANDS", "agent_count": 100, "world_day": 2},
        "player": {"name": "Tester", "race": "khajit"},
        "raptors": {"count": 1, "tamed_count": 1},
        "economy": {
            "town_population": 100,
            "market_inventory": {"fish": 1, "grain": 500},
            "market_prices": {"fish": 1.0, "grain": 1.0},
            "material_stock": {"stone": 12},
            "material_prices": {"stone": 1.2},
        },
    }


class AuthorityTests(unittest.TestCase):
    def test_proposal_is_manual_and_bounded(self):
        state = BrowserGameState.from_payload(payload())
        shadow = ShadowEconomyStore().ingest(state)
        proposal = MarketAuthorityStore().propose(state, shadow)
        self.assertTrue(proposal.requires_manual_apply)
        self.assertFalse(proposal.save_persistent)
        self.assertIn("fish", proposal.changes)
        self.assertLessEqual(abs(proposal.changes["fish"].step_percent), MAX_PRICE_STEP_PERCENT)
        self.assertNotIn("stone", proposal.changes)

    def test_application_is_recorded_and_validated(self):
        state = BrowserGameState.from_payload(payload())
        shadow = ShadowEconomyStore().ingest(state)
        store = MarketAuthorityStore()
        proposal = store.propose(state, shadow)
        change = proposal.changes["fish"]
        result = store.record_application(
            {
                "proposal_id": proposal.proposal_id,
                "session_id": proposal.session_id,
                "town_name": proposal.town_name,
                "source": "python",
                "changes": {"fish": {"before": change.observed_price, "after": change.proposed_price}},
            }
        )
        self.assertFalse(result.undone)
        self.assertEqual(store.status()["application_count"], 1)

    def test_oversized_application_is_rejected(self):
        state = BrowserGameState.from_payload(payload())
        shadow = ShadowEconomyStore().ingest(state)
        store = MarketAuthorityStore()
        proposal = store.propose(state, shadow)
        with self.assertRaises(ValueError):
            store.record_application(
                {
                    "proposal_id": proposal.proposal_id,
                    "session_id": proposal.session_id,
                    "town_name": proposal.town_name,
                    "changes": {"fish": {"before": 1.0, "after": 2.0}},
                }
            )


if __name__ == "__main__":
    unittest.main()

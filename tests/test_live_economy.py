from __future__ import annotations
import unittest

from egglands.economy.live import (
    EMPIRE_MARKET_TERRITORY_THRESHOLD,
    LiveTownEconomyStore,
)


def town_payload(
    *,
    session_id: str = "live-test",
    sequence: int = 1,
    world_day: float = 1.0,
    name: str = "Eggford",
    population: int = 30,
    buildings: int = 1,
    fish: float = 2.0,
) -> dict:
    return {
        "session_id": session_id,
        "sequence": sequence,
        "world_day": world_day,
        "towns": [
            {
                "town_name": name,
                "population": population,
                "building_count": buildings,
                "world_day": world_day,
                "market_inventory": {"fish": fish, "grain": 100, "ore": 5, "cloth": 1},
                "market_prices": {"fish": 1.0, "grain": 0.8, "ore": 1.5, "cloth": 2.0},
                "villagers": [
                    {"id": "mira", "name": "Mira", "activity": "fishing at the shore", "wealth": 60}
                ],
            }
        ],
    }


class LiveEconomyTests(unittest.TestCase):
    def test_prices_inventory_and_flows_are_python_authoritative(self):
        store = LiveTownEconomyStore()
        first = store.sync(town_payload())
        initial = first["towns"]["Eggford"]
        second_payload = town_payload(sequence=2, world_day=2)
        second = store.sync(second_payload)["towns"]["Eggford"]
        self.assertTrue(second["item_flows"]["fish"]["produced_last_step"] > 0)
        self.assertTrue(second["item_flows"]["fish"]["consumed_last_step"] > 0)
        self.assertNotEqual(second["market_inventory"]["fish"], initial["market_inventory"]["fish"])
        self.assertNotEqual(second["market_prices"]["fish"], initial["market_prices"]["fish"])
        self.assertGreater(second["employed_population"], 0)
        self.assertGreater(second["average_daily_wage"], 0)
        self.assertGreater(second["payroll_last_step"], 0)
        self.assertGreater(second["consumption_spending_last_step"], 0)

    def test_shortage_raises_price_and_surplus_can_lower_price(self):
        scarce_store = LiveTownEconomyStore()
        scarce_store.sync(town_payload(fish=0.1))
        scarce = scarce_store.sync(town_payload(sequence=2, world_day=3, fish=0.1))["towns"]["Eggford"]
        surplus_store = LiveTownEconomyStore()
        surplus_store.sync(town_payload(fish=500))
        surplus = surplus_store.sync(town_payload(sequence=2, world_day=3, fish=500))["towns"]["Eggford"]
        self.assertGreater(scarce["market_prices"]["fish"], surplus["market_prices"]["fish"])

    def test_market_is_development_gated(self):
        store = LiveTownEconomyStore()
        village = store.sync(town_payload(population=18, buildings=1))["towns"]["Eggford"]
        self.assertFalse(village["market_available"])
        self.assertEqual(village["trade_mode"], "villagers")
        developed = store.sync(town_payload(sequence=2, population=90, buildings=5))["towns"]["Eggford"]
        self.assertTrue(developed["market_available"])
        self.assertEqual(developed["trade_mode"], "town_market")

    def test_villager_demand_and_trade_relationship(self):
        store = LiveTownEconomyStore()
        store.sync(town_payload())
        villager = {"id": "mira", "name": "Mira", "activity": "fishing at the shore", "wealth": 60}
        profile = store.villager_profile("live-test", "Eggford", villager)
        self.assertTrue(profile["wants"])
        self.assertTrue(profile["offers"])
        offered = profile["offers"][0]
        result = store.trade(
            {
                "session_id": "live-test",
                "town_name": "Eggford",
                "villager": villager,
                "side": "buy",
                "item_id": offered["item_id"],
                "quantity": 1,
                "player_gold": 100,
                "player_inventory": {},
            }
        )
        self.assertLess(result["player_delta"]["gold"], 0)
        self.assertEqual(result["player_delta"]["items"][offered["item_id"]], 1.0)
        self.assertEqual(result["villager"]["trade_count"], 1)
        self.assertGreater(result["villager"]["trust"], 0)

    def test_repeated_trade_can_create_protection_ally(self):
        store = LiveTownEconomyStore()
        store.sync(town_payload())
        villager = {"id": "mira", "name": "Mira", "activity": "fishing at the shore", "wealth": 200}
        for _ in range(8):
            profile = store.villager_profile("live-test", "Eggford", villager)
            want = profile["wants"][0]
            store.trade(
                {
                    "session_id": "live-test",
                    "town_name": "Eggford",
                    "villager": villager,
                    "side": "sell",
                    "item_id": want["item_id"],
                    "quantity": 1,
                    "player_gold": 0,
                    "player_inventory": {want["item_id"]: 100},
                }
            )
        profile = store.villager_profile("live-test", "Eggford", villager)
        self.assertGreaterEqual(profile["trade_count"], 8)
        self.assertGreater(profile["protection_score"], 0)

    def test_processed_goods_require_real_inputs(self):
        store = LiveTownEconomyStore()
        payload = town_payload(population=60, buildings=5)
        payload["towns"][0]["market_inventory"] = {"tools": 0}
        payload["towns"][0]["market_prices"] = {"tools": 4.8}
        store.sync(payload)
        no_inputs = store.sync({**payload, "sequence": 2, "world_day": 2, "towns": [{**payload["towns"][0], "world_day": 2}]})["towns"]["Eggford"]
        self.assertEqual(no_inputs["item_flows"]["tools"]["produced_last_step"], 0)
        supplied = {**payload["towns"][0], "world_day": 3, "market_inventory": {"grain": 100, "flour": 20, "bread": 0, "ore": 100, "logs": 100, "tools": 0}}
        with_inputs = store.sync({"session_id": "live-test", "sequence": 3, "world_day": 3, "towns": [supplied]})["towns"]["Eggford"]
        self.assertGreater(with_inputs["item_flows"]["tools"]["produced_last_step"], 0)
        self.assertGreater(with_inputs["item_flows"]["ore"]["intermediate_consumed_last_step"], 0)
        self.assertGreater(with_inputs["item_flows"]["logs"]["intermediate_consumed_last_step"], 0)

    def test_empire_trade_unlocks_after_threshold(self):
        store = LiveTownEconomyStore()
        payload = town_payload(population=20, buildings=0)
        payload["towns"] = []
        for index in range(EMPIRE_MARKET_TERRITORY_THRESHOLD):
            payload["towns"].append(
                {
                    "town_name": f"Town {index}",
                    "population": 20,
                    "building_count": 0,
                    "world_day": 1,
                    "market_inventory": {"fish": 2 + index, "grain": 20},
                    "market_prices": {"fish": 1.0 + index, "grain": 0.8},
                }
            )
        state = store.sync(payload)
        for index in range(EMPIRE_MARKET_TERRITORY_THRESHOLD):
            state = store.set_control(
                {"session_id": "live-test", "town_name": f"Town {index}", "control": "conquered"}
            )
        self.assertTrue(state["empire_trade_unlocked"])
        for town in state["towns"].values():
            self.assertEqual(town["trade_mode"], "empire_market")
            self.assertTrue(town["market_available"])


if __name__ == "__main__":
    unittest.main()

from __future__ import annotations
import unittest
from egglands.economy import EconomyConfig, run_economy_scenario

class EconomyTests(unittest.TestCase):
 def test_deterministic_and_invariants(self):
  c=EconomyConfig(population=120,days=45,seed=7)
  a=run_economy_scenario(c); b=run_economy_scenario(c)
  self.assertEqual(a.final_inventory,b.final_inventory)
  self.assertEqual(a.final_prices_cents,b.final_prices_cents)
  self.assertTrue(all(a.invariants.values()))
  self.assertEqual(a.utility_matrix_shape,[120,6] if isinstance(a.utility_matrix_shape,list) else (120,6))
 def test_population_bounds(self):
  with self.assertRaises(ValueError): run_economy_scenario(EconomyConfig(population=5))
if __name__=='__main__': unittest.main()

# Living Economy v0.27

## Price formation

Each item tracks inventory, demand per day, production per day, unmet demand, and stock-coverage days. The target is eight days of inventory. Prices move toward a scarcity price:

- Low coverage and unmet demand raise prices.
- High coverage and excess supply lower prices.
- Labor cost supplies a price floor.
- Price adjustment is gradual rather than instantaneous.

## Production and jobs

Working-age population is allocated toward scarce and valuable outputs. Buildings improve productive capacity. Employment, unemployment, average wages, payroll, household wealth, consumption spending, and town treasury are stored per town.

Processed goods consume real inventory:

- 4 grain → 3 flour
- 2 flour → 3 bread
- 3 ore + 1 timber → 1 tool
- 1 hide or monster part → 2 cloth

Missing inputs reduce output and worker pay utilization instead of generating free goods.

## Market institutions

A settlement's development score depends on population, buildings, merchant activity, and trade volume.

- Low development: no formal market; trade directly with villagers.
- Higher development: a town market opens.
- Three conquered territories: an internal empire market pools inventory and partially converges prices.

## Villager trade

Every villager exposes urgent wants, available offers, personal stock, coins, and relationship terms. A trade changes the player's actual gold/items and the villager's actual stock/coins. Repeated useful trade raises trust, affinity, gratitude, trade value, and protection willingness.

The willingness flag is implemented and saved. Autonomous escort and combat behavior for trade allies is deferred.

## Authority boundary

In a full local run, Python is authoritative for town prices, inventory, production, jobs, wages, and consumption. In standalone HTML mode, a reduced browser implementation preserves playability without a server.

# Web client boundary — v0.27

The browser remains the renderer and player-control client. In the full local run, Python is authoritative for town inventory, prices, production, employment, wages, and consumption.

Trade routes:

- Underdeveloped settlements use direct villager trade.
- Developed settlements expose a formal town market.
- Three conquered territories unlock a pooled internal empire market.

The standalone HTML uses a smaller demand-driven fallback so the game remains playable without Python. The v0.25 embedded PCM raptor audio remains intact.

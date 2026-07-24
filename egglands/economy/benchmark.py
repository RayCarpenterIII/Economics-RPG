"""Command-line benchmark for the Phase 2 economy."""

from __future__ import annotations

import argparse
import json
from pathlib import Path

from .engine import EconomyConfig, run_economy_scenario


def main() -> None:
    parser = argparse.ArgumentParser(description="Run The Egg Lands v0.27 economy benchmark.")
    parser.add_argument("--population", type=int, default=1_000)
    parser.add_argument("--days", type=int, default=365)
    parser.add_argument("--seed", type=int, default=20_260_724)
    parser.add_argument("--output", type=Path)
    args = parser.parse_args()

    result = run_economy_scenario(EconomyConfig(args.population, args.days, args.seed))
    payload = result.to_dict()
    text = json.dumps(payload, indent=2, sort_keys=True)
    if args.output:
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text(text + "\n", encoding="utf-8")
        print(f"Wrote benchmark: {args.output}")
    print(text)


if __name__ == "__main__":
    main()

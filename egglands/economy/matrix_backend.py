"""Small matrix backend used for batched citizen utility scoring.

NumPy is used when available. A deterministic pure-Python implementation keeps
Phase 2 runnable on a clean Python installation.
"""

from __future__ import annotations

from collections.abc import Sequence

try:  # NumPy is optional during Phase 2.
    import numpy as np
except ImportError:  # pragma: no cover - exercised on installations without NumPy
    np = None


def backend_name() -> str:
    return "numpy" if np is not None else "python"


def matmul(
    features: Sequence[Sequence[float]],
    weights: Sequence[Sequence[float]],
) -> list[list[float]]:
    """Return features @ weights as ordinary Python lists."""

    if not features:
        return []
    if np is not None:
        left = np.asarray(features, dtype=np.float32)
        right = np.asarray(weights, dtype=np.float32)
        if left.ndim != 2 or right.ndim != 2 or left.shape[1] != right.shape[0]:
            raise ValueError("Matrix dimensions do not align")
        return (left @ right).tolist()

    inner = len(features[0])
    if len(weights) != inner:
        raise ValueError("Matrix dimensions do not align")
    columns = len(weights[0]) if weights else 0
    if any(len(row) != inner for row in features):
        raise ValueError("Feature matrix is ragged")
    if any(len(row) != columns for row in weights):
        raise ValueError("Weight matrix is ragged")

    result: list[list[float]] = []
    for feature_row in features:
        result.append(
            [
                sum(feature_row[k] * weights[k][column] for k in range(inner))
                for column in range(columns)
            ]
        )
    return result

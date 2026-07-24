"""Versioned command, snapshot, and browser-bridge envelopes."""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

PROTOCOL_VERSION = 6


@dataclass(slots=True)
class CommandEnvelope:
    command: str
    sequence: int
    payload: dict[str, Any] = field(default_factory=dict)
    protocol_version: int = PROTOCOL_VERSION


@dataclass(slots=True)
class SnapshotEnvelope:
    tick: int
    sequence: int
    payload: dict[str, Any] = field(default_factory=dict)
    protocol_version: int = PROTOCOL_VERSION


@dataclass(slots=True)
class EconomySnapshotEnvelope:
    day: int
    payload: dict[str, Any] = field(default_factory=dict)
    protocol_version: int = PROTOCOL_VERSION
    subsystem: str = "economy"


@dataclass(slots=True)
class BrowserStateEnvelope:
    session_id: str
    sequence: int
    captured_at_ms: int
    game: dict[str, Any] = field(default_factory=dict)
    player: dict[str, Any] = field(default_factory=dict)
    raptors: dict[str, Any] = field(default_factory=dict)
    economy: dict[str, Any] = field(default_factory=dict)
    client_version: str = "0.27"
    protocol_version: int = PROTOCOL_VERSION

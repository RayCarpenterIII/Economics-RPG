"""Generate deterministic byte-backed raptor sound effects for The Egg Lands v0.25."""
from __future__ import annotations

import json
import math
import random
import struct
import wave
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "assets" / "audio" / "raptor"
MANIFEST = OUT / "manifest.json"
SAMPLE_RATE = 22_050


def clamp(value: float) -> float:
    return max(-1.0, min(1.0, value))


def write_wav(path: Path, samples: list[float]) -> dict:
    path.parent.mkdir(parents=True, exist_ok=True)
    peak = max((abs(x) for x in samples), default=0.0)
    scale = 0.92 / peak if peak > 0.92 else 1.0
    pcm = bytearray()
    for sample in samples:
        pcm.extend(struct.pack("<h", int(clamp(sample * scale) * 32767)))
    with wave.open(str(path), "wb") as handle:
        handle.setnchannels(1)
        handle.setsampwidth(2)
        handle.setframerate(SAMPLE_RATE)
        handle.writeframes(pcm)
    return {
        "file": path.name,
        "bytes": path.stat().st_size,
        "duration_seconds": round(len(samples) / SAMPLE_RATE, 4),
        "sample_rate": SAMPLE_RATE,
        "channels": 1,
        "peak": round(min(1.0, peak * scale), 5),
    }


def one_pole_lowpass(values: list[float], cutoff_hz: float) -> list[float]:
    alpha = 1.0 - math.exp(-2.0 * math.pi * cutoff_hz / SAMPLE_RATE)
    out: list[float] = []
    state = 0.0
    for value in values:
        state += alpha * (value - state)
        out.append(state)
    return out


def one_pole_highpass(values: list[float], cutoff_hz: float) -> list[float]:
    low = one_pole_lowpass(values, cutoff_hz)
    return [value - base for value, base in zip(values, low)]


def bite_hit(seed: int, low_start: float, snap_hz: float, wetness: float) -> list[float]:
    rng = random.Random(seed)
    duration = 0.29
    count = int(duration * SAMPLE_RATE)
    raw = [rng.uniform(-1.0, 1.0) for _ in range(count)]
    grit = one_pole_highpass(one_pole_lowpass(raw, 3200 + wetness * 1300), 180 + wetness * 80)
    samples: list[float] = []
    phase_low = 0.0
    phase_snap = 0.0
    for i in range(count):
        t = i / SAMPLE_RATE
        p = t / duration
        low_freq = max(42.0, low_start * math.exp(-10.0 * t))
        snap_freq = max(120.0, snap_hz * math.exp(-34.0 * t))
        phase_low += 2.0 * math.pi * low_freq / SAMPLE_RATE
        phase_snap += 2.0 * math.pi * snap_freq / SAMPLE_RATE
        thump = math.sin(phase_low) * math.exp(-15.0 * t) * 0.58
        jaw = (1.0 if math.sin(phase_snap) >= 0 else -1.0) * math.exp(-48.0 * t) * 0.22
        crunch_env = math.exp(-19.0 * t) * (1.0 - math.exp(-160.0 * t))
        crunch = grit[i] * crunch_env * (0.56 + wetness * 0.16)
        tooth_1 = math.exp(-((t - 0.025) / 0.004) ** 2) * rng.uniform(-0.34, 0.34)
        tooth_2 = math.exp(-((t - 0.052) / 0.006) ** 2) * rng.uniform(-0.25, 0.25)
        tail = math.sin(2.0 * math.pi * (68 + seed % 11) * t) * math.exp(-8.5 * t) * 0.12
        samples.append(thump + jaw + crunch + tooth_1 + tooth_2 + tail)
    return samples


def bite_miss(seed: int, brightness: float) -> list[float]:
    rng = random.Random(seed)
    duration = 0.19
    count = int(duration * SAMPLE_RATE)
    raw = [rng.uniform(-1.0, 1.0) for _ in range(count)]
    air = one_pole_highpass(raw, 900 + brightness * 800)
    samples: list[float] = []
    phase = 0.0
    for i in range(count):
        t = i / SAMPLE_RATE
        freq = max(180.0, (820 + brightness * 380) * math.exp(-31.0 * t))
        phase += 2.0 * math.pi * freq / SAMPLE_RATE
        snap = (1.0 if math.sin(phase) >= 0 else -1.0) * math.exp(-52.0 * t) * 0.28
        hiss = air[i] * math.exp(-24.0 * t) * 0.32
        low = math.sin(2 * math.pi * 86 * t) * math.exp(-19.0 * t) * 0.16
        samples.append(snap + hiss + low)
    return samples


def chirp(seed: int, duration: float, start_hz: float, end_hz: float, pulses: int) -> list[float]:
    rng = random.Random(seed)
    count = int(duration * SAMPLE_RATE)
    raw = [rng.uniform(-1.0, 1.0) for _ in range(count)]
    breath = one_pole_lowpass(raw, 4600)
    phase = 0.0
    samples: list[float] = []
    for i in range(count):
        t = i / SAMPLE_RATE
        p = t / duration
        freq = start_hz * ((end_hz / start_hz) ** p)
        vibrato = 1.0 + 0.025 * math.sin(2 * math.pi * 22 * t)
        phase += 2 * math.pi * freq * vibrato / SAMPLE_RATE
        pulse = max(0.0, math.sin(math.pi * pulses * p)) ** 0.7
        env = (1.0 - math.exp(-70 * t)) * math.exp(-3.8 * t) * pulse
        harmonic = math.sin(phase) * 0.42 + math.sin(phase * 2.03) * 0.14 + math.sin(phase * 3.07) * 0.06
        samples.append(harmonic * env + breath[i] * env * 0.08)
    return samples


def huff(seed: int) -> list[float]:
    rng = random.Random(seed)
    duration = 0.38
    count = int(duration * SAMPLE_RATE)
    raw = [rng.uniform(-1.0, 1.0) for _ in range(count)]
    air = one_pole_lowpass(raw, 1300)
    samples: list[float] = []
    for i in range(count):
        t = i / SAMPLE_RATE
        env = (1.0 - math.exp(-45 * t)) * math.exp(-8.0 * t)
        throat = math.sin(2 * math.pi * (82 - 24 * t) * t) * math.exp(-7.0 * t) * 0.2
        samples.append(air[i] * env * 0.55 + throat)
    return samples


def footstep(seed: int) -> list[float]:
    rng = random.Random(seed)
    duration = 0.14
    count = int(duration * SAMPLE_RATE)
    raw = one_pole_lowpass([rng.uniform(-1, 1) for _ in range(count)], 900)
    samples: list[float] = []
    for i in range(count):
        t = i / SAMPLE_RATE
        env = math.exp(-28 * t)
        thud = math.sin(2 * math.pi * (92 - 38 * t) * t) * env * 0.48
        samples.append(thud + raw[i] * env * 0.25)
    return samples


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    specs = [
        ("bite_hit_1.wav", bite_hit(101, 154, 980, 0.25), "bite_hit"),
        ("bite_hit_2.wav", bite_hit(202, 132, 820, 0.60), "bite_hit"),
        ("bite_hit_3.wav", bite_hit(303, 176, 1120, 0.42), "bite_hit"),
        ("bite_hit_4.wav", bite_hit(404, 118, 740, 0.78), "bite_hit"),
        ("bite_miss_1.wav", bite_miss(505, 0.35), "bite_miss"),
        ("bite_miss_2.wav", bite_miss(606, 0.78), "bite_miss"),
        ("mount_chirp.wav", chirp(707, 0.42, 290, 760, 2), "mount"),
        ("dismount_huff.wav", huff(808), "dismount"),
        ("idle_trill.wav", chirp(909, 0.58, 510, 360, 4), "idle"),
        ("run_step.wav", footstep(1001), "run_step"),
    ]
    entries = []
    for filename, samples, category in specs:
        entry = write_wav(OUT / filename, samples)
        entry["category"] = category
        entries.append(entry)
    manifest = {
        "version": "0.25",
        "format": "PCM WAV, mono, signed 16-bit little-endian",
        "sample_rate": SAMPLE_RATE,
        "total_audio_bytes": sum(entry["bytes"] for entry in entries),
        "clips": entries,
    }
    MANIFEST.write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(manifest, indent=2))


if __name__ == "__main__":
    main()

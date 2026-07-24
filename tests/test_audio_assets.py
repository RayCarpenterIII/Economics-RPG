from __future__ import annotations

import base64
import unittest

from egglands.audio import load_raptor_audio_library
from tools.audio_patch import build_audio_payload


class RaptorAudioAssetTests(unittest.TestCase):
    def test_audio_library_contains_real_pcm_bytes(self):
        library = load_raptor_audio_library()
        self.assertGreaterEqual(len(library.clips), 10)
        self.assertGreater(library.total_audio_bytes, 100_000)
        self.assertTrue(all(clip.is_nonempty for clip in library.clips))
        self.assertTrue(all(clip.duration_seconds >= 0.12 for clip in library.clips))
        self.assertGreaterEqual(len(library.by_category("bite_hit")), 4)
        self.assertGreaterEqual(len(library.by_category("bite_miss")), 2)

    def test_embedded_payload_decodes_to_declared_byte_lengths(self):
        payload = build_audio_payload()
        self.assertEqual(payload["clip_count"], len(payload["clips"]))
        total = 0
        for clip in payload["clips"].values():
            prefix, encoded = clip["data"].split(",", 1)
            self.assertEqual(prefix, "data:audio/wav;base64")
            raw = base64.b64decode(encoded)
            self.assertEqual(len(raw), clip["bytes"])
            self.assertEqual(raw[:4], b"RIFF")
            self.assertEqual(raw[8:12], b"WAVE")
            total += len(raw)
        self.assertEqual(total, payload["total_audio_bytes"])


if __name__ == "__main__":
    unittest.main()

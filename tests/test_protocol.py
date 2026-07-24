import unittest
from egglands.simulation.protocol import BrowserStateEnvelope, PROTOCOL_VERSION


class ProtocolTests(unittest.TestCase):
    def test_protocol_version(self):
        self.assertEqual(PROTOCOL_VERSION, 6)
        envelope = BrowserStateEnvelope("session", 1, 2)
        self.assertEqual(envelope.client_version, "0.27")
        self.assertEqual(envelope.economy, {})


if __name__ == "__main__":
    unittest.main()

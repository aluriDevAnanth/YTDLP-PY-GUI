import sys
import unittest
from pathlib import Path

from rich.logging import RichHandler

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from src.logger import get_logger


class LoggerTests(unittest.TestCase):
    def test_get_logger_configures_rich_handler(self):
        logger = get_logger("test.logger")

        self.assertEqual(logger.name, "test.logger")
        self.assertTrue(
            any(isinstance(handler, RichHandler) for handler in logger.handlers)
        )


if __name__ == "__main__":
    unittest.main()

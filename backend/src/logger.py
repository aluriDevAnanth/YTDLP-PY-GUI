import logging
import os

try:
    from rich.console import Console
    from rich.logging import RichHandler
except ImportError:  # pragma: no cover
    Console = None
    RichHandler = None


def get_logger(name: str, level: str | None = None) -> logging.Logger:
    logger = logging.getLogger(name)
    if logger.handlers:
        return logger

    log_level_name = (level or os.getenv("LOG_LEVEL", "INFO")).upper()
    log_level = getattr(logging, log_level_name, logging.INFO)
    logger.setLevel(log_level)
    logger.propagate = False

    if RichHandler is not None:
        handler = RichHandler(console=Console(stderr=True), rich_tracebacks=True)
        handler.setFormatter(logging.Formatter("%(message)s"))
    else:
        handler = logging.StreamHandler()
        handler.setFormatter(logging.Formatter("[%(levelname)s] %(name)s: %(message)s"))

    logger.addHandler(handler)
    return logger

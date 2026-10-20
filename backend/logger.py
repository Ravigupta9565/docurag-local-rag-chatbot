import logging
import sys
from backend.config import LOG_FILE

logger = logging.getLogger("rag_chatbot")
logger.setLevel(logging.INFO)

if not logger.handlers:
    # Console handler
    c_handler = logging.StreamHandler(sys.stdout)
    c_handler.setLevel(logging.INFO)
    c_format = logging.Formatter("[%(asctime)s] [%(levelname)s] %(name)s: %(message)s")
    c_handler.setFormatter(c_format)
    logger.addHandler(c_handler)

    # File handler
    try:
        f_handler = logging.FileHandler(LOG_FILE, encoding="utf-8")
        f_handler.setLevel(logging.INFO)
        f_format = logging.Formatter("[%(asctime)s] [%(levelname)s] [%(filename)s:%(lineno)d]: %(message)s")
        f_handler.setFormatter(f_format)
        logger.addHandler(f_handler)
    except Exception as e:
        print(f"Failed to initialize file logger: {e}", file=sys.stderr)

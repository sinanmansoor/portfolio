"""
portfolio/ai/embedder.py
─────────────────────────
Loads the sentence-transformers embedding model and exposes a single
embed() function used by both the index builder and the query path.

WHY all-MiniLM-L6-v2:
  - Free — runs locally, no API key, no per-call cost
  - Fast — 384-dimensional vectors, optimised for semantic similarity tasks
  - Small — ~80 MB download, fits comfortably in Render's free memory
  - Quality — excellent for short-to-medium text retrieval tasks like ours

SINGLETON PATTERN:
  The model is loaded once at module import time and reused forever.
  Loading it per-request would add ~2–3 seconds of latency to every chat.
  By loading at startup (via apps.py ready()), the very first visitor
  gets the same speed as everyone else.
"""

import logging

from sentence_transformers import SentenceTransformer

logger = logging.getLogger(__name__)

MODEL_NAME = "all-MiniLM-L6-v2"

# Load once — this triggers a ~80 MB download on first run,
# then uses the cached model from ~/.cache/huggingface/
logger.info("[embedder] Loading sentence-transformers model: %s", MODEL_NAME)
_model = SentenceTransformer(MODEL_NAME)
logger.info("[embedder] Model loaded successfully.")


def embed(text: str) -> list[float]:
    """
    Convert a text string into a 384-dimensional embedding vector.

    Args:
        text: Any string — a data chunk or a user question.

    Returns:
        A list of 384 floats representing the semantic meaning of the text.
    """
    return _model.encode(text, convert_to_numpy=True).tolist()


def embed_batch(texts: list[str]) -> list[list[float]]:
    """
    Embed multiple texts at once (faster than calling embed() in a loop).
    Used when building the initial vector index from all data chunks.

    Args:
        texts: List of strings to embed.

    Returns:
        List of 384-float vectors, one per input text.
    """
    return _model.encode(texts, convert_to_numpy=True, batch_size=32).tolist()

"""
portfolio/ai/cache.py
─────────────────────
Simple in-memory LRU cache for question → answer pairs.

WHY:
  Grok API costs tokens. Many portfolio visitors ask the same questions
  ("what are your skills?", "tell me about yourself").  Caching means we
  only call Grok ONCE per unique question per server session.  Every
  subsequent identical question is answered instantly, for free.

HOW:
  - Keys   : lowercased + stripped question string
  - Values : the complete answer text (built up from the streamed tokens)
  - Size   : capped at MAX_SIZE entries; oldest entry is evicted when full
             (manual LRU via OrderedDict)
  - TTL    : none — cache lives for the server process lifetime.
             Restarting the server clears it (fine for our use case).
"""

from collections import OrderedDict

# Maximum number of unique questions we keep in memory.
# 200 is generous for a personal portfolio — adjust freely.
MAX_SIZE = 200


class _LRUCache:
    """Thread-safe-enough LRU cache (single-process Django / gunicorn workers
    each have their own cache — that is fine for our scale)."""

    def __init__(self, max_size: int = MAX_SIZE):
        self._store: OrderedDict[str, str] = OrderedDict()
        self._max = max_size

    def _key(self, question: str) -> str:
        return question.lower().strip()

    def get(self, question: str) -> str | None:
        """Return cached answer or None if not cached."""
        k = self._key(question)
        if k not in self._store:
            return None
        # Move to end (most recently used)
        self._store.move_to_end(k)
        return self._store[k]

    def set(self, question: str, answer: str) -> None:
        """Store an answer. Evicts the oldest entry if the cache is full."""
        k = self._key(question)
        if k in self._store:
            self._store.move_to_end(k)
        self._store[k] = answer
        if len(self._store) > self._max:
            self._store.popitem(last=False)  # evict oldest

    def clear(self) -> None:
        self._store.clear()

    def __len__(self) -> int:
        return len(self._store)


# Module-level singleton — imported and used by rag.py
answer_cache = _LRUCache()

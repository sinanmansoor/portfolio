"""
portfolio/ai/rag.py
────────────────────
The RAG orchestrator — the brain of the assistant.

RAG stands for Retrieval-Augmented Generation:
  1. RETRIEVAL  — find the most relevant chunks from your personal data
  2. AUGMENTED  — inject those chunks into the LLM prompt as context
  3. GENERATION — let the LLM (Grok) generate a grounded answer

This file ties everything together:
  cache        → skip the LLM if we've answered this before
  vector_store → find the most relevant data chunks
  grok_client  → stream the answer from Grok

THE ask() FUNCTION:
  This is the single public interface used by views.py.
  It accepts a question string and returns a generator of text tokens
  (strings) — one token at a time, as they stream from Grok.

  If the answer is cached: yields the full cached answer in one shot
  (still a generator, so the view layer handles it the same way).
  If not cached: streams from Grok and accumulates the answer for caching.
"""

import logging
from typing import Generator

from .cache import answer_cache
from .grok_client import stream_answer
from .vector_store import query as vector_query

logger = logging.getLogger(__name__)

# Similarity distance threshold — if the closest chunk's distance is above
# this value, it means nothing in the data is relevant to the question.
# ChromaDB cosine distance: 0.0 = identical, 2.0 = completely unrelated.
# 0.85 is a good threshold for "probably irrelevant" on short personal data.
_RELEVANCE_THRESHOLD = 0.85


def ask(question: str) -> Generator[str, None, None]:
    """
    Main RAG pipeline entry point.

    Given a user question, yields text tokens that form the complete answer.
    Handles caching, retrieval, and streaming transparently.

    Args:
        question: The user's raw question string.

    Yields:
        Text token strings, one at a time, suitable for SSE streaming.
    """
    question = question.strip()
    if not question:
        yield "Please ask me something about Sinan's background, skills, or projects."
        return

    # ── 1. Cache check ─────────────────────────────────────────────────────
    cached = answer_cache.get(question)
    if cached:
        logger.info("[rag] Cache HIT for question: %r", question[:60])
        yield cached   # yield the full answer as a single chunk
        return

    logger.info("[rag] Cache MISS — starting RAG pipeline for: %r", question[:60])

    # ── 2. Retrieve relevant chunks ─────────────────────────────────────────
    chunks = vector_query(question, n_results=3)

    # Check if the retrieved chunks are actually relevant
    # (if the closest match is too far, there's nothing useful to pass to Grok)
    if chunks and chunks[0]["distance"] > _RELEVANCE_THRESHOLD:
        logger.info(
            "[rag] All retrieved chunks exceed distance threshold (%.3f > %.3f) — "
            "returning fallback.",
            chunks[0]["distance"],
            _RELEVANCE_THRESHOLD,
        )
        fallback = (
            "I don't have that information about Sinan. "
            "You can reach him directly at sinanmansooor@gmail.com."
        )
        answer_cache.set(question, fallback)
        yield fallback
        return

    logger.debug(
        "[rag] Retrieved %d chunk(s): %s",
        len(chunks),
        [f"{c['category']}({c['distance']:.3f})" for c in chunks],
    )

    # ── 3. Stream answer from Grok ──────────────────────────────────────────
    accumulated = []
    for token in stream_answer(question, chunks):
        accumulated.append(token)
        yield token

    # ── 4. Cache the complete answer ────────────────────────────────────────
    complete_answer = "".join(accumulated)
    if complete_answer and not complete_answer.startswith("⚠️"):
        # Don't cache error messages — retry should hit the API
        answer_cache.set(question, complete_answer)
        logger.debug("[rag] Answer cached. Cache size: %d", len(answer_cache))

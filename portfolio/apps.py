"""
portfolio/apps.py
──────────────────
Django AppConfig for the portfolio app.

The ready() method is called by Django exactly ONCE when the server starts —
after all models are loaded, before the first request is served.

We use it to warm up the entire AI stack so every visitor gets fast responses:
  1. Import the embedder → triggers model download/load (one-time, ~80 MB)
  2. Build the ChromaDB vector index from all data chunks
     (data/ files + Django DB models)

WHY ready() AND NOT ON FIRST REQUEST:
  If we delayed this to the first chat request, that visitor would wait
  ~10 seconds for the model + index to load — a terrible first impression.
  By doing it here, the Render cold-start absorbs the wait, and all
  visitors get consistent, fast responses from the very first message.

SAFETY:
  The entire block is wrapped in a try/except so a misconfigured AI layer
  (e.g. missing API key, DB not yet migrated) NEVER crashes the whole
  Django server. The site stays up; only the chat endpoint degrades.
"""

import logging

from django.apps import AppConfig

logger = logging.getLogger(__name__)


class PortfolioConfig(AppConfig):
    name = 'portfolio'
    default_auto_field = 'django.db.models.BigAutoField'

    def ready(self) -> None:
        """
        Warm up the AI stack at server startup.

        This is called once per process. With gunicorn --workers 3,
        each worker calls ready() independently — meaning each worker
        has its own in-memory embedding model and ChromaDB collection.
        That is fine: each worker is fully self-contained.
        """
        # Skip during management commands that don't serve requests
        # (e.g. migrate, collectstatic) to keep them fast.
        import sys
        _safe_commands = {"migrate", "makemigrations", "collectstatic", "shell"}
        if len(sys.argv) > 1 and sys.argv[1] in _safe_commands:
            logger.info("[apps] Skipping AI warmup during management command: %s", sys.argv[1])
            return

        try:
            logger.info("[apps] Starting AI stack warmup...")

            # Step 1 — Load embedding model into memory.
            # Importing the module triggers SentenceTransformer() loading.
            # After this line, embed() calls are instant.
            from portfolio.ai import embedder as _  # noqa: F401
            logger.info("[apps] Embedding model ready.")

            # Step 2 — Build the vector index from all data sources.
            # This embeds every chunk and stores them in ChromaDB.
            from portfolio.ai.vector_store import build_index
            build_index()
            logger.info("[apps] Vector index ready. AI assistant is live.")

        except Exception as exc:
            # Log the error but DO NOT raise — the server must stay up.
            logger.error(
                "[apps] AI warmup failed: %s. "
                "The chat endpoint will return an error until this is fixed.",
                exc,
                exc_info=True,
            )

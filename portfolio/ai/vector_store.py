"""
portfolio/ai/vector_store.py
─────────────────────────────
Manages the ChromaDB vector index — building it from chunks and
querying it at runtime to find the most relevant context for a question.

WHY CHROMADB:
  - In-process: runs inside Django, no separate server to manage
  - Persistent locally: saves to disk so restarts don't lose the index
  - Ephemeral on Render free tier: disk is wiped on restart, so we rebuild
    from source data each time (takes ~5–10 sec at cold start)
  - Zero cost: completely free, no API key

HOW THE INDEX WORKS:
  1. build_index()  : called once at startup — takes all chunks, embeds
                      them in a batch, and upserts into ChromaDB.
  2. query()        : called on every chat request — embeds the user's
                      question and asks ChromaDB for the top-N most
                      semantically similar chunks.
  3. rebuild_index(): same as build_index() but clears first — used by
                      the management command for live data updates.
"""

import logging
import os

import chromadb
from chromadb.config import Settings

from .chunker import get_all_chunks
from .embedder import embed, embed_batch

logger = logging.getLogger(__name__)

# ── ChromaDB client setup ────────────────────────────────────────────────────

# Persist to disk locally; on Render (ephemeral disk) this still works —
# the index is rebuilt fresh on every startup anyway.
_PERSIST_DIR = os.environ.get("CHROMA_PERSIST_DIR", "./chroma_db")
_COLLECTION_NAME = "portfolio_knowledge"

_client: chromadb.ClientAPI | None = None
_collection: chromadb.Collection | None = None


def _get_client() -> chromadb.ClientAPI:
    global _client
    if _client is None:
        _client = chromadb.PersistentClient(
            path=_PERSIST_DIR,
            settings=Settings(anonymized_telemetry=False),
        )
    return _client


def _get_collection() -> chromadb.Collection:
    global _collection
    if _collection is None:
        client = _get_client()
        # get_or_create: safe to call multiple times
        _collection = client.get_or_create_collection(
            name=_COLLECTION_NAME,
            metadata={"hnsw:space": "cosine"},  # cosine similarity for text
        )
    return _collection


# ── Index building ───────────────────────────────────────────────────────────

def build_index() -> None:
    """
    Load all data chunks, embed them in a batch, and upsert into ChromaDB.

    Called once from PortfolioConfig.ready() at Django startup.
    Uses upsert (not add) so running it again is safe — existing chunks
    are updated rather than duplicated.
    """
    logger.info("[vector_store] Building index...")
    chunks = get_all_chunks()

    if not chunks:
        logger.warning("[vector_store] No chunks found — index will be empty.")
        return

    collection = _get_collection()

    ids = [c.chunk_id for c in chunks]
    texts = [c.text for c in chunks]
    metadatas = [{"source": c.source, "category": c.category} for c in chunks]

    # Embed all chunks in one batch call — much faster than one-by-one
    logger.info("[vector_store] Embedding %d chunks...", len(chunks))
    embeddings = embed_batch(texts)

    # upsert: insert new, update existing — idempotent
    collection.upsert(
        ids=ids,
        documents=texts,
        embeddings=embeddings,
        metadatas=metadatas,
    )

    logger.info(
        "[vector_store] Index built. Collection now has %d document(s).",
        collection.count(),
    )


def rebuild_index() -> None:
    """
    Clear the existing index and rebuild it from scratch.

    Use this when data has changed and you want an immediate refresh
    without restarting the server (called by the rebuild_index management
    command).
    """
    global _collection
    logger.info("[vector_store] Rebuilding index (clearing first)...")
    client = _get_client()
    try:
        client.delete_collection(_COLLECTION_NAME)
    except Exception:
        pass  # collection may not exist yet — that's fine
    _collection = None  # force re-creation on next _get_collection() call
    build_index()


# ── Query ────────────────────────────────────────────────────────────────────

def query(question: str, n_results: int = 3) -> list[dict]:
    """
    Find the top-N chunks most semantically similar to the question.

    Args:
        question:  The user's question text.
        n_results: How many chunks to retrieve (default 3 — enough context
                   without bloating the prompt sent to Grok).

    Returns:
        List of dicts with keys: 'text', 'category', 'source', 'distance'.
        Sorted by relevance (most relevant first, lowest distance first).
    """
    collection = _get_collection()

    if collection.count() == 0:
        logger.warning("[vector_store] Collection is empty — returning no results.")
        return []

    question_embedding = embed(question)

    results = collection.query(
        query_embeddings=[question_embedding],
        n_results=min(n_results, collection.count()),
        include=["documents", "metadatas", "distances"],
    )

    # Unpack ChromaDB's nested response format
    docs = results.get("documents", [[]])[0]
    metas = results.get("metadatas", [[]])[0]
    distances = results.get("distances", [[]])[0]

    retrieved = []
    for doc, meta, dist in zip(docs, metas, distances):
        retrieved.append({
            "text": doc,
            "category": meta.get("category", "unknown"),
            "source": meta.get("source", "unknown"),
            "distance": round(dist, 4),
        })

    logger.debug(
        "[vector_store] Query returned %d chunk(s): %s",
        len(retrieved),
        [r["category"] for r in retrieved],
    )
    return retrieved

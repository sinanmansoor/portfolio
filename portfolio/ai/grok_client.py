"""
portfolio/ai/grok_client.py
────────────────────────────
Thin wrapper around the Grok (xAI) API.

WHY xAI/GROK:
  The user explicitly chose Grok as the LLM.  xAI's API is fully
  OpenAI-compatible, so we use the openai Python SDK — no separate
  Grok SDK needed.  Just point base_url at https://api.x.ai/v1 and
  use your XAI_API_KEY.

STREAMING:
  We use stream=True which returns tokens one by one as they are
  generated.  The view layer (views.py) turns these into Server-Sent
  Events (SSE) so the browser can render them word-by-word live —
  identical to the ChatGPT typewriter effect.

SYSTEM PROMPT DESIGN:
  The prompt is carefully written to:
  1. Tell Grok it is a personal assistant for Sinan Mansoor
  2. Restrict it STRICTLY to the provided context — no hallucination
  3. Instruct short, PA-style answers (not long essays)
  4. Give a polite fallback when info isn't available

ENVIRONMENT VARIABLES:
  XAI_API_KEY  : your Grok API key (required)
  GROK_MODEL   : model name, default "grok-3-mini"
"""

import logging
import os
from typing import Generator

from openai import OpenAI, OpenAIError

logger = logging.getLogger(__name__)

# ── Client setup ─────────────────────────────────────────────────────────────

_XAI_BASE_URL = "https://api.x.ai/v1"
_DEFAULT_MODEL = "grok-3-mini"

_api_key = os.environ.get("XAI_API_KEY", "")
_model = os.environ.get("GROK_MODEL", _DEFAULT_MODEL)

if not _api_key:
    logger.warning(
        "[grok_client] XAI_API_KEY is not set. "
        "The chat endpoint will return an error until the key is configured."
    )

# Instantiate the client once (thread-safe, reusable)
_client = OpenAI(
    api_key=_api_key or "not-set",   # prevents SDK crash on missing key
    base_url=_XAI_BASE_URL,
)

# ── System prompt ─────────────────────────────────────────────────────────────

_SYSTEM_PROMPT = """You are the personal AI assistant for Mohammed Sinan Mansoor — \
an AI Engineer and Python Developer based in Bangalore, India.

Your role is to act like a knowledgeable Personal Assistant (PA) who knows everything \
about their boss. Answer questions from recruiters, collaborators, and visitors who \
want to learn about Sinan's background, skills, projects, and experience.

STRICT RULES — follow these without exception:
1. Answer ONLY using the CONTEXT provided below. Do not use any outside knowledge.
2. If the answer is not in the CONTEXT, say exactly:
   "I don't have that information about Sinan. You can reach him directly at \
sinanmansooor@gmail.com."
3. Never invent, guess, or fabricate facts, dates, technologies, or experiences.
4. Keep answers SHORT and DIRECT — like a PA giving a quick briefing, not a long essay.
   One to three sentences is ideal. Use bullet points only when listing multiple items.
5. Refer to Sinan in the third person (e.g. "Sinan has...", "His experience includes...").
6. Be professional, warm, and confident in tone — like a great PA.
"""

# ── Streaming API call ────────────────────────────────────────────────────────

def stream_answer(question: str, context_chunks: list[dict]) -> Generator[str, None, None]:
    """
    Call the Grok API with the question + retrieved context chunks.
    Yields text tokens one by one as they stream from the API.
    """
    api_key = (os.environ.get("GROQ_API_KEY") or os.environ.get("XAI_API_KEY", "")).strip().strip('"').strip("'")
    
    if not api_key:
        yield "⚠️ The AI assistant is not configured yet. Please check back soon."
        return

    # Auto-detect whether this is a Groq Cloud key (gsk_...) or an xAI Grok key
    if api_key.startswith("gsk_"):
        base_url = os.environ.get("GROQ_BASE_URL", "https://api.groq.com/openai/v1")
        default_model = "llama-3.1-8b-instant"
    else:
        base_url = os.environ.get("XAI_BASE_URL", "https://api.x.ai/v1")
        default_model = "grok-3-mini"

    model = os.environ.get("LLM_MODEL") or os.environ.get("GROK_MODEL") or default_model
    # If user kept grok in env but is using Groq key, or if set to unavailable model, use llama-3.1-8b-instant
    if api_key.startswith("gsk_") and ("grok" in model.lower() or "llama-3.3" in model.lower()):
        model = "llama-3.1-8b-instant"

    # Build the context block from retrieved chunks
    if context_chunks:
        context_text = "\n\n---\n\n".join(
            f"[{chunk.get('category', 'info').upper()}]\n{chunk['text']}"
            for chunk in context_chunks
        )
    else:
        context_text = "(No relevant context found in Sinan's data.)"

    user_message = f"CONTEXT:\n{context_text}\n\nQUESTION: {question}"

    try:
        client = OpenAI(api_key=api_key, base_url=base_url)
        
        # If using Groq, let's verify or pick the first available chat model if not sure
        try:
            response = client.chat.completions.create(
                model=model,
                messages=[
                    {"role": "system", "content": _SYSTEM_PROMPT},
                    {"role": "user", "content": user_message},
                ],
                stream=True,
                max_tokens=350,      # keeps answers short — PA-style, not essays
                temperature=0.2,     # low = more factual, less creative/random
            )
        except OpenAIError as model_err:
            if "model_not_found" in str(model_err) or "does not exist" in str(model_err):
                # Fetch available models on this key to pick a valid one automatically
                try:
                    available = [m.id for m in client.models.list().data if "whisper" not in m.id]
                    if available:
                        # Auto-select the first available chat model
                        picked_model = available[0]
                        logger.info("[grok_client] Fallback to available model: %s", picked_model)
                        response = client.chat.completions.create(
                            model=picked_model,
                            messages=[
                                {"role": "system", "content": _SYSTEM_PROMPT},
                                {"role": "user", "content": user_message},
                            ],
                            stream=True,
                            max_tokens=350,
                            temperature=0.2,
                        )
                    else:
                        raise model_err
                except Exception:
                    raise model_err
            else:
                raise model_err

        for chunk in response:
            delta = chunk.choices[0].delta
            if delta and delta.content:
                yield delta.content

    except OpenAIError as exc:
        logger.error("[grok_client] LLM API error: %s", exc)
        yield f"\n\n⚠️ LLM API error: {exc}"
    except Exception as exc:
        logger.error("[grok_client] Unexpected error: %s", exc)
        yield f"\n\n⚠️ Error: {exc}"



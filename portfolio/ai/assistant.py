"""
portfolio/ai/assistant.py
──────────────────────────
The portfolio chatbot.

WHY NO VECTOR SEARCH:
  The whole knowledge base (portfolio/data/*.txt) is ~3k tokens, so we send
  all of it to the LLM on every request instead of retrieving a few chunks.
  The old RAG setup (sentence-transformers + ChromaDB) only passed the top 3
  chunks and refused any question whose embedding wasn't close enough to
  the data — which made the bot feel like it only answered scripted
  questions. It also pulled in PyTorch, which made cold starts slow.

PROVIDERS:
  GROQ_API_KEY (gsk_...)  → Groq Cloud, default model openai/gpt-oss-120b
                            (Groq retired the Llama 3.x models)
  XAI_API_KEY             → xAI Grok,   default model grok-3-mini
  LLM_MODEL overrides the default model for either provider.
"""

import logging
import os
import time
from functools import lru_cache
from pathlib import Path
from typing import Generator

from openai import OpenAI, OpenAIError, RateLimitError

logger = logging.getLogger(__name__)

DATA_DIR = Path(__file__).resolve().parent.parent / "data"

CONTACT_EMAIL = "sinanmansooor@gmail.com"

# Only this many previous messages are sent back to the model.
MAX_HISTORY_MESSAGES = 10
MAX_MESSAGE_CHARS = 2000
MAX_JD_CHARS = 6000
RATE_LIMIT_WAIT_SECONDS = 6

_SYSTEM_PROMPT = """You are the AI assistant on the portfolio website of Mohammed Sinan Mansoor, \
an AI Engineer (agentic AI & LLM apps) and full-stack developer (React + Django) from Kannur, Kerala, India — open to relocation.

Visitors are mostly recruiters, hiring managers, and fellow engineers. Help them understand \
Sinan's background, skills, projects, experience, education, and fit for roles.

How to answer:
- Use the KNOWLEDGE section below as your source of truth about Sinan. Reason over it freely: \
summarise, compare, infer fit for a role or job description, and answer follow-up questions \
using the conversation so far.
- Never invent specific facts about Sinan (employers, dates, numbers, degrees, links) that are \
not in the KNOWLEDGE. If something specific isn't covered, say so briefly and suggest emailing \
him at {email}.
- General questions (e.g. explaining a technology Sinan uses, small talk, greetings) are fine to \
answer normally — keep them short and steer back to how it relates to Sinan when natural.
- Refer to Sinan in the third person. Visitors may address you as if you were Sinan \
("tell me about yourself") — answer about Sinan.
- Be warm, confident, and concise: usually 2–5 sentences, or a short bullet list when listing \
several items. Plain text only — no markdown headings, tables, or bold.

KNOWLEDGE:
{knowledge}
"""


@lru_cache(maxsize=1)
def _system_prompt() -> str:
    """Build the system prompt once per process from portfolio/data/*.txt."""
    sections = []
    for path in sorted(DATA_DIR.glob("*")):
        if path.suffix.lower() not in {".txt", ".md"}:
            continue
        text = path.read_text(encoding="utf-8").strip()
        if text:
            sections.append(text)
    knowledge = "\n\n=====\n\n".join(sections)
    return _SYSTEM_PROMPT.format(email=CONTACT_EMAIL, knowledge=knowledge)


def _provider() -> tuple[str, str, list[str]] | None:
    """Return (api_key, base_url, models_to_try) or None if no key is configured."""
    api_key = (os.environ.get("GROQ_API_KEY") or os.environ.get("XAI_API_KEY") or "").strip().strip("\"'")
    if not api_key:
        return None

    if api_key.startswith("gsk_"):
        base_url = os.environ.get("GROQ_BASE_URL", "https://api.groq.com/openai/v1")
        fallbacks = ["openai/gpt-oss-120b", "openai/gpt-oss-20b", "qwen/qwen3.8-27b"]
    else:
        base_url = os.environ.get("XAI_BASE_URL", "https://api.x.ai/v1")
        fallbacks = ["grok-3-mini"]

    preferred = os.environ.get("LLM_MODEL", "").strip()
    models = [preferred] + [m for m in fallbacks if m != preferred] if preferred else fallbacks
    return api_key, base_url, models


def _clean_history(history) -> list[dict]:
    """Keep only well-formed user/assistant turns from client-supplied history."""
    if not isinstance(history, list):
        return []
    cleaned = []
    for item in history[-MAX_HISTORY_MESSAGES:]:
        if not isinstance(item, dict):
            continue
        role = item.get("role")
        content = item.get("content")
        if role in {"user", "assistant"} and isinstance(content, str) and content.strip():
            cleaned.append({"role": role, "content": content.strip()[:MAX_MESSAGE_CHARS]})
    return cleaned


_JD_INSTRUCTIONS = """A recruiter pasted the job description below. Evaluate how well Sinan fits it, using only the KNOWLEDGE. Be honest — a credible score beats a flattering one.

Reply in exactly this plain-text format and nothing else:
SCORE: <integer 0-100>
STRENGTHS:
- <matching requirement and the specific evidence from Sinan's profile>
(3 to 5 bullets)
GAPS:
- <requirement not evidenced in the profile, or "None significant">
(1 to 3 bullets)
VERDICT: <one confident sentence a recruiter can act on>

JOB DESCRIPTION:
"""


def ask(question: str, history=None, mode: str = "chat") -> Generator[str, None, None]:
    """
    Stream the assistant's answer to `question`, token by token.
    mode="jd" treats `question` as a job description and returns a fit report.
    """
    question = question.strip()
    if mode == "jd":
        question = _JD_INSTRUCTIONS + question[:MAX_JD_CHARS] if question else ""
        history = None
    else:
        question = question[:MAX_MESSAGE_CHARS]
    if not question:
        yield "Please ask me something about Sinan's background, skills, or projects."
        return

    provider = _provider()
    if provider is None:
        logger.error("[assistant] No GROQ_API_KEY / XAI_API_KEY configured.")
        yield f"The AI assistant isn't configured right now. You can reach Sinan at {CONTACT_EMAIL}."
        return

    api_key, base_url, models = provider
    messages = [
        {"role": "system", "content": _system_prompt()},
        *_clean_history(history),
        {"role": "user", "content": question},
    ]
    # No SDK retries: on a rate limit (Groq free tier is ~8k tokens/min per
    # model) we move straight to the next model instead of waiting ~20s.
    # If every model is rate-limited, wait briefly and go round once more.
    client = OpenAI(api_key=api_key, base_url=base_url, timeout=30, max_retries=0)

    for attempt in range(2):
        rate_limited = False
        for model in models:
            extra = {}
            if "gpt-oss" in model:
                # Reasoning model: keep thinking short so replies start fast.
                extra["reasoning_effort"] = "low"
            try:
                stream = client.chat.completions.create(
                    model=model,
                    messages=messages,
                    stream=True,
                    # Groq reserves max_tokens against the per-minute quota, so
                    # keep it modest (it includes reasoning tokens on gpt-oss).
                    max_tokens=600,
                    temperature=0.4,
                    **extra,
                )
            except RateLimitError as exc:
                logger.warning("[assistant] Model %s rate-limited: %s", model, exc)
                rate_limited = True
                continue
            except OpenAIError as exc:
                # Model retired or unavailable — try the next one.
                logger.warning("[assistant] Model %s failed: %s", model, exc)
                continue

            try:
                for chunk in stream:
                    if not chunk.choices:
                        continue
                    delta = chunk.choices[0].delta
                    if delta and delta.content:
                        yield delta.content
            except OpenAIError as exc:
                logger.error("[assistant] Stream from %s broke: %s", model, exc)
                yield "\n\n(The response was cut off — please try again.)"
            return

        if not rate_limited or attempt == 1:
            break
        time.sleep(RATE_LIMIT_WAIT_SECONDS)

    yield f"I'm getting a lot of questions right now. Please try again in a minute, or email Sinan at {CONTACT_EMAIL}."

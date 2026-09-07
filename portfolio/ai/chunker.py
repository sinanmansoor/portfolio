"""
portfolio/ai/chunker.py
────────────────────────
Assembles all text "chunks" from two sources:
  1. Files in portfolio/data/*.txt  (supplementary / easy-to-edit)
  2. Django DB models               (Profile, Skill, Project, Experience,
                                     KnowledgeEntry)

WHY TWO SOURCES:
  - DB models are the authoritative source for structured data (skills,
    projects, experience) — managed via Django admin.
  - data/ files allow adding freeform info (personal notes, future goals,
    contact details) without touching the DB schema.
  - Together they give complete coverage of everything the assistant needs.

WHAT IS A CHUNK:
  A chunk is a self-contained piece of text about ONE topic.  Each chunk
  gets its own embedding vector.  Keeping chunks topic-focused means the
  vector search retrieves precisely relevant context — not a jumble of
  unrelated facts.

UPDATING DATA:
  - Edit a file in portfolio/data/ → restart server → AI knows the update.
  - Edit a model in Django admin  → restart server → AI knows the update.
  - Add a new .txt file in data/  → restart server → automatically included.
"""

import logging
from pathlib import Path

logger = logging.getLogger(__name__)

# Absolute path to the data/ folder (sibling of this file's parent)
DATA_DIR = Path(__file__).resolve().parent.parent / "data"


# ── Chunk dataclass ──────────────────────────────────────────────────────────

class Chunk:
    """A single unit of text that will be embedded and stored in ChromaDB."""

    def __init__(self, chunk_id: str, text: str, source: str, category: str):
        self.chunk_id = chunk_id    # unique ID for ChromaDB
        self.text = text            # the actual text content
        self.source = source        # "file" or "db"
        self.category = category    # e.g. "profile", "skills", "projects"

    def __repr__(self):
        return f"Chunk(id={self.chunk_id!r}, category={self.category!r}, len={len(self.text)})"


# ── File-based chunks ────────────────────────────────────────────────────────

def _load_file_chunks() -> list[Chunk]:
    """Read every .txt and .md file in portfolio/data/ as one chunk each."""
    chunks = []
    if not DATA_DIR.exists():
        logger.warning("[chunker] data/ directory not found at %s", DATA_DIR)
        return chunks

    for path in sorted(DATA_DIR.glob("*")):
        if path.suffix.lower() not in {".txt", ".md"}:
            continue
        try:
            text = path.read_text(encoding="utf-8").strip()
            if not text:
                continue
            # Derive a friendly category from the filename, e.g.
            # "01_profile.txt" → "profile"
            stem = path.stem.lstrip("0123456789_").lower()
            chunk = Chunk(
                chunk_id=f"file_{path.stem}",
                text=text,
                source="file",
                category=stem,
            )
            chunks.append(chunk)
            logger.debug("[chunker] Loaded file chunk: %s (%d chars)", path.name, len(text))
        except Exception as exc:
            logger.error("[chunker] Failed to read %s: %s", path, exc)

    logger.info("[chunker] Loaded %d chunk(s) from data/ files.", len(chunks))
    return chunks


# ── DB-based chunks ──────────────────────────────────────────────────────────

def _load_db_chunks() -> list[Chunk]:
    """
    Pull structured data from Django DB models and format as text chunks.

    We import models here (inside the function) rather than at module level
    to avoid circular imports during Django startup — the models aren't ready
    until after apps are fully initialised.
    """
    # Late import — safe inside a function called from apps.py ready()
    from portfolio.models import (  # noqa: PLC0415
        Experience,
        KnowledgeEntry,
        Profile,
        Project,
        Skill,
    )

    chunks: list[Chunk] = []

    # ── Profile ──────────────────────────────────────────────────────────────
    try:
        profile = Profile.objects.first()
        if profile:
            text = (
                f"Name: {profile.name}\n"
                f"Headline: {profile.headline}\n"
                f"Summary: {profile.summary}\n"
                f"Location: {profile.location}\n"
                f"Email: {profile.email}\n"
                f"Availability: {profile.availability}\n"
                f"Work style: {profile.work_style}\n"
                f"Tags: {', '.join(profile.tags) if profile.tags else ''}\n"
                f"GitHub: {profile.github_url}\n"
                f"LinkedIn: {profile.linkedin_url}\n"
            )
            chunks.append(Chunk("db_profile", text, "db", "profile"))
    except Exception as exc:
        logger.warning("[chunker] Could not load Profile from DB: %s", exc)

    # ── Skills — grouped by category ─────────────────────────────────────────
    try:
        skill_qs = Skill.objects.all().order_by("category", "name")
        by_category: dict[str, list[str]] = {}
        for skill in skill_qs:
            by_category.setdefault(skill.category, []).append(
                f"{skill.name} (proficiency: {skill.proficiency}%)"
                + (f" — {skill.description}" if skill.description else "")
            )
        for cat, items in by_category.items():
            text = f"Skills — {cat}:\n" + "\n".join(f"  • {i}" for i in items)
            chunks.append(Chunk(f"db_skills_{cat.lower()}", text, "db", "skills"))
    except Exception as exc:
        logger.warning("[chunker] Could not load Skills from DB: %s", exc)

    # ── Projects — one chunk each ─────────────────────────────────────────────
    try:
        for project in Project.objects.all():
            techs = ", ".join(project.technologies) if project.technologies else "N/A"
            text = (
                f"Project: {project.title}\n"
                f"Category: {project.category}\n"
                f"Summary: {project.summary}\n"
                f"Description: {project.description}\n"
                f"Impact: {project.impact}\n"
                f"Technologies: {techs}\n"
                f"Featured: {'Yes' if project.featured else 'No'}\n"
            )
            if project.repo_url:
                text += f"Repository: {project.repo_url}\n"
            if project.demo_url:
                text += f"Demo: {project.demo_url}\n"
            slug = project.title.lower().replace(" ", "_")[:40]
            chunks.append(Chunk(f"db_project_{slug}", text, "db", "projects"))
    except Exception as exc:
        logger.warning("[chunker] Could not load Projects from DB: %s", exc)

    # ── Experience — one chunk each ───────────────────────────────────────────
    try:
        for exp in Experience.objects.all():
            highlights = (
                "\n".join(f"  • {h}" for h in exp.highlights)
                if exp.highlights else ""
            )
            text = (
                f"Experience: {exp.role} at {exp.company}\n"
                f"Period: {exp.period}\n"
                f"Location: {exp.location}\n"
                f"Description: {exp.description}\n"
            )
            if highlights:
                text += f"Highlights:\n{highlights}\n"
            slug = f"{exp.role}_{exp.company}".lower().replace(" ", "_")[:40]
            chunks.append(Chunk(f"db_exp_{slug}", text, "db", "experience"))
    except Exception as exc:
        logger.warning("[chunker] Could not load Experience from DB: %s", exc)

    # ── KnowledgeEntry — one chunk each ──────────────────────────────────────
    try:
        for entry in KnowledgeEntry.objects.all():
            tags = ", ".join(entry.tags) if entry.tags else ""
            text = (
                f"Knowledge: {entry.title}\n"
                f"Category: {entry.category}\n"
                f"Content: {entry.content}\n"
            )
            if tags:
                text += f"Tags: {tags}\n"
            slug = entry.title.lower().replace(" ", "_")[:40]
            chunks.append(Chunk(f"db_knowledge_{slug}", text, "db", entry.category.lower()))
    except Exception as exc:
        logger.warning("[chunker] Could not load KnowledgeEntry from DB: %s", exc)

    logger.info("[chunker] Loaded %d chunk(s) from Django DB.", len(chunks))
    return chunks


# ── Public API ───────────────────────────────────────────────────────────────

def get_all_chunks() -> list[Chunk]:
    """
    Return all chunks from both sources (data/ files + Django DB).

    Called once at startup by vector_store.build_index().
    Later, to refresh after a data update, call vector_store.rebuild_index().
    """
    file_chunks = _load_file_chunks()
    db_chunks = _load_db_chunks()
    all_chunks = file_chunks + db_chunks
    logger.info("[chunker] Total chunks assembled: %d", len(all_chunks))
    return all_chunks

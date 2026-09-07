# portfolio/ai/__init__.py
# Makes portfolio/ai a proper Python package.
# Exposes the top-level ask() function so views.py imports cleanly:
#   from portfolio.ai import ask

def ask(question: str):
    from .rag import ask as _ask
    yield from _ask(question)


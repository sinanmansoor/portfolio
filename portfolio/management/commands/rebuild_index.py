from django.core.management.base import BaseCommand
from portfolio.ai.cache import answer_cache
from portfolio.ai.vector_store import rebuild_index


class Command(BaseCommand):
    help = "Rebuilds the ChromaDB vector index from portfolio/data/ files and Django DB models"

    def handle(self, *args, **options):
        self.stdout.write(self.style.NOTICE("Starting ChromaDB index rebuild..."))
        try:
            rebuild_index()
            answer_cache.clear()
            self.stdout.write(self.style.SUCCESS("ChromaDB index rebuilt and cache cleared successfully!"))
        except Exception as exc:
            self.stdout.write(self.style.ERROR(f"Failed to rebuild vector index: {exc}"))
            raise exc

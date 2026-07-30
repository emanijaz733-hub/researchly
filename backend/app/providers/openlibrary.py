"""Open Library provider — books, no key required."""
import httpx

from app.providers.base import SearchProvider, SearchResult
from app.providers.registry import register_provider


@register_provider
class OpenLibraryProvider(SearchProvider):
    name = "openlibrary"
    description = "Books from Open Library"
    enabled_by_default = False  # niche: opt in per search

    async def search(self, query: str, client: httpx.AsyncClient, limit: int) -> list[SearchResult]:
        resp = await client.get(
            "https://openlibrary.org/search.json",
            params={"q": query, "limit": limit, "fields": "title,key,author_name,first_publish_year"},
        )
        resp.raise_for_status()
        docs = resp.json().get("docs", [])
        results = []
        for rank, doc in enumerate(docs):
            authors = ", ".join(doc.get("author_name", [])[:3])
            year = doc.get("first_publish_year")
            results.append(
                SearchResult(
                    title=doc.get("title", ""),
                    url=f"https://openlibrary.org{doc.get('key', '')}",
                    snippet=f"Book by {authors or 'unknown author'}"
                            + (f", first published {year}" if year else ""),
                    provider=self.name,
                    raw_score=max(0.2, 1.0 - rank * 0.1),
                )
            )
        return results

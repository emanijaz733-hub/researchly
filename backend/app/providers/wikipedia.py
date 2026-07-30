"""Wikipedia provider — encyclopedia articles, no API key required."""
import httpx

from app.providers.base import SearchProvider, SearchResult
from app.providers.registry import register_provider


@register_provider
class WikipediaProvider(SearchProvider):
    name = "wikipedia"
    description = "Encyclopedia articles from Wikipedia"

    async def search(self, query: str, client: httpx.AsyncClient, limit: int) -> list[SearchResult]:
        resp = await client.get(
            "https://en.wikipedia.org/w/api.php",
            params={
                "action": "query",
                "list": "search",
                "srsearch": query,
                "srlimit": limit,
                "format": "json",
                "srprop": "snippet|timestamp",
            },
        )
        resp.raise_for_status()
        items = resp.json().get("query", {}).get("search", [])
        results = []
        for rank, item in enumerate(items):
            title = item.get("title", "")
            snippet = _strip_tags(item.get("snippet", ""))
            results.append(
                SearchResult(
                    title=title,
                    url=f"https://en.wikipedia.org/wiki/{title.replace(' ', '_')}",
                    snippet=snippet,
                    provider=self.name,
                    raw_score=max(0.2, 1.0 - rank * 0.1),
                    published_at=item.get("timestamp"),
                )
            )
        return results


def _strip_tags(text: str) -> str:
    import re

    return re.sub(r"<[^>]+>", "", text)

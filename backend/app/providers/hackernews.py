"""Hacker News provider (Algolia API) — tech news and discussion."""
import httpx

from app.providers.base import SearchProvider, SearchResult
from app.providers.registry import register_provider


@register_provider
class HackerNewsProvider(SearchProvider):
    name = "hackernews"
    description = "Tech news and discussion from Hacker News"

    async def search(self, query: str, client: httpx.AsyncClient, limit: int) -> list[SearchResult]:
        resp = await client.get(
            "https://hn.algolia.com/api/v1/search",
            params={"query": query, "hitsPerPage": limit, "tags": "story"},
        )
        resp.raise_for_status()
        hits = resp.json().get("hits", [])
        results = []
        max_points = max((h.get("points") or 1 for h in hits), default=1)
        for hit in hits:
            url = hit.get("url") or f"https://news.ycombinator.com/item?id={hit.get('objectID')}"
            results.append(
                SearchResult(
                    title=hit.get("title") or "(untitled)",
                    url=url,
                    snippet=f"{hit.get('points', 0)} points · {hit.get('num_comments', 0)} comments on Hacker News",
                    provider=self.name,
                    raw_score=(hit.get("points") or 1) / max_points,
                    published_at=hit.get("created_at"),
                )
            )
        return results

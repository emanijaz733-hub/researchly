"""Stack Overflow provider (Stack Exchange API) — Q&A, no key required."""
import html

import httpx

from app.providers.base import SearchProvider, SearchResult
from app.providers.registry import register_provider


@register_provider
class StackOverflowProvider(SearchProvider):
    name = "stackoverflow"
    description = "Questions and answers from Stack Overflow"

    async def search(self, query: str, client: httpx.AsyncClient, limit: int) -> list[SearchResult]:
        resp = await client.get(
            "https://api.stackexchange.com/2.3/search/advanced",
            params={"order": "desc", "sort": "relevance", "q": query,
                    "site": "stackoverflow", "pagesize": limit},
        )
        resp.raise_for_status()
        items = resp.json().get("items", [])
        max_score = max((i.get("score") or 1 for i in items), default=1)
        return [
            SearchResult(
                title=html.unescape(item.get("title", "")),
                url=item.get("link", ""),
                snippet=f"{item.get('score', 0)} votes · {item.get('answer_count', 0)} answers"
                        + (" · accepted answer" if item.get("is_answered") else ""),
                provider=self.name,
                raw_score=max(0.1, (item.get("score") or 1) / max(1, max_score)),
                published_at=None,
            )
            for item in items
        ]

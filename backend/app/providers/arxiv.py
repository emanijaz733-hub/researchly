"""arXiv provider — academic papers, no API key required."""
import re

import httpx

from app.providers.base import SearchProvider, SearchResult
from app.providers.registry import register_provider

_ENTRY = re.compile(r"<entry>(.*?)</entry>", re.S)
_FIELD = {
    "title": re.compile(r"<title>(.*?)</title>", re.S),
    "summary": re.compile(r"<summary>(.*?)</summary>", re.S),
    "id": re.compile(r"<id>(.*?)</id>", re.S),
    "published": re.compile(r"<published>(.*?)</published>", re.S),
}


@register_provider
class ArxivProvider(SearchProvider):
    name = "arxiv"
    description = "Academic papers from arXiv"

    async def search(self, query: str, client: httpx.AsyncClient, limit: int) -> list[SearchResult]:
        resp = await client.get(
            "https://export.arxiv.org/api/query",
            params={"search_query": f"all:{query}", "max_results": limit},
        )
        resp.raise_for_status()
        results = []
        for rank, entry in enumerate(_ENTRY.findall(resp.text)):
            def field(name: str) -> str:
                m = _FIELD[name].search(entry)
                return re.sub(r"\s+", " ", m.group(1)).strip() if m else ""

            summary = field("summary")
            results.append(
                SearchResult(
                    title=field("title"),
                    url=field("id"),
                    snippet=summary[:280] + ("…" if len(summary) > 280 else ""),
                    provider=self.name,
                    raw_score=max(0.2, 1.0 - rank * 0.1),
                    published_at=field("published") or None,
                )
            )
        return results

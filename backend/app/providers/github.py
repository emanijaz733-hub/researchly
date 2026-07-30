"""GitHub provider — repositories, unauthenticated API (rate-limited)."""
import httpx

from app.providers.base import SearchProvider, SearchResult
from app.providers.registry import register_provider


@register_provider
class GitHubProvider(SearchProvider):
    name = "github"
    description = "Repositories from GitHub"

    async def search(self, query: str, client: httpx.AsyncClient, limit: int) -> list[SearchResult]:
        resp = await client.get(
            "https://api.github.com/search/repositories",
            params={"q": query, "per_page": limit, "sort": "stars"},
            headers={"Accept": "application/vnd.github+json"},
        )
        resp.raise_for_status()
        items = resp.json().get("items", [])
        max_stars = max((i.get("stargazers_count") or 1 for i in items), default=1)
        return [
            SearchResult(
                title=item.get("full_name", ""),
                url=item.get("html_url", ""),
                snippet=(item.get("description") or "")[:280]
                + f" · ★ {item.get('stargazers_count', 0)}",
                provider=self.name,
                raw_score=(item.get("stargazers_count") or 1) / max_stars,
                published_at=item.get("updated_at"),
            )
            for item in items
        ]

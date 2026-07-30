"""Provider plugin contract.

A provider is anything that can turn a query into SearchResults. New
providers subclass SearchProvider and register themselves with
@register_provider — the orchestrator and API discover them automatically,
so adding a provider never touches core code.
"""
import dataclasses
from abc import ABC, abstractmethod

import httpx


@dataclasses.dataclass(slots=True)
class SearchResult:
    title: str
    url: str
    snippet: str
    provider: str
    raw_score: float = 0.5  # provider's own relevance signal, 0..1
    score: float = 0.0      # final pipeline score
    published_at: str | None = None

    @property
    def id(self) -> str:
        import hashlib

        return hashlib.sha1(self.url.encode()).hexdigest()[:12]


class SearchProvider(ABC):
    """Base class for all search providers."""

    name: str = "base"
    description: str = ""
    enabled_by_default: bool = True

    @abstractmethod
    async def search(self, query: str, client: httpx.AsyncClient, limit: int) -> list[SearchResult]:
        """Return up to `limit` results. Raise on failure — the orchestrator
        isolates errors per provider."""
        raise NotImplementedError

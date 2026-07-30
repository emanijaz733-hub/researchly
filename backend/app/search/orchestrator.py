"""Search orchestrator: fan a query out to providers in parallel.

Guarantees:
- providers run concurrently
- each provider has an independent timeout
- one provider failing never affects the others
- per-provider status (latency, errors) is reported back
"""
import asyncio
import dataclasses
import logging
import time

import httpx

from app.core.config import get_settings
from app.providers.base import SearchProvider, SearchResult
from app.ai.embeddings import semantic_rerank
from app.search.pipeline import run_pipeline

logger = logging.getLogger("nexus.search")


@dataclasses.dataclass(slots=True)
class ProviderReport:
    name: str
    ok: bool
    latency_ms: int
    result_count: int
    error: str | None = None


@dataclasses.dataclass(slots=True)
class SearchOutcome:
    results: list[SearchResult]
    reports: list[ProviderReport]
    total_latency_ms: int


class SearchOrchestrator:
    def __init__(self, timeout: float | None = None, per_provider_limit: int | None = None):
        settings = get_settings()
        self.timeout = timeout or settings.provider_timeout_seconds
        self.limit = per_provider_limit or settings.max_results_per_provider

    async def search(self, query: str, providers: list[SearchProvider]) -> SearchOutcome:
        started = time.monotonic()
        async with httpx.AsyncClient(
            timeout=self.timeout, follow_redirects=True,
            headers={"User-Agent": "NEXUS/0.1 (research platform)"},
        ) as client:
            tasks = [self._run_one(p, query, client) for p in providers]
            pairs = await asyncio.gather(*tasks)

        results: list[SearchResult] = []
        reports: list[ProviderReport] = []
        for provider_results, report in pairs:
            results.extend(provider_results)
            reports.append(report)

        ranked = await semantic_rerank(query, run_pipeline(results, query))
        return SearchOutcome(
            results=ranked,
            reports=reports,
            total_latency_ms=int((time.monotonic() - started) * 1000),
        )

    async def _run_one(
        self, provider: SearchProvider, query: str, client: httpx.AsyncClient
    ) -> tuple[list[SearchResult], ProviderReport]:
        started = time.monotonic()
        try:
            results = await asyncio.wait_for(
                provider.search(query, client, self.limit), timeout=self.timeout
            )
            latency = int((time.monotonic() - started) * 1000)
            return results, ProviderReport(provider.name, True, latency, len(results))
        except asyncio.TimeoutError:
            latency = int((time.monotonic() - started) * 1000)
            logger.warning("provider timeout", extra={"extra_fields": {"provider": provider.name}})
            return [], ProviderReport(provider.name, False, latency, 0, "timeout")
        except Exception as exc:  # isolate every provider failure
            latency = int((time.monotonic() - started) * 1000)
            logger.warning(
                "provider error",
                extra={"extra_fields": {"provider": provider.name, "error": str(exc)}},
            )
            return [], ProviderReport(provider.name, False, latency, 0, str(exc)[:200])

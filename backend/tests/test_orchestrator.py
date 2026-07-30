import asyncio

import pytest

from app.providers.base import SearchProvider, SearchResult
from app.search.orchestrator import SearchOrchestrator


class GoodProvider(SearchProvider):
    name = "good"

    async def search(self, query, client, limit):
        return [SearchResult(title=f"{query} result", url="https://good.example/x",
                             snippet=query, provider=self.name, raw_score=0.8)]


class FailingProvider(SearchProvider):
    name = "failing"

    async def search(self, query, client, limit):
        raise RuntimeError("provider exploded")


class SlowProvider(SearchProvider):
    name = "slow"

    async def search(self, query, client, limit):
        await asyncio.sleep(5)
        return []


@pytest.mark.asyncio
async def test_failure_isolation():
    orch = SearchOrchestrator(timeout=2)
    outcome = await orch.search("python", [GoodProvider(), FailingProvider()])
    assert len(outcome.results) == 1
    reports = {r.name: r for r in outcome.reports}
    assert reports["good"].ok
    assert not reports["failing"].ok
    assert "exploded" in reports["failing"].error


@pytest.mark.asyncio
async def test_timeout_isolation():
    orch = SearchOrchestrator(timeout=0.3)
    outcome = await orch.search("python", [GoodProvider(), SlowProvider()])
    reports = {r.name: r for r in outcome.reports}
    assert reports["good"].ok
    assert reports["slow"].error == "timeout"
    assert len(outcome.results) == 1


@pytest.mark.asyncio
async def test_parallel_execution():
    class Sleepy(SearchProvider):
        def __init__(self, name):
            self.name = name

        async def search(self, query, client, limit):
            await asyncio.sleep(0.4)
            return []

    orch = SearchOrchestrator(timeout=2)
    outcome = await orch.search("q", [Sleepy("s1"), Sleepy("s2"), Sleepy("s3")])
    # Sequential would take >= 1200 ms; parallel stays near 400 ms.
    assert outcome.total_latency_ms < 900

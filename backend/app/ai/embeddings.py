"""Optional semantic reranking with embeddings.

Uses OpenAI embeddings when NEXUS_OPENAI_API_KEY is set (Anthropic has no
embeddings endpoint). Without a key this is a no-op and the lexical
baseline from the pipeline stands.
"""
import math

import httpx

from app.core.config import get_settings
from app.providers.base import SearchResult


async def semantic_rerank(query: str, results: list[SearchResult]) -> list[SearchResult]:
    settings = get_settings()
    if not settings.openai_api_key or not results:
        return results

    texts = [query] + [f"{r.title}. {r.snippet}"[:500] for r in results]
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.post(
                "https://api.openai.com/v1/embeddings",
                headers={"Authorization": f"Bearer {settings.openai_api_key}"},
                json={"model": "text-embedding-3-small", "input": texts},
            )
            resp.raise_for_status()
            vectors = [d["embedding"] for d in resp.json()["data"]]
    except Exception:
        return results  # semantic ranking is an enhancement, never a dependency

    q_vec, doc_vecs = vectors[0], vectors[1:]
    for r, vec in zip(results, doc_vecs):
        r.score = round(0.5 * r.score + 0.5 * _cosine(q_vec, vec), 4)
    return sorted(results, key=lambda r: -r.score)


def _cosine(a: list[float], b: list[float]) -> float:
    dot = sum(x * y for x, y in zip(a, b))
    na = math.sqrt(sum(x * x for x in a))
    nb = math.sqrt(sum(x * x for x in b))
    return dot / (na * nb) if na and nb else 0.0
